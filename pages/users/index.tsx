import useAuthStore from "@/store/authStore";
import Pagination from "@/components/common/Pagination";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import Can from "@/components/rbac/Can";
import { EmptyStateMessage } from "@/components/ui/EmptyStateMessage";
import { HiSearch, HiUserGroup, HiDownload } from "react-icons/hi";
import Filter, { FilterField } from "@/components/common/Filter";
import RoleTransitionModal from "@/components/modals/RoleTransitionModal";

type UserRole = {
  id: number;
  name: string;
};

interface User {
  id: number;
  name: string;
  email: string;
  Role: UserRole;
  isActive: boolean;
  createdAt: string;
}

type Pagination = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inActive",
}

interface filters {
  status?: UserStatus;
  role?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUserId, setLoadingUserId] = useState<number | null>(null);
  const [approvingOrRejectingUser, setApprovingOrRejectingUser] = useState<{
    approving: boolean;
    rejecting: boolean;
  }>({
    approving: false,
    rejecting: false,
  });
  const [showFilterPanel, setShowFilterPanel] = useState<boolean>(false);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [searchFields, setSearchFields] = useState<string[]>([]);
  const [filterRole, setFilterRole] = useState<string>("");
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const limit: number = 10;
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [loaddingMore, setLoadingMore] = useState<boolean>(false);
  const token = useAuthStore((state) => state.token);
  const roles = useAuthStore((state) => state.roles);
  const router = useRouter();

  const [showRejectModal, setShowRejectModal] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [rejectUserId, setRejectUserId] = useState<number | null>(null);
  const [reasonCharCount, setReasonCharCount] = useState<number>(0);
  const minReasonChars: number = 20;
  const maxReasonChars: number = 500;

  const [filtersModified, setFiltersModified] = useState<boolean>(false);

  const [showRoleTransitionModal, setShowRoleTransitionModal] = useState<boolean>(false);
  const [selectedUserForTransition, setSelectedUserForTransition] = useState<User | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);

  const buildQueryParams = (includePagination = true) => {
    const queryParams = new URLSearchParams();

    if (includePagination) {
      queryParams.append("page", currentPage.toString());
      queryParams.append("limit", limit.toString());
    }

    if (filters?.status) queryParams.append("status", filters.status);
    if (filters?.role) queryParams.append("roleId", filters.role);
    if (filters?.search) {
      queryParams.append("search", filters.search);
      if (searchFields.length > 0) {
        queryParams.append("searchFields", searchFields.join(","));
      }
    }
    queryParams.append("sortBy", "createdAt:desc");

    return queryParams;
  };

  const fetchUsers = async () => {
    if (token === null || token === "undefined") {
      router.push("/");
    } else {
      try {
        setLoadingMore(true);
        const queryParams = buildQueryParams(true);

        const response = await fetch(
          `${
            process.env.NEXT_PUBLIC_API_URL
          }/api/user/all/users?${queryParams.toString()}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              token: token,
            },
          }
        );

        const usersData = await response.json();
        if (usersData.error) {
          toast.error(usersData.error[0].msg);
          if (usersData.error[0].path === "token") {
            router.push("/");
          }
        } else {
          const sortedUsers = [...usersData.data].sort((a, b) => {
            if (a.isActive === b.isActive) return 0;
            return a.isActive ? 1 : -1;
          });
          setUsers(sortedUsers);

          setPagination(usersData.pagination);
        }
      } catch (error) {
        toast.error("Error in fetching users");
      } finally {
        setLoadingMore(false);
        setInitialLoading(false);
      }
    }
  };

  const handleApprove = async (userId: number) => {
    setLoadingUserId(userId);

    if (token === null || token === "undefined") {
      router.push("/");
    } else {
      try {
        setApprovingOrRejectingUser({
          ...approvingOrRejectingUser,
          approving: true,
        });
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/user/activate-user/${userId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              token: token,
            },
          }
        );

        const data = await response.json();
        if (data.message) {
          toast.info("User approved successfully");
          setUsers((prevUsers) =>
            prevUsers.map((user) =>
              user.id === userId ? { ...user, isActive: true } : user
            )
          );
          fetchUsers();
        } else {
          toast.error("Error in approving user");
        }
      } catch (error) {
        toast.error("Error in approving user");
      } finally {
        setLoadingUserId(null);
        setApprovingOrRejectingUser({
          ...approvingOrRejectingUser,
          approving: false,
        });
      }
    }
  };

  const handleReject = (userId: number) => {
    setRejectUserId(userId);
    setRejectReason("");
    setReasonCharCount(0);
    setShowRejectModal(true);
  };

  const submitUserRejection = async () => {
    if (!rejectUserId) return;
    if (
      rejectReason.length < minReasonChars ||
      rejectReason.length > maxReasonChars
    ) {
      toast.error(
        `Rejection reason must be between ${minReasonChars} and ${maxReasonChars} characters.`
      );
      return;
    }

    setLoadingUserId(rejectUserId);

    if (token === null || token === "undefined") {
      router.push("/");
    } else {
      try {
        setApprovingOrRejectingUser({
          ...approvingOrRejectingUser,
          rejecting: true,
        });
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/user/reject-user/${rejectUserId}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              token: token,
            },
            body: JSON.stringify({ reason: rejectReason }),
          }
        );

        const data = await response.json();
        if (data.message) {
          toast.info("User's application is rejected.");
          setUsers((prevUsers) =>
            prevUsers.filter((user) => user.id !== rejectUserId)
          );
          fetchUsers();
          setShowRejectModal(false);
        } else {
          toast.error("Error in rejecting user");
        }
      } catch (error) {
        toast.error("Error in rejecting user");
      } finally {
        setLoadingUserId(null);
        setApprovingOrRejectingUser({
          ...approvingOrRejectingUser,
          rejecting: false,
        });
        setRejectUserId(null);
      }
    }
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setRejectReason(value);
    setReasonCharCount(value.length);
  };

  const handleRoleTransition = (user: User) => {
    setSelectedUserForTransition(user);
    setShowRoleTransitionModal(true);
  };

  const handleRoleTransitionSuccess = () => {
    fetchUsers();
  };

  const handleCloseRoleTransitionModal = () => {
    setShowRoleTransitionModal(false);
    setSelectedUserForTransition(null);
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, filters?.status, filters?.role, filters?.search, searchFields]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters?.status, filters?.role, filters?.search, searchFields]);

  const handlePageChange = (page: number) => {
    if (pagination && page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  };

  // const handleFilterChange = (filterType: "status" | "role", value: string) => {
  //   setFilters((prev) => ({
  //     ...prev,
  //     [filterType]: value,
  //   }));

  //   setFiltersModified(true);

  //   if (filterType === "role") {
  //     roles?.forEach((role) => {
  //       if (role.id.toString() === value) {
  //         setFilterRole(role.name);
  //       }
  //     });
  //   }
  // };
  // const clearFilters = () => {
  //   setFilters(null);
  //   setFiltersModified(false);
  // };

  // const toggleFilterPanel = () => {
  //   setShowFilterPanel((prev) => !prev);
  //   if (!showFilterPanel) {
  //     setFiltersModified(false);
  //   }
  // };

  const searchFieldOptions = [
    { value: "name", label: "Name" },
    { value: "email", label: "Email" },
    { value: "phoneNumber", label: "Phone Number" },
    { value: "productName", label: "Product Name" },
    { value: "category", label: "Membership Category" },
    { value: "subCategory", label: "Membership Sub Category" },
    { value: "hsCodes", label: "HS Codes" },
    { value: "city", label: "City" },
    { value: "country", label: "Country" },
    { value: "businessGroup", label: "Business Group Name" },
    { value: "keywords", label: "Keywords" },
  ];

  const filterFields: FilterField[] = [
    {
      name: "search",
      label: "Search",
      type: "text",
      placeholder: "Search users...",
    },
    {
      name: "searchFields",
      label: "Search In (Optional)",
      type: "multiselect",
      options: searchFieldOptions,
      placeholder: "Select fields to search in (default: all fields)",
    },
    {
      name: "status",
      label: "Status",
      options: [
        { value: "active", label: "Active" },
        { value: "inActive", label: "Inactive" },
      ],
    },
    {
      name: "role",
      label: "Role",
      options:
        roles?.map((role) => ({
          value: role.id.toString(),
          label: role.name,
        })) || [],
    },
  ];

  const handleFilterChange = (filters: Record<string, string>) => {
    // Extract searchFields if present
    const { searchFields: fields, ...otherFilters } = filters;
    
    if (fields !== undefined) {
      // Handle searchFields as array
      setSearchFields(fields ? fields.split(',').filter(Boolean) : []);
    }
    
    setFilters((prev) => ({
      ...prev,
      ...otherFilters,
    }));
  };
  const handleFilterApply = (filters: Record<string, string>) => {
    const { searchFields: fields, ...otherFilters } = filters;
    
    if (fields !== undefined) {
      setSearchFields(fields ? fields.split(',').filter(Boolean) : []);
    }
    
    setFilters(otherFilters);
  };
  const handleFilterClear = () => {
    setFilters({});
    setSearchFields([]);
  };

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

    const handleTouchOutside = (event: TouchEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportDropdown(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleTouchOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleTouchOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showExportDropdown]);

  const handleExportExcel = async (
    exportStatus: "active" | "inActive" | "ALL",
  ) => {
    if (token === null || token === "undefined") {
      router.push("/");
      return;
    }

    try {
      setShowExportDropdown(false);
      setIsExporting(true);

      const queryParams = buildQueryParams(false);

      if (exportStatus === "ALL") {
        queryParams.delete("status");
      } else {
        queryParams.set("status", exportStatus);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/all/users/export/excel?${queryParams.toString()}`,
        {
          method: "GET",
          headers: {
            token,
          },
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error?.[0]?.msg || "Failed to export users");
      }

      const blob = await response.blob();
      const timestamp = new Date()
        .toLocaleString("en-US", { hour12: false })
        .replace(/[/:, ]/g, "-");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-${
        exportStatus === "ALL" ? "all-statuses" : exportStatus.toLowerCase()
      }-${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Users exported successfully");
    } catch (error: any) {
      console.error("Export users error:", error);
      toast.error(error.message || "Failed to export users");
    } finally {
      setIsExporting(false);
    }
  };

  // Merge searchFields into filters for the Filter component
  const filtersWithSearchFields = {
    ...filters,
    searchFields: searchFields.join(','),
  };

  return (
    <>
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        <Filter
          title="Users"
          heading="Users Managment"
          filters={filtersWithSearchFields}
          onChange={handleFilterChange}
          onApply={handleFilterApply}
          onClear={handleFilterClear}
          fields={filterFields}
          customButton={
            <Can I="manage" a="User">
              <div className="relative" ref={exportDropdownRef}>
                <button
                  onClick={() => setShowExportDropdown((prev) => !prev)}
                  disabled={isExporting || initialLoading || loaddingMore}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                </button>

                {showExportDropdown && !isExporting && (
                  <div className="absolute right-0 mt-2 w-44 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl z-20">
                    {[
                      { label: "Active", value: "active" },
                      { label: "Inactive", value: "inActive" },
                      { label: "All", value: "ALL" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() =>
                          handleExportExcel(
                            option.value as "active" | "inActive" | "ALL",
                          )
                        }
                        className="block w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Can>
          }
        />
        {initialLoading ? (
          <div className="flex justify-center items-center p-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-500"></div>
          </div>
        ) : users.length === 0 ? (
          <EmptyStateMessage
            title="No Users Found"
            message={
              filters?.status || filters?.role
                ? "Try changing your filters or check back later"
                : "No users found. Try back later or check your filters."
            }
            icon={
              // @ts-ignore
              <HiUserGroup className="w-12 h-12 text-gray-400" />
            }
            showCreateButton={!!filters?.status || !!filters?.role}
            createButtonText={"Clear Filters"}
            onCreateClick={handleFilterClear}
          />
        ) : (
          <div className="flex flex-col">
            <div className="overflow-x-auto rounded-lg">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden shadow-md sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Name
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Email
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Role
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Status
                        </th>
                        <Can I="approve" a="User">
                          <th
                            scope="col"
                            className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                          >
                            Action
                          </th>
                        </Can>
                        {/* Role Transmission */}
                        <Can I="create" a="RoleTransmission">
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Transfer Role
                        </th>
                        </Can>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      {users.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 group cursor-pointer relative"
                        >
                          <td className="p-4 text-sm font-medium text-gray-900 whitespace-nowrap dark:text-white">
                            {user.name}
                          </td>
                          {user.email ? (
                            <td className="p-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">
                              {user.email}
                            </td>
                          ):(
                            <td className="p-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">
                              **************
                            </td>
                          )}
                          {/* <td className="p-4 text-sm text-gray-500 whitespace-nowrap dark:text-gray-400">
                            {user.email}
                          </td> */}
                          <td className="p-4 text-sm whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                              {user.Role?.name}
                            </span>
                          </td>
                          <td className="p-4 text-sm whitespace-nowrap">
                            {user.isActive ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                <div className="h-2 w-2 rounded-full bg-green-500 mr-1.5"></div>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                                <div className="h-2 w-2 rounded-full bg-red-500 mr-1.5"></div>
                                InActive
                              </span>
                            )}
                          </td>
                          <Can I="approve" a="User">
                            <td className="p-4 text-sm whitespace-nowrap">
                              <div className="flex flex-wrap gap-2 relative z-10">
                                {!user.isActive && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleApprove(user.id);
                                      }}
                                      className={`px-3 py-1 text-xs font-medium rounded-lg ${
                                        loadingUserId === user.id &&
                                        approvingOrRejectingUser.approving
                                          ? "bg-gold-100 text-gold-800 cursor-not-allowed"
                                          : "bg-gold-600 text-white hover:bg-gold-700 focus:ring-2 focus:ring-gold-500 focus:ring-opacity-50"
                                      }`}
                                      disabled={
                                        approvingOrRejectingUser.approving ||
                                        approvingOrRejectingUser.rejecting ||
                                        loadingUserId === user.id
                                      }
                                    >
                                      {loadingUserId === user.id &&
                                      approvingOrRejectingUser.approving ? (
                                        <span className="flex items-center text-gray-800">
                                          <svg
                                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-gold-800"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                          >
                                            <circle
                                              className="opacity-25"
                                              cx="12"
                                              cy="12"
                                              r="10"
                                              stroke="currentColor"
                                              strokeWidth="4"
                                            ></circle>
                                            <path
                                              className="opacity-75"
                                              fill="currentColor"
                                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                          </svg>
                                          Approving...
                                        </span>
                                      ) : (
                                        <span className="flex items-center  text-gray-800">
                                          <svg
                                            className="w-4 h-4 mr-1"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth="2"
                                              d="M5 13l4 4L19 7"
                                            ></path>
                                          </svg>
                                          Approve
                                        </span>
                                      )}
                                    </button>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReject(user.id);
                                      }}
                                      className={`px-3 py-1 text-xs font-medium rounded-lg ${
                                        loadingUserId === user.id &&
                                        approvingOrRejectingUser.rejecting
                                          ? "bg-red-100 text-red-800 cursor-not-allowed"
                                          : "bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                                      }`}
                                      disabled={
                                        approvingOrRejectingUser.rejecting ||
                                        approvingOrRejectingUser.approving ||
                                        loadingUserId === user.id
                                      }
                                    >
                                      {loadingUserId === user.id &&
                                      approvingOrRejectingUser.rejecting ? (
                                        <span className="flex items-center">
                                          <svg
                                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-800"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                          >
                                            <circle
                                              className="opacity-25"
                                              cx="12"
                                              cy="12"
                                              r="10"
                                              stroke="currentColor"
                                              strokeWidth="4"
                                            ></circle>
                                            <path
                                              className="opacity-75"
                                              fill="currentColor"
                                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                          </svg>
                                          Rejecting...
                                        </span>
                                      ) : (
                                        <span className="flex items-center">
                                          <svg
                                            className="w-4 h-4 mr-1"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            xmlns="http://www.w3.org/2000/svg"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth="2"
                                              d="M6 18L18 6M6 6l12 12"
                                            ></path>
                                          </svg>
                                          Reject
                                        </span>
                                      )}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </Can>
                          <Can I="create" a="RoleTransmission">
                            <td className="p-4 text-sm whitespace-nowrap">
                              <div className="flex flex-wrap gap-2 relative z-10">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRoleTransition(user);
                                  }}
                                  className="px-3 py-1 text-xs font-medium rounded-lg bg-blue-900 text-white hover:bg-blue-700 focus:ring-1 focus:ring-blue-500 focus:ring-opacity-50"
                                  title="Request Role Transition"
                                >
                                  <span className="flex items-center">
                                    <svg
                                      className="w-4 h-4 mr-1"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                      />
                                    </svg>
                                    Transition
                                  </span>
                                </button>
                              </div>
                            </td>
                          </Can>
                          <Link
                            href={`/users/${user.id}`}
                            className="absolute inset-0 z-0"
                            aria-label={`View details for ${user.name}`}
                            onClick={(e) => {
                              if (
                                (e.target as Element).closest(
                                  ".flex.flex-wrap.gap-2.relative"
                                )
                              ) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <span className="sr-only">View details</span>
                          </Link>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {pagination && (
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                isLoading={loaddingMore}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Reject User
                </h3>
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Please provide a reason for rejecting this user.
              </p>

              <div className="mb-4">
                <label
                  htmlFor="rejection-reason"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Rejection Reason
                </label>
                <textarea
                  id="rejection-reason"
                  rows={4}
                  className={`bg-gray-50 border text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 ${
                    (reasonCharCount > 0 && reasonCharCount < minReasonChars) ||
                    reasonCharCount > maxReasonChars
                      ? "border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500 dark:focus:ring-red-500 dark:focus:border-red-500"
                      : "border-gray-300 dark:border-gray-600 focus:ring-gold-500 focus:border-gold-500 dark:focus:ring-gold-500 dark:focus:border-gold-500"
                  }`}
                  placeholder="Please explain why you are rejecting this user..."
                  value={rejectReason}
                  onChange={handleReasonChange}
                  required
                ></textarea>

                <div className="flex justify-between mt-2">
                  <div>
                    {reasonCharCount > 0 &&
                      reasonCharCount < minReasonChars && (
                        <p className="text-xs text-red-500">
                          Please enter at least {minReasonChars} characters
                        </p>
                      )}
                    {reasonCharCount > maxReasonChars && (
                      <p className="text-xs text-red-500">
                        Maximum {maxReasonChars} characters allowed
                      </p>
                    )}
                  </div>
                  <p
                    className={`text-xs ${
                      reasonCharCount > maxReasonChars
                        ? "text-red-500"
                        : reasonCharCount < minReasonChars
                          ? "text-gray-500 dark:text-gray-400"
                          : "text-green-500"
                    }`}
                  >
                    {reasonCharCount}/{maxReasonChars} characters
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitUserRejection}
                  disabled={
                    rejectReason.length < minReasonChars ||
                    rejectReason.length > maxReasonChars ||
                    approvingOrRejectingUser.rejecting
                  }
                  className={`flex items-center px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50 ${
                    rejectReason.length < minReasonChars ||
                    rejectReason.length > maxReasonChars ||
                    approvingOrRejectingUser.rejecting
                      ? "bg-red-300 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {approvingOrRejectingUser.rejecting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        ></path>
                      </svg>
                      Confirm Rejection
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Transition Modal */}
      <RoleTransitionModal
        isOpen={showRoleTransitionModal}
        onClose={handleCloseRoleTransitionModal}
        user={selectedUserForTransition}
        roles={roles || []}
        token={token || ""}
        onSuccess={handleRoleTransitionSuccess}
      />
    </>
  );
}
