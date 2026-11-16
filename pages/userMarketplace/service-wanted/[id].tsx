"use client";

import type React from "react";

import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Textarea, Button } from "flowbite-react";
import { HiUserCircle } from "react-icons/hi";
import useAuthStore from "@/store/authStore";
import { useLoadingStore } from "@/store/useLoadingStore";
import Can from "@/components/rbac/Can";
import demoImage from "@/public/images/users/userProfile2.png";
import {
  getServiceWanted,
  updateServiceWanted,
  deleteServiceWanted,
  addServiceWantedResponse,
  deleteServiceWantedResponse,
} from "@/services/serviceWanted";
import UniversalFormModal from "@/components/modals/UniversalFormModal";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { fetchServiceCategories } from "@/services/serviceCategories";
import { buildResponseThreads } from "@/utils/buildResponseThreads";
import { formatDateAndTime } from "@/utils/formatDateAndTime";

export default function ServiceWantedDetail() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    description: string;
    serviceCategoryId: number;
    subCategoryId: number;
    image?: File | string | null;
  } | null>(null);
  const [serviceCategories, setServiceCategories] = useState<any[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const setGlobalLoading = useLoadingStore((state) => state.setLoading);
  const [responseInputs, setResponseInputs] = useState<Record<string, string>>({});
  const [responseErrors, setResponseErrors] = useState<Record<string, string>>({});
  const [showDeleteResponseModal, setShowDeleteResponseModal] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null);
  const [deletingResponse, setDeletingResponse] = useState(false);

  const getPreviewSource = (value: unknown): string | undefined => {
    if (typeof value === "string") return value;
    if (typeof File !== "undefined" && value instanceof File) {
      return URL.createObjectURL(value);
    }
    return undefined;
  };

  const {
    data: serviceWanted,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["serviceWanted", Array.isArray(id) ? id[0] : id],
    queryFn: () =>
      getServiceWanted(token as string, Array.isArray(id) ? id[0] : id || ""),
    enabled: Boolean((Array.isArray(id) ? id[0] : id) && token),
  });

  const responseThreads = useMemo(
    () =>
      buildResponseThreads(
        serviceWanted?.responses || [],
        serviceWanted?.userId || 0,
      ),
    [serviceWanted?.responses, serviceWanted?.userId],
  );

  useEffect(() => {
    if (!token) return;

    const loadServiceCategories = async () => {
      try {
        const res = await fetchServiceCategories(token);
        setServiceCategories(res.data || []);
      } catch (err) {
        console.error("Failed to load service categories", err);
        toast.error("Could not load service categories");
      }
    };
    loadServiceCategories();
  }, [isEditModalOpen, token]);

  if (error) {
    toast.error((error as Error).message);
  }

  const selectedEditServiceCategory = serviceCategories.find(
    (cat) => cat.id === editFormData?.serviceCategoryId,
  );

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData || !token || !serviceWanted) return;

    try {
      setIsSubmitting(true);

      await updateServiceWanted(token, serviceWanted.id, {
        name: editFormData.name,
        description: editFormData.description,
        serviceCategoryId: Number(editFormData.serviceCategoryId),
        subCategoryId: Number(editFormData.subCategoryId),
        image: editFormData.image instanceof File ? editFormData.image : undefined,
      });

      await refetch();
      toast.success("Service wanted updated successfully");
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["serviceWanted", id] });
      queryClient.invalidateQueries({ queryKey: ["tabData", "ServiceWanted"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update service wanted");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !serviceWanted) return;

    try {
      setDeleting(true);
      await deleteServiceWanted(token, serviceWanted.id);
      toast.success("Service wanted listing deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["tabData", "ServiceWanted"] });
      router.push("/userMarketplace?tab=ServiceWanted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete service wanted listing");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleResponseSubmit = async (
    inputKey: string,
    threadUserId?: number,
  ) => {
    if (!token || !serviceWanted) return;

    const response = (responseInputs[inputKey] ?? "").trim();

    if (!response) {
      setResponseErrors((prev) => ({
        ...prev,
        [inputKey]: "Response cannot be empty",
      }));
      return;
    }

    try {
      setGlobalLoading(true);
      const res = await addServiceWantedResponse(
        token,
        String(serviceWanted.id),
        response,
        threadUserId,
      );
      toast.success(res.message || "Response added successfully");
      setResponseInputs((prev) => ({ ...prev, [inputKey]: "" }));
      setResponseErrors((prev) => ({ ...prev, [inputKey]: "" }));
      await refetch();
    } catch (err) {
      console.error("Failed to submit response:", err);
      toast.error("Failed to submit response");
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleDeleteResponse = async (responseId: string) => {
    if (!token) return;

    try {
      setDeletingResponse(true);
      const res = await deleteServiceWantedResponse(token, responseId);
      toast.success(res.message || "Response deleted successfully");
      await refetch();
    } catch (err) {
      console.error("Failed to delete response:", err);
      toast.error("Failed to delete response");
    } finally {
      setDeletingResponse(false);
      setShowDeleteResponseModal(false);
      setResponseToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="loader">
          <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!serviceWanted) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Service wanted listing not found
        </p>
        <Link href="/userMarketplace?tab=ServiceWanted">
          <div className="px-4 py-2 bg-gold-600 text-white rounded-md hover:bg-gold-700 transition-colors">
            Back to Marketplace
          </div>
        </Link>
      </div>
    );
  }

  const isOwner = Boolean(
    serviceWanted && serviceWanted.userId === Number(user?.id),
  );
  const canRespond = Boolean(token);
  const visibleThreads = isOwner
    ? responseThreads.threads
    : responseThreads.threads.filter(
        (thread) => thread.threadUserId === Number(user?.id),
      );
  const canStartThread = canRespond && !isOwner && visibleThreads.length === 0;

  return (
    <>
      <Head>
        <title>{serviceWanted.name} | PBC Dubai</title>
        <meta name="description" content={serviceWanted.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto px-4 py-8 pb-12 min-h-screen">
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <div className="inline-flex items-center text-sm text-gray-700 hover:text-gold-600 dark:text-gray-400 dark:hover:text-white">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                </svg>
                Home
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <Link href="/userMarketplace?tab=ServiceWanted">
                  <div className="ml-1 text-sm text-gray-700 hover:text-gold-600 md:ml-2 dark:text-gray-400 dark:hover:text-white">
                    Service I Want
                  </div>
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-gray-400 truncate max-w-xs">
                  {serviceWanted.name}
                </span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
            <div className="relative h-96 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
              {serviceWanted.image ? (
                <Image
                  src={serviceWanted.image}
                  alt={serviceWanted.name}
                  layout="fill"
                  objectFit="contain"
                  className="transition-opacity duration-300"
                  priority={true}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-gold-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                  No Image
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {serviceWanted.name}
              </h1>
              <div className="flex items-center mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                  Category:
                </span>
                <span className="bg-gold-100 text-gold-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-gold-900 dark:text-gold-300">
                  {serviceWanted.serviceCategory.name}
                  {serviceWanted.subCategory
                    ? ` › ${serviceWanted.subCategory.name}`
                    : ""}
                </span>
              </div>
              <div className="prose prose-sm dark:prose-invert mb-6">
                <p className="text-gray-700 dark:text-gray-300">
                  {serviceWanted.description}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Requested By
              </h3>
              <div className="flex items-center">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mr-3">
                  <Image
                    src={
                      serviceWanted.user.profile?.profilePicture
                        ? serviceWanted.user.profile.profilePicture
                        : demoImage
                    }
                    alt={serviceWanted.user.name}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {serviceWanted.user.name}
                  </p>
                  {!isOwner && (
                    <Link
                      key={serviceWanted.user.id}
                      href={`/users/${serviceWanted.user.id}`}
                    >
                      <button className="text-sm text-gold-600 dark:text-gold-400 hover:underline">
                        Contact Buyer
                      </button>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {isOwner && (
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-4">
                <div className="flex flex-wrap gap-2">
                  <Can I="update" a="ServiceWanted">
                    <button
                      onClick={() => {
                        setEditFormData({
                          name: serviceWanted.name,
                          description: serviceWanted.description,
                          serviceCategoryId: serviceWanted.serviceCategoryId,
                          subCategoryId: serviceWanted.subCategoryId,
                          image: serviceWanted.image || null,
                        });
                        setIsEditModalOpen(true);
                      }}
                      className="py-1 px-4 bg-yellow-500 hover:bg-yellow-700 text-white rounded-md flex items-center justify-center"
                    >
                      Edit Listing
                    </button>
                  </Can>
                  <Can I="delete" a="ServiceWanted">
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="py-1 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center justify-center"
                    >
                      Delete Listing
                    </button>
                  </Can>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Responses
          </h3>

          {visibleThreads.length > 0 ? (
            <div className="space-y-6">
              {visibleThreads.map((thread) => {
                const threadKey = String(thread.threadUserId);
                const threadInput = responseInputs[threadKey] ?? "";
                const threadError = responseErrors[threadKey];
                const threadLabel =
                  thread.threadUser?.name || `User #${thread.threadUserId}`;

                return (
                  <div
                    key={thread.threadUserId}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                  >
                    <div className="mb-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Conversation with
                      </p>
                      <p className="text-base font-semibold text-gray-800 dark:text-white">
                        {threadLabel}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {thread.responses.map((responseItem) => (
                        <div
                          key={responseItem.id}
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
                                  {Number(responseItem.user.id) === Number(user?.id)
                                    ? "You"
                                    : responseItem.user.name}
                                </span>
                                {responseItem.user?.Role?.name && (
                                  <span className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 text-xs font-medium px-2 py-0.5 rounded">
                                    {responseItem.user.Role.name}
                                  </span>
                                )}
                                <span className="text-gray-500 dark:text-gray-400 text-xs">
                                  {formatDateAndTime(responseItem.createdAt, true)}
                                </span>

                                {Number(responseItem.user.id) === Number(user?.id) && (
                                  <button
                                    onClick={() => {
                                      setResponseToDelete(responseItem.id);
                                      setShowDeleteResponseModal(true);
                                    }}
                                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {responseItem.response}
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
                                    isOwner ? thread.threadUserId : undefined,
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
                        handleResponseSubmit(String(user?.id ?? "new"))
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

        {isEditModalOpen && editFormData && (
          <UniversalFormModal
            title="Edit Service I Want"
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSubmit={handleEditSubmit}
            isSubmitting={isRefetching || isSubmitting}
            fields={[
              {
                id: "name",
                label: "Service Name",
                type: "text",
                value: editFormData.name,
                onChange: (e) =>
                  setEditFormData((prev) => ({
                    ...prev!,
                    name: e.target.value,
                  })),
              },
              {
                id: "description",
                label: "Description",
                type: "textarea",
                value: editFormData.description,
                onChange: (e) =>
                  setEditFormData((prev) => ({
                    ...prev!,
                    description: e.target.value,
                  })),
              },
              {
                id: "serviceCategoryId",
                label: "Category",
                type: "select",
                value: editFormData.serviceCategoryId,
                onChange: (e) =>
                  setEditFormData((prev) => ({
                    ...prev!,
                    serviceCategoryId: parseInt(e.target.value),
                    subCategoryId: 0,
                  })),
                options: serviceCategories.map((cat) => ({
                  label: cat.name,
                  value: cat.id.toString(),
                })),
              },
              {
                id: "subCategoryId",
                label: "Sub Category",
                type: "select",
                value: editFormData.subCategoryId,
                onChange: (e) =>
                  setEditFormData((prev) => ({
                    ...prev!,
                    subCategoryId: parseInt(e.target.value),
                  })),
                options: (selectedEditServiceCategory?.subCategories || []).map(
                  (sub: any) => ({
                    label: sub.name,
                    value: sub.id.toString(),
                  }),
                ),
              },
              {
                id: "image",
                label: "Image (Optional)",
                type: "file",
                onChange: (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setEditFormData((prev) => ({
                      ...prev!,
                      image: file,
                    }));
                  }
                },
                preview: getPreviewSource(editFormData.image),
                value: undefined,
              },
            ]}
          />
        )}
      </div>
      <ConfirmationModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Service I Want"
        message="Are you sure you want to delete this listing? This action cannot be undone."
        confirmText="Delete"
        confirmColor="red"
        isProcessing={deleting}
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
    </>
  );
}
