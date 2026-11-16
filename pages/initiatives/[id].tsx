"use client";

import Can from "@/components/rbac/Can";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import UpdateInitiativeStatusModal from "@/components/initiatives/updateInitiativeStatusModal";
import * as initiativeService from "@/services/initiative";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Button, Modal, TextInput, Textarea } from "flowbite-react";
import {
  HiArrowLeft,
  HiUserCircle,
  HiOutlineExclamationCircle,
} from "react-icons/hi";
import useAuthStore from "@/store/authStore";
import { useLoadingStore } from "@/store/useLoadingStore";
import { toast } from "react-toastify";
import { Roles } from "@/enums/Roles";
import { useAbility } from "@/hooks/useAbility";
import { formatStatus } from "@/utils/formatStatus";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import { GeneralResponse } from "@/types/global";
import { buildResponseThreads } from "@/utils/buildResponseThreads";

interface User {
  id: number;
  name: string;
  Role?: {
    id: number;
    name: string;
  };
}

interface Initiative {
  id: number;
  title: string;
  description: string;
  status: "PLANNED" | "ON_GOING" | "FINISHED" | "ABORTED";
  datePlanned?: string;
  createdAt: string;
  updatedAt: string;
  user: User;
  userId: number;
  responses: GeneralResponse[];
  assignees?: User[];
}

export default function InitiativeDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [initiative, setInitiative] = useState<Initiative | null>(null);
  const [responseInputs, setResponseInputs] = useState<Record<string, string>>({});
  const [responseErrors, setResponseErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [openStatusModal, setOpenStatusModal] = useState(false);
  const [showDeleteInitiativeModal, setShowDeleteInitiativeModal] =
    useState(false);
  const [showDeleteResponseModal, setShowDeleteResponseModal] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<number | null>(null);
  const [deletingInitiative, setDeletingInitiative] = useState(false);
  const [deletingResponse, setDeletingResponse] = useState(false);
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<
    "PLANNED" | "ON_GOING" | "FINISHED" | "ABORTED"
  >("PLANNED");
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    date: "",
    assigneeId: "",
  });

  const ability = useAbility();

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setGlobalLoading = useLoadingStore((state) => state.setLoading);
  const MemberRoles = [Roles.CORPORATE, Roles.INDIVIDUAL];

  const fetchInitiative = async () => {
    if (!id || !token) return;
    setLoading(true);
    try {
      const data = await initiativeService.fetchInitiativeById(token || "", id);
      setInitiative(data);
      setSelectedStatus(data.status);
      setEditFormData({
        title: data.title,
        description: data.description,
        date: data.datePlanned ? data.datePlanned.split("T")[0] : "",
        assigneeId: data.assignees?.[0]?.id ? String(data.assignees[0].id) : "",
      });
    } catch (error: any) {
      console.error("Failed to fetch initiative:", error);
      toast.error(error?.message || "Failed to fetch initiative details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id || !token) return;

    if (token && !ability?.can("read", "Initiative")) {
      toast.error("You are not authorized to access this page. Routing you back to the homepage");
      router.push("/userMarketplace");
      return;
    }

    fetchInitiative();
  }, [id, token]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!token || !openEditModal) return;
      try {
        setLoadingUsers(true);
        const data = await initiativeService.fetchAllUsers(token);
        setUsers(data);
      } catch (error: any) {
        console.error("Failed to fetch users:", error);
        toast.error(error?.message || "Failed to fetch users");
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [openEditModal, token]);

  const handleEditSubmit = async () => {
    if (!id || !initiative || !token) return;
    if (!editFormData.title.trim() || !editFormData.description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const selectedAssigneeId = editFormData.assigneeId
      ? Number(editFormData.assigneeId)
      : null;
    const currentAssigneeId = initiative.assignees?.[0]?.id || null;

    try {
      setGlobalLoading(true);
      await initiativeService.updateInitiative(
        token || "",
        id,
        {
          title: editFormData.title,
          description: editFormData.description,
          ...(editFormData.date.trim() && { date: editFormData.date }),
        }
      );

      if (selectedAssigneeId !== currentAssigneeId) {
        await initiativeService.updateInitiativeAssignees(
          token || "",
          id,
          selectedAssigneeId ? [selectedAssigneeId] : [],
        );
      }

      toast.success("Initiative updated successfully");
      setOpenEditModal(false);
      fetchInitiative();
    } catch (error: any) {
      console.error("Failed to update initiative:", error);
      toast.error(error?.message || "Failed to update initiative");
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleStatusChange = async (
    newStatus: "PLANNED" | "ON_GOING" | "FINISHED" | "ABORTED"
  ) => {
    if (!id || !token) return;

    if (initiative?.status === "ON_GOING" && newStatus === "PLANNED") {
      toast.error("Cannot change status back to Planned once it's On Going");
      return;
    }

    if (
      (initiative?.status === "FINISHED" || initiative?.status === "ABORTED") &&
      (newStatus === "PLANNED" || newStatus === "ON_GOING")
    ) {
      toast.error("Cannot change status of a Finished or Aborted initiative");
      return;
    }

    try {
      setGlobalLoading(true);
      const res = await initiativeService.updateInitiativeStatus(
        token || "",
        id,
        newStatus
      );
      toast.success(res.message || "Status updated successfully");
      setOpenStatusModal(false);
      fetchInitiative();
    } catch (error: any) {
      console.error("Failed to update status:", error);
      toast.error(error?.message || "Failed to update status");
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleReplySubmit = async (inputKey: string, threadUserId?: number) => {
    if (!id || !token) return;
    const reply = (responseInputs[inputKey] ?? "").trim();

    if (!reply || reply.length < 1) {
      setResponseErrors((prev) => ({
        ...prev,
        [inputKey]: "Reply must be at least 1 character long",
      }));
      return;
    }

    try {
      setGlobalLoading(true);
      const res = await initiativeService.addInitiativeResponse(
        token || "",
        id,
        reply,
        threadUserId,
      );
      toast.success(res.message || "Response added successfully");
      setResponseInputs((prev) => ({ ...prev, [inputKey]: "" }));
      setResponseErrors((prev) => ({ ...prev, [inputKey]: "" }));
      fetchInitiative();
    } catch (error: any) {
      console.error("Failed to submit response:", error);
      toast.error(error?.message || "Failed to submit response");
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleDeleteInitiative = async () => {
    if (!id || !token) return;

    try {
      setDeletingInitiative(true);
      const res = await initiativeService.deleteInitiative(token || "", id);
      toast.success(res.message || "Initiative deleted successfully");
      router.push("/initiatives");
    } catch (error: any) {
      console.error("Failed to delete initiative:", error);
      toast.error(error?.message || "Failed to delete initiative");
    } finally {
      setDeletingInitiative(false);
      setShowDeleteInitiativeModal(false);
    }
  };

  const handleDeleteResponse = async (responseId: number) => {
    if (!id || !token) return;

    try {
      setDeletingResponse(true);
      const res = await initiativeService.deleteInitiativeResponse(
        token || "",
        id,
        responseId,
      );
      toast.success(res.message || "Response deleted successfully");
      fetchInitiative();
    } catch (error: any) {
      console.error("Failed to delete response:", error);
      toast.error(error?.message || "Failed to delete response");
    } finally {
      setDeletingResponse(false);
      setShowDeleteResponseModal(false);
      setResponseToDelete(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "PLANNED":
        return "bg-blue-500/20 text-blue-500";
      case "ON_GOING":
        return "bg-yellow-500/20 text-yellow-500";
      case "FINISHED":
        return "bg-green-500/20 text-green-500";
      case "ABORTED":
        return "bg-red-500/20 text-red-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  const canEdit =
    initiative?.status !== "FINISHED" && initiative?.status !== "ABORTED";
  const canManageInitiative =
    Boolean(user && initiative && initiative.userId === Number(user.id));
  const isOwner = canManageInitiative;
  const canRespond =
    Boolean(
      initiative &&
        initiative.status !== "FINISHED" &&
        initiative.status !== "ABORTED",
    );
  const responseThreads = useMemo(
    () => buildResponseThreads(initiative?.responses || [], initiative?.userId || 0),
    [initiative?.responses, initiative?.userId],
  );
  const visibleThreads = isOwner
    ? responseThreads.threads
    : responseThreads.threads.filter(
        (thread) => thread.threadUserId === Number(user?.id),
      );
  const canStartThread = canRespond && !isOwner && visibleThreads.length === 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (!initiative) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.push("/initiatives")}
            className="mr-4 text-gray-400 hover:text-white flex items-center"
          >
            {/* @ts-ignore */}
            <HiArrowLeft className="h-5 w-5 mr-1" />
            Back to Initiatives
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-lg p-12 text-center">
          {/* @ts-ignore */}
          <HiOutlineExclamationCircle className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-white mb-2">
            Initiative Not Found
          </h3>
          <p className="text-gray-400 mb-6">
            The initiative you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have permission to view it.
          </p>
          <Button
            onClick={() => router.push("/initiatives")}
            className="bg-gold-500 hover:bg-gold-600 text-black inline-flex items-center"
          >
            {/* @ts-ignore */}
            <HiArrowLeft className="mr-2 h-4 w-4" />
            Return to Initiatives
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      {initiative && (
        <UpdateInitiativeStatusModal
          open={openStatusModal}
          onClose={() => setOpenStatusModal(false)}
          onSubmit={handleStatusChange}
          currentStatus={initiative.status}
          initiativeId={initiative.id}
        />
      )}

      <div className="flex items-center mb-6">
        <button
          onClick={() => router.push("/initiatives")}
          className="mr-4 text-gray-400 hover:text-white flex items-center"
        >
          {/* @ts-ignore */}
          <HiArrowLeft className="h-5 w-5 mr-1" />
          Back to Initiatives
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden shadow-lg">
        <div className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2 md:mb-0">
              {initiative.title}
            </h1>
            <span
              className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeClass(initiative.status)}`}
            >
              {formatStatus(initiative.status || "")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gold-500 mb-2">
                Description
              </h2>
              <div className="bg-gray-800 p-4 rounded-md">
                <p className="text-gray-300 whitespace-pre-wrap">
                  {initiative.description}
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gold-500 mb-2">
                Information
              </h2>
              <div className="bg-gray-800 p-4 rounded-md">
                <div className="grid grid-cols-1 gap-3">
                  {/* <div>
                    <p className="text-sm text-gray-400">Initiated By</p>
                    <p className="text-white">{initiative.user.name}</p>
                  </div> */}
                  {/* <div>
                    <p className="text-sm text-gray-400">Initiated At</p>
                    <p className="text-white">
                      {formatDateAndTime(initiative.createdAt, true)}
                    </p>
                  </div> */}
                  <div>
                    <p className="text-sm text-gray-400">Initiated At</p>
                    <p className="text-white">
                      {initiative.datePlanned
                        ? formatDateAndTime(initiative.datePlanned, true)
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Last Modified At</p>
                    <p className="text-white">
                      {formatDateAndTime(initiative.updatedAt, true)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Initiative By</p>
                    {initiative.assignees && initiative.assignees.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-1 max-h-32 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                        {initiative.assignees.map((assignee) => (
                          <div
                            key={assignee.id}
                            className="bg-gray-700 px-3 py-1.5 rounded-md flex items-center gap-2"
                          >
                            <span className="text-white text-sm">
                              {assignee.name}
                            </span>
                            {assignee.Role && (
                              <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded">
                                {assignee.Role.name}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic text-sm">No assignees</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 justify-end">
            {canEdit && (
              <Can I="update" a="Initiative">
                {canManageInitiative && (
                  <>
                    <Button
                      onClick={() => setOpenEditModal(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Edit Initiative
                    </Button>
                    <Button
                      onClick={() => setOpenStatusModal(true)}
                      className="bg-gold-500 hover:bg-gold-600 text-black"
                    >
                      Update Status
                    </Button>
                  </>
                )}
              </Can>
            )}
            <Can I="delete" a="Initiative">
              {canManageInitiative && (
                <Button
                  onClick={() => setShowDeleteInitiativeModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete Initiative
                </Button>
              )}
            </Can>
          </div>
        </div>

        <Can I="create" a="Initiative">
          <div className="border-t border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-gold-500 mb-4">
              Responses
            </h2>

            {visibleThreads.length === 0 ? (
              <p className="text-gray-400 italic">
                {isOwner
                  ? "No conversations yet. Members can start a thread here."
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
                            className="bg-gray-900 rounded-lg p-4 group"
                          >
                            <div className="flex items-start">
                              {/* @ts-ignore */}
                              <HiUserCircle className="h-8 w-8 text-gray-400 mr-3" />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium text-white">
                                    {Number(response.user.id) === Number(user?.id)
                                      ? "You"
                                      : response.user.name}
                                  </span>
                                  {response.user.Role && (
                                    <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded">
                                      {response.user.Role.name}
                                    </span>
                                  )}
                                  <span className="text-gray-400 text-xs">
                                    {formatDateAndTime(response.createdAt, true)}
                                  </span>
                                  {(canManageInitiative ||
                                    Number(response.user.id) === Number(user?.id)) && (
                                      <button
                                        onClick={() => {
                                          setResponseToDelete(Number(response.id));
                                          setShowDeleteResponseModal(true);
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
                            {/* @ts-ignore */}
                            <HiUserCircle className="h-8 w-8 text-gray-400 mr-3" />
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
                                placeholder="Type your response..."
                                rows={3}
                                className={`bg-gray-700 border ${
                                  threadError ? "border-red-500" : "border-gray-600"
                                } text-white`}
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
                                  className="bg-gold-500 hover:bg-gold-600 text-black"
                                >
                                  Post Response
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

            {canStartThread && (
                <div className="mt-8 bg-gray-800 rounded-lg p-4">
                  <h3 className="font-medium text-gold-500 mb-3">
                    Start a new thread
                  </h3>
                  <div className="flex">
                    {/* @ts-ignore */}
                    <HiUserCircle className="h-8 w-8 text-gray-400 mr-3" />
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
                        placeholder="Type your response..."
                        rows={3}
                        className={`bg-gray-700 border ${
                          responseErrors[String(user?.id ?? "new")]
                            ? "border-red-500"
                            : "border-gray-600"
                        } text-white`}
                      />
                      {responseErrors[String(user?.id ?? "new")] && (
                        <p className="text-red-500 text-sm mt-1">
                          {responseErrors[String(user?.id ?? "new")]}
                        </p>
                      )}
                      <div className="mt-3 flex justify-end">
                        <Button
                          onClick={() => handleReplySubmit(String(user?.id ?? "new"))}
                          className="bg-gold-500 hover:bg-gold-600 text-black"
                        >
                          Post Response
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </Can>
      </div>

      <Modal 
        show={openEditModal} 
        onClose={() => setOpenEditModal(false)}
      >
        <Modal.Header className="bg-gray-800 border-b border-gray-700">
          Edit Initiative
        </Modal.Header>
        <Modal.Body className="bg-gray-800 overflow-y-auto max-h-[calc(90vh-10rem)]">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title
              </label>
              <input
                type="text"
                value={editFormData.title}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, title: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date
              </label>
              <TextInput
                type="date"
                value={editFormData.date}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, date: e.target.value })
                }
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Assignee
              </label>
              <select
                value={editFormData.assigneeId}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, assigneeId: e.target.value })
                }
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white"
              >
                <option value="">No assignee</option>
                {loadingUsers ? (
                  <option value="" disabled>
                    Loading users...
                  </option>
                ) : (
                  users.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    description: e.target.value,
                  })
                }
                rows={4}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white"
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-gray-800 border-t border-gray-700">
          <Button
            onClick={handleEditSubmit}
            className="bg-gold-500 hover:bg-gold-600 text-black"
          >
            Save Changes
          </Button>
          <Button color="gray" onClick={() => setOpenEditModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>

      <ConfirmationModal
        show={showDeleteInitiativeModal}
        onClose={() => setShowDeleteInitiativeModal(false)}
        onConfirm={handleDeleteInitiative}
        title="Delete Initiative"
        message="Are you sure you want to delete this initiative? This action cannot be undone."
        confirmText="Delete"
        confirmColor="red"
        isProcessing={deletingInitiative}
      />

      <ConfirmationModal
        show={showDeleteResponseModal}
        onClose={() => {
          setShowDeleteResponseModal(false);
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
