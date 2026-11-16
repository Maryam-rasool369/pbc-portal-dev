"use client";

import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";
import demoImage from "@/public/images/users/userProfile2.png";
import {
  getService,
  updateService,
  deleteService,
  addServiceResponse,
  deleteServiceResponse,
} from "@/services/userServices";
import { fetchServiceCategories } from "@/services/serviceCategories";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import { Service } from "@/types/marketplace";
import { Textarea, Button } from "flowbite-react";
import { HiUserCircle } from "react-icons/hi";
import { buildResponseThreads } from "@/utils/buildResponseThreads";
import { useLoadingStore } from "@/store/useLoadingStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1, refetchOnWindowFocus: false },
  },
});

export default function ServiceDetailWithQueryClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <ServiceDetail />
    </QueryClientProvider>
  );
}

function ServiceDetail() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const setGlobalLoading = useLoadingStore((state) => state.setLoading);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingService, setIsDeletingService] = useState(false);
  const [serviceCategories, setServiceCategories] = useState<any[]>([]);
  const [responseInputs, setResponseInputs] = useState<Record<string, string>>({});
  const [responseErrors, setResponseErrors] = useState<Record<string, string>>({});
  const [showDeleteResponseModal, setShowDeleteResponseModal] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null);
  const [deletingResponse, setDeletingResponse] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    brand: "",
    description: "",
    serviceCategoryId: "",
    subCategoryId: "",
    primaryImage: null as File | null,
  });

  const serviceId = Array.isArray(id) ? id[0] : id || "";

  const {
    data: service,
    isLoading,
    error,
    refetch,
  } = useQuery<Service>({
    queryKey: ["service", serviceId],
    queryFn: () => getService(token as string, serviceId),
    enabled: Boolean(serviceId && token),
  });

  useEffect(() => {
    if (!service) return;
    setEditForm({
      name: service.name,
      brand: service.brand,
      description: service.description,
      serviceCategoryId: String(service.serviceCategoryId),
      subCategoryId: service.subCategoryId ? String(service.subCategoryId) : "",
      primaryImage: null,
    });
  }, [service]);

  useEffect(() => {
    if (!token || !isEditModalOpen) return;
    fetchServiceCategories(token)
      .then((data) => setServiceCategories(data.data || []))
      .catch(() => {});
  }, [token, isEditModalOpen]);

  const selectedCategory = serviceCategories.find(
    (c) => String(c.id) === editForm.serviceCategoryId,
  );

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !service) return;
    if (!editForm.serviceCategoryId) {
      toast.error("Please select a category");
      return;
    }
    if (!editForm.subCategoryId) {
      toast.error("Please select a sub category");
      return;
    }
    setIsSubmitting(true);
    try {
      await updateService(token, service.id, {
        name: editForm.name,
        brand: editForm.brand,
        description: editForm.description,
        serviceCategoryId: Number(editForm.serviceCategoryId),
        subCategoryId: editForm.subCategoryId ? Number(editForm.subCategoryId) : undefined,
        primaryImage: editForm.primaryImage,
      });
      toast.success("Service updated successfully");
      setIsEditModalOpen(false);
      await refetch();
      queryClient.invalidateQueries({ queryKey: ["service", serviceId] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update service");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !service) return;
    setIsDeletingService(true);
    try {
      await deleteService(token, service.id);
      toast.success("Service deleted successfully");
      router.push("/userMarketplace?tab=Service");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete service");
    } finally {
      setIsDeletingService(false);
      setShowDeleteModal(false);
    }
  };

  const isOwner = service ? service.userId === Number(user?.id) : false;
  const canRespond = Boolean(token);
  const responseThreads = useMemo(
    () => buildResponseThreads(service?.responses || [], service?.userId || 0),
    [service?.responses, service?.userId],
  );
  const visibleThreads = isOwner
    ? responseThreads.threads
    : responseThreads.threads.filter(
        (thread) => thread.threadUserId === Number(user?.id),
      );
  const canStartThread = canRespond && !isOwner && visibleThreads.length === 0;

  const handleResponseSubmit = async (inputKey: string, threadUserId?: number) => {
    if (!token || !service) return;
    const response = (responseInputs[inputKey] ?? "").trim();
    if (!response) {
      setResponseErrors((prev) => ({ ...prev, [inputKey]: "Response cannot be empty" }));
      return;
    }
    try {
      setGlobalLoading(true);
      const res = await addServiceResponse(token, String(service.id), response, threadUserId);
      toast.success(res.message || "Response added successfully");
      setResponseInputs((prev) => ({ ...prev, [inputKey]: "" }));
      setResponseErrors((prev) => ({ ...prev, [inputKey]: "" }));
      await refetch();
    } catch {
      toast.error("Failed to submit response");
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleDeleteResponse = async (responseId: string) => {
    if (!token) return;
    try {
      setDeletingResponse(true);
      const res = await deleteServiceResponse(token, responseId);
      toast.success(res.message || "Response deleted successfully");
      await refetch();
    } catch {
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
        <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50 dark:bg-gray-900 gap-4">
        <p className="text-gray-600 dark:text-gray-300">Service not found</p>
        <Link href="/userMarketplace?tab=Service">
          <span className="px-4 py-2 bg-gold-600 text-gray-900 rounded-md hover:bg-gold-700 transition-colors cursor-pointer">
            Back to Marketplace
          </span>
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{service.name} | PBC Dubai</title>
        <meta name="description" content={service.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto px-4 py-8 pb-12 min-h-screen">
        {/* Breadcrumb */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link href="/userMarketplace?tab=Service">
                <span className="inline-flex items-center text-sm text-gray-700 hover:text-gold-600 dark:text-gray-400 dark:hover:text-white cursor-pointer">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  Services
                </span>
              </Link>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-gray-400 truncate max-w-xs">
                  {service.name}
                </span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Image */}
          <div>
            <div className="relative h-96 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
              {service.primaryImage ? (
                <Image
                  src={service.primaryImage}
                  alt={service.name}
                  layout="fill"
                  objectFit="contain"
                  className="transition-opacity duration-300"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-gold-500 via-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white text-6xl font-bold opacity-30">
                    {service.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                {service.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">Category:</span>
                <span className="bg-gold-100 text-gold-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-gold-900 dark:text-gold-300">
                  {service.serviceCategory.name}
                </span>
                {service.subCategory && (
                  <>
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-amber-900 dark:text-amber-300">
                      {service.subCategory.name}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-400">Brand:</span>
                <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">
                  {service.brand}
                </span>
              </div>

              <div className="prose prose-sm dark:prose-invert mb-6">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {service.description}
                </p>
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500">
                Listed on {formatDateAndTime(service.createdAt)}
              </p>
            </div>

            {/* Provider card */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Provider Information
              </h3>
              <div className="flex items-center">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mr-3 flex-shrink-0">
                  <Image
                    src={service.user.profile?.profilePicture || demoImage}
                    alt={service.user.name}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {service.user.name}
                  </p>
                  <Link href={`/users/${service.user.id}`}>
                    <span className="text-sm text-gold-600 dark:text-gold-400 hover:underline cursor-pointer">
                      View Profile
                    </span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Owner actions */}
            {isOwner && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md transition-colors"
                >
                  Edit Service
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                >
                  Delete Service
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Responses */}
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
                const threadLabel = thread.threadUser?.name || `User #${thread.threadUserId}`;

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
                                setResponseInputs((prev) => ({ ...prev, [threadKey]: value }));
                                if (value.trim().length >= 1) {
                                  setResponseErrors((prev) => ({ ...prev, [threadKey]: "" }));
                                }
                              }}
                              placeholder="Type your response..."
                              rows={3}
                              className={`bg-white dark:bg-gray-700 border ${
                                threadError ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                              } text-gray-800 dark:text-white w-full rounded-lg p-3`}
                            />
                            {threadError && (
                              <p className="text-red-500 text-sm mt-1">{threadError}</p>
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
                      setResponseInputs((prev) => ({ ...prev, [inputKey]: value }));
                      if (value.trim().length >= 1) {
                        setResponseErrors((prev) => ({ ...prev, [inputKey]: "" }));
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
                      onClick={() => handleResponseSubmit(String(user?.id ?? "new"))}
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

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Service</h2>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Service Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Brand <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.brand}
                      onChange={(e) => setEditForm((p) => ({ ...p, brand: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editForm.serviceCategoryId}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          serviceCategoryId: e.target.value,
                          subCategoryId: "",
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    >
                      <option value="">Select a category</option>
                      {serviceCategories.map((cat: any) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Sub Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editForm.subCategoryId}
                      onChange={(e) => setEditForm((p) => ({ ...p, subCategoryId: e.target.value }))}
                      disabled={!selectedCategory}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                    >
                      <option value="">Select a sub category</option>
                      {(selectedCategory?.subCategories || []).map((sub: any) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Image (optional)
                  </label>
                  {service.primaryImage && !editForm.primaryImage && (
                    <div className="relative h-20 w-20 mb-2 rounded overflow-hidden border border-gray-200 dark:border-gray-600">
                      <Image src={service.primaryImage} alt="Current" layout="fill" objectFit="cover" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, primaryImage: e.target.files?.[0] || null }))
                    }
                    className="w-full text-sm text-gray-500 dark:text-gray-400"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-gray-900 font-medium rounded-md transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Service"
        message="Are you sure you want to delete this service? This action cannot be undone."
        confirmText="Delete"
        confirmColor="red"
        isProcessing={isDeletingService}
      />
      <ConfirmationModal
        show={showDeleteResponseModal}
        onClose={() => {
          setShowDeleteResponseModal(false);
          setResponseToDelete(null);
        }}
        onConfirm={() => {
          if (responseToDelete) handleDeleteResponse(responseToDelete);
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
