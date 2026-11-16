"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AddCategoryModal from "@/components/expenses/addCategoryModal";
import DeleteCategoryModal from "@/components/expenses/deleteCategoryModal";
import useAuthStore from "@/store/authStore";
import {
  createCategory,
  deleteCategory,
  fetchAllCategories,
} from "@/services/expenseCategories";
import { useAbility } from "@/hooks/useAbility";
import Can from "@/components/rbac/Can";

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface PaginationInfo {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export default function CategoryList() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const token = useAuthStore((state) => state.token);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const ability = useAbility();
  const [pagination, setPagination] = useState<PaginationInfo>({
    totalItems: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
  });
  
  useEffect(() => {
    if (!token || token === "undefined") return;

    if (token && !ability?.can("read", "TransactionCategory")) {
      toast.error("You do not have permission to view transaction categories");
      router.push("/userMarketplace");
      return;
    }

    const fetchCategories = async () => {
      setLoading(true);
      try {
        const result = await fetchAllCategories(
          token,
          pagination.currentPage,
          pagination.pageSize
        );

        setCategories(result.data || []);
        setPagination(result.pagination || pagination);
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to fetch categories"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [token, pagination.currentPage, pagination.pageSize]);

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({
      ...prev,
      currentPage: newPage,
    }));
  };

  const handleAddCategory = async (name: string) => {
    if (!token) {
      toast.error("You must be logged in to add a category");
      return;
    }

    try {
      await createCategory(token, name);
      toast.success("Category added successfully");
      setShowAddModal(false);

      // Force refetch after creation
      const result = await fetchAllCategories(token, 1, pagination.pageSize);
      setCategories(result.data || []);
      setPagination(result.pagination || pagination);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add category"
      );
    }
  };

  const handleDeleteCategory = async () => {
    if (!token || !selectedCategory) return;

    try {
      await deleteCategory(token, selectedCategory.id.toString());
      toast.success("Category deleted successfully");
      setShowDeleteModal(false);
      setSelectedCategory(null);

      setCategories((prev) =>
        prev.filter((category) => category.id !== selectedCategory.id)
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete category"
      );
    }
  };

  const navigateToCategory = (id: number) => {
    router.push(`/expense/categories/${id}`);
  };

  return (
    <div className="p-4 bg-gray-800 mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/expense")}
            className="text-gray-400 hover:text-gold-500 transition-colors flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Expense Categories
            </h1>
            <p className="text-gray-400 text-sm">
              Manage your expense categories
            </p>
          </div>
        </div>

        <Can I="create" a="TransactionCategory">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md flex items-center transition-colors"
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
            Add Category
          </button>
        </Can>
      </div>

      {/* Main Content */}
      <div className="bg-gray-900 rounded-lg border border-gray-700">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto text-gray-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h2 className="text-xl font-medium text-gray-400">
              No categories found
            </h2>
            <p className="text-gray-500 mt-2">
              Add a new category to get started
            </p>
            <Can I="create" a="TransactionCategory">
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-6 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors"
              >
                Add Category
              </button>
            </Can>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="w-20 px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="w-20 px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <Can I="read" a="TransactionCategory">
                <tbody className="bg-gray-900/50 divide-y divide-gray-800">
                  {categories.map((category) => (
                    <tr
                      key={category.id}
                      className="group hover:bg-gray-800/50 transition-colors duration-200 cursor-pointer"
                      onClick={() => navigateToCategory(category.id)}
                    >
                      <td className="w-20 px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                          #{category.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-200">
                          {category.name}
                        </div>
                      </td>
                      <td className="w-20 px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateToCategory(category.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 hover:bg-gray-700 rounded-full"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5 text-gold-500"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Can>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() =>
              handlePageChange(Math.max(1, pagination.currentPage - 1))
            }
            disabled={pagination.currentPage === 1}
            className="px-3 py-1 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-gray-700 text-white hover:bg-gray-600"
          >
            Previous
          </button>
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
            (page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  pagination.currentPage === page
                    ? "bg-gold-500 text-black"
                    : "bg-gray-700 text-white hover:bg-gray-600"
                }`}
              >
                {page}
              </button>
            )
          )}
          <button
            onClick={() =>
              handlePageChange(
                Math.min(pagination.totalPages, pagination.currentPage + 1)
              )
            }
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-3 py-1 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-gray-700 text-white hover:bg-gray-600"
          >
            Next
          </button>
        </div>
      )}

      {/* Add Category Modal */}
      {showAddModal && (
        <AddCategoryModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddCategory}
        />
      )}

      {/* Delete Category Modal */}
      {showDeleteModal && selectedCategory && (
        <DeleteCategoryModal
          open={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setSelectedCategory(null);
          }}
          onConfirm={handleDeleteCategory}
          category={selectedCategory}
        />
      )}
    </div>
  );
}
