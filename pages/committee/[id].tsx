"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import useAuthStore from "@/store/authStore";
import { toast } from "react-toastify";
import {
  getCommitteeById,
  updateCommittee,
  fetchAllUsers,
  removeMemberFromCommittee,
  createSubCommittee,
  deleteSubCommittee,
  deleteCommittee,
  getSubCommitteeById,
  removeMemberFromSubCommittee,
  deleteCommitteeContent,
} from "@/services/committee";
import {
  createCommitteeMeeting,
  getCommitteeMeetings,
  getPendingActionPoints,
} from "@/services/committeeMeeting";
import type { Committee, CommitteeMember, CommitteeContent } from "@/types/committee";
import type { UserProfile } from "@/types/user";
import { HiOutlineChevronLeft, HiOutlineUser, HiOutlineTrash, HiOutlinePencil, HiOutlineDocument, HiOutlinePhotograph, HiOutlineVideoCamera, HiOutlinePresentationChartLine } from "react-icons/hi";
import MainLayout from "@/layouts/MainLayout";
import { COMMON_TIMEZONES } from "@/constants/datetime";
import Can from "@/components/rbac/Can";
import { useAbility } from "@/hooks/useAbility";
const CKEditorClient = dynamic(() => import("@/components/CKEditorClient"), {
  ssr: false,
  loading: () => <p className="text-gray-400">Loading Editor...</p>,
});
import { ADMIN_ROLES } from "@/enums/Roles";
import UploadContentModal from "@/components/committee/UploadContentModal";
import Pagination from "@/components/common/Pagination";

const toDateTimeLocalValue = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

const getCurrentMinuteDate = () => {
  const now = new Date();
  now.setSeconds(0, 0);
  return now;
};

const getMinMeetingDateTime = (startDateTime?: string) => {
  const now = getCurrentMinuteDate();
  if (!startDateTime) return now;

  const parsedStart = new Date(startDateTime);
  if (Number.isNaN(parsedStart.getTime())) return now;

  return parsedStart > now ? parsedStart : now;
};

const decodeHtmlEntities = (value: string) => {
  let decoded = value;
  for (let i = 0; i < 4; i += 1) {
    const next = decoded
      .replace(/&amp;|&#0*38;?|&#x0*26;?/gi, "&")
      .replace(/&lt;|&#0*60;?|&#x0*3c;?/gi, "<")
      .replace(/&gt;|&#0*62;?|&#x0*3e;?/gi, ">")
      .replace(/&quot;|&#0*34;?|&#x0*22;?/gi, '"')
      .replace(/&#39;|&apos;|&#x0*27;?/gi, "'")
      .replace(/&nbsp;|&#0*160;?|&#x0*a0;?/gi, " ");
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
};

export default function CommitteeDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const ability = useAbility();
  const canReadCommittee = ability?.can("read", "Committee");
  const canReadCommitteeMeeting = ability?.can("read", "CommitteeMeeting");
  const canManageCommittee = ability?.can("manage", "Committee");
  const canCreateSubCommittee = ability?.can("create", "SubCommittee");
  const canCreateCommitteeMeeting = ability?.can("create", "CommitteeMeeting");

  const [committee, setCommittee] = useState<Committee | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingEndDate, setEditingEndDate] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [endDateValue, setEndDateValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTopTab, setActiveTopTab] = useState<"details" | "meetings" | "documents">("details");
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [deletingContentId, setDeletingContentId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"members" | "subcommittees">("members");
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState<
    Array<{ userId: number; role: "HEAD" | "MEMBER" | "SECRETARY" | "TREASURER" }>
  >([]);
  const [showCreateSubCommittee, setShowCreateSubCommittee] = useState(false);
  const [subCommitteeName, setSubCommitteeName] = useState("");
  const [subCommitteeDescription, setSubCommitteeDescription] = useState("");
  const [subCommitteeStartDate, setSubCommitteeStartDate] = useState("");
  const [subCommitteeEndDate, setSubCommitteeEndDate] = useState("");
  const [selectedSubCommitteeMembers, setSelectedSubCommitteeMembers] = useState<
    Array<{ userId: number; role: "HEAD" | "MEMBER" | "SECRETARY" | "TREASURER" }>
  >([]);
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ userId: number; name: string } | null>(null);
  const [showDeleteSubCommitteeConfirmation, setShowDeleteSubCommitteeConfirmation] = useState(false);
  const [subCommitteeToDelete, setSubCommitteeToDelete] = useState<{ id: number; name: string } | null>(null);
  const [showDeleteCommitteeModal, setShowDeleteCommitteeModal] = useState(false);
  const [deletingCommittee, setDeletingCommittee] = useState(false);
  const [meetingSort, setMeetingSort] = useState<"newest" | "oldest">("newest");
  const [meetingStatusFilter, setMeetingStatusFilter] = useState<"" | "PENDING" | "ONGOING" | "COMPLETED" | "CANCELLED">("");
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [meetingsCurrentPage, setMeetingsCurrentPage] = useState(1);
  const [meetingsTotalPages, setMeetingsTotalPages] = useState(0);
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDetails, setMeetingDetails] = useState("");
  const [meetingVenue, setMeetingVenue] = useState("");
  const [meetingStartDateTime, setMeetingStartDateTime] = useState("");
  const [meetingEndDateTime, setMeetingEndDateTime] = useState("");
  const [meetingTimezone, setMeetingTimezone] = useState("Asia/Karachi");
  const [selectedMeetingSubCommitteeId, setSelectedMeetingSubCommitteeId] = useState<number | "">("");
  const [selectedMeetingSubCommittee, setSelectedMeetingSubCommittee] = useState<Committee | null>(null);
  const [loadingMeetingSubCommitteeMembers, setLoadingMeetingSubCommitteeMembers] = useState(false);
  const [selectedMeetingAttendees, setSelectedMeetingAttendees] = useState<number[]>([]);
  const [actionPoints, setActionPoints] = useState<Array<{ description: string; assignedTo?: number }>>([]);
  const [newActionPointDescription, setNewActionPointDescription] = useState("");
  const [newActionPointAssignedTo, setNewActionPointAssignedTo] = useState<number | "">("");
    const [pendingActionPoints, setPendingActionPoints] = useState<any[]>([]);
  const [loadingPendingActionPoints, setLoadingPendingActionPoints] = useState(false);
  const [selectedPendingActionPoints, setSelectedPendingActionPoints] = useState<number[]>([]);
  const [pendingActionPointAssignments, setPendingActionPointAssignments] = useState<Record<number, number | "">>({});

  const loadCommittee = async () => {
    if (!token || !id) return;
    setLoading(true);
    try {
      const committeeId = Array.isArray(id) ? id[0] : id;
      const data = await getCommitteeById(token, committeeId);
      setCommittee(data);
      setNameValue(data.name || "");
      setDescriptionValue(data.details || "");
      if (data.endDate) {
        setEndDateValue(new Date(data.endDate).toISOString().split("T")[0]);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to load committee");
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const data = await fetchAllUsers(token);
      setAvailableUsers(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const meetingLimit = 10;

  const loadMeetings = async (page: number = 1) => {
    if (!token || !id) return;
    setLoadingMeetings(true);
    try {
      const data = await getCommitteeMeetings(token, page, meetingLimit, {
        committeeId: Array.isArray(id) ? Number(id[0]) : Number(id),
        sort: meetingSort,
        ...(meetingStatusFilter ? { status: meetingStatusFilter } : {}),
      });
      setMeetings(data.data || []);
      setMeetingsTotalPages((data as any).pagination?.totalPages || 0);
    } catch (e: any) {
      toast.error(e.message || "Failed to load meetings");
    } finally {
      setLoadingMeetings(false);
    }
  };

  const loadPendingActionPoints = async (subCommitteeId?: number) => {
    if (!token || !id) return;
    setLoadingPendingActionPoints(true);
    try {
      const committeeId = Array.isArray(id) ? id[0] : id;
      const data = subCommitteeId
        ? await getPendingActionPoints(token, undefined, subCommitteeId)
        : await getPendingActionPoints(token, Number(committeeId));
      const pendingPoints = data || [];
      setPendingActionPoints(pendingPoints);
      setPendingActionPointAssignments(
        pendingPoints.reduce((acc: Record<number, number | "">, ap: any) => {
          acc[ap.id] = ap.assignedTo || "";
          return acc;
        }, {})
      );
    } catch (e: any) {
      console.error("Failed to load pending action points:", e.message);
      setPendingActionPoints([]);
      setPendingActionPointAssignments({});
    } finally {
      setLoadingPendingActionPoints(false);
    }
  };

  const loadMeetingSubCommittee = async (subCommitteeId: number) => {
    if (!token || !id) return;
    setLoadingMeetingSubCommitteeMembers(true);
    try {
      const committeeId = Array.isArray(id) ? id[0] : id;
      const subCommittee = await getSubCommitteeById(token, committeeId, subCommitteeId);
      setSelectedMeetingSubCommittee(subCommittee || null);
    } catch (e: any) {
      toast.error(e.message || "Failed to load sub-committee members");
      setSelectedMeetingSubCommittee(null);
    } finally {
      setLoadingMeetingSubCommitteeMembers(false);
    }
  };

  useEffect(() => {
    if (token && !canReadCommittee) {
      toast.error("You are not authorized to access this page. Routing you back to the homepage");
      router.push("/userMarketplace");
      return;
    }

    loadCommittee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, canReadCommittee]);

  useEffect(() => {
    if (!canReadCommitteeMeeting) return;
    loadMeetings(meetingsCurrentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, canReadCommitteeMeeting, meetingsCurrentPage, meetingSort, meetingStatusFilter]);

  const handleUpdateEndDate = async () => {
    if (!token || !id || !endDateValue) {
      toast.error("Please select an end date");
      return;
    }

    if (committee?.startDate) {
      const start = new Date(committee.startDate);
      const end = new Date(endDateValue);
      if (start >= end) {
        toast.error("End date must be after start date");
        return;
      }
    }

    setSubmitting(true);
    try {
      const committeeId = Array.isArray(id) ? id[0] : id;
      const end = new Date(endDateValue);
      const payload = {
        endDate: end.toISOString(),
      };
      await updateCommittee(token, committeeId, payload);
      toast.success("End date updated successfully");
      setEditingEndDate(false);
      await loadCommittee();
    } catch (e: any) {
      toast.error(e.message || "Failed to update end date");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCommitteeName = async () => {
    if (!token || !id || !nameValue.trim()) {
      toast.error("Please enter a committee name");
      return;
    }

    setSubmitting(true);
    try {
      const committeeId = Array.isArray(id) ? id[0] : id;
      const payload = {
        name: nameValue.trim(),
      };
      await updateCommittee(token, committeeId, payload);
      toast.success("Committee name updated successfully");
      setEditingName(false);
      await loadCommittee();
    } catch (e: any) {
      toast.error(e.message || "Failed to update committee name");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCommitteeDescription = async () => {
    if (!token || !id) {
      toast.error("Error updating description");
      return;
    }

    setSubmitting(true);
    try {
      const committeeId = Array.isArray(id) ? id[0] : id;
      const payload = {
        details: descriptionValue.trim(),
      };
      await updateCommittee(token, committeeId, payload);
      toast.success("Committee description updated successfully");
      setEditingDescription(false);
      await loadCommittee();
    } catch (e: any) {
      toast.error(e.message || "Failed to update committee description");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMembers = async () => {
    if (!token || !id || selectedMembersToAdd.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    setSubmitting(true);
    try {
      const committeeId = Array.isArray(id) ? id[0] : id;
      const payload = {
        members: selectedMembersToAdd,
      };
      await updateCommittee(token, committeeId, payload);
      toast.success("Members added successfully");
      setShowAddMember(false);
      setSelectedMembersToAdd([]);
      setMemberSearchQuery("");
      await loadCommittee();
    } catch (e: any) {
      toast.error(e.message || "Failed to add members");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: number, memberName: string) => {
    if (!token || !id) return;
    setMemberToRemove({ userId, name: memberName });
    setShowRemoveConfirmation(true);
  };

  const confirmRemoveMember = async () => {
    if (!token || !id || !memberToRemove) return;

    setSubmitting(true);
    try {
      const committeeId = Array.isArray(id) ? id[0] : id;
      await removeMemberFromCommittee(token, committeeId, memberToRemove.userId);
      toast.success("Member removed successfully");
      await loadCommittee();
    } catch (e: any) {
      toast.error(e.message || "Failed to remove member");
    } finally {
      setSubmitting(false);
      setShowRemoveConfirmation(false);
      setMemberToRemove(null);
    }
  };

  const handleCreateSubCommittee = async () => {
    if (!token || !id) return;
    if (!subCommitteeName.trim()) {
      toast.error("Please enter a sub-committee name");
      return;
    }
    if (!subCommitteeStartDate || !subCommitteeEndDate) {
      toast.error("Please select start and end dates");
      return;
    }
    if (selectedSubCommitteeMembers.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    const start = new Date(subCommitteeStartDate);
    const end = new Date(subCommitteeEndDate);
    if (start >= end) {
      toast.error("End date must be after start date");
      return;
    }

    setSubmitting(true);
    try {
      const committeeId = Array.isArray(id) ? id[0] : id;
      const payload = {
        name: subCommitteeName,
        details: subCommitteeDescription || "",
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        members: selectedSubCommitteeMembers,
      };
      await createSubCommittee(token, committeeId, payload);
      toast.success("Sub-committee created successfully");
      setShowCreateSubCommittee(false);
      setSubCommitteeName("");
      setSubCommitteeDescription("");
      setSubCommitteeStartDate("");
      setSubCommitteeEndDate("");
      setSelectedSubCommitteeMembers([]);
      await loadCommittee();
    } catch (e: any) {
      toast.error(e.message || "Failed to create sub-committee");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubCommittee = async (subCommitteeId: number, subCommitteeName: string) => {
    if (!token || !id) return;
    setSubCommitteeToDelete({ id: subCommitteeId, name: subCommitteeName });
    setShowDeleteSubCommitteeConfirmation(true);
  };

  const confirmDeleteSubCommittee = async () => {
    if (!token || !id || !subCommitteeToDelete) return;

    const committeeId = Array.isArray(id) ? id[0] : id;
    setSubmitting(true);
    try {
      await deleteSubCommittee(token, committeeId, subCommitteeToDelete.id);
      toast.success("Sub-committee deleted successfully");
      await loadCommittee();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete sub-committee");
    } finally {
      setSubmitting(false);
      setShowDeleteSubCommitteeConfirmation(false);
      setSubCommitteeToDelete(null);
    }
  };

  const confirmDeleteCommittee = async () => {
    if (!token || !id) return;
    const committeeId = Array.isArray(id) ? id[0] : id;
    setDeletingCommittee(true);
    try {
      await deleteCommittee(token, committeeId);
      toast.success("Committee deleted successfully");
      router.push("/committee");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete committee");
    } finally {
      setDeletingCommittee(false);
      setShowDeleteCommitteeModal(false);
    }
  };

  const handleCreateMeeting = async () => {
    if (!token || !id || !meetingTitle.trim() || !meetingStartDateTime || !meetingEndDateTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate dates
    const startDate = new Date(meetingStartDateTime);
    const endDate = new Date(meetingEndDateTime);
    const minAllowedDateTime = getMinMeetingDateTime();

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      toast.error("Please select valid start and end date/time");
      return;
    }

    if (startDate < minAllowedDateTime) {
      toast.error("Start date/time cannot be in the past");
      return;
    }

    if (endDate < minAllowedDateTime) {
      toast.error("End date/time cannot be in the past");
      return;
    }
    
    if (startDate >= endDate) {
      toast.error("End date/time must be after start date/time");
      return;
    }

    try {
      const committeeId = Array.isArray(id) ? id[0] : id;

      // Merge selected pending action points with any reassigned users.
      const selectedPendingPoints = pendingActionPoints
        .filter((ap) => selectedPendingActionPoints.includes(ap.id))
        .map((ap) => {
          const assignedTo = Number(
            pendingActionPointAssignments[ap.id] || ap.assignedTo || 0
          );

          return {
            description: ap.description,
            ...(assignedTo ? { assignedTo } : {}),
          };
        });

      const allActionPoints = [...selectedPendingPoints, ...actionPoints];

      setSubmitting(true);

      const payload = {
        title: meetingTitle.trim(),
        details: meetingDetails.trim(),
        venue: meetingVenue.trim(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        timezone: meetingTimezone,
        ...(selectedMeetingSubCommitteeId
          ? { subCommitteeId: Number(selectedMeetingSubCommitteeId) }
          : { committeeId: Number(committeeId) }),
        userIds: selectedMeetingAttendees,
        actionPoints: allActionPoints,
      };

      await createCommitteeMeeting(token, payload);
      toast.success("Meeting created successfully");
      
      // Reset form
      setShowCreateMeeting(false);
      setMeetingTitle("");
      setMeetingDetails("");
      setMeetingVenue("");
      setMeetingStartDateTime("");
      setMeetingEndDateTime("");
      setMeetingTimezone("Asia/Karachi");
      setSelectedMeetingSubCommitteeId("");
      setSelectedMeetingSubCommittee(null);
      setSelectedMeetingAttendees([]);
      setActionPoints([]);
      setNewActionPointDescription("");
      setNewActionPointAssignedTo("");
      setSelectedPendingActionPoints([]);
      setPendingActionPoints([]);
      setPendingActionPointAssignments({});
      
      // Reload committee and meetings data
      await loadCommittee();
      const nextPage = 1;
      setMeetingsCurrentPage(nextPage);
      await loadMeetings(nextPage);
    } catch (e: any) {
      toast.error(e.message || "Failed to create meeting");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = availableUsers.filter(
    (user) =>
      !committee?.members?.some((m) => m.user.id === user.id) &&
      (user.name?.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(memberSearchQuery.toLowerCase()))
  );

  const scopedMeetingMembers = selectedMeetingSubCommitteeId
    ? selectedMeetingSubCommittee?.members || []
    : committee?.members || [];

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

  const minMeetingStartDateTime = toDateTimeLocalValue(getMinMeetingDateTime());
  const minMeetingEndDateTime = toDateTimeLocalValue(
    getMinMeetingDateTime(meetingStartDateTime),
  );

  const getPublicContent = () =>
    committee?.content?.filter((c) => !c.isConfidential) || [];

  const getConfidentialContent = () =>
    committee?.content?.filter((c) => c.isConfidential) || [];

  const handleDeleteContent = async (contentId: number) => {
    if (!token || !committee) return;
    setDeletingContentId(contentId);
    try {
      await deleteCommitteeContent(token, committee.id, contentId);
      toast.success("Content deleted successfully");
      loadCommittee();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete content");
    } finally {
      setDeletingContentId(null);
    }
  };

  const getContentIcon = (type: CommitteeContent["type"]) => {
    switch (type) {
      case "IMAGE":
        // @ts-ignore
        return <HiOutlinePhotograph className="w-5 h-5" />;
      case "VIDEO":
        // @ts-ignore
        return <HiOutlineVideoCamera className="w-5 h-5" />;
      case "PRESENTATION":
        // @ts-ignore
        return <HiOutlinePresentationChartLine className="w-5 h-5" />;
      default:
        // @ts-ignore
        return <HiOutlineDocument className="w-5 h-5" />;
    }
  };

  const renderContentCard = (item: CommitteeContent) => (
    <div
      key={item.id}
      className="bg-gray-750 border border-gray-600 rounded-lg p-4 flex flex-col justify-between hover:border-gray-500 transition-colors"
      style={{ background: "rgba(55,65,81,0.6)" }}
    >
      <div
        className="cursor-pointer flex-1"
        onClick={() => window.open(item.url, "_blank")}
      >
        <div className="flex items-start gap-3 mb-3">
          <div className="text-gold-400 mt-0.5 flex-shrink-0">
            {getContentIcon(item.type)}
          </div>
          <h4 className="text-white font-medium text-sm leading-snug line-clamp-2">
            {item.title}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block bg-gray-600 text-gray-300 text-xs px-2 py-0.5 rounded">
            {item.type.charAt(0) + item.type.slice(1).toLowerCase()}
          </span>
        </div>
        <p className="text-gray-500 text-xs mt-3">
          {formatDate(item.createdAt)}
        </p>
      </div>
      <Can I="manage" a="Committee">
        <div className="mt-3 pt-3 border-t border-gray-600 flex justify-end">
          <button
            onClick={() => handleDeleteContent(item.id)}
            disabled={deletingContentId === item.id}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
          >
            {deletingContentId === item.id ? (
              <span>Deleting...</span>
            ) : (
              <>
                {/* @ts-ignore */}
                <HiOutlineTrash className="w-3.5 h-3.5" />
                Delete
              </>
            )}
          </button>
        </div>
      </Can>
    </div>
  );

  const renderContentGroup = (
    items: CommitteeContent[],
    label: string,
    variant: "committee" | "subcommittee",
    icon: React.ReactNode,
  ) => (
    <div
      className={`rounded-xl border p-5 ${
        variant === "committee"
          ? "border-gold-500/50 bg-gray-800"
          : "border-indigo-500/40 bg-gray-800/80"
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className={
            variant === "committee" ? "text-gold-400" : "text-indigo-400"
          }
        >
          {icon}
        </div>
        <h3
          className={`font-semibold text-base ${
            variant === "committee" ? "text-gold-400" : "text-indigo-300"
          }`}
        >
          {label}
        </h3>
        <span className="ml-auto text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded-full">
          {items.length} {items.length === 1 ? "file" : "files"}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-6 text-gray-600">
          {/* @ts-ignore */}
          <HiOutlineDocument className="w-8 h-8 mx-auto mb-2 text-gray-600" />
          <p className="text-sm">No documents yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map(renderContentCard)}
        </div>
      )}
    </div>
  );

  const renderDocumentsSection = (allItems: CommitteeContent[], confidential: boolean) => {
    const committeeItems = allItems.filter((c) => !c.subCommitteeId && c.isConfidential === confidential);

    // Collect unique sub-committees that have content
    const scMap = new Map<number, { id: number; name: string; items: CommitteeContent[] }>();
    allItems
      .filter((c) => c.subCommitteeId && c.isConfidential === confidential)
      .forEach((c) => {
        const scId = c.subCommitteeId!;
        if (!scMap.has(scId)) {
          scMap.set(scId, { id: scId, name: c.subCommittee?.name || `Sub-Committee ${scId}`, items: [] });
        }
        scMap.get(scId)!.items.push(c);
      });

    const hasAnything = committeeItems.length > 0 || scMap.size > 0;
    if (!hasAnything) return null;

    return (
      <div className="space-y-4">
        {committeeItems.length > 0 &&
          renderContentGroup(
            committeeItems,
            `${committee?.name} — Committee Documents`,
            "committee",
            // @ts-ignore
            <HiOutlineDocument className="w-5 h-5" />,
          )}
        {Array.from(scMap.values()).map((sc) =>
          renderContentGroup(
            sc.items,
            `${sc.name} — Sub-Committee Documents`,
            "subcommittee",
            // @ts-ignore
            <HiOutlineDocument className="w-5 h-5" />,
          ),
        )}
      </div>
    );
  };

  const renderContentGrid = (content: CommitteeContent[]) => {
    if (content.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          {/* @ts-ignore */}
          <HiOutlineDocument className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>No content available</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {content.map(renderContentCard)}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (!committee) {
    return (
      <div className="min-h-screen text-white flex flex-col items-center justify-center p-4">
        <p className="text-xl text-gray-400 mb-4">Committee not found</p>
        <button
          onClick={() => router.push("/committee")}
          className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors font-medium"
        >
          Back to Committees
        </button>
      </div>
    );
                setSelectedMeetingSubCommitteeId("");
                setSelectedMeetingSubCommittee(null);
                setSelectedMeetingAttendees([]);
                setActionPoints([]);
                setNewActionPointAssignedTo("");
  }

  return (
    <div className="min-h-screen text-white flex flex-col p-4">
      
      <div className="flex gap-4 mb-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTopTab("details")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTopTab === "details"
              ? "text-gold-500 border-b-2 border-gold-500"
              : "text-gray-400 hover:text-white"
          }`}
        >
          Details
        </button>
        <Can I="read" a="CommitteeMeeting">
          <button
            onClick={() => setActiveTopTab("meetings")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTopTab === "meetings"
                ? "text-gold-500 border-b-2 border-gold-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Meetings
          </button>
        </Can>
        <Can I="read" a="Committee">
          <button
            onClick={() => setActiveTopTab("documents")}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTopTab === "documents"
                ? "text-gold-500 border-b-2 border-gold-500"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Documents
          </button>
        </Can>
      </div>

      {activeTopTab === "details" && (
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gold-500 rounded-xl p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              {editingName ? (
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 text-3xl font-bold"
                    placeholder="Committee name"
                  />
                  <button
                    onClick={handleUpdateCommitteeName}
                    disabled={submitting}
                    className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md disabled:opacity-60 transition-colors font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setNameValue(committee?.name || "");
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-bold text-gold-500">
                    {committee.name}
                  </h1>
                  <Can I="update" a="Committee">
                    <button
                      onClick={() => setEditingName(true)}
                      className="text-gold-400 hover:text-gold-300 transition-colors"
                      title="Edit committee name"
                    >
                      {/* @ts-ignore */}
                      <HiOutlinePencil className="w-5 h-5" />
                    </button>
                  </Can>
                </div>
              )}
              <p className="text-gray-400">Committee ID: {committee.id}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full ${
                  committee.isActive
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {committee.isActive ? "Active" : "Inactive"}
              </span>
              <Can I="manage" a="Committee">
                <button
                  onClick={() => setShowDeleteCommitteeModal(true)}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                  title="Delete committee"
                >
                  {/* @ts-ignore */}
                  <HiOutlineTrash className="w-4 h-4" />
                  Delete
                </button>
              </Can>
            </div>
          </div>

          {/* Committee Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-700">
            <div>
              <p className="text-gray-400 text-sm mb-1">Start Date</p>
              <p className="text-lg text-white font-medium">
                {formatDate(committee.startDate)}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-gray-400 text-sm">End Date</p>
                <Can I="update" a="Committee">
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
                  {formatDate(committee.endDate)}
                </p>
              )}
            </div>
          </div>

          {/* Description Section */}
          <div className="mb-6 pb-6 border-b border-gray-700">
            {editingDescription ? (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-400">Description</label>
                <textarea
                  value={descriptionValue}
                  onChange={(e) => setDescriptionValue(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 resize-none"
                  rows={4}
                  placeholder="Enter committee description"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateCommitteeDescription}
                    disabled={submitting}
                    className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md disabled:opacity-60 transition-colors font-medium text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingDescription(false);
                      setDescriptionValue(committee?.details || "");
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-2">
                  <label className="text-sm font-semibold text-gray-400">Description</label>
                  <Can I="update" a="Committee">
                    <button
                      onClick={() => setEditingDescription(true)}
                      className="text-gold-400 hover:text-gold-300 transition-colors"
                      title="Edit description"
                    >
                      {/* @ts-ignore */}
                      <HiOutlinePencil className="w-4 h-4" />
                    </button>
                  </Can>
                </div>
                <div
                  className="text-gray-300 whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: decodeHtmlEntities(committee?.details || "No description added yet"),
                  }}
                />
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="text-sm text-gray-400">
            <p>Created: {formatDate(committee.createdAt)}</p>
            <p>Updated: {formatDate(committee.updatedAt)}</p>
          </div>
        </div>

        {/* Members & Sub-Committees Section */}
        <div className="bg-gray-800 border border-gold-500 rounded-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gold-500">
            <button
              onClick={() => setActiveTab("members")}
              className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                activeTab === "members"
                  ? "bg-gold-500 text-black"
                  : "bg-gray-800 text-gold-500 hover:bg-gray-700"
              }`}
            >
              Committee Members ({committee.members?.length || 0})
            </button>
            <Can I="read" a="SubCommittee">
              <button
                onClick={() => setActiveTab("subcommittees")}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  activeTab === "subcommittees"
                    ? "bg-gold-500 text-black"
                    : "bg-gray-800 text-gold-500 hover:bg-gray-700"
                }`}
              >
                Sub-Committees ({committee.subCommittees?.length || 0})
              </button>
            </Can>
          </div>

          <div className="p-6">
            {/* Members Tab */}
            {activeTab === "members" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gold-500">
                    Committee Members
                  </h2>
                  <Can I="manage" a="Committee">
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
                {committee.members && committee.members.length > 0 ? (
                  <div className="space-y-3">
                    {committee.members.map((member) => (
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
                          <Can I="manage" a="Committee">
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
            )}

            {/* Sub-Committees Tab */}
            {activeTab === "subcommittees" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gold-500">
                    Sub-Committees
                  </h2>
                  <Can I="create" a="SubCommittee">
                    <button
                      onClick={() => setShowCreateSubCommittee(true)}
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
                      Create Sub-Committee
                    </button>
                  </Can>
                </div>

                {/* Sub-Committees List */}
                {committee.subCommittees && committee.subCommittees.length > 0 ? (
                  <div className="space-y-4">
                    {committee.subCommittees.map((subCommittee) => (
                      <div
                        key={subCommittee.id}
                        onClick={() => {
                          const committeeId = Array.isArray(id) ? id[0] : id;
                          router.push(
                            `/committee/${committeeId}/subcommittee/${subCommittee.id}`
                          );
                        }}
                        className="p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors border border-gray-600 cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gold-500 hover:text-gold-400">
                              {subCommittee.name}
                            </h3>
                            <p className="text-sm text-gray-400">
                              ID: {subCommittee.id}
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

                        <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                          <div>
                            <p className="text-gray-400">Start Date</p>
                            <p className="text-white">
                              {formatDate(subCommittee.startDate)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400">End Date</p>
                            <p className="text-white">
                              {formatDate(subCommittee.endDate)}
                            </p>
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-gray-400 text-sm mb-2">
                            Members ({subCommittee.members?.length || 0})
                          </p>
                          {subCommittee.members && subCommittee.members.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {subCommittee.members.map((member) => (
                                <span
                                  key={member.user.id}
                                  className="px-2 py-1 bg-gold-500/20 text-gold-300 text-xs rounded"
                                  title={member.user.email}
                                >
                                  {member.user.name} ({member.role})
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-sm">No members</p>
                          )}
                        </div>

                        <Can I="manage" a="SubCommittee">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSubCommittee(subCommittee.id, subCommittee.name);
                            }}
                            disabled={submitting}
                            className="w-full px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                          >
                            {/* @ts-ignore */}
                            <HiOutlineTrash className="w-4 h-4" />
                            Delete Sub-Committee
                          </button>
                        </Can>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>No sub-committees created yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* Meetings Tab */}
      {activeTopTab === "meetings" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gold-500">Meetings</h2>
            <Can I="create" a="CommitteeMeeting">
              <button
                onClick={() => {
                  setShowCreateMeeting(true);
                  setSelectedPendingActionPoints([]);
                  loadPendingActionPoints();
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
                Create Meeting
              </button>
            </Can>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <select
              value={meetingStatusFilter}
              onChange={(e) => {
                setMeetingStatusFilter(e.target.value as typeof meetingStatusFilter);
                setMeetingsCurrentPage(1);
              }}
              className="px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ONGOING">Ongoing</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              value={meetingSort}
              onChange={(e) => {
                setMeetingSort(e.target.value as "newest" | "oldest");
                setMeetingsCurrentPage(1);
              }}
              className="px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          {loadingMeetings ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500 mx-auto"></div>
              <p className="text-gray-400 mt-4">Loading meetings...</p>
            </div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No meetings scheduled yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="bg-gray-800 border border-gold-500 rounded-xl p-5 transition-all hover:border-gold-400 cursor-pointer"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div 
                      className="flex-1 min-w-0"
                      onClick={() => router.push(`/committee/${committee?.id}/meeting/${meeting.id}`)}
                    >
                      <h3 className="text-lg text-gold-500 font-bold truncate">
                        {meeting.title}
                      </h3>
                      {meeting.details && (
                        <div
                          className="text-white text-sm mt-2 line-clamp-2 break-words"
                          dangerouslySetInnerHTML={{
                            __html: decodeHtmlEntities(meeting.details),
                          }}
                        />
                      )}
                      <div className="flex items-center gap-3 mt-3 text-white flex-wrap">
                        <span className="text-sm font-medium">
                          {new Date(meeting.startDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-sm text-gray-400">to</span>
                        <span className="text-sm font-medium">
                          {new Date(meeting.endDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                    <button
                      className="w-8 h-8 bg-gold-500 text-black rounded-full flex items-center justify-center transition-all hover:bg-gold-600 flex-shrink-0"
                      onClick={() => router.push(`/committee/${committee?.id}/meeting/${meeting.id}`)}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-5 h-5"
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
              ))}
              <Pagination
                currentPage={meetingsCurrentPage}
                totalPages={meetingsTotalPages}
                isLoading={loadingMeetings}
                onPageChange={setMeetingsCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Documents Tab */}
      {activeTopTab === "documents" && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gold-500">Documents</h2>
              <p className="text-gray-400 text-sm mt-0.5">
                Browse documents by committee or sub-committee
              </p>
            </div>
            <Can I="manage" a="Committee">
              <button
                onClick={() => setOpenUploadModal(true)}
                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors font-medium flex items-center gap-2 text-sm"
              >
                {/* @ts-ignore */}
                <HiOutlineDocument className="w-4 h-4" />
                Upload Document
              </button>
            </Can>
          </div>

          {/* Public grouped sections */}
          {renderDocumentsSection(committee?.content || [], false) ?? (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-10 text-center">
              {/* @ts-ignore */}
              <HiOutlineDocument className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-500">No documents have been uploaded yet</p>
              <Can I="manage" a="Committee">
                <button
                  onClick={() => setOpenUploadModal(true)}
                  className="mt-4 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors font-medium text-sm"
                >
                  Upload First Document
                </button>
              </Can>
            </div>
          )}

          {/* Confidential grouped sections — admin only */}
          {user?.Role?.name &&
            ADMIN_ROLES.includes(user.Role.name as any) &&
            getConfidentialContent().length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-red-500/30" />
                  <span className="flex items-center gap-2 text-red-400 font-semibold text-sm px-3 py-1 bg-red-500/10 rounded-full border border-red-500/30">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Confidential — Admins Only
                  </span>
                  <div className="h-px flex-1 bg-red-500/30" />
                </div>
                {(() => {
                  const confidentialItems = committee?.content?.filter(c => c.isConfidential) || [];
                  const committeeItems = confidentialItems.filter(c => !c.subCommitteeId);
                  const scMap = new Map<number, { id: number; name: string; items: CommitteeContent[] }>();
                  confidentialItems.filter(c => c.subCommitteeId).forEach(c => {
                    const scId = c.subCommitteeId!;
                    if (!scMap.has(scId)) scMap.set(scId, { id: scId, name: c.subCommittee?.name || `Sub-Committee ${scId}`, items: [] });
                    scMap.get(scId)!.items.push(c);
                  });
                  return (
                    <div className="space-y-4">
                      {committeeItems.length > 0 && (
                        <div className="rounded-xl border border-red-500/40 bg-red-950/20 p-5">
                          <div className="flex items-center gap-2 mb-4">
                            {/* @ts-ignore */}
                            <HiOutlineDocument className="w-5 h-5 text-red-400" />
                            <h3 className="font-semibold text-red-400 text-base">
                              {committee?.name} — Confidential Documents
                            </h3>
                            <span className="ml-auto text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded-full">
                              {committeeItems.length} {committeeItems.length === 1 ? "file" : "files"}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {committeeItems.map(renderContentCard)}
                          </div>
                        </div>
                      )}
                      {Array.from(scMap.values()).map((sc) => (
                        <div key={sc.id} className="rounded-xl border border-red-500/30 bg-red-950/10 p-5">
                          <div className="flex items-center gap-2 mb-4">
                            {/* @ts-ignore */}
                            <HiOutlineDocument className="w-5 h-5 text-red-400" />
                            <h3 className="font-semibold text-red-400 text-base">
                              {sc.name} — Confidential Documents
                            </h3>
                            <span className="ml-auto text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded-full">
                              {sc.items.length} {sc.items.length === 1 ? "file" : "files"}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {sc.items.map(renderContentCard)}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
        </div>
      )}

      <Can I="manage" a="Committee">
        <UploadContentModal
          open={openUploadModal}
          onClose={() => setOpenUploadModal(false)}
          onSuccess={() => {
            setOpenUploadModal(false);
            loadCommittee();
          }}
          committeeId={committee?.id as number}
          subCommittees={committee?.subCommittees?.map((sc) => ({ id: sc.id, name: sc.name })) || []}
        />
      </Can>

      {/* Add Members Modal */}
      {showAddMember && canManageCommittee && (
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
                {loadingUsers ? (
                  <div className="p-4 text-center text-gray-500">
                    Loading users...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No users available to add
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

      {/* Create Sub-Committee Modal */}
      {showCreateSubCommittee && canCreateSubCommittee && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full max-w-2xl max-h-[95vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Create Sub-Committee
                </h2>
                <button
                  onClick={() => {
                    setShowCreateSubCommittee(false);
                    setSubCommitteeName("");
                    setSubCommitteeStartDate("");
                    setSubCommitteeEndDate("");
                    setSelectedSubCommitteeMembers([]);
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

              {/* Sub-Committee Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Sub-Committee Name
                </label>
                <input
                  type="text"
                  value={subCommitteeName}
                  onChange={(e) => setSubCommitteeName(e.target.value)}
                  placeholder="e.g., Finance Sub-Committee"
                  className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Description
                </label>
                <textarea
                  value={subCommitteeDescription}
                  onChange={(e) => setSubCommitteeDescription(e.target.value)}
                  placeholder="Add description or details about this sub-committee..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 resize-none"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={subCommitteeStartDate}
                    onChange={(e) => setSubCommitteeStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={subCommitteeEndDate}
                    onChange={(e) => setSubCommitteeEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  />
                </div>
              </div>

              {/* Members Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Select Members (from committee members)
                </label>
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-700/50">
                  {!committee?.members || committee.members.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No committee members available
                    </div>
                  ) : (
                    committee.members.map((member) => {
                      const isSelected = selectedSubCommitteeMembers.some(
                        (m) => m.userId === member.user.id
                      );
                      const selectedMember = selectedSubCommitteeMembers.find(
                        (m) => m.userId === member.user.id
                      );
                      return (
                        <div
                          key={member.user.id}
                          className="flex items-center gap-3 p-3 border-b border-gray-200 dark:border-gray-600 last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              if (isSelected) {
                                setSelectedSubCommitteeMembers(
                                  selectedSubCommitteeMembers.filter(
                                    (m) => m.userId !== member.user.id
                                  )
                                );
                              } else {
                                setSelectedSubCommitteeMembers([
                                  ...selectedSubCommitteeMembers,
                                  { userId: member.user.id, role: "MEMBER" as const },
                                ]);
                              }
                            }}
                            className="h-4 w-4 rounded cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white truncate">
                              {member.user.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {member.user.email}
                            </div>
                          </div>
                          {isSelected && (
                            <select
                              value={selectedMember?.role || "MEMBER"}
                              onChange={(e) => {
                                setSelectedSubCommitteeMembers(
                                  selectedSubCommitteeMembers.map((m) =>
                                    m.userId === member.user.id
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Selected: {selectedSubCommitteeMembers.length} member(s)
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateSubCommittee(false);
                    setSubCommitteeName("");
                    setSubCommitteeDescription("");
                    setSubCommitteeStartDate("");
                    setSubCommitteeEndDate("");
                    setSelectedSubCommitteeMembers([]);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleCreateSubCommittee}
                  disabled={submitting || selectedSubCommitteeMembers.length === 0}
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
                      Creating...
                    </>
                  ) : (
                    "Create Sub-Committee"
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
                Are you sure you want to remove <span className="font-semibold text-gray-900 dark:text-white">{memberToRemove.name}</span> from this committee?
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

      {/* Delete Sub-Committee Confirmation Modal */}
      {showDeleteSubCommitteeConfirmation && subCommitteeToDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Delete Sub-Committee
                </h2>
                <button
                  onClick={() => {
                    setShowDeleteSubCommitteeConfirmation(false);
                    setSubCommitteeToDelete(null);
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
                Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-white">{subCommitteeToDelete.name}</span>? This action cannot be undone.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteSubCommitteeConfirmation(false);
                    setSubCommitteeToDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteSubCommittee}
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
                      Deleting...
                    </>
                  ) : (
                    "Delete Sub-Committee"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Committee Confirmation Modal */}
      {showDeleteCommitteeModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Delete Committee
                </h2>
                <button
                  onClick={() => !deletingCommittee && setShowDeleteCommitteeModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-gray-600 dark:text-gray-300 mb-2">
                Are you sure you want to permanently delete{" "}
                <span className="font-semibold text-gray-900 dark:text-white">{committee?.name}</span>?
              </p>
              <p className="text-red-400 text-sm mb-6">
                This will also delete all sub-committees, meetings, action points, and related data. This action cannot be undone.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteCommitteeModal(false)}
                  disabled={deletingCommittee}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md transition-colors font-medium disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteCommittee}
                  disabled={deletingCommittee}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md disabled:opacity-60 transition-colors font-medium flex items-center gap-2"
                >
                  {deletingCommittee ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Deleting...
                    </>
                  ) : "Yes, Delete Committee"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Meeting Modal */}
      {showCreateMeeting && canCreateCommitteeMeeting && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full max-w-3xl max-h-[95vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Create Meeting
                </h2>
                <button
                  onClick={() => {
                    setShowCreateMeeting(false);
                    setMeetingTitle("");
                    setMeetingDetails("");
                    setMeetingVenue("");
                    setMeetingStartDateTime("");
                    setMeetingEndDateTime("");
                    setMeetingTimezone("Asia/Karachi");
                    setSelectedMeetingAttendees([]);
                    setActionPoints([]);
                    setNewActionPointDescription("");
                    setNewActionPointAssignedTo("");
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

              {/* Meeting Title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Meeting Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="e.g., Q1 Strategic Planning Meeting"
                  className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                />
              </div>

              {/* Meeting Details */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Details
                </label>
                <CKEditorClient
                  value={meetingDetails}
                  onChange={setMeetingDetails}
                />
              </div>

              {/* Venue */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Venue
                </label>
                <input
                  type="text"
                  value={meetingVenue}
                  onChange={(e) => setMeetingVenue(e.target.value)}
                  placeholder="e.g., Conference Room A, Building 1"
                  className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                />
              </div>

              {/* Dates and Times */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Start Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={meetingStartDateTime}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      if (!nextValue) {
                        setMeetingStartDateTime("");
                        return;
                      }

                      const minStart = getMinMeetingDateTime();
                      const parsedStart = new Date(nextValue);
                      const normalizedStart =
                        !Number.isNaN(parsedStart.getTime()) && parsedStart < minStart
                          ? toDateTimeLocalValue(minStart)
                          : nextValue;

                      setMeetingStartDateTime(normalizedStart);

                      if (meetingEndDateTime) {
                        const minEnd = getMinMeetingDateTime(normalizedStart);
                        const parsedEnd = new Date(meetingEndDateTime);

                        if (!Number.isNaN(parsedEnd.getTime()) && parsedEnd < minEnd) {
                          setMeetingEndDateTime(toDateTimeLocalValue(minEnd));
                        }
                      }
                    }}
                    min={minMeetingStartDateTime}
                    className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                    End Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={meetingEndDateTime}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      if (!nextValue) {
                        setMeetingEndDateTime("");
                        return;
                      }

                      const minEnd = getMinMeetingDateTime(meetingStartDateTime);
                      const parsedEnd = new Date(nextValue);

                      if (!Number.isNaN(parsedEnd.getTime()) && parsedEnd < minEnd) {
                        setMeetingEndDateTime(toDateTimeLocalValue(minEnd));
                        return;
                      }

                      setMeetingEndDateTime(nextValue);
                    }}
                    min={minMeetingEndDateTime}
                    className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  />
                </div>
              </div>

              {/* Timezone */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Timezone
                </label>
                <select
                  value={meetingTimezone}
                  onChange={(e) => setMeetingTimezone(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              {/* Meeting Scope */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Meeting Type
                </label>
                <select
                  value={selectedMeetingSubCommitteeId}
                  onChange={async (e) => {
                    const selectedId = e.target.value === "" ? "" : Number(e.target.value);
                    setSelectedMeetingSubCommitteeId(selectedId);
                    setSelectedMeetingAttendees([]);
                    setActionPoints([]);
                    setNewActionPointAssignedTo("");
                    setSelectedPendingActionPoints([]);
                    setPendingActionPointAssignments({});

                    if (selectedId === "") {
                      setSelectedMeetingSubCommittee(null);
                      await loadPendingActionPoints();
                    } else {
                      await Promise.all([
                        loadMeetingSubCommittee(selectedId),
                        loadPendingActionPoints(selectedId),
                      ]);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                >
                  <option value="">Committee Meeting</option>
                  {committee?.subCommittees?.map((subCommittee) => (
                    <option key={subCommittee.id} value={subCommittee.id}>
                      Sub-Committee: {subCommittee.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Attendees Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Select Attendees
                </label>
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-700/50">
                  {loadingMeetingSubCommitteeMembers ? (
                    <div className="p-4 text-center text-gray-500">
                      Loading sub-committee members...
                    </div>
                  ) : !scopedMeetingMembers || scopedMeetingMembers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {selectedMeetingSubCommitteeId
                        ? "No sub-committee members available"
                        : "No committee members available"}
                    </div>
                  ) : (
                    scopedMeetingMembers.map((member) => (
                      <label
                        key={member.user.id}
                        className="flex items-center gap-3 p-3 border-b border-gray-200 dark:border-gray-600 last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMeetingAttendees.includes(member.user.id)}
                          onChange={() => {
                            if (selectedMeetingAttendees.includes(member.user.id)) {
                              setSelectedMeetingAttendees(
                                selectedMeetingAttendees.filter((id) => id !== member.user.id)
                              );
                            } else {
                              setSelectedMeetingAttendees([...selectedMeetingAttendees, member.user.id]);
                            }
                          }}
                          className="h-4 w-4 rounded cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {member.user.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {member.user.email}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Selected: {selectedMeetingAttendees.length} attendee(s)
                </p>
              </div>

              {/* Action Points */}
              <div className="mb-6">
                {/* Pending Action Points from Previous Meetings */}
                {pendingActionPoints.length > 0 && (
                  <div className="mb-6 p-4 rounded-lg border-2 border-gold-500/40 bg-gold-500/10">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-bold text-gold-500">
                        📋 Pending Action Points from Previous Meetings
                      </label>
                      <span className="text-xs bg-gold-500/20 text-gold-300 px-2 py-1 rounded-full border border-gold-500/30">
                        {selectedPendingActionPoints.length}/{pendingActionPoints.length}
                      </span>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {loadingPendingActionPoints ? (
                        <div className="text-center py-4">
                          <p className="text-xs text-gray-400">Loading pending action points...</p>
                        </div>
                      ) : (
                        pendingActionPoints.map((ap) => {
                          const assignedUser = scopedMeetingMembers?.find((m) => m.user.id === ap.assignedTo);
                          const isSelected = selectedPendingActionPoints.includes(ap.id);
                          return (
                            <div
                              key={ap.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-gold-500/20 border-gold-500/60"
                                  : "bg-gray-700/70 border-gray-600 hover:border-gold-500/40"
                              }`}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedPendingActionPoints(
                                    selectedPendingActionPoints.filter((id) => id !== ap.id)
                                  );
                                } else {
                                  setSelectedPendingActionPoints([...selectedPendingActionPoints, ap.id]);
                                }
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  if (isSelected) {
                                    setSelectedPendingActionPoints(
                                      selectedPendingActionPoints.filter((id) => id !== ap.id)
                                    );
                                  } else {
                                    setSelectedPendingActionPoints([...selectedPendingActionPoints, ap.id]);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-1 w-4 h-4 rounded accent-gold-500 cursor-pointer"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-100">
                                  {ap.description}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {assignedUser ? `Assigned to: ${assignedUser.user.name}` : "Unassigned"}
                                </p>
                                <select
                                  value={pendingActionPointAssignments[ap.id] ?? ap.assignedTo ?? ""}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    setPendingActionPointAssignments((prev) => ({
                                      ...prev,
                                      [ap.id]: e.target.value === "" ? "" : Number(e.target.value),
                                    }))
                                  }
                                  className="mt-2 w-full px-2 py-1.5 rounded-md bg-white dark:bg-gray-600 border border-gold-500/30 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 text-xs"
                                >
                                  <option value="">Select user to assign (optional)</option>
                                  {scopedMeetingMembers?.map((member) => (
                                    <option key={member.user.id} value={member.user.id}>
                                      {member.user.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Action Points
                </label>
                
                {/* Add Action Point */}
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-300 dark:border-gray-600">
                  <div className="mb-3">
                    <input
                      type="text"
                      value={newActionPointDescription}
                      onChange={(e) => setNewActionPointDescription(e.target.value)}
                      placeholder="Enter action point description"
                      className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                    />
                  </div>
                  <div className="mb-3">
                    <select
                      value={newActionPointAssignedTo}
                      onChange={(e) => setNewActionPointAssignedTo(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                    >
                      <option value="">Select user to assign (optional)</option>
                      {scopedMeetingMembers?.map((member) => (
                        <option key={member.user.id} value={member.user.id}>
                          {member.user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      if (!newActionPointDescription.trim()) {
                        toast.error("Please enter action point description");
                        return;
                      }

                      setActionPoints([
                        ...actionPoints,
                        {
                          description: newActionPointDescription,
                          ...(newActionPointAssignedTo
                            ? { assignedTo: Number(newActionPointAssignedTo) }
                            : {}),
                        },
                      ]);
                      setNewActionPointDescription("");
                      setNewActionPointAssignedTo("");
                    }}
                    className="w-full px-3 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors font-medium text-sm"
                  >
                    Add Action Point
                  </button>
                </div>

                {/* Action Points List */}
                {actionPoints.length > 0 && (
                  <div className="space-y-2">
                    {actionPoints.map((ap, idx) => {
                      const assignedUser = scopedMeetingMembers?.find((m) => m.user.id === ap.assignedTo);
                      return (
                        <div
                          key={idx}
                          className="flex items-start justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {ap.description}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Assigned to: {assignedUser?.user.name || "Unassigned"}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setActionPoints(actionPoints.filter((_, i) => i !== idx));
                            }}
                            className="ml-3 text-red-400 hover:text-red-300"
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
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateMeeting(false);
                    setMeetingTitle("");
                    setMeetingDetails("");
                    setMeetingVenue("");
                    setMeetingStartDateTime("");
                    setMeetingEndDateTime("");
                    setMeetingTimezone("Asia/Karachi");
                    setSelectedMeetingSubCommitteeId("");
                    setSelectedMeetingSubCommittee(null);
                    setSelectedMeetingAttendees([]);
                    setActionPoints([]);
                    setNewActionPointDescription("");
                    setNewActionPointAssignedTo("");
                    setSelectedPendingActionPoints([]);
                    setPendingActionPoints([]);
                    setPendingActionPointAssignments({});
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateMeeting}
                  disabled={!meetingTitle.trim() || !meetingStartDateTime || !meetingEndDateTime || submitting}
                  className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md disabled:opacity-60 transition-colors font-medium flex items-center gap-2"
                >
                  {submitting ? (
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
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    "Create Meeting"
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

CommitteeDetailPage.getLayout = (page: React.ReactNode) => (
  <MainLayout activeMenu="committee">{page}</MainLayout>
);
