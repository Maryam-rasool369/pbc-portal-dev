"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import useAuthStore from "@/store/authStore";
import { toast } from "react-toastify";
import {
  getBusinessGroupById,
  updateBusinessGroup,
  deleteBusinessGroup,
} from "@/services/businessGroups";
import type { BusinessGroup } from "@/types/businessGroup";
import EditBusinessGroupModal from "@/components/businessGroups/EditBusinessGroupModal";
import ConfirmDialog from "@/components/news/ConfirmDialog";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import "react-toastify/dist/ReactToastify.css";
import Can from "@/components/rbac/Can";

export default function BusinessGroupDetail() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [businessGroup, setBusinessGroup] = useState<BusinessGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadBusinessGroup = async () => {
    if (!token || typeof id !== "string") return;
    setLoading(true);
    setError(null);
    try {
      const data = await getBusinessGroupById(token, id);
      setBusinessGroup(data);
    } catch (e: any) {
      const msg = e?.message || "Failed to fetch business group details";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (payload: {
    name?: string;
    description?: string;
  }) => {
    if (!token || typeof id !== "string" || !businessGroup) return;
    try {
      const updated = await updateBusinessGroup(token, id, payload);
      setBusinessGroup(updated);
      toast.success("Business group updated");
      setOpenEdit(false);
    } catch (e: any) {
      toast.error(e?.message || "Update failed");
    }
  };

  const handleDeleteClick = () => {
    setConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!token || typeof id !== "string" || !businessGroup) return;
    setIsDeleting(true);
    try {
      await deleteBusinessGroup(token, id);
      toast.success("Business group deleted");
      router.push("/memberships/business-groups");
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  };

  useEffect(() => {
    if (token && user && id) loadBusinessGroup();
  }, [token, user, id]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  // Error state
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h2 className="text-2xl font-bold text-red-500 mb-2">Error</h2>
        <p className="text-gray-300 text-center">{error}</p>
        <button
          onClick={() => router.push("/memberships/business-groups")}
          className="mt-6 px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
        >
          Back to Business Groups
        </button>
      </div>
    );
  }

  // Not found
  if (!businessGroup) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gold-500 mb-2">
          Business Group Not Found
        </h2>
        <p className="text-gray-300 text-center">
          The business group you are looking for does not exist or you lack permission.
        </p>
        <button
          onClick={() => router.push("/memberships/business-groups")}
          className="mt-6 px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
        >
          Back to Business Groups
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <button
        onClick={() => router.push("/memberships/business-groups")}
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
        Back to Business Groups
      </button>

      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800 flex-1 flex-row">
        <div className="flex flex-col items-start justify-between lg:flex mb-6">
          <div className="flex flex-row items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-3">
              <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                {businessGroup.name}
              </h3>
            </div>
            <Can I="manage" a="Membership">
              <div className="flex gap-2">
                <button
                  onClick={() => setOpenEdit(true)}
                  className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                >
                  Delete
                </button>
              </div>
            </Can>
          </div>

          <div className="mt-6 bg-gray-900 rounded-lg p-6 border border-gray-700 w-full">
            <h2 className="text-xl font-medium text-gold-500 mb-4">
              Description
            </h2>
            <p className="text-gray-300 whitespace-pre-wrap">
              {businessGroup.description || "No description provided."}
            </p>
          </div>
        </div>
      </div>

      <EditBusinessGroupModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        businessGroup={businessGroup}
        onSubmit={handleUpdate}
        onDelete={handleDeleteClick}
      />

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Business Group"
        message={`Are you sure you want to delete "${businessGroup?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        loading={isDeleting}
      />
    </div>
  );
}
