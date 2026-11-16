import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import useAuthStore from "@/store/authStore";
import Link from "next/link";
import { FaSearch } from "react-icons/fa";
import { EmptyStateMessage } from "@/components/ui/EmptyStateMessage";
import { HiUserRemove } from "react-icons/hi";
import { Roles } from "@/enums/Roles";

interface UserRejection {
  id: number;
  reason: string;
  email: string;
  phoneNumber: string;
  rejectedBy: string;
  createdAt: string;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export default function UserRejectionsPage() {
  const [rejections, setRejections] = useState<UserRejection[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [shouldFetch, setShouldFetch] = useState<boolean>(true);
  const limit: number = 10;
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const clearToken = useAuthStore((state) => state.clearToken);
  const clearUser = useAuthStore((state) => state.clearUser);
  const clearRoles = useAuthStore((state) => state.clearRoles);
  
  const MemberRoles = [Roles.CORPORATE, Roles.INDIVIDUAL];
  const hasAccess = user && !MemberRoles.includes(user.Role?.name as Roles);

  useEffect(() => {
    if (user && !hasAccess) {
      toast.error("You don't have permission to access this page");
      clearToken();
      clearUser();
      clearRoles();
      router.push("/authentication/sign-in");
    }
  }, [user, hasAccess, clearToken, clearUser, clearRoles, router]);

  const fetchRejections = useCallback(async () => {
    if (!token || token === "undefined") {
      return;
    }

    try {
      setLoadingMore(true);
      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/user/rejections/all?page=${currentPage}&limit=${limit}`;

      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error[0]?.msg || "Failed to fetch rejections");
        if (data.error[0]?.path === "token") {
          useAuthStore.getState().clearToken();
          router.push("/");
        }
      } else {
        setRejections(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching rejections:", error);
      toast.error("Error fetching user rejections");
    } finally {
      setLoadingMore(false);
      setInitialLoading(false);
      setIsSearching(false);
      setShouldFetch(false);
    }
  }, [currentPage, searchTerm, token, router]);

  useEffect(() => {
    if (shouldFetch) {
      fetchRejections();
    }
  }, [fetchRejections, shouldFetch]);

  useEffect(() => {
    setShouldFetch(true);
  }, [currentPage]);

  useEffect(() => {
    setShouldFetch(true);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setCurrentPage(1);
    setShouldFetch(true);
  };

  const handlePageChange = (page: number) => {
    if (pagination && page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  };

  const handleViewClick = (id: number) => {
    router.push(`/user-rejections/${id}`);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
    setIsSearching(true);
    setShouldFetch(true);
  };

  if (!hasAccess) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        <div className="items-center justify-between lg:flex mb-4">
          <div>
            <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
              User Rejections
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View all users who have been rejected from the platform
            </p>
          </div>

          <div className="mt-3 lg:mt-0">
            <form onSubmit={handleSearch} className="flex items-center">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  {/* @ts-ignore */}
                  <FaSearch className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-gold-500 focus:border-gold-500 block w-full pl-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gold-500 dark:focus:border-gold-500"
                  placeholder="Search"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-800 rounded-md transition-colors flex items-center ml-3"
                disabled={isSearching}
              >
                {isSearching ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  "Search"
                )}
              </button>
            </form>
          </div>
        </div>

        {initialLoading || isSearching ? (
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold-500"></div>
          </div>
        ) : rejections && rejections.length > 0 ? (
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
                          Email
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Phone Number
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Rejected By
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Rejection Date
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
                      {rejections.map((rejection) => (
                        <tr
                          key={rejection.id}
                          className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">
                            {rejection.email}
                          </td>
                          <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                            {rejection.phoneNumber}
                          </td>
                          <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                            {rejection.rejectedBy}
                          </td>
                          <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                            {formatDateAndTime(rejection.createdAt)}
                          </td>
                          <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                            <button
                              onClick={() => handleViewClick(rejection.id)}
                              className="text-gold-500 hover:text-gold-700 font-medium"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <div className="flex flex-wrap justify-center items-center gap-2 overflow-x-auto max-w-full px-2">
                  <button
                    className={`px-4 py-2 rounded-lg text-white ${
                      currentPage === 1
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-gold-500 hover:bg-gold-600"
                    }`}
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || loadingMore}
                  >
                    Prev
                  </button>

                  {(() => {
                    const pages = [];
                    const totalPages = pagination.totalPages;
                    const maxVisiblePages = 3;

                    if (totalPages <= maxVisiblePages + 2) {
                      for (let i = 1; i <= totalPages; i++) {
                        pages.push(i);
                      }
                    } else {
                      if (currentPage <= maxVisiblePages) {
                        pages.push(1, 2, 3, "...", totalPages);
                      } else if (
                        currentPage >=
                        totalPages - maxVisiblePages + 1
                      ) {
                        pages.push(
                          1,
                          "...",
                          totalPages - 2,
                          totalPages - 1,
                          totalPages,
                        );
                      } else {
                        pages.push(
                          1,
                          "...",
                          currentPage - 1,
                          currentPage,
                          currentPage + 1,
                          "...",
                          totalPages,
                        );
                      }
                    }

                    return pages.map((page, index) => (
                      <button
                        key={index}
                        onClick={() =>
                          typeof page === "number" && handlePageChange(page)
                        }
                        disabled={page === "..." || loadingMore}
                        className={`px-3 py-1 rounded-md ${
                          currentPage === page
                            ? "bg-gold-500 text-white"
                            : "bg-gray-200 text-black hover:bg-gray-300"
                        }`}
                      >
                        {page}
                      </button>
                    ));
                  })()}

                  <button
                    className={`px-4 py-2 rounded-lg text-white ${
                      currentPage === pagination.totalPages
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-gold-500 hover:bg-gold-600"
                    }`}
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={
                      currentPage === pagination.totalPages || loadingMore
                    }
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyStateMessage
            title="No Rejections Found"
            message={
              searchTerm
                ? "Try changing your search query"
                : "There are no user rejections at the moment"
            }
            icon={
              // @ts-ignore
              <HiUserRemove className="w-12 h-12 text-gray-400" />
            }
            showCreateButton={!!searchTerm}
            createButtonText={searchTerm ? "Clear Search" : undefined}
            onCreateClick={handleClearSearch}
          />
        )}
      </div>
    </>
  );
}
