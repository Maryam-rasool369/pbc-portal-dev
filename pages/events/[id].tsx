import EventModal from "@/components/events/EventModal";
import Can from "@/components/rbac/Can";
import MOMModal from "@/components/events/MOMModal";
import SponsorModal from "@/components/events/SponsorModal";
import GuestModal from "@/components/events/GuestModal";
import VatBreakdown from "@/components/ui/VatBreakdown";
import EventSponsorApprovalModal from "@/components/events/EventSponsorApprovalModal";
import AttendancePanel from "./attendance";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";

const CKEditorClient = dynamic(() => import("@/components/CKEditorClient"), {
  ssr: false,
  loading: () => <p className="text-gray-400">Loading Editor...</p>,
});
import { HiOutlineCalendar, HiOutlineLocationMarker, HiOutlineDocumentText, HiOutlinePhotograph, HiOutlineCheck, HiOutlineStar, HiOutlinePencil, HiShieldCheck } from "react-icons/hi";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import { useLoadingStore } from "@/store/useLoadingStore";
import { useAbility } from "@/hooks/useAbility";
import { Button, Modal, Textarea, Label, FileInput, Badge, Select } from "flowbite-react";
import { FaArrowLeft, FaFacebookF, FaInstagram, FaLinkedinIn, FaTwitter } from "react-icons/fa";
import { formatStatus } from "@/utils/formatStatus";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import { exportEventAttendanceToCSV, exportEventAssigneesToCSV } from "@/services/events";
import { fetchEventSponsors } from "@/services/eventSponsors";
import {
  cancelEvent,
  cancelEventSponsorRequest,
  createEventSponsorPayment,
  deleteEventActionPoint,
  deleteEventMOMMedia,
  deleteEventMedia,
  deleteEventSocialLink,
  fetchActiveSponsorshipPackages,
  fetchCompletedEventSponsors,
  fetchEventDetails,
  fetchEventGuests,
  fetchEventSponsorsForEvent,
  fetchEventAttendanceUsers,
  fetchEventAssigneeUsers,
  retryEventGuestPayment,
  saveEventSocialLink,
  submitEventMOMApproval,
  updateEventActionPoint,
  updateEventMOM,
  updateEventRSVP,
  uploadEventMedia,
  uploadEventMOMMedia,
} from "@/services/eventDetails";

const MAX_EVENT_MEDIA_FILES = 10;
type SocialPlatform = "facebook" | "instagram" | "linkedin" | "twitter";

interface EventSocialLink {
  id: number;
  platform: SocialPlatform | string;
  url: string;
}

enum EventMOMStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  NOT_SUBMITTED = "NOT_SUBMITTED"
}

enum EventRSVPStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
  MAYBE = "MAYBE",
}

interface Event {
  id: string;
  title: string;
  userId: number;
  details: string;
  startDate: string;
  endDate: string;
  venue: string;
  eventType: string;
  isCancelled: boolean;
  cancellationReason?: string;
  EventMedia: {
    id: number;
    type: string;
    assetURL: string;
    isMOMAttachment?: boolean;
  }[];
  eventMOM: string;
  eventMOMEditorId?: number;
  eventMOMStatus: EventMOMStatus;
  eventMOMReviewer?: {
    id: number;
    name: string;
    email: string;
  };
  lastReviewedAt?: string;
  EventMOMApproval: {
    id: number;
    eventId: number;
    userId: number;
    status: EventMOMStatus;
    comment: string;
    createdAt: string;
    user: {
      id: number;
      name: string;
      email: string;
    };
  }[];
  EventActionPoint: {
    id: number;
    description: string;
    status: "PENDING" | "COMPLETED";
    assignedTo?: number;
    user?: {
      id: number;
      name: string;
      email: string;
      Role?: {
        name: string;
      };
    };
  }[];
  EventAssignee: {
    id: number;
    eventId: number;
    userId: number;
    rsvpStatus: EventRSVPStatus;
    user: {
      id: number;
      name: string;
      email: string;
    };
  }[];
  guestFeeEnabled?: boolean;
  guestFee?: number;
  maxGuestsPerMember?: number;
  socialLinks?: EventSocialLink[];
  eventSocialLinks?: EventSocialLink[];
  EventSocialLink?: EventSocialLink[];
  EventSocialLinks?: EventSocialLink[];
}

interface EventGuest {
  id: number;
  guestName: string;
  guestEmail: string;
  paymentStatus: "COMPLETED" | "FAILED" | "PENDING" | string;
  invitedBy?: {
    id: number;
    name: string;
  };
  vatPercentage?: number | null;
  vatAmount?: number | null;
  totalAmount?: number | null;
}

export default function EventDetails() {
  const router = useRouter();
  const { id, returnPath } = router.query;
  const token = useAuthStore((state) => state.token);
  const setLoading = useLoadingStore((state) => state.setLoading);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [deletingMediaId, setDeletingMediaId] = useState<number | null>(null);
  const [deletingMOMMediaId, setDeletingMOMMediaId] = useState<number | null>(null);
  const isLoading = useLoadingStore((state) => state.isLoading);
  const [event, setEvent] = useState<Event | null>(null);
  const [MomApprovalComment, setMomApprovalComment] = useState("");
  const [editedMOMContent, setEditedMOMContent] = useState("");
  const [mounted, setMounted] = useState(false);
  const [showMomModal, setShowMomModal] = useState(false);
  const [momInput, setMomInput] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [openMediaModal, setOpenMediaModal] = useState(false);

  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [pendingSponsor, setPendingSponsor] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [completedSponsors, setCompletedSponsors] = useState<any[]>([]);
  const [loadingSponsors, setLoadingSponsors] = useState(false);
  const [isCurrentUserSponsor, setIsCurrentUserSponsor] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [expandedSponsors, setExpandedSponsors] = useState<Set<number>>(new Set());
  const [updatingRSVP, setUpdatingRSVP] = useState(false);
  const [showRSVPModal, setShowRSVPModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingAssignees, setExportingAssignees] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv");
  const [pendingSponsorsForApproval, setPendingSponsorsForApproval] = useState<any[]>([]);
  const [approvalFilter, setApprovalFilter] = useState<"PENDING" | "REJECTED">("PENDING");
  const [loadingPendingSponsors, setLoadingPendingSponsors] = useState(false);
  const [selectedSponsorForApproval, setSelectedSponsorForApproval] = useState<any>(null);
  const [showSponsorApprovalModal, setShowSponsorApprovalModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCancelSponsorModal, setShowCancelSponsorModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancellingSponsor, setCancellingSponsor] = useState(false);
  const [showSocialLinkModal, setShowSocialLinkModal] = useState(false);
  const [editingSocialLink, setEditingSocialLink] = useState<EventSocialLink | null>(null);
  const [socialLinkToDelete, setSocialLinkToDelete] = useState<EventSocialLink | null>(null);
  const [savingSocialLink, setSavingSocialLink] = useState(false);
  const [deletingSocialLinkId, setDeletingSocialLinkId] = useState<number | null>(null);
  const [socialLinkForm, setSocialLinkForm] = useState<{
    platform: SocialPlatform;
    url: string;
  }>({
    platform: "facebook",
    url: "",
  });
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [eventGuests, setEventGuests] = useState<EventGuest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);

  // Searchable attendance users
  const [attendanceUsers, setAttendanceUsers] = useState<any[]>([]);
  const [loadingAttendanceUsers, setLoadingAttendanceUsers] = useState(false);
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("");

  // Mark attendance modal state
  const [showMarkAttendanceModal, setShowMarkAttendanceModal] = useState(false);
  const [selectedUserIdsForAttendance, setSelectedUserIdsForAttendance] = useState<number[]>([]);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);

  // Searchable assignee users
  const [assigneeUsers, setAssigneeUsers] = useState<any[]>([]);
  const [loadingAssigneeUsers, setLoadingAssigneeUsers] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [assigneeRsvpFilter, setAssigneeRsvpFilter] = useState("");

  const user = useAuthStore((state) => state.user);
  const ability = useAbility();

  const selectedMediaFiles = mediaFiles;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setMediaFiles(selectedFiles.slice(0, MAX_EVENT_MEDIA_FILES));
  };

  const getSocialLinks = () => {
    return (
      event?.socialLinks ||
      event?.eventSocialLinks ||
      event?.EventSocialLinks ||
      event?.EventSocialLink ||
      []
    );
  };

  const socialLinks = getSocialLinks();

  const getSocialPlatformLabel = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case "facebook":
        return "Facebook";
      case "instagram":
        return "Instagram";
      case "linkedin":
        return "LinkedIn";
      case "twitter":
        return "Twitter / X";
      default:
        return platform || "Social link";
    }
  };

  const getSocialPlatformStyles = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case "facebook":
        return "bg-blue-600 hover:bg-blue-700 text-white";
      case "instagram":
        return "bg-pink-600 hover:bg-pink-700 text-white";
      case "linkedin":
        return "bg-sky-700 hover:bg-sky-800 text-white";
      case "twitter":
        return "bg-gray-950 hover:bg-black text-white";
      default:
        return "bg-gray-700 hover:bg-gray-600 text-white";
    }
  };

  const getSocialPlatformIcon = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case "facebook":
        // @ts-ignore
        return <FaFacebookF className="h-4 w-4" />;
      case "instagram":
        // @ts-ignore
        return <FaInstagram className="h-4 w-4" />;
      case "linkedin":
        // @ts-ignore
        return <FaLinkedinIn className="h-4 w-4" />;
      case "twitter":
        // @ts-ignore
        return <FaTwitter className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const openAddSocialLinkModal = () => {
    setEditingSocialLink(null);
    setSocialLinkForm({
      platform: "facebook",
      url: "",
    });
    setShowSocialLinkModal(true);
  };

  const openEditSocialLinkModal = (link: EventSocialLink) => {
    setEditingSocialLink(link);
    setSocialLinkForm({
      platform: (link.platform?.toLowerCase() as SocialPlatform) || "facebook",
      url: link.url || "",
    });
    setShowSocialLinkModal(true);
  };

  const getEventStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (now < start) return "UPCOMING";
    if (now >= start && now <= end) return "ONGOING";
    return "COMPLETED";
  };

  const isEventStarted = (startDate:string) => {
    if(!startDate) return false;
    return new Date(startDate).getTime() < Date.now();
  }

  const canMarkAttendance = event && !event.isCancelled && isEventStarted(event.startDate) && attendanceData.length > 0 && attendanceData.filter((a: any) => a.status === "NOT_ATTENDED").length > 0;
  const [showEditActionPointModal, setShowEditActionPointModal] = useState(false);
  const [editingActionPoint, setEditingActionPoint] = useState<Event["EventActionPoint"][number] | null>(null);
  const [showDeleteActionPointModal, setShowDeleteActionPointModal] = useState(false);
  const [actionPointToDelete, setActionPointToDelete] = useState<Event["EventActionPoint"][number] | null>(null);
  const [actionPointForm, setActionPointForm] = useState({
    description: "",
    status: "PENDING" as "PENDING" | "COMPLETED",
    assignedTo: "",
  });

  const openEditActionPointModal = (
    point: Event["EventActionPoint"][number],
  ) => {
    setEditingActionPoint(point);
    setActionPointForm({
      description: point.description || "",
      status: point.status || "PENDING",
      assignedTo: point.assignedTo ? String(point.assignedTo) : "",
    });
    setShowEditActionPointModal(true);
  };

  const handleEditActionPoint = async () => {
    if (!editingActionPoint) return;

    const payload: any = {};
    const nextDescription = actionPointForm.description.trim();
    const nextStatus = actionPointForm.status;
    const nextAssignedTo =
      actionPointForm.assignedTo === ""
        ? null
        : Number(actionPointForm.assignedTo);
    const currentAssignedTo = editingActionPoint.assignedTo ?? null;

    if (nextDescription && nextDescription !== editingActionPoint.description) {
      payload.description = nextDescription;
    }
    if (nextStatus && nextStatus !== editingActionPoint.status) {
      payload.status = nextStatus;
    }
    if (nextAssignedTo !== currentAssignedTo) {
      payload.assignedTo = nextAssignedTo;
    }

    if (Object.keys(payload).length === 0) {
      toast.info("No changes to update");
      return;
    }

    try {
      await updateEventActionPoint(token || "", editingActionPoint.id, payload);
      toast.success("Action point updated successfully");
      setShowEditActionPointModal(false);
      setEditingActionPoint(null);
      fetchEvent();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update action point"
      );
    }
  };

  const handleDeleteActionPoint = async (actionPointId: number) => {
    try {
      await deleteEventActionPoint(token || "", actionPointId);
      toast.success("Action point deleted successfully");
      setShowDeleteActionPointModal(false);
      setActionPointToDelete(null);
      fetchEvent();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete action point"
      );
    }
  };

  const handleUploadMedia = async () => {
    if (!id) return;
    const formData = new FormData();
    mediaFiles.forEach((file, index) => {
      formData.append(`eventMedia${index + 1}`, file);
    });

    if (!selectedMediaFiles.length) {
      toast.error("Please select at least one media file");
      return;
    }

    setUploadingMedia(true);

    try {
      await uploadEventMedia(`${token}`, id, formData);
      setMediaFiles([]);

      const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
      fileInputs.forEach((input) => {
        input.value = "";
      });

      toast.success("Media uploaded successfully");
      setOpenMediaModal(false);
      fetchEvent();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? JSON.stringify(err?.message || "Failed to upload media")
          : "An unknown error occurred"
      );
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSaveSocialLink = async () => {
    if (!id || !token) return;

    const trimmedUrl = socialLinkForm.url.trim();
    if (!trimmedUrl) {
      toast.error("Please enter a social media URL");
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    setSavingSocialLink(true);

    try {
      const payload = editingSocialLink
        ? {
            platform: socialLinkForm.platform,
            url: trimmedUrl,
          }
        : {
            socialLinks: [
              {
                platform: socialLinkForm.platform,
                url: trimmedUrl,
              },
            ],
          };

      await saveEventSocialLink(token || "", id, payload, editingSocialLink?.id);
      toast.success(editingSocialLink ? "Social link updated" : "Social link added");
      setShowSocialLinkModal(false);
      setEditingSocialLink(null);
      setSocialLinkForm({
        platform: "facebook",
        url: "",
      });
      fetchEvent();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save social link");
    } finally {
      setSavingSocialLink(false);
    }
  };

  const handleDeleteSocialLink = async () => {
    if (!id || !token || !socialLinkToDelete) return;

    setDeletingSocialLinkId(socialLinkToDelete.id);

    try {
      await deleteEventSocialLink(token || "", id, socialLinkToDelete.id);
      toast.success("Social link deleted");
      setSocialLinkToDelete(null);
      fetchEvent();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete social link");
    } finally {
      setDeletingSocialLinkId(null);
    }
  };

  const handleDeleteEventMedia = async (mediaId: number) => {
    if (!id) return;
    setDeletingMediaId(mediaId);

    try {
      await deleteEventMedia(`${token}`, id, mediaId);
      toast.success("Media deleted successfully");
      fetchEvent();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message || "Failed to delete media"
          : "An unknown error occurred"
      );
    } finally {
      setDeletingMediaId(null);
    }
  };

  const handleDeleteMOMMedia = async (mediaId: number) => {
    if (!id) return;
    setDeletingMOMMediaId(mediaId);

    try {
      await deleteEventMOMMedia(`${token}`, id, mediaId);
      toast.success("Attachment deleted successfully");
      fetchEvent();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message || "Failed to delete attachment"
          : "An unknown error occurred"
      );
    } finally {
      setDeletingMOMMediaId(null);
    }
  };

  const handleMomApproval = async (status: EventMOMStatus) => {
    if (!id) return;
    setLoading(true);
    try {
      const requestBody: any = {
        status,
        ...(MomApprovalComment && { comment: MomApprovalComment }),
      };

      // Include edited MOM content if it was modified
      if (editedMOMContent && editedMOMContent !== event?.eventMOM) {
        requestBody.eventMOM = editedMOMContent;
      }

      await submitEventMOMApproval(`${token}`, id, requestBody);
      status === EventMOMStatus.APPROVED ? toast.success("Minutes of meeting approved") : toast.success("Minutes of meeting rejected");
      fetchEvent();
      setShowApproveModal(false);
      setMomApprovalComment("");
      setEditedMOMContent("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? JSON.stringify(error?.message || "Failed to approve MOM")
          : "Failed to approve MOM"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchEvent = async () => {
    if (!id || !token || token === "undefined") return;
    setLoading(true);
    try {
      // @ts-ignore
      const data = await fetchEventDetails(token, id, ability.can("read", "Event"));

      setEvent(data?.data || null);
      
      // Check for pending sponsor request for current user and fetch completed sponsors
      if (data?.data?.id && user?.id && token) {
        checkPendingSponsor(Number(data.data.id));
        fetchCompletedSponsors(Number(data.data.id));
        fetchGuests(Number(data.data.id));
        fetchAttendanceUsersList(Number(data.data.id));
        fetchAssigneeUsersList(Number(data.data.id));
        fetchAttendanceData();
      } else if (data?.data?.id && token) {
        // Fetch completed sponsors even if user is not logged in
        fetchCompletedSponsors(Number(data.data.id));
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? JSON.stringify(error?.message || "Failed to load event")
          : "Failed to load event"
      );
    } finally {
      setLoading(false);
    }
  };

const fetchPackages = async () => {
  if (!token || token === "undefined") return [];
  try {
    const data = await fetchActiveSponsorshipPackages(token || "");
    const packages = data?.data || [];
    console.log("Fetched packages count:", packages.length, "packages:", packages);
    return packages;
  }
  catch (error) {
    console.error("Failed to fetch packages - network error:", error);
    return [];
  }
};

  useEffect(() => {
    if (token && token !== "undefined") {
      fetchPackages().then((data) => {
        console.log("Setting packages state:", data);
        setPackages(data || []);
      });
    }
  }, [token]);

 

  const fetchGuests = async (eventId: number) => {
    if (!token || token === "undefined") return;
    setLoadingGuests(true);
    try {
      const data = await fetchEventGuests(token, eventId);
      setEventGuests(data?.data || []);
    } catch {
      // silent — guests are supplementary info
    } finally {
      setLoadingGuests(false);
    }
  };

  const fetchAttendanceUsersList = async (eventId: number, params: Record<string, string> = {}) => {
    if (!token || token === "undefined") return;
    setLoadingAttendanceUsers(true);
    try {
      const data = await fetchEventAttendanceUsers(token, eventId, params);
      setAttendanceUsers(data?.data || []);
    } catch {
      // silent
    } finally {
      setLoadingAttendanceUsers(false);
    }
  };

  const fetchAttendanceData = async () => {
    if (!id || !token) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/event-attendance/${id}`,
        {
          headers: {
            "Content-Type": "application/json",
            token,
          },
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch attendance");
      setAttendanceData(data.data);
    } catch (error) {
      toast.error("Error loading attendance data");
    }
  };

  const handleMarkAttendance = async () => {
    if (!id || !token) return;
    try {
      setMarkingAttendance(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/event-attendance/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            token,
          },
          body: JSON.stringify({ userIds: selectedUserIdsForAttendance }),
        },
      );
      const data = await res.json();
      if (!data.error) {
        toast.success("Attendance marked successfully");
        setShowMarkAttendanceModal(false);
        setSelectedUserIdsForAttendance([]);
        fetchAttendanceData();
        fetchAttendanceUsersList(Number(id), { search: attendanceSearch, attendanceStatus: attendanceStatusFilter });
      } else {
        toast.error(data?.error[0]?.msg || "Failed to mark attendance");
      }
    } catch (error) {
      toast.error("Failed to mark attendance");
    } finally {
      setMarkingAttendance(false);
    }
  };

  const fetchAssigneeUsersList = async (eventId: number, params: Record<string, string> = {}) => {
    if (!token || token === "undefined") return;
    setLoadingAssigneeUsers(true);
    try {
      const data = await fetchEventAssigneeUsers(token, eventId, params);
      setAssigneeUsers(data?.data || []);
    } catch {
      // silent
    } finally {
      setLoadingAssigneeUsers(false);
    }
  };

  const fetchCompletedSponsors = async (eventId: number) => {
    if (!token || token === "undefined") return;
    setLoadingSponsors(true);
    try {
      // Fetch only approved and completed sponsors
      const data = await fetchCompletedEventSponsors(token, eventId);
      if (data?.data) {
        setCompletedSponsors(data.data || []);
        
        // Check if current user is already a sponsor
        if (user?.id) {
          const userIsSponsor = data.data.some(
            (sponsor: any) => sponsor.userId === Number(user.id)
          );
          setIsCurrentUserSponsor(userIsSponsor);
        }
      } else {
        setCompletedSponsors([]);
        setIsCurrentUserSponsor(false);
      }
    } catch (error) {
      console.error("Failed to fetch completed sponsors:", error);
      setCompletedSponsors([]);
      setIsCurrentUserSponsor(false);
    } finally {
      setLoadingSponsors(false);
    }
  };

  const fetchPendingSponsorsForApproval = async (eventId: number) => {
    if (!token || token === "undefined") return;
    setLoadingPendingSponsors(true);
    try {
      const data = await fetchEventSponsors(token, eventId, 1, 100, undefined, approvalFilter);
      setPendingSponsorsForApproval(data.data || []);
    } catch (error) {
      console.error("Failed to fetch pending sponsors:", error);
      setPendingSponsorsForApproval([]);
    } finally {
      setLoadingPendingSponsors(false);
    }
  };



  const checkPendingSponsor = async (eventId: number) => {
    if (!token || token === "undefined" || !user?.id) return;
    try {
      const data = await fetchEventSponsorsForEvent(token, eventId);
      if (data?.data) {
        const userSponsor = data.data.find(
          (sponsor: any) => sponsor.userId === Number(user.id)
        );
        
        // Keep sponsor in actionable state for both pending and failed payments.
        if (userSponsor && (userSponsor.status === "PENDING" || userSponsor.status === "FAILED")) {
          // Include approval status in pending sponsor data
          setPendingSponsor({...userSponsor, approvalStatus: userSponsor.approvalStatus || "PENDING"});
          setIsCurrentUserSponsor(false);
        } else if (userSponsor && userSponsor.status === "COMPLETED") {
          // User is already a sponsor
          setPendingSponsor(null);
          setIsCurrentUserSponsor(true);
        } else {
          // Clear actionable sponsor state for other statuses.
          setPendingSponsor(null);
          setIsCurrentUserSponsor(false);
        }
      } else {
        setPendingSponsor(null);
        setIsCurrentUserSponsor(false);
      }
    } catch (error) {
      // Silently fail - this is optional check
      console.error("Failed to check pending sponsor:", error);
      setPendingSponsor(null);
      setIsCurrentUserSponsor(false);
    }
  };

  // Check if current user is an event team member
  const isEventTeamMember = () => {
    if (!user?.id || !event?.EventAssignee) return false;
    return event.EventAssignee.some(
      (assignee) => assignee.userId === Number(user.id)
    );
  };

  const isEventCreator = () => {
    if (!user?.id || !event?.userId) return false;
    return event.userId === Number(user.id);
  };

  // Get current user's RSVP status
  const getCurrentUserRSVPStatus = () => {
    if (!user?.id || !event?.EventAssignee) return null;
    const assignee = event.EventAssignee.find(
      (assignee) => assignee.userId === Number(user.id)
    );
    return assignee?.rsvpStatus || null;
  };

  // Handle RSVP update
  const handleRSVPUpdate = async (status: EventRSVPStatus) => {
    if (!event?.id || !token) return;
    
    setUpdatingRSVP(true);
    try {
      await updateEventRSVP(token, event.id, status);
      toast.success(`RSVP status updated to ${status}`);
      setShowRSVPModal(false);
      fetchEvent();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update RSVP status"
      );
    } finally {
      setUpdatingRSVP(false);
    }
  };

  const handlePayForSponsorship = async () => {
    if (!pendingSponsor?.id) {
      toast.error("Sponsor ID not found");
      return;
    }

    setProcessingPayment(true);
    try {
      const data = await createEventSponsorPayment(token || "", pendingSponsor.id);
      // Redirect to Stripe checkout
      const checkoutUrl = data?.data?.paymentReference || data?.data?.url || data?.url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        toast.error("Payment session created but no redirect URL available");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to initiate payment"
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCancelSponsorRequest = async () => {
    if (!pendingSponsor?.id) {
      toast.error("Sponsor ID not found");
      return;
    }

    setCancellingSponsor(true);
    try {
      await cancelEventSponsorRequest(token || "", pendingSponsor.id);
      toast.success("Sponsorship request cancelled successfully");
      setShowCancelSponsorModal(false);
      setPendingSponsor(null);
      setIsCurrentUserSponsor(false);
      fetchEvent();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to cancel sponsorship request"
      );
    } finally {
      setCancellingSponsor(false);
    }
  };

  const handleRetryGuestPayment = async (guestId: number) => {
    if (!event?.id || !token) return;
    try {
      const data = await retryEventGuestPayment(token, event.id, guestId);
      const paymentUrl = data?.data?.paymentUrl;
      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        toast.error("No payment URL received");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to initiate payment");
    }
  };

  const toggleSponsorExpansion = (sponsorId: number) => {
    setExpandedSponsors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sponsorId)) {
        newSet.delete(sponsorId);
      } else {
        newSet.add(sponsorId);
      }
      return newSet;
    });
  };

  const shouldShowViewMore = (sponsor: any) => {
    const brandName = sponsor.name || sponsor.brandName || "";
    const description = sponsor.description || sponsor.brandDescription || "";
    return brandName.length > 20 || description.length > 100;
  };

  const handleSponsorApprovalClick = (sponsor: any) => {
    setSelectedSponsorForApproval(sponsor);
    setShowSponsorApprovalModal(true);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!id || !token || token === "undefined") return;
    fetchEvent();
  }, [id, token, showEditModal, showMomModal]);

  useEffect(() => {
    if (!showSponsorModal && event?.id && user?.id && token && token !== "undefined") {
      checkPendingSponsor(Number(event.id));
      fetchCompletedSponsors(Number(event.id));
    }
  }, [showSponsorModal, event?.id, user?.id, token]);

  // Check for pending sponsor on page load/refresh (especially after payment redirect)
  useEffect(() => {
    if (event?.id && user?.id && token && token !== "undefined") {
      // Check URL params for payment completion
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get("payment");
      
      // If coming from payment, check immediately and remove query param
      if (paymentStatus === "success" || paymentStatus === "cancel") {
        const paymentType = urlParams.get("type");

        // Remove query params from URL
        router.replace(`/events/${event.id}`, undefined, { shallow: true });

        if (paymentType === "guest") {
          if (paymentStatus === "success") {
            toast.success("Guest registered and payment successful!");
          } else {
            toast.error("Guest payment failed or was cancelled.");
          }
          fetchGuests(Number(event.id));
        }

        // Check after a delay to allow webhook processing
        const timer = setTimeout(() => {
          checkPendingSponsor(Number(event.id));
          fetchCompletedSponsors(Number(event.id));
        }, 2000);
        
        return () => clearTimeout(timer);
      } else {
        // Normal page load - check with delay
        const timer = setTimeout(() => {
          checkPendingSponsor(Number(event.id));
          fetchCompletedSponsors(Number(event.id));
        }, 1000);
        
        return () => clearTimeout(timer);
      }
    }
  }, [event?.id, user?.id, token, router]);

  // Check when page becomes visible again (user returns from Stripe)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && event?.id && user?.id && token && token !== "undefined") {
        // Check after a delay to allow webhook processing
        setTimeout(() => {
          checkPendingSponsor(Number(event.id));
          fetchCompletedSponsors(Number(event.id));
        }, 1500);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [event?.id, user?.id, token]);

  // Fetch pending sponsors for approval when filter changes
  useEffect(() => {
    if (event?.id && token && token !== "undefined") {
      fetchPendingSponsorsForApproval(Number(event.id));
    }
  }, [approvalFilter, event?.id, token]);

  // Fetch attendance data when event is loaded
  useEffect(() => {
    if (event?.id && token && token !== "undefined") {
      fetchAttendanceData();
    }
  }, [event?.id, token]);

  const handleCancelEvent = async () => {
    if (!id || !cancellationReason.trim()) return;
    setCancelling(true);
    try {
      await cancelEvent(token || "", id, cancellationReason);
      toast.success("Event cancelled successfully");
      setShowCancelModal(false);
      setCancellationReason("");
      fetchEvent();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel event");
    } finally {
      setCancelling(false);
    }
  };

  const handleMOMSubmit = async (newMOMHTML: string, attachments?: File[]) => {
    if (!id || !newMOMHTML.trim()) return;
    setLoading(true);
    try {
      await updateEventMOM(token, id, newMOMHTML);

      if (attachments && attachments.length > 0) {
        const formData = new FormData();
        attachments.forEach((file, i) => formData.append(`momMedia${i + 1}`, file));
        try {
          await uploadEventMOMMedia(token, id, formData);
        } catch {
          toast.error("MOM saved but attachments failed to upload");
        }
      }

      toast.success(
        event?.eventMOMEditorId === user?.id
          ? "MOM updated. Previous approvals were reset."
          : "MOM updated successfully",
      );
      setShowMomModal(false);
      setMomInput("");
    } catch (error: any) {
      toast.error(JSON.stringify(error?.message || "Failed to update MOM"));
    } finally {
      setLoading(false);
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
        </div>
      </div>
    );

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-gray-800 rounded-lg shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-2">Event Not Found</h2>
          <p className="text-gray-400 mb-4">The event you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to view it.</p>
          <Button color="dark" onClick={() => router.push("/events")}>
            Return to Events
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: EventMOMStatus) => {
    switch (status) {
      case EventMOMStatus.APPROVED:
        return <Badge color="success" className="ml-2">Approved</Badge>;
      case EventMOMStatus.REJECTED:
        return <Badge color="failure" className="ml-2">Rejected</Badge>;
      case EventMOMStatus.PENDING:
        return <Badge color="warning" className="ml-2">Pending</Badge>;
      case EventMOMStatus.NOT_SUBMITTED:
        return <Badge color="gray" className="ml-2">Not Submitted</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col px-3 py-4 sm:px-4 md:px-8 md:py-8">
      <div className="max-w-7xl mx-auto w-full">
        <button
          onClick={() => {
            if (returnPath && typeof returnPath === "string") {
              router.push(decodeURIComponent(returnPath));
            } else {
              router.push("/events");
            }
          }}
          className="text-gold-500 flex items-center hover:text-gold-400 transition-colors mb-6"
        >
          {/* @ts-ignore */}
          <FaArrowLeft className="mr-2" />
          <span>{returnPath && typeof returnPath === "string" ? "Back" : "Back to Events"}</span>
        </button>

        <div className="bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 border border-gray-700">
          <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5 sm:gap-6">
            <div className="flex-1">
              <div className="flex items-start sm:items-center flex-wrap gap-2 sm:gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-white break-words">{event.title}</h1>
                <Badge color="indigo">{formatStatus(event.eventType || "")}</Badge>
                {event.isCancelled ? (
                  <Badge color="failure">CANCELLED</Badge>
                ) : (
                  <Badge className={`${getEventStatus(event?.startDate, event?.endDate) === "UPCOMING" ? "bg-amber-500 text-black" : getEventStatus(event.startDate, event.endDate) === "ONGOING" ? "bg-emerald-500 text-black" : "bg-gray-500 text-white"}`}>{getEventStatus(event?.startDate, event?.endDate)}</Badge>
                )}
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-start sm:items-center text-sm text-gray-300">
                  {/* @ts-ignore */}
                  <HiOutlineCalendar className="text-gold-500 w-5 h-5 mr-2 mt-0.5 sm:mt-0 flex-shrink-0" />
                  <span className="leading-5 break-words">{formatDateAndTime(event.startDate, true, true)} – {formatDateAndTime(event.endDate, true, true)}</span>
                </div>
                
                {event.venue && (
                  <div className="flex items-start sm:items-center text-sm text-gray-300">
                    {/* @ts-ignore */}
                    <HiOutlineLocationMarker className="text-gold-500 w-5 h-5 mr-2 mt-0.5 sm:mt-0 flex-shrink-0" />
                    <span className="leading-5 break-words">{event.venue}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:flex xl:flex-wrap gap-2 w-full xl:w-auto xl:justify-end xl:self-start">
              {!event.isCancelled && (
                <Can I="update" a="Event">
                  {new Date(event.startDate) <= new Date() && (
                    <Button color="dark" size="sm" className="w-full xl:w-auto border border-gray-700" onClick={() => {
                      setMomInput(event.eventMOMEditorId === user?.id ? event.eventMOM || "" : "");
                      setShowMomModal(true);
                    }}>
                      {/* @ts-ignore */}
                      <HiOutlineDocumentText className="mr-2" />
                      {event.eventMOMEditorId === user?.id && event.eventMOM ? "Update Minutes" : "Add Minutes"}
                    </Button>
                  )}

                    <Button color="dark" size="sm" className="w-full xl:w-auto border border-gray-700" onClick={() => setShowEditModal(true)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Event
                    </Button>

                  {new Date(event.startDate) < new Date() && (
                    <Button color="dark" size="sm" className="w-full xl:w-auto border border-gray-700" onClick={() => setOpenMediaModal(true)}>
                      {/* @ts-ignore */}
                      <HiOutlinePhotograph className="mr-2" />
                      Add Media
                    </Button>
                  )}
                </Can>
              )}

              {!event.isCancelled && (
                <Can I="manage" a="Event">
                  <>
                    <Button
                      color="dark"
                      size="sm"
                      className="w-full xl:w-auto border border-gray-700"
                      onClick={openAddSocialLinkModal}
                    >
                      Add Social Media
                    </Button>
                    {getEventStatus(event.startDate, event.endDate) !== "COMPLETED" && (
                    <Button
                        color="failure"
                        size="sm"
                        className="w-full xl:w-auto bg-red-700 hover:bg-red-800 border border-red-700"
                        onClick={() => setShowCancelModal(true)}
                      >
                        Cancel Event
                      </Button>
                    )}
                  </>
                </Can>
              )}

              {/* RSVP Button for assigned users */}
              {!event.isCancelled && isEventTeamMember() && getEventStatus(event.startDate, event.endDate) === "UPCOMING" && (
                <Button
                  color="info"
                  size="sm"
                  className="w-full xl:w-auto bg-blue-600 hover:bg-blue-700 border border-blue-600"
                  onClick={() => setShowRSVPModal(true)}
                >
                  {getCurrentUserRSVPStatus() === EventRSVPStatus.PENDING
                    ? "RSVP Now"
                    : `Update RSVP (${getCurrentUserRSVPStatus()})`}
                </Button>
              )}

              {/* Add Guest button — for invited members on upcoming REGULAR_EVENTs with guest fee enabled */}
              {!event.isCancelled &&
                event.eventType === "REGULAR_EVENT" &&
                event.guestFeeEnabled &&
                event.guestFee &&
                (isEventTeamMember() || isEventCreator()) &&
                getEventStatus(event.startDate, event.endDate) === "UPCOMING" && (
                  <Button
                    color="purple"
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 border border-purple-600"
                    onClick={() => setShowGuestModal(true)}
                  >
                    Add Guest
                  </Button>
                )}

              {/* Show sponsor buttons: allow payment retry for pending/failed sponsors, but only allow new signups for upcoming events */}
              {!event.isCancelled &&
                !isCurrentUserSponsor &&
                packages &&
                packages.length > 0 &&
                getEventStatus(event.startDate, event.endDate) === "UPCOMING" &&
                event.eventType !== "BOARD_MEETING" && (
                  <>
                    {pendingSponsor && pendingSponsor.status !== "COMPLETED" ? (
                      <div className="flex gap-2">
                        {pendingSponsor.approvalStatus !== "REJECTED" && (
                          <>
                            <Button
                              color="gold"
                              size="sm"
                              className="w-full xl:w-auto bg-gold-500 hover:bg-gold-600 border border-gold-500"
                              onClick={() => setShowEditModal(true)}
                            >
                              {/* @ts-ignore */}
                              <HiOutlinePencil className="mr-2" />
                              Edit Details
                            </Button>
                            {pendingSponsor.approvalStatus === "APPROVED" ? (
                              <Button
                                color="success"
                                size="sm"
                                className="w-full xl:w-auto bg-green-600 hover:bg-green-700 border border-green-600"
                                onClick={handlePayForSponsorship}
                                disabled={processingPayment}
                              >
                                {processingPayment ? (
                                  <>
                                    <svg
                                      className="animate-spin -ml-1 mr-2 h-4 w-4 inline"
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
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <svg
                                      className="w-4 h-4 mr-2 inline"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                      />
                                    </svg>
                                    Pay for Sponsorship
                                  </>
                                )}
                              </Button>
                            ) : null}
                          </>
                        )}
                        <Button
                          color="gray"
                          size="sm"
                          className="w-full xl:w-auto border border-gray-600"
                          onClick={() => setShowCancelSponsorModal(true)}
                          disabled={cancellingSponsor || processingPayment}
                        >
                          Cancel Sponsorship
                        </Button>
                      </div>
                    ) : (
                      <Can I="create" a="EventSponsorship">
                        <Button
                          color="success"
                          size="sm"
                          className="w-full xl:w-auto bg-green-600 hover:bg-green-700 border border-green-600"
                          onClick={() => setShowSponsorModal(true)}
                        >
                          {/* @ts-ignore */}
                          <HiOutlineStar className="mr-2" />
                          Become a Sponsor
                        </Button>
                      </Can>
                    )}
                  </>
                )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            <div className="bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-gold-500 mb-4">
                About This Event
              </h2>
              <div
                className="text-gray-300 leading-relaxed prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: event.details }}
              />
            </div>

            {event.isCancelled && event.cancellationReason && (
              <div className="bg-red-900/30 rounded-xl shadow-lg p-4 sm:p-6 border border-red-700">
                <h2 className="text-lg font-semibold text-red-400 mb-2">Cancellation Reason</h2>
                <p className="text-gray-300">{event.cancellationReason}</p>
              </div>
            )}

            {socialLinks.length > 0 && (
              <div className="bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-700">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gold-500">
                    Social Media
                  </h2>
                  <Can I="manage" a="Event">
                    <Button
                      color="dark"
                      size="xs"
                      className="w-full sm:w-auto border border-gray-700"
                      onClick={openAddSocialLinkModal}
                    >
                      Add Link
                    </Button>
                  </Can>
                </div>
                <div className="flex flex-wrap gap-3">
                  {socialLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900/60 p-2"
                    >
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${getSocialPlatformStyles(link.platform)}`}
                        aria-label={getSocialPlatformLabel(link.platform)}
                        title={getSocialPlatformLabel(link.platform)}
                      >
                        {getSocialPlatformIcon(link.platform)}
                      </a>
                      <div className="min-w-0 pr-1">
                        <p className="text-sm font-medium text-white">
                          {getSocialPlatformLabel(link.platform)}
                        </p>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block max-w-[180px] truncate text-xs text-gray-400 hover:text-gold-400"
                        >
                          {link.url}
                        </a>
                      </div>
                      <Can I="manage" a="Event">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditSocialLinkModal(link)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-blue-300 hover:bg-blue-900/40"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setSocialLinkToDelete(link)}
                            disabled={deletingSocialLinkId === link.id}
                            className="rounded-md px-2 py-1 text-xs font-medium text-red-300 hover:bg-red-900/40 disabled:opacity-60"
                          >
                            {deletingSocialLinkId === link.id ? "..." : "Delete"}
                          </button>
                        </div>
                      </Can>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Can I="update" a="Event">
            {event?.eventMOM && event?.eventMOMStatus && (
                <div className="bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <h2 className="text-lg font-semibold text-gold-500">
                        Minutes of Meeting
                      </h2>
                      {getStatusBadge(event.eventMOMStatus)}
                    </div>
                    {!event.isCancelled &&
                      event.eventMOMEditorId === user?.id &&
                      event.eventMOMStatus !== EventMOMStatus.APPROVED && (
                        <Button
                          color="dark"
                          size="sm"
                          className="border border-gray-700"
                          onClick={() => {
                            setMomInput(event.eventMOM || "");
                            setShowMomModal(true);
                          }}
                        >
                          Update MOM
                        </Button>
                      )}
                    {!event.isCancelled && event.eventMOMEditorId !== user?.id &&
                      !event.EventMOMApproval?.some(
                        (approval) => approval.userId === Number(user?.id)
                      ) &&
                      <Can I="create" a="EventApproval">
                        <Button
                          color="success"
                          size="sm"
                          onClick={() => {
                            setShowApproveModal(true);
                            setEditedMOMContent(event.eventMOM || "");
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve or Reject
                        </Button>
                      </Can>
                    }
                  </div>
                  <div
                    className="prose prose-invert max-w-none text-gray-300"
                    dangerouslySetInnerHTML={{ __html: event.eventMOM }}
                  />
                  {event.eventMOMReviewer && event.lastReviewedAt && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-sm text-gray-400">
                        Last reviewed by <span className="text-gold-500 font-medium">{event.eventMOMReviewer.name}</span> on {formatDateAndTime(event.lastReviewedAt, true, true)}
                      </p>
                    </div>
                  )}

                  {event.EventMedia?.filter((m) => m.isMOMAttachment).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <h3 className="text-sm font-semibold text-gold-400 mb-3">MOM Attachments</h3>
                      <div className="flex flex-wrap gap-3">
                        {event.EventMedia.filter((m) => m.isMOMAttachment).map((item, idx) => (
                          <div key={item.id} className="relative group">
                            <a
                              href={item.assetURL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded-lg text-sm text-gold-400 hover:bg-gray-600 transition-colors"
                            >
                              {/* @ts-ignore */}
                              <HiOutlineDocumentText className="w-4 h-4" />
                              Attachment {idx + 1}
                            </a>
                            <Can I="manage" a="Event">
                              <button
                                onClick={() => handleDeleteMOMMedia(item.id)}
                                disabled={deletingMOMMediaId === item.id}
                                className="absolute -top-2 -right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-60 opacity-0 group-hover:opacity-100"
                                title="Delete attachment"
                              >
                                {deletingMOMMediaId === item.id ? "..." : "✕"}
                              </button>
                            </Can>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
            )}

            {event?.EventMOMApproval?.length > 0 && (
              <div className="bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-700">
                <h2 className="text-lg font-semibold text-gold-500 mb-4">
                  Meeting Minutes Approvals
                </h2>
                <div className="divide-y divide-gray-700">
                  {event?.EventMOMApproval?.map((approval) => (
                    <div
                      key={approval.userId}
                      className="py-4 first:pt-0 last:pb-0"
                    >
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-white">{approval.user.name}</p>
                        <p className="text-sm text-gray-400">
                          {formatDateAndTime(approval.createdAt, true, true)}
                        </p>
                      </div>
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          approval.status === EventMOMStatus.APPROVED 
                            ? "bg-green-100 text-green-800" 
                            : approval.status === EventMOMStatus.REJECTED
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {approval.status}
                        </span>
                      </div>
                      {approval.comment && (
                        <p className="text-sm text-gray-400 mt-2 bg-gray-700 p-3 rounded-md">
                          {approval.comment}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            </Can>

            {event?.EventMedia?.length > 0 && (
              <div className="bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-700">
                <h2 className="text-lg font-semibold text-gold-500 mb-4">Event Gallery</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {event?.EventMedia?.map((item, index) => (
                    <div key={item.id} className="relative group overflow-hidden rounded-lg">
                      {item.assetURL.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                        <div className="aspect-video">
                          <img
                            src={item.assetURL}
                            alt={`Event media ${index + 1}`}
                            className="object-cover w-full h-full rounded-lg border border-gray-700 hover:opacity-90 transition-opacity"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex flex-col items-center justify-center transition-all opacity-0 group-hover:opacity-100 gap-2">
                            <a 
                              href={item.assetURL} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="bg-gold-500 text-black px-3 py-1 rounded-md text-sm font-medium hover:bg-gold-400 transition-colors"
                            >
                              View Full Size
                            </a>
                            <Can I="manage" a="Event">
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleDeleteEventMedia(item.id);
                                }}
                                disabled={deletingMediaId === item.id}
                                className="bg-red-500 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
                              >
                                {deletingMediaId === item.id ? "Deleting..." : "Delete"}
                              </button>
                            </Can>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <a
                            href={item.assetURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center bg-gray-700 p-4 rounded-lg h-full text-gold-500 hover:bg-gray-600 transition-colors"
                          >
                            {/* @ts-ignore */}
                            <HiOutlineDocumentText className="w-8 h-8 mr-2" />
                            <span>View File {index + 1}</span>
                          </a>
                          <Can I="manage" a="Event">
                            <button
                              onClick={() => handleDeleteEventMedia(item.id)}
                              disabled={deletingMediaId === item.id}
                              className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
                            >
                              {deletingMediaId === item.id ? "Deleting..." : "Delete"}
                            </button>
                          </Can>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {event?.EventActionPoint.length > 0 && (
              <div className="bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-700">
                <h2 className="text-lg font-semibold text-gold-500 mb-4">Action Points</h2>
                <ul className="divide-y divide-gray-700">
                  {event.EventActionPoint.map((point) => (
                    <li key={point.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center ${
                            point.status === "COMPLETED" ? "bg-green-500" : "bg-yellow-500"
                          }`}>
                            {point.status === "COMPLETED" && (
                              <>
                              {/* @ts-ignore */}
                              <HiOutlineCheck className="h-3 w-3 text-white" />
                              </>
                            )}
                          </div>
                          <div>
                            <p className="text-gray-200">{point.description}</p>
                            <div className="text-xs mt-1 text-gray-400 space-y-1">
                              <p>
                                Status: <span className={point.status === "COMPLETED" ? "text-green-400" : "text-yellow-400"}>{point.status}</span>
                              </p>
                              {point.user && (
                                <p>
                                  Assigned to: <span className="text-gold-400 font-medium">{point.user.name}</span>
                                  {point.user.Role && (
                                    <span className="text-gray-500 ml-1">({point.user.Role.name})</span>
                                  )}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Can I="update" a="EventActionPoint">
                            <Button
                              color="info"
                              disabled={!isEventStarted(event.startDate)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => openEditActionPointModal(point)}
                            >
                              {isEventStarted(event.startDate)
                                ? "Edit"
                                : "Event Not Started"}
                            </Button>
                          </Can>
                          <Can I="delete" a="EventActionPoint">
                            <Button
                              color="failure"
                              className="bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => {
                                setActionPointToDelete(point);
                                setShowDeleteActionPointModal(true);
                              }}
                            >
                              Delete
                            </Button>
                          </Can>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Admin Section - Pending/Rejected Sponsors */}
            {event?.eventType === "REGULAR_EVENT" && (
            <Can I="approve" a="EventSponsorship">
              <div className="bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-700 mb-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gold-500 flex items-center">
                    {/* @ts-ignore */}
                    <HiShieldCheck className="mr-2" />
                    Sponsor Approval Management
                  </h2>
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-300">Filter by Status:</label>
                    <Select
                      value={approvalFilter}
                      onChange={(e) => setApprovalFilter(e.target.value as "PENDING" | "REJECTED")}
                      className="w-40"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="APPROVED">Approved</option>
                    </Select>
                  </div>
                </div>
                
                {loadingPendingSponsors ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
                  </div>
                ) : pendingSponsorsForApproval.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-400 text-lg">
                      No {approvalFilter.toLowerCase()} sponsors found
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingSponsorsForApproval.map((sponsorItem) => (
                      <div
                        key={sponsorItem.id}
                        onClick={() => handleSponsorApprovalClick(sponsorItem)}
                        className="bg-gray-700 rounded-lg border border-gray-600 p-6 hover:border-gold-400 transition-colors cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-white mb-2">
                              {sponsorItem.brandName}
                            </h3>
                            <div className="flex flex-col gap-2">
                              <Badge 
                                color={sponsorItem.approvalStatus === "REJECTED" ? "failure" : sponsorItem.approvalStatus === "APPROVED" ? "success" : "warning"}
                                className="w-fit"
                              >
                                {sponsorItem.approvalStatus === "REJECTED" && "Rejected"}
                                {sponsorItem.approvalStatus === "PENDING" && "Pending Approval"}
                                {sponsorItem.approvalStatus === "APPROVED" && "Approved"}
                              </Badge>
                              {sponsorItem.approvalStatus !== "REJECTED" && (
                                <Badge
                                  color={sponsorItem.status === "COMPLETED" ? "success" : "warning"}
                                  className="w-fit"
                                >
                                  {sponsorItem.status === "COMPLETED" ? "Paid" : "Pending Payment"}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {sponsorItem.brandLogo && (
                            <img
                              src={sponsorItem.brandLogo}
                              alt={sponsorItem.brandName}
                              className="h-16 w-16 object-contain rounded-lg bg-white p-2 ml-3"
                            />
                          )}
                        </div>
                        {sponsorItem.brandDescription && (
                          <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                            {sponsorItem.brandDescription}
                          </p>
                        )}
                        <div className="mt-3 pt-3 border-t border-gray-600">
                          <p className="text-xs text-gray-400">
                            Submitted by: {sponsorItem.user?.name || "Unknown"}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(sponsorItem.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Can>
            )}

            {/* Event Sponsors Section */}
            {event?.eventType === "REGULAR_EVENT" && completedSponsors.length > 0 && (
              <div className="bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 border border-gray-700">
                <h2 className="text-xl font-semibold text-gold-500 mb-6 flex items-center">
                  {/* @ts-ignore */}
                  <HiOutlineStar className="mr-2" />
                  Event Sponsors
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {completedSponsors.map((sponsor) => {
                    const isCurrentUser = user?.id && sponsor.userId === Number(user.id);
                    const isExpanded = expandedSponsors.has(sponsor.id);
                    const brandName = sponsor.name || sponsor.brandName || "Sponsor";
                    const description = sponsor.description || sponsor.brandDescription || "";
                    const showViewMore = shouldShowViewMore(sponsor);
                    
                    return (
                      <div
                        key={sponsor.id}
                        className={`rounded-lg p-5 border-2 transition-colors overflow-hidden ${
                          isCurrentUser
                            ? "bg-gold-500/10 border-gold-500 hover:border-gold-400 shadow-lg shadow-gold-500/20"
                            : "bg-gray-700 border-gray-600 hover:border-gold-400"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {(sponsor.brandLogo || sponsor.logo) && (
                            <div className="flex-shrink-0">
                              <img
                                src={sponsor.brandLogo || sponsor.logo}
                                alt={brandName}
                                className="w-16 h-16 object-contain rounded-lg bg-white p-2"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="mb-1 min-w-0">
                              <div className="flex items-start gap-2 mb-1 min-w-0 flex-wrap">
                                <h3 className={`text-lg font-semibold text-white break-words flex-1 min-w-0 ${!isExpanded ? "line-clamp-1" : ""}`}>
                                  {brandName}
                                </h3>
                                {isCurrentUser && (
                                  <Badge color="warning" className="text-xs bg-gold-500 text-black flex-shrink-0">
                                    You
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {description && (
                              <p className={`text-gray-300 text-sm mb-2 break-words ${!isExpanded ? "line-clamp-2" : ""}`}>
                                {description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 flex-wrap">
                              {showViewMore && (
                                <button
                                  onClick={() => toggleSponsorExpansion(sponsor.id)}
                                  className="text-blue-500 text-sm hover:text-blue-400 transition-colors font-medium"
                                >
                                  {isExpanded ? "View Less" : "View More"}
                                </button>
                              )}
                              {(sponsor.website || sponsor.brandWebsite) && (
                                <a
                                  href={sponsor.website || sponsor.brandWebsite}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-gold-500 text-sm hover:text-gold-400 transition-colors inline-flex items-center"
                                >
                                  Visit Website
                                  <svg
                                    className="w-4 h-4 ml-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                    />
                                  </svg>
                                </a>
                              )}
                            </div>
                            {sponsor.package && (
                              <div className="mt-3">
                                <Badge color="success" className="text-xs break-words">
                                  {sponsor.package.name}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}



          </div>

          <div className="space-y-6 md:space-y-8">
            {/* <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
              <AttendancePanel
                eventId={event.id}
                token={token || ""}
                eventEndDate={event.endDate}
                eventStartDate={event.startDate}
                isCancelled={event.isCancelled}
                eventAssignee={event.EventAssignee}
              />
            </div> */}

            {/* Searchable Event Team (Assignees) */}
            <Can I="read" a="Event">
              <div className="bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 border border-gray-700 min-w-0 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 mb-4">
                  <h2 className="text-base sm:text-lg font-semibold text-gold-500 flex items-center gap-2 min-w-0">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Team
                    {loadingAssigneeUsers
                      ? <span className="text-xs text-gray-400 font-normal">(Loading...)</span>
                      : <span className="text-xs text-gray-400 font-normal">({assigneeUsers.length})</span>
                    }
                  </h2>
                  <Can I="manage" a="Event">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value as "csv" | "pdf")}
                        className="px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-gold-500"
                      >
                        <option value="csv">CSV</option>
                        <option value="pdf">PDF</option>
                      </select>
                      <Button
                        color="dark"
                        size="sm"
                        className="whitespace-nowrap border border-gold-700 hover:border-gold-500 hover:text-gold-500 transition-colors"
                        onClick={async () => {
                          try {
                            setExportingAssignees(true);
                            await exportEventAssigneesToCSV(token || "", id as string, exportFormat);
                            toast.success(`Event assignees exported as ${exportFormat.toUpperCase()}`);
                          } catch (error) {
                            toast.error(
                              error instanceof Error ? error.message : "Failed to export event assignees"
                            );
                          } finally {
                            setExportingAssignees(false);
                          }
                        }}
                        disabled={exportingAssignees}
                      >
                        {exportingAssignees ? "Exporting..." : "Export"}
                      </Button>
                    </div>
                  </Can>
                </div>

                {/* Search + RSVP filter */}
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by name or email…"
                      value={assigneeSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAssigneeSearch(val);
                        if (event?.id) fetchAssigneeUsersList(Number(event.id), { search: val, rsvpStatus: assigneeRsvpFilter });
                      }}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                  </div>
                  <select
                    value={assigneeRsvpFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAssigneeRsvpFilter(val);
                      if (event?.id) fetchAssigneeUsersList(Number(event.id), { search: assigneeSearch, rsvpStatus: val });
                    }}
                    className="sm:w-36 px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                  >
                    <option value="">All RSVP</option>
                    <option value="PENDING">Pending</option>
                    <option value="ACCEPTED">Accepted</option>
                    <option value="DECLINED">Declined</option>
                    <option value="MAYBE">Maybe</option>
                  </select>
                </div>

                {loadingAssigneeUsers ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    <span className="text-sm">Loading team members…</span>
                  </div>
                ) : assigneeUsers.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">
                    {assigneeSearch || assigneeRsvpFilter ? "No members match your search." : "No team members assigned yet."}
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-700 max-h-[400px] overflow-y-auto">
                    {assigneeUsers.map((u: any) => {
                      const rsvp = event?.EventAssignee?.find((a) => a.userId === u.id)?.rsvpStatus;
                      return (
                        <li key={u.id} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center flex-1 min-w-0 gap-3">
                              <div className="flex-shrink-0 h-9 w-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-black font-semibold text-sm">
                                {(u.name || "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{u.name}</p>
                                <button
                                  onClick={() => router.push(`/users/${u.id}?returnPath=${encodeURIComponent(`/events/${id}`)}`)}
                                  className="text-xs text-gold-400 hover:text-gold-300 hover:underline transition-colors truncate block text-left max-w-full"
                                >
                                  {u.email}
                                </button>
                                {u.Role?.name && (
                                  <span className="text-xs text-gray-500">{u.Role.name}</span>
                                )}
                              </div>
                            </div>
                            <div className="ml-12 sm:ml-0 self-start sm:self-auto">
                              <Badge
                                color={rsvp === EventRSVPStatus.ACCEPTED ? "success" : rsvp === EventRSVPStatus.DECLINED ? "failure" : rsvp === EventRSVPStatus.MAYBE ? "warning" : "gray"}
                                className="text-xs whitespace-nowrap"
                              >
                                {rsvp || "—"}
                              </Badge>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Can>

            {/* Searchable Attendance Users */}
            <Can I="read" a="EventAttendance">
              <div className="bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 border border-gray-700 min-w-0 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 mb-4">
                  <h2 className="text-base sm:text-lg font-semibold text-gold-500 flex items-center gap-2 min-w-0">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Attendance
                    {loadingAttendanceUsers
                      ? <span className="text-xs text-gray-400 font-normal">(Loading...)</span>
                      : <span className="text-xs text-gray-400 font-normal">({attendanceUsers.length})</span>
                    }
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Can I="update" a="EventAttendance">
                      {canMarkAttendance && (
                        <Button
                          color="dark"
                          size="sm"
                          className="whitespace-nowrap border border-gold-700 hover:border-gold-500 hover:text-gold-500 transition-colors"
                          onClick={() => {
                            setSelectedUserIdsForAttendance([]);
                            setShowMarkAttendanceModal(true);
                          }}
                        >
                          Mark Attendance
                        </Button>
                      )}
                    </Can>
                    <Can I="manage" a="Event">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={exportFormat}
                          onChange={(e) => setExportFormat(e.target.value as "csv" | "pdf")}
                          className="px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-gold-500"
                        >
                          <option value="csv">CSV</option>
                          <option value="pdf">PDF</option>
                        </select>
                        <Button
                          color="dark"
                          size="sm"
                          className="whitespace-nowrap border border-gold-700 hover:border-gold-500 hover:text-gold-500 transition-colors"
                          onClick={async () => {
                            try {
                              setExporting(true);
                              await exportEventAttendanceToCSV(token || "", id as string, exportFormat);
                              toast.success(`Event attendance exported as ${exportFormat.toUpperCase()}`);
                            } catch (error) {
                              toast.error(
                                error instanceof Error ? error.message : "Failed to export event attendance"
                              );
                            } finally {
                              setExporting(false);
                            }
                          }}
                          disabled={exporting}
                        >
                          {exporting ? "Exporting..." : "Export"}
                        </Button>
                      </div>
                    </Can>
                  </div>
                </div>

                {/* Search + Attendance status filter */}
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by name or email…"
                      value={attendanceSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAttendanceSearch(val);
                        if (event?.id) fetchAttendanceUsersList(Number(event.id), { search: val, attendanceStatus: attendanceStatusFilter });
                      }}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                    />
                  </div>
                  <select
                    value={attendanceStatusFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAttendanceStatusFilter(val);
                      if (event?.id) fetchAttendanceUsersList(Number(event.id), { search: attendanceSearch, attendanceStatus: val });
                    }}
                    className="sm:w-44 px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                  >
                    <option value="">All Status</option>
                    <option value="ATTENDED">Attended</option>
                    <option value="NOT_ATTENDED">Not Attended</option>
                  </select>
                </div>

                {loadingAttendanceUsers ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    <span className="text-sm">Loading attendance…</span>
                  </div>
                ) : attendanceUsers.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-6">
                    {attendanceSearch || attendanceStatusFilter ? "No members match your search." : "No attendance records yet."}
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-700 max-h-[400px] overflow-y-auto">
                    {attendanceUsers.map((u: any) => {
                      // The users endpoint doesn't return per-user status, so look it up in the
                      // attendance records; an active filter is authoritative when set.
                      const recordedStatus = attendanceData.find(
                        (a: any) => Number(a.userId) === Number(u.id)
                      )?.status;
                      const status = attendanceStatusFilter || recordedStatus;
                      return (
                        <li key={u.id} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0 h-9 w-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                                {(u.name || "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{u.name}</p>
                                <button
                                  onClick={() => router.push(`/users/${u.id}?returnPath=${encodeURIComponent(`/events/${id}`)}`)}
                                  className="text-xs text-gold-400 hover:text-gold-300 hover:underline transition-colors truncate block text-left max-w-full"
                                >
                                  {u.email}
                                </button>
                                {u.Role?.name && (
                                  <span className="text-xs text-gray-500">{u.Role.name}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex-shrink-0">
                              {status === "ATTENDED" ? (
                                <Badge color="success" className="text-xs whitespace-nowrap">ATTENDED</Badge>
                              ) : status === "NOT_ATTENDED" ? (
                                <Badge color="gray" className="text-xs whitespace-nowrap">NOT ATTENDED</Badge>
                              ) : (
                                <Badge color="yellow" className="text-xs whitespace-nowrap">Registered</Badge>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Can>

            {/* Guest List — visible to leadership (all guests) and inviting member (own guests) */}
            {event.eventType === "REGULAR_EVENT" && event.guestFeeEnabled && (
              <div className="bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 border border-gray-700">
                <h2 className="text-base sm:text-lg font-semibold text-gold-500 mb-3 sm:mb-4">
                  Guests{" "}
                  {loadingGuests
                    ? "(Loading...)"
                    : `(${eventGuests.length})`}
                </h2>
                {event.guestFee && eventGuests.length > 0 && (
                  <div className="mb-4 max-w-sm">
                    <VatBreakdown 
                      baseAmount={event.guestFee} 
                      vatPercentage={eventGuests[0]?.vatPercentage || 0} 
                      vatAmount={eventGuests[0]?.vatAmount || 0} 
                      totalAmount={eventGuests[0]?.totalAmount || event.guestFee} 
                      compact 
                    />
                  </div>
                )}
                {eventGuests.length === 0 ? (
                  <p className="text-gray-400 text-sm">No guests registered yet.</p>
                ) : (
                  <ul className="divide-y divide-gray-700">
                    {eventGuests.map((guest: any) => (
                      <li key={guest.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white">{guest.guestName}</p>
                            <p className="text-xs text-gray-400">{guest.guestEmail}</p>
                            {guest.invitedBy && (
                              <p className="text-xs text-gray-500">
                                Invited by: {guest.invitedBy.name}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <Badge
                              color={
                                guest.paymentStatus === "COMPLETED"
                                  ? "success"
                                  : guest.paymentStatus === "FAILED"
                                  ? "failure"
                                  : "warning"
                              }
                              className="text-xs whitespace-nowrap"
                            >
                              {guest.paymentStatus}
                            </Badge>
                            {!event.isCancelled && guest.paymentStatus !== "COMPLETED" &&
                              guest.invitedBy?.id === Number(user?.id) && (
                                <Button
                                  size="xs"
                                  className="bg-gold-500 hover:bg-gold-600 text-black whitespace-nowrap"
                                  onClick={() => handleRetryGuestPayment(guest.id)}
                                >
                                  Pay
                                </Button>
                              )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        
      </div>

      

      <Modal
        show={showApproveModal}
        onClose={() => {
          setShowApproveModal(false);
          setEditedMOMContent("");
          setMomApprovalComment("");
        }}
        size="4xl"
      >
        <Modal.Header className="border-b border-gold-500 bg-gray-800 text-white">
          Review & Approve MOM
        </Modal.Header>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900">
          <div className="text-white space-y-6">
            <div>
              <Label
                htmlFor="momContent"
                value="Minutes of Meeting (Optional: Edit if needed)"
                className="text-white mb-2 block font-semibold"
              />
              {mounted && (
                <div className="rounded-lg border border-gold-500 overflow-hidden">
                  <CKEditorClient
                    value={editedMOMContent}
                    onChange={(data) => setEditedMOMContent(data)}
                  />
                </div>
              )}
            </div>
            <div>
              <Label
                htmlFor="approvalComment"
                value="Add a comment (optional)"
                className="text-white mb-1 block"
              />
              <Textarea
                id="approvalComment"
                placeholder="Enter your comment here..."
                value={MomApprovalComment}
                onChange={(e) => setMomApprovalComment(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
              <Button color="gray" onClick={() => {
                setShowApproveModal(false);
                setEditedMOMContent("");
                setMomApprovalComment("");
              }}>
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={() => handleMomApproval(EventMOMStatus.APPROVED)}
              >
                Approve
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700"
                onClick={() => handleMomApproval(EventMOMStatus.REJECTED)}
              >
                Reject
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      <MOMModal
        momInput={momInput}
        handleMOMSubmit={handleMOMSubmit}
        setShowMomModal={setShowMomModal}
        showMomModal={showMomModal}
      />

      <SponsorModal
        showSponsorModal={showSponsorModal}
        setShowSponsorModal={setShowSponsorModal}
        eventId={id as string}
        token={token || ""}
        editMode={pendingSponsor?.status === "PENDING" || pendingSponsor?.status === "FAILED"}
        sponsorData={pendingSponsor ? {
          id: pendingSponsor.id,
          brandName: pendingSponsor.brandName,
          brandDescription: pendingSponsor.brandDescription,
          brandWebsite: pendingSponsor.brandWebsite,
          brandLogo: pendingSponsor.brandLogo,
          packageId: pendingSponsor.packageId,
          approvalStatus: pendingSponsor.approvalStatus || "PENDING",
        } : null}
        onSuccess={() => {
          // Check for pending sponsor after modal closes
          if (event?.id) {
            checkPendingSponsor(Number(event.id));
            fetchCompletedSponsors(Number(event.id));
            fetchPendingSponsorsForApproval(Number(event.id));
          }
        }}
      />

      {showGuestModal && event && (
        <GuestModal
          showGuestModal={showGuestModal}
          setShowGuestModal={setShowGuestModal}
          eventId={String(event.id)}
          guestFee={event.guestFee || 0}
          token={token || ""}
          onSuccess={() => fetchGuests(Number(event.id))}
        />
      )}

      <EventSponsorApprovalModal
        showModal={showSponsorApprovalModal}
        setShowModal={setShowSponsorApprovalModal}
        sponsor={selectedSponsorForApproval}
        token={token || ""}
        onSuccess={() => {
          if (event?.id) {
            checkPendingSponsor(Number(event.id));
            fetchCompletedSponsors(Number(event.id));
            fetchPendingSponsorsForApproval(Number(event.id));
          }
        }}
      />

      <EventModal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        isEdit
        existingData={event}
      />

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
              Please confirm your attendance for <span className="font-semibold text-gold-500">{event.title}</span>
            </p>
            <div className="flex flex-col gap-3">
              <Button
                color="success"
                onClick={() => handleRSVPUpdate(EventRSVPStatus.ACCEPTED)}
                disabled={updatingRSVP || getCurrentUserRSVPStatus() === EventRSVPStatus.ACCEPTED}
                className="bg-green-600 hover:bg-green-700"
              >
                {updatingRSVP ? "Updating..." : "Accept"}
              </Button>
              <Button
                color="warning"
                onClick={() => handleRSVPUpdate(EventRSVPStatus.MAYBE)}
                disabled={updatingRSVP || getCurrentUserRSVPStatus() === EventRSVPStatus.MAYBE}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                {updatingRSVP ? "Updating..." : "Maybe"}
              </Button>
              <Button
                color="failure"
                onClick={() => handleRSVPUpdate(EventRSVPStatus.DECLINED)}
                disabled={updatingRSVP || getCurrentUserRSVPStatus() === EventRSVPStatus.DECLINED}
                className="bg-red-600 hover:bg-red-700"
              >
                {updatingRSVP ? "Updating..." : "Decline"}
              </Button>
            </div>
            <div className="pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                Current Status: <span className="font-semibold text-white">{getCurrentUserRSVPStatus()}</span>
              </p>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      <Modal
        show={showCancelModal}
        onClose={() => !cancelling && setShowCancelModal(false)}
        size="md"
      >
        <Modal.Header className="border-b border-red-700 bg-gray-800 text-white">
          Cancel Event
        </Modal.Header>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900">
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to cancel <span className="font-semibold text-white">{event.title}</span>? This action cannot be undone.
            </p>
            <div>
              <Label htmlFor="cancelReason" value="Reason for cancellation" className="text-white mb-1 block" />
              <Textarea
                id="cancelReason"
                placeholder="Please provide a reason for cancelling this event..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <Button color="gray" onClick={() => setShowCancelModal(false)} disabled={cancelling}>
                Go Back
              </Button>
              <Button
                color="failure"
                className="bg-red-700 hover:bg-red-800"
                onClick={handleCancelEvent}
                disabled={cancelling || !cancellationReason.trim()}
              >
                {cancelling ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      <Modal
        show={showCancelSponsorModal}
        onClose={() =>
          !cancellingSponsor && setShowCancelSponsorModal(false)
        }
        size="md"
      >
        <Modal.Header className="border-b border-red-700 bg-gray-800 text-white">
          Cancel Sponsorship Request
        </Modal.Header>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900">
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to cancel your sponsorship request for{" "}
              <span className="font-semibold text-white">
                {event.title}
              </span>
              ? This can only be done before the payment is completed.
            </p>
            {pendingSponsor?.brandName && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-gray-300">
                {pendingSponsor.brandName}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <Button
                color="gray"
                onClick={() => setShowCancelSponsorModal(false)}
                disabled={cancellingSponsor}
              >
                Go Back
              </Button>
              <Button
                color="failure"
                className="bg-red-700 hover:bg-red-800"
                onClick={handleCancelSponsorRequest}
                disabled={cancellingSponsor}
              >
                {cancellingSponsor ? "Cancelling..." : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      <Modal
        show={showEditActionPointModal}
        onClose={() => setShowEditActionPointModal(false)}
        size="md"
      >
        <Modal.Header className="border-b border-gold-500 bg-gray-800 text-white">
          Edit Action Point
        </Modal.Header>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900">
          <div className="space-y-4 text-white">
            <div>
              <Label
                htmlFor="actionPointDescription"
                value="Description"
                className="text-white mb-1 block"
              />
              <Textarea
                id="actionPointDescription"
                placeholder="Update description..."
                value={actionPointForm.description}
                onChange={(e) =>
                  setActionPointForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={4}
              />
            </div>
            <div>
              <Label
                htmlFor="actionPointStatus"
                value="Status"
                className="text-white mb-1 block"
              />
              <Select
                id="actionPointStatus"
                value={actionPointForm.status}
                onChange={(e) =>
                  setActionPointForm((prev) => ({
                    ...prev,
                    status: e.target.value as "PENDING" | "COMPLETED",
                  }))
                }
              >
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
              </Select>
            </div>
            <div>
              <Label
                htmlFor="actionPointAssignee"
                value="Assign To"
                className="text-white mb-1 block"
              />
              <Select
                id="actionPointAssignee"
                value={actionPointForm.assignedTo}
                onChange={(e) =>
                  setActionPointForm((prev) => ({
                    ...prev,
                    assignedTo: e.target.value,
                  }))
                }
              >
                <option value="">Unassigned</option>
                {event?.EventAssignee?.map((assignee) => (
                  <option key={assignee.userId} value={String(assignee.userId)}>
                    {assignee.user.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <Button color="gray" onClick={() => setShowEditActionPointModal(false)}>
                Cancel
              </Button>
              <Button
                className="bg-gold-500 text-black"
                onClick={handleEditActionPoint}
                disabled={!isEventStarted(event.startDate)}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      <Modal
        show={showDeleteActionPointModal}
        onClose={() => setShowDeleteActionPointModal(false)}
        size="md"
      >
        <Modal.Header className="border-b border-red-700 bg-gray-800 text-white">
          Delete Action Point
        </Modal.Header>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900">
          <div className="space-y-4 text-white">
            <p className="text-gray-300">
              Are you sure you want to delete this action point? This action
              cannot be undone.
            </p>
            {actionPointToDelete?.description && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-gray-300">
                {actionPointToDelete.description}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <Button
                color="gray"
                onClick={() => setShowDeleteActionPointModal(false)}
              >
                Cancel
              </Button>
              <Button
                color="failure"
                className="bg-red-700 hover:bg-red-800"
                onClick={() =>
                  actionPointToDelete &&
                  handleDeleteActionPoint(actionPointToDelete.id)
                }
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      <Modal
        show={showSocialLinkModal}
        onClose={() => !savingSocialLink && setShowSocialLinkModal(false)}
        size="md"
      >
        <Modal.Header className="border-b border-gold-500 bg-gray-800 text-white">
          {editingSocialLink ? "Edit Social Media" : "Add Social Media"}
        </Modal.Header>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900">
          <div className="space-y-4 text-white">
            <div>
              <Label
                htmlFor="socialPlatform"
                value="Platform"
                className="text-white mb-1 block"
              />
              <Select
                id="socialPlatform"
                value={socialLinkForm.platform}
                onChange={(e) =>
                  setSocialLinkForm((prev) => ({
                    ...prev,
                    platform: e.target.value as SocialPlatform,
                  }))
                }
              >
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
                <option value="twitter">Twitter / X</option>
              </Select>
            </div>
            <div>
              <Label
                htmlFor="socialUrl"
                value="Profile or post URL"
                className="text-white mb-1 block"
              />
              <input
                id="socialUrl"
                type="url"
                value={socialLinkForm.url}
                onChange={(e) =>
                  setSocialLinkForm((prev) => ({
                    ...prev,
                    url: e.target.value,
                  }))
                }
                placeholder="https://facebook.com/pbc-event"
                className="block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm text-white placeholder-gray-400 focus:border-gold-500 focus:ring-gold-500"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <Button
                color="gray"
                onClick={() => setShowSocialLinkModal(false)}
                disabled={savingSocialLink}
              >
                Cancel
              </Button>
              <Button
                className="bg-gold-500 text-black"
                onClick={handleSaveSocialLink}
                disabled={savingSocialLink || !socialLinkForm.url.trim()}
              >
                {savingSocialLink ? "Saving..." : "Save Link"}
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      <Modal
        show={Boolean(socialLinkToDelete)}
        onClose={() => !deletingSocialLinkId && setSocialLinkToDelete(null)}
        size="md"
      >
        <Modal.Header className="border-b border-red-700 bg-gray-800 text-white">
          Delete Social Link
        </Modal.Header>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900">
          <div className="space-y-4 text-white">
            <p className="text-gray-300">
              Are you sure you want to delete this social media link? This action cannot be undone.
            </p>
            {socialLinkToDelete && (
              <div className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 p-3">
                <span
                  className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${getSocialPlatformStyles(socialLinkToDelete.platform)}`}
                >
                  {getSocialPlatformIcon(socialLinkToDelete.platform)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">
                    {getSocialPlatformLabel(socialLinkToDelete.platform)}
                  </p>
                  <p className="truncate text-xs text-gray-400">
                    {socialLinkToDelete.url}
                  </p>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <Button
                color="gray"
                onClick={() => setSocialLinkToDelete(null)}
                disabled={Boolean(deletingSocialLinkId)}
              >
                Cancel
              </Button>
              <Button
                color="failure"
                className="bg-red-700 hover:bg-red-800"
                onClick={handleDeleteSocialLink}
                disabled={Boolean(deletingSocialLinkId)}
              >
                {deletingSocialLinkId ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      <Modal
        show={openMediaModal}
        onClose={() => setOpenMediaModal(false)}
        size="md"
      >
        <Modal.Header className="border-b border-gold-500 bg-gray-800 text-white">
          Add Media
        </Modal.Header>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900">
          <form className="space-y-6">
            <div>
              <Label
                htmlFor="eventMedia"
                value="Upload media"
                className="text-white mb-1 block"
              />
              <FileInput
                id="eventMedia"
                multiple
                onChange={handleFileChange}
              />
              {selectedMediaFiles.length > 0 && (
                <div className="mt-4 rounded-lg border border-gray-700 bg-gray-900/60 p-3">
                  <p className="mb-2 text-sm font-medium text-white">
                    Selected files
                  </p>
                  <ul className="space-y-2">
                    {selectedMediaFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${file.lastModified}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-md bg-gray-800 px-3 py-2 text-sm text-gray-200"
                      >
                        <span className="min-w-0 truncate">{file.name}</span>
                        <span className="shrink-0 text-xs text-gray-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" color="dark" onClick={() => setOpenMediaModal(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-gold-500 text-black"
                onClick={handleUploadMedia}
                disabled={uploadingMedia || selectedMediaFiles.length === 0}
              >
                {uploadingMedia ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </form>
        </Modal.Body>
      </Modal>

      <Modal
        show={showMarkAttendanceModal}
        onClose={() => !markingAttendance && setShowMarkAttendanceModal(false)}
        size="4xl"
        dismissible={!markingAttendance}
        className="max-h-[90vh] overflow-hidden"
      >
        <Modal.Header className="border-b border-gold-500 bg-gray-800">
          Mark Attendance
        </Modal.Header>
        <Modal.Body className="bg-gradient-to-b from-gray-800 to-gray-900 overflow-y-auto max-h-[calc(90vh-10rem)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center mb-2 flex-shrink-0">
                <h3 className="text-gold-500 text-md font-bold">
                  Absent Users
                </h3>
                {attendanceData.filter((u: any) => u.status === "NOT_ATTENDED").length > 0 && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedUserIdsForAttendance.length === attendanceData.filter((u: any) => u.status === "NOT_ATTENDED").length}
                      onChange={() => {
                        const absentUsers = attendanceData.filter((u: any) => u.status === "NOT_ATTENDED");
                        setSelectedUserIdsForAttendance(
                          selectedUserIdsForAttendance.length === absentUsers.length
                            ? []
                            : absentUsers.map((u: any) => u.userId)
                        );
                      }}
                      className="form-checkbox accent-gold-500"
                    />
                    Select All
                  </label>
                )}
              </div>
              <ul className="overflow-y-auto space-y-2 border border-gray-700 rounded-lg p-2 flex-grow max-h-[250px]">
                {attendanceData.filter((u: any) => u.status === "NOT_ATTENDED").map((user: any) => (
                  <li
                    key={user.userId}
                    className="flex items-center justify-between p-2 bg-gray-700 rounded"
                  >
                    <span>{user.user.name}</span>
                    <input
                      type="checkbox"
                      className="form-checkbox accent-gold-500"
                      checked={selectedUserIdsForAttendance.includes(user.userId)}
                      onChange={() => {
                        setSelectedUserIdsForAttendance((prev) =>
                          prev.includes(user.userId)
                            ? prev.filter((id) => id !== user.userId)
                            : [...prev, user.userId],
                        );
                      }}
                    />
                  </li>
                ))}
                {attendanceData.filter((u: any) => u.status === "NOT_ATTENDED").length === 0 && (
                  <li className="p-2 text-gray-400 text-center">
                    No absent users
                  </li>
                )}
              </ul>
            </div>

            <div className="flex flex-col h-full">
              <h3 className="text-gold-500 text-md font-bold mb-2 flex-shrink-0">
                Present Users
              </h3>
              <ul className="overflow-y-auto space-y-2 border border-gray-700 rounded-lg p-2 flex-grow max-h-[250px]">
                {attendanceData.filter((u: any) => u.status === "ATTENDED").map((user: any) => (
                  <li
                    key={user.userId}
                    className="p-2 bg-green-700 text-white rounded cursor-not-allowed opacity-70"
                  >
                    {user.user.name}
                  </li>
                ))}
                {attendanceData.filter((u: any) => u.status === "ATTENDED").length === 0 && (
                  <li className="p-2 text-gray-400 text-center">
                    No present users
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <Button
              isProcessing={markingAttendance}
              className="bg-gold-500 text-black hover:bg-gold-600"
              onClick={handleMarkAttendance}
              disabled={selectedUserIdsForAttendance.length === 0}
            >
              Submit Attendance
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      
    </div>
  );
}
