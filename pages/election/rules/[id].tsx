"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  getElectionRuleById,
  getElectionRuleApprovals,
  approveElectionRule,
} from "@/services/directorElection";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import type { ElectionRule } from "@/types/election";
import useAuthStore from "@/store/authStore";
import { formatStatus } from "@/utils/formatStatus";
import { Roles } from "@/enums/Roles";
import Can from "@/components/rbac/Can";
import { CheckIcon, XIcon } from "lucide-react";

interface Approval {
  id: number;
  userId: number;
  status: "APPROVED" | "REJECTED";
  comment?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    Role?: {
      id: number;
      name: string;
    };
  };
}

export default function ElectionRuleDetail() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [rule, setRule] = useState<ElectionRule | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVoteButtons, setShowVoteButtons] = useState(false);
  
  // Debug: Log whenever showVoteButtons changes
  useEffect(() => {
    console.log("showVoteButtons state changed to:", showVoteButtons);
  }, [showVoteButtons]);


  // Fetch rule details
  useEffect(() => {
    if (!id || !token) return;

    const fetchRule = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getElectionRuleById(token, id as string);
        setRule(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch election rule details"
        );
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to fetch election rule details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRule();
  }, [id, token]);

  const fetchApprovals = useCallback(async () => {
    if (!id || !token) return;

    try {
      const data = await getElectionRuleApprovals(token, id as string);
      setApprovals(data);
      console.log("Approvals fetched:", data.length, "decisions");
    } catch (err) {
      console.error("Failed to fetch approvals:", err);
    }
  }, [id, token]);

  // Fetch approvals
  useEffect(() => {
    if (id && token && user) {
      fetchApprovals();
    }
  }, [id, token, user, fetchApprovals]);

  // Determine if user can vote
  // Anyone can vote except Individual and Corporate
  // Chairman can vote after 3 total decisions (approvals or rejections) - Chairman's decision is final
  useEffect(() => {
    if (!user || !rule) {
      setShowVoteButtons(false);
      return;
    }

    // Exclude Individual and Corporate roles from voting
    if (
      user.Role?.name === Roles.INDIVIDUAL ||
      user.Role?.name === Roles.CORPORATE
    ) {
      setShowVoteButtons(false);
      return;
    }

    // Ensure consistent type comparison
    const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : Number(user.id);
    const createdById = typeof rule.createdBy === 'string' ? parseInt(rule.createdBy, 10) : Number(rule.createdBy);
    
    // approvals is initialized as empty array, so it's always defined
    const userHasVoted = approvals.some(
      (approval) => {
        const approvalUserId = typeof approval.userId === 'string' ? parseInt(approval.userId, 10) : Number(approval.userId);
        return approvalUserId === userId;
      }
    );

    // Chairman can vote after 3 total decisions (approvals or rejections) - Chairman's decision is final
    const userRoleName = user.Role?.name;
    const isChairman = userRoleName === Roles.CHAIRMAN || userRoleName === "Chairman";
    const isCreator = createdById === userId;
    
    // Creator cannot vote (except Chairman can vote even if creator, after 3 decisions)
    if (isCreator && !isChairman) {
      setShowVoteButtons(false);
      return;
    }
    
    let shouldShow = false;
    
    if (isChairman) {
      const totalDecisions = approvals.length; // Count all approvals and rejections
      
      // Check all conditions separately for better debugging
      const hasNotVoted = !userHasVoted;
      const isPending = rule.status === "PENDING";
      const hasEnoughDecisions = totalDecisions >= 3;
      
      // Chairman can vote if: not voted, pending, and 3+ decisions (even if they're the creator)
      shouldShow = hasNotVoted && isPending && hasEnoughDecisions;
    } else {
      // Anyone else (except Individual/Corporate) can vote if they haven't already and status is PENDING
      shouldShow = !userHasVoted && rule.status === "PENDING";
    }

    setShowVoteButtons((prev) => {
      if (prev !== shouldShow) {
        console.log("State change: prev =", prev, "new =", shouldShow);
        return shouldShow;
      }
      return prev;
    });
  }, [user, rule, approvals]);

  const handleApprove = () => {
    setStatus("APPROVED");
    setShowModal(true);
    setComment("");
  };

  const handleReject = () => {
    setStatus("REJECTED");
    setShowModal(true);
    setComment("");
  };

  const handleApproveReject = async (status: "APPROVED" | "REJECTED") => {
    if (!comment || comment.trim().length < 10) {
      toast.warning("Please provide a detailed comment (minimum 10 characters).");
      return;
    }

    if (token === "undefined" || token === null) {
      router.push("/");
      return;
    }

    if (!id) {
      toast.error("Missing required information");
      return;
    }

    try {
      setIsSubmitting(true);
      await approveElectionRule(token, id as string, {
        status,
        comment: comment.trim(),
      });

      toast.success(
        `Election rule ${status.toLowerCase()} successfully`
      );
      setShowModal(false);
      setComment("");
      fetchApprovals();
      // Refresh rule to get updated status
      const updatedRule = await getElectionRuleById(token, id as string);
      setRule(updatedRule);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Error processing your request"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    let bgColor, textColor, darkBgColor, darkTextColor;

    switch (status.toUpperCase()) {
      case "APPROVED":
        bgColor = "bg-green-100";
        textColor = "text-green-800";
        darkBgColor = "dark:bg-green-900";
        darkTextColor = "dark:text-green-300";
        break;
      case "PENDING":
        bgColor = "bg-yellow-100";
        textColor = "text-yellow-800";
        darkBgColor = "dark:bg-yellow-900";
        darkTextColor = "dark:text-yellow-300";
        break;
      case "REJECTED":
        bgColor = "bg-red-100";
        textColor = "text-red-800";
        darkBgColor = "dark:bg-red-900";
        darkTextColor = "dark:text-red-300";
        break;
      default:
        bgColor = "bg-gray-100";
        textColor = "text-gray-800";
        darkBgColor = "dark:bg-gray-900";
        darkTextColor = "dark:text-gray-300";
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor} ${darkBgColor} ${darkTextColor}`}
      >
        {formatStatus(status)}
      </span>
    );
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
          onClick={() => router.push("/election/rules")}
          className="mt-6 px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
        >
          Back to Election Rules
        </button>
      </div>
    );
  }

  if (!rule) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gold-500 mb-2">
          Election Rule Not Found
        </h2>
        <p className="text-gray-300 text-center">
          The election rule you&apos;re looking for doesn&apos;t exist or you
          don&apos;t have permission to view it.
        </p>
        <button
          onClick={() => router.push("/election/rules")}
          className="mt-6 px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
        >
          Back to Election Rules
        </button>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <button
        onClick={() => router.push("/election/rules")}
        className="flex items-center text-gray-400 hover:text-gold-500 transition-colors mb-4"
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
        Back to Election Rules
      </button>

      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800 flex-1 flex-row">
        {/* Header with action buttons - matching membership pattern */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b pb-6 dark:border-gray-700">
          <div className="flex items-start gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                Election Rule #{rule.id}
                <StatusBadge status={rule.status} />
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                ID: {rule.id} • Submitted at:{" "}
                {formatDateAndTime(rule.createdAt, true)}
                {rule.creator && ` • Created by: ${rule.creator.name}`}
              </p>
            </div>
          </div>

          {/* Calculate shouldShowButtons directly for Chairman to bypass state issues */}
          {(() => {
            if (!user || !rule) return null;
            
            if (
              user.Role?.name === Roles.INDIVIDUAL ||
              user.Role?.name === Roles.CORPORATE
            ) {
              return null;
            }
            
            // Ensure consistent type comparison
            const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : Number(user.id);
            const createdById = typeof rule.createdBy === 'string' ? parseInt(rule.createdBy, 10) : Number(rule.createdBy);
            
            const isChairman = user?.Role?.name === Roles.CHAIRMAN || user?.Role?.name === "Chairman";
            const userHasVoted = approvals.some(a => {
              const approvalUserId = typeof a.userId === 'string' ? parseInt(a.userId, 10) : Number(a.userId);
              return approvalUserId === userId;
            });
            const isCreator = createdById === userId;
            const isNotCreator = !isCreator;
            const isPending = rule?.status === "PENDING";
            const hasEnoughDecisions = approvals.length >= 3;
            
            // For Chairman: can vote if not voted, pending, and 3+ decisions (even if they're the creator)
            const chairmanCanVote = isChairman && !userHasVoted && isPending && hasEnoughDecisions;
            
            // For others (except Individual/Corporate): can vote if not voted, not creator, pending
            const isAdminRole = user?.Role?.name && 
              user.Role.name !== Roles.INDIVIDUAL && 
              user.Role.name !== Roles.CORPORATE;
            const othersCanVote = !isChairman && isAdminRole && !userHasVoted && isNotCreator && isPending;
            
            const shouldShowButtons = chairmanCanVote || othersCanVote || showVoteButtons;
            
            if (shouldShowButtons) {
              return (
                <div className="flex gap-3 mt-2 sm:mt-0">
                  <button
                    onClick={handleApprove}
                    className="flex items-center px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <CheckIcon className="w-4 h-4 mr-2" />
                    Approve
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex items-center px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <XIcon className="w-4 h-4 mr-2" />
                    Reject
                  </button>
                </div>
              );
            }
            
                if (isChairman && isPending && !hasEnoughDecisions) {
              return (
                <div className="flex flex-col gap-2 mt-2 sm:mt-0">
                  <div className="text-sm text-gray-400">
                    Waiting for {3 - approvals.length} more decision(s) before Chairman can vote
                  </div>
                </div>
              );
            }
            
            return null;
          })()}
        </div>

        <div className="mt-6 bg-gray-900 rounded-lg p-6 border border-gray-700 w-full">
            <h2 className="text-xl font-medium text-gold-500 mb-4">
              Content
            </h2>
            <div
              className="text-gray-300 prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: rule.content }}
            ></div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-medium text-gold-500 mb-4">
                Rule Details
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 mr-3">ID:</span>
                  <span className="text-white">{rule.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 mr-3">Created:</span>
                  <span className="text-white">
                    {formatDateAndTime(rule.createdAt, true)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 mr-3">Status:</span>
                  <span className="text-white">
                    <StatusBadge status={rule.status} />
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-medium text-gold-500 mb-4">
                Approval Progress
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Decisions:</span>
                  <span className="text-white">
                    {approvals.length}/3 (Required for Chairman: 3)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Approvals:</span>
                  <span className="text-white">
                    {approvals.filter((a) => a.status === "APPROVED").length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Rejections:</span>
                  <span className="text-white">
                    {approvals.filter((a) => a.status === "REJECTED").length}
                  </span>
                </div>
                {approvals.length >= 3 && approvals.some((approval) => approval.user?.Role?.name === Roles.VC_FINANCE || approval.user?.Role?.name === "VC Finance") && (
                  <div className="mt-4 pt-3 border-t border-gray-700">
                    <p className="text-sm text-gold-400">
                      ✓ Chairman can now make the final decision
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Approvals History */}
          <div className="mt-6 bg-gray-900 rounded-lg p-6 border border-gray-700 w-full">
            <h2 className="text-xl font-medium text-gold-500 mb-4">
              Approval History
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Anyone can vote except Individual and Corporate roles. Chairman can
              vote after 3 total decisions (approvals or rejections). Chairmans decision is final.
            </p>

            {approvals.length === 0 ? (
              <div className="text-center py-8 bg-gray-800 rounded-lg border border-gray-700">
                <svg
                  className="mx-auto h-12 w-12 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-base font-medium text-gray-400">
                  No approval data
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  No approval history is available for this election rule.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Approver
                      </th>
                      <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Role
                      </th>
                     
                      <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Decision
                      </th>
                      <th className="px-4 py-3.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Comments
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {approvals.map((approval) => (
                      <tr
                        key={approval.id}
                        className="hover:bg-gray-700"
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">
                            {approval.user.name}
                          </div>
                          <div className="text-xs text-gray-400">
                            ID: {approval.userId}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 text-xs font-medium bg-purple-500 text-white rounded-full">
                            {approval.user?.Role?.name || "N/A"}
                          </span>
                        </td>
                      
                        <td className="px-4 py-4 whitespace-nowrap">
                          <StatusBadge status={approval.status} />
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-300">
                          <div className="max-w-xs lg:max-w-lg break-words">
                            {approval.comment || "-"}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
      </div>

      {/* Approval/Rejection Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-gray-800 border border-gold-500/30 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-medium text-white">
                  {status === "APPROVED" ? "Approve" : "Reject"} Election Rule
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setComment("");
                  }}
                  disabled={isSubmitting}
                  className="text-gray-400 hover:text-white disabled:opacity-50"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-400 mb-4">
                  {status === "APPROVED"
                    ? "Please provide your approval comments for this election rule."
                    : "Please explain why you are rejecting this election rule."}
                </p>

                <div>
                  <label
                    htmlFor="comment"
                    className="block mb-2 text-sm font-medium text-gray-300"
                  >
                    Comments <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="comment"
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={isSubmitting}
                    className="block w-full p-2.5 text-sm text-white bg-gray-700 rounded-lg border border-gray-600 focus:ring-gold-500 focus:border-gold-500 disabled:opacity-75"
                    placeholder={
                      status === "APPROVED"
                        ? "Enter your approval comments..."
                        : "Enter your rejection reason..."
                    }
                  ></textarea>

                  <p
                    className={`mt-2 text-sm ${
                      comment.length < 10
                        ? "text-red-500"
                        : "text-gray-400"
                    }`}
                  >
                    {comment.length < 10
                      ? "Please provide at least 10 characters"
                      : `${comment.length} characters entered`}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setComment("");
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApproveReject(status!)}
                  disabled={comment.length < 10 || isSubmitting}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    status === "APPROVED"
                      ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                      : "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                  } ${comment.length < 10 || isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </div>
                  ) : (
                    `${status === "APPROVED" ? "Approve" : "Reject"} Rule`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

