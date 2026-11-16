"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useAuthStore from "@/store/authStore";
import { getCandidatesByElection, endElection, startElection, getElectionResults } from "@/services/directorElection";
import { Roles } from "@/enums/Roles";
import { useAbility } from "@/hooks/useAbility";
import Can from "@/components/rbac/Can";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

export default function VotingSummaryPage() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [endingElection, setEndingElection] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [electionStatus, setElectionStatus] = useState<string | null>(null);
  const [showEndElectionModal, setShowEndElectionModal] = useState(false);
  const [showEndRunoffModal, setShowEndRunoffModal] = useState(false);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [round1Winners, setRound1Winners] = useState<number[]>([]);
  const [round2PlusWinners, setRound2PlusWinners] = useState<number[]>([]);
  const [roundResults, setRoundResults] = useState<any[]>([]);
  const [finalResults, setFinalResults] = useState<any>(null);
  const [startingElection, setStartingElection] = useState(false);
  const [showStartElectionModal, setShowStartElectionModal] = useState(false);
  const [shortlistedCandidatesCount, setShortlistedCandidatesCount] = useState<number>(0);

  const ability = useAbility();
  const isChairman = user?.Role?.name === Roles.CHAIRMAN;

  useEffect(() => {
    if (!id || !token) {
      router.push("/election");
      return;
    }

    const fetchSummary = async () => {
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
        setElectionStatus(election.status);
        const electionRound = election.currentRound || 1;
        setCurrentRound(electionRound);

        const seatsAvailable = election.seatsAvailable || 7;
        const isOngoing = election.status === "ONGOING";
        let candidatesWithVotes: any[] = [];
        let hasTie = false;
        let safeWinners: number[] = [];
        let tiedCandidates: number[] = [];
        let remainingSeats = seatsAvailable;

        // Get candidates to count shortlisted ones
        const allCandidates = await getCandidatesByElection(token, Number(id), true);
        const shortlistedCandidates = allCandidates.filter(
          (c: any) => c.status === "APPROVED" && c.feePaid
        );
        setShortlistedCandidatesCount(shortlistedCandidates.length);

        if (isOngoing) {
          // Filter to only show approved candidates
          const approvedCandidates = allCandidates.filter((c: any) => c.status === "APPROVED");
          
          candidatesWithVotes = approvedCandidates.map((candidate: any) => ({
            ...candidate,
            voteCount: candidate._count?.votes || 0,
          }));

          candidatesWithVotes.sort((a: any, b: any) => b.voteCount - a.voteCount);
        } else {
          // Filter to only show approved candidates
          const approvedCandidates = allCandidates.filter((c: any) => c.status === "APPROVED");
          
          // Try to get election results, but handle errors gracefully
          let voteResults: any = null;
          try {
            voteResults = await getElectionResults(token, Number(id));
            // Store round-by-round results if available
            if (voteResults?.data?.roundByRoundResults) {
              setRoundResults(voteResults.data.roundByRoundResults);
            }
            if (voteResults?.data?.finalResults) {
              setFinalResults(voteResults.data.finalResults);
            }
          } catch (resultsError: any) {
            console.warn("Failed to fetch election results, using fallback:", resultsError);
            // Continue with fallback - we'll use candidates data directly
          }
          
          const voteCountMap = new Map<number, number>();
          
          // For COMPLETED elections, prioritize getting ALL winners from ALL rounds
          // This ensures we show winners from Round 1, Round 2, etc., not just the current round
          if (election.status === "COMPLETED") {
            // Get all candidates with winnerStatus = "WON" (winners from all rounds)
            const allWinnersFromAllRounds = approvedCandidates.filter(
              (c: any) => c.winnerStatus === "WON"
            );
            if (allWinnersFromAllRounds.length > 0) {
              // Use all winners from all rounds, not just from API results
              safeWinners = allWinnersFromAllRounds.map((c: any) => c.id);
              
              // Update vote counts for all winners from all rounds
              allWinnersFromAllRounds.forEach((winner: any) => {
                voteCountMap.set(winner.id, winner._count?.votes || 0);
              });
            }
            
            // Also ensure we have vote counts for all approved candidates
            approvedCandidates.forEach((candidate: any) => {
              if (!voteCountMap.has(candidate.id)) {
                const voteCount = candidate._count?.votes || 0;
                voteCountMap.set(candidate.id, voteCount);
              }
            });
          }
          
          // If we got results from API, use them for vote counts and other data
          // But for COMPLETED elections, we've already set winners above
          const approvedCandidateIds = new Set(approvedCandidates.map((c: any) => c.id));
          
          if (voteResults && voteResults.results) {
            if (voteResults.results.winners) {
              voteResults.results.winners.forEach((result: any) => {
                if (result.candidate && approvedCandidateIds.has(result.candidate.id)) {
                  // Update vote counts from API (might have more accurate counts)
                  voteCountMap.set(result.candidate.id, result.voteCount);
                  // Only add to safeWinners if not already added (for non-COMPLETED elections)
                  if (election.status !== "COMPLETED" && !safeWinners.includes(result.candidate.id)) {
                    safeWinners.push(result.candidate.id);
                  }
                }
              });
            }
            
            if (voteResults.results.runoffCandidates) {
              voteResults.results.runoffCandidates.forEach((result: any) => {
                if (result.candidate && approvedCandidateIds.has(result.candidate.id)) {
                  voteCountMap.set(result.candidate.id, result.voteCount);
                  tiedCandidates.push(result.candidate.id);
                }
              });
              hasTie = tiedCandidates.length > 0;
              remainingSeats = seatsAvailable - safeWinners.length;
            }
            
            // Losers
            if (voteResults.results.losers) {
              voteResults.results.losers.forEach((result: any) => {
                if (result.candidate && approvedCandidateIds.has(result.candidate.id)) {
                  voteCountMap.set(result.candidate.id, result.voteCount || 0);
                }
              });
            }
          }
          
          // Fallback: If API results failed, get vote counts from approved candidates
          if (!voteResults || !voteResults.results) {
            approvedCandidates.forEach((candidate: any) => {
              if (!voteCountMap.has(candidate.id)) {
                const voteCount = candidate._count?.votes || 0;
                voteCountMap.set(candidate.id, voteCount);
              }
            });
          }

          candidatesWithVotes = approvedCandidates.map((candidate: any) => ({
            ...candidate,
            voteCount: voteCountMap.get(candidate.id) || 0,
          }));

          candidatesWithVotes.sort((a: any, b: any) => b.voteCount - a.voteCount);
          
         
          if (!voteResults || !voteResults.results || (!hasTie && election.status === "TIED")) {
            const tiedFromCandidates = approvedCandidates.filter(
              (c: any) => c.winnerStatus === "TIED_RUNOFF"
            );
            if (tiedFromCandidates.length > 0) {
              hasTie = true;
              tiedCandidates = tiedFromCandidates.map((c: any) => c.id);
              const winnersFromStatus = approvedCandidates.filter(
                (c: any) => c.winnerStatus === "WON"
              );
              if (winnersFromStatus.length > 0) {
                safeWinners = winnersFromStatus.map((c: any) => c.id);
              }
              remainingSeats = seatsAvailable - safeWinners.length;
            }

          }
          
          
          if (election.status === "COMPLETED" && !hasTie && safeWinners.length === 0) {
            const topCandidates = candidatesWithVotes
              .filter((c: any) => c.voteCount > 0) // Only candidates with votes
              .slice(0, seatsAvailable);
            
            safeWinners = topCandidates.map((c: any) => c.id);
          }
          
         
          if (election.status === "COMPLETED") {
            const allWinnersFromAllRounds = approvedCandidates.filter(
              (c: any) => c.winnerStatus === "WON"
            );
            if (allWinnersFromAllRounds.length > 0) {
              safeWinners = allWinnersFromAllRounds.map((c: any) => c.id);
              
              allWinnersFromAllRounds.forEach((winner: any) => {
                if (!voteCountMap.has(winner.id)) {
                  voteCountMap.set(winner.id, winner._count?.votes || 0);
                }
              });
            }
          }
        }

        const runoffVotingStarted = election.status === "TIED" && tiedCandidates.length > 0 && 
          candidatesWithVotes.some((c: any) => 
            tiedCandidates.includes(c.id) && (c.voteCount || 0) > 0
          );

        setSummary({
          candidates: candidatesWithVotes,
          totalVotes: candidatesWithVotes.reduce((sum: number, c: any) => sum + c.voteCount, 0),
          seatsAvailable,
          hasTie,
          safeWinners,
          tiedCandidates,
          remainingSeats,
          runoffVotingStarted,
        });
      } catch (err: any) {
        setError(err?.message || "Failed to fetch voting summary.");
        toast.error(err?.message || "Failed to fetch voting summary.");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [id, token, ability, router]);

  const handleStartElection = () => {
    if (!token || !id) return;
    setShowStartElectionModal(true);
  };

  const confirmStartElection = async () => {
    if (!token || !id) return;

    try {
      setStartingElection(true);
      await startElection(token, Number(id));
      toast.success("Election started successfully!");
      
      // Refresh election data
      const res = await fetch(`${API_URL}/api/director-elections/${id}`, {
        headers: {
          "Content-Type": "application/json",
          token,
        },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setElectionStatus(data.data.status);
        setCurrentRound(data.data.currentRound || 1);
      }
      setShowStartElectionModal(false);
      // Reload the page to refresh all data
      window.location.reload();
    } catch (error: any) {
      toast.error(error?.message || "Failed to start election.");
    } finally {
      setStartingElection(false);
    }
  };

  const handleEndElection = () => {
    if (!token || !id) return;
    setShowEndElectionModal(true);
  };

  const handleEndRunoffVoting = () => {
    if (!token || !id) return;
    setShowEndRunoffModal(true);
  };

  const confirmEndRunoffVoting = async () => {
    if (!token || !id) return;

    try {
      setEndingElection(true);
      const result = await endElection(token, Number(id), "COMPLETED");
      
      setElectionStatus(result.status);
      setCurrentRound(result.currentRound || 1);
      toast.success("Runoff voting ended successfully! Results are being processed.");
      setShowEndRunoffModal(false);
      window.location.reload();
    } catch (error: any) {
      toast.error(error?.message || "Failed to end runoff voting.");
    } finally {
      setEndingElection(false);
    }
  };

  const confirmEndElection = async () => {
    if (!token || !id) return;

    try {
      setEndingElection(true);
      let preEndVoteCounts = new Map<number, number>();
      try {
        const candidatesBeforeEnd = await getCandidatesByElection(token, Number(id), true);
        const approvedCandidatesBeforeEnd = candidatesBeforeEnd.filter((c: any) => c.status === "APPROVED");
        approvedCandidatesBeforeEnd.forEach((candidate: any) => {
          preEndVoteCounts.set(candidate.id, candidate._count?.votes || 0);
        });
      } catch (err) {
        console.error("Failed to fetch pre-end vote counts:", err);
      }
      
      const result = await endElection(token, Number(id), "COMPLETED");
      
      setElectionStatus(result.status);
      setCurrentRound(result.currentRound || 1);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        let voteResults = null;
        let lastError = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            if (attempt > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
            voteResults = await getElectionResults(token, Number(id));
            break;
          } catch (err: any) {
            lastError = err;
            console.log(`Attempt ${attempt + 1} failed to fetch results:`, err);
          }
        }
        
        if (!voteResults) {
          throw lastError || new Error("Failed to fetch election results after retries");
        }
        const candidates = await getCandidatesByElection(token, Number(id), true);
        // Filter to only show approved candidates
        const approvedCandidates = candidates.filter((c: any) => c.status === "APPROVED");
        const seatsAvailable = result.seatsAvailable || 7;
        
        let safeWinners: number[] = [];
        let tiedCandidates: number[] = [];
        let hasTie = false;
        let remainingSeats = seatsAvailable;
        
        const voteCountMap = new Map<number, number>();
        const isTiedElection = result.status === "TIED";
        const isCompletedElection = result.status === "COMPLETED";
        const approvedCandidateIds = new Set(approvedCandidates.map((c: any) => c.id));
        
        if (voteResults.results) {
          if (voteResults.results.winners) {
            voteResults.results.winners.forEach((resultItem: any) => {
              if (resultItem.candidate && approvedCandidateIds.has(resultItem.candidate.id)) {
                const voteCount = isTiedElection && preEndVoteCounts.has(resultItem.candidate.id)
                  ? preEndVoteCounts.get(resultItem.candidate.id)!
                  : (resultItem.voteCount || 0);
                voteCountMap.set(resultItem.candidate.id, voteCount);
                safeWinners.push(resultItem.candidate.id);
              }
            });
          }
          
          if (voteResults.results.runoffCandidates) {
            voteResults.results.runoffCandidates.forEach((resultItem: any) => {
              if (resultItem.candidate && approvedCandidateIds.has(resultItem.candidate.id)) {
                const voteCount = isTiedElection && preEndVoteCounts.has(resultItem.candidate.id)
                  ? preEndVoteCounts.get(resultItem.candidate.id)!
                  : (resultItem.voteCount || 0);
                voteCountMap.set(resultItem.candidate.id, voteCount);
                tiedCandidates.push(resultItem.candidate.id);
              }
            });
            hasTie = tiedCandidates.length > 0;
            remainingSeats = seatsAvailable - safeWinners.length;
          }
          
          if (voteResults.results.losers) {
            voteResults.results.losers.forEach((resultItem: any) => {
              if (resultItem.candidate && approvedCandidateIds.has(resultItem.candidate.id)) {
                  const voteCount = isTiedElection && preEndVoteCounts.has(resultItem.candidate.id)
                  ? preEndVoteCounts.get(resultItem.candidate.id)!
                  : (resultItem.voteCount || 0);
                voteCountMap.set(resultItem.candidate.id, voteCount);
              }
            });
          }
        }
        
        if (isCompletedElection && voteCountMap.size === 0) {
          approvedCandidates.forEach((candidate: any) => {
            const voteCount = candidate._count?.votes || 0;
            if (voteCount > 0) {
              voteCountMap.set(candidate.id, voteCount);
            }
          });
        }
        
        if (isTiedElection && preEndVoteCounts.size > 0) {
          preEndVoteCounts.forEach((count, candidateId) => {
            if (!voteCountMap.has(candidateId)) {
              voteCountMap.set(candidateId, count);
            }
          });
        }

        const candidatesWithVotes = approvedCandidates.map((candidate: any) => ({
          ...candidate,
          voteCount: voteCountMap.get(candidate.id) || 0,
        }));

        candidatesWithVotes.sort((a: any, b: any) => b.voteCount - a.voteCount);

        if (isCompletedElection && !hasTie) {
          const allWinnersFromAllRounds = approvedCandidates.filter(
            (c: any) => c.winnerStatus === "WON"
          );
          if (allWinnersFromAllRounds.length > 0) {
            safeWinners = allWinnersFromAllRounds.map((c: any) => c.id);
            
            allWinnersFromAllRounds.forEach((winner: any) => {
              if (!voteCountMap.has(winner.id)) {
                voteCountMap.set(winner.id, winner._count?.votes || 0);
              }
            });
          } else {
            const topCandidates = candidatesWithVotes
              .filter((c: any) => c.voteCount > 0)
              .slice(0, seatsAvailable);
            safeWinners = topCandidates.map((c: any) => c.id);
          }
        }

        const runoffVotingStarted = result.status === "TIED" && tiedCandidates.length > 0 && 
          candidatesWithVotes.some((c: any) => 
            tiedCandidates.includes(c.id) && (c.voteCount || 0) > 0
          );

        setSummary({
          candidates: candidatesWithVotes,
          totalVotes: candidatesWithVotes.reduce((sum: number, c: any) => sum + c.voteCount, 0),
          seatsAvailable,
          hasTie,
          safeWinners,
          tiedCandidates,
          remainingSeats,
          runoffVotingStarted,
        });

        if (result.status === "TIED") {
          toast.success("Election ended with a tie. Review the results below and start the runoff election.");
        } else {
          toast.success("Election ended successfully! Results updated.");
        }
      } catch (resultsError: any) {
        console.error("Failed to fetch results after ending election:", resultsError);
        
        try {
          const candidates = await getCandidatesByElection(token, Number(id), true);
          // Filter to only show approved candidates
          const approvedCandidates = candidates.filter((c: any) => c.status === "APPROVED");
          const seatsAvailable = result.seatsAvailable || 7;
          
            const voteCountMap = new Map<number, number>();
          approvedCandidates.forEach((candidate: any) => {
            const voteCount = preEndVoteCounts.has(candidate.id)
              ? preEndVoteCounts.get(candidate.id)!
              : (candidate._count?.votes || 0);
            voteCountMap.set(candidate.id, voteCount);
          });
          
          const candidatesWithVotes = approvedCandidates.map((candidate: any) => ({
            ...candidate,
            voteCount: voteCountMap.get(candidate.id) || 0,
          }));
          
          candidatesWithVotes.sort((a: any, b: any) => b.voteCount - a.voteCount);
          
          let safeWinners: number[] = [];
          let tiedCandidates: number[] = [];
          let hasTie = false;
          let remainingSeats = seatsAvailable;
          
          if (result.status === "COMPLETED") {
            const allWinnersFromAllRounds = approvedCandidates.filter(
              (c: any) => c.winnerStatus === "WON"
            );
            if (allWinnersFromAllRounds.length > 0) {
              safeWinners = allWinnersFromAllRounds.map((c: any) => c.id);
              
              allWinnersFromAllRounds.forEach((winner: any) => {
                if (!voteCountMap.has(winner.id)) {
                  voteCountMap.set(winner.id, winner._count?.votes || 0);
                }
              });
            } else {
              const topCandidates = candidatesWithVotes
                .filter((c: any) => c.voteCount > 0)
                .slice(0, seatsAvailable);
              safeWinners = topCandidates.map((c: any) => c.id);
            }
          } else if (result.status === "TIED") {
            const winnersFromStatus = approvedCandidates.filter(
              (c: any) => c.winnerStatus === "WON"
            );
            const tiedFromStatus = approvedCandidates.filter(
              (c: any) => c.winnerStatus === "TIED_RUNOFF"
            );
            
            safeWinners = winnersFromStatus.map((c: any) => c.id);
            tiedCandidates = tiedFromStatus.map((c: any) => c.id);
            hasTie = tiedCandidates.length > 0;
            remainingSeats = seatsAvailable - safeWinners.length;
          }
          
          const runoffVotingStarted = result.status === "TIED" && tiedCandidates.length > 0 && 
            candidatesWithVotes.some((c: any) => 
              tiedCandidates.includes(c.id) && (c.voteCount || 0) > 0
            );
          
          setSummary({
            candidates: candidatesWithVotes,
            totalVotes: candidatesWithVotes.reduce((sum: number, c: any) => sum + c.voteCount, 0),
            seatsAvailable,
            hasTie,
            safeWinners,
            tiedCandidates,
            remainingSeats,
            runoffVotingStarted,
          });
          
          if (result.status === "TIED") {
            toast.success("Election ended with a tie. Review the results below and start the runoff election.");
          } else {
            toast.success("Election ended successfully! Results calculated from vote counts.");
          }
        } catch (fallbackError: any) {
          console.error("Failed to calculate results from fallback:", fallbackError);
          toast.warning("Election ended, but failed to fetch updated results. Please refresh the page.");
        }
      }
      setShowEndElectionModal(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to end election.");
    } finally {
      setEndingElection(false);
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
            <p className="text-gray-300">{error || "Failed to load voting summary"}</p>
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

  const { candidates, totalVotes, seatsAvailable, hasTie, safeWinners, tiedCandidates, remainingSeats, runoffVotingStarted } = summary;

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-gold-500">Voting Summary</h1>
              {currentRound > 1 && (
                <span className="px-4 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-sm font-medium">
                  Round {currentRound}
                </span>
              )}
            </div>
            {/* Start Election Button - Only for UPCOMING elections */}
            <Can I="manage" a="DirectorElection" fallback={null}>
              {electionStatus === "UPCOMING" && (
                <>
                  {shortlistedCandidatesCount >= 8 ? (
                    <button
                      onClick={handleStartElection}
                      disabled={startingElection}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {startingElection ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Starting...
                        </>
                      ) : (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Manually Start Elections
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
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
                      <span className="text-sm">
                        Need {8 - shortlistedCandidatesCount} more candidate(s) to start
                      </span>
                    </div>
                  )}
                </>
              )}
            </Can>
          </div>
          <p className="text-gray-300 mt-2">
            {electionStatus === "ONGOING" 
              ? `View current voting counts for the ongoing election${currentRound > 1 ? ` (Round ${currentRound})` : ""}.`
              : electionStatus === "COMPLETED"
              ? `Election results summary with all winners from all rounds${currentRound > 1 ? ` (${currentRound} rounds completed)` : ""}.`
              : electionStatus === "TIED"
              ? `Election resulted in a tie after Round ${currentRound - 1}. Review winners and start runoff election for tied candidates.`
              : "Review the voting results."}
          </p>
        </div>

        {/* Summary Stats */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-sm text-gray-400">Total Votes</div>
              <div className="text-2xl font-bold text-white">{totalVotes}</div>
            </div>
          
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="text-sm text-gray-400">Confirmed Winners</div>
              <div className="text-2xl font-bold text-emerald-400">{safeWinners.length}</div>
            </div>
            {hasTie && (
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-400">Tied Candidates</div>
                <div className="text-2xl font-bold text-amber-400">{tiedCandidates.length}</div>
              </div>
            )}
            {!hasTie && (
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-gray-400">Candidates</div>
                <div className="text-2xl font-bold text-white">{candidates.length}</div>
              </div>
            )}
          </div>
        </div>

        {electionStatus !== "ONGOING" && safeWinners.length > 0 && (
          <div className="bg-gray-800 border border-emerald-500/30 rounded-lg p-6 mb-6 bg-emerald-500/10">
            <div className="flex items-start gap-3 mb-6">
              <svg
                className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-emerald-400 mb-2">
                  {electionStatus === "COMPLETED" 
                    ? `All Elected Candidates (Winners from All Rounds)`
                    : "Confirmed Winners"}
                </h3>
                <p className="text-gray-300">
                  {electionStatus === "COMPLETED"
                    ? `All ${safeWinners.length} candidate(s) who have been elected to the Board of Directors${currentRound > 1 ? ` across ${currentRound} round(s)` : ""}. This includes winners from Round 1 and any subsequent runoff rounds.`
                    : `${safeWinners.length} candidate(s) have been confirmed as winners${currentRound > 1 ? ` in Round ${currentRound - 1}` : ""}. ${hasTie ? "A runoff election is required for the remaining seats." : ""}`}
                </p>
              </div>
            </div>
            
            {/* Display winners grouped by round */}
            {roundResults.length > 0 ? (
              <div className="space-y-6">
                {roundResults.map((round: any) => {
                  // Get winners from this round
                  const roundWinners = round.candidates.filter(
                    (c: any) => c.status === "WON"
                  );
                  
                  if (roundWinners.length === 0) return null;
                  
                  return (
                    <div key={round.round} className="bg-gray-700/50 border border-gray-600 rounded-lg p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <h4 className="text-lg font-bold text-emerald-400">
                          {round.description}
                        </h4>
                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-sm font-medium">
                          {roundWinners.length} Winner{roundWinners.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {roundWinners.map((winner: any, index: number) => {
                          // Find the full candidate data
                          const candidate = candidates.find(
                            (c: Candidate) => c.id === winner.candidateId
                          );
                          
                          if (!candidate) return null;
                          
                          return (
                            <div
                              key={winner.candidateId}
                              className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-4"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-bold text-emerald-400">#{index + 1}</span>
                                    <h4 className="text-lg font-semibold text-white">
                                      {winner.name || candidate.user?.name || "Unknown"}
                                    </h4>
                                  </div>
                                  <p className="text-sm text-gray-300">
                                    {winner.organization || candidate.organization?.name}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="text-xl font-bold text-emerald-400">
                                    {winner.votes || candidate.voteCount}
                                  </div>
                                  <div className="text-xs text-gray-400">votes</div>
                                  <div className="text-xs text-gray-400 mt-1">
                                    {winner.votePercentage}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Fallback: display all winners together if round data is not available
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {candidates
                  .filter((c: Candidate) => safeWinners.includes(c.id))
                  .sort((a: Candidate, b: Candidate) => {
                    return b.voteCount - a.voteCount;
                  })
                  .map((candidate: Candidate, index: number) => (
                    <div
                      key={candidate.id}
                      className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-emerald-400">#{index + 1}</span>
                            <h4 className="text-lg font-semibold text-white">
                              {candidate.user?.name || "Unknown"}
                            </h4>
                          </div>
                          <p className="text-sm text-gray-300">
                            {candidate.organization?.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-emerald-400">
                            {candidate.voteCount}
                          </div>
                          <div className="text-xs text-gray-400">votes</div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {electionStatus !== "ONGOING" && hasTie && (
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
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-amber-400">Tie Detected!</h3>
                  {currentRound > 1 && (
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-xs font-medium">
                      Round {currentRound - 1}
                    </span>
                  )}
                </div>
                <p className="text-gray-300 mb-2">
                  There is a tie between {tiedCandidates.length} candidate(s) for {remainingSeats} remaining seat(s){currentRound > 1 ? ` after Round ${currentRound - 1}` : ""}.
                </p>
                <p className="text-gray-300 mb-3">
                  A runoff election (Round {currentRound}) is required to determine the winner(s) from the tied candidates.
                </p>
                <Can I="update" a="DirectorElection" fallback={null}>
                  {ability?.can("update", "DirectorElection") && (
                    <p className="text-sm text-amber-300 font-medium">
                      Click &apos;Start Runoff Election&apos; below to begin the runoff voting process for Round {currentRound}.
                    </p>
                  )}
                </Can>
              </div>
            </div>
          </div>
        )}

        {/* Round-wise Results Section */}
        {roundResults.length > 0 && electionStatus !== "ONGOING" && (
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gold-500 mb-6">
              Election Results by Round
            </h3>
            <div className="space-y-6">
              {roundResults.map((round: any, roundIndex: number) => (
                <div
                  key={round.round}
                  className="bg-gray-700/50 border border-gray-600 rounded-lg p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-white mb-1">
                        {round.description}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>Round {round.round}</span>
                            <span>•</span>
                            <span>{round.totalVotesCast} total votes</span>
                            <span>•</span>
                            <span>{round.uniqueVoters} unique voters</span>
                            <span>•</span>
                            <span>Avg: {round.averageVotesPerVoter} votes/voter</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {round.candidates.map((candidate: any, index: number) => (
                      <div
                        key={candidate.candidateId}
                        className={`bg-gray-600/50 border rounded-lg p-3 ${
                          candidate.status === "WON"
                            ? "border-emerald-500 bg-emerald-500/10"
                            : candidate.status === "TIED"
                            ? "border-amber-500 bg-amber-500/10"
                            : "border-gray-500"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-gray-400 w-6">
                              #{index + 1}
                            </span>
                            <div>
                              <h5 className="text-white font-medium">
                                {candidate.name}
                              </h5>
                              <p className="text-sm text-gray-400">
                                {candidate.organization}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-lg font-bold text-gold-500">
                                {candidate.votes}
                              </div>
                              <div className="text-xs text-gray-400">
                                {candidate.votePercentage}%
                              </div>
                            </div>
                            {candidate.status === "WON" && (
                              <span className="px-3 py-1 bg-emerald-500 text-white text-xs rounded-full font-medium">
                                Winner
                              </span>
                            )}
                            {candidate.status === "TIED" && (
                              <span className="px-3 py-1 bg-amber-500 text-black text-xs rounded-full font-medium">
                                Tied
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-gold-500 mb-4">
            {electionStatus === "ONGOING" 
              ? "Candidates by Vote Count"
              : "Candidates Ranked by Votes"}
          </h3>
          <div className="space-y-3">
            {candidates.map((candidate: Candidate, index: number) => {
              const isOngoing = electionStatus === "ONGOING";
              
              const isWinner = !isOngoing && index < seatsAvailable && !hasTie;
              const isSafeWinner = !isOngoing && safeWinners.includes(candidate.id);
              const isTied = !isOngoing && tiedCandidates.includes(candidate.id);
              
              return (
                <div
                  key={candidate.id}
                  className={`bg-gray-700 border-2 rounded-lg p-4 ${
                    !isOngoing && isSafeWinner
                      ? "border-emerald-500 bg-emerald-500/10"
                      : !isOngoing && isTied
                      ? "border-amber-500 bg-amber-500/10"
                      : !isOngoing && isWinner
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
                      {!isOngoing && isSafeWinner && (
                        <div className="mt-2 px-2 py-1 bg-emerald-500 text-white text-xs rounded">
                          Winner
                        </div>
                      )}
                      {!isOngoing && isTied && (
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

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => router.push(`/election/director/${id}`)}
            className="px-6 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
          >
            {electionStatus === "ONGOING" ? "Back" : "Back to Election"}
          </button>
          {electionStatus === "ONGOING" && (
            <button
              onClick={handleEndElection}
              disabled={endingElection}
              className="px-6 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {endingElection ? "Ending Election..." : "End Election"}
            </button>
          )}
          <Can I="update" a="DirectorElection" fallback={null}>
            {electionStatus === "TIED" && hasTie && tiedCandidates.length > 0 && !runoffVotingStarted && (
              <button
                onClick={() => router.push(`/election/director/${id}/tie-resolution`)}
                className="px-6 py-2 bg-amber-500 text-black rounded-md hover:bg-amber-600 transition-colors font-medium"
              >
                Start Runoff Election
              </button>
            )}
          </Can>
          <Can I="update" a="DirectorElection" fallback={null}>
            {electionStatus === "TIED" && hasTie && tiedCandidates.length > 0 && runoffVotingStarted && (
              <button
                onClick={() => router.push(`/election/director/${id}`)}
                className="px-6 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors font-medium"
              >
                End Runoff Voting
              </button>
            )}
          </Can>
        </div>
      </div>

      {/* Start Election Confirmation Modal */}
      {showStartElectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 border border-emerald-500/30 rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-xl font-bold text-emerald-400 mb-4">
                Start Election
              </h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to start this election? Once started, voting will begin and members will be able to cast their votes.
              </p>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-emerald-400">
                  <strong>Note:</strong> The election requires a minimum of 8 approved candidates to start. Currently, there are {shortlistedCandidatesCount} shortlisted candidate(s).
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowStartElectionModal(false)}
                  className="px-4 py-2 border border-emerald-500 text-emerald-500 rounded-md hover:bg-emerald-500/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmStartElection}
                  disabled={startingElection}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {startingElection ? "Starting..." : "Start Election"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End Election Confirmation Modal */}
      {showEndElectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 border border-gold-500/30 rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gold-500 mb-4">
                End Election
              </h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to end this election? This will finalize the voting results and prevent further voting.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-400">
                  <strong>Warning:</strong> This action cannot be undone. Once ended, no more votes can be cast and the results will be finalized.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEndElectionModal(false)}
                  className="px-4 py-2 border border-gold-500 text-gold-500 rounded-md hover:bg-gold-500/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmEndElection}
                  disabled={endingElection}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {endingElection ? "Ending..." : "End Election"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End Runoff Voting Confirmation Modal */}
      {showEndRunoffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 border border-amber-500/30 rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-xl font-bold text-amber-400 mb-4">
                End Runoff Voting
              </h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to end the runoff voting? This will finalize the runoff results.
              </p>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-amber-400">
                  <strong>Warning:</strong> This action cannot be undone. Once ended, the runoff results will be finalized and the election will be completed.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEndRunoffModal(false)}
                  className="px-4 py-2 border border-amber-500 text-amber-500 rounded-md hover:bg-amber-500/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmEndRunoffVoting}
                  disabled={endingElection}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {endingElection ? "Ending..." : "End Runoff Voting"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


