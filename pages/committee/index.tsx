"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import useAuthStore from "@/store/authStore";
import { toast } from "react-toastify";
import { fetchCommittees, createCommittee } from "@/services/committee";
import type { Committee, PaginationMeta } from "@/types/committee";
import CreateCommitteeModal from "@/components/modals/CreateCommitteeModal";
import { HiOutlineChevronRight, HiOutlineUser } from "react-icons/hi";
import MainLayout from "@/layouts/MainLayout";
import Can from "@/components/rbac/Can";
import Pagination from "@/components/common/Pagination";

export default function CommitteePage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  const PAGE_SIZE = 10;

  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  const [openCreate, setOpenCreate] = useState(false);

  const loadCommittees = async (page = currentPage) => {
    if (!token) return;
    setLoading(true);
    try {
      const { committees: data, pagination: meta } = await fetchCommittees(token, page, PAGE_SIZE);
      setCommittees(data);
      setPagination(meta);
    } catch (e: any) {
      toast.error(e.message || "Failed to fetch committees");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadCommittees(page);
  };

  const handleCreateCommittee = async (payload: {
    name?: string;
    details?: string;
    startDate?: string;
    endDate?: string;
    members?: Array<{
      userId: number;
      role?: "HEAD" | "MEMBER" | "SECRETARY" | "TREASURER";
    }>;
  }) => {
    if (!token) return;
    try {
      await createCommittee(token, payload);
      toast.success("Committee created successfully");
      await loadCommittees(currentPage);
      setOpenCreate(false);
    } catch (e: any) {
      toast.error(e.message || "Create failed");
    }
  };

  useEffect(() => {
    if (token && user) loadCommittees();
  }, [token, user]);

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  return (
    <div className="min-h-screen text-white flex flex-col p-4">
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800 flex-1 flex-col">
        <div className="flex flex-col items-start justify-between lg:flex mb-6">
          <div className="flex flex-row items-center justify-between gap-4 w-full mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Committees
            </h3>
            <Can I="create" a="Committee">
              <button
                onClick={() => setOpenCreate(true)}
                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors flex items-center font-medium"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Committee
              </button>
            </Can>
          </div>

          <div className="mt-6 space-y-6 w-full">
            {committees.length === 0 && !loading ? (
              <div className="text-center py-16 bg-gray-800 border border-gray-700 rounded-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-16 w-16 mx-auto text-gray-600 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <h2 className="text-xl font-medium text-gray-400">
                  No Committees Found
                </h2>
                <Can I="create" a="Committee">
                  <p className="text-gray-500 mt-2">
                    Create your first committee to get started
                  </p>
                  <button
                    onClick={() => setOpenCreate(true)}
                    className="mt-6 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors font-medium"
                  >
                    Create Committee
                  </button>
                </Can>
              </div>
            ) : loading ? (
              <div className="min-h-[200px] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
              </div>
            ) : (
              committees.map((committee) => (
                <div
                  key={committee.id}
                  className="bg-gray-800 border border-gold-500 rounded-xl p-5 transition-all hover:border-gold-400"
                >
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl text-gold-500 font-bold truncate">
                        {committee.name}
                      </h2>
                      <p className="text-white text-sm mt-1 line-clamp-2 break-words">
                        {committee.name || "No details available"}
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-white flex-wrap">
                        {/* @ts-ignore */}
                        <HiOutlineUser className="text-gold-500 w-5 h-5" />
                        <span className="text-sm font-medium">
                          {committee.members?.length || 0} Members
                        </span>
                        {committee.startDate && (
                          <>
                            {" "}
                            -{" "}
                            <span className="text-sm font-medium">
                              {formatDate(committee.startDate)}
                            </span>
                          </>
                        )}
                        {(committee.subCommittees?.length || 0) > 0 && (
                          <>
                            {" "}
                            -{" "}
                            <span className="text-sm font-medium text-blue-400">
                              {committee.subCommittees?.length} Sub-Committees
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <button
                        className="w-8 h-8 bg-gold-500 text-black rounded-full flex items-center justify-center transition-all hover:bg-gold-600"
                        onClick={() =>
                          router.push(`/committee/${committee.id}`)
                        }
                      >
                        {/* @ts-ignore */}
                        <HiOutlineChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {pagination && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              isLoading={loading}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>

      <CreateCommitteeModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onSubmit={handleCreateCommittee}
      />
    </div>
  );
}

CommitteePage.getLayout = (page: React.ReactNode) => (
  <MainLayout activeMenu="committee">{page}</MainLayout>
);
