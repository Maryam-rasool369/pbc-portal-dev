"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import useAuthStore from "@/store/authStore";
import { toast } from "react-toastify";
import {
  fetchBusinessGroups,
  createBusinessGroup,
} from "@/services/businessGroups";
import type {
  BusinessGroup,
  PaginationMeta,
} from "@/types/businessGroup";
import AddBusinessGroupModal from "@/components/businessGroups/AddBusinessGroupModal";
import Pagination from "@/components/common/Pagination";
import { FaArrowLeft } from "react-icons/fa";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import "react-toastify/dist/ReactToastify.css";
import Can from "@/components/rbac/Can";

const LIMIT = 10;

export default function BusinessGroupsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const [businessGroups, setBusinessGroups] = useState<BusinessGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal state
  const [openAdd, setOpenAdd] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(value);
      setCurrentPage(1);
    }, 400);
  };

  const loadBusinessGroups = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data, pagination: meta } = await fetchBusinessGroups(
        token,
        currentPage,
        LIMIT,
        search
      );
      setBusinessGroups(data);
      if (meta) setPagination(meta);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch business groups");
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, search]);

  const handleCreateViaModal = async (payload: {
    name: string;
    description: string;
  }) => {
    if (!token) return;
    try {
      await createBusinessGroup(token, payload);
      toast.success("Business group created");
      await loadBusinessGroups();
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
    if (token && user) loadBusinessGroups();
  }, [token, user, loadBusinessGroups]);

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
              Business Groups
            </h3>
            <Can I="create" a="BusinessGroup">
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
              Add Business Group
            </button>
           </Can>
          </div>
          <div className="mt-4 w-full max-w-sm">
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search business groups..."
              className="w-full px-4 py-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-gold-500 placeholder-gray-400 text-sm"
            />
          </div>
        </div>

        {businessGroups.length === 0 && !loading ? (
          <div className="text-center py-16 bg-gray-800 border border-gray-700 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto text-gray-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h2 className="text-xl font-medium text-gray-400">
              No Business Groups Found
            </h2>
            <p className="text-gray-500 mt-2">
              Create your first business group to get started
            </p>
            <button
              onClick={() => setOpenAdd(true)}
              className="mt-6 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors"
            >
              Add Business Group
            </button>
          </div>
        ) : loading ? (
          <div className="min-h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {businessGroups.map((group) => (
                <div
                  key={group.id}
                  className="bg-gray-800 border border-gold-500/30 hover:border-gold-500 rounded-xl p-5 cursor-pointer transition-all"
                  onClick={() => router.push(`/memberships/business-groups/${group.id}`)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-xl text-gold-500 font-bold">
                      {group.name}
                    </h2>
                  </div>
                  <p className="text-gray-300 text-sm mb-4">
                    {truncateText(group.description || "", 150)}
                  </p>
                  <div className="flex justify-between items-center text-gray-400 text-sm mt-4 pt-4 border-t border-gray-700">
                    <span>ID: {group.id}</span>
                    {group.createdAt && (
                      <span>
                        Created: {formatDateAndTime(group.createdAt, true)}
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

      <AddBusinessGroupModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onSubmit={handleCreateViaModal}
      />
    </div>
  );
}
