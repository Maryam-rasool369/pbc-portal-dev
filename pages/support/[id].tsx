"use client";

import useAuthStore from "@/store/authStore";
import Can from "@/components/rbac/Can";
import Image from "next/image";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Button, Modal, Select, Textarea } from "flowbite-react";
import {
  HiOutlineClock,
  HiUserCircle,
  HiReply,
  HiArrowLeft,
} from "react-icons/hi";
import { useLoadingStore } from "@/store/useLoadingStore";
import { toast } from "react-toastify";
import { useAbility } from "@/hooks/useAbility";
import { Roles } from "@/enums/Roles";
import { GeneralResponse } from "@/types/global";
import { formatStatus } from "@/utils/formatStatus";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import { buildResponseThreads } from "@/utils/buildResponseThreads";

interface User {
  id: number;
  name: string;
  role: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  datePlanned?: string;
  createdAt: string;
  category: {
    name: string;
  };
  user: User;
  userId: number;
  responses: GeneralResponse[];
  primaryImage?: string;
  secondaryImage?: string;
  tertiaryImage?: string;
}
export default function TicketDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [responseInputs, setResponseInputs] = useState<Record<string, string>>({});
  const [responseErrors, setResponseErrors] = useState<Record<string, string>>({});
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setGlobalLoading = useLoadingStore((state) => state.setLoading);
  const globalLoading = useLoadingStore((state) => state.isLoading);
  const [loading, setLoading] = useState(true);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openStatusModal, setOpenStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<
    "OPEN" | "IN_PROGRESS" | "CLOSED"
  >("OPEN");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null);
  const [deletingResponse, setDeletingResponse] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    datePlanned: "",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  });
  const ability = useAbility();

  const fetchTicket = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ticket/${id}`,
        {
          headers: { token: `${token}` },
        },
      );

      if (!res.ok) {
        throw new Error("Failed to fetch ticket details");
      }

      const { data } = await res.json();

      if (!data) {
        toast.error("Ticket not found");
        setTicket(null);
        setLoading(false);
        return;
      }

      if (
        (user?.Role?.name === Roles.INDIVIDUAL ||
          user?.Role?.name === Roles.CORPORATE) &&
        data.userId !== user.id
      ) {
        toast.error("You do not have permission to view this ticket");
        setTicket(null);
        setLoading(false);
        router.push("/support");
        return;
      }

      const transformedTicket: Ticket = {
        ...data,
        category: data.category,
        user: data.user,
        responses: data.responses.map((res: any) => ({
          id: res.id,
          userId: res.userId,
          threadUserId: res.threadUserId,
          response: res.response,
          createdAt: res.createdAt,
          user: res.user,
        })),
      };

      setTicket(transformedTicket);
      setSelectedStatus(transformedTicket.status);
      setEditFormData({
        title: transformedTicket.title,
        description: transformedTicket.description,
        priority: transformedTicket.priority,
        datePlanned: transformedTicket.datePlanned ? transformedTicket.datePlanned.split("T")[0] : "",
      });
    } catch (error) {
      console.error("Failed to fetch ticket:", error);
      toast.error("Failed to fetch ticket details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id && token) {
      fetchTicket();
    }
  }, [id, token]);

  const canRespond =
    ability?.can("create", "TicketResponse") && ticket?.status !== "CLOSED";

  const handleEditSubmit = async () => {
    if (!id || !ticket) return;

    if (!editFormData.title.trim()) {
      toast.error("Please enter a ticket title");
      return;
    }

    if (!editFormData.description.trim()) {
      toast.error("Please enter a ticket description");
      return;
    }

    try {
      setGlobalLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ticket/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            token: `${token}`,
          },
          body: JSON.stringify(editFormData),
        },
      );

      const data = await res.json();

      if (res.ok) {
        toast.success("Ticket updated successfully");
        setOpenEditModal(false);
        fetchTicket();
      } else {
        toast.error(data.error?.[0]?.msg || "Failed to update ticket");
      }
    } catch (error) {
      console.error("Failed to update ticket:", error);
      toast.error("Failed to update ticket");
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleReplySubmit = async (inputKey: string, threadUserId?: number) => {
    if (!id) return;

    const reply = (responseInputs[inputKey] ?? "").trim();

    if (!reply) {
      setResponseErrors((prev) => ({
        ...prev,
        [inputKey]: "Reply cannot be empty",
      }));
      return;
    }

    if (reply.length < 1) {
      setResponseErrors((prev) => ({
        ...prev,
        [inputKey]: "Reply must be at least 1 character long",
      }));
      return;
    }

    try {
      setGlobalLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/response/ticket`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: `${token}`,
          },
          body: JSON.stringify({
            ticketId: id,
            response: reply,
            ...(threadUserId ? { threadUserId } : {}),
          }),
        },
      );

      const data = await res.json();

      if (res.ok) {
        toast.success("Reply added successfully");
        setResponseInputs((prev) => ({ ...prev, [inputKey]: "" }));
        setResponseErrors((prev) => ({ ...prev, [inputKey]: "" }));
        fetchTicket();
      } else {
        toast.error(data.error?.[0]?.msg || "Failed to add reply");
      }
    } catch (error: any) {
      console.error("Failed to submit reply:", error);
      toast.error("Failed to submit reply");
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleDeleteResponse = async (responseId: string) => {
    try {
      setDeletingResponse(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/response/${responseId}`,
        {
          method: "DELETE",
          headers: { token: `${token}` },
        },
      );

      if (res.ok) {
        toast.success("Response deleted successfully");
        fetchTicket();
      } else {
        toast.error("Failed to delete response");
      }
    } catch (error) {
      console.error("Failed to delete response:", error);
      toast.error("Failed to delete response");
    } finally {
      setDeletingResponse(false);
      setShowDeleteModal(false);
      setResponseToDelete(null);
    }
  };

  const handleStatusChange = async () => {
    if (!id) return;

    try {
      setGlobalLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ticket/status/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            token: `${token}`,
          },
          body: JSON.stringify({ status: selectedStatus }),
        },
      );

      const data = await res.json();

      if (res.ok) {
        toast.success("Ticket status updated successfully");
        setOpenStatusModal(false);
        fetchTicket();
      } else {
        toast.error(data.error?.[0]?.msg || "Failed to update ticket status");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update ticket status");
    } finally {
      setGlobalLoading(false);
    }
  };

  const getStatusBadgeClass = (status: "OPEN" | "IN_PROGRESS" | "CLOSED") => {
    switch (status) {
      case "OPEN":
        return "bg-yellow-500/20 text-yellow-500";
      case "IN_PROGRESS":
        return "bg-blue-500/20 text-blue-500";
      case "CLOSED":
        return "bg-green-500/20 text-green-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };
  const isOwner = Boolean(ticket && Number(user?.id) === Number(ticket.userId));
  const responseThreads = useMemo(
    () => buildResponseThreads(ticket?.responses || [], Number(ticket?.userId || 0)),
    [ticket?.responses, ticket?.userId],
  );
  const visibleThreads = isOwner
    ? responseThreads.threads
    : responseThreads.threads.filter(
        (thread) => thread.threadUserId === Number(user?.id),
      );
  const canStartThread = Boolean(canRespond && !isOwner && visibleThreads.length === 0);
  if (!ticket)
    return (
      <div className="p-4 text-gold-600 text-center">Loading ticket...</div>
    );

  const getPriorityBadgeClass = (
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  ) => {
    switch (priority) {
      case "LOW":
        return "bg-green-500/20 text-green-500";
      case "MEDIUM":
        return "bg-yellow-500/20 text-yellow-500";
      case "HIGH":
        return "bg-orange-500/20 text-orange-500";
      case "URGENT":
        return "bg-red-500/20 text-red-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.push("/support")}
          className="mr-4 text-gray-400 hover:text-white flex items-center"
        >
          {/* @ts-ignore */}
          <HiArrowLeft className="h-5 w-5 mr-1" />
          Back to Tickets
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      ) : ticket ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden shadow-lg">
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2 md:mb-0">
                #{ticket.id} - {ticket.title}
              </h1>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeClass(
                    ticket.status,
                  )}`}
                >
                  {formatStatus(ticket.status || "")}
                </span>

                <span
                  className={`px-3 py-1 text-sm font-semibold rounded-full ${getPriorityBadgeClass(
                    ticket.priority,
                  )}`}
                >
                  {ticket.priority}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gold-500 mb-2">
                  Details
                </h2>
                <div className="bg-gray-800 p-4 rounded-md">
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {ticket.description}
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gold-500 mb-2">
                  Information
                </h2>
                <div className="bg-gray-800 p-4 rounded-md">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <p className="text-sm text-gray-400">Created By</p>
                      <p className="text-white">{ticket.user.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Category</p>
                      <p className="text-white">{ticket.category.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Date Planned</p>
                      <p className="text-white">
                        {ticket.datePlanned
                          ? formatDateAndTime(ticket.datePlanned, true, true)
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Created At</p>
                      <p className="text-white">
                        {formatDateAndTime(ticket.createdAt, true, true)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Images */}
            {[
              ticket.primaryImage,
              ticket.secondaryImage,
              ticket.tertiaryImage,
            ].filter(Boolean).length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gold-500 mb-2">
                  Attachments
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    ticket.primaryImage,
                    ticket.secondaryImage,
                    ticket.tertiaryImage,
                  ].map(
                    (img, index) =>
                      img && (
                        <div
                          key={index}
                          className="relative aspect-video w-full h-48 overflow-hidden rounded-lg"
                        >
                          <img
                            src={img}
                            alt={`Attachment ${index + 1}`}
                            className="object-cover rounded-lg"
                          />
                          <a
                            href={img}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded"
                          >
                            View Full
                          </a>
                        </div>
                      ),
                  )}
                </div>
              </div>
            )}

            <Can I="update" a="Ticket">
              <div className="flex flex-wrap gap-3 justify-end">
                {ticket.userId === Number(user?.id) &&
                  ticket.status === "OPEN" && (
                    <button
                      onClick={() => setOpenEditModal(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                      Edit Ticket
                    </button>
                  )}

                {user?.Role?.name !== Roles.INDIVIDUAL &&
                  user?.Role?.name !== Roles.CORPORATE &&
                  ticket.status !== "CLOSED" && (
                    <button
                      onClick={() => setOpenStatusModal(true)}
                      className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors"
                    >
                      Update Status
                    </button>
                  )}
              </div>
            </Can>
          </div>

          {/* Responses Section */}
          <div className="border-t border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-gold-500 mb-4">
              Responses
            </h2>

            {visibleThreads.length === 0 ? (
              <p className="text-gray-400 italic">
                {isOwner
                  ? "No conversations yet. Staff can start a thread here."
                  : "No responses yet. Start the discussion by adding a comment."}
              </p>
            ) : (
              <div className="space-y-6">
                {visibleThreads.map((thread) => {
                  const threadKey = String(thread.threadUserId);
                  const threadInput = responseInputs[threadKey] ?? "";
                  const threadError = responseErrors[threadKey];
                  const threadLabel =
                    thread.threadUser?.name || `User #${thread.threadUserId}`;

                  return (
                    <div key={thread.threadUserId} className="bg-gray-800 rounded-lg p-4">
                      <div className="mb-4">
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                          Conversation with
                        </p>
                        <p className="text-base font-semibold text-white">
                          {threadLabel}
                        </p>
                      </div>

                      <div className="space-y-4">
                        {thread.responses.map((response) => (
                          <div
                            key={response.id}
                            className="bg-gray-900 rounded-lg p-4 hover:bg-gray-750 transition-colors group"
                          >
                            <div className="flex items-start">
                              <div className="mr-3 mt-1">
                                {/* @ts-ignore */}
                                <HiUserCircle className="h-8 w-8 text-gray-400" />
                              </div>
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span className="font-medium text-white">
                                    {Number(response.user.id) === Number(user?.id)
                                      ? "You"
                                      : response.user.name}
                                  </span>
                                  {response?.user?.Role && (
                                    <span className="bg-purple-500/20 text-purple-400 text-xs font-medium px-2 py-0.5 rounded">
                                      {response.user.Role.name}
                                    </span>
                                  )}
                                  <span className="text-gray-400 text-xs">
                                    {formatDateAndTime(response.createdAt, true, true)}
                                  </span>

                                  {user &&
                                    ticket.status !== "CLOSED" &&
                                    response.user.id === Number(user.id) && (
                                      <button
                                        onClick={() => {
                                          setResponseToDelete(response.id);
                                          setShowDeleteModal(true);
                                        }}
                                        className="text-red-400 hover:text-red-300 text-sm ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        Delete
                                      </button>
                                    )}
                                </div>
                                <p className="text-gray-300 whitespace-pre-wrap">
                                  {response.response}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {canRespond && (
                        <div className="mt-6 bg-gray-900 rounded-lg p-4">
                          <h3 className="font-medium text-gold-500 mb-3">
                            Reply in this thread
                          </h3>
                          <div className="flex">
                            <div className="mr-3 mt-1">
                              {/* @ts-ignore */}
                              <HiUserCircle className="h-8 w-8 text-gray-400" />
                            </div>
                            <div className="flex-1">
                              <Textarea
                                value={threadInput}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setResponseInputs((prev) => ({
                                    ...prev,
                                    [threadKey]: value,
                                  }));
                                  if (value.trim().length >= 1) {
                                    setResponseErrors((prev) => ({
                                      ...prev,
                                      [threadKey]: "",
                                    }));
                                  }
                                }}
                                placeholder="Type your reply..."
                                rows={3}
                                className={`bg-gray-700 border ${
                                  threadError ? "border-red-500" : "border-gray-600"
                                } text-white w-full rounded-lg p-3`}
                              />
                              {threadError && (
                                <p className="text-red-500 text-sm mt-1">{threadError}</p>
                              )}
                              <div className="mt-3 flex justify-end">
                                <Button
                                  onClick={() =>
                                    handleReplySubmit(
                                      threadKey,
                                      isOwner ? thread.threadUserId : undefined,
                                    )
                                  }
                                  className="bg-gold-500 hover:bg-gold-600 text-black flex items-center"
                                >
                                  Post Reply
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reply form */}
            {canStartThread && (
              <div className="mt-8 bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium text-gold-500 mb-3">
                  Start a new thread
                </h3>
                <div className="flex">
                  <div className="mr-3 mt-1">
                    {/* @ts-ignore */}
                    <HiUserCircle className="h-8 w-8 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <Textarea
                      value={responseInputs[String(user?.id ?? "new")] || ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        const inputKey = String(user?.id ?? "new");
                        setResponseInputs((prev) => ({
                          ...prev,
                          [inputKey]: value,
                        }));
                        if (value.trim().length >= 1) {
                          setResponseErrors((prev) => ({
                            ...prev,
                            [inputKey]: "",
                          }));
                        }
                      }}
                      placeholder="Type your reply..."
                      rows={3}
                      className={`bg-gray-700 border ${
                        responseErrors[String(user?.id ?? "new")]
                          ? "border-red-500"
                          : "border-gray-600"
                      } text-white w-full rounded-lg p-3`}
                    />

                    {responseErrors[String(user?.id ?? "new")] && (
                      <p className="text-red-500 text-sm mt-1">
                        {responseErrors[String(user?.id ?? "new")]}
                      </p>
                    )}

                    <div className="mt-3 flex justify-end">
                      <Button
                        onClick={() =>
                          handleReplySubmit(String(user?.id ?? "new"))
                        }
                        className="bg-gold-500 hover:bg-gold-600 text-black flex items-center"
                      >
                        Post Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">
            Ticket not found or you don&apos;t have permission to view it.
          </p>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        show={openEditModal}
        onClose={() => !globalLoading && setOpenEditModal(false)}
        size="md"
        dismissible={!globalLoading}
      >
        <Modal.Header className="bg-gray-800 border-b border-gray-700">
          <span className="text-gold-500">Edit Ticket</span>
        </Modal.Header>
        <Modal.Body className="bg-gray-800 p-6 overflow-y-auto max-h-[calc(90vh-10rem)]">
          <div className="space-y-6">
            <div>
              <label
                htmlFor="ticket-title"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Title
              </label>
              <input
                type="text"
                id="ticket-title"
                placeholder="Ticket title"
                required
                value={editFormData.title}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, title: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-gold-500 focus:border-gold-500 disabled:opacity-50"
                disabled={globalLoading}
              />
            </div>
            <div>
              <label
                htmlFor="ticket-date"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Date
              </label>
              <input
                type="date"
                id="ticket-date"
                value={editFormData.datePlanned}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    datePlanned: e.target.value,
                  })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-gold-500 focus:border-gold-500 disabled:opacity-50"
                disabled={globalLoading}
              />
            </div>
            <div>
              <label
                htmlFor="ticket-description"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Description
              </label>
              <textarea
                id="ticket-description"
                placeholder="Ticket description"
                rows={4}
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    description: e.target.value,
                  })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-gold-500 focus:border-gold-500 disabled:opacity-50"
                disabled={globalLoading}
              />
            </div>

            <div>
              <label
                htmlFor="priority-select"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Priority
              </label>
              <select
                id="priority-select"
                value={editFormData.priority}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    priority: e.target.value as any,
                  })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-gold-500 focus:border-gold-500 disabled:opacity-50"
                disabled={globalLoading}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-gray-800 border-t border-gray-700">
          <Button
            onClick={handleEditSubmit}
            className="bg-gold-500 hover:bg-gold-600 text-black disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={globalLoading}
          >
            {globalLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-black/20 border-t-black animate-spin rounded-full" />
                Saving...
              </div>
            ) : (
              "Save Changes"
            )}
          </Button>
          <Button 
            color="gray" 
            onClick={() => setOpenEditModal(false)}
            disabled={globalLoading}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Status Modal */}
      <Modal
        show={openStatusModal}
        onClose={() => !globalLoading && setOpenStatusModal(false)}
        size="md"
        dismissible={!globalLoading}
      >
        <Modal.Header className="bg-gray-800 border-b border-gray-700">
          <span className="text-gold-500">Update Ticket Status</span>
        </Modal.Header>
        <Modal.Body className="bg-gray-800 p-6 overflow-y-auto max-h-[calc(90vh-10rem)]">
          <div>
            <label
              htmlFor="status-select"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Status
            </label>
            <Select
              id="status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="bg-gray-700 border-gray-600 text-white disabled:opacity-50"
              disabled={globalLoading}
            >
              {ticket.status !== "IN_PROGRESS" && (
                <option value="OPEN">Open</option>
              )}
              <option value="IN_PROGRESS">In Progress</option>
              {ticket.status !== "OPEN" && (
                <option value="CLOSED">Close</option>
              )}
            </Select>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-gray-800 border-t border-gray-700">
          <Button
            onClick={handleStatusChange}
            className="bg-gold-500 hover:bg-gold-600 text-black disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={globalLoading}
          >
            {globalLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-black/20 border-t-black animate-spin rounded-full" />
                Updating...
              </div>
            ) : (
              "Update Status"
            )}
          </Button>
          <Button 
            color="gray" 
            onClick={() => setOpenStatusModal(false)}
            disabled={globalLoading}
          >
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmationModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setResponseToDelete(null);
        }}
        onConfirm={() => {
          if (responseToDelete) {
            handleDeleteResponse(responseToDelete);
          }
        }}
        title="Delete Response"
        message="Are you sure you want to delete this response? This action cannot be undone."
        confirmText="Delete"
        confirmColor="red"
        isProcessing={deletingResponse}
      />
    </div>
  );
}
