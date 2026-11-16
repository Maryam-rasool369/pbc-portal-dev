"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useAuthStore from "@/store/authStore";
import { getCandidatesByElection, getElectionResults } from "@/services/directorElection";
import { Roles } from "@/enums/Roles";
import { useAbility } from "@/hooks/useAbility";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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
  winnerStatus?: string;
  voteCount?: number;
  _count?: {
    votes: number;
  };
}

export default function TieResolutionPage() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [summary, setSummary] = useState<any>(null);
  const [tiedCandidates, setTiedCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingRunoff, setStartingRunoff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ability = useAbility();
  const isChairman = user?.Role?.name === Roles.CHAIRMAN;

  useEffect(() => {
    if (!id || !token || !ability?.can("update", "DirectorElection")) {
      router.push("/election");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const electionRes = await fetch(`${API_URL}/api/director-elections/${id}`, {
          headers: {
            "Content-Type": "application/json",
            token,
          },
        });
        const electionData = await electionRes.json();
        const election = electionData.data;

        const allCandidates = await getCandidatesByElection(token, Number(id), true);
        
        let voteResults: any = null;
        const voteCountMap = new Map<number, number>();
        
        try {
          voteResults = await getElectionResults(token, Number(id));
          if (voteResults && voteResults.results) {
            if (voteResults.results.winners) {
              voteResults.results.winners.forEach((result: any) => {
                if (result.candidate) {
                  voteCountMap.set(result.candidate.id, result.voteCount);
                }
              });
            }
            if (voteResults.results.runoffCandidates) {
              voteResults.results.runoffCandidates.forEach((result: any) => {
                if (result.candidate) {
                  voteCountMap.set(result.candidate.id, result.voteCount);
                }
              });
            }
            if (voteResults.results.losers) {
              voteResults.results.losers.forEach((result: any) => {
                if (result.candidate) {
                  voteCountMap.set(result.candidate.id, result.voteCount || 0);
                }
              });
            }
          }
        } catch (resultsError: any) {
          console.warn("Failed to fetch election results, using fallback:", resultsError);
        }
        
        const validCandidates = allCandidates.filter((c: any) => c.status !== "REJECTED");
        
        validCandidates.forEach((candidate: any) => {
          if (!voteCountMap.has(candidate.id)) {
            const voteCount = candidate._count?.votes || 0;
            voteCountMap.set(candidate.id, voteCount);
          }
        });

        const candidatesWithVotes = validCandidates.map((candidate: any) => ({
          ...candidate,
          voteCount: voteCountMap.get(candidate.id) || 0,
        }));

        candidatesWithVotes.sort((a: any, b: any) => b.voteCount - a.voteCount);

        const seatsAvailable = election.seatsAvailable || 7;
        let safeWinners: number[] = [];
        let tiedCandidates: number[] = [];
        let remainingSeats = seatsAvailable;

        if (election.status === "TIED") {
          const winnersFromStatus = validCandidates.filter(
            (c: any) => c.winnerStatus === "WON"
          );
          safeWinners = winnersFromStatus.map((c: any) => c.id);
          
          const tiedFromStatus = validCandidates.filter(
            (c: any) => c.winnerStatus === "TIED_RUNOFF"
          );
          tiedCandidates = tiedFromStatus.map((c: any) => c.id);
          remainingSeats = seatsAvailable - safeWinners.length;
        } else {
          if (candidatesWithVotes.length > seatsAvailable) {
            const cutoffIndex = seatsAvailable - 1;
            const cutoffCandidate = candidatesWithVotes[cutoffIndex];
            const cutoffVoteCount = cutoffCandidate.voteCount;
            const nextCandidate = candidatesWithVotes[seatsAvailable];
            
            const hasTie = nextCandidate && nextCandidate.voteCount === cutoffVoteCount;
            
            if (hasTie) {
              safeWinners = candidatesWithVotes
                .filter((c: any) => c.voteCount > cutoffVoteCount)
                .map((c: any) => c.id);
              tiedCandidates = candidatesWithVotes
                .filter((c: any) => c.voteCount === cutoffVoteCount)
                .map((c: any) => c.id);
              remainingSeats = seatsAvailable - safeWinners.length;
            }
          }
        }

        setSummary({
          safeWinners,
          tiedCandidates,
          remainingSeats,
          seatsAvailable,
          candidates: candidatesWithVotes,
        });

        const tied = allCandidates.filter(
          (c: any) => tiedCandidates.includes(c.id)
        );
        setTiedCandidates(tied);
      } catch (err: any) {
        setError(err?.message || "Failed to fetch tie resolution data.");
        toast.error(err?.message || "Failed to fetch tie resolution data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, token, ability, router]);

  const handleStartRunoff = async () => {
    if (!token || !id) return;

    if (!confirm("Are you sure you want to start runoff voting? This will allow voting for the tied candidates only.")) {
      return;
    }

    try {
      setStartingRunoff(true);
      
    
      toast.success("Redirecting to runoff voting...");
      router.push(`/election/director/${id}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to start runoff voting.");
    } finally {
      setStartingRunoff(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 border border-red-500/30 rounded-lg p-6">
            <h2 className="text-xl font-bold text-red-500 mb-2">Error</h2>
            <p className="text-gray-300">{error || "Failed to load tie resolution data"}</p>
            <button
              onClick={() => router.push(`/election/director/${id}`)}
              className="mt-4 px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
            >
              Back to Election
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { safeWinners, tiedCandidates: tiedCandidateIds, remainingSeats, seatsAvailable } = summary;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/election/director/${id}`)}
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
            Back to Election
          </button>
          <h1 className="text-3xl font-bold text-amber-400">Tie Resolution</h1>
          <p className="text-gray-300 mt-2">
            A tie has been detected. Start runoff voting for the tied candidates.
          </p>
        </div>

        <div className="bg-gray-800 border border-amber-500/30 rounded-lg p-6 mb-6 bg-amber-500/10">
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
                  <span className="text-emerald-400 font-semibold">{safeWinners.length} candidate(s)</span>
                )}
                {safeWinners.length > 0 && " have been confirmed as winners. "}
                You need to start a runoff election for the tied candidates to determine the remaining winners.
              </p>
            </div>
          </div>
        </div>

        {safeWinners.length > 0 && (
          <div className="bg-gray-800 border border-emerald-500/30 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-emerald-400 mb-4">
              Confirmed Winners ({safeWinners.length})
            </h3>
            <p className="text-gray-300 mb-4">
              These candidates have secured their positions and will be on the board.
            </p>
            <div className="space-y-2">
              {summary.candidates
                .filter((c: Candidate) => safeWinners.includes(c.id))
                .map((candidate: Candidate) => (
                  <div
                    key={candidate.id}
                    className="bg-gray-700 border border-emerald-500 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-medium">{candidate.user?.name}</h4>
                          <span className="px-2 py-1 bg-emerald-500 text-white text-xs rounded font-bold">
                            🏆 Winner
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{candidate.organization?.name}</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="bg-gray-800 border border-amber-500/30 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-amber-400 mb-4">
            Tied Candidates ({tiedCandidates.length})
          </h3>
          <p className="text-gray-300 mb-4">
            These candidates are tied and need a runoff election to determine the winner(s) for {remainingSeats} remaining seat(s).
          </p>
          <div className="space-y-3">
            {tiedCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className="bg-gray-700 border-2 border-amber-500 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium text-white">
                      {candidate.user?.name || "Unknown"}
                    </h4>
                    <p className="text-sm text-gray-400">
                      {candidate.organization?.name}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {candidate.user?.email}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="px-3 py-1 bg-amber-500 text-black text-sm rounded font-medium">
                      Tied
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => router.push(`/election/director/${id}`)}
            className="px-6 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStartRunoff}
            disabled={startingRunoff || tiedCandidates.length === 0}
            className="px-6 py-2 bg-amber-500 text-black rounded-md hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {startingRunoff ? "Starting Runoff..." : "Start Runoff Voting"}
          </button>
        </div>
      </div>
    </div>
  );
}

