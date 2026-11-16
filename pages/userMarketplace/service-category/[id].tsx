"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { toast } from "react-toastify";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";
import Can from "@/components/rbac/Can";
import Loading from "@/components/ui/Loading";
import {
  fetchServiceCategoryById,
  updateServiceCategory,
  deleteServiceCategory,
  addServiceSubCategory,
  updateServiceSubCategory,
  deleteServiceSubCategory,
} from "@/services/serviceCategories";

export default function ServiceCategoryDetail() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();

  // Category edit state
  const [isCategoryEditOpen, setIsCategoryEditOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sub-category state
  const [editingSubCat, setEditingSubCat] = useState<{ id: number; name: string } | null>(null);
  const [editSubCatName, setEditSubCatName] = useState("");
  const [deletingSubCatId, setDeletingSubCatId] = useState<number | null>(null);
  const [isAddingSubCat, setIsAddingSubCat] = useState(false);
  const [newSubCatName, setNewSubCatName] = useState("");

  // Delete category
  const [showDeleteCategory, setShowDeleteCategory] = useState(false);

  const {
    data: category,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["serviceCategory", id],
    queryFn: () => fetchServiceCategoryById(token!, Number(id)),
    enabled: !!id && !!token,
  });

  const invalidate = () =>
    queryClient.refetchQueries({ queryKey: ["serviceCategory", id] });

  const openCategoryEdit = () => {
    setCategoryForm({ name: category.name, description: category.description || "" });
    setIsCategoryEditOpen(true);
  };

  const handleCategoryUpdate = async () => {
    if (!categoryForm.name.trim()) {
      toast.error("Category name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      await updateServiceCategory(token!, Number(id), {
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim(),
      });
      toast.success("Category updated");
      setIsCategoryEditOpen(false);
      await invalidate();
    } catch (e: any) {
      toast.error(e.message || "Failed to update category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    setIsSubmitting(true);
    try {
      await deleteServiceCategory(token!, Number(id));
      toast.success("Category deleted");
      // Invalidate the list so the index page reflects the deletion immediately
      await queryClient.invalidateQueries({ queryKey: ["tabData", "ServiceCategory"] });
      router.push("/userMarketplace?tab=ServiceCategory");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSubCat = async () => {
    if (!newSubCatName.trim()) {
      toast.error("Sub-category name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      await addServiceSubCategory(token!, Number(id), { name: newSubCatName.trim() });
      toast.success("Sub-category added");
      setNewSubCatName("");
      setIsAddingSubCat(false);
      await invalidate();
    } catch (e: any) {
      toast.error(e.message || "Failed to add sub-category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubCat = async () => {
    if (!editSubCatName.trim()) {
      toast.error("Sub-category name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      await updateServiceSubCategory(token!, Number(id), editingSubCat!.id, {
        name: editSubCatName.trim(),
      });
      toast.success("Sub-category updated");
      setEditingSubCat(null);
      setEditSubCatName("");
      await invalidate();
    } catch (e: any) {
      toast.error(e.message || "Failed to update sub-category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubCat = async (subCatId: number) => {
    const subCategories = category?.subCategories || [];
    if (subCategories.length <= 1) {
      toast.error("Cannot delete the last sub-category");
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteServiceSubCategory(token!, Number(id), subCatId);
      toast.success("Sub-category deleted");
      setDeletingSubCatId(null);
      await invalidate();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete sub-category");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loading />
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <p className="text-center text-red-500 mt-20">
          {(error as any)?.message || "Service category not found"}
        </p>
        <div className="flex justify-center mt-4">
          <button
            onClick={() => router.push("/userMarketplace?tab=ServiceCategory")}
            className="px-4 py-2 bg-gold-500 text-gray-900 rounded-lg text-sm"
          >
            Back to Service Categories
          </button>
        </div>
      </div>
    );
  }

  const subCategories: any[] = category.subCategories || [];

  return (
    <>
      <Head>
        <title>{category.name} — Service Category</title>
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
        <div className="max-w-3xl mx-auto">
          {/* Back link */}
          <button
            onClick={() => router.push("/userMarketplace?tab=ServiceCategory")}
            className="mb-6 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gold-600 dark:hover:text-gold-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Service Categories
          </button>

          {/* Category card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white break-words">
                  {category.name}
                </h1>
                {category.description && (
                  <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    {category.description}
                  </p>
                )}
            
              </div>
              <div className="flex gap-2 shrink-0">
                <Can I="update" a="ServiceCategory">
                  <button
                    onClick={openCategoryEdit}
                    className="px-3 py-1.5 bg-gold-500 hover:bg-gold-600 text-gray-900 rounded-lg text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                </Can>
                <Can I="delete" a="ServiceCategory">
                  <button
                    onClick={() => setShowDeleteCategory(true)}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </Can>
              </div>
            </div>
          </div>

          {/* Sub-categories */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Sub-categories
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">
                  ({subCategories.length})
                </span>
              </h2>
              <Can I="create" a="ServiceCategory">
                <button
                  onClick={() => {
                    setIsAddingSubCat(true);
                    setNewSubCatName("");
                  }}
                  className="px-3 py-1.5 bg-gold-500 hover:bg-gold-600 text-gray-900 rounded-lg text-sm font-medium transition-colors"
                >
                  + Add Sub-category
                </button>
              </Can>
            </div>

            {/* Add sub-category inline form */}
            {isAddingSubCat && (
              <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 bg-amber-50 dark:bg-gray-750">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSubCatName}
                    onChange={(e) => setNewSubCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddSubCat();
                      if (e.key === "Escape") setIsAddingSubCat(false);
                    }}
                    placeholder="Sub-category name"
                    autoFocus
                    className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                  />
                  <button
                    onClick={handleAddSubCat}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setIsAddingSubCat(false)}
                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {subCategories.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                No sub-categories yet
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {subCategories.map((sub: any) => (
                  <li key={sub.id} className="px-6 py-3 flex items-center gap-3">
                    {editingSubCat?.id === sub.id ? (
                      <>
                        <input
                          type="text"
                          value={editSubCatName}
                          onChange={(e) => setEditSubCatName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleUpdateSubCat();
                            if (e.key === "Escape") setEditingSubCat(null);
                          }}
                          autoFocus
                          className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                        <button
                          onClick={handleUpdateSubCat}
                          disabled={isSubmitting}
                          className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingSubCat(null)}
                          className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : deletingSubCatId === sub.id ? (
                      <>
                        <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                          Delete <span className="font-medium">{sub.name}</span>?
                        </span>
                        <button
                          onClick={() => handleDeleteSubCat(sub.id)}
                          disabled={isSubmitting}
                          className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeletingSubCatId(null)}
                          className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">
                          {sub.name}
                        </span>
                        <Can I="update" a="ServiceCategory">
                          <button
                            onClick={() => {
                              setEditingSubCat({ id: sub.id, name: sub.name });
                              setEditSubCatName(sub.name);
                              setDeletingSubCatId(null);
                            }}
                            className="px-2.5 py-1 bg-gold-500 hover:bg-gold-600 text-gray-900 rounded-md text-xs font-medium transition-colors"
                          >
                            Edit
                          </button>
                        </Can>
                        <Can I="delete" a="ServiceCategory">
                          <button
                            onClick={() => {
                              if (subCategories.length <= 1) {
                                toast.error("Cannot delete the last sub-category");
                                return;
                              }
                              setDeletingSubCatId(sub.id);
                              setEditingSubCat(null);
                            }}
                            disabled={subCategories.length <= 1}
                            title={subCategories.length <= 1 ? "Cannot delete the last sub-category" : "Delete"}
                            className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Delete
                          </button>
                        </Can>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Edit Category Modal */}
      {isCategoryEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Category</h3>
              <button
                onClick={() => setIsCategoryEditOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setIsCategoryEditOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCategoryUpdate}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm bg-gold-500 hover:bg-gold-600 text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Category Confirmation */}
      {showDeleteCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Category</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete <span className="font-medium">{category.name}</span>? This will also delete all its sub-categories.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteCategory(false)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCategory}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
