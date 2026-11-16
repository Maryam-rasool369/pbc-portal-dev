"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button, Modal, TextInput, Textarea } from "flowbite-react";
import { HiPlus, HiOutlineExclamationCircle, HiDownload } from "react-icons/hi";
import useAuthStore from "@/store/authStore";
import { useLoadingStore } from "@/store/useLoadingStore";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import Can from "@/components/rbac/Can";
import {
  createInitiative,
  exportInitiativesToExcel,
  fetchAllInitiatives,
  fetchAllUsers,
} from "@/services/initiative";
import { Roles } from "@/enums/Roles";
import { useAbility } from "@/hooks/useAbility";
import { formatStatus } from "@/utils/formatStatus";
import { formatDateAndTime } from "@/utils/formatDateAndTime";

interface Initiative {
  id: number;
  title: string;
  description: string;
  status: "PLANNED" | "ON_GOING" | "FINISHED" | "ABORTED";
  datePlanned?: string;
  createdAt: string;
  user: {
    name: string;
  };
  userId: number;
  assignees?: Array<{ id: number; name: string }>;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export default function Initiatives() {
  const [activeTab, setActiveTab] = useState<
    "PLANNED" | "ON_GOING" | "FINISHED" | "ABORTED"
  >("PLANNED");
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const limit: number = 5;

  const ability = useAbility();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    assignees: [] as number[],
  });

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setGlobalLoading = useLoadingStore((state) => state.setLoading);
  const router = useRouter();
  const MemberRoles = [Roles.CORPORATE, Roles.INDIVIDUAL];

  const fetchUsers = useCallback(async () => {
    if (!token || token === "undefined") return;
    try {
      setLoadingUsers(true);
      const data = await fetchAllUsers(token);
      setUsers(data);
    } catch (error: any) {
      console.error("Failed to fetch users:", error);
      toast.error(error.message || "Failed to fetch users");
    } finally {
      setLoadingUsers(false);
    }
  }, [token]);

  const fetchInitiatives = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllInitiatives(
        token || "",
        activeTab,
        currentPage,
        limit
      );
      setInitiatives(data.data);
      setPagination(data.pagination);
    } catch (error: any) {
      console.error("Failed to fetch initiatives:", error);
      toast.error(error.message || "Failed to fetch initiatives");
      setInitiatives([]);
    } finally {
      setLoading(false);
    }
  }, [token, activeTab, currentPage]);

  useEffect(() => {
    if (!token || token === "undefined") return;
    if (token && !ability?.can("read", "Initiative")) {
      toast.error("You are not authorized to access this page. Routing you back to the homepage");
      router.push("/userMarketplace");
      return;
    }
    fetchUsers();
    fetchInitiatives();
  }, [
    token,
    activeTab,
    currentPage,
    ability,
    router,
    fetchInitiatives,
    fetchUsers,
  ]);

  useEffect(() => {
    if (!showExportDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showExportDropdown]);

  const handleExportExcel = async (
    exportStatus: "PLANNED" | "ON_GOING" | "FINISHED" | "ABORTED" | "ALL"
  ) => {
    if (!token || token === "undefined") {
      toast.error("You are not logged in");
      return;
    }

    try {
      setShowExportDropdown(false);
      setIsExporting(true);
      const blob = await exportInitiativesToExcel(token, exportStatus);

      const timestamp = new Date()
        .toLocaleString("en-US", { hour12: false })
        .replace(/[/:, ]/g, "-");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `initiatives-${
        exportStatus === "ALL" ? "all-statuses" : exportStatus.toLowerCase()
      }-${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Initiatives exported successfully");
    } catch (error: any) {
      console.error("Failed to export initiatives:", error);
      toast.error(error.message || "Failed to export initiatives");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCreateInitiative = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!token) {
      toast.error("You must be logged in to create an initiative");
      return;
    }

    try {
      setIsSubmitting(true);
      setGlobalLoading(true);
      const payload = {
        title: formData.title,
        description: formData.description,
        ...(formData.date.trim() && { date: formData.date }),
        ...(formData.assignees.length > 0 && { assignees: formData.assignees }),
      };
      const res = await createInitiative(token || "", payload);
      toast.success(res.message || "Initiative created successfully");
      setOpenCreateModal(false);
      setAssigneeSearch("");
      setFormData({ title: "", description: "", date: "", assignees: [] });
      fetchInitiatives();
    } catch (error: any) {
      console.error("Initiative creation failed:", error);
      toast.error(error.message || "Failed to create initiative");
    } finally {
      setIsSubmitting(false);
      setGlobalLoading(false);
    }
  };

  const getStatusBadgeClass = (
    status: "PLANNED" | "ON_GOING" | "FINISHED" | "ABORTED"
  ) => {
    switch (status) {
      case "PLANNED":
        return "bg-blue-500/20 text-blue-500";
      case "ON_GOING":
        return "bg-yellow-500/20 text-yellow-500";
      case "FINISHED":
        return "bg-green-500/20 text-green-500";
      case "ABORTED":
        return "bg-red-500/20 text-red-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  const handlePageChange = (page: number) => {
    if (pagination && page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(assigneeSearch.trim().toLowerCase()),
  );

  return (
    <>
      <div className="container mx-auto px-4 py-8 min-h-screen">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Initiatives</h1>
            <p className="text-gray-400">Create and manage initiatives</p>
          </div>

          <div className="flex gap-4">
            <Can I="manage" a="Initiative">
              <div className="relative" ref={exportDropdownRef}>
                <Button
                  onClick={() => setShowExportDropdown((prev) => !prev)}
                  disabled={isExporting || loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                      Exporting...
                    </div>
                  ) : (
                    <>
                      {/* @ts-ignore */}
                      <HiDownload className="mr-2" /> Export Excel
                    </>
                  )}
                </Button>

                {showExportDropdown && !isExporting && (
                  <div className="absolute right-0 mt-2 w-52 rounded-md border border-gray-700 bg-gray-900 shadow-xl z-20">
                    {[
                      { label: "Planned", value: "PLANNED" },
                      { label: "On Going", value: "ON_GOING" },
                      { label: "Finished", value: "FINISHED" },
                      { label: "Aborted", value: "ABORTED" },
                      { label: "All", value: "ALL" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() =>
                          handleExportExcel(
                            option.value as
                              | "PLANNED"
                              | "ON_GOING"
                              | "FINISHED"
                              | "ABORTED"
                              | "ALL"
                          )
                        }
                        className="block w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-800"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Can>

            <Can I="create" a="Initiative">
              <Button
                onClick={() => setOpenCreateModal(true)}
                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors"
              >
                {/* @ts-ignore */}
                <HiPlus className="mr-2" /> Create Initiative
              </Button>
            </Can>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex space-x-2 border-b border-gray-700 overflow-x-auto pb-2">
            {["PLANNED", "ON_GOING", "FINISHED", "ABORTED"].map((status) => (
              <button
                key={status}
                onClick={() => setActiveTab(status as any)}
                className={`px-4 py-2 rounded-t-md ${
                  activeTab === status
                    ? "bg-gray-800 text-gold-500 border-b-2 border-gold-500"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden shadow-lg">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
            </div>
          ) : initiatives.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              {/* @ts-ignore */}
              <HiOutlineExclamationCircle className="mx-auto h-12 w-12 mb-4" />
              <h3 className="text-lg font-medium">No initiatives found</h3>
              <p className="mt-2 text-sm">
                {`No ${activeTab.toLowerCase()} initiatives at the moment`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Initiative By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Initiative Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {initiatives.map((initiative) => (
                    <tr key={initiative.id} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">
                          {initiative.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {initiative.assignees && initiative.assignees.length > 0
                          ? initiative.assignees.map((assignee) => assignee.name).join(", ")
                          : "No assignees"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(initiative.status)}`}
                        >
                          {formatStatus(initiative.status || "")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {initiative.datePlanned
                          ? formatDateAndTime(initiative.datePlanned, true)
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium">
                        <button
                          onClick={() =>
                            router.push(`/initiatives/${initiative.id}`)
                          }
                          className="text-blue-400 hover:text-blue-300"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <div className="flex gap-2">
              <Button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="bg-gray-700"
              >
                Previous
              </Button>
              {Array.from(
                { length: pagination.totalPages },
                (_, i) => i + 1
              ).map((page) => (
                <Button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={
                    currentPage === page ? "bg-gold-500" : "bg-gray-700"
                  }
                >
                  {page}
                </Button>
              ))}
              <Button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
                className="bg-gray-700"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        <Modal
          show={openCreateModal}
          onClose={() => {
            if (!isSubmitting) {
              setOpenCreateModal(false);
              setAssigneeSearch("");
            }
          }}
          dismissible={!isSubmitting}
        >
          <Modal.Header className="bg-gray-800 border-b border-gray-700">
            <span className="text-gold-500">Create New Initiative</span>
          </Modal.Header>
          <Modal.Body className="bg-gray-800 p-6 overflow-y-auto max-h-[calc(90vh-10rem)]">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <TextInput
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter initiative title"
                  required
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe your initiative"
                  required
                  rows={4}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date *
                </label>
                <TextInput
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="bg-gray-700 border-gray-600 text-white"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Initiative By (Optional) - Select One
                </label>
                <div className="mb-3">
                  <TextInput
                    value={assigneeSearch}
                    onChange={(e) => setAssigneeSearch(e.target.value)}
                    placeholder="Search user by name"
                    className="bg-gray-700 border-gray-600 text-white"
                    disabled={loadingUsers || isSubmitting}
                  />
                </div>
                <div className="bg-gray-700 border border-gray-600 rounded-lg p-3 max-h-64 overflow-y-auto">
                  {loadingUsers || !user ? (
                    <p className="text-gray-400 text-sm">Loading users...</p>
                  ) : users.length === 0 ? (
                    <p className="text-gray-400 text-sm">No users available</p>
                  ) : filteredUsers.length === 0 ? (
                    <p className="text-gray-400 text-sm">No matching users found</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredUsers.map((u) => {
                        return (
                        <label
                          key={u.id}
                          className="flex items-center gap-2 cursor-pointer hover:bg-gray-600 p-2 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={formData.assignees.includes(u.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  assignees: [u.id],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  assignees: [],
                                });
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-500 bg-gray-600 text-gold-500"
                          />
                          <span className="text-sm text-gray-200">{u.name}</span>
                        </label>
                      )})}
                    </div>
                  )}
                </div>
                {formData.assignees.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.assignees.map((assigneeId) => {
                      const assignee = users.find((u) => u.id === assigneeId);
                      return (
                        <span
                          key={assigneeId}
                          className="inline-flex items-center gap-1 bg-gold-500/20 text-gold-500 px-2 py-1 rounded text-sm"
                        >
                          {assignee?.name}
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                assignees: formData.assignees.filter(
                                  (id) => id !== assigneeId
                                ),
                              })
                            }
                            className="text-gold-500 hover:text-gold-400"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="bg-gray-800 border-t border-gray-700">
            <Button
              onClick={handleCreateInitiative}
              className="bg-gold-500 hover:bg-gold-600 text-black"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Initiative"}
            </Button>
            <Button 
              color="gray" 
              onClick={() => {
                setOpenCreateModal(false);
                setAssigneeSearch("");
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </>
  );
}
