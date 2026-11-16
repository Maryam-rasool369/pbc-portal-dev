"use client";

import { Key, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { fetchElectionById, fetchElectionResult } from "@/services/election";
import { ElectionState, ElectionType, type Election } from "@/types/election";
import useAuthStore from "@/store/authStore";

export default function ElectionResults() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);

  const [election, setElection] = useState<Election | null>(null);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !token) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const electionData = await fetchElectionById(token, id);
        setElection(electionData);

        const resultsResponse = await fetchElectionResult(token, id);
        setResults(resultsResponse.data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch election results"
        );
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to fetch election results"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, token]);

  const renderCandidateResults = () => {
    if (!results || !results.candidates) return null;

    const sortedCandidates = [...results.candidates].sort(
      (a, b) => (b.votes || 0) - (a.votes || 0)
    );
    const totalVotes = results.totalVotes || 0;
    const winnerId = results.winnerId || sortedCandidates[0]?.id;

    return (
      <div className="space-y-6">
        <div className="text-left pt-2">
          <h2 className="text-xl font-bold text-gold-500">
            Election description:
          </h2>
          {election?.description && (
            <p className="text-gray-300 mt-2">{election.description}</p>
          )}
        </div>
        {election?.outcome && (
          <div className="text-left">
            <h2 className="text-xl font-bold text-gold-500">
              Election Outcome:
            </h2>
            <p className="text-gray-300 mt-2">{election.outcome}</p>
          </div>
        )}

        {election?.state === ElectionState.SUCCESSFUL && (
          <div className="space-y-4">
            <h3 className="text-xl font-medium text-gold-500">Candidates</h3>
            {sortedCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className={`flex items-center p-4 rounded-lg ${
                  candidate.id === winnerId
                    ? "bg-gold-500/20 border-2 border-gold-500"
                    : "bg-gray-800 border border-gold-500/30"
                }`}
              >
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <h4
                      className={`text-lg font-medium ${
                        candidate.id === winnerId
                          ? "text-gold-500"
                          : "text-white"
                      }`}
                    >
                      {candidate.name}
                    </h4>
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      candidate.id === winnerId
                        ? "text-gold-500"
                        : "text-gray-300"
                    }`}
                  >
                    {candidate.id === winnerId ? "🏆" : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderPollingResults = () => {
    if (!results || !results.pollOptions) return null;

    const winningOption = results.winningOption;
    const pollOptions = results.pollOptions;

    return (
      <div className="space-y-6">
        <div className="text-left pt-2">
          <h2 className="text-xl font-bold text-gold-500">
            Election description:
          </h2>
          {election?.description && (
            <p className="text-gray-300 mt-2">{election.description}</p>
          )}
        </div>
        {election?.outcome && (
          <div className="text-left">
            <h2 className="text-xl font-bold text-gold-500">
              Election Outcome:
            </h2>
            <p className="text-gray-300 mt-2">{election.outcome}</p>
          </div>
        )}

        {election?.state === ElectionState.SUCCESSFUL && (
          <div className="space-y-4">
            <h3 className="text-xl font-medium text-gold-500">Poll Options</h3>
            {election?.pollOptions?.map((opt: any, i: Key) => (
              <div
                key={i}
                className={`flex items-center p-4 rounded-lg ${
                  opt === winningOption
                    ? "bg-gold-500/20 border-2 border-gold-500"
                    : "bg-gray-800 border border-gold-500/30"
                }`}
              >
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <h4
                      className={`text-lg font-medium ${
                        opt === winningOption ? "text-gold-500" : "text-white"
                      }`}
                    >
                      {opt}
                    </h4>
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      opt === winningOption ? "text-gold-500" : "text-gray-300"
                    }`}
                  >
                    {opt === winningOption ? "🏆" : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderPolicyResults = () => {
    if (!results) return null;

    return (
      <div className="space-y-6">
        <div className="text-left pt-2">
          <h2 className="text-xl font-bold text-gold-500">
            Election description:
          </h2>
          {election?.description && (
            <p className="text-gray-300 mt-2">{election.description}</p>
          )}
        </div>
        {election?.outcome && (
          <div className="text-left">
            <h2 className="text-xl font-bold text-gold-500">
              Election Outcome:
            </h2>
            <p className="text-gray-300 mt-2">{election.outcome}</p>
          </div>
        )}

        {election?.state === ElectionState.SUCCESSFUL && (
          <div className="bg-gray-800 border border-gold-500/30 rounded-lg p-6">
            <h3 className="text-xl font-medium text-gold-500 mb-4">
              Policy Vote Results
            </h3>

            <div className="flex flex-col md:flex-row gap-6">
              <div
                className={`flex-1 p-4 rounded-lg ${
                  results.policyVotes === "UPVOTE"
                    ? "bg-emerald-500/20 border-2 border-emerald-500"
                    : "bg-gray-800 border border-emerald-500/30"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-medium text-emerald-500">
                    Upvoted
                  </h4>
                  <span className="text-emerald-500 font-bold">
                    {results.policyVotes === "UPVOTE" ? "🏆" : ""}
                  </span>
                </div>
              </div>

              <div
                className={`flex-1 p-4 rounded-lg ${
                  results.policyVotes === "DOWNVOTE"
                    ? "bg-red-500/20 border-2 border-red-500"
                    : "bg-gray-800 border border-red-500/30"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-medium text-red-500">
                    Downvoted
                  </h4>
                  <span className="text-red-500 font-bold">
                    {results.policyVotes === "DOWNVOTE" ? "🏆" : ""}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <div
                className={`inline-block px-6 py-3 rounded-lg ${
                  results.policyVotes === "UPVOTE"
                    ? "bg-emerald-500/20 border border-emerald-500"
                    : "bg-red-500/20 border border-red-500"
                }`}
              >
                <h4
                  className={`text-lg font-medium ${
                    results.policyVotes === "UPVOTE"
                      ? "text-emerald-500"
                      : "text-red-500"
                  }`}
                >
                  Final Result: Policy{" "}
                  {results.policyVotes === "UPVOTE" ? "Approved" : "Rejected"}
                </h4>
              </div>
            </div>
          </div>
        )}

        {election?.policy && (
          <div className="bg-gray-800 border border-gold-500/30 rounded-lg p-6">
            <h3 className="text-xl font-medium text-gold-500 mb-4">
              Policy Details
            </h3>
            <h4 className="text-lg font-medium text-white">
              {election.policy.title}
            </h4>
            <p
              className="text-gray-300 mt-2 prose prose-sm max-w-none prose-headings:text-gray-300 prose-a:text-blue-400 border border-gold-500/30 rounded-md p-4"
              dangerouslySetInnerHTML={{ __html: election.policy.description }}
            ></p>
          </div>
        )}
      </div>
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
          onClick={() => router.push("/election")}
          className="mt-6 px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
        >
          Back to Elections
        </button>
      </div>
    );
  }

  if (!election || !results) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gold-500 mb-2">
          Election Not Found
        </h2>
        <p className="text-gray-300 text-center">
          The election results you&apos;re looking for don&apos;t exist or you
          don&apos;t have permission to view them.
        </p>
        <button
          onClick={() => router.push("/election")}
          className="mt-6 px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
        >
          Back to Elections
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push("/election")}
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
            Back to Elections
          </button>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gold-500">
                {election.title}
              </h1>
            </div>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-500 text-white">
              {new Date(election.endDate) <= new Date() ? "Ended" : "Active"}
            </span>
          </div>

          <div className="border-t border-gray-700 pt-6">
            {election.type === ElectionType.CANDIDATE_ELECTION &&
              renderCandidateResults()}
            {election.type === ElectionType.POLICY_ELECTION &&
              renderPolicyResults()}
            {election.type === ElectionType.POLLING_ELECTION &&
              renderPollingResults()}
          </div>
        </div>
      </div>
    </div>
  );
}
