import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import Loading from "@/components/ui/Loading";
import { EmptyStateMessage } from "@/components/ui/EmptyStateMessage";
import { HiChartPie, HiArrowLeft, HiPresentationChartLine } from "react-icons/hi";
import {
  fetchSubCategoriesAnalytics,
  SubCategoryAnalytics,
} from "@/services/membershipAnalytics";
import Head from "next/head";

export default function SubCategoriesAnalytics() {
  const router = useRouter();
  const { categoryId } = router.query;
  const token = useAuthStore((state) => state.token);
  const [subCategories, setSubCategories] = useState<SubCategoryAnalytics[]>(
    []
  );
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!token || token === "undefined") {
      router.push("/");
      return;
    }

    if (!categoryId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchSubCategoriesAnalytics(
          token,
          Number(categoryId)
        );
        setSubCategories(data);
      } catch (error: any) {
        console.error("Error fetching sub-categories analytics:", error);
        toast.error(
          error.message || "Failed to fetch sub-categories analytics"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, router, categoryId]);

  const handleSubCategoryClick = (subCategoryId: number) => {
    router.push(
      `/membership-analytics/${categoryId}/subcategories/${subCategoryId}/members`
    );
  };

  const handleBack = () => {
    router.push("/membership-analytics");
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <Head>
        <title>Sub-Categories Analytics | PBC Portal</title>
      </Head>
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="mb-4 flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            {/* @ts-ignore */}
            <HiArrowLeft className="w-5 h-5 mr-2" />
            Back to Categories
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {/* @ts-ignore */}
            <HiPresentationChartLine className="w-6 h-6" />
            Sub-Categories Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View member distribution by sub-categories
          </p>
        </div>

        {subCategories.length === 0 ? (
          <EmptyStateMessage
            // @ts-ignore
            icon={<HiPresentationChartLine className="w-12 h-12 text-gray-400" />}
            title="No Sub-Categories Found"
            message="There are no sub-categories available for this category."
          />
        ) : (
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
                        Sub-Category Name
                      </th>
                      <th
                        scope="col"
                        className="p-4 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-white"
                      >
                        Total Users
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
                    {subCategories.map((subCategory) => (
                      <tr
                        key={subCategory.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                        onClick={() => handleSubCategoryClick(subCategory.id)}
                      >
                        <td className="p-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {subCategory.name}
                        </td>
                        <td className="p-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {subCategory.memberCount}
                        </td>
                        <td className="p-4 whitespace-nowrap text-sm">
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            View Members →
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
