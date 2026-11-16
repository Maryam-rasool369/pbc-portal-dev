"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useMemo, useState } from "react";
import useAuthStore from "@/store/authStore";
import Can from "@/components/rbac/Can";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import * as wishlistService from "@/services/wishlist";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { FaArrowLeft } from "react-icons/fa";
import { HiUserCircle } from "react-icons/hi";
import { useAbility } from "@/hooks/useAbility";
import { Roles } from "@/enums/Roles";
import { Button, Textarea } from "flowbite-react";
import { useLoadingStore } from "@/store/useLoadingStore";
import { GeneralResponse } from "@/types/global";
import { formatStatus } from "@/utils/formatStatus";

const CKEditorClient = dynamic(() => import("@/components/CKEditorClient"), {
  ssr: false,
  loading: () => <p>Loading Editor...</p>,
});

interface Wishlist {
  id: number;
  userId: number;
  title: string;
  suggestions: string;
  status: "PENDING" | "RESOLVED_AND_CLOSED" | "UNRESOLVED_AND_CLOSED";
  comment?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
  };
  responses: GeneralResponse[];
}

export default function WishlistDetails() {
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("");
  const [title, setTitle] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [responseInputs, setResponseInputs] = useState<
    Record<string, string>
  >({});
  const [responseErrors, setResponseErrors] = useState<
    Record<string, string>
  >({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null);
  const [deletingResponse, setDeletingResponse] = useState(false);
  const [showDeleteWishlistModal, setShowDeleteWishlistModal] = useState(false);
  const [deletingWishlist, setDeletingWishlist] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const router = useRouter();
  const { id } = router.query;
  const setGlobalLoading = useLoadingStore((state) => state.setLoading);

  const ability = useAbility();

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const fetchWishlist = async () => {
    if (!id) return;

    if (!token || token === "undefined" || !user) {
      router.push("/");
      return;
    }

    try {
      setLoading(true);
      const data = await wishlistService.fetchWishlistById(token, id);

      if (!ability?.can("read", "Wishlist")) {
        toast.error("You don't have permission to view this wishlist");
        router.push("/wishlists");
        return;
      }

      setWishlist({
        ...data,
        responses: data.responses || [],
      });
      setTitle(data.title || "");
      setSuggestions(data.suggestions || "");
      setStatus(data.status || "");
      setComment(data.comment || "");
    } catch (error) {
      console.error("Failed to fetch wishlist:", error);
      setNotFound(true);
      toast.error("Failed to fetch wishlist details");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async (voteStatus: Wishlist["status"]) => {
    if (!user || !ability?.can("approve", "Wishlist")) {
      toast.error("You don't have permission to perform this action");
      return;
    }

    if (!token || token === "undefined") {
      router.push("/");
      return;
    }

    if (comment.trim().length < 5) {
      toast.error("Please provide a comment of at least 5 characters");
      return;
    }

    try {
      setUpdatingStatus(true);
      const res = await wishlistService.updateWishlistStatus(
        token,
        id as string,
        voteStatus as "RESOLVED_AND_CLOSED" | "UNRESOLVED_AND_CLOSED",
        comment,
      );
      toast.success(res.message || "Status updated successfully");
      setComment("");
      setStatus("");
      fetchWishlist();
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleUpdateWishlist = async () => {
    if (!isOwner && !ability?.can("update", "Wishlist")) {
      toast.error("You don't have permission to update this wishlist");
      return;
    }

    if (!title.trim() || !suggestions.trim()) {
      toast.warn("Please fill in all fields");
      return;
    }

    if (!token || token === "undefined") {
      router.push("/");
      return;
    }

    try {
      const res = await wishlistService.updateWishlist(token, id as string, {
        title,
        suggestions,
      });
      toast.success(res.message || "Wishlist updated successfully");
      setIsEditing(false);
      fetchWishlist();
    } catch (error) {
      console.error("Failed to update wishlist:", error);
      toast.error("Failed to update wishlist");
    }
  };

  const handleResponseSubmit = async (
    inputKey: string,
    threadUserId?: number,
  ) => {
    if (!id) return;

    const message = (responseInputs[inputKey] ?? "").trim();

    // Validate response length
    if (!message) {
      setResponseErrors((prev) => ({
        ...prev,
        [inputKey]: "Response cannot be empty",
      }));
      return;
    }

    if (message.length < 1) {
      setResponseErrors((prev) => ({
        ...prev,
        [inputKey]: "Response must be at least 1 character long",
      }));
      return;
    }

    try {
      setGlobalLoading(true);
      const res = await wishlistService.addWishlistResponse(
        token as string,
        id,
        message,
        threadUserId,
      );
      toast.success(res.message || "Response added successfully");
      setResponseInputs((prev) => ({ ...prev, [inputKey]: "" }));
      setResponseErrors((prev) => ({ ...prev, [inputKey]: "" }));
      fetchWishlist();
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
      const res = await wishlistService.deleteResponse(
        token as string,
        responseId,
      );
      toast.success(res.message || "Response deleted successfully");
      fetchWishlist();
    } catch (error) {
      console.error("Failed to delete response:", error);
      toast.error("Failed to delete response");
    } finally {
      setDeletingResponse(false);
      setShowDeleteModal(false);
      setResponseToDelete(null);
    }
  };

  const handleDeleteWishlist = async () => {
    if (!id || !token || !wishlist) return;

    if (!isOwner && !ability?.can("delete", "Wishlist")) {
      toast.error("You don't have permission to delete this wishlist");
      return;
    }

    try {
      setDeletingWishlist(true);
      const res = await wishlistService.deleteWishlist(token, id as string);
      toast.success(res.message || "Wishlist deleted successfully");
      router.push("/wishlists");
    } catch (error) {
      console.error("Failed to delete wishlist:", error);
      toast.error("Failed to delete wishlist");
    } finally {
      setDeletingWishlist(false);
      setShowDeleteWishlistModal(false);
    }
  };

  useEffect(() => {
    if (!token || token === "undefined" || !user) {
      router.push("/");
      return;
    }

    if (id) {
      fetchWishlist();
    }
  }, [id, token, user]);

  const canEdit =
    user &&
    wishlist &&
    (Number(user.id) === wishlist.userId || ability?.can("update", "Wishlist")) &&
    wishlist?.status === "PENDING";
  const canRespond = wishlist?.status === "PENDING";
  const isOwner =
    user && wishlist && Number(user.id) === Number(wishlist.userId);
  const canDeleteWishlist =
    Boolean(wishlist && (isOwner || ability?.can("delete", "Wishlist")));

  const responseThreads = useMemo(() => {
    if (!wishlist) {
      return { threads: [], unassigned: [] } as {
        threads: {
          threadUserId: number;
          threadUser?: GeneralResponse["user"];
          responses: GeneralResponse[];
        }[];
        unassigned: GeneralResponse[];
      };
    }

    const ownerId = wishlist.userId;
    const threadMap = new Map<
      number,
      {
        threadUserId: number;
        threadUser?: GeneralResponse["user"];
        responses: GeneralResponse[];
      }
    >();
    const unassigned: GeneralResponse[] = [];
    let lastThreadUserId: number | null = null;

    const orderedResponses = [...wishlist.responses].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );

    orderedResponses.forEach((item) => {
      const isOwnerResponse = item.userId === ownerId;
      const threadUserId = isOwnerResponse
        ? item.threadUserId ?? lastThreadUserId
        : item.userId;

      if (!threadUserId) {
        unassigned.push(item);
        return;
      }

      if (!isOwnerResponse) {
        lastThreadUserId = threadUserId;
      }

      const existing = threadMap.get(threadUserId) || {
        threadUserId,
        responses: [] as GeneralResponse[],
      };

      if (!existing.threadUser && !isOwnerResponse) {
        existing.threadUser = item.user;
      }

      existing.responses.push(item);
      threadMap.set(threadUserId, existing);
    });

    const threads = Array.from(threadMap.values()).sort((a, b) => {
      const aLast = a.responses[a.responses.length - 1]?.createdAt ?? "";
      const bLast = b.responses[b.responses.length - 1]?.createdAt ?? "";
      return aLast.localeCompare(bLast);
    });

    return { threads, unassigned };
  }, [wishlist]);

  const visibleThreads = isOwner
    ? responseThreads.threads
    : responseThreads.threads.filter(
        (thread) => thread.threadUserId === Number(user?.id),
      );
  const canStartThread = canRespond && !isOwner && visibleThreads.length === 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <>
        <div className="text-center mt-6 p-10 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="flex flex-col items-center">
            <svg
              className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">
              Wishlist Not Found
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              The wishlist you&apos;re looking for doesn&apos;t exist or has
              been removed.
            </p>
            <button
              onClick={() => router.push("/wishlists")}
              className="text-white bg-gold-500 hover:bg-gold-600 px-5 py-2 rounded-md transition-colors"
            >
              Back to Wishlists
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="mb-6 flex justify-between">
          <button
            onClick={() => router.push("/wishlists")}
            className="text-gold-600 dark:text-gold-400 flex items-center hover:text-gold-800 dark:hover:text-gold-300"
          >
            {/* @ts-ignore */}
            <FaArrowLeft className="mr-2" />
            Back to Wishlists
          </button>

          <div className="flex gap-2">
            {canDeleteWishlist && !isEditing && (
              <button
                onClick={() => setShowDeleteWishlistModal(true)}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
              >
                Delete Wishlist
              </button>
            )}

            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-gold-500 text-white px-4 py-2 rounded hover:bg-gold-600 transition-colors"
              >
                Edit Wishlist
              </button>
            )}

            {isEditing && (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateWishlist}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="mb-6">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                Suggestions
              </label>
              <CKEditorClient
                value={suggestions}
                onChange={setSuggestions}
                readOnly={false}
              />
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 pb-3 border-b border-gray-200 dark:border-gray-700">
              {wishlist?.title}
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg">
                  <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3">
                    Suggestions
                  </h2>
                  <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 min-h-[100px]">
                    <div
                      className="max-w-none p-3 text-gray-700 dark:text-gray-300"
                      dangerouslySetInnerHTML={{
                        __html: wishlist?.suggestions || "",
                      }}
                    />
                  </div>
                </div>

                <div className="mt-8 bg-gray-50 dark:bg-gray-700 p-5 rounded-lg">
                  <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">
                    Responses
                  </h2>
                  {visibleThreads.length > 0 ? (
                    <div className="space-y-6">
                      {visibleThreads.map((thread) => {
                        const threadKey = String(thread.threadUserId);
                        const threadInput = responseInputs[threadKey] ?? "";
                        const threadError = responseErrors[threadKey];
                        const threadLabel =
                          thread.threadUser?.name ||
                          `User #${thread.threadUserId}`;

                        return (
                          <div
                            key={thread.threadUserId}
                            className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-200 dark:border-gray-600"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                  Conversation with
                                </p>
                                <p className="text-base font-semibold text-gray-800 dark:text-white">
                                  {threadLabel}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              {thread.responses.map((response) => (
                                <div
                                  key={response.id}
                                  className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-650 transition-colors group border border-gray-200 dark:border-gray-600"
                                >
                                  <div className="flex items-start">
                                    <div className="mr-3 mt-1">
                                      {/* @ts-ignore */}
                                      <HiUserCircle className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="font-medium text-gray-800 dark:text-white">
                                          {Number(response.user.id) ===
                                          Number(user?.id)
                                            ? "You"
                                            : response.user.name}
                                        </span>
                                        {response.user?.Role?.name && (
                                          <span className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 text-xs font-medium px-2 py-0.5 rounded">
                                            {response.user.Role.name}
                                          </span>
                                        )}
                                        <span className="text-gray-500 dark:text-gray-400 text-xs">
                                          {formatDateAndTime(
                                            response.createdAt,
                                            true,
                                          )}
                                        </span>

                                        {wishlist?.status === "PENDING" &&
                                          Number(response.user.id) ===
                                            Number(user?.id) && (
                                            <button
                                              onClick={() => {
                                                setResponseToDelete(response.id);
                                                setShowDeleteModal(true);
                                              }}
                                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                              Delete
                                            </button>
                                          )}
                                      </div>
                                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                        {response.response}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {canRespond && (
                              <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                                <h3 className="font-medium text-gray-800 dark:text-gold-500 mb-3">
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
                                      placeholder="Type your response..."
                                      rows={3}
                                      className={`bg-white dark:bg-gray-700 border ${
                                        threadError
                                          ? "border-red-500"
                                          : "border-gray-300 dark:border-gray-600"
                                      } text-gray-800 dark:text-white w-full rounded-lg p-3`}
                                    />

                                    {threadError && (
                                      <p className="text-red-500 text-sm mt-1">
                                        {threadError}
                                      </p>
                                    )}

                                    <div className="mt-3 flex justify-end">
                                      <Button
                                        onClick={() =>
                                          handleResponseSubmit(
                                            threadKey,
                                            isOwner
                                              ? thread.threadUserId
                                              : undefined,
                                          )
                                        }
                                        className="bg-gold-500 hover:bg-gold-600 text-black flex items-center"
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
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      {isOwner
                        ? "No conversations yet. Members can start a thread here."
                        : "No responses yet. Start the discussion by adding a comment."}
                    </p>
                  )}

                  {canStartThread && (
                    <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                      <h3 className="font-medium text-gray-800 dark:text-gold-500 mb-3">
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
                            placeholder="Type your response..."
                            rows={3}
                            className={`bg-white dark:bg-gray-700 border ${
                              responseErrors[String(user?.id ?? "new")]
                                ? "border-red-500"
                                : "border-gray-300 dark:border-gray-600"
                            } text-gray-800 dark:text-white w-full rounded-lg p-3`}
                          />

                          {responseErrors[String(user?.id ?? "new")] && (
                            <p className="text-red-500 text-sm mt-1">
                              {responseErrors[String(user?.id ?? "new")]}
                            </p>
                          )}

                          <div className="mt-3 flex justify-end">
                            <Button
                              onClick={() =>
                                handleResponseSubmit(
                                  String(user?.id ?? "new"),
                                )
                              }
                              className="bg-gold-500 hover:bg-gold-600 text-black flex items-center"
                            >
                              Post Response
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg h-fit">
                  <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 pb-2 border-b border-gray-200 dark:border-gray-600">
                    Wishlist Details
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Status
                      </p>
                      <p className="mt-1">
                        <span
                          className={`text-sm font-medium me-2 px-3 py-1 rounded-full ${
                            wishlist?.status === "RESOLVED_AND_CLOSED"
                              ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400"
                              : wishlist?.status === "UNRESOLVED_AND_CLOSED"
                                ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
                                : "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400"
                          }`}
                        >
                          {formatStatus(wishlist?.status || "")}
                        </span>
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Submitted by
                      </p>
                      <p className="text-base text-gray-800 dark:text-gray-200">
                        {wishlist?.user.name}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Submission date
                      </p>
                      <p className="text-base text-gray-800 dark:text-gray-200">
                        {formatDateAndTime(wishlist?.createdAt || "", true)}
                      </p>
                    </div>

                    {/* {user?.Role?.name !== Roles.ADMIN && user?.Role?.name !== Roles.PBC_STAFF && wishlist?.comment && (
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Admin comment</p>
                        <p className="text-base dark:text-gray-200">{wishlist.comment}</p>
                      </div>
                    )} */}
                  </div>
                </div>

                {user &&
                  ![Roles.INDIVIDUAL, Roles.CORPORATE].includes(
                    user.Role?.name as Roles,
                  ) && (
                    <div className="mt-6 bg-gray-50 dark:bg-gray-700 p-5 rounded-lg">
                      <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 pb-2 border-b border-gray-200 dark:border-gray-600">
                        Actions
                      </h2>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Admin Comment
                          </label>
                          <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            className={`w-full border rounded-md px-4 py-3 ${
                              wishlist?.status !== "PENDING"
                                ? "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                : "border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:text-gray-200"
                            }`}
                            rows={4}
                            placeholder={
                              wishlist?.status === "PENDING"
                                ? "Enter your comment about this wishlist..."
                                : "Comments cannot be added to non-pending wishlists"
                            }
                            disabled={wishlist?.status !== "PENDING"}
                          />
                        </div>
                        <Can I="approve" a="Wishlist">
                          {wishlist?.status === "PENDING" && (
                            <div className="flex flex-col sm:flex-row gap-3">
                              <button
                                onClick={() =>
                                  handleApproveReject("RESOLVED_AND_CLOSED")
                                }
                                className="bg-green-500 text-white px-5 py-2 rounded-md hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={updatingStatus}
                              >
                                Resolve & Close
                              </button>
                              <button
                                onClick={() =>
                                  handleApproveReject("UNRESOLVED_AND_CLOSED")
                                }
                                className="bg-red-500 text-white px-5 py-2 rounded-md hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={updatingStatus}
                              >
                                Unresolve & Close
                              </button>
                            </div>
                          )}
                        </Can>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </>
        )}
      </div>
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
        show={showDeleteWishlistModal}
        onClose={() => setShowDeleteWishlistModal(false)}
        onConfirm={handleDeleteWishlist}
        title="Delete Wishlist"
        message="Are you sure you want to delete this wishlist? This action cannot be undone."
        confirmText="Delete"
        confirmColor="red"
        isProcessing={deletingWishlist}
      />
    </>
  );
}
