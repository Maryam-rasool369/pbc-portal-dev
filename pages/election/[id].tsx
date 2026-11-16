"use client";

import useAuthStore from "@/store/authStore";
import Can from "@/components/rbac/Can";
import HtmlDiff from "@/components/elections/HtmlDiff";
import "react-toastify/dist/ReactToastify.css";
import { Key, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { fetchElectionById, castVote } from "@/services/election";
import {
  ElectionType,
  PolicyType,
  type Election,
  type VotePayload,
} from "@/types/election";
import { formatDateAndTime } from "@/utils/formatDateAndTime";

interface Candidate {
  id: string;
  name: string;
}

export default function ElectionDetail() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);

  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(
    null,
  );
  const [policyVote, setPolicyVote] = useState<"UPVOTE" | "DOWNVOTE" | null>(
    null,
  );
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedPollOption, setSelectedPollOption] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!id || !token) return;

    const fetchElection = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchElectionById(token, id);
        setElection(data);
        setHasVoted(data.hasVoted || false);

        const now = new Date();
        const endDate = new Date(data.endDate);
        if (now > endDate) {
          router.push(`/election/results/${id}`);
          return;
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch election details",
        );
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to fetch election details",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchElection();
  }, [id, token, router]);

  const handleVoteSubmit = async () => {
    if (!election || !token || !id) return;

    // Validate vote selection
    if (
      (election.type === ElectionType.CANDIDATE_ELECTION &&
        !selectedCandidate) ||
      (election.type === ElectionType.POLICY_ELECTION && !policyVote) ||
      (election.type === ElectionType.POLLING_ELECTION && !selectedPollOption)
    ) {
      toast.error("Please make a selection");
      return;
    }

    setSubmitting(true);
    try {
      const payload: VotePayload = {
        electionId: id.toString(),
        vote:
          election.type === ElectionType.POLLING_ELECTION
            ? selectedPollOption!
            : election.type === ElectionType.CANDIDATE_ELECTION
              ? selectedCandidate!
              : policyVote!,
      };

      await castVote(token, payload);
      toast.success("Your vote has been cast successfully!");
      setHasVoted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cast vote");
    } finally {
      setSubmitting(false);
    }
  };

  const getElectionStatus = () => {
    if (!election) return "Unknown";

    const now = new Date();
    const startDate = new Date(election.startDate);
    const endDate = new Date(election.endDate);

    if (now < startDate) {
      return "Upcoming";
    } else if (now > endDate) {
      return "Ended";
    } else {
      return "Active";
    }
  };

  const getStatusBadgeClass = () => {
    const status = getElectionStatus();
    switch (status) {
      case "Upcoming":
        return "bg-amber-500 text-black";
      case "Active":
        return "bg-emerald-500 text-black";
      case "Ended":
        return "bg-gray-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const renderCandidateVoting = () => {
    if (!election || !election.candidates) return null;

    return (
      <div className="mt-6 space-y-4">
        <h3 className="text-xl font-medium text-gold-500">
          Select a Candidate
        </h3>
        <div className="space-y-3">
          {election.candidates.map((candidate: Candidate) => (
            <div
              key={candidate.id}
              onClick={() =>
                !hasVoted && setSelectedCandidate(candidate.id.toString())
              }
              className={`p-4 rounded-md cursor-pointer transition-all ${
                hasVoted
                  ? "bg-gray-800 border border-gray-700"
                  : selectedCandidate === candidate.id.toString()
                    ? "bg-gold-500/20 border border-gold-500"
                    : "bg-gray-800 border border-gray-700 hover:bg-gray-700"
              } ${hasVoted ? "cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  checked={selectedCandidate === candidate.id.toString()}
                  onChange={() => {}}
                  disabled={hasVoted}
                  className="mr-3 h-4 w-4 accent-gold-500"
                />
                <div>
                  <h4 className="font-medium text-white">{candidate.name}</h4>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPolicyVoting = () => {
    const policy = election?.policy;

    return (
      <div className="mt-6 space-y-4">
        <div className="bg-gray-800 border border-gray-700 rounded-md p-4">
          <h3 className="text-xl font-medium text-gold-500">{policy?.title}</h3>
          {policy?.type === PolicyType.CONSTITUTION ? (
            <div className="p-4 rounded-md mt-2">
              <HtmlDiff
                previous={policy?.article?.content || ""}
                current={policy?.description || ""}
              />
            </div>
          ) : (
            <p
              className="text-gray-300 mt-2"
              dangerouslySetInnerHTML={{
                __html: policy?.description || "",
              }}
            />
          )}
        </div>
        <Can I="approve" a="Election">
        <h3 className="text-xl font-medium text-gold-500">Cast Your Vote</h3>
        <div className="flex space-x-4">
          <button
            onClick={() => !hasVoted && setPolicyVote("UPVOTE")}
            disabled={hasVoted}
            className={`px-6 py-3 rounded-md flex-1 ${
              hasVoted
                ? "bg-gray-800 border border-gray-700 cursor-not-allowed"
                : policyVote === "UPVOTE"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white"
            }`}
          >
            UPVOTE
          </button>
          <button
            onClick={() => !hasVoted && setPolicyVote("DOWNVOTE")}
            disabled={hasVoted}
            className={`px-6 py-3 rounded-md flex-1 ${
              hasVoted
                ? "bg-gray-800 border border-gray-700 cursor-not-allowed"
                : policyVote === "DOWNVOTE"
                  ? "bg-red-600 text-white"
                  : "bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white"
            }`}
          >
            DOWNVOTE
          </button>
        </div>
        </Can>
      </div>
    );
  };

  const renderPollVoting = () => {
    if (!election?.pollOptions) return null;

    return (
      <div className="mt-6 space-y-4">
        <h3 className="text-xl font-medium text-gold-500">Select an Option</h3>
        <div className="space-y-3">
          {election.pollOptions.map((option: string, index: Key) => (
            <div
              key={index}
              onClick={() => !hasVoted && setSelectedPollOption(option)}
              className={`p-4 rounded-md cursor-pointer transition-all ${
                hasVoted
                  ? "bg-gray-800 border border-gray-700"
                  : selectedPollOption === option
                    ? "bg-gold-500/20 border border-gold-500"
                    : "bg-gray-800 border border-gray-700 hover:bg-gray-700"
              } ${hasVoted ? "cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-center">
                <input
                  type="radio"
                  checked={selectedPollOption === option}
                  onChange={() => {}}
                  disabled={hasVoted}
                  className="mr-3 h-4 w-4 accent-gold-500"
                />
                <div className="text-white">{option}</div>
              </div>
            </div>
          ))}
        </div>
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

  if (!election) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gold-500 mb-2">
          Election Not Found
        </h2>
        <p className="text-gray-300 text-center">
          The election you&apos;re looking for doesn&apos;t exist or you
          don&apos;t have permission to view it.
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

  const electionStatus = getElectionStatus();
  const isActive = electionStatus === "Active";
  const isUpcoming = electionStatus === "Upcoming";

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="mx-auto">
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
              <p className="text-gray-300 mt-2">{election.description}</p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass()}`}
            >
              {electionStatus}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-700 pt-6">
            <div>
              <h3 className="text-lg font-medium text-gray-300">
                Election Details
              </h3>
              <div className="mt-3 space-y-2">
                <div className="flex items-start">
                  <span className="text-gray-400 w-24">Type:</span>
                  <span className="text-white">
                    {election.type === ElectionType.CANDIDATE_ELECTION &&
                      "Candidate Election"}
                    {election.type === ElectionType.POLICY_ELECTION &&
                      "Policy Election"}
                    {election.type === ElectionType.POLLING_ELECTION &&
                      "Polling Election"}
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-400 w-24">Start Date:</span>
                  <span className="text-white">
                    {formatDateAndTime(election.startDate, true, true)}
                  </span>
                </div>
                <div className="flex items-start">
                  <span className="text-gray-400 w-24">End Date:</span>
                  <span className="text-white">
                    {formatDateAndTime(election.endDate, true, true)}
                  </span>
                </div>
                {election.type === ElectionType.POLICY_ELECTION &&
                  election.policies &&
                  election.policies[0] && (
                    <div className="flex items-start">
                      <span className="text-gray-400 w-24">Policy:</span>
                      <span className="text-white">
                        {election.policies[0].title}
                      </span>
                    </div>
                  )}
                {election.type === ElectionType.CANDIDATE_ELECTION &&
                  election.candidates && (
                    <div className="flex items-start">
                      <span className="text-gray-400 w-24">Candidates:</span>
                      <span className="text-white">
                        {election.candidates
                          .map((c: Candidate) => c.name)
                          .join(", ")}
                      </span>
                    </div>
                  )}
                {election.type === ElectionType.POLLING_ELECTION &&
                  election.pollOptions && (
                    <div className="flex items-start">
                      <span className="text-gray-400 mb-2">Poll Options:</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-3">
                        {election.pollOptions.map((option, index) => (
                          <div
                            key={index}
                            className="flex items-center text-white"
                          >
                            <div className="h-2 w-2 rounded-full bg-gold-500 mr-2"></div>
                            <span>{option}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            <div className="bg-gray-900 rounded-md p-4 border border-gray-700">
              <h3 className="text-lg font-medium text-gold-500 mb-3">
                Election Status
              </h3>
              {isUpcoming && (
                <div className="text-gray-300">
                  <p>This election has not started yet.</p>
                  <p className="mt-2">
                    Election will begin on{" "}
                    {formatDateAndTime(election.startDate, true, true)}.
                  </p>
                </div>
              )}

              {isActive && !hasVoted && (
                <div className="text-gray-300">
                  <p>This election is currently active.</p>
                  <p className="mt-2">
                    Cast your vote before{" "}
                    {formatDateAndTime(election.endDate, true, true)}.
                  </p>
                </div>
              )}

              {isActive && hasVoted && (
                <div className="text-emerald-500">
                  <p>You have successfully cast your vote.</p>
                  <p>
                    Your vote will be counted towards the election results. Wait
                    for the election to end to see the results.
                  </p>
                </div>
              )}
            </div>
          </div>

          {!election.hasVoted &&
            isActive &&
            !hasVoted &&
            election.endDate > new Date().toISOString() && (
              <>
                {election.type === ElectionType.CANDIDATE_ELECTION
                  ? renderCandidateVoting()
                  : election.type === ElectionType.POLICY_ELECTION
                    ? renderPolicyVoting()
                    : renderPollVoting()}
                <Can I="approve" a="Election">
                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={handleVoteSubmit}
                      disabled={submitting || hasVoted}
                      className={`px-6 py-3 rounded-md ${
                        submitting
                          ? "bg-gray-700 text-gray-300 cursor-not-allowed"
                          : "bg-gold-500 text-black hover:bg-gold-600"
                      }`}
                    >
                      {submitting ? (
                        <span className="flex items-center">
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
                          Submitting...
                        </span>
                      ) : hasVoted ? (
                        "Vote already casted"
                      ) : (
                        "Cast Vote"
                      )}
                    </button>
                  </div>
                </Can>
              </>
            )}

          {isUpcoming && (
            <div className="mt-6 p-4 bg-gray-800 border border-gray-700 rounded-md text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto text-gold-500 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-xl font-medium text-gold-500">
                Election Not Started Yet
              </h3>
              <p className="text-gray-300 mt-2">
                This election will begin on{" "}
                {formatDateAndTime(election.startDate, true, true)}. Please
                check back then to cast your vote.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
