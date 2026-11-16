"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ElectionType, type Election } from "@/types/election";
import { createElection, fetchAllElections } from "@/services/election";
import {
  createDirectorElection,
  fetchAllDirectorElections,
} from "@/services/directorElection";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import useAuthStore from "@/store/authStore";
import ElectionModal from "@/components/elections/election-modal";
import DirectorElectionModal from "@/components/elections/director-election-modal";
import Can from "@/components/rbac/Can";
import { Roles } from "@/enums/Roles";
import { useAbility } from "@/hooks/useAbility";
import VatBreakdown from "@/components/ui/VatBreakdown";
import Filter, { FilterField } from "@/components/common/Filter";

export default function Elections() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const ability = useAbility();

  const [allElections, setAllElections] = useState<Election[]>([]);

  const [activeElections, setActiveElections] = useState<Election[]>([]);

  const [directorElections, setDirectorElections] = useState<any[]>([]);
  const [directorElectionFilters, setDirectorElectionFilters] = useState<Record<string, string>>({});

  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (router.isReady && router.query.tab) {
      const tab = router.query.tab as string;
      if (["all", "active", "director"].includes(tab)) {
        setActiveTab(tab);
      }
    }
  }, [router.isReady, router.query.tab]);

  // Modal state
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openCreateDirectorModal, setOpenCreateDirectorModal] = useState(false);

  // User membership state to check canVote
  const [userWithMembership, setUserWithMembership] = useState<any>(null);
  const [canVote, setCanVote] = useState(false);

  const getAllElections = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const elections = await fetchAllElections(token); // no page or limit
      setAllElections(elections);

      const active = elections.filter(
        (election) =>
          election.state === "ACTIVE" &&
          new Date(election.startDate) <= new Date(),
      );
      setActiveElections(active);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch elections";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle election creation
  const handleCreateElection = async (electionData: any) => {
    if (!token) {
      toast.error("You must be logged in to create an election");
      return;
    }

    setLoading(true);
    try {
      await createElection(token, electionData);
      toast.success("Election created successfully");
      setOpenCreateModal(false);
      getAllElections();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create election";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch director elections
  const getAllDirectorElections = async () => {
    if (!token || !ability?.can("read", "DirectorElection")) return;

    setLoading(true);
    try {
      const data = await fetchAllDirectorElections(token); // no page or limit
      setDirectorElections(data.data || []);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch director elections";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDirectorElection = async (electionData: {
    title: string;
    term: string;
    feeAmount: number;
    ruleId: number;
    nominationStartDate: string;
    nominationEndDate: string;
    startDate: string;
    endDate: string;
  }) => {
    if (!token) {
      toast.error("You must be logged in to create a director election");
      return;
    }

    if (!ability?.can("create", "DirectorElection")) {
      toast.error("You do not have permission to create director elections");
      return;
    }
    setLoading(true);
    try {
      await createDirectorElection(token, electionData);
      toast.success("Director election created successfully");
      setOpenCreateDirectorModal(false);
      getAllDirectorElections();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create director election";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const navigateToElection = (election: Election) => {
    const now = new Date();
    const endDate = new Date(election.endDate);

    if (now > endDate) {
      router.push(`/election/results/${election.id}`);
    } else {
      router.push(`/election/${election.id}`);
    }
  };
  useEffect(() => {
    const fetchUserWithMembership = async () => {
      if (!token) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/user`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              token,
            },
          },
        );

        if (response.ok) {
          const userData = await response.json();
          if (userData.data) {
            setUserWithMembership(userData.data);
            const hasCanVote =
              userData.data?.membership?.membershipSubCategoryRef?.canVote ===
              true;
            setCanVote(hasCanVote);
          }
        }
      } catch (error) {
        console.error("Error fetching user membership:", error);
      }
    };

    fetchUserWithMembership();
  }, [token]);

  useEffect(() => {
    if (token && user) {
      getAllElections();
      if (
        activeTab === "director" &&
        ability?.can("read", "DirectorElection") &&
        canVote
      ) {
        getAllDirectorElections();
      }
    }
  }, [token, user, ability, canVote]);

  useEffect(() => {
    if (
      token &&
      user &&
      activeTab === "director" &&
      ability?.can("read", "DirectorElection") &&
      canVote
    ) {
      getAllDirectorElections();
    }
  }, [activeTab, token, user, ability, canVote]);

  // Get election status badge
  const getStatusBadge = (election: Election) => {
    const now = new Date();
    const startDate = new Date(election.startDate);
    const endDate = new Date(election.endDate);

    if (now < startDate) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-amber-500 text-black">
          Upcoming
        </span>
      );
    } else if (now > endDate) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-gray-500 text-white">
          Ended
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-emerald-500 text-black">
          Active
        </span>
      );
    }
  };

  const getStatusBadgeForType = (election: Election) => {
    if (election.type === ElectionType.POLICY_ELECTION) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-blue-500 text-black">
          Policy
        </span>
      );
    } else if (election.type === ElectionType.CANDIDATE_ELECTION) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-rose-400 text-black">
          Candidate
        </span>
      );
    } else if (election.type === ElectionType.POLLING_ELECTION) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-purple-500 text-black">
          Polling
        </span>
      );
    }
    return null;
  };

  // Render election cards
  const renderElectionCards = (elections: Election[]) => {
    if (loading) {
      return (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      );
    }

    if (elections.length === 0) {
      return (
        <div className="text-center py-10 text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mx-auto h-12 w-12 mb-4 text-gold-500/50"
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
          <h3 className="text-lg font-medium">No elections found</h3>
          <p className="mt-2">
            {activeTab === "all"
              ? "Create your first election to get started"
              : activeTab === "active"
                ? "There are currently no active elections"
                : "You haven't created any elections yet"}
          </p>
        </div>
      );
    }
    return (
      <>
        {elections.map((election) => (
          <div
            key={election.id}
            className="bg-gray-800 border border-gold-500/30 hover:border-gold-500 rounded-xl p-5 cursor-pointer transition-all"
            onClick={() => navigateToElection(election)}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl text-gold-500 font-bold">
                    {election.title}
                  </h2>
                  {getStatusBadge(election)}

                  {getStatusBadgeForType(election)}
                </div>
                <p className="text-gray-300 text-sm mt-1">
                  {election.description}
                </p>
                <div className="flex items-center gap-2 mt-3 text-gray-300">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-gold-500 w-4 h-4"
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
                  <span className="text-sm">
                    {formatDateAndTime(election.startDate, true, true)} -{" "}
                    {formatDateAndTime(election.endDate, true, true)}
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <button className="w-8 h-8 rounded-full bg-gold-500/10 hover:bg-gold-500/20 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gold-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </>
    );
  };

  // Filter director elections by status
  const getFilteredDirectorElections = () => {
    if (!directorElectionFilters.status) {
      return directorElections;
    }
    return directorElections.filter(
      (election) =>
        (election.status || "UPCOMING").toUpperCase() ===
        directorElectionFilters.status.toUpperCase(),
    );
  };

  // Director Election Filter Fields
  const directorElectionFilterFields: FilterField[] = [
    {
      name: "status",
      label: "Status",
      options: [
        { value: "UPCOMING", label: "Upcoming" },
        { value: "ONGOING", label: "Ongoing" },
        { value: "COMPLETED", label: "Completed" },
        { value: "CANCELLED", label: "Cancelled" },
      ],
    },
  ];

  const handleDirectorElectionFilterChange = (
    filters: Record<string, string>,
  ) => {
    setDirectorElectionFilters((prev) => ({
      ...prev,
      ...filters,
    }));
  };

  const handleDirectorElectionFilterApply = (
    filters: Record<string, string>,
  ) => {
    setDirectorElectionFilters(filters);
  };

  const handleDirectorElectionFilterClear = () => {
    setDirectorElectionFilters({});
  };

  // Render director election cards
  const renderDirectorElectionCards = (elections: any[]) => {
    if (loading) {
      return (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      );
    }

    if (elections.length === 0) {
      return (
        <div className="text-center py-10 text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mx-auto h-12 w-12 mb-4 text-gold-500/50"
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
          <h3 className="text-lg font-medium">No director elections found</h3>
          <p className="mt-2">
            Create your first director election to get started
          </p>
        </div>
      );
    }

    return (
      <>
        {elections.map((election) => (
          <div
            key={election.id}
            className="bg-gray-800 border border-gold-500/30 hover:border-gold-500 rounded-xl p-5 cursor-pointer transition-all"
            onClick={() => router.push(`/election/director/${election.id}`)}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl text-gold-500 font-bold">
                    {election.title}
                  </h2>
                  <span className="px-2 py-1 text-xs rounded-full bg-indigo-500 text-white">
                    Director
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-gray-500 text-white">
                    {election.status || "UPCOMING"}
                  </span>
                </div>
                <p className="text-gray-300 text-sm mt-1">
                  Term: {election.term}
                </p>
                <div className="flex items-center gap-4 mt-3 text-gray-300">
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="text-gold-500 w-4 h-4"
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
                    <span className="text-sm">Fee</span>
                  </div>
                  {election._count && (
                    <div className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="text-gold-500 w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <span className="text-sm">
                        {election._count.candidates || 0} Total Candidates
                      </span>
                    </div>
                  )}
                </div>
                {(election.nominationStartDate ||
                  election.nominationEndDate ||
                  election.startDate ||
                  election.endDate) && (
                  <div className="mt-3 space-y-2 text-sm text-gray-400">
                                    <div className="mt-3 max-w-xs">
                                      <VatBreakdown baseAmount={election.feeAmount} compact />
                                    </div>
                    {election.nominationStartDate &&
                      election.nominationEndDate && (
                        <div className="flex items-center gap-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="text-gold-500 w-4 h-4"
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
                          <span>
                            Nomination:{" "}
                            {formatDateAndTime(
                              election.nominationStartDate,
                              true,
                              true,
                            )}{" "}
                            -{" "}
                            {formatDateAndTime(
                              election.nominationEndDate,
                              true,
                              true,
                            )}
                          </span>
                        </div>
                      )}
                    {election.startDate && election.endDate && (
                      <div className="flex items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-gold-500 w-4 h-4"
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
                        <span>
                          Election:{" "}
                          {formatDateAndTime(election.startDate, true, true)} -{" "}
                          {formatDateAndTime(election.endDate, true, true)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center">
                <button className="w-8 h-8 rounded-full bg-gold-500/10 hover:bg-gold-500/20 flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-gold-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col p-4">
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800 flex-1 flex-row">
        <div className="flex flex-col items-start justify-between lg:flex mb-6">
          <div className="flex flex-row items-center justify-between gap-4 w-full">
            {activeTab !== "director" && (
              <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
                Elections
              </h3>
            )}
            <div className="flex flex-row gap-5">
              {activeTab !== "director" && (
                <>
                  <Can I="create" a="Election">
                    <button
                      onClick={() => setOpenCreateModal(true)}
                      className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-800 rounded-md transition-colors flex items-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-2"
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
                      Create Election
                    </button>
                  </Can>
                  <Can I="read" a="Policy">
                    <button
                      onClick={() => router.push(`/election/policy`)}
                      className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-800 rounded-md transition-colors flex items-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5h6M9 3h6a2 2 0 012 2v2H7V5a2 2 0 012-2zm3 7h4m-4 4h4m-4 4h4m-6 0H7m0-4h2m-2-4h2"
                        />
                      </svg>
                      Policies
                    </button>
                  </Can>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Filter for Director Elections - Above Tabs */}
        {activeTab === "director" && canVote && (
          <Can I="read" a="DirectorElection" fallback={null}>
            <div className="mt-6">
              <Filter
                heading="Director Elections"
                filters={directorElectionFilters}
                onChange={handleDirectorElectionFilterChange}
                onApply={handleDirectorElectionFilterApply}
                onClear={handleDirectorElectionFilterClear}
                fields={directorElectionFilterFields}
                customButton={
                  <div className="flex items-center gap-3">
                    <Can I="create" a="DirectorElection" fallback={null}>
                      <button
                        onClick={() => setOpenCreateDirectorModal(true)}
                        className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-800 rounded-md transition-colors flex items-center text-sm"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-2"
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
                        Create Director Election
                      </button>
                    </Can>
                    <Can I="read" a="Election">
                      <button
                        onClick={() => router.push(`/election/rules`)}
                        className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-800 rounded-md transition-colors flex items-center text-sm"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-2"
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
                        Election Rules
                      </button>
                    </Can>
                  </div>
                }
              />
            </div>
          </Can>
        )}

        {/* Custom Tabs */}
        <div className="mt-6">
          <div className="flex border-b border-gray-800">
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === "all"
                  ? "text-gold-500 border-b-2 border-gold-500"
                  : "text-gray-400 hover:text-gray-300"
              }`}
              onClick={() => {
                setActiveTab("all");
                setDirectorElectionFilters({});
              }}
            >
              All Elections
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === "active"
                  ? "text-gold-500 border-b-2 border-gold-500"
                  : "text-gray-400 hover:text-gray-300"
              }`}
              onClick={() => {
                setActiveTab("active");
                setDirectorElectionFilters({});
              }}
            >
              Active Elections
            </button>
            {canVote && (
              <Can I="read" a="DirectorElection" fallback={null}>
                <button
                  className={`px-4 py-2 font-medium ${
                    activeTab === "director"
                      ? "text-gold-500 border-b-2 border-gold-500"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                  onClick={() => {
                    setActiveTab("director");
                    setDirectorElectionFilters({});
                  }}
                >
                  Director Elections
                </button>
              </Can>
            )}
          </div>

          <div className="mt-6 space-y-6">
            {activeTab === "all" && renderElectionCards(allElections)}
            {activeTab === "active" && renderElectionCards(activeElections)}
            {canVote && (
              <Can I="read" a="DirectorElection" fallback={null}>
                {activeTab === "director" &&
                  renderDirectorElectionCards(getFilteredDirectorElections())}
              </Can>
            )}
          </div>
        </div>

        {/* Election Creation Modal */}
        {openCreateModal && (
          <ElectionModal
            open={openCreateModal}
            onClose={() => setOpenCreateModal(false)}
            onSubmit={handleCreateElection}
          />
        )}

        {/* Director Election Creation Modal */}
        <Can I="create" a="DirectorElection" fallback={null}>
          {openCreateDirectorModal && (
            <DirectorElectionModal
              open={openCreateDirectorModal}
              onClose={() => setOpenCreateDirectorModal(false)}
              onSubmit={handleCreateDirectorElection}
            />
          )}
        </Can>
      </div>
    </div>
  );
}
