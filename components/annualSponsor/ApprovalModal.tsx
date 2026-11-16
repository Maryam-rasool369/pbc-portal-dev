import React, { useState, useEffect } from "react";
import { Modal, Button, Label, Textarea, Badge, Spinner } from "flowbite-react";
import { toast } from "react-toastify";
import {
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiExternalLink,
  HiUser,
} from "react-icons/hi";
import {
  AnnualSponsor,
  ApprovalHistory,
  approveRejectAnnualSponsor,
  getAnnualSponsorById,
} from "@/services/annualSponsor";
import CurrencyAmount from "@/components/ui/CurrencyAmount";

interface ApprovalModalProps {
  showModal: boolean;
  setShowModal: (value: boolean) => void;
  sponsor: AnnualSponsor | null;
  token: string;
  onSuccess: () => void;
}

export default function ApprovalModal({
  showModal,
  setShowModal,
  sponsor: initialSponsor,
  token,
  onSuccess,
}: ApprovalModalProps) {
  const [sponsor, setSponsor] = useState<AnnualSponsor | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistory[]>([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  useEffect(() => {
    if (showModal && initialSponsor) {
      fetchSponsorDetails();
    }
  }, [showModal, initialSponsor]);

  const fetchSponsorDetails = async () => {
    if (!initialSponsor || !token) return;

    setFetchingDetails(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/annual-sponsors/${initialSponsor.id}`,
        {
          headers: {
            "Content-Type": "application/json",
            token,
          },
        }
      );

      const data = await response.json();
      if (data.data) {
        setSponsor(data.data);
        setApprovalHistory(data.data.AnnualSponsorshipApproval || []);
      }
    } catch (error) {
      toast.error("Failed to fetch sponsor details");
    } finally {
      setFetchingDetails(false);
    }
  };

  const handleApproval = async (status: "APPROVED" | "REJECTED") => {
    if (!sponsor) return;

    setLoading(true);
    try {
      await approveRejectAnnualSponsor(
        token,
        sponsor.id,
        status,
        comment.trim() || undefined
      );
      toast.success(
        `Sponsor ${status === "APPROVED" ? "approved" : "rejected"} successfully!`
      );
      setShowModal(false);
      setComment("");
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${status === "APPROVED" ? "approve" : "reject"} sponsor`
      );
    } finally {
      setLoading(false);
    }
  };

  const getApprovalStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge color="success" icon={HiCheckCircle as any}>
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge color="failure" icon={HiXCircle as any}>
            Rejected
          </Badge>
        );
      case "PENDING":
        return (
          <Badge color="warning" icon={HiClock as any}>
            Pending
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge color="success" icon={HiCheckCircle as any}>
            Paid
          </Badge>
        );
      case "PENDING":
        return (
          <Badge color="warning" icon={HiClock as any}>
            Pending Payment
          </Badge>
        );
      case "FAILED":
        return (
          <Badge color="failure" icon={HiXCircle as any}>
            Failed
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (!sponsor) return null;

  return (
    <Modal show={showModal} onClose={() => setShowModal(false)} size="4xl">
      <Modal.Header>Annual Sponsor Approval</Modal.Header>
      <Modal.Body className="max-h-[calc(100vh-200px)] overflow-y-auto">
        {fetchingDetails ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="xl" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Sponsor Details */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {sponsor.brandName}
                  </h3>
                  <div className="flex gap-2">
                    {getApprovalStatusBadge(sponsor.approvalStatus)}
                    {getPaymentStatusBadge(sponsor.status)}
                  </div>
                </div>
                {sponsor.brandLogo && (
                  <img
                    src={sponsor.brandLogo}
                    alt={sponsor.brandName}
                    className="h-20 w-20 object-contain rounded-lg bg-white p-2"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Submitted By
                    </p>
                    <p className="text-gray-900 dark:text-white">
                      {sponsor.user.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {sponsor.user.email}
                    </p>
                  </div>

                  {sponsor.brandDescription && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Description
                      </p>
                      <p className="text-gray-900 dark:text-white">
                        {sponsor.brandDescription}
                      </p>
                    </div>
                  )}

                  {sponsor.brandWebsite && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Website
                      </p>
                      <a
                        href={sponsor.brandWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                      >
                        {sponsor.brandWebsite}
                        {/* @ts-ignore */}
                        <HiExternalLink className="ml-1 h-4 w-4" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Package
                    </p>
                    <p className="text-gray-900 dark:text-white font-semibold">
                      {sponsor.package.name}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      <CurrencyAmount amount={sponsor.package.price} /> / Year
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Submitted On
                    </p>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(sponsor.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {sponsor.expiresAt && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Expires On
                      </p>
                      <p className="text-gray-900 dark:text-white">
                        {new Date(sponsor.expiresAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Approval History */}
            {approvalHistory.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Approval History
                </h4>
                <div className="space-y-3">
                  {approvalHistory.map((history, index) => (
                    <div
                      key={history.id || index}
                      className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {/* @ts-ignore */}
                          <HiUser className="h-5 w-5 text-gray-500" />
                          <span className="font-medium text-gray-900 dark:text-white">
                            {history.user?.name || "Unknown"}
                          </span>
                          {/* Role name */}
                          {history.user?.Role && (
                            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                              {history.user.Role.name}
                            </span>
                          )}
                        </div>
                        {getApprovalStatusBadge(history.status)}
                      </div>
                      {history.comment && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {history.comment}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        {new Date(history.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comment Section */}
            {sponsor.approvalStatus === "PENDING" && (
              <div>
                <div className="mb-2 block">
                  <Label htmlFor="comment" value="Comment (Optional)" />
                </div>
                <Textarea
                  id="comment"
                  placeholder="Add a comment about your decision..."
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </Modal.Body>
      {sponsor.approvalStatus === "PENDING" && !fetchingDetails && (
        <Modal.Footer>
          <div className="flex justify-end gap-3 w-full">
            <Button
              color="failure"
              onClick={() => handleApproval("REJECTED")}
              disabled={loading}
            >
              {/* @ts-ignore */}
              <HiXCircle className="mr-2 h-5 w-5" />
              {loading ? "Processing..." : "Reject"}
            </Button>
            <Button
              color="success"
              onClick={() => handleApproval("APPROVED")}
              disabled={loading}
            >
              {/* @ts-ignore */}
              <HiCheckCircle className="mr-2 h-5 w-5" />
              {loading ? "Processing..." : "Approve"}
            </Button>
          </div>
        </Modal.Footer>
      )}
    </Modal>
  );
}
