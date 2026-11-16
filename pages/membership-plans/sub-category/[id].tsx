"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import useAuthStore from "@/store/authStore";
import { toast } from "react-toastify";
import {
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
  fetchSubCategories,
} from "@/services/membershipSubCategory";
import type { MembershipSubCategory } from "@/types/membershipSubCategory";
import { fetchAllMembershipCategories } from "@/services/membershipCategories";

export default function SubCategoryDetail() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [subCat, setSubCat] = useState<MembershipSubCategory | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [canVote, setCanVote] = useState(false);

  // Replacement for delete
  const [replacementId, setReplacementId] = useState<number | "">("");

  // For replacement options (same category)
  const [allSubs, setAllSubs] = useState<MembershipSubCategory[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    []
  );

  const loadDetail = async () => {
    if (!token || typeof id !== "string") return;
    setLoading(true);
    try {
      const data = await getSubCategoryById(token, Number(id));
      setSubCat(data);
      setName(data.name || "");
      setDescription(data.description || "");
      setCanVote(!!data.canVote);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch sub-category");
    } finally {
      setLoading(false);
    }
  };

  const loadSubsForReplacement = async () => {
    if (!token) return;
    try {
      // Load many to allow replacement selection; increase limit to reduce paging friction
      const { data } = await fetchSubCategories(token, 1, 100);
      setAllSubs(data);
    } catch {
      // ignore
    }
  };

  const loadCategories = async () => {
    if (!token) return;
    try {
      const cats = await fetchAllMembershipCategories(token);
      setCategories(cats.map((c) => ({ id: c.id, name: c.name })));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (token && user && id) {
      loadDetail();
      loadSubsForReplacement();
      loadCategories();
    }
  }, [token, user, id]);

  const sameCategoryOptions = useMemo(() => {
    if (!subCat) return [];
    return allSubs.filter(
      (s) =>
        s.membershipCategoryId === subCat.membershipCategoryId && s.id !== subCat.id
    );
  }, [allSubs, subCat]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || typeof id !== "string" || !subCat) return;
    try {
      const updated = await updateSubCategory(token, Number(id), {
        name: name.trim(),
        description: description.trim(),
        canVote,
      });
      setSubCat(updated);
      toast.success("Updated");
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    }
  };

  const handleDelete = async () => {
    if (!token || typeof id !== "string" || !subCat) return;
    if (!replacementId) {
      toast.error("Please choose a replacement sub-category");
      return;
    }
    if (!confirm("Delete this sub-category and reassign its members?")) return;
    try {
      await deleteSubCategory(token, Number(id), Number(replacementId));
      toast.success("Deleted");
      router.push("/membership-plans/sub-category");
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (!subCat) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gold-500 mb-2">
          Sub-Category Not Found
        </h2>
        <button
          onClick={() => router.push("/membership-plans/sub-category")}
          className="mt-6 px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
        >
          Back to Sub-Categories
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <button
        onClick={() => router.push("/membership-plans/sub-category")}
        className="flex items-center text-gray-400 hover:text-gold-500 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Sub-Categories
      </button>

      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {subCat.name}
            </h3>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                subCat.canVote
                  ? "bg-green-500/20 text-green-400"
                  : "bg-gray-500/20 text-gray-300"
              }`}
            >
              {subCat.canVote ? "Can Vote" : "No Vote"}
            </span>
          </div>

          <form
            onSubmit={handleUpdate}
            className="bg-gray-900 p-4 rounded-lg border border-gray-700 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input
                  className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm focus:outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Category</label>
                <input
                  className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm"
                  value={
                    categories.find((c) => c.id === subCat.membershipCategoryId)?.name ||
                    subCat.membershipCategory?.name ||
                    subCat.membershipCategoryId
                  }
                  disabled
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Description</label>
                <textarea
                  className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm focus:outline-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="canVote"
                  type="checkbox"
                  checked={canVote}
                  onChange={(e) => setCanVote(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="canVote" className="text-sm">
                  Can Vote
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md text-sm"
              >
                Save
              </button>
            </div>
          </form>

          <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
            <h4 className="text-lg font-semibold text-red-400 mb-3">
              Danger Zone
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-sm mb-1">
                  Replacement Sub-Category (same category)
                </label>
                <select
                  className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm focus:outline-none"
                  value={replacementId}
                  onChange={(e) =>
                    setReplacementId(
                      e.target.value ? Number(e.target.value) : ""
                    )
                  }
                >
                  <option value="">
                    Select replacement sub-category
                  </option>
                  {sameCategoryOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex md:justify-end">
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm"
                >
                  Delete Sub-Category
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Deleting requires selecting another sub-category in the same category to reassign any existing relations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}