"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { generateVotingOTP, castVote, castRunoffVote, CastVotePayload } from "@/services/directorElection";

interface Candidate {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  organization: {
    id: number;
    name: string;
  };
  contactAddress: string;
  poBoxNo: string;
  officeTel: string;
}

interface VotingScreenProps {
  electionId: number;
  candidates: Candidate[];
  token: string;
  onVoteSuccess: () => void;
  onClose: () => void;
  isRunoff?: boolean;
}

export default function VotingScreen({
  electionId,
  candidates,
  token,
  onVoteSuccess,
  onClose,
  isRunoff = false,
}: VotingScreenProps) {
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const handleCandidateToggle = (candidateId: number) => {
    setSelectedCandidates((prev) => {
      if (prev.includes(candidateId)) {
        // Remove candidate
        return prev.filter((id) => id !== candidateId);
      } else {
        // Add candidate (max 7 for regular, no max for runoff)
        if (!isRunoff && prev.length >= 7) {
          toast.warning("You can vote for a maximum of 7 candidates.");
          return prev;
        }
        return [...prev, candidateId];
      }
    });
  };

  const handleRequestOTP = async () => {
    if (selectedCandidates.length === 0) {
      toast.error("Please select at least 1 candidate before requesting OTP.");
      return;
    }

    if (!isRunoff && selectedCandidates.length > 7) {
      toast.error("You can vote for a maximum of 7 candidates.");
      return;
    }

    setSendingOtp(true);
    try {
      //await generateVotingOTP(token, electionId);
      setOtpSent(true);
      toast.success("OTP sent to your registered email address.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to send OTP.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmitVote = async () => {
    if (selectedCandidates.length === 0) {
      toast.error("Please select at least 1 candidate.");
      return;
    }

    if (!isRunoff && selectedCandidates.length > 7) {
      toast.error("You can vote for a maximum of 7 candidates.");
      return;
    }

    if (!otp.trim()) {
      toast.error("Please enter the OTP sent to your email.");
      return;
    }

    setLoading(true);
    try {
      const payload: CastVotePayload = {
        otp: otp.trim(),
        candidateIds: selectedCandidates,
      };

      if (isRunoff) {
        await castRunoffVote(token, electionId, payload);
        toast.success("Your runoff vote has been successfully recorded!");
      } else {
        await castVote(token, electionId, payload);
        toast.success("Your vote has been successfully recorded!");
      }
      onVoteSuccess();
    } catch (error: any) {
      toast.error(error?.message || "Failed to cast vote.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-gray-800 border border-gold-500/30 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gold-500">
              {isRunoff ? "Cast Your Runoff Vote" : "Cast Your Vote"}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p className="text-gray-300 mt-2">
            {isRunoff
              ? "Select candidates from the tied group to break the tie. You can vote for a minimum of 1 candidate."
              : "Select between 1 and 7 candidates. You can vote for a minimum of 1 and a maximum of 7 candidates."}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <div className="text-sm text-gray-400">
              Selected: <span className="text-gold-500 font-semibold">{selectedCandidates.length}</span> {isRunoff ? "" : "/ 7"}
            </div>
            {selectedCandidates.length > 0 && (
              <div className="text-sm text-emerald-400">
                {selectedCandidates.length === 1
                  ? "1 vote selected"
                  : `${selectedCandidates.length} votes selected`}
              </div>
            )}
          </div>
        </div>

        {/* Candidates List */}
        <div className="flex-1 overflow-y-auto p-6">
          {candidates.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p>No candidates available for voting.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {candidates.map((candidate) => {
                const isSelected = selectedCandidates.includes(candidate.id);
                return (
                  <div
                    key={candidate.id}
                    onClick={() => handleCandidateToggle(candidate.id)}
                    className={`bg-gray-700 border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "border-gold-500 bg-gold-500/10"
                        : "border-gray-600 hover:border-gray-500"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${
                          isSelected
                            ? "border-gold-500 bg-gold-500"
                            : "border-gray-500"
                        }`}
                      >
                        {isSelected && (
                          <svg
                            className="w-4 h-4 text-black"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-white mb-1">
                          {candidate.user?.name || "Unknown"}
                        </h3>
                        <p className="text-sm text-gray-400 mb-2">
                          {candidate.user?.email}
                        </p>
                        <div className="text-sm text-gray-300">
                          <div>
                            <span className="text-gray-400">Organization: </span>
                            {candidate.organization?.name}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* OTP Section */}
        {otpSent && (
          <div className="p-6 border-t border-gray-700 bg-gray-700/50">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Enter OTP sent to your email
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter OTP"
              className="w-full px-4 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              maxLength={6}
            />
            <button
              onClick={handleRequestOTP}
              className="mt-2 text-sm text-gold-500 hover:text-gold-400"
            >
              Resend OTP
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-700 bg-gray-800">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <div className="flex gap-3">
              {!otpSent ? (
                <button
                  onClick={handleRequestOTP}
                  disabled={
                    sendingOtp ||
                    selectedCandidates.length === 0 ||
                    (!isRunoff && selectedCandidates.length > 7)
                  }
                  className="px-6 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {sendingOtp ? "Sending..." : "Request OTP"}
                </button>
              ) : (
                <button
                  onClick={handleSubmitVote}
                  disabled={
                    loading ||
                    selectedCandidates.length === 0 ||
                    (!isRunoff && selectedCandidates.length > 7) ||
                    !otp.trim()
                  }
                  className="px-6 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? "Submitting..." : "Submit Vote"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

