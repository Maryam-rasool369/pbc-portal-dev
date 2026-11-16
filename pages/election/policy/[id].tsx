"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getPolicyById, editPolicy, deletePolicy } from "@/services/election";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import type { Policy } from "@/types/election";
import EditPolicyModal from "@/components/elections/editPolicyModal";
import DeletePolicyModal from "@/components/elections/deletePolicyModal";
import useAuthStore from "@/store/authStore";
import Can from "@/components/rbac/Can";
import _ from "lodash";
import { formatStatus } from "@/utils/formatStatus";

export default function PolicyDetail() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Fetch policy details when ID and token are available
  useEffect(() => {
    if (!id || !token) return;

    const fetchPolicy = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getPolicyById(token, id as string);
        setPolicy(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch policy details"
        );
        toast.error(
          err instanceof Error ? err.message : "Failed to fetch policy details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPolicy();
  }, [id, token]);

  // Handle policy update
  const handleUpdatePolicy = async (title: string, description: string) => {
    if (!token || !policy) {
      toast.error("You must be logged in to update a policy");
      return;
    }

    try {
      const updatedPolicy = await editPolicy(token, policy.id.toString(), {
        ...(title && { title }),
        ...(description && { description }),
      });
      setPolicy(updatedPolicy);
      toast.success("Policy updated successfully");
      setShowEditModal(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update policy"
      );
    }
  };

  // Handle policy deletion
  const handleDeletePolicy = async () => {
    if (!token || !policy) {
      toast.error("You must be logged in to delete a policy");
      return;
    }

    try {
      await deletePolicy(token, policy.id.toString());
      toast.success("Policy deleted successfully");
      router.push("/election/policy");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete policy"
      );
    }
  };

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h2 className="text-2xl font-bold text-red-500 mb-2">Error</h2>
        <p className="text-gray-300 text-center">{error}</p>
        <button
          onClick={() => router.push("/election/policy")}
          className="mt-6 px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
        >
          Back to Policies
        </button>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gold-500 mb-2">
          Policy Not Found
        </h2>
        <p className="text-gray-300 text-center">
          The policy you&apos;re looking for doesn&apos;t exist or you
          don&apos;t have permission to view it.
        </p>
        <button
          onClick={() => router.push("/election/policy")}
          className="mt-6 px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
        >
          Back to Policies
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <button
        onClick={() => router.push("/election/policy")}
        className="flex items-center text-gray-400 hover:text-gold-500 transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Policies
      </button>

      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800 flex-1 flex-row">
        <div className="flex flex-col items-start justify-between lg:flex mb-6">
          <div className="flex flex-row items-center justify-between gap-4 w-full">
            <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
              {policy.title}
            </h3>
          </div>

          <div className="mt-6 bg-gray-900 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-medium text-gold-500 mb-4">
              Description
            </h2>
            <p className="text-gray-300 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: policy.description }}></p>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-medium text-gold-500 mb-4">
                Policy Details
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 mr-3">ID:</span>
                  <span className="text-white">{policy.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 mr-3">Submitted Time:</span>
                  <span className="text-white">
                    {formatDateAndTime(policy.createdAt, true)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 mr-3">Status:</span>
                  <span className="text-white">
                    {formatStatus(policy.status)}
                  </span>
                </div>
              </div>
            </div>

            {user &&
              policy &&
              Number(policy.userId) === Number(user.id) &&
              policy.status === "PENDING" && (
                <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
                  <h2 className="text-xl font-medium text-gold-500 mb-4">
                    Actions
                  </h2>
                  <div className="space-y-4">
                    <Can I="update" a="Policy">
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="w-full py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors"
                      >
                        Edit Policy
                      </button>
                    </Can>
                    <Can I="delete" a="Policy">
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                      >
                        Delete Policy
                      </button>
                    </Can>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Edit Policy Modal */}
      {showEditModal && (
        <EditPolicyModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdatePolicy}
          policy={policy}
        />
      )}

      {/* Delete Policy Modal */}
      {showDeleteModal && (
        <DeletePolicyModal
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeletePolicy}
          policy={policy}
        />
      )}
    </div>
  );
}
