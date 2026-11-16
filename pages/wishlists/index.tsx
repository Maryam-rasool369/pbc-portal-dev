import React, { useCallback, useEffect, useRef, useState } from "react";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import { formatStatus } from "@/utils/formatStatus";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import Can from "@/components/rbac/Can";
import { Roles } from "@/enums/Roles";
import * as wishlistService from "@/services/wishlist";
import { EmptyStateMessage } from "@/components/ui/EmptyStateMessage";
import { useAbility } from "@/hooks/useAbility";
import { HiOutlineHeart } from "react-icons/hi";
import { HiDownload } from "react-icons/hi";
import Pagination from "@/components/common/Pagination";
import Filter from "@/components/common/Filter";

interface Wishlist {
  id: number;
  title: string;
  suggestions: string;
  status: "PENDING" | "RESOLVED_AND_CLOSED" | "UNRESOLVED_AND_CLOSED";
  comment?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
  };
  userId: number;
}

const getStatusBadgeClass = (status: Wishlist["status"]) => {
  switch (status) {
    case "PENDING":
      return "bg-yellow-500/20 text-yellow-500";
    case "RESOLVED_AND_CLOSED":
      return "bg-green-500/20 text-green-500";
    case "UNRESOLVED_AND_CLOSED":
      return "bg-red-500/20 text-red-500";
    default:
      return "bg-gray-500/20 text-gray-500";
  }
};

type Pagination = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

export default function Wishlists() {
  const [wishlists, setWishlists] = useState<Wishlist[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
 //const [statusFilter, setStatusFilter] = useState<any>({status: ""});
  const limit: number = 10;
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);
    const [filters, setFilters] = useState<any>({}); 
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const ability = useAbility();

  const fetchWishlists = useCallback(async () => {
    if (!token || token === "undefined") {
      return;
    }

    try {
      setLoadingMore(true);
      const isMyWishlists =
        user?.Role?.name === Roles.INDIVIDUAL ||
        user?.Role?.name === Roles.CORPORATE;

      const response = await wishlistService.fetchWishlists(
        token,
        currentPage,
        limit,
        filters.status,
        isMyWishlists,
      );

      if (isMyWishlists) {
        const filteredWishlists = response.data.filter(
          (wishlist: Wishlist) => wishlist.userId === Number(user?.id),
        );

        setWishlists(filteredWishlists);
        setPagination({
          totalItems: filteredWishlists.length,
          totalPages: Math.ceil(filteredWishlists.length / limit),
          currentPage: currentPage,
          pageSize: limit,
        });
      } else {
        setWishlists(response.data);
        setPagination(response.pagination);
      }
    } catch (error: any) {
      console.error("Fetch wishlists error:", error);
      if (error instanceof Error && error.message.includes("token")) {
        useAuthStore.getState().clearToken();
        router.push("/");
      }
      toast.error(error?.message || "Error in fetching wishlists");
    } finally {
      setLoadingMore(false);
      setInitialLoading(false);
    }
  }, [token, currentPage, limit, filters.status, user?.id, user?.Role?.name, router]);

  useEffect(() => {
    if (!token || token === "undefined") return;

    fetchWishlists();
  }, [token, fetchWishlists]);

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

  // const handleStatusChange = (stat: string) => {
  //   setStatusFilter(stat);
  //   setCurrentPage(1);
  // };

  const handlePageChange = (page: number) => {
    if (pagination && page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  };



  const handleViewClick = (id: number) => {
    router.push(`/wishlists/${id}`);
  };

  const handleExportExcel = async (
    exportStatus:
      | "PENDING"
      | "RESOLVED_AND_CLOSED"
      | "UNRESOLVED_AND_CLOSED"
      | "ALL",
  ) => {
    if (!token || token === "undefined") {
      toast.error("You are not logged in");
      return;
    }

    try {
      setShowExportDropdown(false);
      setIsExporting(true);
      const blob = await wishlistService.exportWishlistsToExcel(
        token,
        exportStatus,
      );

      const timestamp = new Date()
        .toLocaleString("en-US", { hour12: false })
        .replace(/[/:, ]/g, "-");
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wishlists-${
        exportStatus === "ALL" ? "all-statuses" : exportStatus.toLowerCase()
      }-${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Wishlists exported successfully");
    } catch (error: any) {
      console.error("Failed to export wishlists:", error);
      toast.error(error.message || "Failed to export wishlists");
    } finally {
      setIsExporting(false);
    }
  };

  const filterFields = [
    { name: "status", label: "Status", options: [
      { value: "PENDING", label: "Pending" },
      { value: "RESOLVED_AND_CLOSED", label: "Resolved And Closed" },
      { value: "UNRESOLVED_AND_CLOSED", label: "Unresolved And Closed" },
    ] },
  ];

  const handleFilterChange = (filters: any) => {
    setFilters(filters);
    //setCurrentPage(1);
  };

  const handleFilterApply = (filters: any) => {
    setFilters(filters);
  };

  const handleFilterClear = () => {
    setFilters({status: ""});
  };

  const actionButtons = (
    <div className="flex items-center gap-2">
      <Can I="manage" a="Wishlist">
        <div className="relative" ref={exportDropdownRef}>
          <button
            onClick={() => setShowExportDropdown((prev) => !prev)}
            disabled={isExporting || initialLoading || loadingMore}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="absolute right-0 mt-2 w-56 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl z-20">
              {[
                { label: "Pending", value: "PENDING" },
                {
                  label: "Resolved And Closed",
                  value: "RESOLVED_AND_CLOSED",
                },
                {
                  label: "Unresolved And Closed",
                  value: "UNRESOLVED_AND_CLOSED",
                },
                { label: "All", value: "ALL" },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() =>
                    handleExportExcel(
                      option.value as
                        | "PENDING"
                        | "RESOLVED_AND_CLOSED"
                        | "UNRESOLVED_AND_CLOSED"
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

      <Can I="create" a="Wishlist">
        <button
          onClick={() => router.push("/wishlists/new")}
          className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-800 rounded-md transition-colors flex items-center"
        >
          Add Wishlist
        </button>
      </Can>
    </div>
  );

  return (
    

    <>

 
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
      <Filter
          title="Wishlists"
          heading="Wishlists Management"
          filters={filters}
          onChange={handleFilterChange}
          onApply={handleFilterApply}
          onClear={handleFilterClear}
          fields={filterFields}
          customButton={actionButtons}
        /> 
  

        {initialLoading ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold-500"></div>
          </div>
        ) : wishlists && wishlists.length > 0 ? (
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
                          User Name
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Title
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Submission Date
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
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {wishlists.map((wishlist: Wishlist) => (
                        <tr
                          key={wishlist.id}
                          className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">
                            {wishlist.user.name}
                          </td>
                          <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                            {wishlist.title}
                          </td>
                          <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                            {formatDateAndTime(wishlist.createdAt, true)}
                          </td>
                          <td
                            className={`p-4 text-sm ${
                              wishlist.status === "RESOLVED_AND_CLOSED"
                                ? "text-green-600 dark:text-green-500"
                                : wishlist.status === "UNRESOLVED_AND_CLOSED"
                                  ? "text-red-600 dark:text-red-500"
                                  : "text-yellow-600 dark:text-yellow-500"
                            }`}
                          >
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(
                                wishlist.status
                              )}`}
                            >
                              {formatStatus(wishlist.status)}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                            <button
                              onClick={() => handleViewClick(wishlist.id)}
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
            title="No Wishlists Found"
            message={`No ${formatStatus(filters.status || "")} wishlists were found. Try changing your filter or create a new one.`}
            icon={
              // @ts-ignore
              <HiOutlineHeart className="w-12 h-12 text-gold-500" />
            }
            showCreateButton={ability?.can("create", "Wishlist")}
            onCreateClick={() => router.push("/wishlists/new")}
            createButtonText="Create Wishlist"
          />
        )}
      </div>
    </>
  );
}
