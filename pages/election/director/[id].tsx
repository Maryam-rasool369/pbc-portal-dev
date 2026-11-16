"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useAuthStore from "@/store/authStore";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import NomineeForm from "@/components/elections/nominee-form";
import VotingScreen from "@/components/elections/voting-screen";
import {
  getCandidatesByElection,
  approveCandidate,
  endElection,
  startElection,
  getElectionResults,
  updateElectionDates,
} from "@/services/directorElection";
import UpdateElectionDatesModal from "@/components/elections/update-election-dates-modal";
import { Roles } from "@/enums/Roles";
import { useAbility } from "@/hooks/useAbility";
import Can from "@/components/rbac/Can";
import VatBreakdown from "@/components/ui/VatBreakdown";
import CurrencyAmount from "@/components/ui/CurrencyAmount";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface DirectorElection {
  id: number;
  title: string;
  term: string;
  feeAmount: number;
  status: string;
  nominationStartDate?: string;
  nominationEndDate?: string;
  startDate?: string;
  endDate?: string;
  currentRound?: number;
  rule?: {
    id: number;
    content: string;
  };
  _count?: {
    candidates: number;
    votes: number;
  };
}

interface Candidate {
  id: number;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
    phoneNumber?: string;
    membership?: {
      city?: string;
      country?: string;
      membershipId?: string;
      membershipCategoryRef?: {
        id: number;
        name: string;
      };
      membershipSubCategoryRef?: {
        id: number;
        name: string;
      };
    };
  };
  organization: {
    id: number;
    name: string;
  };
  introducer1User: {
    id: number;
    name: string;
    email?: string;
    phoneNumber?: string;
    membership?: {
      organization?: {
        id: number;
        name: string;
      } | null;
      membershipId?: string;
      membershipCategoryRef?: {
        id: number;
        name: string;
      };
      membershipSubCategoryRef?: {
        id: number;
        name: string;
      };
    } | null;
  };
  introducer2User: {
    id: number;
    name: string;
    email?: string;
    phoneNumber?: string;
    membership?: {
      organization?: {
        id: number;
        name: string;
      } | null;
      membershipId?: string;
      membershipCategoryRef?: {
        id: number;
        name: string;
      };
      membershipSubCategoryRef?: {
        id: number;
        name: string;
      };
    } | null;
  };
  introducer1Signed?: boolean;
  introducer2Signed?: boolean;
  contactAddress: string;
  poBoxNo: string;
  officeTel: string;
  status: string;
  remarks?: string;
  feePaid: boolean;
  stripePaymentUrl?: string | null;
  vatPercentage?: number | null;
  vatAmount?: number | null;
  totalAmount?: number | null;
  createdAt: string;
  approver?: {
    id: number;
    name: string;
  };
  _count?: {
    votes: number;
  };
}

export default function DirectorElectionDetail() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [election, setElection] = useState<DirectorElection | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [userCandidate, setUserCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNomineeForm, setShowNomineeForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveRemarks, setApproveRemarks] = useState("");
  const [approving, setApproving] = useState(false);
  const [approveAction, setApproveAction] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showVotingScreen, setShowVotingScreen] = useState(false);
  const [userHasVoted, setUserHasVoted] = useState(false);
  const [userVotes, setUserVotes] = useState<any[]>([]);
  const [voteHistory, setVoteHistory] = useState<any[]>([]);
  const [showVoteHistory, setShowVoteHistory] = useState(false);
  const [winningCandidates, setWinningCandidates] = useState<Candidate[]>([]);
  const [showEndRunoffModal, setShowEndRunoffModal] = useState(false);
  const [endingRunoff, setEndingRunoff] = useState(false);
  const [signingCandidateId, setSigningCandidateId] = useState<number | null>(null);
  const [showIntroducerModal, setShowIntroducerModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showUpdateDatesModal, setShowUpdateDatesModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [updatingDates, setUpdatingDates] = useState(false);
  const [startingElection, setStartingElection] = useState(false);
  const [endingElection, setEndingElection] = useState(false);
  const [showStartElectionModal, setShowStartElectionModal] = useState(false);
  const [showEndElectionModal, setShowEndElectionModal] = useState(false);

  // Election Committee Members state
  interface ElectionCommitteeMember {
    id: number;
    name: string;
    email: string;
    Role: {
      id: number;
      name: string;
    };
  }
  const [electionCommitteeMembers, setElectionCommitteeMembers] = useState<ElectionCommitteeMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const ability = useAbility();
  const isChairman = user?.Role?.name === Roles.CHAIRMAN;

  // Helper function to check if current user is an introducer for a candidate
  const isIntroducerForCandidate = (candidate: Candidate) => {
    if (!user?.id) return false;
    return (
      candidate.introducer1User?.id === Number(user.id) ||
      candidate.introducer2User?.id === Number(user.id)
    );
  };

  // Get candidates where current user is an introducer
  const candidatesWhereUserIsIntroducer = candidates.filter((candidate) => 
    isIntroducerForCandidate(candidate) && candidate.userId !== Number(user?.id)
  );

  // Helper function to check if current user has already signed as introducer
  const hasUserSignedAsIntroducer = (candidate: Candidate) => {
    if (!user?.id) return false;
    const isIntroducer1 = candidate.introducer1User?.id === Number(user.id);
    const isIntroducer2 = candidate.introducer2User?.id === Number(user.id);
    
    if (isIntroducer1 && candidate.introducer1Signed) return true;
    if (isIntroducer2 && candidate.introducer2Signed) return true;
    
    return false;
  };

  // Function to sign a candidate as introducer
  const handleSignCandidate = async (candidateId: number) => {
    if (!token) {
      toast.error("You must be logged in to sign a candidate");
      return;
    }

    setSigningCandidateId(candidateId);
    try {
      const res = await fetch(`${API_URL}/api/director-elections/candidates/${candidateId}/sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token,
        },
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(
          data.error?.[0]?.msg || "Failed to sign candidate"
        );
      }

      toast.success("Candidate signed successfully!");
      await fetchCandidates();
    } catch (error: any) {
      toast.error(error?.message || "Failed to sign candidate");
    } finally {
      setSigningCandidateId(null);
    }
  };

  useEffect(() => {
    if (!id || !token) return;

    const fetchElection = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/director-elections/${id}`, {
          headers: {
            "Content-Type": "application/json",
            token,
          },
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(
            data.error?.[0]?.msg || "Failed to fetch election details"
          );
        }

        setElection(data.data);

        await fetchCandidates();

        if (data.data.status === "COMPLETED") {
          await fetchWinningCandidates();
        }

        // Check vote status for all users who can vote (not just those without read permission)
        // This is needed for tied elections where tied candidates might have read permission
        if (user?.id && (data.data.status === "ONGOING" || data.data.status === "TIED")) {
          await checkUserVoteStatus(data.data.currentRound);
        }

        if (ability?.can("manage", "DirectorElection")) {
          await fetchVoteHistory();
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to fetch election details"
        );
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to fetch election details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchElection();
  }, [id, token, user?.id]);

  useEffect(() => {
    if (!token) return;

    const fetchElectionCommitteeMembers = async () => {
      setLoadingMembers(true);
      try {
        const queryParams = new URLSearchParams({
          roleId: "10,11",
          status: "active",
          membership: "verified",
        });

        const response = await fetch(
          `${API_URL}/api/user/all/users?${queryParams.toString()}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              token: token,
            },
          }
        );

        const data = await response.json();
        
        if (!response.ok) {
          console.error("Failed to fetch election committee members:", data.error || data);
          setElectionCommitteeMembers([]);
          return;
        }

        // Handle both paginated and non-paginated responses
        const members = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
        
        if (members.length > 0) {
          setElectionCommitteeMembers(members);
        } else {
          setElectionCommitteeMembers([]);
        }
      } catch (err) {
        console.error("Error fetching election committee members:", err);
        setElectionCommitteeMembers([]);
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchElectionCommitteeMembers();
  }, [token]);

  const fetchCandidates = async () => {
    if (!id || !token) return;

    try {
      const candidatesData = await getCandidatesByElection(
        token,
        Number(id),
        ability?.can("manage", "DirectorElection") ?? false
      );

      let finalCandidates = [...candidatesData];

      if (user?.id) {
        if (!ability?.can("manage", "DirectorElection")) {
          try {
            const allCandidatesData = await getCandidatesByElection(
              token,
              Number(id),
              true
            );
            const ownCandidate = allCandidatesData.find(
              (c: Candidate) => c.userId === Number(user.id)
            );
            if (ownCandidate) {
              setUserCandidate(ownCandidate);
            } else {
              const ownInList = candidatesData.find(
                (c: Candidate) => c.userId === Number(user.id)
              );
              setUserCandidate(ownInList || null);
            }

            const introducerCandidates = allCandidatesData.filter(
              (c: Candidate) =>
                (c.introducer1User?.id === Number(user.id) ||
                  c.introducer2User?.id === Number(user.id)) &&
                c.userId !== Number(user.id)
            );

            const existingIds = new Set(finalCandidates.map((c) => c.id));
            introducerCandidates.forEach((candidate) => {
              if (!existingIds.has(candidate.id)) {
                finalCandidates.push(candidate);
                existingIds.add(candidate.id);
              }
            });
          } catch (err) {
            const ownInList = candidatesData.find(
              (c: Candidate) => c.userId === Number(user.id)
            );
            setUserCandidate(ownInList || null);
          }
        } else {
          const ownCandidate = candidatesData.find(
            (c: Candidate) => c.userId === Number(user.id)
          );
          setUserCandidate(ownCandidate || null);
        }
      }

      setCandidates(finalCandidates);
    } catch (err) {
      console.error("Failed to fetch candidates:", err);
    }
  };

  const fetchWinningCandidates = async () => {
    if (!id || !token) return;

    try {
      const allCandidates = await getCandidatesByElection(token, Number(id), true);
      const allWinners = allCandidates.filter(
        (candidate: any) => candidate.winnerStatus === "WON"
      );

      let voteCountMap = new Map<number, number>();
      try {
        const voteResults = await getElectionResults(token, Number(id));

        if (voteResults.results) {
          if (voteResults.results.winners) {
            voteResults.results.winners.forEach((resultItem: any) => {
              if (resultItem.candidate) {
                voteCountMap.set(resultItem.candidate.id, resultItem.voteCount || 0);
              }
            });
          }

          if (Array.isArray(voteResults.results)) {
            voteResults.results.forEach((result: any) => {
              if (result.candidate) {
                voteCountMap.set(result.candidate.id, result.voteCount || 0);
              }
            });
          }
        }
      } catch (resultsErr) {
        console.warn("Could not fetch vote counts from results API, using fallback:", resultsErr);
        allWinners.forEach((candidate: any) => {
          voteCountMap.set(candidate.id, candidate._count?.votes || 0);
        });
      }

    
      const winnersWithVotes = allWinners
        .map((candidate: any) => ({
          ...candidate,
          voteCount: voteCountMap.get(candidate.id) || candidate._count?.votes || 0,
        }))
        .sort((a: any, b: any) => b.voteCount - a.voteCount);

      setWinningCandidates(winnersWithVotes);
    } catch (err) {
      console.error("Failed to fetch winning candidates:", err);
      try {
        const allCandidates = await getCandidatesByElection(token, Number(id), true);
        const winners = allCandidates.filter(
          (candidate: any) => candidate.winnerStatus === "WON"
        );
        setWinningCandidates(winners);
      } catch (fallbackErr) {
        console.error("Fallback also failed:", fallbackErr);
      }
    }
  };

  const checkUserVoteStatus = async (currentRound?: number, preserveExistingState: boolean = false) => {
    if (!id || !token || !user?.id) return;

    try {
      const res = await fetch(
        `${API_URL}/api/director-elections/${id}/vote-history`,
        {
          headers: {
            "Content-Type": "application/json",
            token,
          },
        }
      );

      const data = await res.json();
      if (res.ok && data.data && Array.isArray(data.data)) {
        const myVotes = data.data.filter((vote: any) => {
          const isMyVote = vote.voter?.id === Number(user.id);
          if (currentRound !== undefined) {
            return isMyVote && vote.round === currentRound;
          }
          return isMyVote;
        });

        if (myVotes.length > 0) {
          setUserHasVoted(true);
          setUserVotes(myVotes);
          return; 
        } else {
         
          if (!preserveExistingState) {
            setUserHasVoted(false);
            setUserVotes([]);
          }
          return; 
        }
      }
      
      if (res.status === 404 || !res.ok) {
        console.warn("Vote history endpoint not available");
       
        if (!preserveExistingState) {
          setUserHasVoted(false);
          setUserVotes([]);
        }
      }
    } catch (err) {
      console.error("Failed to check user vote status:", err);
     
      if (!preserveExistingState) {
        setUserHasVoted(false);
        setUserVotes([]);
      }
    }
  };

  const fetchVoteHistory = async () => {
    if (!id || !token || !ability?.can("manage", "DirectorElection")) return;

    try {
      const res = await fetch(
        `${API_URL}/api/director-elections/${id}/vote-history`,
        {
          headers: {
            "Content-Type": "application/json",
            token,
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.data && Array.isArray(data.data)) {
          setVoteHistory(data.data);
        } else {
          setVoteHistory([]);
        }
      } else {
        console.error("Failed to fetch vote history:", res.statusText);
        setVoteHistory([]);
      }
    } catch (err) {
      console.error("Failed to fetch vote history:", err);
      setVoteHistory([]);
    }
  };

  const handleNominationSuccess = async () => {
    setShowNomineeForm(false);
    setRefreshing(true);
    await fetchCandidates();
    setRefreshing(false);
  };

  const handleVoteSuccess = async () => {
    setShowVotingScreen(false);
    setUserHasVoted(true);
    setRefreshing(true);
    
    let updatedElection = null;
    
    try {
      const res = await fetch(`${API_URL}/api/director-elections/${id}`, {
        headers: {
          "Content-Type": "application/json",
          token: token || "",
        },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        updatedElection = data.data;
        setElection(updatedElection);
      }
    } catch (err) {
      console.error("Failed to refresh election data:", err);
    }
    
    await fetchCandidates();
    
    if (updatedElection?.status === "COMPLETED") {
      await fetchWinningCandidates();
    }
    

    if (user?.id && updatedElection && (updatedElection.status === "ONGOING" || updatedElection.status === "TIED")) {
      try {
        const res = await fetch(
          `${API_URL}/api/director-elections/${id}/vote-history`,
          {
            headers: {
              "Content-Type": "application/json",
              token: token || "",
            },
          }
        );
        const data = await res.json();
        if (res.ok && data.data && Array.isArray(data.data)) {
          const myVotes = data.data.filter((vote: any) => {
            const isMyVote = vote.voter?.id === Number(user.id);
            if (updatedElection.currentRound !== undefined) {
              return isMyVote && vote.round === updatedElection.currentRound;
            }
            return isMyVote;
          });
          if (myVotes.length > 0) {
            setUserVotes(myVotes);
          }
        }
      } catch (err) {
        console.warn("Could not fetch vote details, but vote was successful:", err);
      }
    }
    
    setRefreshing(false);
    if (isTied) {
      const electionRes = await fetch(`${API_URL}/api/director-elections/${id}`, {
        headers: {
          "Content-Type": "application/json",
          token: token || "",
        },
      });
      const electionData = await electionRes.json();
      if (electionRes.ok && electionData.data) {
        setElection(electionData.data);
        if (electionData.data.status === "COMPLETED") {
          await fetchWinningCandidates();
        }
      }
    }
    setRefreshing(false);
  };

  const isUpcoming = election?.status === "UPCOMING";
  const isOngoing = election?.status === "ONGOING";
  const isTied = election?.status === "TIED";

  const isNominationStarted = election?.nominationStartDate
    ? new Date() >= new Date(election.nominationStartDate)
    : false;

  const isNominationEnded = election?.nominationEndDate
    ? new Date() > new Date(election.nominationEndDate)
    : false;

  const isNominationActive = isNominationStarted && !isNominationEnded;

  const votingCandidates = isTied
    ? candidates.filter(
      (c: any) => c.status === "APPROVED" && c.feePaid && c.winnerStatus === "TIED_RUNOFF"
    )
    : candidates.filter(
      (c) => c.status === "APPROVED" && c.feePaid
    );

  const runoffVotingStarted = isTied && votingCandidates.some(
    (c: any) => (c._count?.votes || 0) > 0
  );

  const isTiedCandidate = isTied && userCandidate && votingCandidates.some(
    (c: any) => c.id === userCandidate.id
  );

  const handleApproveCandidate = async () => {
    if (!selectedCandidate || !token) return;

    setApproving(true);
    try {
      await approveCandidate(token, selectedCandidate.id, {
        status: approveAction,
        remarks: approveRemarks || undefined,
      });
      toast.success(`Candidate ${approveAction === "APPROVED" ? "approved" : "rejected"} successfully!`);
      setShowApproveModal(false);
      setSelectedCandidate(null);
      setApproveRemarks("");
      await fetchCandidates();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update candidate status.");
    } finally {
      setApproving(false);
    }
  };


  const handleEndRunoffVoting = () => {
    if (!token || !id) return;
    setShowEndRunoffModal(true);
  };

  const confirmEndRunoffVoting = async () => {
    if (!token || !id) return;

    try {
      setEndingRunoff(true);
      const result = await endElection(token, Number(id), "COMPLETED");

      toast.success("Runoff voting ended successfully! Results are being processed.");

      setShowEndRunoffModal(false);

      // Refresh election data
      const electionRes = await fetch(`${API_URL}/api/director-elections/${id}`, {
        headers: {
          "Content-Type": "application/json",
          token,
        },
      });
      const electionData = await electionRes.json();
      if (electionRes.ok && electionData.data) {
        setElection(electionData.data);
        await fetchCandidates();

        // Navigate to voting summary to see results
        router.push(`/election/director/${id}/voting-summary`);
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to end runoff voting.");
    } finally {
      setEndingRunoff(false);
    }
  };

  const handleStartRunoffElection = async () => {
    if (!token || !id) return;

    try {
       const res = await fetch(
        `${API_URL}/api/director-elections/${id}/start`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            token: token || "",
          },
        }
      );

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error?.[0]?.msg || "Failed to start runoff election.");
      }

      toast.success("Runoff election started! You can now vote for the tied candidates.");

      // Refresh election data
      const electionRes = await fetch(`${API_URL}/api/director-elections/${id}`, {
        headers: {
          "Content-Type": "application/json",
          token,
        },
      });
      const electionData = await electionRes.json();
      if (electionRes.ok && electionData.data) {
        setElection(electionData.data);
        await fetchCandidates();
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to start runoff election.");
    }
  };

  const handleCancelElection = async () => {
    if (!token || !id) return;

    try {
      setCancelling(true);
      await endElection(token, Number(id), "CANCELLED");
      toast.success("Election cancelled successfully!");
      
      // Refresh election data
      const res = await fetch(`${API_URL}/api/director-elections/${id}`, {
        headers: {
          "Content-Type": "application/json",
          token,
        },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setElection(data.data);
      }
      setShowCancelModal(false);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to cancel election.";
      toast.error(errorMessage);
    } finally {
      setCancelling(false);
    }
  };

  const handleUpdateElectionDates = async (dates: {
    nominationEndDate?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    if (!token || !id) return;

    try {
      setUpdatingDates(true);
      await updateElectionDates(token, Number(id), dates);
      toast.success("Election dates updated successfully!");
      
      // Refresh election data
      const res = await fetch(`${API_URL}/api/director-elections/${id}`, {
        headers: {
          "Content-Type": "application/json",
          token,
        },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setElection(data.data);
      }
      setShowUpdateDatesModal(false);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update election dates.";
      toast.error(errorMessage);
    } finally {
      setUpdatingDates(false);
    }
  };

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
        setElection(data.data);
        await fetchCandidates();
      }
      setShowStartElectionModal(false);
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

  const confirmEndElection = async () => {
    if (!token || !id) return;

    try {
      setEndingElection(true);
      await endElection(token, Number(id), "COMPLETED");
      toast.success("Election ended successfully!");
      
      // Refresh election data
      const res = await fetch(`${API_URL}/api/director-elections/${id}`, {
        headers: {
          "Content-Type": "application/json",
          token,
        },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setElection(data.data);
        await fetchCandidates();
        if (data.data.status === "COMPLETED") {
          await fetchWinningCandidates();
        }
      }
      setShowEndElectionModal(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to end election.");
    } finally {
      setEndingElection(false);
    }
  };

  const getStatusBadgeClass = () => {
    if (!election) return "";
    switch (election.status) {
      case "UPCOMING":
        return "bg-amber-500 text-black";
      case "ONGOING":
        return "bg-emerald-500 text-black";
      case "COMPLETED":
        return "bg-gray-500 text-white";
      case "CANCELLED":
        return "bg-red-500 text-white";
      case "TIED":
        return "bg-amber-500 text-black";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getCandidateStatusBadgeClass = (status: string, feePaid: boolean, stripePaymentUrl?: string | null) => {
    if ((status === "APPROVED" && !feePaid) || (status === "PENDING" && stripePaymentUrl)) {
      return "bg-blue-500 text-white";
    }
    if (status === "APPROVED" && feePaid) {
      return "bg-gold-500 text-black";
    }
    switch (status) {
      case "APPROVED":
        return "bg-emerald-500 text-black";
      case "REJECTED":
        return "bg-red-500 text-white";
      default:
        return "bg-amber-500 text-black";
    }
  };

  const getDisplayStatus = (status: string, feePaid: boolean, stripePaymentUrl?: string | null) => {
    if ((status === "APPROVED" && !feePaid) || (status === "PENDING" && stripePaymentUrl)) {
      return "Pending Payment";
    }
    if (status === "APPROVED" && feePaid) {
      return "SHORTLISTED";
    }
    return status || "PENDING";
  };

  
  const allCandidates = ability?.can("manage", "DirectorElection") ? candidates : (userCandidate ? [userCandidate] : []);
  const pendingCandidates = candidates.filter((c) => c.status === "PENDING" && !c.stripePaymentUrl);
  const approvedbyAdminCandidates = candidates.filter((c) => (c.status === "PENDING" || c.status === "APPROVED") && c.stripePaymentUrl);
  const rejectedCandidates = candidates.filter((c) => c.status === "REJECTED");
  const pendingPaymentCandidates = candidates.filter((c) =>
    (c.status === "APPROVED" && !c.feePaid) || (c.status === "PENDING" && c.stripePaymentUrl)
  );
  const shortlistedCandidates = candidates.filter((c) => c.status === "APPROVED" && c.feePaid);
  const isElectionStarted = isOngoing || (election?.startDate && new Date() >= new Date(election.startDate));
  const isElectionStartDateReached = election?.startDate
    ? new Date() >= new Date(election.startDate)
    : false;
  const hasInsufficientCandidates = shortlistedCandidates.length < 8;

 
  const getFilteredCandidates = () => {
    if (election?.status === "COMPLETED") {
      if (winningCandidates.length > 0) {
        return winningCandidates;
      }
      return [];
    }

    if (!ability?.can("manage", "DirectorElection")) {
      return userCandidate ? [userCandidate] : [];
    }

    let filtered: Candidate[] = [];
    if (!filterStatus) filtered = allCandidates;
    else if (filterStatus === "PENDING") filtered = pendingCandidates;
    else if (filterStatus === "PENDING_PAYMENT") filtered = pendingPaymentCandidates;
    else if (filterStatus === "SHORTLISTED") filtered = shortlistedCandidates;
    else filtered = allCandidates;

    if (isOngoing || election?.status === "TIED") {
      return [...filtered].sort((a, b) => {
        const votesA = a._count?.votes || 0;
        const votesB = b._count?.votes || 0;
        return votesA - votesB; // Ascending order
      });
    }

    return filtered;
  };

  const displayedCandidates = getFilteredCandidates();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (error || !election) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="bg-gray-800 border border-red-500/30 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-500 mb-2">Error</h2>
          <p className="text-gray-300">{error || "Election not found"}</p>
          <button
            onClick={() => router.push("/election")}
            className="mt-4 px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
          >
            Back to Elections
          </button>
        </div>
      </div>
    );
  }

  const userHasApplied = candidates.some(
    (candidate) => candidate.userId === Number(user?.id)
  ) || userCandidate !== null;


  const showPaymentButton = !ability?.can("manage", "DirectorElection") &&
    userCandidate &&
    userCandidate.status === "APPROVED" &&
    !userCandidate.feePaid &&
    userCandidate.stripePaymentUrl;

  const canEditNomination = !ability?.can("manage", "DirectorElection") &&
    userCandidate &&
    (!userCandidate.stripePaymentUrl || userCandidate.status === "REJECTED") &&
    isUpcoming &&
    !isNominationEnded;

  const hasRejectedNomination = !ability?.can("manage", "DirectorElection") &&
    userCandidate &&
    userCandidate.status === "REJECTED" &&
    isUpcoming;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
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

        {/* Election Info */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gold-500">
                {election.title}
              </h1>
              <p className="text-gray-300 mt-2">Term: {election.term}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass()}`}
              >
                {election.status}
              </span>
              {isNominationActive && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-500 text-white">
                  Nomination Ongoing
                </span>
              )}
              {isNominationEnded && !isElectionStarted && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-500 text-white">
                  Nomination Ended
                </span>
              )} 
              {candidatesWhereUserIsIntroducer.length > 0 && (
                <button
                  onClick={() => setShowIntroducerModal(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center gap-2"
                >
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Sign as Introducer ({candidatesWhereUserIsIntroducer.length})
                </button>
              )}
              <Can I="manage" a="DirectorElection">
                {(election.status !== "CANCELLED" && election.status !== "COMPLETED") && (
                  <button
                    onClick={() => setShowUpdateDatesModal(true)}
                    className="px-4 py-2 bg-gold-500 text-white rounded-md hover:bg-gold-500 transition-colors flex items-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Update Dates
                  </button>
                )}
              </Can>
              <Can I="manage" a="DirectorElection" fallback={null}>
                {election.status !== "UPCOMING" &&  election.status !== "COMPLETED" && election.status !== "CANCELLED" && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
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
                    Cancel Election
                  </button>
                )}
              </Can>
              <Can I="update" a="DirectorElection" fallback={null}>
                {isTied && votingCandidates.length > 0 && (
                  <>
                    {!runoffVotingStarted && (
                      <button
                        onClick={() => router.push(`/election/director/${id}/tie-resolution`)}
                        className="px-4 py-2 bg-amber-500 text-black rounded-md hover:bg-amber-600 transition-colors"
                      >
                        Start Runoff Voting
                      </button>
                    )}
                    {runoffVotingStarted && (
                      <button
                        onClick={handleEndRunoffVoting}
                        className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                      >
                        End Runoff Voting
                      </button>
                    )}
                  </>
                )}
              </Can>
            </div>
          </div>

          {/* Election Statistics Card */}
          <div className="mt-6 bg-gradient-to-br from-gray-800/90 to-gray-900/90 border border-gold-500/20 rounded-xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gold-500 mb-6 flex items-center gap-2">
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Election Details
            </h3>

            <div className="space-y-6">
              {/* Nomination Period */}
              {(election.nominationStartDate || election.nominationEndDate) && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-blue-500/20">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-blue-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wide">
                      Nomination Period
                    </h4>
                  </div>
                  <div className="space-y-2 pl-12">
                    {election.nominationStartDate && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 font-medium min-w-[60px]">Start:</span>
                        <span className="text-white font-semibold">
                          {formatDateAndTime(election.nominationStartDate, true, true)}
                        </span>
                      </div>
                    )}
                    {election.nominationEndDate && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 font-medium min-w-[60px]">End:</span>
                        <span className="text-white font-semibold">
                          {formatDateAndTime(election.nominationEndDate, true, true)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Election Period */}
              {(election.startDate || election.endDate) && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-emerald-400"
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
                    </div>
                    <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">
                      Election Period
                    </h4>
                  </div>
                  <div className="space-y-2 pl-12">
                    {election.startDate && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 font-medium min-w-[60px]">Start:</span>
                        <span className="text-white font-semibold">
                          {formatDateAndTime(election.startDate, true, true)}
                        </span>
                      </div>
                    )}
                    {election.endDate && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 font-medium min-w-[60px]">End:</span>
                        <span className="text-white font-semibold">
                          {formatDateAndTime(election.endDate, true, true)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Disclaimer for insufficient candidates */}
              {ability?.can("manage", "DirectorElection") && 
               isElectionStartDateReached && 
               hasInsufficientCandidates && 
               isUpcoming && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-red-500/20 flex-shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-red-400"
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
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-red-300 uppercase tracking-wide mb-2">
                        Election Start Delay
                      </h4>
                      <p className="text-gray-200 text-sm leading-relaxed">
                        The election is unable to start at the scheduled time ({formatDateAndTime(election.startDate || "", true, true)}) due to insufficient shortlisted candidates. 
                        Currently, there are only <strong className="text-white">{shortlistedCandidates.length}</strong> shortlisted candidate(s), but a minimum of <strong className="text-white">8</strong> shortlisted candidates are required to start the election.
                      </p>
                      <p className="text-gray-300 text-sm mt-2 leading-relaxed">
                        Please update the election start date once sufficient candidates have been shortlisted.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Fee Amount */}
              <div className="bg-gold-500/10 border border-gold-500/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 rounded-lg bg-gold-500/20">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gold-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-sm font-semibold text-gold-400 uppercase tracking-wide">
                    Fee Amount
                  </h4>
                </div>
                <div className="pl-12">
                  <VatBreakdown baseAmount={election.feeAmount} />
                </div>
              </div>
            </div>
          </div>

          {election.rule && (
            <div className="mt-6 border-t border-gray-700 pt-6">
              <h3 className="text-lg font-medium text-gold-500 mb-2">
                Election Rule
              </h3>
              <div
                className="text-gray-300 prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: election.rule.content }}
              />
            </div>
          )}

          {/* Election Committee Members Section */}
          <div className="mt-6 border-t border-gray-700 pt-6">
            <h3 className="text-lg font-medium text-gold-500 mb-4">
              Election Committee Members
            </h3>
            {loadingMembers ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500"></div>
              </div>
            ) : electionCommitteeMembers.length === 0 ? (
              <div className="text-center py-8 bg-gray-700/50 border border-gray-600 rounded-lg">
                <p className="text-gray-400">No Election Committee members found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {electionCommitteeMembers.map((member) => {
                  const roleName = member.Role?.name || 
                    (member.Role?.id === 10 ? "Election Commissioner" : 
                     member.Role?.id === 11 ? "Election Committee Member" : 
                     `Role ID: ${member.Role?.id}`);
                  
                  return (
                    <div
                      key={member.id}
                      className="bg-gray-700/50 border border-gray-600 rounded-lg p-4 hover:border-gold-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-medium mb-1">{member.name}</h4>
                          <Link
                            href={`/users/${member.id}?returnPath=${encodeURIComponent(`/election/director/${id}`)}`}
                            className="text-gray-400 text-sm mb-2 hover:text-gold-400 hover:underline transition-colors cursor-pointer"
                          >
                            {member.email}
                          </Link>
                          <span className="inline-block px-2 py-1 text-xs rounded-full bg-gold-500/20 text-gold-400">
                            {roleName}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chairman Dashboard */}
        <Can I="manage" a="DirectorElection" fallback={null}>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gold-500">
                Chairman Dashboard
              </h2>
              <div className="flex items-center gap-3">
                {/* Start Election Button - Only for UPCOMING elections */}
                <Can I="update" a="DirectorElection" fallback={null}>
                  {isUpcoming && (
                    <>
                      {shortlistedCandidates.length >= 8 ? (
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
                              Start Election
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
                            Need {8 - shortlistedCandidates.length} more candidate(s) to start
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </Can>
                {/* End Election Button - Only for ONGOING or TIED elections */}
                <Can I="update" a="DirectorElection" fallback={null}>
                  {(isOngoing || isTied) && (
                    <button
                      onClick={handleEndElection}
                      disabled={endingElection}
                      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {endingElection ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Ending...
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
                              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 10h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          End Election
                        </>
                      )}
                    </button>
                  )}
                </Can>
                {/* View Voting Summary Button */}
                {(isOngoing || election?.status === "COMPLETED" || isTied) && (
                  <button
                    onClick={() => router.push(`/election/director/${id}/voting-summary`)}
                    className="px-4 py-2 bg-gold-500 text-white rounded-md hover:bg-gold-600 transition-colors flex items-center gap-2"
                  >
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
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    View Voting Summary
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-gold-500">
                  {candidates.length}
                </div>
                <div className="text-sm text-gray-400">Total Applications</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-white">
                  {pendingCandidates.length}
                </div>
                <div className="text-sm text-gray-400">Pending Review</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-emerald-500">
                  {approvedbyAdminCandidates.length}
                </div>
                <div className="text-sm text-gray-400">Approved</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-gold-500">
                  {shortlistedCandidates.length}
                </div>
                <div className="text-sm text-gray-400">Shortlisted</div>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-500">
                  {rejectedCandidates.length}
                </div>
                <div className="text-sm text-gray-400">Rejected</div>
              </div>
            </div>
            {/* Vote History Section */}
            <Can I="manage" a="DirectorElection" fallback={null}>
            {(isOngoing || election?.status === "COMPLETED" || isTied) && (
              <div className="border-t border-gray-700 pt-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gold-500">Voters</h3>
                  <button
                    onClick={() => setShowVoteHistory(!showVoteHistory)}
                    className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                  >
                    {showVoteHistory ? "Hide" : "Show"} Voters
                  </button>
                </div>
                {showVoteHistory && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <div className="max-h-96 overflow-y-auto">
                      {voteHistory.length === 0 ? (
                        <p className="text-gray-400 text-center py-4">No votes cast yet.</p>
                      ) : (
                        <div className="space-y-3">
                          {Array.from(
                            new Map(
                              voteHistory.map((vote: any) => [
                                vote.voter?.id || vote.voter?.name || `unknown-${vote.id}`,
                                vote.voter?.name || "Unknown Voter"
                              ])
                            ).values()
                          ).map((voterName: string, index: number) => (
                            <div
                              key={`voter-${index}`}
                              className="bg-gray-600 rounded-lg p-3 border border-gray-500"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="text-white font-medium">
                                    {voterName}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            </Can>
          </div>
        </Can>

        {/* Payment Section (for approved candidates) */}
        {showPaymentButton && userCandidate && (
          <div className="mb-6">
            <div className="bg-gray-800 border border-blue-500/30 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-blue-400 mb-2">
                    Payment Required
                  </h2>
                  <p className="text-gray-300 mb-1">
                    Your nomination has been approved! Please complete the payment to finalize your candidacy.
                  </p>
                  <p className="text-sm text-gray-400">
                    Fee Amount: <CurrencyAmount amount={election?.feeAmount} className="text-gold-500 font-semibold" />
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (userCandidate.stripePaymentUrl) {
                      window.location.href = userCandidate.stripePaymentUrl;
                    }
                  }}
                  className="px-6 py-3 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors font-medium"
                >
                  Pay Now
                </button>
              </div>
            </div>
          </div>
          )}

        {/* Edit Nomination Section (for pending nominations) */}
        {canEditNomination && (
          <div className="mb-6">
            {showNomineeForm ? (
              <NomineeForm
                electionId={Number(id)}
                onSuccess={handleNominationSuccess}
                onClose={() => setShowNomineeForm(false)}
              />
            ) : (
              <div className="bg-gray-800 border border-amber-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-amber-400 mb-2">
                      Edit Nomination
                    </h2>
                    <p className="text-gray-300">
                      Your nomination is pending review. You can edit your details until it&apos;s reviewed.
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      Status: <span className="text-amber-400 font-semibold">PENDING</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNomineeForm(true)}
                    className="px-6 py-3 bg-amber-500 text-black rounded-md hover:bg-amber-600 transition-colors font-medium"
                  >
                    Edit Nomination
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!ability?.can("manage", "DirectorElection") && isUpcoming && !userHasApplied && !canEditNomination && isNominationActive && (
          <div className="mb-6">
            {showNomineeForm ? (
              <NomineeForm
                electionId={Number(id)}
                onSuccess={handleNominationSuccess}
                onClose={() => setShowNomineeForm(false)}
              />
            ) : (
              <div className="bg-gray-800 border border-gold-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gold-500 mb-2">
                      Apply as Nominee
                    </h2>
                    <p className="text-gray-300">
                      Submit your nomination to run in this director election.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNomineeForm(true)}
                    className="px-6 py-3 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors font-medium"
                  >
                    Apply Now
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Runoff Voting Section (for tied elections) - Visible to ALL users */}
        {isTied && (
          <div className="mb-6">
            <div className="bg-gray-800 border border-amber-500/30 rounded-lg p-6 mb-4 bg-amber-500/10">
              <div className="flex items-start gap-3 mb-4">
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
                  <h2 className="text-xl font-bold text-amber-400 mb-2">
                    Tie Detected - Runoff Election Required
                  </h2>
                  <p className="text-gray-300 mb-2">
                    A tie was detected in the election results. A runoff election is required to determine the winners from the tied candidates.
                  </p>
                  <p className="text-sm text-gray-400">
                    {votingCandidates.length > 0
                      ? `There are ${votingCandidates.length} tied candidate(s) competing for the remaining seat(s). Please vote to break the tie.`
                      : "Tied candidates are being determined. Please wait..."}
                  </p>
                </div>
              </div>
            </div>
            {isTied && (!ability?.can("manage", "DirectorElection") || isTiedCandidate) && (
              <div className="mb-6">
                {userHasVoted ? (
                  <div className="bg-gray-800 border border-emerald-500/30 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-emerald-400 mb-2">
                          ✓ Runoff Vote Submitted
                        </h2>
                        <p className="text-gray-300">
                          You have successfully cast your vote in the runoff election. Thank you for participating!
                        </p>
                      </div>
                      <div className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-md">
                        Voted
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-800 border border-amber-500/30 rounded-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-amber-400 mb-2">
                          Runoff Election - Cast Your Vote
                        </h2>
                        <p className="text-gray-300 mb-1">
                          Please vote for the tied candidates to break the tie. You can vote for at least 1 candidate.
                        </p>
                        <p className="text-sm text-gray-400">
                          {votingCandidates.length > 0
                            ? `Select from ${votingCandidates.length} tied candidate(s) to determine the winner(s).`
                            : "Loading tied candidates..."}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowVotingScreen(true)}
                        disabled={votingCandidates.length === 0}
                        className="px-6 py-3 bg-amber-500 text-black rounded-md hover:bg-amber-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Vote in Runoff
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Voting Section (for ongoing elections) */}
        {!ability?.can("manage", "DirectorElection") && isOngoing && (
          <div className="mb-6">
            {userHasVoted ? (
              <div className="bg-gray-800 border border-emerald-500/30 rounded-lg p-6">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-emerald-400 mb-2">
                        ✓ Vote Submitted
                      </h2>
                      <p className="text-gray-300">
                        You have successfully cast your vote in this election. Thank you for participating!
                      </p>
                    </div>
                    <div className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-md">
                      Voted
                    </div>
                  </div>

                  {/* Show who user voted for */}
                  {userVotes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <h3 className="text-lg font-semibold text-gold-500 mb-3">
                        Your Votes
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {userVotes.map((vote: any) => (
                          <div
                            key={vote.id}
                            className="bg-gray-700 rounded-lg p-3 border border-gold-500/30"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-white font-medium">
                                  {vote.candidate?.user?.name || "Unknown Candidate"}
                                </p>
                                <p className="text-sm text-gray-400">
                                  {vote.candidate?.organization?.name}
                                </p>
                              </div>
                              <div className="text-xs text-gray-400">
                                {new Date(vote.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 border border-gold-500/30 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gold-500 mb-2">
                      Cast Your Vote
                    </h2>
                    <p className="text-gray-300 mb-1">
                      The election is now ongoing. Select between 1 and 7 candidates to cast your vote.
                    </p>
                    <p className="text-sm text-gray-400">
                      You can vote for a minimum of 1 and a maximum of 7 candidates.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowVotingScreen(true)}
                    className="px-6 py-3 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors font-medium"
                  >
                    Vote Now
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Candidates List */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gold-500">
              {election?.status === "COMPLETED" ? "Shortlisted Candidates (Winners)" : "Candidates"}
            </h2>
            <Can I="manage" a="DirectorElection" fallback={null}>
              {election?.status !== "COMPLETED" && (
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterStatus(null)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${filterStatus === null
                      ? "bg-gold-500 text-black"
                      : "bg-gray-700 hover:bg-gray-600"
                    }`}
                >
                  All ({candidates.length})
                </button>
                <button
                  onClick={() => setFilterStatus("PENDING")}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${filterStatus === "PENDING"
                      ? "bg-amber-500 text-black"
                      : "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30"
                    }`}
                >
                  Pending ({pendingCandidates.length})
                </button>
                <button
                  onClick={() => setFilterStatus("PENDING_PAYMENT")}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${filterStatus === "PENDING_PAYMENT"
                      ? "bg-blue-500 text-white"
                      : "bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                    }`}
                >
                  Pending Payment ({pendingPaymentCandidates.length})
                </button>
                <button
                  onClick={() => setFilterStatus("SHORTLISTED")}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${filterStatus === "SHORTLISTED"
                      ? "bg-gold-500 text-black"
                      : "bg-gold-500/20 text-gold-500 hover:bg-gold-500/30"
                    }`}
                >
                  Shortlisted ({shortlistedCandidates.length})
                </button>
              </div>
              )}
            </Can>
          </div>

          {refreshing ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold-500"></div>
            </div>
          ) : displayedCandidates.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p>
                {election?.status === "COMPLETED"
                  ? "No winners found."
                  : ability?.can("manage", "DirectorElection")
                    ? "No candidates found."
                    : "You haven't submitted a nomination yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedCandidates.map((candidate) => {
                const isWinner = election?.status === "COMPLETED" && winningCandidates.some((w: Candidate) => w.id === candidate.id);
                return (
                  <div
                    key={candidate.id}
                    className={`bg-gray-700 rounded-lg p-4 ${isWinner
                        ? "border-2 border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20"
                        : "border border-gray-600"
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-medium text-white">
                            {candidate.user?.name || "Unknown"}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getCandidateStatusBadgeClass(
                              candidate.status,
                              candidate.feePaid,
                              candidate.stripePaymentUrl
                            )}`}
                          >
                            {getDisplayStatus(candidate.status, candidate.feePaid, candidate.stripePaymentUrl)}
                          </span>
                          {/* Winner Badge - Show for all users when election is completed */}
                          {election?.status === "COMPLETED" && winningCandidates.some((w: Candidate) => w.id === candidate.id) && (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white border-2 border-emerald-400 shadow-lg shadow-emerald-500/50">
                              🏆 Winner of Election
                            </span>
                          )}
                          {/* Vote Count - Only show for chairman/admin when election has started */}
                          <Can I="manage" a="DirectorElection" fallback={null}>
                            {(isOngoing || election?.status === "COMPLETED" || election?.status === "TIED") && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              Votes: {candidate._count?.votes || 0}
                            </span>
                            )}
                          </Can>
                        </div>
                        <p className="text-sm text-gray-400 mb-3">
                          {candidate.user?.email && candidate.user?.id ? (
                            <Link
                              href={`/users/${candidate.user.id}`}
                              className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                            >
                              {candidate.user.email}
                            </Link>
                          ) : (
                            candidate.user?.email || "N/A"
                          )}
                        </p>

                        {(ability?.can("manage", "DirectorElection") || candidate.userId === Number(user?.id)) && (
                          <div className="space-y-6">
                            {/* Section 1: Nominee Information */}
                            <div className="border-t border-gray-600 pt-4">
                              <h4 className="text-md font-semibold text-gold-400 mb-3">Nominee Information</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-400">Name: </span>
                                  <span className="text-white">{candidate.user?.name || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Email: </span>
                                  <span className="text-white">{candidate.user?.email || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Phone Number: </span>
                                  <span className="text-white">{candidate.user?.phoneNumber || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">City: </span>
                                  <span className="text-white">{candidate.user?.membership?.city || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Membership ID: </span>
                                  <span className="text-white">{candidate.user?.membership?.membershipId || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Membership Category: </span>
                                  <span className="text-white">{candidate.user?.membership?.membershipCategoryRef?.name || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Membership Subcategory: </span>
                                  <span className="text-white">{candidate.user?.membership?.membershipSubCategoryRef?.name || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Organization: </span>
                                  <span className="text-white">{candidate.organization?.name || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Contact Address: </span>
                                  <span className="text-white">{candidate.contactAddress || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">PO Box: </span>
                                  <span className="text-white">{candidate.poBoxNo || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Office Tel: </span>
                                  <span className="text-white">{candidate.officeTel || "N/A"}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Submission Date: </span>
                                  <span className="text-white">{new Date(candidate.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>

                            {/* Section 2: Introducers Information */}
                            <div className="border-t border-gray-600 pt-4">
                              <h4 className="text-md font-semibold text-gold-400 mb-3">Introducers Information</h4>
                              
                              {/* Introducer 1 */}
                              <div className="mb-4 bg-gray-600/30 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className="text-sm font-semibold text-blue-300">Introducer 1</h5>
                                  {candidate.introducer1Signed && (
                                    <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Signed
                                    </span>
                                  )}
                                  {!candidate.introducer1Signed && (
                                    <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">Not Signed</span>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-gray-400">Name: </span>
                                    <span className="text-white">{candidate.introducer1User?.name || "N/A"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Email: </span>
                                    <span className="text-white">{candidate.introducer1User?.email || "N/A"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Phone Number: </span>
                                    <span className="text-white">{candidate.introducer1User?.phoneNumber || "N/A"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Membership ID: </span>
                                    <span className="text-white">{candidate.introducer1User?.membership?.membershipId || "N/A"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Membership Category: </span>
                                    <span className="text-white">{candidate.introducer1User?.membership?.membershipCategoryRef?.name || "N/A"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Membership Subcategory: </span>
                                    <span className="text-white">{candidate.introducer1User?.membership?.membershipSubCategoryRef?.name || "N/A"}</span>
                                  </div>
                                  <div className="md:col-span-2">
                                    <span className="text-gray-400">Organization: </span>
                                    <span className="text-white">{candidate.introducer1User?.membership?.organization?.name || "N/A"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Introducer 2 */}
                              <div className="bg-gray-600/30 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className="text-sm font-semibold text-blue-300">Introducer 2</h5>
                                  {candidate.introducer2Signed && (
                                    <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      Signed
                                    </span>
                                  )}
                                  {!candidate.introducer2Signed && (
                                    <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">Not Signed</span>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-gray-400">Name: </span>
                                    <span className="text-white">{candidate.introducer2User?.name || "N/A"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Email: </span>
                                    <span className="text-white">{candidate.introducer2User?.email || "N/A"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Phone Number: </span>
                                    <span className="text-white">{candidate.introducer2User?.phoneNumber || "N/A"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Membership ID: </span>
                                    <span className="text-white">{candidate.introducer2User?.membership?.membershipId || "N/A"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Membership Category: </span>
                                    <span className="text-white">{candidate.introducer2User?.membership?.membershipCategoryRef?.name || "N/A"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Membership Subcategory: </span>
                                    <span className="text-white">{candidate.introducer2User?.membership?.membershipSubCategoryRef?.name || "N/A"}</span>
                                  </div>
                                  <div className="md:col-span-2">
                                    <span className="text-gray-400">Organization: </span>
                                    <span className="text-white">{candidate.introducer2User?.membership?.organization?.name || "N/A"}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Section 3: Verification by Election Monitoring Committee */}
                            <div className="border-t border-gray-600 pt-4">
                              <h4 className="text-md font-semibold text-gold-400 mb-3">Verification by Election Monitoring Committee</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-400">Status: </span>
                                  <span className={`font-medium ${
                                    candidate.status === "APPROVED" ? "text-emerald-400" :
                                    candidate.status === "REJECTED" ? "text-red-400" :
                                    "text-amber-400"
                                  }`}>
                                    {candidate.status}
                                  </span>
                                </div>
                                {candidate.approver && (
                                  <div>
                                    <span className="text-gray-400">Verified By: </span>
                                    <span className="text-white">{candidate.approver.name}</span>
                                  </div>
                                )}
                                {candidate.remarks && (
                                  <div className="md:col-span-2">
                                    <span className="text-gray-400">Remarks: </span>
                                    <span className="text-white">{candidate.remarks}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Payment Button for Candidates - Show when payment URL is generated (approved) */}
                      {!ability?.can("manage", "DirectorElection") &&
                        candidate.userId === Number(user?.id) &&
                        !candidate.feePaid &&
                        candidate.stripePaymentUrl && (
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => {
                                window.location.href = candidate.stripePaymentUrl!;
                              }}
                              className="px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors font-medium"
                            >
                              Pay Now
                            </button>
                          </div>
                        )}

                      {/* Chairman Actions - Only show for PENDING candidates without payment URL */}
                      <Can I="approve" a="DirectorElection" fallback={null}>
                        {candidate.status === "PENDING" &&
                          !candidate.stripePaymentUrl && (
                          <div className="ml-4">
                            {!candidate.introducer1Signed || !candidate.introducer2Signed ? (
                              <p className="text-amber-400 text-sm font-medium">
                                Waiting for signatures
                              </p>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedCandidate(candidate);
                                    setApproveAction("APPROVED");
                                    setShowApproveModal(true);
                                  }}
                                  className="px-3 py-1 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 text-sm"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedCandidate(candidate);
                                    setApproveAction("REJECTED");
                                    setShowApproveModal(true);
                                  }}
                                  className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                          )}
                      </Can>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Approve/Reject Modal */}
      {showApproveModal && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 border border-gold-500/30 rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gold-500 mb-4">
                {approveAction === "APPROVED" ? "Approve" : "Reject"} Candidate
              </h3>
              <p className="text-gray-300 mb-4">
                {selectedCandidate.user?.name} - {selectedCandidate.user?.email}
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Remarks {approveAction === "REJECTED" && <span className="text-red-400">*</span>}
                </label>
                <textarea
                  value={approveRemarks}
                  onChange={(e) => setApproveRemarks(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                  placeholder={approveAction === "REJECTED" ? "Please provide a reason for rejection..." : "Optional remarks..."}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowApproveModal(false);
                    setSelectedCandidate(null);
                    setApproveRemarks("");
                  }}
                  className="px-4 py-2 border border-gold-500 text-gold-500 rounded-md hover:bg-gold-500/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveCandidate}
                  disabled={approving || (approveAction === "REJECTED" && !approveRemarks.trim())}
                  className={`px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${approveAction === "APPROVED"
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-red-500 text-white hover:bg-red-600"
                    }`}
                >
                  {approving ? "Processing..." : approveAction === "APPROVED" ? "Approve" : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voting Screen Modal */}
      {showVotingScreen && token && (
        <VotingScreen
          electionId={Number(id)}
          candidates={votingCandidates}
          token={token}
          onVoteSuccess={handleVoteSuccess}
          onClose={() => setShowVotingScreen(false)}
          isRunoff={isTied}
        />
      )}

      {/* Cancel Election Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gray-800 border border-red-500/30 rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-xl font-bold text-red-400 mb-4">
                Cancel Election
              </h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to cancel this election? This action cannot be undone. All votes and candidate data will be preserved, but the election will be marked as cancelled.
              </p>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-400">
                  <strong>Warning:</strong> Cancelling an election will stop all voting activities and mark all candidates as not having won.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 border border-gold-500 text-gold-500 rounded-md hover:bg-gold-500/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCancelElection}
                  disabled={cancelling}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelling ? "Cancelling..." : "Cancel Election"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Election Dates Modal */}
      {showUpdateDatesModal && (
        <UpdateElectionDatesModal
          open={showUpdateDatesModal}
          onClose={() => setShowUpdateDatesModal(false)}
          onSubmit={handleUpdateElectionDates}
          existingData={{
            nominationStartDate: election?.nominationStartDate,
            nominationEndDate: election?.nominationEndDate,
            startDate: election?.startDate,
            endDate: election?.endDate,
          }}
        />
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
                  disabled={endingRunoff}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {endingRunoff ? "Ending..." : "End Runoff Voting"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <strong>Note:</strong> The election requires a minimum of 8 approved candidates to start. Currently, there are {shortlistedCandidates.length} shortlisted candidate(s).
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
          <div className="bg-gray-800 border border-red-500/30 rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-xl font-bold text-red-400 mb-4">
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
                  className="px-4 py-2 border border-red-500 text-red-500 rounded-md hover:bg-red-500/10 transition-colors"
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

      {/* Introducer Signing Modal */}
      {showIntroducerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-gray-800 border border-blue-500/30 rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-blue-400">
                  Sign as Introducer
                </h3>
                <button
                  onClick={() => setShowIntroducerModal(false)}
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

              <p className="text-gray-300 mb-6">
                The following candidates have listed you as an introducer. Review their information and sign to endorse their nomination.
              </p>

              {candidatesWhereUserIsIntroducer.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p>No candidates have listed you as an introducer.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {candidatesWhereUserIsIntroducer.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="bg-gray-700 border border-gray-600 rounded-lg p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="text-lg font-semibold text-white">
                              {candidate.user?.name || "Unknown"}
                            </h4>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${getCandidateStatusBadgeClass(
                                candidate.status,
                                candidate.feePaid,
                                candidate.stripePaymentUrl
                              )}`}
                            >
                              {getDisplayStatus(candidate.status, candidate.feePaid, candidate.stripePaymentUrl)}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
                            <div>
                              <span className="text-gray-400">Email: </span>
                              <span className="text-white">{candidate.user?.email || "N/A"}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Organization: </span>
                              <span className="text-white">{candidate.organization?.name || "N/A"}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Contact Address: </span>
                              <span className="text-white">{candidate.contactAddress}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Office Tel: </span>
                              <span className="text-white">{candidate.officeTel}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">PO Box: </span>
                              <span className="text-white">{candidate.poBoxNo}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Listed You As: </span>
                              <span className="text-blue-400 font-medium">
                                {candidate.introducer1User?.id === Number(user?.id) && candidate.introducer2User?.id === Number(user?.id)
                                  ? "Introducer 1 & 2"
                                  : candidate.introducer1User?.id === Number(user?.id)
                                  ? "Introducer 1"
                                  : "Introducer 2"}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm pt-3 border-t border-gray-600">
                            <div>
                              <span className="text-gray-400">Introducer 1: </span>
                              <span className="text-white">{candidate.introducer1User?.name || "N/A"}</span>
                            </div>
                            <div>
                              <span className="text-gray-400">Introducer 2: </span>
                              <span className="text-white">{candidate.introducer2User?.name || "N/A"}</span>
                            </div>
                          </div>
                        </div>

                        {hasUserSignedAsIntroducer(candidate) ? (
                          <div className="px-4 py-2 bg-green-500/20 text-green-400 rounded-md flex items-center gap-2 whitespace-nowrap">
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
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Signed
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              handleSignCandidate(candidate.id);
                              setShowIntroducerModal(false);
                            }}
                            disabled={signingCandidateId === candidate.id}
                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            {signingCandidateId === candidate.id ? (
                              <>
                                <svg
                                  className="animate-spin h-4 w-4"
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
                                Signing...
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
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                                Sign Candidate
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 pt-4 border-t border-gray-700 flex justify-end">
                <button
                  onClick={() => setShowIntroducerModal(false)}
                  className="px-6 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
