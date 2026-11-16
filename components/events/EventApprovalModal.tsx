import React, { useState, useEffect, useCallback } from "react";
import { Modal, Button, Label, Textarea, Badge, Spinner } from "flowbite-react";
import { toast } from "react-toastify";
import {
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiUser,
  HiCalendar,
} from "react-icons/hi";
import {
  Event,
  EventApprovalHistory,
  approveRejectEvent,
} from "@/services/events";
import useAuthStore from "@/store/authStore";
import { useAbility } from "@/hooks/useAbility";

interface EventApprovalModalProps {
  showModal: boolean;
  setShowModal: (value: boolean) => void;
  event: Event | null;
  token: string;
  onSuccess: () => void;
}

export default function EventApprovalModal({
  showModal,
  setShowModal,
  event: initialEvent,
  token,
  onSuccess,
}: EventApprovalModalProps) {
  const currentUser = useAuthStore((state) => state.user);
  const [event, setEvent] = useState<Event | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<EventApprovalHistory[]>([]);
  const [isCurrentUserApprover, setIsCurrentUserApprover] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const ability = useAbility();

  const fetchEventDetails = useCallback(async () => {
    if (!initialEvent || !token) return;

    setFetchingDetails(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/event/${initialEvent.id}`,
        {
          headers: {
            "Content-Type": "application/json",
            token,
          },
        }
      );

      const data = await response.json();
      if (data.data) {
        setEvent(data.data);
        const approvalEntries = data.data.EventCreationApproval || [];
        setApprovalHistory(approvalEntries);

        // Hide actions once the current user has already submitted a decision.
        const userAlreadyApprovedOrRejected = approvalEntries.some(
          (approval: EventApprovalHistory) =>
            String(approval.userId) === String(currentUser?.id)
        );
        setIsCurrentUserApprover(userAlreadyApprovedOrRejected || false);
      }
    } catch (error) {
      toast.error("Failed to fetch event details");
    } finally {
      setFetchingDetails(false);
    }
  }, [initialEvent, token, currentUser?.id]);

  useEffect(() => {
    if (showModal && initialEvent) {
      fetchEventDetails();
    }
  }, [showModal, initialEvent, fetchEventDetails]);

  const handleApproval = async (status: "APPROVED" | "REJECTED") => {
    if (!event) return;

    setLoading(true);
    try {
      await approveRejectEvent(
        token,
        event.id,
        status,
        comment.trim() || undefined
      );

      // Immediately prevent duplicate approvals in the same UI session.
      setIsCurrentUserApprover(true);
      setApprovalHistory((prev) => [
        {
          id: Date.now(),
          eventId: event.id,
          userId: Number(currentUser?.id),
          status,
          comment: comment.trim() || undefined,
          createdAt: new Date().toISOString(),
          user: currentUser
            ? {
                id: Number(currentUser.id),
                name: currentUser.name,
                email: currentUser.email,
                Role: currentUser.Role,
              }
            : undefined,
        },
        ...prev,
      ]);

      toast.success(
        `Event ${status === "APPROVED" ? "approved" : "rejected"} successfully!`
      );
      setShowModal(false);
      setComment("");
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${status === "APPROVED" ? "approve" : "reject"} event`
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
            Pending Approval
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const effectiveApprovalStatus = (
    event?.approvalStatus || initialEvent?.approvalStatus || ""
  ).toUpperCase();

  const canTakeAction =
    ability?.can("manage", "Event") &&
    !isCurrentUserApprover &&
    effectiveApprovalStatus === "PENDING" &&
    !fetchingDetails;

  if (!event) return null;

  return (
    <Modal show={showModal} onClose={() => setShowModal(false)} size="4xl">
      <Modal.Header>Event Approval</Modal.Header>
      <Modal.Body className="max-h-[calc(100vh-200px)] overflow-y-auto">
        {fetchingDetails ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="xl" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Event Details */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {event.title}
                  </h3>
                  <div className="flex gap-2 mb-4">
                    {getApprovalStatusBadge(event.approvalStatus)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 mt-6">
                {event.details && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Event Details
                    </p>
                    <div 
                      className="prose prose-sm dark:prose-invert max-w-none text-gray-900 dark:text-white"
                      dangerouslySetInnerHTML={{ __html: event.details }}
                    />
                  </div>
                )}

                {event.description && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Description
                    </p>
                    <p className="text-gray-900 dark:text-white">
                      {event.description}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                  {/* @ts-ignore */}
                  <HiCalendar className="h-5 w-5 text-gold-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Event Date
                    </p>
                    <p className="font-medium">
                      {event.startDate && event.endDate ? (
                        <>
                          {new Date(event.startDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {" - "}
                          {new Date(event.endDate).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </>
                      ) : event.date ? (
                        new Date(event.date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      ) : (
                        "Not specified"
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Created On
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    {new Date(event.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
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
            {canTakeAction && (
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
      {canTakeAction && (
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
