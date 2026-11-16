"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import useAuthStore from "@/store/authStore";
import { toast } from "react-toastify";
import {
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
} from "@/services/organization";
import type { Organization } from "@/services/organization";
import EditOrganizationModal from "@/components/organization/EditOrganizationModal";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import "react-toastify/dist/ReactToastify.css";

export default function OrganizationDetail() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openEdit, setOpenEdit] = useState(false);

  const loadOrganization = async () => {
    if (!token || typeof id !== "string") return;
    setLoading(true);
    setError(null);
    try {
      const data = await getOrganizationById(token, id);
      setOrg(data);
    } catch (e: any) {
      const msg = e?.message || "Failed to fetch organization details";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (payload: { name: string; description: string }) => {
    if (!token || typeof id !== "string" || !org) return;
    try {
      const updated = await updateOrganization(token, id, payload);
      setOrg(updated);
      setOpenEdit(false);
    } catch (e: any) {
      toast.error(e?.message || "Update failed");
    }
  };

  const handleDelete = async () => {
    if (!token || typeof id !== "string" || !org) return;
    if (!confirm("Delete this organization?")) return;
    try {
      await deleteOrganization(token, id);
      router.push("/memberships/organization");
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  };

  useEffect(() => {
    if (token && user && id) loadOrganization();
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
          onClick={() => router.push("/memberships/organization")}
          className="mt-6 px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
        >
          Back to Organizations
        </button>
      </div>
    );
  }

  // Not found
  if (!org) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gold-500 mb-2">
          Organization Not Found
        </h2>
        <p className="text-gray-300 text-center">
          The organization you are looking for does not exist or you lack permission.
        </p>
        <button
          onClick={() => router.push("/memberships/organization")}
          className="mt-6 px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
        >
          Back to Organizations
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <button
        onClick={() => router.push("/memberships/organization")}
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
        Back to Organizations
      </button>

      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800 flex-1 flex-row">
        <div className="flex flex-col items-start justify-between lg:flex mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {org.name}
            </h3>
          </div>

          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700 w-full">
            <h2 className="text-xl font-medium text-gold-500 mb-4">
              Description
            </h2>
            <p className="text-gray-300 whitespace-pre-wrap">
              {org.description || "No description provided."}
            </p>
          </div>

          <div className="mt-6 bg-gray-900 rounded-lg border border-gray-700 w-full overflow-hidden">
            <h2 className="text-xl font-medium text-gold-500 p-6 pb-4">
              Organization Details
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-gray-800 text-gold-500">
                  <tr>
                    <th scope="col" className="px-6 py-3">ID</th>
                    <th scope="col" className="px-6 py-3">Created Time</th>
                    <th scope="col" className="px-6 py-3">Updated Time</th>
                    <th scope="col" className="px-6 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-700">
                    <td className="px-6 py-4 text-white">{org.id}</td>
                    <td className="px-6 py-4 text-white">
                      {org.createdAt ? formatDateAndTime(org.createdAt, true) : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-white">
                      {org.updatedAt ? formatDateAndTime(org.updatedAt, true) : "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setOpenEdit(true)}
                          className="p-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors"
                          title="Edit"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={handleDelete}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <EditOrganizationModal
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        organization={org}
        onSubmit={handleUpdate}
      />
    </div>
  );
}