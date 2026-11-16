"use client";

import "react-toastify/dist/ReactToastify.css";
import useAuthStore from "@/store/authStore";
import UpdateTaskStatusModal from "@/components/tasks/updateTaskStatusModal";
import EditTaskModal from "@/components/tasks/editTaskModal";
import Can from "@/components/rbac/Can";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import {
  getTaskById,
  updateTaskStatus,
  updateTaskDetails,
  deleteTaskImage,
} from "@/services/tasks";
import { Task, TaskStatus } from "@/types/task";
import { HiUserCircle, HiDocumentText } from "react-icons/hi";
import Image from "next/image";
import { useLoadingStore } from "@/store/useLoadingStore";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import { Textarea, Button } from "flowbite-react";
import { Roles } from "@/enums/Roles";
import { useAbility } from "@/hooks/useAbility";
import _ from "lodash";
import { formatStatus } from "@/utils/formatStatus";

const IconArrowLeft = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5 mr-1"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
      clipRule="evenodd"
    />
  </svg>
);

const IconExternalLink = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

const IconDocumentText = HiDocumentText as any;

export default function TaskDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [responseInput, setResponseInput] = useState("");
  const [responseError, setResponseError] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null);
  const [deletingResponse, setDeletingResponse] = useState(false);
  const [showDeleteImageModal, setShowDeleteImageModal] = useState(false);
  const [taskImageToDelete, setTaskImageToDelete] = useState<string | null>(null);
  const [deletingImage, setDeletingImage] = useState(false);

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setGlobalLoading = useLoadingStore((state) => state.setLoading);
  const MemberRoles = [Roles.CORPORATE, Roles.INDIVIDUAL];

  const ability = useAbility();

  const isImageFile = (url: string) => {
    return /\.(jpg|jpeg|png|webp)$/i.test(url);
  };

  const getFileName = (url: string) => {
    try {
      const decoded = decodeURIComponent(url);
      return decoded.substring(decoded.lastIndexOf("/") + 1);
    } catch {
      return "View Document";
    }
  };

  const fetchTaskData = async () => {
    if (!id || !token) return;

    setLoading(true);
    try {
      const taskData = await getTaskById(token, id as string);

      setTask({
        ...taskData,
        responses: taskData.responses || [],
      });
    } catch (error) {
      console.error("Error fetching task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch task details"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id || !token || token === "undefined") return;
    if (token && !ability?.can("read", "Task")) {
      toast.error("You are not authorized to access this page. Routing you back to the homepage");
      router.push("/userMarketplace");
      return;
    }
    fetchTaskData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const handleUpdateStatus = async (status: TaskStatus) => {
    if (!task || !token) return;

    try {
      const updatedTask = await updateTaskStatus(token, task.id, { status });
      setTask({
        ...updatedTask,
        responses: task.responses,
      });
      toast.success("Task status updated successfully");
    } catch (error) {
      console.error("Error updating task status:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update task status"
      );
    }
  };

  const handleUpdateDetails = async (details: {
    title?: string;
    description?: string;
    assigneeIds?: number[];
  }) => {
    if (!task || !token) return;

    try {
      const updatedTask = await updateTaskDetails(token, task.id, details);
      setTask({
        ...updatedTask,
        responses: task.responses,
      });
      toast.success("Task details updated successfully");
    } catch (error) {
      console.error("Error updating task details:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update task details"
      );
    }
  };

  const handleResponseSubmit = async () => {
    if (!id) return;

    const response = responseInput.trim();

    if (!response) {
      setResponseError("Response cannot be empty");
      return;
    }

    if (response.length < 1) {
      setResponseError("Response must be at least 1 character long");
      return;
    }

    try {
      setGlobalLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/response/task`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: `${token}`,
          },
          body: JSON.stringify({
            taskId: id,
            response,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        toast.success("Response added successfully");
        setResponseInput("");
        setResponseError("");
        fetchTaskData();
      } else {
        toast.error(data.error?.[0]?.msg || "Failed to add response");
      }
    } catch (error) {
      console.error("Failed to submit response:", error);
      toast.error("Failed to submit response");
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
        }
      );

      if (res.ok) {
        toast.success("Response deleted successfully");
        fetchTaskData();
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

  const handleDeleteTaskImage = async (imageUrl: string) => {
    if (!id || !token) return;
    try {
      setDeletingImage(true);
      await deleteTaskImage(token, id as string, imageUrl);
      toast.success("Attachment deleted successfully");
      fetchTaskData();
    } catch (error) {
      console.error("Error deleting task attachment:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete task attachment"
      );
    } finally {
      setDeletingImage(false);
      setShowDeleteImageModal(false);
      setTaskImageToDelete(null);
    }
  };

  const getStatusBadgeClass = (status: TaskStatus) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-500/20 text-yellow-500";
      case "IN_PROGRESS":
        return "bg-blue-500/20 text-blue-500";
      case "COMPLETED":
        return "bg-green-500/20 text-green-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  const userId = user?.id;
  const isAssignee = task?.assignees?.some(
    (assignee) => assignee.id === Number(userId)
  );
  const canRespond = task?.status !== "COMPLETED";
  const isOwner = Boolean(task && Number(user?.id) === task.assignerId);

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      {showStatusModal && task && (
        <UpdateTaskStatusModal
          open={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          onSubmit={handleUpdateStatus}
          currentStatus={task.status}
          taskId={task.id}
        />
      )}

      {showEditModal && task && (
        <EditTaskModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleUpdateDetails}
          currentTask={task}
        />
      )}

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

      <ConfirmationModal
        show={showDeleteImageModal}
        onClose={() => {
          setShowDeleteImageModal(false);
          setTaskImageToDelete(null);
        }}
        onConfirm={() => {
          if (taskImageToDelete) {
            handleDeleteTaskImage(taskImageToDelete);
          }
        }}
        title="Delete Attachment"
        message="Are you sure you want to delete this attachment? This action cannot be undone."
        confirmText="Delete"
        confirmColor="red"
        isProcessing={deletingImage}
      />

      <div className="flex items-center mb-6">
        <button
          onClick={() => router.push("/tasks")}
          className="mr-4 text-gray-400 hover:text-white flex items-center"
        >
          <IconArrowLeft />
          Back to Tasks
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      ) : task ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden shadow-lg">
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2 md:mb-0">
                {task.title}
              </h1>
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeClass(
                  task.status
                )}`}
              >
                {formatStatus(task.status || "")}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gold-500 mb-2">
                  Details
                </h2>
                <div className="bg-gray-800 p-4 rounded-md">
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {task.description}
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
                      <p className="text-sm text-gray-400">Assigned To</p>
                      <div className="mt-1 space-y-1">
                        {task.assignees.map((assignee) => (
                          <div key={assignee.id} className="flex items-center">
                            <span className="bg-gray-700 px-2 py-1 rounded text-white mr-2">
                              {assignee.name}
                            </span>
                            <span className="text-xs text-gray-400">
                              {assignee.email}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Assigned By</p>
                      <p className="text-white">{task.assigner.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Assigned At</p>
                      <p className="text-white">
                        {formatDateAndTime(task.createdAt, true)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Date Planned</p>
                      <p className="text-white">
                        {task.datePlanned
                          ? formatDateAndTime(task.datePlanned, true)
                          : "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {task.photoUrls && task.photoUrls.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gold-500 mb-2">Attachments</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {task.photoUrls.map((url, index) => {
                    const isImg = isImageFile(url);
                    return (
                      <div
                        key={index}
                        onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                        className="relative aspect-square rounded-lg overflow-hidden border border-gray-700 bg-gray-800 group cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
                      >
                        {isImg ? (
                          <Image
                            src={url}
                            alt={`Task Attachment ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 50vw, 20vw"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full w-full p-4 text-center hover:bg-gray-750 transition-colors">
                            <IconDocumentText className="h-12 w-12 text-gold-500 mb-2" />
                            <span className="text-xs text-gray-300 break-all line-clamp-2 px-1">
                              {getFileName(url)}
                            </span>
                          </div>
                        )}

                        {/* Top Right Action Arrow Box */}
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-2 right-2 z-20 bg-gray-950/80 hover:bg-gold-500 text-gray-300 hover:text-black p-1.5 rounded-md transition-colors backdrop-blur-sm shadow-md"
                          title="Open attachment in a new tab"
                        >
                          <IconExternalLink />
                        </a>

                        {isOwner && task.status === "PENDING" && (
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center pointer-events-none group-hover:pointer-events-auto z-10">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setTaskImageToDelete(url);
                                setShowDeleteImageModal(true);
                              }}
                              className="opacity-0 group-hover:opacity-100 bg-red-500 text-white px-3 py-1 rounded text-xs hover:bg-red-600 transition-opacity pointer-events-auto"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Can I="update" a="Task">
              <div className="flex flex-wrap gap-3 justify-end">
                {(isAssignee || Number(user?.id) === task.assignerId) && (
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                  >
                    Update Status
                  </button>
                )}
                {Number(user?.id) === task?.assignerId &&
                  task.status === "PENDING" && (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors"
                    >
                      Edit Task
                    </button>
                  )}
              </div>
            </Can>
          </div>

          <div className="border-t border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-gold-500 mb-4">
              Responses
            </h2>

            <div className="space-y-4">
              {(task?.responses || []).map((response) => (
                <div
                  key={response.id}
                  className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors group"
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
                        {response.user.Role?.name && (
                          <span className="bg-purple-500/20 text-purple-400 text-xs font-medium px-2 py-0.5 rounded">
                            {response.user.Role.name}
                          </span>
                        )}
                        <span className="text-gray-400 text-xs">
                          {formatDateAndTime(response.createdAt, true)}
                        </span>
                        {Number(user?.id) === Number(response.user.id) &&
                          task.status !== "COMPLETED" && (
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
              {!task?.responses?.length && (
                <p className="text-gray-400 italic">No responses yet.</p>
              )}
            </div>

            {canRespond && (
              <div className="mt-8 bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium text-gold-500 mb-3">
                  Add a response
                </h3>
                <Textarea
                  value={responseInput}
                  onChange={(e) => {
                    setResponseInput(e.target.value);
                    if (e.target.value.trim()) setResponseError("");
                  }}
                  placeholder="Type your response..."
                  rows={3}
                  className={`bg-gray-700 border ${responseError ? "border-red-500" : "border-gray-600"
                    } text-white w-full rounded-lg p-3`}
                />
                {responseError && (
                  <p className="text-red-500 text-sm mt-1">{responseError}</p>
                )}
                <div className="mt-3 flex justify-end">
                  <Button
                    onClick={handleResponseSubmit}
                    className="bg-gold-500 hover:bg-gold-600 text-black flex items-center"
                  >
                    Post Response
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">
            Task not found or you don&apos;t have permission to view it.
          </p>
        </div>
      )}
    </div>
  );
}
