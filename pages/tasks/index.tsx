"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { HiDownload } from "react-icons/hi";
import Pagination from "@/components/common/Pagination";

import AddTaskModal from "@/components/tasks/addTaskModal";
import UpdateTaskStatusModal from "@/components/tasks/updateTaskStatusModal";
import TaskStatusSelector from "@/components/tasks/TaskStatusSelector";
import useAuthStore from "@/store/authStore";
import {
  createTask,
  fetchAllTasks,
  fetchAssignedTasks,
  fetchCreatedTasks,
  exportTasksToExcel,
  updateTaskStatus,
} from "@/services/tasks";
import { Task, TaskStatus } from "@/types/task";
import Can from "@/components/rbac/Can";
import { Roles } from "@/enums/Roles";
import { useAbility } from "@/hooks/useAbility";
import _ from "lodash";
import { formatStatus } from "@/utils/formatStatus";
import Filter from "@/components/common/Filter";
import { useTaskPermissions } from "@/hooks/useTaskPermissions";
import { formatDateAndTime } from "@/utils/formatDateAndTime";

interface PaginationInfo {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}

export default function Tasks() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const MemberRoles = [Roles.CORPORATE, Roles.INDIVIDUAL];
  const [selectedTask, setSelectedTask] = useState<{
    id: number;
    status: TaskStatus;
  } | null>(null);

  const [pagination, setPagination] = useState<PaginationInfo>({
    totalItems: 0,
    totalPages: 0,
    currentPage: 1,
    itemsPerPage: 10,
  });

  const [statusFilter, setStatusFilter] = useState<Record<string, string>>({});

  const {
    canAccessPage,
    canCreate,
    canViewAll,
    canUpdateTask,
    isHigherManagementRole,
    defaultTab,
    userRole,
  } = useTaskPermissions();

  const fetchTasksData = async () => {
    setLoading(true);
    try {
      let response;

      const hasHigherAccess = isHigherManagementRole;

      if (selectedTab === "all" && hasHigherAccess) {
        response = await fetchAllTasks(
          token || "",
          pagination.currentPage,
          pagination.itemsPerPage,
          statusFilter.status
        );
      } else if (selectedTab === "assigned") {
        // Both higher management and staff can view tasks assigned to them
        response = await fetchAssignedTasks(
          token || "",
          pagination.currentPage,
          pagination.itemsPerPage,
          statusFilter.status
        );
      } else if (selectedTab === "created" && hasHigherAccess) {
        // Only higher management can view tasks created by them
        response = await fetchCreatedTasks(
          token || "",
          pagination.currentPage,
          pagination.itemsPerPage,
          statusFilter.status
        );
      }

      if (response) {
        // Verify the data structure before setting state
        const { data, pagination: paginationData } = response;

        if (Array.isArray(data)) {
          const invalidTasks = data.filter(
            (task) => !task || !task.id || !task.assignees || !task.assigner
          );

          if (invalidTasks.length > 0) {
            console.warn(
              `Found ${invalidTasks.length} tasks with missing data`
            );
          }

          setTasks(data);
          setPagination({
            totalItems: paginationData.totalItems,
            totalPages: paginationData.totalPages,
            currentPage: paginationData.currentPage,
            itemsPerPage: pagination.itemsPerPage,
          });
        } else {
          console.error("Received invalid tasks data:", data);
          setTasks([]);
        }
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch tasks"
      );
      setTasks([]); // Reset tasks on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccessPage) return;
    setSelectedTab(defaultTab);
  }, [canAccessPage, defaultTab]);

  useEffect(() => {
    if (!token || token === "undefined") return;
    if (token && !canAccessPage) {
      toast.error("You are not authorized to access this page. Routing you back to the homepage");
      router.push("/userMarketplace");
      return;
    }
    setTasks([]);

    fetchTasksData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedTab, pagination.currentPage, statusFilter, canAccessPage]);

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

  const handleAddTask = async (taskData: any) => {
    try {
      const res = await createTask(token || "", taskData);
      toast.success(res?.message || "Task created successfully");
      fetchTasksData();
    } catch (error) {
      console.error("Error creating task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create task"
      );
    }
  };

  const handleUpdateStatus = async (status: TaskStatus) => {
    if (!selectedTask) return;

    try {
      await updateTaskStatus(token || "", selectedTask.id, { status });
      toast.success("Task status updated successfully");
      fetchTasksData();
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update task status"
      );
    }
  };

  const handleViewDetails = (taskId: number) => {
    router.push(`/tasks/${taskId}`);
  };

  const handlePageChange = (pageNumber: number) => {
    setPagination({ ...pagination, currentPage: pageNumber });
  };

  const handleTabChange = (tabName: string) => {
    if (tabName === selectedTab) return;

    setTasks([]);
    setLoading(true);

    setPagination({
      totalItems: 0,
      totalPages: 0,
      currentPage: 1,
      itemsPerPage: 10,
    });

    setStatusFilter({});
    setSelectedTask(null);
    setSelectedTab(tabName);
  };

  const getStatusBadgeClass = (status: TaskStatus) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-500/20 text-yellow-500";
      case "IN_PROGRESS":
        return "bg-blue-500/20 text-blue-500";
      case "COMPLETED":
        return "bg-green-500/20 text-green-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  const getAssigneeNames = (task: Task) => {
    if (!task.assignees || task.assignees.length === 0) return "None";

    if (task.assignees.length === 1) {
      return task.assignees[0].name;
    }

    return `${task.assignees[0].name} +${task.assignees.length - 1}`;
  };

  const isUserAssignedToTask = (task: Task) => {
    if (!user || !task.assignees) return false;
    return task.assignees.some((assignee) => assignee.id === Number(user.id));
  };

  const isAssigner = (task: Task) => {
    if (!user || !task.assigner) return false;
    return task.assigner.id === Number(user.id);
  };

  const filterFields = [
    {
      name: "status",
      label: "Status",
      options: [
        { value: "PENDING", label: "Pending" },
        { value: "IN_PROGRESS", label: "In Progress" },
        { value: "COMPLETED", label: "Completed" },
      ],
    },
  ];

  const handleFilterChange = (filters: Record<string, string>) => {
    setStatusFilter(filters);
  };
  const handleFilterApply = (filters: Record<string, string>) => {
    setStatusFilter(filters);
  };
  const handleFilterClear = () => {
    setStatusFilter({});
  };

  const handleExportExcel = async (
    exportStatus: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "ALL"
  ) => {
    if (!token || token === "undefined") {
      toast.error("You are not logged in");
      return;
    }

    try {
      setShowExportDropdown(false);
      setIsExporting(true);

      const exportScope =
        selectedTab === "all"
          ? "all"
          : selectedTab === "created"
            ? "created"
            : "assigned";

      const blob = await exportTasksToExcel(token, exportStatus, exportScope);
      const timestamp = new Date()
        .toLocaleString("en-US", { hour12: false })
        .replace(/[/:, ]/g, "-");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tasks-${exportStatus === "ALL" ? "all-statuses" : exportStatus.toLowerCase()
        }-${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Tasks exported successfully");
    } catch (error: any) {
      console.error("Error exporting tasks:", error);
      toast.error(error?.message || "Failed to export tasks");
    } finally {
      setIsExporting(false);
    }
  };



  return (
    <div className="p-4 bg-gray-800 mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6">
      <Filter
        title="Tasks"
        heading="Tasks"
        description="Manage and track your tasks"
        filters={statusFilter || {}}
        onChange={handleFilterChange}
        onApply={handleFilterApply}
        onClear={handleFilterClear}
        fields={filterFields}
      />
      <div className="flex gap-4">
        <Can I="create" a="Task">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create New Task
          </button>
        </Can>
        <Can I="read" a="Task">
          <div className="relative" ref={exportDropdownRef}>
            <button
              onClick={() => setShowExportDropdown((prev) => !prev)}
              disabled={isExporting || loading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                  Exporting...
                </>
              ) : (
                <>
                  {/* @ts-ignore */}
                  <HiDownload className="h-5 w-5 mr-2" />
                  Export Excel
                </>
              )}
            </button>

            {showExportDropdown && !isExporting && (
              <div className="absolute right-0 mt-2 w-52 rounded-md border border-gray-700 bg-gray-900 shadow-xl z-20">
                {[
                  { label: "Pending", value: "PENDING" },
                  { label: "In Progress", value: "IN_PROGRESS" },
                  { label: "Completed", value: "COMPLETED" },
                  { label: "All", value: "ALL" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() =>
                      handleExportExcel(
                        option.value as
                        | "PENDING"
                        | "IN_PROGRESS"
                        | "COMPLETED"
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


      </div>
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex border-b border-gray-700 overflow-x-auto">
            {!isHigherManagementRole && (
              <button
                onClick={() => handleTabChange("assigned")}
                className={`px-6 py-3 font-medium ${selectedTab === "assigned"
                  ? "text-gold-500 border-b-2 border-gold-500"
                  : "text-gray-400 hover:text-gold-400"
                  } transition-colors`}
              >
                Assigned to Me
              </button>
            )}


            <Can I="create" a="Task">
              <button
                onClick={() => handleTabChange("created")}
                className={`px-6 py-3 font-medium ${selectedTab === "created"
                  ? "text-gold-500 border-b-2 border-gold-500"
                  : "text-gray-400 hover:text-gold-400"
                  } transition-colors`}
              >
                Created by Me
              </button>
            </Can>

            {/* Only higher management can see "All Tasks" tab */}
            {canViewAll && (
              <button
                onClick={() => handleTabChange("all")}
                className={`px-6 py-3 font-medium ${selectedTab === "all"
                  ? "text-gold-500 border-b-2 border-gold-500"
                  : "text-gray-400 hover:text-gold-400"
                  } transition-colors`}
              >
                All Tasks
              </button>
            )}
          </div>

          {/* <div className="w-full md:w-64">
            <select
              value={statusFilter || ""}
              onChange={(e) => setStatusFilter(e.target.value || undefined)}
              className={`w-full bg-gray-700 text-white border border-gray-600 rounded-md px-4 py-2`}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div> */}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-800">
              <tr>
                <th className="w-72 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="w-48 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {selectedTab === "assigned" ? "Assigned By" : "Assigned To"}
                </th>
                <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Assigned At
                </th>
                <th className="w-40 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
                    </div>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <svg
                        className="w-12 h-12 text-gray-600 mb-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      <p className="text-gray-400 text-lg font-medium">
                        No tasks found
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  if (!task || !task.id) return null;

                  return (
                    <tr key={task.id} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          {task.title || "Untitled Task"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300">
                          {selectedTab === "assigned"
                            ? task.assigner?.name || "Unknown user"
                            : getAssigneeNames(task)}
                        </div>
                        {selectedTab !== "assigned" &&
                          task.assignees?.length > 1 && (
                            <div className="mt-1">
                              <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">
                                {task.assignees.length} assignees
                              </span>
                            </div>
                          )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                            task.status
                          )}`}
                        >
                          {formatStatus(task.status || "")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {task.createdAt
                          ? formatDateAndTime(task.createdAt, true)
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-5">
                          <button
                            onClick={() => handleViewDetails(task.id)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            View
                          </button>

                          <Can I="update" a="Task" >
                            {user && (isUserAssignedToTask(task) || isAssigner(task)) && (
                              <button
                                onClick={() => {
                                  setSelectedTask({
                                    id: task.id,
                                    status: task.status,
                                  });
                                  setShowStatusModal(true);
                                }}
                                className="text-gold-500 hover:text-gold-400"
                              >
                                Update Status
                              </button>
                            )}
                          </Can>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          isLoading={loading}
          onPageChange={handlePageChange}
        />
      )}
      <AddTaskModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddTask}
      />
      <UpdateTaskStatusModal
        open={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onSubmit={handleUpdateStatus}
        taskId={selectedTask?.id || 0}
        currentStatus={selectedTask?.status || "PENDING"}
      />
    </div>
  );
}
