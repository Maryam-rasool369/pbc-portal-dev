"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import useAuthStore from "@/store/authStore";
import { toast } from "react-toastify";
import {
  getMembershipCategoryById,
  updateMembershipCategory,
  updateMembershipCategoryPlan,
  deleteMembershipCategory,
  fetchAllMembershipCategories,
} from "@/services/membershipCategories";
import type { MembershipCategory } from "@/services/membershipCategories";
import { fetchMembershipPlans } from "@/services/membershipPlans";
import type { MembershipPlan } from "@/types/membershipPlan";

export default function CategoryDetail() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [category, setCategory] = useState<MembershipCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [description, setDescription] = useState("");
  const [planId, setPlanId] = useState<number | "">("");

  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [allCategories, setAllCategories] = useState<MembershipCategory[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState<number | "">("");
  const [deleting, setDeleting] = useState(false);

  const loadDetail = async () => {
    if (!token || typeof id !== "string") return;
    setLoading(true);
    try {
      const data = await getMembershipCategoryById(token, Number(id));
      setCategory(data);
      setDescription(data.description || "");
      setPlanId(data.planId);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch category");
    } finally {
      setLoading(false);
    }
  };

  const loadPlans = async () => {
    if (!token) return;
    try {
      const res = await fetchMembershipPlans(token, 1, 100);
      setPlans(res.data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load membership plans");
    }
  };

  const loadAllCategories = async () => {
    if (!token) return;
    try {
      const data = await fetchAllMembershipCategories(token);
      setAllCategories(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load categories");
    }
  };

  useEffect(() => {
    if (token && user && id) {
      loadDetail();
      loadPlans();
      loadAllCategories();
    }
  }, [token, user, id]);

  const handleDelete = async (targetId: number) => {
    if (!token || typeof id !== "string") return;
    setDeleting(true);
    try {
      await deleteMembershipCategory(token, Number(id), targetId);
      toast.success("Category deleted successfully");
      router.push("/membership-plans/category");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete category");
      setDeleting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || typeof id !== "string" || !category) return;
    setSaving(true);
    try {
      const numericId = Number(id);
      const descriptionChanged = description.trim() !== (category.description || "").trim();
      const planChanged = planId !== "" && Number(planId) !== category.planId;

      if (!descriptionChanged && !planChanged) {
        toast.info("No changes to save");
        setSaving(false);
        return;
      }

      if (descriptionChanged) {
        await updateMembershipCategory(token, numericId, {
          name: category.name,
          description: description.trim(),
        });
      }

      if (planChanged) {
        await updateMembershipCategoryPlan(
          token,
          numericId,
          Number(planId)
        );
      }

      toast.success("Category updated successfully");
      await loadDetail();
    } catch (e: any) {
      toast.error(e.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gold-500" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gold-500 mb-2">
          Category Not Found
        </h2>
        <button
          onClick={() => router.push("/membership-plans/category")}
          className="mt-6 px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
        >
          Back to Categories
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <button
        onClick={() => router.push("/membership-plans/category")}
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
        Back to Categories
      </button>

      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            {category.name}
          </h3>

        </div>

        <form
          onSubmit={handleSave}
          className="bg-gray-900 p-4 rounded-lg border border-gray-700 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1 text-gray-400">
                Name <span className="text-xs">(read-only)</span>
              </label>
              <input
                className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
                value={category.name}
                disabled
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Membership Plan</label>
              <select
                className="w-full rounded-md bg-gray-800 border border-gray-700 px-3 py-2 text-sm focus:outline-none"
                value={planId}
                onChange={(e) =>
                  setPlanId(e.target.value ? Number(e.target.value) : "")
                }
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
                rows={4}
                placeholder="Optional description"
              />
            </div>
          </div>

          <button
            disabled={saving}
            className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </form>
      </div>

    </div>
  );
}
