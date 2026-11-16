"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import useAuthStore from "@/store/authStore";
import { toast } from "react-toastify";
import {
  fetchOrganizations,
  createOrganization,
} from "@/services/organization";
import type { Organization } from "@/services/organization";
import AddOrganizationModal from "@/components/organization/AddOrganizationModal";
import Pagination from "@/components/common/Pagination";
import { FaArrowLeft } from "react-icons/fa";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import "react-toastify/dist/ReactToastify.css";
import Can from "@/components/rbac/Can";

const LIMIT = 10;

type PaginationMeta = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

export default function OrganizationsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  // Modal state
  const [openAdd, setOpenAdd] = useState(false);

  const loadOrganizations = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data, pagination: meta } = await fetchOrganizations(
        token,
        currentPage,
        LIMIT
      );
      setOrganizations(data);
      if (meta) setPagination(meta);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch organizations");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateViaModal = async (payload: {
    name: string;
    description: string;
  }) => {
    if (!token) return;
    try {
      await createOrganization(token, payload);
      await loadOrganizations();
      setOpenAdd(false);
    } catch (e: any) {
      toast.error(e.message || "Create failed");
    }
  };

  const handlePageChange = (page: number) => {
    if (pagination && page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    if (token && user) loadOrganizations();
  }, [token, user, currentPage]);

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return "";
    return text.length <= maxLength ? text : text.substring(0, maxLength) + "...";
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <button
        onClick={() => router.push("/memberships")}
        className="flex items-center text-gray-400 hover:text-gold-400 mb-4 transition-colors"
      >
        {/* @ts-ignore */}
        <FaArrowLeft className="mr-2" /> Back to Memberships
      </button>

      <div className="p-4 bg-gray-800 mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800 flex-1 flex-row">
        <div className="flex flex-col items-start justify-between lg:flex mb-6">
          <div className="flex justify-between flex-row w-full">
            <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
              Organizations
            </h3>
<Can I="manage" a="Membership">
            <button
              onClick={() => setOpenAdd(true)}
              className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md flex items-center transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Organization
            </button>
</Can>
          </div>
        </div>

        {organizations.length === 0 && !loading ? (
          <div className="text-center py-16 bg-gray-800 border border-gray-700 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto text-gray-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 className="text-xl font-medium text-gray-400">
              No Organizations Found
            </h2>
            <p className="text-gray-500 mt-2">
              Create your first organization to get started
            </p>
            <Can I="manage" a="Membership">
            <button
              onClick={() => setOpenAdd(true)}
              className="mt-6 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors"
            >
              Add Organization
            </button>
            </Can>
          </div>
        ) : loading ? (
          <div className="min-h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="bg-gray-800 border border-gold-500/30 hover:border-gold-500 rounded-xl p-5 cursor-pointer transition-all"
                  onClick={() => router.push(`/memberships/organization/${org.id}`)}
                >
                  <h2 className="text-xl text-gold-500 font-bold mb-2">
                    {org.name}
                  </h2>
                  <p className="text-gray-300 text-sm mb-4">
                    {truncateText(org.description || "", 150)}
                  </p>
                  <div className="flex justify-between items-center text-gray-400 text-sm mt-4 pt-4 border-t border-gray-700">
                    <span>ID: {org.id}</span>
                    {org.createdAt && (
                      <span>
                        Created: {formatDateAndTime(org.createdAt, true)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-end mt-4">
                    <button className="w-8 h-8 rounded-full bg-gold-500/10 hover:bg-gold-500/20 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gold-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {pagination && (
              <div className="mt-8">
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

      <AddOrganizationModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSubmit={handleCreateViaModal}
      />
    </div>
  );
}