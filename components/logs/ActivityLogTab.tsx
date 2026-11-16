import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import Pagination from "@/components/common/Pagination";
import { useAbility } from "@/hooks/useAbility";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import { HiSearch, HiTrash, HiEye } from "react-icons/hi";
import DeleteAuditLogsModal from "@/components/modals/DeleteAuditLogsModal";
import InformationChangedModal from "@/components/modals/InformationChangedModal";

interface FieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

interface Observer {
  id: number;
  name: string;
  email: string;
}

interface AuditLog {
  id: number;
  action: string;
  method: string;
  path: string;
  statusCode: number;
  entityType?: string;
  entityName?: string;
  changes?: FieldChange[];
  createdAt: string;
  user: Observer;
}

type Pagination = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

const deriveModuleFromPath = (path: string): string => {
  const segment = path
    .split("/")
    .filter((seg) => seg && seg.toLowerCase() !== "api" && !/^\d+$/.test(seg))[0];

  if (!segment) return "—";

  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const ACTION_LABELS: Record<string, string> = {
  POST: "Create",
  PUT: "Update",
  PATCH: "Edit",
  DELETE: "Delete",
};

const getActionLabel = (method: string) => ACTION_LABELS[method] || method;

const getActionBadgeClasses = (method: string) => {
  switch (method) {
    case "POST":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "PUT":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case "PATCH":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case "DELETE":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  }
};

const getStatusLabel = (statusCode: number) =>
  statusCode >= 200 && statusCode < 300 ? "Success" : "Failed";

const getStatusBadgeClasses = (statusCode: number) => {
  if (statusCode >= 200 && statusCode < 300)
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
  if (statusCode >= 400)
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
  return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
};

export default function ActivityLogTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [search, setSearch] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const limit = 10;

  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const ability = useAbility();

  const fetchAuditLogs = async () => {
    if (!token || token === "undefined") return;

    try {
      setLoading(true);

      const queryParams = new URLSearchParams();
      queryParams.append("page", currentPage.toString());
      queryParams.append("limit", limit.toString());
      if (debouncedSearch) queryParams.append("search", debouncedSearch);

      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/api/audit-log?${queryParams.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json", token },
        },
      );

      const data = await response.json();

      if (data.error) {
        toast.error(data.error[0]?.msg || "Failed to fetch activity log");
        if (data.error[0]?.path === "token") {
          useAuthStore.getState().clearToken();
          router.push("/");
        }
      } else {
        setLogs(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching activity log:", error);
      toast.error("Error fetching activity log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [token, currentPage, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDeleteAuditLogs = async (fromDate: string, toDate: string) => {
    if (!token || token === "undefined") return;

    try {
      setIsDeleting(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/audit-log`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json", token },
          body: JSON.stringify({ fromDate, toDate }),
        },
      );

      const data = await response.json();

      if (data.error) {
        toast.error(data.error[0]?.msg || "Failed to delete activity log");
        if (data.error[0]?.path === "token") {
          useAuthStore.getState().clearToken();
          router.push("/");
        }
      } else {
        toast.success(data.message || "Activity log deleted successfully");
        setIsDeleteModalOpen(false);
        fetchAuditLogs();
      }
    } catch (error) {
      console.error("Error deleting activity log:", error);
      toast.error("Error deleting activity log");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
      <div className="items-center justify-between lg:flex mb-4">
        <div>
          <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            Activity Log
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Every action taken on the platform, across all users
          </p>
        </div>

        <div className="flex items-center mt-3 lg:mt-0">
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              {/* @ts-ignore */}
              <HiSearch className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-gold-500 focus:border-gold-500 block w-full pl-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
              placeholder="Search by observer, module or record"
            />
          </div>

          {ability?.can("delete", "Logs") && (
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="ml-2 inline-flex items-center px-4 py-2.5 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              {/* @ts-ignore */}
              <HiTrash className="w-4 h-4 mr-1" />
              Delete Logs
            </button>
          )}
        </div>
      </div>

      <DeleteAuditLogsModal
        isOpen={isDeleteModalOpen}
        isDeleting={isDeleting}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAuditLogs}
      />

      {loading ? (
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      ) : logs.length > 0 ? (
        <div className="flex flex-col mt-6">
          <div className="overflow-x-auto rounded-lg">
            <div className="inline-block min-w-full align-middle">
              <div className="overflow-hidden shadow sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th
                        scope="col"
                        className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                      >
                        Observer
                      </th>
                      <th
                        scope="col"
                        className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                      >
                        Action
                      </th>
                      <th
                        scope="col"
                        className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                      >
                        Module
                      </th>
                      <th
                        scope="col"
                        className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                      >
                        Event
                      </th>
                      <th
                        scope="col"
                        className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                      >
                        Information Changed
                      </th>
                      <th
                        scope="col"
                        className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                      >
                        Date & Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="p-4 text-sm dark:text-white">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {log.user?.name || "—"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {log.user?.email}
                          </div>
                        </td>
                        <td className="p-4 text-sm whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getActionBadgeClasses(
                              log.method,
                            )}`}
                          >
                            {getActionLabel(log.method)}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                          {log.entityType || deriveModuleFromPath(log.path)}
                        </td>
                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                          {log.entityName || log.action || "—"}
                        </td>
                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                          {log.changes && log.changes.length > 0 ? (
                            <button
                              onClick={() => setSelectedLog(log)}
                              className="inline-flex items-center gap-1 text-gold-600 hover:text-gold-700 dark:text-gold-400 dark:hover:text-gold-300"
                              title="View changed information"
                            >
                              {/* @ts-ignore */}
                              <HiEye className="w-5 h-5" />
                              <span className="text-xs">
                                {log.changes.length}
                              </span>
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-4 text-sm whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeClasses(
                              log.statusCode,
                            )}`}
                          >
                            {getStatusLabel(log.statusCode)}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">
                          {formatDateAndTime(log.createdAt, true, true)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {pagination && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              isLoading={loading}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-10 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300">
            {debouncedSearch
              ? "No activity found matching your search"
              : "No activity recorded yet"}
          </h3>
        </div>
      )}

      <InformationChangedModal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={selectedLog?.entityName || selectedLog?.action}
        changes={selectedLog?.changes ?? []}
      />
    </div>
  );
}
