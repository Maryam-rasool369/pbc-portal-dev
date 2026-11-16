"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import useAuthStore from "@/store/authStore";
import Pagination from "@/components/common/Pagination";
import { toast } from "react-toastify";
import {
  fetchMembershipCategories,
  createMembershipCategory,
} from "@/services/membershipCategories";
import type { MembershipCategory } from "@/services/membershipCategories";
import { fetchMembershipPlans } from "@/services/membershipPlans";
import type { MembershipPlan } from "@/types/membershipPlan";
import Can from "@/components/rbac/Can";

const LIMIT = 10;

export default function CategoryIndex() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [categories, setCategories] = useState<MembershipCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [filterPlanId, setFilterPlanId] = useState<number | "">("");

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [planId, setPlanId] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);

  const loadPlans = async () => {
    if (!token) return;
    try {
      const res = await fetchMembershipPlans(token, 1, 100);
      setPlans(res.data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load membership plans");
    }
  };

  const loadCategories = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data, pagination: meta } = await fetchMembershipCategories(
        token,
        currentPage,
        LIMIT,
        filterPlanId
      );
      setCategories(data);
      if (meta) setPagination(meta);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!name.trim() || !planId) {
      toast.error("Name and Membership Plan are required");
      return;
    }
    setSubmitting(true);
    try {
      await createMembershipCategory(token, {
        name: name.trim(),
        description: description.trim() || undefined,
        planId: Number(planId),
      });
      toast.success("Category created successfully");
      setName("");
      setDescription("");
      setPlanId("");
      await loadCategories();
    } catch (e: any) {
      toast.error(e.message || "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterPlanChange = (value: number | "") => {
    setFilterPlanId(value);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (token && user) {
      loadPlans();
    }
  }, [token, user]);

  useEffect(() => {
    if (token && user) {
      loadCategories();
    }
  }, [token, user, currentPage, filterPlanId]);

  const planMap = new Map(plans.map((p) => [p.id, p.name]));

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        <div className="flex items-start justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Categories
          </h2>
          <button
            onClick={() => router.push("/membership-plans")}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm"
          >
            Back to Plans
          </button>
        </div>

        <Can I="create" a="MembershipCategory">
          <form
            onSubmit={handleCreate}
            className="mb-6 p-4 border border-gray-700 rounded-lg bg-gray-900 space-y-4"
          >
            <h3 className="font-semibold text-gold-500">Add New Category</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Name*</label>
                <input
                  className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm focus:outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Category name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Membership Plan*</label>
                <select
                  className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm focus:outline-none"
                  value={planId}
                  onChange={(e) =>
                    setPlanId(e.target.value ? Number(e.target.value) : "")
                  }
                  required
                >
                  <option value="">Select plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
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
            </div>
            <button
              disabled={submitting}
              className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md text-sm disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create Category"}
            </button>
          </form>
        </Can>

        <div className="mb-4 flex items-center gap-3">
          <label className="text-sm text-gray-400 whitespace-nowrap">Filter by Plan:</label>
          <select
            className="rounded-md bg-gray-900 border border-gray-700 px-3 py-2 text-sm focus:outline-none text-white"
            value={filterPlanId}
            onChange={(e) =>
              handleFilterPlanChange(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">All Plans</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="py-10 text-center">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            No categories found.
          </div>
        ) : (
          <>
            <Can I="manage" a="MembershipCategory">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-5 border border-gold-500/30 hover:border-gold-500 rounded-lg transition bg-gray-900 cursor-pointer"
                    onClick={() => router.push(`/membership-plans/category/${cat.id}`)}
                  >
                    <h4 className="font-semibold text-gold-500">{cat.name}</h4>
                    <p className="text-sm text-gray-300 mt-2 line-clamp-3">
                      {cat.description || "No description"}
                    </p>
                    <div className="text-xs text-gray-400 mt-4">
                      Plan: {planMap.get(cat.planId) || cat.planId}
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
