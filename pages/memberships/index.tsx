import { formatDateAndTime, formatOneYearAfter } from "@/utils/formatDateAndTime";
import { useRouter } from "next/router";
import Loading from "@/components/ui/Loading";
import Pagination from "@/components/common/Pagination";
import React, { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import NavigationButtons from "@/components/navigationButtons";
import { Roles } from "@/enums/Roles";
import { EmptyStateMessage } from "@/components/ui/EmptyStateMessage";
import { HiChartPie, HiUsers, HiCheckCircle, HiXCircle, HiDownload } from "react-icons/hi";
import Filter from "@/components/common/Filter";
import { fetchAllMembershipCategories, MembershipCategory } from "@/services/membershipCategories";
import { useAbility } from "@/hooks/useAbility";
import Can from "@/components/rbac/Can";
import { fetchMembershipStats, MembershipStats } from "@/services/membershipAnalytics";

interface Membership {
  companyName: string;
  membershipId: string;
  id: number;
  professionalTitle: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  paymentVerified?: boolean;
  user: { name: string; email: string; id: number };
  decision_at: string;
  lastBillingDate?: string;
  nextBillingDate?: string;
  createdAt: string;
}

type Pagination = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

export default function TableMemberships() {
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const ability = useAbility();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [membershipCategories, setMembershipCategories] = useState<MembershipCategory[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingMemberships, setIsExportingMemberships] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);
  const downloadRef = useRef<HTMLAnchorElement>(null);
  const [membershipStats, setMembershipStats] = useState<MembershipStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  const limit: number = 10;

  useEffect(() => {
    if (token && token !== "undefined" && user) {
      setIsAuthReady(true);
    }
  }, [token, user]);

  const fetchMemberships = async () => {
    if (!isAuthReady) return;
    if (!token || token === "undefined" || !user) {
      router.push("/");
      return;
    }

    try {
      setLoadingMore(true);
      const isRestrictedUser =
        user?.Role?.name === Roles.INDIVIDUAL ||
        user?.Role?.name === Roles.CORPORATE;

      const queryParams = new URLSearchParams();
      if (!isRestrictedUser) {
        queryParams.append("page", currentPage.toString());
        queryParams.append("limit", limit.toString());
        if (filters.status && filters.status !== "") {
          queryParams.append("status", filters.status);
        }
        if (filters.categoryShortName && filters.categoryShortName !== "") {
          queryParams.append("categoryShortName", filters.categoryShortName);
        }
        if (filters.validity && filters.validity !== "") {
          queryParams.append("validity", filters.validity);
        }
        if (filters.search && filters.search !== "") {
          queryParams.append("search", filters.search);
        }
      }
      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/membership${
        isRestrictedUser ? "" : `?${queryParams.toString()}`
      }`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });

      const memberships = await response.json();
      if (memberships.error) {
        toast.error(memberships.error[0].msg);
        if (memberships.error[0].path === "token") {
          router.push("/");
        }
      } else {
        setMemberships(
          user?.Role?.name === Roles.INDIVIDUAL ||
            user?.Role?.name === Roles.CORPORATE
            ? memberships.data.filter(
                (membership: Membership) =>
                  membership.user.id === Number(user.id)
              )
            : memberships.data
        );
        setPagination(
          user?.Role?.name === Roles.INDIVIDUAL ||
            user?.Role?.name === Roles.CORPORATE
            ? {
                totalItems: memberships.data.filter(
                  (membership: Membership) =>
                    membership.user.id === Number(user.id)
                ).length,
                totalPages: Math.ceil(
                  memberships.data.filter(
                    (membership: Membership) =>
                      membership.user.id === Number(user.id)
                  ).length / limit
                ),
                currentPage: currentPage,
                pageSize: limit,
              }
            : memberships.pagination
        );
      }
    } catch (error) {
      if (isAuthReady) {
        console.error("Error fetching memberships:", error);
        toast.error("Error in fetching memberships");
      }
    } finally {
      setLoadingMore(false);
      setInitialLoading(false);
    }
  };
  useEffect(() => {
    if (isAuthReady && token && token !== "undefined" && user) {
      fetchMemberships();
    }
  }, [
    currentPage,
    isAuthReady,
    token,
    user,
    filters.status,
    filters.categoryShortName,
    filters.validity,
    filters.search,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.status, filters.categoryShortName, filters.validity, filters.search]);

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

  // Fetch membership categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      if (!token || token === "undefined") return;
      try {
        const categories = await fetchAllMembershipCategories(token);
        setMembershipCategories(categories);
      } catch (error) {
        console.error("Error fetching membership categories:", error);
      }
    };
    if (isAuthReady && token && token !== "undefined") {
      fetchCategories();
    }
  }, [isAuthReady, token]);

  // Fetch membership stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      if (!token || token === "undefined") return;
      try {
        setStatsLoading(true);
        const stats = await fetchMembershipStats(token);
        setMembershipStats(stats);
      } catch (error: any) {
        console.error("Error fetching membership stats:", error);
        // Set default values if fetch fails
        setMembershipStats({
          totalUsers: 0,
          activeMembers: 0,
          inactiveMembers: 0,
        });
      } finally {
        setStatsLoading(false);
      }
    };
    if (isAuthReady && token && token !== "undefined") {
      fetchStats();
    }
  }, [isAuthReady, token]);

  const handlePageChange = (page: number) => {
    if (pagination && page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  };

  const handleViewClick = (id: number) => {
    router.push(`/memberships/${id}`);
  };
  // Filter Fields
  const filterFields = [
    {
      name: "search",
      label: "Search",
      type: "text" as const,
      placeholder: "Search memberships...",
    },
    {
      name: "status",
      label: "Approval Status",
      options: [
        { value: "PENDING", label: "Pending" },
        { value: "APPROVED", label: "Approved" },
        { value: "REJECTED", label: "Rejected" },
      ],
    },
    {
      name: "categoryShortName",
      label: "Membership Category",
      options: membershipCategories.map((category) => ({
        value: category.shortName,
        label: `${category.shortName} - ${category.name}`,
      })),
    },
    {
      name: "validity",
      label: "Validity",
      options: [
        { value: "true", label: "Active" },
        { value: "false", label: "Expired" },
      ],
    },
  ];

  // Filter Functions
  const handleFilterChange = (filters: Record<string, string>) => {
    setFilters(filters);
  };

  const handleFilterApply = (filters: Record<string, string>) => {
    setFilters(filters);
  };

  const handleFilterClear = () => {
    setFilters({});
  };

  const handleExportReport = async () => {
    if (!token || token === "undefined") {
      toast.error("You are not logged in");
      return;
    }

    try {
      setIsExporting(true);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/membership/export/expiring-memberships`,
        {
          method: "GET",
          headers: {
            token,
          },
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.message) {
          toast.info(errorData.message);
          return;
        }
        throw new Error("Failed to fetch report");
      }

      const jsonData = await res.json();
      if (!jsonData.data || !jsonData.data.url) {
        toast.info(jsonData.message || "No membership is expiring");
        return;
      }

      // Download file from the URL
      const reportUrl = jsonData.data.url;
      const response = await fetch(reportUrl);

      if (!response.ok) {
        throw new Error("Failed to download file from URL");
      }

      const blob = await response.blob();
      const filename = jsonData.data.name || `expiring_memberships_${new Date().toISOString().split("T")[0]}.csv`;

      const url = window.URL.createObjectURL(blob);

      if (downloadRef.current) {
        downloadRef.current.href = url;
        downloadRef.current.download = filename;
        downloadRef.current.click();
        setTimeout(() => window.URL.revokeObjectURL(url), 500);
      }

      toast.success("Report downloaded successfully");
    } catch (err: any) {
      console.error(err);
      toast.error(`Error exporting report: ${err.message || "Unknown error"}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMembershipDetails = async (
    exportStatus: "PENDING" | "APPROVED" | "REJECTED" | "ALL",
  ) => {
    if (!token || token === "undefined") {
      toast.error("You are not logged in");
      return;
    }

    try {
      setShowExportDropdown(false);
      setIsExportingMemberships(true);

      const queryParams = new URLSearchParams();
      if (exportStatus !== "ALL") {
        queryParams.append("status", exportStatus);
      }
      if (filters.categoryShortName && filters.categoryShortName !== "") {
        queryParams.append("categoryShortName", filters.categoryShortName);
      }
      if (filters.validity && filters.validity !== "") {
        queryParams.append("validity", filters.validity);
      }
      if (filters.search && filters.search !== "") {
        queryParams.append("search", filters.search);
      }

      const queryString = queryParams.toString();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/membership/export/excel${
          queryString ? `?${queryString}` : ""
        }`,
        {
          method: "GET",
          headers: {
            token,
          },
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.[0]?.msg || "Failed to export memberships");
      }

      const blob = await res.blob();
      const timestamp = new Date()
        .toLocaleString("en-US", { hour12: false })
        .replace(/[/:, ]/g, "-");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `memberships-${
        exportStatus === "ALL" ? "all-statuses" : exportStatus.toLowerCase()
      }-${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Membership details exported successfully");
    } catch (error: any) {
      console.error("Error exporting membership details:", error);
      toast.error(error.message || "Failed to export membership details");
    } finally {
      setIsExportingMemberships(false);
    }
  };


  const activePercentage = membershipStats && membershipStats.totalUsers > 0 
    ? ((membershipStats.activeMembers / membershipStats.totalUsers) * 100).toFixed(1)
    : "0";
  
  const inactivePercentage = membershipStats && membershipStats.totalUsers > 0
    ? ((membershipStats.inactiveMembers / membershipStats.totalUsers) * 100).toFixed(1)
    : "0";

  return (
    <>
    <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
      <Can I="manage" a="Membership">
      {/* Membership Stats Cards */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
                </div>
                <div className="w-14 h-14 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Total Users Card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Members
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {membershipStats?.totalUsers ?? 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                {/* @ts-ignore */}
                <HiUsers className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              Users with membership
            </p>
          </div>

          {/* Active Members Card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active Members
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {membershipStats?.activeMembers ?? 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {activePercentage}% of total
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                {/* @ts-ignore */}
                <HiCheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              Payment & membership verified
            </p>
          </div>

          {/* Inactive Members Card */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Inactive Members
                </p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {membershipStats?.inactiveMembers ?? 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {inactivePercentage}% of total
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                {/* @ts-ignore */}
                <HiXCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
              Payment or membership not verified
            </p>
          </div>
        </div>
      )}
      </Can>
      <Filter
        title="Memberships"
        heading="Memberships"
        description="Memberships of PBC Dubai Application"
        filters={filters}
        onChange={handleFilterChange}
        onApply={handleFilterApply}
        onClear={handleFilterClear}
        fields={filterFields}
        showFilterButton={ability?.can("manage", "Membership") ?? false}
        actionButtons={[
          { 
            label: "Organizations",
            route: "/memberships/organization"
          },
          ...(ability?.can("read", "BusinessGroup") ? [{
            label: "Business Groups",
            route: "/memberships/business-groups"
          }] : [])
        ]}
        customButton={
          <>
            <Can I="manage" a="Membership">
              <div className="relative" ref={exportDropdownRef}>
                <button
                  onClick={() => setShowExportDropdown((prev) => !prev)}
                  disabled={isExportingMemberships || initialLoading || loadingMore}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-600 dark:hover:bg-green-700 whitespace-nowrap"
                >
                  {isExportingMemberships ? (
                    "Exporting..."
                  ) : (
                    <>
                      {/* @ts-ignore */}
                      <HiDownload className="mr-2" /> Export Excel
                    </>
                  )}
                </button>

                {showExportDropdown && !isExportingMemberships && (
                  <div className="absolute right-0 mt-2 w-52 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl z-20">
                    {[
                      { label: "Pending", value: "PENDING" },
                      { label: "Approved", value: "APPROVED" },
                      { label: "Rejected", value: "REJECTED" },
                      { label: "All", value: "ALL" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() =>
                          handleExportMembershipDetails(
                            option.value as
                              | "PENDING"
                              | "APPROVED"
                              | "REJECTED"
                              | "ALL",
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

            <Can I="approve" a="Membership">
              <button
                onClick={handleExportReport}
                disabled={isExporting}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-600 dark:hover:bg-green-700 whitespace-nowrap"
              >
                {isExporting ? "Exporting..." : "Upcoming Expiries Report"}
              </button>
            </Can>
          </>
        }
      />
      <a ref={downloadRef} className="hidden" />
        {initialLoading ? (
          <div className="flex justify-center items-center">
            <Loading />
          </div>
        ) : memberships && memberships.length > 0 ? (
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
                          Applicant Name
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Membership ID
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
                          Membership Created
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Membership Expiry
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Approval Status
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Payment Status
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberships.map((membership: Membership) => (
                        <tr key={membership.id}>
                          <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">
                            {membership.user.name}
                          </td>
                          <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                            {membership.membershipId}
                          </td>
                          <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                            {membership.user.email}
                          </td>
                          <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                            {formatDateAndTime(membership.decision_at ? membership.decision_at : membership.createdAt)}
                          </td>
                          <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                            {membership.nextBillingDate ? formatDateAndTime(membership.nextBillingDate) : formatDateAndTime(membership.decision_at ? membership.decision_at : membership.createdAt)}
                          </td>
                          <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                            {membership.status}
                          </td>
                          <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                            {membership.paymentVerified === undefined
                              ? "-"
                              : membership.paymentVerified
                                ? "Active"
                                : "Expired"}
                          </td>
                          <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                            <button
                              onClick={() => handleViewClick(membership.id)}
                              className="text-gold-500 hover:text-gold-700"
                            >
                              View
                            </button>
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
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                isLoading={loadingMore}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        ) : (
          <EmptyStateMessage
            title="No Memberships Found"
            message={`No memberships found. ${
              user?.Role?.name === Roles.INDIVIDUAL ||
              user?.Role?.name === Roles.CORPORATE
                ? "You can create a new membership from the Mobile App."
                : "Try changing your filter or check back later."
            }`}
            icon={
              // @ts-ignore
              <HiChartPie className="w-12 h-12 text-gold-500" />
            }
            showCreateButton={false}
          />
        )}
      </div>
    </>
  );
}
