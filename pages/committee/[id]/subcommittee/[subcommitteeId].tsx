"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import useAuthStore from "@/store/authStore";
import { toast } from "react-toastify";
import {
  getSubCommitteeById,
  updateSubCommittee,
  removeMemberFromSubCommittee,
  getCommitteeById,
} from "@/services/committee";
import { getCommitteeMeetings } from "@/services/committeeMeeting";
import type { Committee, CommitteeMeeting } from "@/types/committee";
import {
  HiOutlineChevronLeft,
  HiOutlineUser,
  HiOutlineTrash,
  HiOutlinePencil,
} from "react-icons/hi";
import MainLayout from "@/layouts/MainLayout";
import Can from "@/components/rbac/Can";
import { useAbility } from "@/hooks/useAbility";

export default function SubCommitteeDetailPage() {
  const router = useRouter();
  const { id, subcommitteeId } = router.query;
  const token = useAuthStore((s) => s.token);
  const ability = useAbility();
  const canReadSubCommittee = ability?.can("read", "SubCommittee");
  const canReadCommitteeMeeting = ability?.can("read", "CommitteeMeeting");
  const canManageSubCommittee = ability?.can("manage", "SubCommittee");

  const [subCommittee, setSubCommittee] = useState<Committee | null>(null);
  const [parentCommittee, setParentCommittee] = useState<Committee | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [subCommitteeMeetings, setSubCommitteeMeetings] = useState<CommitteeMeeting[]>([]);

  // Edit mode
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingEndDate, setEditingEndDate] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [endDateValue, setEndDateValue] = useState("");

  // Add member modal
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<
    Array<{ id: number; name: string; email: string }>
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState<
    Array<{ userId: number; role: "HEAD" | "MEMBER" | "SECRETARY" | "TREASURER" }>
  >([]);

  // Confirmation dialog for removing member
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ userId: number; name: string } | null>(null);

  const loadSubCommittee = async () => {
    if (!token || !id || !subcommitteeId) return;
    setLoading(true);
    try {
      const committeeId = Array.isArray(id) ? id[0] : id;
      const subId = Array.isArray(subcommitteeId)
        ? subcommitteeId[0]
        : subcommitteeId;
      
      const parentData = await getCommitteeById(token, committeeId);
      setParentCommittee(parentData);
      
      // Load sub-committee
      const data = await getSubCommitteeById(token, committeeId, subId);
      setSubCommittee(data);
      setNameValue(data.name || "");
      setDescriptionValue(data.details || "");
      if (data.endDate) {
        setEndDateValue(new Date(data.endDate).toISOString().split("T")[0]);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load sub-committee");
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    if (!token || !parentCommittee) return;
    
    // Use parent committee members
    if (parentCommittee.members) {
      setAvailableUsers(
        parentCommittee.members.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
        }))
      );
      setLoadingUsers(false);
    }
  };

  const loadSubCommitteeMeetings = async () => {
    if (!token || !subcommitteeId) return;

    setLoadingMeetings(true);
    try {
      const subId = Array.isArray(subcommitteeId)
        ? subcommitteeId[0]
        : subcommitteeId;
      const meetingsResponse = await getCommitteeMeetings(token, 1, 50, {
        subCommitteeId: Number(subId),
      });
      setSubCommitteeMeetings(meetingsResponse.data || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load sub-committee meetings");
    } finally {
      setLoadingMeetings(false);
    }
  };

  useEffect(() => {
    if (token && !canReadSubCommittee) {
      toast.error("You are not authorized to access this page. Routing you back to the homepage");
      router.push("/userMarketplace");
      return;
    }

    loadSubCommittee();
    if (canReadCommitteeMeeting) {
      loadSubCommitteeMeetings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, subcommitteeId, token, canReadSubCommittee, canReadCommitteeMeeting, router]);

  const getMeetingStatusClasses = (status: CommitteeMeeting["meetingStatus"]) => {
    if (status === "PENDING") return "bg-gold-500/20 text-gold-300";
    if (status === "ONGOING") return "bg-blue-500/20 text-blue-300";
    if (status === "COMPLETED") return "bg-green-500/20 text-green-300";
    return "bg-red-500/20 text-red-300";
  };

  const handleUpdateName = async () => {
    if (!token || !id || !subcommitteeId || !nameValue.trim()) {
      toast.error("Please enter a name");
      return;
    }

    setSubmitting(true);
    try {
      const committeeId = Array.isArray(id) ? id[0] : id;
      const subId = Array.isArray(subcommitteeId)
        ? subcommitteeId[0]
        : subcommitteeId;
      await updateSubCommittee(token, committeeId, subId, { name: nameValue });
      toast.success("Name updated successfully");
      setEditingName(false);
      await loadSubCommittee();
    } catch (e: any) {
      toast.error(e.message || "Failed to update name");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDescription = async () => {
    if (!token || !id || !subcommitteeId) return;

    setSubmitting(true);
    try {
      const committeeId = Array.isArray(id) ? id[0] : id;
      const subId = Array.isArray(subcommitteeId)
        ? subcommitteeId[0]
        : subcommitteeId;
      await updateSubCommittee(token, committeeId, subId, {
        details: descriptionValue,
      });
      toast.success("Description updated successfully");
      setEditingDescription(false);
      await loadSubCommittee();
    } catch (e: any) {
      toast.error(e.message || "Failed to update description");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateEndDate = async () => {
    if (!token || !id || !subcommitteeId) {
      toast.error("Please select an end date");
      return;
    }

    if (!endDateValue) {
      toast.error("Please select an end date");
      return;
    }

    if (subCommittee?.startDate) {
      const start = new Date(subCommittee.startDate);
      const end = new Date(endDateValue);
      if (start >= end) {
        toast.error("End date must be after start date");
        return;
      }
    }

    setSubmitting(true);
    try {
      const committeeId = Array.isArray(id) ? id[0] : id;
      const subId = Array.isArray(subcommitteeId)
        ? subcommitteeId[0]
        : subcommitteeId;
      const end = new Date(endDateValue);
      await updateSubCommittee(token, committeeId, subId, {
        endDate: end.toISOString(),
      });
      toast.success("End date updated successfully");
      setEditingEndDate(false);
      await loadSubCommittee();
    } catch (e: any) {
      toast.error(e.message || "Failed to update end date");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMembers = async () => {
    if (!token || !id || !subcommitteeId || selectedMembersToAdd.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    setSubmitting(true);
    try {
      const committeeId = Array.isArray(id) ? id[0] : id;
      const subId = Array.isArray(subcommitteeId)
        ? subcommitteeId[0]
        : subcommitteeId;
      const payload = {
        members: selectedMembersToAdd,
      };
      await updateSubCommittee(token, committeeId, subId, payload);
      toast.success("Members added successfully");
      setShowAddMember(false);
      setSelectedMembersToAdd([]);
      setMemberSearchQuery("");
      await loadSubCommittee();
    } catch (e: any) {
      toast.error(e.message || "Failed to add members");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: number, memberName: string) => {
    if (!token || !id || !subcommitteeId) return;
    setMemberToRemove({ userId, name: memberName });
    setShowRemoveConfirmation(true);
  };

  const confirmRemoveMember = async () => {
    if (!token || !id || !subcommitteeId || !memberToRemove) return;

    setSubmitting(true);
    try {
      const committeeId = Array.isArray(id) ? id[0] : id;
      const subId = Array.isArray(subcommitteeId)
        ? subcommitteeId[0]
        : subcommitteeId;
      await removeMemberFromSubCommittee(token, committeeId, subId, memberToRemove.userId);
      toast.success("Member removed successfully");
      await loadSubCommittee();
    } catch (e: any) {
      toast.error(e.message || "Failed to remove member");
    } finally {
      setSubmitting(false);
      setShowRemoveConfirmation(false);
      setMemberToRemove(null);
    }
  };

  const filteredUsers = availableUsers.filter(
    (user) =>
      !subCommittee?.members?.some((m) => m.user.id === user.id) &&
      (user.name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(memberSearchQuery.toLowerCase()))
  );

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (!subCommittee) {
    return (
      <div className="min-h-screen text-white flex flex-col items-center justify-center p-4">
        <p className="text-xl text-gray-400 mb-4">Sub-committee not found</p>
        <button
          onClick={() => {
            const committeeId = Array.isArray(id) ? id[0] : id;
            router.push(`/committee/${committeeId}`);
          }}
          className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors font-medium"
        >
          Back to Committee
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white flex flex-col p-4">
      {/* Header */}
      <button
        onClick={() => {
          const committeeId = Array.isArray(id) ? id[0] : id;
          router.push(`/committee/${committeeId}`);
        }}
        className="flex items-center text-gray-400 hover:text-gold-400 mb-4 transition-colors w-fit"
      >
        {/* @ts-ignore */}
        <HiOutlineChevronLeft className="mr-2" />
        Back to Committee
      </button>

      <div className="space-y-6">
        {/* Sub-Committee Info Card */}
        <div className="bg-gray-800 border border-gold-500 rounded-xl p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              {editingName ? (
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  />
                  <button
                    onClick={handleUpdateName}
                    disabled={submitting}
                    className="px-3 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md disabled:opacity-60 transition-colors font-medium text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-gold-500">
                    {subCommittee.name}
                  </h1>
                  <Can I="update" a="SubCommittee">
                    <button
                      onClick={() => setEditingName(true)}
                      className="text-gold-400 hover:text-gold-300 transition-colors"
                      title="Edit name"
                    >
                      {/* @ts-ignore */}
                      <HiOutlinePencil className="w-5 h-5" />
                    </button>
                  </Can>
                </div>
              )}
              <p className="text-gray-400">
                Sub-Committee ID: {subCommittee.id}
              </p>
            </div>
            <span
              className={`px-3 py-1 text-sm font-semibold rounded-full ${
                subCommittee.isActive
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {subCommittee.isActive ? "Active" : "Inactive"}
            </span>
          </div>

          {/* Description */}
          <div className="mb-6 pb-6 border-b border-gray-700">
            <div className="flex justify-between items-start mb-2">
              <p className="text-gray-400 text-sm">Description</p>
              <Can I="update" a="SubCommittee">
                {!editingDescription && (
                  <button
                    onClick={() => setEditingDescription(true)}
                    className="text-gold-400 hover:text-gold-300 transition-colors"
                    title="Edit description"
                  >
                    {/* @ts-ignore */}
                    <HiOutlinePencil className="w-4 h-4" />
                  </button>
                )}
              </Can>
            </div>

            {editingDescription ? (
              <div className="flex gap-2">
                <textarea
                  value={descriptionValue}
                  onChange={(e) => setDescriptionValue(e.target.value)}
                  rows={3}
                  className="flex-1 px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 resize-none"
                />
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleUpdateDescription}
                    disabled={submitting}
                    className="px-3 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md disabled:opacity-60 transition-colors font-medium text-sm whitespace-nowrap"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingDescription(false);
                      setDescriptionValue(subCommittee?.details || "");
                    }}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-white">
                {subCommittee?.details || "No description"}
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-700">
            <div>
              <p className="text-gray-400 text-sm mb-1">Start Date</p>
              <p className="text-lg text-white font-medium">
                {formatDate(subCommittee.startDate)}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-gray-400 text-sm">End Date</p>
                <Can I="update" a="SubCommittee">
                  {!editingEndDate && (
                    <button
                      onClick={() => setEditingEndDate(true)}
                      className="text-gold-400 hover:text-gold-300 transition-colors"
                      title="Edit end date"
                    >
                      {/* @ts-ignore */}
                      <HiOutlinePencil className="w-4 h-4" />
                    </button>
                  )}
                </Can>
              </div>

              {editingEndDate ? (
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={endDateValue}
                    onChange={(e) => setEndDateValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  />
                  <button
                    onClick={handleUpdateEndDate}
                    disabled={submitting}
                    className="px-3 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md disabled:opacity-60 transition-colors font-medium text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingEndDate(false)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <p className="text-lg text-white font-medium">
                  {formatDate(subCommittee.endDate)}
                </p>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="text-sm text-gray-400">
            <p>Created: {formatDate(subCommittee.createdAt)}</p>
            <p>Updated: {formatDate(subCommittee.updatedAt)}</p>
          </div>
        </div>

        {/* Sub-Committee Meetings Section */}
        <div className="bg-gray-800 border border-gold-500 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gold-500">
              Sub-Committee Meetings ({subCommitteeMeetings.length})
            </h2>
          </div>

          {!canReadCommitteeMeeting ? (
            <div className="text-center py-8 text-gray-400">
              <p>You do not have permission to view meetings</p>
            </div>
          ) : loadingMeetings ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500 mx-auto"></div>
              <p className="text-gray-400 mt-3">Loading meetings...</p>
            </div>
          ) : subCommitteeMeetings.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No meetings scheduled for this sub-committee yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {subCommitteeMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
                  onClick={() => {
                    const committeeId = Array.isArray(id) ? id[0] : id;
                    if (!committeeId) return;
                    router.push(`/committee/${committeeId}/meeting/${meeting.id}`);
                  }}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gold-400 truncate">
                        {meeting.title}
                      </h3>
                      {meeting.details ? (
                        <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                          {meeting.details}
                        </p>
                      ) : null}
                      <div className="flex items-center gap-2 mt-3 text-sm text-gray-300 flex-wrap">
                        <span>{formatDate(meeting.startDate)}</span>
                        <span className="text-gray-500">to</span>
                        <span>{formatDate(meeting.endDate)}</span>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getMeetingStatusClasses(
                        meeting.meetingStatus
                      )}`}
                    >
                      {meeting.meetingStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members Section */}
        <div className="bg-gray-800 border border-gold-500 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gold-500">
              Members ({subCommittee.members?.length || 0})
            </h2>
            <Can I="manage" a="SubCommittee">
              <button
                onClick={() => {
                  setShowAddMember(true);
                  loadAvailableUsers();
                }}
                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors font-medium flex items-center"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
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
                Add Member
              </button>
            </Can>
          </div>

          {/* Members List */}
          {subCommittee.members && subCommittee.members.length > 0 ? (
            <div className="space-y-3">
              {subCommittee.members.map((member) => (
                <div
                  key={member.user.id}
                  className="flex items-center justify-between p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* @ts-ignore */}
                    <HiOutlineUser className="w-5 h-5 text-gold-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {member.user?.name || `User ${member.user.id}`}
                      </p>
                      <p className="text-sm text-gray-400 truncate">
                        {member.user?.email || "No email"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-gold-500/20 text-gold-300 text-sm font-medium rounded">
                      {member.role}
                    </span>
                    <Can I="manage" a="SubCommittee">
                      <button
                        onClick={() => handleRemoveMember(member.user.id, member.user?.name || `User ${member.user.id}`)}
                        disabled={submitting}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove member"
                      >
                        {/* @ts-ignore */}
                        <HiOutlineTrash className="w-5 h-5" />
                      </button>
                    </Can>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <p>No members assigned yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Members Modal */}
      {showAddMember && canManageSubCommittee && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Add Members
                </h2>
                <button
                  onClick={() => setShowAddMember(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
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

              {/* Search */}
              <input
                type="text"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value)}
                placeholder="Search members by name or email..."
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 mb-4"
              />

              {/* Users List */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-700/50 mb-6">
                {filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {availableUsers.length === 0
                      ? "No users available (parent committee has no members)"
                      : "No users available to add"}
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelected = selectedMembersToAdd.some(
                      (m) => m.userId === user.id
                    );
                    const selectedMember = selectedMembersToAdd.find(
                      (m) => m.userId === user.id
                    );
                    return (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 border-b border-gray-200 dark:border-gray-600 last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedMembersToAdd(
                                selectedMembersToAdd.filter(
                                  (m) => m.userId !== user.id
                                )
                              );
                            } else {
                              setSelectedMembersToAdd([
                                ...selectedMembersToAdd,
                                { userId: user.id, role: "MEMBER" as const },
                              ]);
                            }
                          }}
                          className="h-4 w-4 rounded cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {user.email}
                          </div>
                        </div>
                        {isSelected && (
                          <select
                            value={selectedMember?.role || "MEMBER"}
                            onChange={(e) => {
                              setSelectedMembersToAdd(
                                selectedMembersToAdd.map((m) =>
                                  m.userId === user.id
                                    ? {
                                        ...m,
                                        role: e.target.value as
                                          | "HEAD"
                                          | "MEMBER"
                                          | "SECRETARY"
                                          | "TREASURER",
                                      }
                                    : m
                                )
                              );
                            }}
                            className="px-2 py-1 text-sm rounded-md bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                          >
                            <option value="HEAD">HEAD</option>
                            <option value="MEMBER">MEMBER</option>
                            <option value="SECRETARY">SECRETARY</option>
                            <option value="TREASURER">TREASURER</option>
                          </select>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleAddMembers}
                  disabled={submitting || selectedMembersToAdd.length === 0}
                  className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md disabled:opacity-60 flex items-center transition-colors font-medium"
                >
                  {submitting ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-black"
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
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Adding...
                    </>
                  ) : (
                    "Add Members"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {showRemoveConfirmation && memberToRemove && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Remove Member
                </h2>
                <button
                  onClick={() => {
                    setShowRemoveConfirmation(false);
                    setMemberToRemove(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
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

              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Are you sure you want to remove <span className="font-semibold text-gray-900 dark:text-white">{memberToRemove.name}</span> from this sub-committee?
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRemoveConfirmation(false);
                    setMemberToRemove(null);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmRemoveMember}
                  disabled={submitting}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md disabled:opacity-60 transition-colors font-medium flex items-center"
                >
                  {submitting ? (
                    <>
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
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Removing...
                    </>
                  ) : (
                    "Remove Member"
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

SubCommitteeDetailPage.getLayout = (page: React.ReactNode) => (
  <MainLayout activeMenu="committee">{page}</MainLayout>
);
