import React, { useContext, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import Loading from "@/components/ui/Loading";
import { EmptyStateMessage } from "@/components/ui/EmptyStateMessage";
import { HiChartPie, HiArrowLeft, HiDownload, HiPresentationChartLine } from "react-icons/hi";
import {
  fetchMembersAnalytics,
  exportMembersAnalytics,
  MemberAnalytics,
} from "@/services/membershipAnalytics";
import Pagination from "@/components/common/Pagination";
import Head from "next/head";
import Can from "@/components/rbac/Can";
import { useAbility } from "@/hooks/useAbility";
import { AbilityContext } from "@/context/AbilityContext";
export default function MembersAnalytics() {
  const router = useRouter();
  const { categoryId, subCategoryId } = router.query;
  const token = useAuthStore((state) => state.token);
  const [members, setMembers] = useState<MemberAnalytics[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pagination, setPagination] = useState<any>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const limit = 10;
  const ability = useAbility();
  useEffect(() => {
    if (!token || token === "undefined") {
      router.push("/");
      return;
    }

    if (!subCategoryId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetchMembersAnalytics(
          token,
          Number(subCategoryId),
          currentPage,
          limit
        );
        setMembers(response.data);
        setPagination(response.pagination);
      } catch (error: any) {
        console.error("Error fetching members analytics:", error);
        toast.error(error.message || "Failed to fetch members analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, router, subCategoryId, currentPage]);

  const handleBack = () => {
    router.push(`/membership-analytics/${categoryId}/subcategories`);
  };

  const handleMemberClick = (userId: number) => {
    const returnPath = encodeURIComponent(
      `/membership-analytics/${categoryId}/subcategories/${subCategoryId}/members`
    );
    router.push(`/users/${userId}?returnPath=${returnPath}`);
  };

  const handleExport = async () => {
    if (!subCategoryId || !token || token === "undefined") return;

    try {
      setIsExporting(true);
      const blob = await exportMembersAnalytics(
        token,
        Number(subCategoryId),
        "excel"
      );

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `members_analytics_${subCategoryId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Members data exported successfully as Excel");
    } catch (error: any) {
      console.error("Error exporting members analytics:", error);
      toast.error(error.message || "Failed to export members data");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <Head>
        <title>Members Analytics | PBC Portal</title>
      </Head>
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="mb-4 flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            {/* @ts-ignore */}
            <HiArrowLeft className="w-5 h-5 mr-2" />
            Back to Sub-Categories
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {/* @ts-ignore */}
                <HiPresentationChartLine className="w-6 h-6" />
                Members Analytics
              </h1>
            
            </div>
            <Can I="manage" a="Membership">
            <button
              onClick={handleExport}
              disabled={isExporting || members.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-green-600 dark:hover:bg-green-700 transition-colors"
            >
              {/* @ts-ignore */}
              <HiDownload className="w-5 h-5" />
              {isExporting ? "Exporting..." : "Export Excel"}
            </button>
          </Can>
          </div>
        </div>

        {members.length === 0 ? (
          <EmptyStateMessage
            // @ts-ignore
            icon={<HiPresentationChartLine className="w-12 h-12 text-gray-400" />}
            title="No Members Found"
            message="There are no members available for this sub-category."
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
                          Name
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          CNIC
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
                          Country
                        </th>
                        <th
                          scope="col"
                          className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                        >
                          Business Group
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      {members.map((member) => (
                        <tr
                          key={member.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                          onClick={() => handleMemberClick(member.id)}
                        >
                          <td className="p-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {member.name}
                          </td>
                          <td className="p-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {member.cnic || "N/A"}
                          </td>
                          <td className="p-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {member.email}
                          </td>
                          <td className="p-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {member.country || "N/A"}
                          </td>
                          <td className="p-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {member.businessGroup || "N/A"}
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
