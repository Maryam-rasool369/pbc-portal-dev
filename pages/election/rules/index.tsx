"use client";

import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { fetchAllElectionRules, createElectionRule } from "@/services/directorElection";
import { FaArrowLeft } from "react-icons/fa";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import type { ElectionRule } from "@/types/election";
import AddElectionRuleModal from "@/components/elections/addElectionRule";
import useAuthStore from "@/store/authStore";
import Can from "@/components/rbac/Can";
import { formatStatus } from "@/utils/formatStatus";

export default function ElectionRulesList() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [rules, setRules] = useState<ElectionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Fetch rules when token or page changes
  useEffect(() => {
    if (!token) return;

    const fetchRules = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAllElectionRules(token, currentPage, limit);
        setRules(data.data || []);

        // Estimate total pages based on the number of rules returned
        setTotalPages(data.pagination?.totalPages || 1);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch election rules"
        );
        toast.error(
          err instanceof Error ? err.message : "Failed to fetch election rules"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, [token, currentPage]);

  // Handle rule creation
  const handleCreateRule = async (data: { title: string; content: string }) => {
    if (!token) {
      toast.error("You must be logged in to create an election rule");
      return;
    }

    try {
      const newRule = await createElectionRule(token, { title: data.title, content: data.content });
      setRules((prev) => [newRule, ...prev]);
      toast.success("Election rule created successfully");
      setShowAddModal(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create election rule"
      );
    }
  };

  // Truncate text if it's too long
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  if (loading && rules.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <button
        onClick={() => router.push("/election?tab=director")}
        className="flex items-center text-gray-400 hover:text-gold-400 mb-4 transition-colors"
      >
        {/* @ts-ignore */}
        <FaArrowLeft className="mr-2" /> Back to Director Elections
      </button>
      <div className="p-4 bg-gray-800 mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800 flex-1 flex-row">
        <div className="flex flex-col items-start justify-between lg:flex mb-6">
          <div className="flex justify-between flex-row w-full">
            <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
              Election Rules
            </h3>
            <Can I="create" a="DirectorElection">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md flex items-center transition-colors"
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
                Add Rule
              </button>
            </Can>
          </div>
        </div>
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-md p-4 mb-6">
            <p className="text-red-500">{error}</p>
          </div>
        )}
        {rules.length === 0 ? (
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h2 className="text-xl font-medium text-gray-400">
              No Election Rules Found
            </h2>
            <p className="text-gray-500 mt-2">
              Create your first election rule to get started
            </p>
            <Can I="create" a="DirectorElection">
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-6 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors"
              >
                Add Rule
              </button>
            </Can>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-gray-800 border border-gold-500/30 hover:border-gold-500 rounded-xl p-5 cursor-pointer transition-all"
                  onClick={() => router.push(`/election/rules/${rule.id}`)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-700 text-gray-300">
                      {formatStatus(rule.status)}
                    </span>
                  </div>
                  {rule.title && (
                    <h4 className="text-gold-500 font-semibold mb-2">{rule.title}</h4>
                  )}
                  <div
                    className="text-gray-300 text-sm mb-4"
                    dangerouslySetInnerHTML={{
                      __html: truncateText(rule.content, 150),
                    }}
                  ></div>
                  <div className="flex justify-between items-center text-gray-400 text-sm mt-4 pt-4 border-t border-gray-700">
                    <span>ID: {rule.id}</span>
                    <span>Created: {formatDateAndTime(rule.createdAt, true)}</span>
                  </div>
                  {rule.creator && (
                    <div className="text-gray-400 text-xs mt-2">
                      By: {rule.creator.name}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded border ${
                    currentPage === 1
                      ? "border-gray-700 text-gray-500 cursor-not-allowed"
                      : "border-gray-600 text-white hover:bg-gray-800"
                  }`}
                >
                  Previous
                </button>
                <span className="text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded border ${
                    currentPage === totalPages
                      ? "border-gray-700 text-gray-500 cursor-not-allowed"
                      : "border-gray-600 text-white hover:bg-gray-800"
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Rule Modal */}
      {showAddModal && (
        <AddElectionRuleModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateRule}
        />
      )}
    </div>
  );
}

