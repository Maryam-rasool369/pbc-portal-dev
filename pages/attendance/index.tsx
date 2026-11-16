"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import MainLayout from "@/layouts/MainLayout";
import AttendanceCard from "@/components/attendance/AttendanceCard";
import MarkAttendanceModal from "@/components/attendance/MarkAttendanceModal";
import UpdateTasksModal from "@/components/attendance/UpdateTasksModal";
import Pagination from "@/components/common/Pagination";
import useAuthStore from "@/store/authStore";

import {
  getAllAttendances,
  getPersonalAttendances,
  getTodayAttendance,
  exportAttendanceToExcel,
} from "@/services/attendance";
import { Attendance } from "@/types/attendance";
import Can from "@/components/rbac/Can";
import { Roles } from "@/enums/Roles";
import { useAbility } from "@/hooks/useAbility";

interface PaginationInfo {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

const ADMIN_ROLES = [Roles.ADMIN, Roles.PBC_STAFF];

export default function AttendancePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportDate, setExportDate] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [todaysAttendance, setTodaysAttendance] = useState<Attendance | null>(
    null
  );
  const [showMarkInModal, setShowMarkInModal] = useState(false);
  const [showMarkOutModal, setShowMarkOutModal] = useState(false);
  const [showTasksModal, setShowTasksModal] = useState(false);
  const [hasMarkedToday, setHasMarkedToday] = useState(false);

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const MemberRoles = [Roles.CORPORATE, Roles.INDIVIDUAL];

  const ability = useAbility();

  const [pagination, setPagination] = useState<PaginationInfo>({
    totalItems: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
  });

  const fetchAttendancesData = async () => {
    setLoading(true);
    try {
      let response;

      if (selectedTab === "all") {
        response = await getAllAttendances(
          token || "",
          pagination.currentPage,
          pagination.pageSize
        );

        setAttendances(response.data);
        setPagination(response.pagination);
      } else if (selectedTab === "my") {
        response = await getPersonalAttendances(token || "");
        setAttendances(response.data);
      }
    } catch (error) {
      console.error("Error fetching attendances:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch attendances"
      );
      setAttendances([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaysAttendance = async () => {
    try {
      const response = await getTodayAttendance(token || "");
      setTodaysAttendance(response.data || null);
      setHasMarkedToday(!!response.data);
    } catch (error) {
      console.error("Error fetching today's attendance:", error);
      setTodaysAttendance(null);
      setHasMarkedToday(false);
    }
  };

  useEffect(() => {
    if (!token || token === "undefined" || !user) return;

    if (token && !ability?.can("read", "Attendance")) {
      toast.error("You are not authorized to access this page. Routing you back to the homepage");
      router.push("/userMarketplace");
      return;
    }

    if (ADMIN_ROLES.includes(user?.Role?.name as Roles)) {
      setSelectedTab("my");
    }
    fetchTodaysAttendance();
    fetchAttendancesData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedTab, pagination.currentPage]);

  const handleTabChange = (tabName: string) => {
    if (tabName === selectedTab) return;

    setAttendances([]);
    setLoading(true);

    setPagination({
      totalItems: 0,
      totalPages: 0,
      currentPage: 1,
      pageSize: 10,
    });

    setSelectedTab(tabName);
  };

  const handlePageChange = (pageNumber: number) => {
    setPagination({ ...pagination, currentPage: pageNumber });
  };

  const handleAttendanceMarked = () => {
    fetchTodaysAttendance();
    if (selectedTab === "my") {
      fetchAttendancesData();
    }
  };

  const handleTasksUpdated = () => {
    fetchTodaysAttendance();
    if (selectedTab === "my") {
      fetchAttendancesData();
    }
  };

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      await exportAttendanceToExcel(token || "", exportDate);
      toast.success("Attendance exported successfully!");
    } catch (error) {
      console.error("Error exporting attendance:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to export attendance"
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="py-8">
      {showMarkInModal && (
        <MarkAttendanceModal
          open={showMarkInModal}
          onClose={() => setShowMarkInModal(false)}
          onSuccess={handleAttendanceMarked}
          action="in"
        />
      )}

      {showMarkOutModal && (
        <MarkAttendanceModal
          open={showMarkOutModal}
          onClose={() => setShowMarkOutModal(false)}
          onSuccess={handleAttendanceMarked}
          action="out"
        />
      )}

      {showTasksModal && todaysAttendance && (
        <UpdateTasksModal
          open={showTasksModal}
          onClose={() => setShowTasksModal(false)}
          onSuccess={handleTasksUpdated}
          initialTasks={todaysAttendance.tasks}
        />
      )}

      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800 flex-1 flex-row">
        <div className="flex flex-col items-start justify-between lg:flex mb-6">
          <div className="flex flex-row items-center justify-between gap-4 w-full">
            <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
              Attendance
            </h3>

            <div className="flex space-x-2">
              <Can I="create" a="Attendance">
                {!hasMarkedToday && (
                  <button
                    onClick={() => setShowMarkInModal(true)}
                    className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-800 rounded-md transition-colors"
                  >
                    Mark In Today&apos;s Attendance
                  </button>
                )}
                {hasMarkedToday && !todaysAttendance?.clockOut && (
                  <button
                    onClick={() => setShowMarkOutModal(true)}
                    className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-800 rounded-md transition-colors"
                  >
                    Mark Out Today&apos;s Attendance
                  </button>
                )}
              </Can>
         
              <Can I="manage" a="Attendance">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={exportDate}
                    onChange={(e) => setExportDate(e.target.value)}
                    className="px-3 py-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:border-gold-500"
                    title="Select a date to export (optional)"
                  />
                  <button
                    onClick={handleExportExcel}
                    disabled={exporting}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 text-white rounded-md transition-colors"
                  >
                    {exporting ? "Exporting..." : "Export Excel"}
                  </button>
                </div>
              </Can>
            </div>
          </div>

          {/* Today's attendance card */}
          {hasMarkedToday && todaysAttendance && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gold-500 mb-4">
                Today&apos;s Attendance
              </h2>
              <div
                onClick={() => router.push(`/attendance/todays-attendance`)}
                className="cursor-pointer hover:opacity-90 transition-opacity"
              >
                <AttendanceCard
                  attendance={todaysAttendance}
                  onUpdateTasks={() =>
                    router.push(`/attendance/todays-attendance`)
                  }
                />
              </div>
            </div>
          )}

          {/* Tab navigation */}
          <div className="mb-6">
            <div className="flex space-x-2 border-b border-gray-700 overflow-x-auto pb-2 w-full md:w-auto">
              {user && ADMIN_ROLES.includes(user?.Role?.name as Roles) && (
                <button
                  onClick={() => handleTabChange("my")}
                  className={`px-4 py-2 rounded-t-md ${
                    selectedTab === "my"
                      ? "bg-gray-800 text-gold-500 border-b-2 border-gold-500"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  My Attendance
                </button>
              )}

              {user && !ADMIN_ROLES.includes(user?.Role?.name as Roles) && (
                <button
                  onClick={() => handleTabChange("all")}
                  className={`px-4 py-2 rounded-t-md ${
                    selectedTab === "all"
                      ? "bg-gray-800 text-gold-500 border-b-2 border-gold-500"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  All Attendance
                </button>
              )}
            </div>
          </div>

          {/* Attendance Records */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
              </div>
            ) : attendances.length === 0 ? (
              <div className="col-span-full bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
                <p className="text-gray-400">No attendance records found.</p>
              </div>
            ) : (
              attendances.map((attendance) => (
                <div
                  key={attendance.id}
                  className="hover:opacity-90 transition-opacity"
                >
                  <AttendanceCard
                    attendance={attendance}
                    showUser={selectedTab === "all"}
                  />
                </div>
              ))
            )}
          </div>

          <div className="mt-6 w-full flex justify-center">
            {selectedTab === "all" && (
              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                isLoading={loading}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
