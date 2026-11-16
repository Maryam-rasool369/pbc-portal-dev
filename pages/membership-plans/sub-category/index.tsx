"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import useAuthStore from "@/store/authStore";
import Pagination from "@/components/common/Pagination";
import { toast } from "react-toastify";
import {
  fetchSubCategories,
  fetchSubCategoriesByCategory,
  createSubCategory,
} from "@/services/membershipSubCategory";
import type {
  MembershipSubCategory,
  PaginationMeta,
} from "@/types/membershipSubCategory";
import { fetchAllMembershipCategories } from "@/services/membershipCategories";
import Can from "@/components/rbac/Can";

const LIMIT = 10;

export default function SubCategoryIndex() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [subCategories, setSubCategories] = useState<MembershipSubCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Add form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [canVote, setCanVote] = useState(false);
  const [membershipCategoryId, setMembershipCategoryId] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);

  const [filterCategoryId, setFilterCategoryId] = useState<number | "">("");

  const [categories, setCategories] = useState<
    { id: number; name: string; shortName: string }[]
  >([]);

  const loadCategories = async () => {
    if (!token) return;
    try {
      const data = await fetchAllMembershipCategories(token);
      setCategories(
        data.map((c) => ({ id: c.id, name: c.name, shortName: (c as any).shortName || c.name }))
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to load categories");
    }
  };

  const loadSubCategories = async () => {
    if (!token) return;
    setLoading(true);
    try {
      let data, meta;
      if (filterCategoryId) {
        const res = await fetchSubCategoriesByCategory(token, filterCategoryId);
        data = res;
        meta = null;
      } else {
        const res = await fetchSubCategories(token, currentPage, LIMIT);
        data = res.data;
        meta = res.pagination;
      }
      setSubCategories(data);
      if (meta) setPagination(meta);
      else setPagination(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch sub-categories");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!name.trim() || !membershipCategoryId) {
      toast.error("Name and Category are required");
      return;
    }
    setSubmitting(true);
    try {
      await createSubCategory(token, {
        name: name.trim(),
        description: description.trim() || undefined,
        canVote,
        membershipCategoryId: Number(membershipCategoryId),
      });
      toast.success("Sub-Category created");
      setName("");
      setDescription("");
      setCanVote(false);
      setMembershipCategoryId("");
      await loadSubCategories();
    } catch (e: any) {
      toast.error(e.message || "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (pagination && page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    } else {
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    if (token && user) {
      loadCategories();
    }
  }, [token, user]);

  const handleFilterCategoryChange = (value: number | "") => {
    setFilterCategoryId(value);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (token && user) {
      loadSubCategories();
    }
  }, [token, user, currentPage, filterCategoryId]);

  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((c) => map.set(c.id, `${c.name}`));
    return map;
  }, [categories]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Sub-Categories
          </h2>
          <button
            onClick={() => router.push("/membership-plans")}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm"
          >
            Back to Plans
          </button>
        </div>

        <form
          onSubmit={handleCreate}
          className="mb-6 p-4 border border-gray-700 rounded-lg bg-gray-900 space-y-4"
        >
          <h3 className="font-semibold text-gold-500">Add New Sub-Category</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Name*</label>
              <input
                className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm focus:outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sub-category name"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Category*</label>
              <select
                className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm focus:outline-none"
                value={membershipCategoryId}
                onChange={(e) =>
                  setMembershipCategoryId(
                    e.target.value ? Number(e.target.value) : ""
                  )
                }
                required
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Description</label>
              <textarea
                className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm focus:outline-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Optional description"
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
          <button
            disabled={submitting}
            className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md text-sm disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Sub-Category"}
          </button>
        </form>

        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm text-gray-400 whitespace-nowrap">Filter by Category:</label>
          <select
            className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:outline-none text-white"
            value={filterCategoryId}
            onChange={(e) =>
              handleFilterCategoryChange(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="py-10 text-center">Loading...</div>
        ) : subCategories.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            No sub-categories found.
          </div>
        ) : (
          <>
          <Can I="manage" a="MembershipSubCategory">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subCategories.map((sc) => (
                <div
                  key={sc.id}
                  className="p-5 border border-gold-500/30 hover:border-gold-500 rounded-lg transition cursor-pointer bg-gray-900"
                  onClick={() =>
                    router.push(`/membership-plans/sub-category/${sc.id}`)
                  }
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-semibold text-gold-500">{sc.name}</h4>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        sc.canVote
                          ? "bg-green-500/20 text-green-400"
                          : "bg-gray-500/20 text-gray-300"
                      }`}
                    >
                      {sc.canVote ? "Can Vote" : "No Vote"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mt-2 line-clamp-3">
                    {sc.description || "No description"}
                  </p>
                  <div className="text-xs text-gray-400 mt-4">
                    Category: {categoryMap.get(sc.membershipCategoryId) || sc.membershipCategoryId}
                  </div>
                </div>
              ))}
            </div>
            </Can>

            {pagination && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  isLoading={loading}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}