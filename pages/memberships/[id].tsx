import React, { useEffect, useState } from "react";
import Loading from "@/components/ui/Loading";
import Link from "next/link";
import UserProfileImage from "@/components/ui/UserProfileImage";
import Can from "@/components/rbac/Can";
import SocialLink from "@/components/ui/SocialLink";
import BadgeList from "@/components/ui/BadgeList";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import _ from "lodash";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import {
  CheckIcon,
  XIcon,
  UserIcon,
  BuildingIcon,
  BadgeIcon,
  CheckCircleIcon,
  Pencil,
  Upload,
  Paperclip,
  Trash2,
} from "lucide-react";
import { Roles } from "@/enums/Roles";
import { formatStatus } from "@/utils/formatStatus";
import useAuthStore from "@/store/authStore";
import { useAbility } from "@/hooks/useAbility";
import { fetchSubCategoriesByCategory } from "@/services/membershipSubCategory";
import { downloadMembershipExcel } from "@/services/membershipExport";
import { deleteMembershipAttachment } from "@/services/membershipAttachments";
import type { MembershipSubCategory } from "@/types/membershipSubCategory";
import CurrencyAmount from "@/components/ui/CurrencyAmount";

type UserRole = {
  id: number;
  name: string;
};

interface MembershipUser {
  id: number;
  name: string;
  email: string;
  Role: UserRole;
  profile: Profile;
}

interface BusinessGroup {
  id: number;
  name: string;
  description: string;
}

interface Profile {
  bio: string;
  country: string;
  facebookSocial: string;
  linkedInSocial: string;
  calendlyLink: string;
  profilePicture: string;
  tradeLicense: string;
  tradeLicenseSecondary?: string;
  passport: string;
  passportSecondary?: string;
  emiratesId: string;
  emiratesIdSecondary?: string;
  longitude: string;
  latitude: string;
}

interface Membership {
  id: number;
  membershipId: string;
  oldMembershipId?: string;
  userId: number;
  fullName: string;
  email: string;
  emiratesId: string;
  dateOfBirth: string;
  phoneNumber: string;
  passportNumber: string;
  passportExpiryDate: string;
  emiratesIdExpiryDate: string;
  companyName: string;
  city: string;
  country: string;
  tradeLicenseNumber: string;
  tradeLicenseExpiry: string;
  yearOfEstablishment: number;
  affiliation: string;
  legalStatus: string;
  natureOfBusiness: string;
  businessGroup: BusinessGroup[];
  noOfEmployees: number;
  vatRegistrationNumber: string;
  hsCodes: string[];
  website: string;
  keywords: string[];
  shareHolderStatus: string;
  otherShareHoldersName: string[];
  annualRevenue: string;
  ownershipPercentage: number;
  references: string[];
  paymentMethod: string;
  professionalTitle: string;
  primeClients: string[];
  languagesSpoken: string[];
  yearsOfExperience: number;
  expectations: string;
  keyObjectives: string[];
  areaOfInterest: string[];
  selfDescription: string;
  membershipCategory: string;
  councilDiscoveryMethod: string;
  businessTrainingInterest: string;
  clientIntroductionComfort: string;
  status: string;
  subscriptionId: any;
  paymentVerified: boolean;
  decision_at?: string;
  lastBillingDate?: string;
  nextBillingDate?: string;
  expiryUpdated?: boolean;
  createdAt: string;
  updatedAt: string;
  user: MembershipUser;
  attachments?: MembershipAttachment[];
  membershipCategoryRef?: {
    id: number;
    name: string;
  };
  membershipSubCategoryRef?: {
    id: number;
    name: string;
  };
}

interface MembershipAttachment {
  id: number;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

interface Approval {
  id: number;
  membershipId: number;
  userId: number;
  status: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
    Role: UserRole;
  };
}

const MemberRoles = [Roles.CORPORATE, Roles.INDIVIDUAL];

const hasGeneralSecretaryVote = (approvals: Approval[]) => {
  return approvals.some(
    (approval) => approval.user?.Role?.name === Roles.GENERAL_SECRETARY,
  );
};

export default function MembershipDetails() {
  const [membership, setMembership] = useState<Membership | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [comment, setComment] = useState<string>("");
  const [notFound, setNotFound] = useState<boolean>(false);
  const [showVoteButtons, setShowVoteButtons] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("personal");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isPdfLoading, setIsPdfLoading] = useState<boolean>(false);
  const [isExcelLoading, setIsExcelLoading] = useState<boolean>(false);
  const [isVirtualCardDownloading, setIsVirtualCardDownloading] = useState<boolean>(false);
  const [showBillingModal, setShowBillingModal] = useState<boolean>(false);
  const [billingOldMembershipId, setBillingOldMembershipId] = useState<string>("");
  const [billingNextBillingDate, setBillingNextBillingDate] = useState<string>("");
  const [isBillingUpdating, setIsBillingUpdating] = useState<boolean>(false);
  const [attachmentFiles, setAttachmentFiles] = useState<Array<File | null>>(
    Array(5).fill(null),
  );
  const [attachmentFormKey, setAttachmentFormKey] = useState<number>(0);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState<boolean>(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const ability = useAbility();
  // Optional sub-category (first approval only)
  const [availableSubCategories, setAvailableSubCategories] = useState<MembershipSubCategory[]>([]);
  const [membershipSubCategoryId, setMembershipSubCategoryId] = useState<number | "">("");

  const router = useRouter();
  const { id } = router.query;

  const fetchMembership = async () => {
    if (!id) return;

    if (token === "undefined" || token === null) {
      router.push("/");
    } else {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/membership/${id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              token: token,
            },
          },
        );

        const membershipData = await response.json();
        if (
          membershipData.error ||
          membershipData.error?.[0].msg.includes("not found")
        ) {
          setNotFound(true);
        } else {
          setMembership(membershipData.data);
          setNotFound(false);
        }
      } catch (error) {
        toast.error("Error fetching membership details");
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
  };

  const fetchApprovals = async () => {
    if (!id) return;

    if (MemberRoles.includes(user?.Role?.name as Roles)) return;

    if (token === "undefined" || token === null) {
      router.push("/");
    } else {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/membership-approval/${id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              token: token,
            },
          },
        );

        const approvalsData = await response.json();
        if (approvalsData.error) {
          toast.error(approvalsData.error[0].msg);
          if (approvalsData.error[0].path === "token") {
            router.push("/");
          }
        } else {
          setApprovals(approvalsData.data || []);
        }
      } catch (error) {
        toast.error("Error fetching approval history");
      }
    }
  };

  useEffect(() => {
    if (id && token) {
      fetchMembership();
    }
  }, [id, token]);

  useEffect(() => {
    if (user && membership && MemberRoles.includes(user.Role?.name as Roles)) {
      if (membership.userId !== Number(user.id)) {
        toast.error("You are not authorized to view this membership application.");
        router.push("/memberships");
        return;
      }
    }
  }, [user, membership, router]);

  useEffect(() => {
    if (id && token && user) {
      fetchApprovals();
    }
  }, [id, token, membership, user]);

  useEffect(() => {
    if (user && membership && approvals) {
      if (membership.userId === Number(user.id)) {
        setShowVoteButtons(false);
        return;
      }

      const userHasVoted = approvals.some(
        (approval) => approval.userId === Number(user.id),
      );
      const votesCount = approvals.length;
      const generalSecretaryHasVoted = hasGeneralSecretaryVote(approvals);
      const isExpiryApprovalFlow = Boolean(membership.expiryUpdated);

      if (user.Role?.name === Roles.CHAIRMAN) {
        setShowVoteButtons(
          !userHasVoted &&
            votesCount >= 3 &&
            generalSecretaryHasVoted &&
            (isExpiryApprovalFlow || membership.status === "PENDING"),
        );
        return;
      }

      setShowVoteButtons(
        !userHasVoted && (isExpiryApprovalFlow || membership.status === "PENDING"),
      );
    }
  }, [user, membership, approvals]);

  // Load sub-categories for the membership's category when opening approval modal (first approval only)
  useEffect(() => {
    const loadSubs = async () => {
      if (!token || !membership || approvals.length !== 0 || membership.expiryUpdated) return;
      try {
        const data = await fetchSubCategoriesByCategory(token, membership.membershipCategoryRef?.id || 0);
        setAvailableSubCategories(data);
      } catch {
        // silent
      }
    };
    if (showModal && status === "APPROVED") {
      loadSubs();
    }
  }, [showModal, status, token, membership, approvals.length]);

  const handleDownloadPdf = async () => {
    if (!id || !token) return;
    setIsPdfLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/membership/${id}/pdf`,
        { method: "GET", headers: { token: token } },
      );
      if (!response.ok) throw new Error("Failed to generate PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `membership_${id}_report.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Error generating PDF report");
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleDownloadVirtualCard = async () => {
    if (!membership?.userId || !token) return;
    setIsVirtualCardDownloading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/profile/${membership.userId}/business-card/download`,
        { method: "GET", headers: { token: token } },
      );
      if (!response.ok) throw new Error("Failed to download virtual card");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `virtual-card-${membership.userId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("Error downloading virtual card");
    } finally {
      setIsVirtualCardDownloading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!id || !token) return;
    setIsExcelLoading(true);
    try {
      await downloadMembershipExcel({
        membershipId: Number(id),
        token,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error generating Excel report");
    } finally {
      setIsExcelLoading(false);
    }
  };

  const canManageMembership = ability?.can("manage", "Membership") ?? false;
  const canUploadAttachments =
    Boolean(membership && user) &&
    (Number(user?.id) === Number(membership?.userId) || canManageMembership);

  const handleAttachmentChange = (index: number, file: File | null) => {
    setAttachmentFiles((prev) => {
      const next = [...prev];
      next[index] = file;
      return next;
    });
  };

  const handleUploadAttachments = async () => {
    if (!id || !token || !membership) return;

    const selectedFiles = attachmentFiles
      .map((file, index) => ({ file, index }))
      .filter((entry): entry is { file: File; index: number } => Boolean(entry.file));

    if (selectedFiles.length === 0) {
      toast.info("Please choose at least one file to upload.");
      return;
    }

    try {
      setIsUploadingAttachments(true);

      const formData = new FormData();
      selectedFiles.forEach(({ file, index }) => {
        formData.append(`attachment${index + 1}`, file);
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/membership/${id}/attachments`,
        {
          method: "POST",
          headers: {
            token,
          },
          body: formData,
        },
      );

      const data = await response.json();
      if (!response.ok || data?.error) {
        throw new Error(data?.error?.[0]?.msg || "Failed to upload attachments");
      }

      toast.success("Membership attachments uploaded successfully");
      setAttachmentFiles(Array(5).fill(null));
      setAttachmentFormKey((prev) => prev + 1);
      await fetchMembership();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload attachments";
      toast.error(message);
    } finally {
      setIsUploadingAttachments(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    if (!id || !token) return;

    try {
      setDeletingAttachmentId(attachmentId);
      await deleteMembershipAttachment(token, Number(id), attachmentId);
      toast.success("Membership attachment deleted successfully");
      await fetchMembership();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete attachment";
      toast.error(message);
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const toDateValue = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  };

  const openBillingModal = () => {
    if (!membership) return;
    setBillingOldMembershipId(membership.oldMembershipId || "");
    setBillingNextBillingDate(toDateValue(membership.nextBillingDate));
    setShowBillingModal(true);
  };

  const handleBillingUpdate = async () => {
    if (!id || !token) return;

    const payload: Record<string, string> = {};
    const trimmedOldMembershipId = billingOldMembershipId.trim();

    if (trimmedOldMembershipId) {
      payload.oldMembershipId = trimmedOldMembershipId;
    }

    if (billingNextBillingDate) {
      payload.nextBillingDate = billingNextBillingDate;
    }

    if (Object.keys(payload).length === 0) {
      toast.info("Nothing to update. Add at least one value.");
      return;
    }

    try {
      setIsBillingUpdating(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/membership/billing-info/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            token: token,
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();
      if (!response.ok || data.error) {
        const message = data?.error?.[0]?.msg || "Failed to update billing info";
        throw new Error(message);
      }

      toast.success("Billing info updated successfully");
      setShowBillingModal(false);
      fetchMembership();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update billing info";
      toast.error(message);
    } finally {
      setIsBillingUpdating(false);
    }
  };

  const handleApprove = () => {
    setStatus("APPROVED");
    setShowModal(true);
    setComment("");
    setMembershipSubCategoryId("");
  };

  const handleReject = () => {
    setStatus("REJECTED");
    setShowModal(true);
    setComment("");
    setMembershipSubCategoryId("");
  };

  const handleApproveReject = async (status: string) => {
    if (!comment || comment.trim().length < 10) {
      toast.warning("Please provide a detailed comment (minimum 10 characters).");
      return;
    }

    if (token === "undefined" || token === null) {
      router.push("/");
    } else {
      try {
        setIsSubmitting(true);
        const body: any = {
          status,
          comment,
          membershipId: Number(id),
        };
        // Include sub-category only on first approval and when provided
        if (
          status === "APPROVED" &&
          approvals.length === 0 &&
          membershipSubCategoryId &&
          !membership?.expiryUpdated
        ) {
          body.membershipSubCategoryId = Number(membershipSubCategoryId);
        }

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/membership-approval/add/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              token: token,
            },
            body: JSON.stringify(body),
          },
        );

        const data = await response.json();
        if (data.message) {
          toast.success(`Membership application ${status.toLowerCase()} successfully`);
          setShowModal(false);
          setMembershipSubCategoryId("");
          fetchMembership();
          fetchApprovals();
          setComment("");
        } else {
          toast.error(data.error?.[0]?.msg || "Error updating status");
        }
      } catch (error) {
        toast.error("Error processing your request");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    let bgColor, textColor, darkBgColor, darkTextColor;

    switch (status.toUpperCase()) {
      case "APPROVED":
        bgColor = "bg-green-100";
        textColor = "text-green-800";
        darkBgColor = "dark:bg-green-900";
        darkTextColor = "dark:text-green-300";
        break;
      case "PENDING":
        bgColor = "bg-yellow-100";
        textColor = "text-yellow-800";
        darkBgColor = "dark:bg-yellow-900";
        darkTextColor = "dark:text-yellow-300";
        break;
      case "REJECTED":
        bgColor = "bg-red-100";
        textColor = "text-red-800";
        darkBgColor = "dark:bg-red-900";
        darkTextColor = "dark:text-red-300";
        break;
      default:
        bgColor = "bg-gray-100";
        textColor = "text-gray-800";
        darkBgColor = "dark:bg-gray-900";
        darkTextColor = "dark:text-gray-300";
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor} ${darkBgColor} ${darkTextColor}`}
      >
        <div
          className={`h-2 w-2 rounded-full mr-1.5 ${
            status.toUpperCase() === "APPROVED"
              ? "bg-green-500"
              : status.toUpperCase() === "REJECTED"
                ? "bg-red-500"
                : "bg-yellow-500"
          }`}
        ></div>
        {status}
      </span>
    );
  };

  const formatFieldName = (key: string) => {
    // Convert camelCase to Title Case with spaces
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  };

  // Group membership fields into categories for better organization
  const personalInfo = membership
    ? [
        { key: "fullName", label: "Full Name", value: membership.fullName },
        { key: "email", label: "Email", value: membership.email },
        {
          key: "phoneNumber",
          label: "Phone Number",
          value: membership.phoneNumber,
        },
        {
          key: "dateOfBirth",
          label: "Date of Birth",
          value:
            membership.dateOfBirth &&
            formatDateAndTime(membership.dateOfBirth),
        },
        {
          key: "professionalTitle",
          label: "Professional Title",
          value: membership.professionalTitle,
        },
        {
          key: "languagesSpoken",
          label: "Languages Spoken",
          value: membership.languagesSpoken,
          badge: true,
        },
        {
          key: "yearsOfExperience",
          label: "Years of Experience",
          value: membership.yearsOfExperience,
        },
        {
          key: "selfDescription",
          label: "Self Description",
          value: membership.selfDescription,
        },
      ]
    : [];

  const identificationInfo = membership
    ? [
        {
          key: "emiratesId",
          label: "Emirates ID",
          value: membership.emiratesId,
        },
        {
          key: "emiratesIdExpiryDate",
          label: "Emirates ID Expiry Date",
          value:
            membership.emiratesIdExpiryDate &&
            formatDateAndTime(membership.emiratesIdExpiryDate, false),
        },
        {
          key: "passportNumber",
          label: "Passport Number",
          value: membership.passportNumber,
        },
        {
          key: "passportExpiryDate",
          label: "Passport Expiry Date",
          value:
            membership.passportExpiryDate &&
            formatDateAndTime(membership.passportExpiryDate, false),
        },
        { key: "country", label: "Country", value: membership.country },
        { key: "city", label: "City", value: membership.city },
      ]
    : [];

  const businessInfo = membership
    ? [
        {
          key: "companyName",
          label: "Company Name",
          value: membership.companyName,
        },
        {
          key: "tradeLicenseNumber",
          label: "Trade License Number",
          value: membership.tradeLicenseNumber,
        },
        {
          key: "tradeLicenseExpiry",
          label: "Trade License Expiry",
          value: membership.tradeLicenseExpiry && formatDateAndTime(membership.tradeLicenseExpiry, false),
        },
        {
          key: "yearOfEstablishment",
          label: "Year of Establishment",
          value: membership.yearOfEstablishment,
        },
        {
          key: "legalStatus",
          label: "Legal Status",
          value: membership.legalStatus,
        },
        {
          key: "natureOfBusiness",
          label: "Nature of Business",
          value: membership.natureOfBusiness,
        },
        {
          key: "businessGroup",
          label: "Business Group",
          value: membership.businessGroup.map(val => val.name),
          badge: true,
        },
        {
          key: "noOfEmployees",
          label: "Number of Employees",
          value: membership.noOfEmployees,
        },
        {
          key: "vatRegistrationNumber",
          label: "VAT Registration Number",
          value: membership.vatRegistrationNumber,
        },
        {
          key: "hsCodes",
          label: "HS Codes",
          value: membership.hsCodes,
          badge: true,
        },
        { key: "website", label: "Website", value: membership.website },
        {
          key: "keywords",
          label: "Keywords",
          value: membership.keywords,
          badge: true,
        },
        {
          key: "affiliation",
          label: "Affiliation",
          value: membership.affiliation,
        },
        {
          key: "primeClients",
          label: "Prime Clients",
          value: membership.primeClients,
          badge: true,
        },
      ]
    : [];

  const financialInfo = membership
    ? [
        {
          key: "shareHolderStatus",
          label: "Shareholder Status",
          value: membership.shareHolderStatus,
        },
        {
          key: "otherShareHoldersName",
          label: "Other Shareholders",
          value: membership.otherShareHoldersName,
          badge: true,
        },
        {
          key: "annualRevenue",
          label: "Annual Revenue",
          value: <CurrencyAmount amount={Number(membership.annualRevenue || 0)} />,
        },
        {
          key: "ownershipPercentage",
          label: "Ownership Percentage",
          value: membership.ownershipPercentage ? `${membership.ownershipPercentage} %` : "0 %",
        },
        {
          key: "paymentMethod",
          label: "Payment Method",
          value: membership.paymentMethod,
        },
        {
          key: "paymentVerified",
          label: "Payment Verified",
          value: membership.paymentVerified ? "Yes" : "No",
        },
      ]
    : [];

  const membershipInfo = membership
    ? [
        {
          key: "membershipCategory",
          label: "Membership Category",
          value: membership.membershipCategoryRef?.name,
        },
        {
          key: "oldMembershipId",
          label: "PBC Membership Number",
          value: membership.oldMembershipId,
        },
        {
          key: "membershipSubCategoryRef",
          label: "Membership Sub Category",
          value: membership.membershipSubCategoryRef?.name,
        },
        {
          key: "references",
          label: "References",
          value: membership.references,
          badge: true,
        },
        {
          key: "expectations",
          label: "Expectations",
          value: membership.expectations,
        },
        {
          key: "keyObjectives",
          label: "Key Objectives",
          value: membership.keyObjectives,
          badge: true,
        },
        {
          key: "areaOfInterest",
          label: "Area of Interest",
          value: membership.areaOfInterest,
          badge: true,
        },
        {
          key: "councilDiscoveryMethod",
          label: "Discovery Method",
          value: membership.councilDiscoveryMethod,
        },
        {
          key: "businessTrainingInterest",
          label: "Training Interest",
          value: membership.businessTrainingInterest,
        },
        {
          key: "clientIntroductionComfort",
          label: "Client Introduction Comfort",
          value: membership.clientIntroductionComfort,
        },
        {
          key: "status",
          label: "Application Status",
          value: membership.status,
        },
        {
          key: "decision_at",
          label: "Membership Activation Date",
          value:
            membership.decision_at &&
            formatDateAndTime(membership.decision_at),
        },
        {
          key: "lastBillingDate",
          label: "Member Since",
          value:
            membership.lastBillingDate &&
            formatDateAndTime(membership.lastBillingDate),
        },
        {
          key: "nextBillingDate",
          label: "Next Billing Date",
          value:
            membership.nextBillingDate &&
            formatDateAndTime(membership.nextBillingDate),
        },
      ]
    : [];

  const userDocuments = membership?.user?.profile
    ? [
        { key: "tradeLicense", title: "Trade License" },
        { key: "tradeLicenseSecondary", title: "Trade License (Secondary)" },
        { key: "passport", title: "Passport" },
        { key: "passportSecondary", title: "Passport (Secondary)" },
        { key: "emiratesId", title: "Emirates ID" },
        { key: "emiratesIdSecondary", title: "Emirates ID (Secondary)" },
      ]
        .map((doc) => ({
          title: doc.title,
          src: membership.user.profile[doc.key as keyof Profile],
        }))
        .filter(
          (doc): doc is { title: string; src: string } =>
            typeof doc.src === "string" && doc.src.trim().length > 0,
        )
    : [];

    const renderBadgeList = (items: any) => {
      if (!Array.isArray(items)) return "-";

      return <BadgeList items={items} variant={'gold'} />;
    };

  const renderInfoValue = (value: any) => {
    if (React.isValidElement(value)) return value;
    if (typeof value === "object") return JSON.stringify(value);
    return String(value || "-");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow text-center">
        <svg
          className="w-20 h-20 text-gray-400 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Membership Not Found
        </h2>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-6">
          The membership application you are looking for could not be found.
        </p>
        <Link
          href="/memberships"
          className="px-5 py-2.5 bg-gold-600 text-white rounded-lg hover:bg-gold-700 focus:ring-4 focus:ring-gold-300 transition"
        >
          Back to All Memberships
        </Link>
      </div>
    );
  }

  if (!membership) {
    return <Loading/>;
  }

  return (
    <>
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        {/* Header with action buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b pb-6 dark:border-gray-700">
          <div className="flex items-start gap-4">
            <Link
              href="/memberships"
              className="text-gray-500 hover:text-gold-600 dark:text-gray-400 dark:hover:text-gold-500"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                Membership Application
                <StatusBadge status={membership.status} />
                {membership.expiryUpdated && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    Expiry update awaiting approvals
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                ID: {membership.id} • Submitted at:{" "}
                {formatDateAndTime(membership.createdAt, true)}
                {membership.decision_at && ` • ${formatStatus(membership.status)} at: ${formatDateAndTime(membership.decision_at, true)}`}
                {membership.lastBillingDate && ` • Previous Billing Date: ${formatDateAndTime(membership.lastBillingDate, true)}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 sm:mt-0">
            <Can I="manage" a="Membership">
              <button
                onClick={handleDownloadPdf}
                disabled={isPdfLoading}
                className="flex items-center px-4 py-2 text-sm font-medium bg-gray-700 text-white rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPdfLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    </svg>
                    Print PDF
                  </>
                )}
              </button>
              
              <button
                onClick={handleDownloadExcel}
                disabled={isExcelLoading}
                className="flex items-center px-4 py-2 text-sm font-medium bg-green-700 text-white rounded-md hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isExcelLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export Excel
                  </>
                )}
              </button>
        
            </Can>
            
      <button
                onClick={handleDownloadVirtualCard}
                disabled={isVirtualCardDownloading}
                className="flex items-center px-4 py-2 text-sm font-medium bg-indigo-700 text-white rounded-md hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isVirtualCardDownloading ? (
                  <>
                    <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Virtual Card
                  </>
                )}
              </button>
            <Can I="approve" a="MembershipApproval">
              {showVoteButtons && (
                <>
                  <button
                    onClick={handleApprove}
                    className="flex items-center px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <CheckIcon className="w-4 h-4 mr-2" />
                    Approve
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex items-center px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <XIcon className="w-4 h-4 mr-2" />
                    Reject
                  </button>
                </>
              )}
            </Can>
          </div>
        </div>

        {/* Applicant Summary */}
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {membership.fullName}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {membership.professionalTitle &&
                  `${membership.professionalTitle} • `}
                {membership.email}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {membership.phoneNumber && `${membership.phoneNumber} • `}
                {membership.city && membership.country
                  ? `${membership.city}, ${membership.country}`
                  : membership.country || membership.city}
              </p>
            </div>
            <div className="text-sm text-right">
              <span className="text-gray-500 dark:text-gray-400">
                User Account
              </span>
              <Link
                href={`/users/${membership.userId}?returnPath=${encodeURIComponent(router.asPath)}`}
                className="block text-gold-600 dark:text-gold-400 hover:underline"
              >
                View {membership.user.name}&apos;s Profile
              </Link>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Role: {membership.user?.Role?.name}
              </span>
            </div>
          </div>
        </div>

        {(membership.attachments?.length || canUploadAttachments) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-5">
              <div>
                <h5 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-gold-600" />
                  Membership Attachments
                </h5>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Uploading a file in a slot replaces the attachment in that position. Maximum 5 attachments.
                </p>
              </div>

              {canUploadAttachments && (
                <button
                  onClick={handleUploadAttachments}
                  disabled={isUploadingAttachments}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium bg-gold-600 text-white rounded-md hover:bg-gold-700 focus:outline-none focus:ring-2 focus:ring-gold-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isUploadingAttachments ? (
                    <>
                      <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Attachments
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 5 }).map((_, index) => {
                const attachment = membership.attachments?.[index];
                const selectedFile = attachmentFiles[index];

                return (
                  <div
                    key={`attachment-slot-${index + 1}`}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                        Attachment {index + 1}
                      </span>
                      {attachment ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                          Saved
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          Empty
                        </span>
                      )}
                    </div>

                    {attachment ? (
                      <div className="relative mb-3">
                        <UserProfileImage
                          src={attachment.url}
                          title={attachment.fileName || `Attachment ${index + 1}`}
                          mimeType={attachment.mimeType}
                          isDownloadable
                          showViewLink={false}
                        />

                        {canUploadAttachments && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAttachment(attachment.id)}
                            disabled={deletingAttachmentId === attachment.id}
                            className="absolute top-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:bg-gray-900/90 dark:hover:bg-red-950 disabled:opacity-60 disabled:cursor-not-allowed"
                            aria-label={`Delete attachment ${index + 1}`}
                            title="Delete attachment"
                          >
                            {deletingAttachmentId === attachment.id ? (
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                              </svg>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-3 mb-3 text-sm text-gray-500 dark:text-gray-400">
                        No attachment uploaded in this slot.
                      </div>
                    )}

                    {canUploadAttachments ? (
                      <label className="block">
                        <span className="sr-only">{`Select file for attachment ${index + 1}`}</span>
                        <input
                          key={`${attachmentFormKey}-${index}`}
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,image/*"
                          onChange={(event) =>
                            handleAttachmentChange(
                              index,
                              event.target.files?.[0] || null,
                            )
                          }
                          className="block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-gray-800 dark:file:bg-gray-700 dark:hover:file:bg-gray-600"
                        />
                        {selectedFile && (
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate">
                            Selected: {selectedFile.name}
                          </p>
                        )}
                      </label>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        You can view this attachment, but only the owner or a manage-capable user can replace it.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <ul className="flex flex-wrap text-sm font-medium text-gray-600 dark:text-gray-300">
            {[
              {
                key: "personal",
                label: "Personal Information",
                icon: UserIcon,
                show: true,
              },
              {
                key: "business",
                label: "Business Details",
                icon: BuildingIcon,
                show: true,
              },
              {
                key: "membership",
                label: "Membership Details",
                icon: BadgeIcon,
                show: true,
              },
              {
                key: "approvals",
                label: `Approval History (${approvals.length})`,
                icon: CheckCircleIcon,
                show: user && !MemberRoles.includes(user?.Role?.name as Roles),
              },
            ]
              .filter((tab) => tab.show)
              .map(({ key, label, icon: Icon }) => (
                <li key={key}>
                  <button
                    onClick={() => setActiveTab(key)}
                    className={`inline-flex items-center gap-2 p-3 border-b-2 ${
                      activeTab === key
                        ? "text-gold-600 border-gold-600 dark:text-gold-500 dark:border-gold-500"
                        : "border-transparent hover:text-gray-700 hover:border-gray-300 dark:hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                </li>
              ))}
          </ul>
        </div>

        {/* Tab Content */}
        <div className="mb-6">
          {activeTab === "personal" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      ></path>
                    </svg>
                    Personal Details
                  </h5>
                  <div className="grid grid-cols-1 gap-4">
                    {personalInfo
                      .filter((item) => item.value)
                      .map((item) => (
                        <div key={item.key}>
                          <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {item.label}
                          </h6>
                          <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                            {item.badge ? renderBadgeList(item.value) : renderInfoValue(item.value)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                      ></path>
                    </svg>
                    Identification & Contact
                  </h5>
                  <div className="grid grid-cols-1 gap-4">
                    {identificationInfo
                      .filter((item) => item.value)
                      .map((item) => (
                        <div key={item.key}>
                          <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {item.label}
                          </h6>
                          <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                            {renderInfoValue(item.value)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              {membership.user?.profile &&
                (membership.user.profile.facebookSocial ||
                  membership.user.profile.linkedInSocial ||
                  membership.user.profile.calendlyLink) && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">
                      Social Links
                    </h6>
                    <div className="flex flex-wrap gap-3">
                      {membership.user.profile.facebookSocial && (
                        <SocialLink
                          type="facebook"
                          url={membership.user.profile.facebookSocial}
                        />
                      )}
                      {membership.user.profile.linkedInSocial && (
                        <SocialLink
                          type="linkedin"
                          url={membership.user.profile.linkedInSocial}
                        />
                      )}
                      {membership.user.profile.calendlyLink && (
                        <SocialLink
                          type="calendly"
                          url={membership.user.profile.calendlyLink}
                        />
                      )}
                    </div>
                  </div>
                )}
              {/* User Documents Section */}
              {userDocuments.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      ></path>
                    </svg>
                    User Documents
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {userDocuments.map((document) => (
                      <UserProfileImage
                        key={`${document.title}-${document.src}`}
                        src={document.src}
                        title={document.title}
                        isDownloadable
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "business" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      ></path>
                    </svg>
                    Business Information
                  </h5>
                  <div className="grid grid-cols-1 gap-4">
                    {businessInfo
                      .slice(0, 7)
                      .filter((item) => item.value)
                      .map((item) => (
                        <div key={item.key}>
                          <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {item.label}
                          </h6>
                          <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                            {item.badge ? renderBadgeList(item.value) : renderInfoValue(item.value)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                      ></path>
                    </svg>
                    Business Details
                  </h5>
                  <div className="grid grid-cols-1 gap-4">
                    {businessInfo
                      .slice(7)
                      .filter((item) => item.value)
                      .map((item) => (
                        <div key={item.key}>
                          <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            {item.label}
                          </h6>
                          <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                            {item.badge ? renderBadgeList(item.value) : renderInfoValue(item.value)}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  Financial Information
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {financialInfo
                    .filter((item) => item.value)
                    .map((item) => (
                      <div key={item.key}>
                        <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {item.label}
                        </h6>
                        <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                          {item.badge ? renderBadgeList(item.value) : renderInfoValue(item.value)}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "membership" && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                    ></path>
                  </svg>
                  Membership Application
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {membershipInfo
                    .filter((item) => item.value)
                    .map((item) => (
                        <div key={item.key}>
                          <div className="flex items-center justify-between gap-2">
                            <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              {item.label}
                            </h6>
                            {(item.key === "oldMembershipId" ||
                              item.key === "nextBillingDate") && (
                              <Can I="manage" a="Membership">
                                <button
                                  type="button"
                                  onClick={openBillingModal}
                                  className="inline-flex items-center text-xs text-gold-600 hover:text-gold-700"
                                  title="Edit billing info"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </Can>
                            )}
                          </div>
                          <p className="text-base font-medium text-gray-900 dark:text-white mt-1">
                            {item.key === "status" ? (
                              <StatusBadge status={item.value as string} />
                            ) : item.badge ? renderBadgeList(item.value) : (
                              renderInfoValue(item.value)
                            )}
                          </p>
                        </div>
                      ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    ></path>
                  </svg>
                  Expectations & Interests
                </h5>
                <div className="grid grid-cols-1 gap-4">
                  {membershipInfo
                    .slice(6)
                    .filter(
                      (item) =>
                        [
                          "expectations",
                          "keyObjectives",
                          "areaOfInterest",
                          "businessTrainingInterest",
                        ].includes(item.key) && item.value,
                    )
                    .map((item) => (
                      <div key={item.key}>
                        <h6 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          {item.label}
                        </h6>
                        <p className="text-base text-gray-900 dark:text-white mt-1 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                          {item.badge ? renderBadgeList(item.value) : renderInfoValue(item.value)}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {user &&
            activeTab === "approvals" &&
            !MemberRoles.includes(user?.Role?.name as Roles) && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h5 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                  Approval History
                </h5>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 pl-7">
                  The membership request will be finalized after{" "}
                  <span className="font-medium text-gray-700 dark:text-white">
                    4 approvals
                  </span>{" "}
                  from higher management.
                </p>

                {approvals.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      ></path>
                    </svg>
                    <h3 className="mt-2 text-base font-medium text-gray-900 dark:text-white">
                      No approval data
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      No approval history is available for this membership
                      application.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th
                            scope="col"
                            className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400"
                          >
                            Approver
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400"
                          >
                            Role
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400"
                          >
                            Review Date
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400"
                          >
                            Decision
                          </th>
                          <th
                            scope="col"
                            className="px-4 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400"
                          >
                            Comments
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                        {approvals.map((approval) => (
                          <tr
                            key={approval.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {approval.user.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                ID: {approval.userId}
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="px-2.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full dark:bg-purple-900 dark:text-purple-300">
                                {approval.user?.Role?.name}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {formatDateAndTime(approval.updatedAt)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <StatusBadge status={approval.status} />
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                              <div className="max-w-xs lg:max-w-lg break-words">
                                {approval.comment}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      {/* Billing Info Modal */}
      {showBillingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                  Edit Membership Info
                </h3>
                <button
                  onClick={() => setShowBillingModal(false)}
                  disabled={isBillingUpdating}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                    PBC Membership Number
                  </label>
                  <input
                    type="text"
                    value={billingOldMembershipId}
                    onChange={(e) => setBillingOldMembershipId(e.target.value)}
                    disabled={isBillingUpdating}
                    className="block w-full p-2.5 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter PBC Membership Number"
                  />
                </div>

                {membership?.nextBillingDate && (
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Next Billing Date
                    </label>
                    <input
                      type="date"
                      value={billingNextBillingDate}
                      onChange={(e) => setBillingNextBillingDate(e.target.value)}
                      disabled={isBillingUpdating}
                      className="block w-full p-2.5 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Must be a future date.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowBillingModal(false)}
                  disabled={isBillingUpdating}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBillingUpdate}
                  disabled={isBillingUpdating}
                  className="px-4 py-2 text-sm font-medium text-white bg-gold-600 rounded-lg hover:bg-gold-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50"
                >
                  {isBillingUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval/Rejection Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                  {status === "APPROVED" ? "Approve" : "Reject"} Membership
                  Application
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setMembershipSubCategoryId("");
                  }}
                  disabled={isSubmitting}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {status === "APPROVED"
                    ? "Please provide your approval comments for this membership application."
                    : "Please explain why you are rejecting this membership application."}
                </p>

                {/* Optional Sub-Category selector (only on first approval and when approving) */}
                {status === "APPROVED" && approvals.length === 0 && !membership?.expiryUpdated && (
                  <div className="mb-4">
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Assign Sub-Category (optional)
                    </label>
                    <select
                      value={membershipSubCategoryId}
                      onChange={(e) =>
                        setMembershipSubCategoryId(e.target.value ? Number(e.target.value) : "")
                      }
                      disabled={isSubmitting}
                      className="block w-full p-2.5 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                    >
                      <option value="">Keep current</option>
                      {availableSubCategories.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      This option is available only for the first approval.
                    </p>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="comment"
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                  >
                    Comments <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="comment"
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    disabled={isSubmitting}
                    className="block w-full p-2.5 text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gold-500 dark:focus:border-gold-500 disabled:opacity-75"
                    placeholder={
                      status === "APPROVED"
                        ? "Enter your approval comments..."
                        : "Enter your rejection reason..."
                    }
                  ></textarea>

                  <p
                    className={`mt-2 text-sm ${
                      comment.length < 10 ? "text-red-500" : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {comment.length < 10
                      ? "Please provide at least 10 characters"
                      : `${comment.length} characters entered`}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setMembershipSubCategoryId("");
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApproveReject(status!)}
                  disabled={comment.length < 10 || isSubmitting}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    status === "APPROVED"
                      ? "bg-green-600 hover:bg-green-700 focus:ring-green-500"
                      : "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                  } ${comment.length < 10 || isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </div>
                  ) : (
                    `${status === "APPROVED" ? "Approve" : "Reject"} Application`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
