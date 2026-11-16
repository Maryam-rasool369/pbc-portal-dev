"use client";

import { useState } from "react";

interface Candidate {
  id: number;
  user: {
    name: string;
    email: string;
  };
  organization: {
    name: string;
  };
  voteCount: number;
}

interface VotingSummaryModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  summary: {
    candidates: Candidate[];
    totalVotes: number;
    seatsAvailable: number;
    hasTie: boolean;
    safeWinners: number[];
    tiedCandidates: number[];
    remainingSeats: number;
  };
  loading?: boolean;
}

export default function VotingSummaryModal({
  open,
  onClose,
  onConfirm,
  summary,
  loading = false,
}: VotingSummaryModalProps) {
  if (!open) return null;

  const { candidates, totalVotes, seatsAvailable, hasTie, safeWinners, tiedCandidates, remainingSeats } = summary;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="bg-gray-800 border border-gold-500/30 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gold-500">Voting Summary</h2>
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
            Review the voting results before ending the election.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="p-6 border-b border-gray-700 bg-gray-700/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400">Total Votes</div>
              <div className="text-2xl font-bold text-white">{totalVotes}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400">Seats Available</div>
              <div className="text-2xl font-bold text-gold-500">{seatsAvailable}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-sm text-gray-400">Candidates</div>
              <div className="text-2xl font-bold text-white">{candidates.length}</div>
            </div>
          </div>
        </div>

        {/* Tie Warning */}
        {hasTie && (
          <div className="p-6 border-b border-amber-500/30 bg-amber-500/10">
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5"
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
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-400 mb-2">Tie Detected!</h3>
                <p className="text-gray-300 mb-2">
                  There is a tie between {tiedCandidates.length} candidate(s) for {remainingSeats} remaining seat(s).
                </p>
                <p className="text-gray-300">
                  {safeWinners.length > 0 && (
                    <span>{safeWinners.length} candidate(s) have been confirmed as winners. </span>
                  )}
                  A runoff election will be required for the tied candidates.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Candidates List */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            Candidates Ranked by Votes
          </h3>
          <div className="space-y-3">
            {candidates.map((candidate, index) => {
              const isWinner = index < seatsAvailable && !hasTie;
              const isSafeWinner = safeWinners.includes(candidate.id);
              const isTied = tiedCandidates.includes(candidate.id);
              
              return (
                <div
                  key={candidate.id}
                  className={`bg-gray-700 border-2 rounded-lg p-4 ${
                    isSafeWinner
                      ? "border-emerald-500 bg-emerald-500/10"
                      : isTied
                      ? "border-amber-500 bg-amber-500/10"
                      : isWinner
                      ? "border-gold-500 bg-gold-500/10"
                      : "border-gray-600"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold text-gray-400 w-8">
                          #{index + 1}
                        </span>
                        <div>
                          <h4 className="text-lg font-medium text-white">
                            {candidate.user?.name || "Unknown"}
                          </h4>
                          <p className="text-sm text-gray-400">
                            {candidate.organization?.name}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gold-500">
                        {candidate.voteCount}
                      </div>
                      <div className="text-xs text-gray-400">votes</div>
                      {isSafeWinner && (
                        <div className="mt-2 px-2 py-1 bg-emerald-500 text-white text-xs rounded">
                          Winner
                        </div>
                      )}
                      {isTied && (
                        <div className="mt-2 px-2 py-1 bg-amber-500 text-black text-xs rounded">
                          Tied
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-800">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="px-6 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? "Ending Election..." : "End Election"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

