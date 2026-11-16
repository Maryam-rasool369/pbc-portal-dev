import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import Loading from "@/components/ui/Loading";
import { EmptyStateMessage } from "@/components/ui/EmptyStateMessage";
import { HiPresentationChartLine } from "react-icons/hi";
import {
  fetchBusinessGroupsAnalytics,
  BusinessGroupAnalytics,
} from "@/services/userMembershipAnalytics";
import Pagination from "@/components/common/Pagination";
import Head from "next/head";

export default function BusinessGroupAnalyticsPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [businessGroups, setBusinessGroups] = useState<
    BusinessGroupAnalytics[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState<any>(null);
  const limit = 10;

  useEffect(() => {
    if (!token || token === "undefined") {
      router.push("/");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetchBusinessGroupsAnalytics(
          token,
          currentPage,
          limit
        );
        setBusinessGroups(response.data);
        setPagination(response.pagination);
      } catch (error: any) {
        console.error("Error fetching business groups analytics:", error);
        toast.error(
          error.message || "Failed to fetch business groups analytics"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, router, currentPage]);

  const handleBusinessGroupClick = (businessGroupId: number) => {
    router.push(`/user-membership-analytics/${businessGroupId}/members`);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <Head>
        <title>Business Group Analytics | PBC Portal</title>
      </Head>
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {/* @ts-ignore */}
            <HiPresentationChartLine className="w-6 h-6" />
            Business Group Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View member distribution by business groups and members
          </p>
        </div>

        {businessGroups.length === 0 ? (
          <EmptyStateMessage
            // @ts-ignore
            icon={
              <HiPresentationChartLine className="w-12 h-12 text-gray-400" />
            }
            title="No Business Groups Found"
            message="There are no business groups available."
          />
        ) : (
          <>
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
                          Group Name
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Total Members
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      {businessGroups.map((businessGroup) => (
                        <tr
                          key={businessGroup.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                          onClick={() => handleBusinessGroupClick(businessGroup.id)}
                        >
                          <td className="p-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {businessGroup.name}
                          </td>
                          <td className="p-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {businessGroup.totalMembers}
                          </td>
                          <td className="p-4 whitespace-nowrap text-sm">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleBusinessGroupClick(businessGroup.id);
                              }}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                            >
                              View Members →
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
              <div className="mt-4">
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

