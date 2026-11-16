"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import useAuthStore from "@/store/authStore";
import useFileDownloader from "@/hooks/useFileDownloader";
import { toast } from "react-toastify";
import { getCommitteeById } from "@/services/committee";
import {
  getCommitteeMeetingById,
  markMyMeetingAttendance,
  addMeetingAttendance,
  updateMeetingActionPointStatus,
  exportMeetingAttendanceToCSV,
  updateCommitteeMeeting,
  deleteCommitteeMeeting,
  approveMeetingMOM,
  updateMeetingRSVP,
  editMeetingActionPoint,
  createMeetingActionPoint,
  deleteMeetingActionPoint,
  deleteMeetingMedia,
  deleteMeetingMOMPdf,
} from "@/services/committeeMeeting";
import type { Committee } from "@/types/committee";
import MainLayout from "@/layouts/MainLayout";
import { useAbility } from "@/hooks/useAbility";
import CommitteeMeetingMOMModal from "@/components/committee/CommitteeMeetingMOMModal";
import { Modal, Button, Label, FileInput } from "flowbite-react";

const CKEditorClient = dynamic(() => import("@/components/CKEditorClient"), {
  ssr: false,
  loading: () => <p className="text-gray-400">Loading Editor...</p>,
});


enum CommitteeMeetingRSVPStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  MAYBE = "MAYBE",
}

interface AttendanceRecord {
  userId: number;
  status: "ATTENDED" | "NOT_ATTENDED";
  user?: { name: string; email: string };
}

interface Assignee {
  id: number;
  rsvpStatus?: CommitteeMeetingRSVPStatus;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface ActionPoint {
  id?: number;
  description: string;
  assignedTo?: number;
  status?: "PENDING" | "COMPLETED" | "TRANSFERRED";
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

interface Meeting {
  id: number;
  title: string;
  details?: string;
  venue?: string;
  startDate: string;
  endDate: string;
  timezone?: string;
  committeeId: number;
  subCommitteeId?: number;
  meetingStatus: "PENDING" | "ONGOING" | "COMPLETED" | "CANCELLED";
  meetingMOM?: string;
  meetingMOMPDF?: string;
  meetingMOMStatus?: "PENDING" | "APPROVED" | "REJECTED" | "NOT_SUBMITTED";
  meetingMOMEditor?: { id: number; name: string };
  meetingMOMReviewer?: { id: number; name: string };
  userIds?: number[];
  actionPoints?: ActionPoint[];
  assignees?: Assignee[];
  attendance?: AttendanceRecord[];
  users?: Array<{ id: number; name: string; email: string }>;
  committee?: { id: number; name: string };
  subCommittee?: { id: number; name: string };
  media?: Array<{
    id: number;
    assetURL: string;
  }>;
  userId?: number; // creator
  momApprovals?: Array<{
    id: number;
    meetingId: number;
    userId: number;
    status: "APPROVED" | "REJECTED";
    comment?: string;
    createdAt: string;
    user: {
      id: number;
      name: string;
      email: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getMeetingStatusColor = (status: string) => {
  switch (status) {
    case "PENDING":
      return "bg-gold-500/20 text-gold-400 border border-gold-500/30";
    case "ONGOING":
      return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
    case "COMPLETED":
      return "bg-green-500/20 text-green-400 border border-green-500/30";
    case "CANCELLED":
      return "bg-red-500/20 text-red-400 border border-red-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
  }
};

const getActionPointStatusColor = (status?: string) => {
  switch (status) {
    case "COMPLETED":
      return "bg-green-500/20 text-green-400";
    case "TRANSFERRED":
      return "bg-blue-500/20 text-blue-400";
    default:
      return "bg-gold-500/20 text-gold-400";
  }
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "Not set";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "Invalid date";
  }
};

const formatTime = (dateString?: string | null) => {
  if (!dateString) return "";
  try {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
};

const getDocumentFileName = (url?: string | null) => {
  if (!url) return "Document";
  return url.split('/').pop() || "Document";
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function MeetingDetailPage() {
  const router = useRouter();
  const { id: committeeId, meetingId } = router.query;
  const token = useAuthStore((s) => s.token);
  const currentUser = useAuthStore((s) => s.user);
  const { downloadFile, loading: downloadLoading } = useFileDownloader();
  const ability = useAbility();
  const canReadCommitteeMeeting = ability?.can("read", "CommitteeMeeting");
  const canUpdateCommitteeMeeting = ability?.can("update", "CommitteeMeeting");
  const canApproveCommitteeMeeting = ability?.can("approve", "CommitteeMeeting");
  const canManageCommitteeMeeting = ability?.can("manage", "CommitteeMeeting");

  const [committee, setCommittee] = useState<Committee | null>(null);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(false);

  const [markingMyAttendance, setMarkingMyAttendance] = useState(false);
  const [markingBulkAttendance, setMarkingBulkAttendance] = useState(false);
  const [selectedForAttendance, setSelectedForAttendance] = useState<number[]>([]);
  const [showBulkAttendance, setShowBulkAttendance] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [updatingActionPoint, setUpdatingActionPoint] = useState<number | null>(null);
  const [updatingRSVP, setUpdatingRSVP] = useState(false);
  const [showRSVPModal, setShowRSVPModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [updatingMeeting, setUpdatingMeeting] = useState(false);
  const [cancelingMeeting, setCancelingMeeting] = useState(false);
  const [showCancelMeetingModal, setShowCancelMeetingModal] = useState(false);
  const [showDeleteMeetingModal, setShowDeleteMeetingModal] = useState(false);
  const [deletingMeeting, setDeletingMeeting] = useState(false);
  const [editingActionPoint, setEditingActionPoint] = useState<ActionPoint | null>(null);
  const [editAPDescription, setEditAPDescription] = useState("");
  const [editAPAssignedTo, setEditAPAssignedTo] = useState<number | "">("");
  const [savingActionPoint, setSavingActionPoint] = useState(false);
  const [deletingActionPointId, setDeletingActionPointId] = useState<number | null>(null);
  const [confirmDeleteAPId, setConfirmDeleteAPId] = useState<number | null>(null);
  const [showCreateAPModal, setShowCreateAPModal] = useState(false);
  const [newAPDescription, setNewAPDescription] = useState("");
  const [newAPAssignedTo, setNewAPAssignedTo] = useState<number | "">("");
  const [creatingActionPoint, setCreatingActionPoint] = useState(false);
  const [showMomModal, setShowMomModal] = useState(false);
  const [momInput, setMomInput] = useState("");
  const [submittingMom, setSubmittingMom] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [openMediaModal, setOpenMediaModal] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  const [deletingMediaId, setDeletingMediaId] = useState<number | null>(null);
  const [deletingMOMPdf, setDeletingMOMPdf] = useState(false);
  const [showDeleteMOMPdfModal, setShowDeleteMOMPdfModal] = useState(false);

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState("");
  const [editedMOMContent, setEditedMOMContent] = useState("");
  const [submittingApproval, setSubmittingApproval] = useState(false);

  const mId = Array.isArray(meetingId) ? meetingId[0] : meetingId;
  const cId = Array.isArray(committeeId) ? committeeId[0] : committeeId;

  const loadData = useCallback(async () => {
    if (!token || !committeeId || !meetingId) return;
    setLoading(true);
    try {
      const [committeeData, meetingData] = await Promise.all([
        getCommitteeById(token, cId!),
        getCommitteeMeetingById(token, parseInt(mId!)),
      ]);
      setCommittee(committeeData);
      setMeeting(meetingData as unknown as Meeting);
    } catch (e: any) {
      toast.error(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [token, committeeId, meetingId, cId, mId]);

  useEffect(() => {
    if (token && !canReadCommitteeMeeting) {
      toast.error("You are not authorized to access this page. Routing you back to the homepage");
      router.push("/userMarketplace");
      return;
    }

    loadData();
  }, [loadData, token, canReadCommitteeMeeting, router]);

  useEffect(() => {
    if (meeting) {
      setEditTitle(meeting.title);
      setEditDetails(meeting.details || "");
      setEditVenue(meeting.venue || "");
      setEditStartDate(meeting.startDate);
      setEditEndDate(meeting.endDate);
      setMomInput(meeting.meetingMOM || "");
    }
  }, [meeting]);


  const getAttendanceForUser = (userId: number) =>
    meeting?.attendance?.find((att) => att.userId === userId);

  const isCurrentUserAssigned = () => {
    if (!currentUser || !meeting) return false;
    const uid = parseInt(currentUser.id);
    return (
      meeting.assignees?.some((a) => a.user?.id === uid) ||
      meeting.users?.some((u) => u.id === uid) ||
      false
    );
  };

  const hasCurrentUserAttended = () => {
    if (!currentUser) return false;
    const uid = parseInt(currentUser.id);
    const att = getAttendanceForUser(uid);
    return att?.status === "ATTENDED";
  };


  const handleMarkMyAttendance = async () => {
    if (!token || !mId) return;
    setMarkingMyAttendance(true);
    try {
      await markMyMeetingAttendance(token, parseInt(mId));
      toast.success("Your attendance has been marked successfully!");
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to mark attendance");
    } finally {
      setMarkingMyAttendance(false);
    }
  };

  const handleBulkAttendance = async () => {
    if (!token || !mId || selectedForAttendance.length === 0) {
      toast.error("Please select at least one attendee");
      return;
    }
    setMarkingBulkAttendance(true);
    try {
      await addMeetingAttendance(token, parseInt(mId), selectedForAttendance);
      toast.success(
        `Attendance marked for ${selectedForAttendance.length} member(s). Notifications sent.`
      );
      setShowBulkAttendance(false);
      setSelectedForAttendance([]);
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to mark attendance");
    } finally {
      setMarkingBulkAttendance(false);
    }
  };

  const handleToggleSelectAll = () => {
    const allIds = getAllAttendeeIds();
    if (selectedForAttendance.length === allIds.length) {
      setSelectedForAttendance([]);
    } else {
      setSelectedForAttendance(allIds);
    }
  };

  const getAllAttendeeIds = (): number[] => {
    const assignees = meeting?.assignees || [];
    const users = meeting?.users || [];
    if (assignees.length > 0) return assignees.map((a) => a.user.id);
    return users.map((u) => u.id);
  };

  const handleUpdateActionPointStatus = async (
    actionPointId: number,
    newStatus: "PENDING" | "COMPLETED" | "TRANSFERRED"
  ) => {
    if (!token) return;
    setUpdatingActionPoint(actionPointId);
    try {
      await updateMeetingActionPointStatus(token, actionPointId, newStatus);
      toast.success(`Action point marked as ${newStatus.toLowerCase()}`);
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to update action point");
    } finally {
      setUpdatingActionPoint(null);
    }
  };

  const handleExportCSV = async () => {
    if (!token || !mId) return;
    setExportingCSV(true);
    try {
      await exportMeetingAttendanceToCSV(token, parseInt(mId));
      toast.success("CSV exported successfully");
    } catch (e: any) {
      toast.error(e.message || "Failed to export CSV");
    } finally {
      setExportingCSV(false);
    }
  };

  const getCurrentUserRSVPStatus = (): CommitteeMeetingRSVPStatus | null => {
    if (!currentUser || !meeting?.assignees) return null;
    const uid = parseInt(currentUser.id);
    const assignee = meeting.assignees.find((a) => a.user?.id === uid);
    return (assignee?.rsvpStatus as CommitteeMeetingRSVPStatus) ?? null;
  };

  const handleRSVPUpdate = async (status: CommitteeMeetingRSVPStatus) => {
    if (!token || !mId) return;
    setUpdatingRSVP(true);
    try {
      await updateMeetingRSVP(token, parseInt(mId), status);
      toast.success(`RSVP status updated to ${status}`);
      setShowRSVPModal(false);
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to update RSVP status");
    } finally {
      setUpdatingRSVP(false);
    }
  };

  const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []).slice(0, 10);
    setMediaFiles(selectedFiles);
  };

  const handleUploadMedia = async () => {
    if (!mId || !token) return;

    const formData = new FormData();
    mediaFiles.forEach((file, index) => {
      formData.append(`eventMedia${index + 1}`, file);
    });

    if (!mediaFiles.length) {
      toast.error("Please select at least one media file");
      return;
    }

    setUploadingMedia(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/committee-meeting/media/${mId}`,
        {
          method: "POST",
          headers: {
            token: `${token}`,
          },
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.[0]?.msg || "Failed to upload media");
      }

      setMediaFiles([]);
      const mediaInput = document.getElementById("meetingMedia") as HTMLInputElement | null;
      if (mediaInput) mediaInput.value = "";

      toast.success("Media uploaded successfully");
      setOpenMediaModal(false);
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message || "Failed to upload media" : "An unknown error occurred"
      );
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleEditMeeting = async () => {
    if (!token || !mId || !editTitle.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    const startDate = new Date(editStartDate);
    const endDate = new Date(editEndDate);

    if (startDate >= endDate) {
      toast.error("End date/time must be after start date/time");
      return;
    }

    setUpdatingMeeting(true);
    try {
      await updateCommitteeMeeting(token, parseInt(mId), {
        title: editTitle.trim(),
        details: editDetails.trim(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      toast.success("Meeting updated successfully!");
      setEditingMeeting(false);
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to update meeting");
    } finally {
      setUpdatingMeeting(false);
    }
  };


  const handleCancelMeeting = () => {
    if (!meeting) return;
    if (meeting.meetingStatus === "CANCELLED") {
      return;
    }
    setShowCancelMeetingModal(true);
  };

  const confirmCancelMeeting = async () => {
    if (!token || !mId || !meeting) return;
    setCancelingMeeting(true);
    try {
      await updateCommitteeMeeting(token, parseInt(mId), {
        meetingStatus: "CANCELLED",
      });
      toast.success("Meeting cancelled successfully");
      setShowCancelMeetingModal(false);
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to cancel meeting");
    } finally {
      setCancelingMeeting(false);
    }
  };

  const handleOpenEditMeeting = () => {
    if (!meeting) return;
    setEditDetails(meeting.details || "");
    setEditVenue(meeting.venue || "");
    setEditEndDate(meeting.endDate);
    setEditingMeeting(true);
  };

  const handleSaveEditMeeting = async () => {
    if (!token || !mId) return;
    const endDate = new Date(editEndDate);
    const startDate = new Date(meeting?.startDate || "");
    if (startDate >= endDate) {
      toast.error("End date/time must be after start date/time");
      return;
    }
    setUpdatingMeeting(true);
    try {
      await updateCommitteeMeeting(token, parseInt(mId), {
        details: editDetails.trim() || undefined,
        venue: editVenue.trim() || undefined,
        endDate: endDate.toISOString(),
      });
      toast.success("Meeting updated successfully!");
      setEditingMeeting(false);
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to update meeting");
    } finally {
      setUpdatingMeeting(false);
    }
  };

  const confirmDeleteMeeting = async () => {
    if (!token || !mId) return;
    setDeletingMeeting(true);
    try {
      await deleteCommitteeMeeting(token, parseInt(mId));
      toast.success("Meeting deleted successfully");
      router.back();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete meeting");
    } finally {
      setDeletingMeeting(false);
    }
  };

  const handleDeleteMeetingMedia = async (mediaId: number) => {
    if (!token || !mId) return;
    setDeletingMediaId(mediaId);
    try {
      await deleteMeetingMedia(token, parseInt(mId), mediaId);
      toast.success("Media deleted successfully");
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete media");
    } finally {
      setDeletingMediaId(null);
    }
  };

  const handleDeleteMOMPdf = async () => {
    if (!token || !mId) return;
    setDeletingMOMPdf(true);
    try {
      await deleteMeetingMOMPdf(token, parseInt(mId));
      toast.success("MOM PDF deleted successfully");
      setShowDeleteMOMPdfModal(false);
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete MOM PDF");
    } finally {
      setDeletingMOMPdf(false);
    }
  };

  const handleOpenEditActionPoint = (point: ActionPoint) => {
    setEditingActionPoint(point);
    setEditAPDescription(point.description);
    setEditAPAssignedTo(point.assignedTo ?? "");
  };

  const handleSaveEditActionPoint = async () => {
    if (!token || !editingActionPoint?.id) return;
    if (!editAPDescription.trim()) {
      toast.error("Description cannot be empty");
      return;
    }
    setSavingActionPoint(true);
    try {
      await editMeetingActionPoint(token, editingActionPoint.id, {
        description: editAPDescription.trim(),
        assignedTo: editAPAssignedTo !== "" ? Number(editAPAssignedTo) : null,
      });
      toast.success("Action point updated successfully");
      setEditingActionPoint(null);
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to update action point");
    } finally {
      setSavingActionPoint(false);
    }
  };

  const handleDeleteActionPoint = async () => {
    if (!token || !confirmDeleteAPId) return;
    setDeletingActionPointId(confirmDeleteAPId);
    try {
      await deleteMeetingActionPoint(token, confirmDeleteAPId);
      toast.success("Action point deleted successfully");
      setConfirmDeleteAPId(null);
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete action point");
    } finally {
      setDeletingActionPointId(null);
    }
  };

  const handleCreateActionPoint = async () => {
    if (!token || !mId) return;
    if (!newAPDescription.trim()) {
      toast.error("Description is required");
      return;
    }
    setCreatingActionPoint(true);
    try {
      await createMeetingActionPoint(token, parseInt(mId), {
        description: newAPDescription.trim(),
        assignedTo: newAPAssignedTo !== "" ? Number(newAPAssignedTo) : undefined,
      });
      toast.success("Action point created successfully");
      setShowCreateAPModal(false);
      setNewAPDescription("");
      setNewAPAssignedTo("");
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to create action point");
    } finally {
      setCreatingActionPoint(false);
    }
  };

  const handleMOMSubmit = async (momData: {
    momHTML: string;
    momPDF?: File;
  }) => {
    if (!token || !mId) return;

    if (!momData.momHTML.trim()) {
      toast.error("Please enter MOM details");
      return;
    }

    setSubmittingMom(true);
    try {
      const formData = new FormData();
      formData.append("meetingMOM", momData.momHTML);

      if (momData.momPDF) {
        formData.append("momPDF", momData.momPDF);
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/committee-meeting/mom/${mId}`,
        {
          method: "PATCH",
          headers: {
            ...(token ? { token } : {}),
          },
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.[0]?.msg || "Failed to update MOM");
      }

      toast.success("Minutes of Meeting submitted successfully!");
      setShowMomModal(false);
      setMomInput("");
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit MOM");
    } finally {
      setSubmittingMom(false);
    }
  };

  const handleMOMApproval = async (status: "APPROVED" | "REJECTED") => {
    if (!token || !mId) {
      toast.error("Authentication required. Please login again.");
      return;
    }
    setSubmittingApproval(true);
    try {
      const requestBody: any = {
        status,
        ...(approvalComment && { comment: approvalComment }),
      };

      // Include edited MOM content if it was modified
      if (editedMOMContent && editedMOMContent !== meeting?.meetingMOM) {
        requestBody.meetingMOM = editedMOMContent;
      }

      await approveMeetingMOM(token, parseInt(mId), requestBody);

      status === "APPROVED"
        ? toast.success("Minutes of meeting approved")
        : toast.success("Minutes of meeting rejected");

      setShowApprovalModal(false);
      setApprovalComment("");
      setEditedMOMContent("");
      await loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve MOM");
    } finally {
      setSubmittingApproval(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────

  const attendees =
    meeting?.assignees?.map((a) => a.user) || meeting?.users || [];

  const unattendedAssignees = attendees.filter((u) => {
    const att = getAttendanceForUser(u.id);
    return !att || att.status !== "ATTENDED";
  });
  const isSubCommitteeMeeting = Boolean(meeting?.subCommitteeId || meeting?.subCommittee?.id);
  const meetingGroupName =
    meeting?.subCommittee?.name || meeting?.committee?.name || committee?.name || "N/A";
  const hasLeftPanelContent = Boolean(meeting?.meetingMOM || meeting?.media?.length);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500" />
          <p className="text-gray-400 text-sm">Loading meeting details…</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen text-white flex flex-col items-center justify-center p-4">
        <p className="text-xl text-gray-400 mb-4">Meeting not found</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-black rounded-lg font-medium transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  
  const canEditMeeting = Boolean(canUpdateCommitteeMeeting);

  const isAssigned = isCurrentUserAssigned();
  const canSelfMarkAttendance = isAssigned && (meeting.meetingStatus === "ONGOING" || meeting.meetingStatus === "COMPLETED");
  const alreadyAttended = hasCurrentUserAttended();

  return (
    <div className="min-h-screen text-white flex flex-col p-4 max-w-6xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center text-gold-500 hover:text-gold-400 mb-6 transition-colors w-fit"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Meetings
      </button>

      <div className="space-y-6">
        <div className="bg-gray-800 border border-gold-500/40 rounded-xl p-6">
          <div className="mb-4">
            <div className="flex items-start justify-between mb-3 flex-wrap gap-3">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gold-500 mb-1">{meeting.title}</h1>
                <p className="text-gray-400 text-sm">Meeting ID: {meeting.id}</p>
                <p className="text-gold-400 text-sm mt-1">
                  {isSubCommitteeMeeting ? "Sub-Committee Meeting" : "Committee Meeting"}: {meetingGroupName}
                </p>
              </div>
              <span className={`px-3 py-1.5 text-sm font-semibold rounded-lg whitespace-nowrap ${
                meeting.meetingStatus === "PENDING" ? "bg-gold-500/20 text-gold-400 border border-gold-500/30" :
                meeting.meetingStatus === "ONGOING" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                meeting.meetingStatus === "COMPLETED" ? "bg-green-500/20 text-green-400 border border-green-500/30" :
                "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}>
                {meeting.meetingStatus}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {meeting.meetingStatus === "COMPLETED" && canEditMeeting && (
                <button
                  onClick={() => setShowMomModal(true)}
                  className="px-4 py-2 bg-gold-500 hover:bg-gold-400 text-black font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  📝 Add Minutes
                </button>
              )}
              {canEditMeeting && meeting.meetingStatus !== "CANCELLED" && (
                <button
                  onClick={handleOpenEditMeeting}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  ✏️ Edit Meeting
                </button>
              )}
              {canManageCommitteeMeeting && (
                <button
                  onClick={() => setShowDeleteMeetingModal(true)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  🗑️ Delete Meeting
                </button>
              )}
              {canEditMeeting &&
                
                meeting.meetingStatus !== "CANCELLED" && (
                  <button
                    onClick={handleCancelMeeting}
                    disabled={cancelingMeeting}
                    className="px-4 py-2 bg-red-400 hover:bg-red-300 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    {cancelingMeeting ? "Cancelling..." : "Cancel Meeting"}
                  </button>
                )}
              {/* RSVP button for assigned users on non-completed/cancelled meetings */}
              {isAssigned &&
                meeting.meetingStatus === "PENDING" && (
                  <button
                    onClick={() => setShowRSVPModal(true)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    {getCurrentUserRSVPStatus() === CommitteeMeetingRSVPStatus.PENDING
                      ? "RSVP Now"
                      : `Update RSVP (${getCurrentUserRSVPStatus()})`}
                  </button>
                )}
              {new Date(meeting.startDate) < new Date() && canEditMeeting && meeting.meetingStatus !== "CANCELLED" && (
                <Button
                  color="dark"
                  size="sm"
                  className="border border-gray-700"
                  onClick={() => setOpenMediaModal(true)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h4l2-2h6l2 2h4v12H3V7zm9 3a4 4 0 100 8 4 4 0 000-8z" />
                  </svg>
                  Add Media
                </Button>
             )}
            </div>
          </div>

          {meeting?.details ? (
            <div className="mb-6 pb-6 border-b border-gray-700">
              <label className="text-sm font-semibold text-gray-400 block mb-2">Description</label>
              <div
                className="text-gray-300 whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ __html: decodeHtmlEntities(meeting.details) }}
              />
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-700">
            <div>
              <p className="text-gray-400 text-sm font-medium mb-1 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Start Date & Time
              </p>
              <p className="text-white font-medium">{formatDate(meeting.startDate)}</p>
              <p className="text-gray-400 text-sm">{formatTime(meeting.startDate)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium mb-1 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                End Date & Time
              </p>
              <p className="text-white font-medium">{formatDate(meeting.endDate)}</p>
              <p className="text-gray-400 text-sm">{formatTime(meeting.endDate)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium mb-1">📍 Venue</p>
              <p className="text-white font-medium">{meeting.venue || "Not specified"}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm font-medium mb-1">🌐 Timezone</p>
              <p className="text-white font-medium">{meeting.timezone || "UTC"}</p>
            </div>
          </div>

          <div className="text-sm text-gray-500 flex gap-4 flex-wrap">
            <p>Created: {formatDate(meeting.createdAt)}</p>
            <p>Updated: {formatDate(meeting.updatedAt)}</p>
          </div>
        </div>

        {/* ── Self-Attendance Banner (for assigned users) ── */}
        {canSelfMarkAttendance && meeting.meetingStatus === "ONGOING" && (
          <div className={`rounded-xl p-5 flex items-center justify-between gap-4 flex-wrap border ${alreadyAttended
            ? "bg-green-500/10 border-green-500/40"
            : "bg-gold-500/10 border-gold-500/40"
            }`}>
            <div>
              <p className="font-semibold text-white mb-1">
                {alreadyAttended ? "✅ You have attended this meeting" : "📋 Mark Your Attendance"}
              </p>
              <p className="text-sm text-gray-400">
                {alreadyAttended
                  ? "Your attendance has been recorded."
                  : "You are assigned to this meeting. Mark yourself as attended."}
              </p>
            </div>
            {!alreadyAttended && (
              <button
                onClick={handleMarkMyAttendance}
                disabled={markingMyAttendance}
                className="px-5 py-2.5 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-black font-semibold rounded-lg transition-colors flex items-center gap-2 flex-shrink-0"
              >
                {markingMyAttendance ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
                    Marking…
                  </>
                ) : (
                  "Mark as Attended"
                )}
              </button>
            )}
          </div>
        )}

        <div className={`grid grid-cols-1 ${hasLeftPanelContent ? "lg:grid-cols-3" : ""} gap-6`}>
          {hasLeftPanelContent && (
            <div className="lg:col-span-2 space-y-6">
              {meeting.meetingMOM && (
              <div className="bg-gray-800 border border-gold-500/40 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-700 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gold-500">📋 Minutes of Meeting</h2>
                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${meeting.meetingMOMStatus === "APPROVED"
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : meeting.meetingMOMStatus === "REJECTED"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30"
                        : "bg-gold-500/20 text-gold-400 border border-gold-500/30"
                      }`}>
                      {meeting.meetingMOMStatus || "NOT_SUBMITTED"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {meeting.meetingMOMEditor && (
                      <p className="text-xs text-gray-400">
                        Edited by: <span className="text-gold-400 font-medium">{meeting.meetingMOMEditor.name}</span>
                      </p>
                    )}
                    {canApproveCommitteeMeeting && meeting.meetingMOMEditor && meeting.meetingMOMEditor.id !== parseInt(currentUser?.id || "0") && !meeting.momApprovals?.some(
                      (approval) => approval.userId === parseInt(currentUser?.id || "0")
                    ) && (
                      <button
                        onClick={() => {
                          setShowApprovalModal(true);
                          setEditedMOMContent(meeting.meetingMOM || "");
                        }}
                        className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                      >
                        Approve or Reject
                      </button>
                    )}
                  </div>
                </div>

                {/* MOM Content */}
                <div className="bg-gray-700/50 rounded-lg p-4 mb-4 border border-gray-600 max-h-72 overflow-y-auto">
                  <div
                    className="text-gray-200 prose-sm max-w-none prose-invert"
                    dangerouslySetInnerHTML={{ __html: meeting.meetingMOM }}
                  />
                </div>

                {/* PDF Section */}
                {meeting.meetingMOMPDF && (
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() => {
                        if (!meeting.meetingMOMPDF) return;
                        const fileName = meeting.meetingMOMPDF.split('/').pop()?.replace(/%20/g, ' ') || 'Meeting Minutes PDF';
                        downloadFile(meeting.meetingMOMPDF, fileName);
                      }}
                      disabled={downloadLoading}
                      className="flex-1 flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors disabled:opacity-60 cursor-pointer"
                      title="Download PDF"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-200 break-all pr-3">
                        {meeting.meetingMOMPDF.split('/').pop()?.replace(/%20/g, ' ') || 'Meeting Minutes PDF'}
                      </span>
                      <svg className={`w-4 h-4 text-gold-600 flex-shrink-0 ${downloadLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    {canManageCommitteeMeeting && (
                      <button
                        onClick={() => setShowDeleteMOMPdfModal(true)}
                        disabled={deletingMOMPdf}
                        className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                        title="Delete MOM PDF"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}

                {/* Approval History */}
                {meeting.momApprovals && meeting.momApprovals.length > 0 && (
                  <div className="pt-4 border-t border-gray-700">
                    <h3 className="text-lg font-semibold text-gold-500 mb-4">Approval History</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {meeting.momApprovals.map((approval) => (
                        <div key={approval.id} className="p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-white">{approval.user.name}</p>
                              <p className="text-xs text-gray-400">{approval.user.email}</p>
                            </div>
                            <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full whitespace-nowrap ${
                              approval.status === "APPROVED"
                                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                            }`}>
                              {approval.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">{new Date(approval.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}</p>
                          {approval.comment && (
                            <p className="text-sm text-gray-200 bg-gray-600/50 p-3 rounded-md border border-gray-600 italic">
                              &quot;{approval.comment}&quot;
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              )}

              {meeting?.media?.length ? (
                <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
                  <h2 className="text-lg font-semibold text-gold-500 mb-4">Meeting Gallery</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-1">
                    {meeting.media.map((item, index) => (
                      <div key={item.id || index} className="relative group overflow-hidden rounded-lg">
                        {item.assetURL.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                          <div className="aspect-video">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.assetURL}
                              alt={`Meeting media ${index + 1}`}
                              className="object-cover w-full h-full rounded-lg border border-gray-700 hover:opacity-90 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100">
                              <a
                                href={item.assetURL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-gold-500 text-black px-3 py-1 rounded-md text-sm font-medium"
                              >
                                View Full Size
                              </a>
                            </div>
                            {canManageCommitteeMeeting && item.id && (
                              <button
                                onClick={() => handleDeleteMeetingMedia(item.id!)}
                                disabled={deletingMediaId === item.id}
                                className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all disabled:opacity-60 z-10"
                                title="Delete media"
                              >
                                {deletingMediaId === item.id ? (
                                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                  </svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="relative">
                            <a
                              href={item.assetURL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center bg-gray-700 p-4 rounded-lg h-full text-gold-500 hover:bg-gray-600 transition-colors"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 3h7l5 5v13H7a2 2 0 01-2-2V5a2 2 0 012-2zm7 1v5h5" />
                              </svg>
                              <span>View File {index + 1}</span>
                            </a>
                            {canManageCommitteeMeeting && item.id && (
                              <button
                                onClick={() => handleDeleteMeetingMedia(item.id!)}
                                disabled={deletingMediaId === item.id}
                                className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all disabled:opacity-60 z-10"
                                title="Delete media"
                              >
                                {deletingMediaId === item.id ? (
                                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                  </svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          <div className={`${hasLeftPanelContent ? "lg:col-span-1" : "lg:col-span-3"} space-y-6`}>
            <div className="bg-gray-800 border border-gold-500/40 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gold-500">
                  Action Points ({meeting.actionPoints?.length || 0})
                </h2>
                {canManageCommitteeMeeting && meeting.meetingStatus !== "CANCELLED" && (
                  <button
                    onClick={() => setShowCreateAPModal(true)}
                    className="px-3 py-1.5 text-xs bg-gold-500/20 hover:bg-gold-500/30 text-gold-400 border border-gold-500/30 rounded-lg font-medium transition-colors"
                  >
                    + Add Action Point
                  </button>
                )}
              </div>

              {meeting.actionPoints && meeting.actionPoints.length > 0 ? (
                <ul className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {meeting.actionPoints.map((point, index) => (
                    <li
                      key={point.id || index}
                      className="p-4 bg-gray-700/50 rounded-lg border border-gray-600"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0 ${point.status === "COMPLETED"
                          ? "bg-green-400"
                          : point.status === "TRANSFERRED"
                            ? "bg-blue-400"
                            : "bg-gold-400"
                          }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-200 text-sm leading-relaxed break-words">
                            {point.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {point.status && (
                              <span className={`px-2 py-0.5 text-xs font-medium rounded ${getActionPointStatusColor(point.status)}`}>
                                {point.status}
                              </span>
                            )}
                            {point.user && (
                              <span className="text-xs text-gray-400">
                                Assigned to:{" "}
                                <span className="text-gold-400 font-medium">
                                  {point.user.name}
                                </span>
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2 mt-3 flex-wrap" >
                            {point.id && point.status === "PENDING"  && meeting.meetingStatus !== "CANCELLED" && (canManageCommitteeMeeting || point.user?.id === parseInt(currentUser?.id || "0")) && (
                              <button
                                onClick={() =>
                                  handleUpdateActionPointStatus(point.id!, "COMPLETED")
                                }
                                disabled={updatingActionPoint === point.id}
                                className="px-3 py-1.5 text-xs bg-green-500/20 hover:bg-green-500/40 text-green-400 border border-green-500/30 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                {updatingActionPoint === point.id ? (
                                  <div className="animate-spin h-3 w-3 border border-green-400 border-t-transparent rounded-full" />
                                ) : (
                                  "✓"
                                )}
                                Mark Complete
                              </button>
                            )}
                            {point.id && canManageCommitteeMeeting && meeting.meetingStatus !== "CANCELLED" && (
                              <button
                                onClick={() => handleOpenEditActionPoint(point)}
                                className="px-3 py-1.5 text-xs bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 border border-blue-500/30 rounded-lg font-medium transition-colors flex items-center gap-1"
                              >
                                ✏️ Edit
                              </button>
                            )}
                            {point.id && canManageCommitteeMeeting && meeting.meetingStatus !== "CANCELLED" && (
                              <button
                                onClick={() => setConfirmDeleteAPId(point.id!)}
                                disabled={deletingActionPointId === point.id}
                                className="px-3 py-1.5 text-xs bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/30 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                {deletingActionPointId === point.id ? (
                                  <div className="animate-spin h-3 w-3 border border-red-400 border-t-transparent rounded-full" />
                                ) : "🗑️"}
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-8">No action points for this meeting</p>
              )}
            </div>
            <div className="bg-gray-800 border border-gold-500/40 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-xl font-bold text-gold-500">
                  Attendees ({attendees.length})
                </h2>
                <div className="flex gap-2">
                  {attendees.length > 0 && canManageCommitteeMeeting && meeting.meetingStatus !== "CANCELLED" && (
                    <>
                      <button
                        onClick={handleExportCSV}
                        disabled={exportingCSV}
                        className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {exportingCSV ? (
                          <div className="animate-spin h-3 w-3 border border-gray-300 border-t-transparent rounded-full" />
                        ) : (
                          "⬇"
                        )}
                        Export CSV
                      </button>
                      <button
                        onClick={() => setShowBulkAttendance(!showBulkAttendance)}
                        className="px-3 py-1.5 text-xs bg-gold-500/20 hover:bg-gold-500/30 text-gold-400 border border-gold-500/30 rounded-lg font-medium transition-colors"
                      >
                        {showBulkAttendance ? "Cancel" : "Mark Attendance"}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Bulk attendance panel */}
              {showBulkAttendance && unattendedAssignees.length > 0 && (
                <div className="mb-4 p-4 bg-gray-700/50 rounded-lg border border-gold-500/20">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-gray-300 font-medium">
                      Select members to mark as attended
                    </p>
                    <button
                      onClick={handleToggleSelectAll}
                      className="text-xs text-gold-400 hover:text-gold-300"
                    >
                      {selectedForAttendance.length === unattendedAssignees.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {unattendedAssignees.map((u) => (
                      <label
                        key={u.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-600/50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedForAttendance.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedForAttendance((prev) => [...prev, u.id]);
                            } else {
                              setSelectedForAttendance((prev) =>
                                prev.filter((id) => id !== u.id)
                              );
                            }
                          }}
                          className="accent-gold-500"
                        />
                        <div>
                          <p className="text-sm text-white">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={handleBulkAttendance}
                    disabled={markingBulkAttendance || selectedForAttendance.length === 0}
                    className="mt-3 w-full py-2 bg-gold-500 hover:bg-gold-400 text-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {markingBulkAttendance ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
                        Marking…
                      </>
                    ) : (
                      `Mark ${selectedForAttendance.length || ""} as Attended`
                    )}
                  </button>
                </div>
              )}

              {showBulkAttendance && unattendedAssignees.length === 0 && (
                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center text-sm text-green-400">
                  ✅ All members have already been marked as attended!
                </div>
              )}

              {/* Rest of attendees content... */}
              {attendees.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {attendees.map((attendee) => {
                    const att = getAttendanceForUser(attendee.id);
                    const attended = att?.status === "ATTENDED";

                    return (
                      <div
                        key={attendee.id}
                        className="flex items-center gap-3 p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <div className="w-9 h-9 bg-gold-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-gold-500 font-semibold text-sm">
                            {attendee.name?.charAt(0).toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate text-sm">{attendee.name}</p>
                          <p className="text-xs text-gray-400 truncate">{attendee.email}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {(() => {
                            const assignee = meeting.assignees?.find((a) => a.user?.id === attendee.id);
                            const rsvp = assignee?.rsvpStatus;
                            if (!rsvp || rsvp === CommitteeMeetingRSVPStatus.PENDING) return null;
                            return (
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                                rsvp === CommitteeMeetingRSVPStatus.ACCEPTED
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : rsvp === CommitteeMeetingRSVPStatus.DECLINED
                                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                                  : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                              }`}>
                                {rsvp}
                              </span>
                            );
                          })()}
                          <span
                            className={`px-2.5 py-1 text-xs font-semibold rounded-full ${attended
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-gray-600/50 text-gray-400 border border-gray-600"
                              }`}
                          >
                            {attended ? "✓ Attended" : "Absent"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No attendees assigned</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Committee Info ── */}
        {committee && (
          <div className="bg-gray-800 border border-gold-500/40 rounded-xl p-6">
            <h2 className="text-xl font-bold text-gold-500 mb-3">
              {isSubCommitteeMeeting ? "Sub-Committee" : "Committee"}
            </h2>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-400 text-sm mb-1">
                  {isSubCommitteeMeeting ? "Sub-Committee Name" : "Committee Name"}
                </p>
                <p className="text-white font-medium">{meetingGroupName}</p>
              </div>
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full ${committee.isActive
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
                  }`}
              >
                {committee.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        )}
      </div>

      <Modal
        show={showCancelMeetingModal}
        onClose={() => {
          if (!cancelingMeeting) setShowCancelMeetingModal(false);
        }}
        size="md"
      >
        <Modal.Header className="border-b border-red-400/40 bg-gray-800 text-white">
          Cancel Meeting
        </Modal.Header>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900">
          <p className="text-gray-200 leading-relaxed">
            Are you sure you want to cancel this meeting?
          </p>
          <p className="text-red-300 text-sm mt-2">
            This will mark the meeting status as CANCELLED.
          </p>
          {meeting && (
            <p className="text-gray-400 text-sm mt-4">
              Meeting: <span className="text-gold-400">{meeting.title}</span>
            </p>
          )}
        </Modal.Body>
        <div className="flex justify-end gap-3 px-6 pb-6 bg-gray-900">
          <Button
            color="dark"
            onClick={() => setShowCancelMeetingModal(false)}
            disabled={cancelingMeeting}
          >
            Keep Meeting
          </Button>
          <button
            onClick={confirmCancelMeeting}
            disabled={cancelingMeeting}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors"
          >
            {cancelingMeeting ? "Cancelling..." : "Yes, Cancel Meeting"}
          </button>
        </div>
      </Modal>

      {/* ── Approval Modal ── */}
      {showApprovalModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-stretch justify-center min-h-screen">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50"
              onClick={() => {
                setShowApprovalModal(false);
                setEditedMOMContent("");
                setApprovalComment("");
              }}
            />
            
            {/* Modal */}
            <div className="relative bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto border border-gold-500/40">
              <div className="sticky top-0 bg-gray-800 border-b border-gold-500 px-6 py-4 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gold-500">Review & Approve MOM</h3>
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setEditedMOMContent("");
                    setApprovalComment("");
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* MOM Content Editor */}
                <div>
                  <label className="text-white mb-3 block font-semibold">
                    Minutes of Meeting (Optional: Edit if needed)
                  </label>
                  <div className="rounded-lg border border-gold-500 overflow-hidden bg-gray-700">
                    <CKEditorClient
                      value={editedMOMContent}
                      onChange={(data) => setEditedMOMContent(data)}
                    />
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="text-white mb-2 block font-semibold">
                    Add a comment (optional)
                  </label>
                  <textarea
                    placeholder="Enter your comment here..."
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => {
                      setShowApprovalModal(false);
                      setEditedMOMContent("");
                      setApprovalComment("");
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleMOMApproval("APPROVED")}
                    disabled={submittingApproval}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    {submittingApproval && (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => handleMOMApproval("REJECTED")}
                    disabled={submittingApproval}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    {submittingApproval && (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    )}
                    Reject
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MOM Modal ── */}
      <Modal
        show={openMediaModal}
        onClose={() => {
          if (!uploadingMedia) {
            setOpenMediaModal(false);
            setMediaFiles([]);
          }
        }}
        size="md"
      >
        <Modal.Header className="border-b border-gold-500 bg-gray-800 text-white">
          Add Media
        </Modal.Header>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div>
              <Label
                htmlFor="meetingMedia"
                value="Upload Media"
                className="text-white mb-1 block"
              />
              <FileInput
                id="meetingMedia"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx"
                onChange={handleMediaFileChange}
                disabled={uploadingMedia}
              />
              {mediaFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {mediaFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${file.lastModified}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-sm text-gray-200">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setMediaFiles((prev) =>
                            prev.filter((_, fileIndex) => fileIndex !== index),
                          )
                        }
                        disabled={uploadingMedia}
                        className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <Button
                color="dark"
                onClick={() => {
                  setOpenMediaModal(false);
                  setMediaFiles([]);
                }}
                disabled={uploadingMedia}
              >
                Cancel
              </Button>
              <Button
                className="bg-gold-500 text-black"
                onClick={handleUploadMedia}
                disabled={uploadingMedia}
              >
                {uploadingMedia ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      {/* RSVP Modal */}
      <Modal
        show={showRSVPModal}
        onClose={() => !updatingRSVP && setShowRSVPModal(false)}
        size="md"
      >
        <Modal.Header className="border-b border-gold-500 bg-gray-800 text-white">
          Update Your RSVP
        </Modal.Header>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900">
          <div className="space-y-4">
            <p className="text-white mb-4">
              Please confirm your attendance for{" "}
              <span className="font-semibold text-gold-500">{meeting.title}</span>
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleRSVPUpdate(CommitteeMeetingRSVPStatus.ACCEPTED)}
                disabled={updatingRSVP || getCurrentUserRSVPStatus() === CommitteeMeetingRSVPStatus.ACCEPTED}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                {updatingRSVP ? "Updating..." : "Accept"}
              </button>
              <button
                onClick={() => handleRSVPUpdate(CommitteeMeetingRSVPStatus.MAYBE)}
                disabled={updatingRSVP || getCurrentUserRSVPStatus() === CommitteeMeetingRSVPStatus.MAYBE}
                className="w-full py-2.5 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                {updatingRSVP ? "Updating..." : "Maybe"}
              </button>
              <button
                onClick={() => handleRSVPUpdate(CommitteeMeetingRSVPStatus.DECLINED)}
                disabled={updatingRSVP || getCurrentUserRSVPStatus() === CommitteeMeetingRSVPStatus.DECLINED}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                {updatingRSVP ? "Updating..." : "Decline"}
              </button>
            </div>
            <div className="pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                Current Status:{" "}
                <span className="font-semibold text-white">
                  {getCurrentUserRSVPStatus() || "PENDING"}
                </span>
              </p>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      <CommitteeMeetingMOMModal
        showMomModal={showMomModal}
        setShowMomModal={setShowMomModal}
        handleMOMSubmit={handleMOMSubmit}
        momInput={momInput || ""}
      />

      {/* ── Edit Meeting Modal ── */}
      <Modal
        show={editingMeeting}
        onClose={() => !updatingMeeting && setEditingMeeting(false)}
        size="lg"
      >
        <Modal.Header className="border-b border-gold-500/40 bg-gray-800 text-white">
          Edit Meeting
        </Modal.Header>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1">Description</label>
            <CKEditorClient
              value={editDetails}
              onChange={setEditDetails}
              readOnly={updatingMeeting}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1">Venue</label>
            <input
              type="text"
              value={editVenue}
              onChange={(e) => setEditVenue(e.target.value)}
              disabled={updatingMeeting}
              className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 disabled:opacity-50"
              placeholder="Meeting venue"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1">End Date &amp; Time</label>
            <input
              type="datetime-local"
              value={editEndDate ? new Date(editEndDate).toISOString().slice(0, 16) : ""}
              onChange={(e) => setEditEndDate(e.target.value)}
              disabled={updatingMeeting}
              className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 disabled:opacity-50"
            />
          </div>
        </Modal.Body>
        <div className="flex justify-end gap-3 px-6 pb-6 bg-gray-900">
          <Button color="dark" onClick={() => setEditingMeeting(false)} disabled={updatingMeeting}>
            Cancel
          </Button>
          <button
            onClick={handleSaveEditMeeting}
            disabled={updatingMeeting}
            className="px-4 py-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-black font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            {updatingMeeting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
                Saving...
              </>
            ) : "Save Changes"}
          </button>
        </div>
      </Modal>

      {/* ── Delete Meeting Modal ── */}
      <Modal
        show={showDeleteMeetingModal}
        onClose={() => !deletingMeeting && setShowDeleteMeetingModal(false)}
        size="md"
      >
        <Modal.Header className="border-b border-red-500/40 bg-gray-800 text-white">
          Delete Meeting
        </Modal.Header>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900">
          <p className="text-gray-200 leading-relaxed">
            Are you sure you want to permanently delete this meeting?
          </p>
          <p className="text-red-300 text-sm mt-2">
            This action cannot be undone. All meeting data including action points, attendance, and media will be removed.
          </p>
          {meeting && (
            <p className="text-gray-400 text-sm mt-4">
              Meeting: <span className="text-gold-400 font-semibold">{meeting.title}</span>
            </p>
          )}
        </Modal.Body>
        <div className="flex justify-end gap-3 px-6 pb-6 bg-gray-900">
          <Button color="dark" onClick={() => setShowDeleteMeetingModal(false)} disabled={deletingMeeting}>
            Cancel
          </Button>
          <button
            onClick={confirmDeleteMeeting}
            disabled={deletingMeeting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            {deletingMeeting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Deleting...
              </>
            ) : "Yes, Delete Meeting"}
          </button>
        </div>
      </Modal>

      {/* ── Delete MOM PDF Modal ── */}
      <Modal
        show={showDeleteMOMPdfModal}
        onClose={() => !deletingMOMPdf && setShowDeleteMOMPdfModal(false)}
        size="sm"
      >
        <Modal.Header className="border-b border-red-500/40 bg-gray-800 text-white">
          Delete MOM PDF
        </Modal.Header>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900">
          <p className="text-gray-200 leading-relaxed">
            Are you sure you want to delete the MOM PDF attachment?
          </p>
          <p className="text-red-300 text-sm mt-2">This cannot be undone.</p>
        </Modal.Body>
        <div className="flex justify-end gap-3 px-6 pb-6 bg-gray-900">
          <Button color="dark" onClick={() => setShowDeleteMOMPdfModal(false)} disabled={deletingMOMPdf}>
            Cancel
          </Button>
          <button
            onClick={handleDeleteMOMPdf}
            disabled={deletingMOMPdf}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            {deletingMOMPdf ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Deleting...
              </>
            ) : "Yes, Delete PDF"}
          </button>
        </div>
      </Modal>

      {/* ── Delete Action Point Confirmation Modal ── */}
      <Modal
        show={!!confirmDeleteAPId}
        onClose={() => !deletingActionPointId && setConfirmDeleteAPId(null)}
        size="sm"
      >
        <Modal.Header className="border-b border-red-500/40 bg-gray-800 text-white">
          Delete Action Point
        </Modal.Header>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900">
          <p className="text-gray-300 text-sm">Are you sure you want to delete this action point? This cannot be undone.</p>
        </Modal.Body>
        <div className="flex justify-end gap-3 px-6 pb-6 bg-gray-900">
          <Button color="dark" onClick={() => setConfirmDeleteAPId(null)} disabled={!!deletingActionPointId}>
            Cancel
          </Button>
          <button
            onClick={handleDeleteActionPoint}
            disabled={!!deletingActionPointId}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            {deletingActionPointId ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Deleting...
              </>
            ) : "Delete"}
          </button>
        </div>
      </Modal>

      {/* ── Edit Action Point Modal ── */}
      <Modal
        show={!!editingActionPoint}
        onClose={() => !savingActionPoint && setEditingActionPoint(null)}
        size="md"
      >
        <Modal.Header className="border-b border-gold-500/40 bg-gray-800 text-white">
          Edit Action Point
        </Modal.Header>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1">Description</label>
            <textarea
              value={editAPDescription}
              onChange={(e) => setEditAPDescription(e.target.value)}
              rows={3}
              disabled={savingActionPoint}
              className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 disabled:opacity-50"
              placeholder="Action point description"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1">Assign To (optional)</label>
            <select
              value={editAPAssignedTo}
              onChange={(e) => setEditAPAssignedTo(e.target.value !== "" ? Number(e.target.value) : "")}
              disabled={savingActionPoint}
              className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 disabled:opacity-50"
            >
              <option value="">— Unassigned —</option>
              {(meeting?.assignees?.map((a) => a.user) || meeting?.users || []).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </Modal.Body>
        <div className="flex justify-end gap-3 px-6 pb-6 bg-gray-900">
          <Button color="dark" onClick={() => setEditingActionPoint(null)} disabled={savingActionPoint}>
            Cancel
          </Button>
          <button
            onClick={handleSaveEditActionPoint}
            disabled={savingActionPoint}
            className="px-4 py-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-black font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            {savingActionPoint ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
                Saving...
              </>
            ) : "Save"}
          </button>
        </div>
      </Modal>

      {/* ── Create Action Point Modal ── */}
      <Modal
        show={showCreateAPModal}
        onClose={() => !creatingActionPoint && setShowCreateAPModal(false)}
        size="md"
      >
        <Modal.Header className="border-b border-gold-500/40 bg-gray-800 text-white">
          Add Action Point
        </Modal.Header>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1">Description <span className="text-red-400">*</span></label>
            <textarea
              value={newAPDescription}
              onChange={(e) => setNewAPDescription(e.target.value)}
              rows={3}
              disabled={creatingActionPoint}
              className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 disabled:opacity-50"
              placeholder="Describe the action point..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1">Assign To (optional)</label>
            <select
              value={newAPAssignedTo}
              onChange={(e) => setNewAPAssignedTo(e.target.value !== "" ? Number(e.target.value) : "")}
              disabled={creatingActionPoint}
              className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 disabled:opacity-50"
            >
              <option value="">— Unassigned —</option>
              {(meeting?.assignees?.map((a) => a.user) || meeting?.users || []).map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </Modal.Body>
        <div className="flex justify-end gap-3 px-6 pb-6 bg-gray-900">
          <Button color="dark" onClick={() => setShowCreateAPModal(false)} disabled={creatingActionPoint}>
            Cancel
          </Button>
          <button
            onClick={handleCreateActionPoint}
            disabled={creatingActionPoint || !newAPDescription.trim()}
            className="px-4 py-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-black font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            {creatingActionPoint ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full" />
                Creating...
              </>
            ) : "Create"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

MeetingDetailPage.getLayout = (page: React.ReactNode) => (
  <MainLayout activeMenu="committee">{page}</MainLayout>
);
