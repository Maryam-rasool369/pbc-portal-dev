"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DeleteCategoryModal from "@/components/expenses/deleteCategoryModal";
import useAuthStore from "@/store/authStore";
import {
  deleteCategory,
  getCategoryById,
  updateCategory,
} from "@/services/expenseCategories";
import { useAbility } from "@/hooks/useAbility";
import Can from "@/components/rbac/Can";

interface Category {
  id: number;
  name: string;
  slug: string;
}

export default function CategoryDetail() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const ability = useAbility();

  useEffect(() => {
    if (!id || !token || token === "undefined") return;

    if (token && !ability?.can("read", "TransactionCategory")) {
      toast.error("You do not have permission to view Transaction categories");
      router.push("/userMarketplace");
      return;
    }

    const fetchCategory = async () => {
      if (!ability?.can("read", "TransactionCategory")) {
        toast.error(
          "You do not have permission to view Transaction categories"
        );
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await getCategoryById(token, id as string);
        setCategory(result);
        setCategoryName(result.name);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch category details"
        );
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to fetch category details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [id, token]);

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !category) return;
    if (!categoryName.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }

    setSubmitting(true);
    try {
      await updateCategory(token, id as string, categoryName);
      toast.success("Category updated successfully");
      setCategory({ ...category, name: categoryName });
      setEditMode(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update category"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!token || !category) return;

    try {
      await deleteCategory(token, id as string);
      toast.success("Category deleted successfully");
      router.push("/expense/categories");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete category"
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 text-red-500 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h2 className="text-2xl font-bold text-red-500 mb-2">Error</h2>
        <p className="text-gray-300 text-center">{error}</p>
        <button
          onClick={() => router.push("/expense/categories")}
          className="mt-6 px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
        >
          Back to Categories
        </button>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gold-500 mb-2">
          Category Not Found
        </h2>
        <p className="text-gray-300 text-center">
          The category you&apos;re looking for doesn&apos;t exist or you
          don&apos;t have permission to view it.
        </p>
        <button
          onClick={() => router.push("/expense/categories")}
          className="mt-6 px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
        >
          Back to Categories
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-800 mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/expense/categories")}
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
            <h1 className="text-2xl font-bold text-white">Category Details</h1>
            <p className="text-gray-400 text-sm">
              View and manage category information
            </p>
          </div>
        </div>
      </div>
      <div className="bg-gray-900 rounded-lg border border-gray-700">
        {editMode ? (
          <div className="p-6">
            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div>
                <label
                  htmlFor="categoryName"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Category Name
                </label>
                <input
                  id="categoryName"
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(false);
                    setCategoryName(category.name);
                  }}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || categoryName === category.name}
                  className={`px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors flex items-center ${
                    submitting || categoryName === category.name
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {submitting && (
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
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
                  )}
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="p-6">
            <Can I="read" a="TransactionCategory">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-medium text-gold-500 mb-4">
                    Basic Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-400">
                        Category Name
                      </label>
                      <p className="text-white font-medium mt-1">
                        {category.name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">ID</label>
                      <p className="text-white font-medium mt-1">
                        #{category.id}
                      </p>
                    </div>
                  </div>
                </div>

                {(ability?.can("update", "TransactionCategory") ||
                  ability?.can("delete", "TransactionCategory")) && (
                  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h3 className="text-lg font-medium text-gold-500 mb-4">
                      Quick Actions
                    </h3>
                    <div className="space-y-3">
                      <Can I="update" a="TransactionCategory">
                        <button
                          onClick={() => setEditMode(true)}
                          className="w-full px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors flex items-center justify-center"
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Edit Category
                        </button>
                      </Can>
                      <Can I="delete" a="TransactionCategory">
                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors flex items-center justify-center"
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Delete Category
                        </button>
                      </Can>
                    </div>
                  </div>
                )}
              </div>
            </Can>
          </div>
        )}
      </div>
      {showDeleteModal && (
        <DeleteCategoryModal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteCategory}
          category={category}
        />
      )}
    </div>
  );
}
