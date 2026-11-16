import React, { useEffect, useRef, useState } from "react";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import useAuthStore from "@/store/authStore";
import { toast } from "react-toastify";
import Pagination from "@/components/common/Pagination";
import { FaTimes, FaFilter } from "react-icons/fa";
import Can from "@/components/rbac/Can";

enum Interaction {
  CLICK = "CLICK",
  COPY = "COPY",
}

enum InteractionType {
  EMAIL = "EMAIL",
  PHONE = "PHONE",
}

interface User {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
}

interface ActivityLog {
  id: number;
  observerId: number;
  interactedUserId: number;
  interaction: Interaction;
  interactionType: InteractionType;
  createdAt: string;
  Observer: User;
  InteractedUser: User;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

interface Filters {
  interaction?: Interaction;
  interactionType?: InteractionType;
  observerId?: number;
  interactedUserId?: number;
}

export default function InteractionLogTab() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    totalItems: 0,
    totalPages: 0,
    currentPage: 1,
    pageSize: 10,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const downloadCsvRef = useRef<HTMLAnchorElement | null>(null);

  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    fetchActivityLogs();
  }, [
    token,
    pagination.currentPage,
    filters?.interactedUserId,
    filters?.observerId,
    filters?.interaction,
    filters?.interactionType,
  ]);

  const fetchActivityLogs = async () => {
    if (!token || token === "undefined") {
      return;
    }

    try {
      setLoading(true);

      const queryParams = new URLSearchParams();
      queryParams.append("page", pagination.currentPage.toString());
      queryParams.append("limit", pagination.pageSize.toString());

      if (filters?.interaction) {
        queryParams.append("interaction", filters.interaction);
      }

      if (filters?.interactionType) {
        queryParams.append("interactionType", filters.interactionType);
      }

      if (filters?.observerId) {
        queryParams.append("observerId", filters.observerId.toString());
      }

      if (filters?.interactedUserId) {
        queryParams.append(
          "interactedUserId",
          filters.interactedUserId.toString()
        );
      }

      if (searchTerm) {
        queryParams.append("search", searchTerm);
      }

      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/api/activity-log?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token,
          },
        }
      );

      const data = await response.json();

      if (data.error) {
        toast.error(data.error[0]?.msg || "Failed to fetch interaction logs");
      } else {
        setLogs(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching interaction logs:", error);
      toast.error("Error fetching interaction logs");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!token) {
      toast.error("You are not logged in");
      return;
    }

    try {
      setIsExporting(true);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/activity-log/export/csv`,
        {
          method: "GET",
          headers: {
            token,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to download CSV");
      }

      const blob = await res.blob();
      const timestamp = new Date()
        .toLocaleString("en-US", { hour12: false })
        .replace(/[/:, ]/g, "-");
      const filename = `interaction-logs-${timestamp}.csv`;

      const url = window.URL.createObjectURL(blob);

      if (downloadCsvRef.current) {
        downloadCsvRef.current.href = url;
        downloadCsvRef.current.download = filename;
        downloadCsvRef.current.click();
        setTimeout(() => window.URL.revokeObjectURL(url), 500);
      }

      toast.success("CSV exported successfully");
    } catch (err) {
      console.error(err);
      toast.error("Error exporting CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setPagination({ ...pagination, currentPage: page });
    }
  };

  const handleFilterChange = (filterName: keyof Filters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: value || undefined,
    }));
  };

  const clearFilters = () => {
    setFilters(null);
    setSearchTerm("");
    setPagination({ ...pagination, currentPage: 1 });
  };

  const getInteractionBadgeClasses = (interaction: Interaction) => {
    switch (interaction) {
      case Interaction.CLICK:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case Interaction.COPY:
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getTypeBadgeClasses = (type: InteractionType) => {
    switch (type) {
      case InteractionType.EMAIL:
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case InteractionType.PHONE:
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const hasActiveFilters = () => {
    return !!(
      filters?.interaction ||
      filters?.interactionType ||
      filters?.observerId ||
      filters?.interactedUserId ||
      searchTerm
    );
  };

  return (
    <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
      <div className="items-center justify-between lg:flex mb-4">
        <div>
          <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            Interaction Logs
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            View all user interactions and activity on the platform
          </p>
        </div>

        <div className="flex flex-wrap items-center mt-3 lg:mt-0 gap-3">
          <Can I="manage" a="Logs">
            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300"
            >
              {isExporting ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Exporting...
                </>
              ) : (
                "Export CSV"
              )}
              <a ref={downloadCsvRef} style={{ display: "none" }} />
            </button>
          </Can>
          <button
            className="flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-800 bg-gold-600 rounded-lg hover:bg-gold-700 focus:ring-4 focus:ring-gold-300"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
          >
            {/* @ts-ignore */}
            <FaFilter className="w-4 h-4 mr-2" />
            Filter Logs
          </button>
        </div>
      </div>

      {showFilterPanel && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-inner">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label
                htmlFor="interaction-filter"
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                Interaction
              </label>
              <select
                id="interaction-filter"
                value={filters?.interaction || ""}
                onChange={(e) =>
                  handleFilterChange("interaction", e.target.value || undefined)
                }
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-gold-500 focus:border-gold-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Interactions</option>
                <option value={Interaction.CLICK}>{Interaction.CLICK}</option>
                <option value={Interaction.COPY}>{Interaction.COPY}</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="type-filter"
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                Interaction Type
              </label>
              <select
                id="type-filter"
                value={filters?.interactionType || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "interactionType",
                    e.target.value || undefined
                  )
                }
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-gold-500 focus:border-gold-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">All Types</option>
                <option value={InteractionType.EMAIL}>
                  {InteractionType.EMAIL}
                </option>
                <option value={InteractionType.PHONE}>
                  {InteractionType.PHONE}
                </option>
              </select>
            </div>

            <div>
              <label
                htmlFor="observer-id-filter"
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                Observer ID
              </label>
              <input
                type="number"
                id="observer-id-filter"
                value={filters?.observerId || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "observerId",
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-gold-500 focus:border-gold-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter observer ID"
              />
            </div>

            <div>
              <label
                htmlFor="interacted-id-filter"
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                Interacted User ID
              </label>
              <input
                type="number"
                id="interacted-id-filter"
                value={filters?.interactedUserId || ""}
                onChange={(e) =>
                  handleFilterChange(
                    "interactedUserId",
                    e.target.value ? parseInt(e.target.value) : undefined
                  )
                }
                className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-gold-500 focus:border-gold-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Enter interacted user ID"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={clearFilters}
              disabled={!hasActiveFilters()}
              className={`px-4 py-2.5 text-gray-700 bg-white border border-gray-300 ${
                hasActiveFilters()
                  ? "hover:bg-gray-100"
                  : "opacity-50 cursor-not-allowed"
              } focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm`}
            >
              {/* @ts-ignore */}
              <FaTimes className="inline-block mr-2 -mt-1" />
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Active filters display */}
      {(filters?.interaction ||
        filters?.interactionType ||
        filters?.observerId ||
        filters?.interactedUserId) && (
        <div className="mb-6 flex flex-wrap items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <span className="font-medium text-sm text-blue-700 dark:text-blue-300 mr-2">
            {/* @ts-ignore */}
            <FaFilter className="w-4 h-4 inline mr-1 -mt-0.5" />
            Active filters:
          </span>

          {filters.interaction && (
            <span className="bg-white text-blue-800 text-xs font-medium px-3 py-1.5 rounded-full border border-blue-200 flex items-center shadow-sm">
              Interaction: {filters.interaction}
              <button
                onClick={() => handleFilterChange("interaction", undefined)}
                className="ml-2 text-blue-800 hover:bg-blue-100 rounded-full h-5 w-5 flex items-center justify-center"
                aria-label="Remove interaction filter"
              >
                ×
              </button>
            </span>
          )}

          {filters.interactionType && (
            <span className="bg-white text-blue-800 text-xs font-medium px-3 py-1.5 rounded-full border border-blue-200 flex items-center shadow-sm">
              Type: {filters.interactionType}
              <button
                onClick={() => handleFilterChange("interactionType", undefined)}
                className="ml-2 text-blue-800 hover:bg-blue-100 rounded-full h-5 w-5 flex items-center justify-center"
                aria-label="Remove interaction type filter"
              >
                ×
              </button>
            </span>
          )}

          {filters.observerId && (
            <span className="bg-white text-blue-800 text-xs font-medium px-3 py-1.5 rounded-full border border-blue-200 flex items-center shadow-sm">
              Observer ID: {filters.observerId}
              <button
                onClick={() => handleFilterChange("observerId", undefined)}
                className="ml-2 text-blue-800 hover:bg-blue-100 rounded-full h-5 w-5 flex items-center justify-center"
                aria-label="Remove observer ID filter"
              >
                ×
              </button>
            </span>
          )}

          {filters.interactedUserId && (
            <span className="bg-white text-blue-800 text-xs font-medium px-3 py-1.5 rounded-full border border-blue-200 flex items-center shadow-sm">
              Interacted User ID: {filters.interactedUserId}
              <button
                onClick={() =>
                  handleFilterChange("interactedUserId", undefined)
                }
                className="ml-2 text-blue-800 hover:bg-blue-100 rounded-full h-5 w-5 flex items-center justify-center"
                aria-label="Remove interacted user ID filter"
              >
                ×
              </button>
            </span>
          )}

          <button
            onClick={clearFilters}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline ml-auto"
          >
            Clear all
          </button>
        </div>
      )}

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
                        ID
                      </th>
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
                        Interacted User
                      </th>
                      <th
                        scope="col"
                        className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                      >
                        Interaction
                      </th>
                      <th
                        scope="col"
                        className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                      >
                        Type
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
                        <td className="p-4 text-sm font-medium text-gray-900 whitespace-nowrap dark:text-white">
                          {log.id}
                        </td>
                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                          <div>
                            <div className="font-medium">
                              {log.Observer.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              ID: {log.observerId} • {log.Observer.email}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                          <div>
                            <div className="font-medium">
                              {log.InteractedUser.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              ID: {log.interactedUserId} •{" "}
                              {log.InteractedUser.email}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getInteractionBadgeClasses(
                              log.interaction
                            )}`}
                          >
                            {log.interaction}
                          </span>
                        </td>
                        <td className="p-4 text-sm whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeBadgeClasses(
                              log.interactionType
                            )}`}
                          >
                            {log.interactionType}
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
              onPageChange={handlePageChange}
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-10 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
          <svg
            className="w-12 h-12 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300">
            No interaction logs found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {filters || searchTerm
              ? "Try changing your search or filters"
              : "No data found for this resource"}
          </p>
          {(filters || searchTerm) && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-opacity-50 text-sm"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
