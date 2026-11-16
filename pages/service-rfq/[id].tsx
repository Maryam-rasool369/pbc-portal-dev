"use client";

import React, { useState, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import {
  useQuery,
  useMutation,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";
import UniversalFormModal from "@/components/modals/UniversalFormModal";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import Can from "@/components/rbac/Can";
import CurrencyAmount from "@/components/ui/CurrencyAmount";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import { HiUserCircle } from "react-icons/hi";
import {
  fetchServiceRFQDetail,
  updateServiceRFQ,
  deleteServiceRFQ,
  awardServiceQuote,
} from "@/services/serviceRfqs";
import { fetchServiceCategories } from "@/services/serviceCategories";
import {
  addServiceQuote,
  updateServiceQuote,
  deleteServiceQuote,
  addServiceQuoteResponse,
  deleteServiceQuoteResponse,
  ServiceQuotePayload,
} from "@/services/serviceQuote";
import type { ServiceRFQ, NewServiceQuoteData, ServiceQuote } from "@/types/marketplace";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function ServiceRFQDetailWithQueryClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <ServiceRFQDetail />
    </QueryClientProvider>
  );
}

function ServiceRFQDetail() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<ServiceRFQ | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [serviceCategories, setServiceCategories] = useState<any[]>([]);

  // Quote state
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [newQuote, setNewQuote] = useState<NewServiceQuoteData>({
    price: null,
    description: "",
    timeline: "",
    termsAndConditions: "",
  });
  const [primaryImageFile, setPrimaryImageFile] = useState<File | null>(null);
  const [secondaryImageFile, setSecondaryImageFile] = useState<File | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [isConfirmAwardOpen, setIsConfirmAwardOpen] = useState(false);

  // Edit quote state
  const [showEditQuoteModal, setShowEditQuoteModal] = useState(false);
  const [editQuoteData, setEditQuoteData] = useState<{
    id: number;
    price: number;
    description: string;
    termsAndConditions: string;
  } | null>(null);

  // Delete quote state
  const [showDeleteQuoteModal, setShowDeleteQuoteModal] = useState(false);
  const [deletingQuote, setDeletingQuote] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<number | null>(null);

  // Response (chat) state
  const [activeQuoteId, setActiveQuoteId] = useState<number | null>(null);
  const [quoteResponse, setQuoteResponse] = useState("");
  const [quoteResponseError, setQuoteResponseError] = useState("");
  const [showDeleteResponseModal, setShowDeleteResponseModal] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null);
  const [deletingResponse, setDeletingResponse] = useState(false);

  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["service-rfq", id],
    queryFn: () => fetchServiceRFQDetail(token || "", id || ""),
    enabled: !!id && !!token,
  });

  const submitQuoteMutation = useMutation({
    mutationFn: async (quoteData: NewServiceQuoteData) => {
      if (!id || !token) throw new Error("Not authenticated");
      return await addServiceQuote(token, {
        serviceRfqId: id.toString(),
        ...quoteData,
        price: quoteData.price!,
        timeline: quoteData.timeline.split("T")[0],
        primaryImage: primaryImageFile ?? undefined,
        secondaryImage: secondaryImageFile ?? undefined,
      } as ServiceQuotePayload);
    },
    onSuccess: () => {
      toast.success("Quote submitted successfully");
      setIsQuoteModalOpen(false);
      resetQuoteForm();
      refetch();
    },
    onError: (error) => {
      toast.error((error as Error).message || "Failed to submit quote");
    },
  });

  const updateQuoteMutation = useMutation({
    mutationFn: (data: {
      serviceQuoteId: number;
      price: number;
      description: string;
      termsAndConditions: string;
    }) =>
      updateServiceQuote(token || "", data.serviceQuoteId, {
        price: data.price,
        description: data.description,
        termsAndConditions: data.termsAndConditions,
      }),
    onSuccess: () => {
      toast.success("Quote updated successfully");
      setShowEditQuoteModal(false);
      refetch();
    },
    onError: (error) => {
      toast.error((error as Error).message || "Failed to update quote");
    },
  });

  const awardQuoteMutation = useMutation({
    mutationFn: (serviceQuoteId: number) =>
      awardServiceQuote(token || "", id || "", serviceQuoteId),
    onSuccess: () => {
      toast.success("Quote awarded successfully");
      refetch();
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  useEffect(() => {
    if (response?.data?.primaryImage) {
      setSelectedImage(response.data.primaryImage);
    }
  }, [response]);

  useEffect(() => {
    if (error) toast.error((error as Error).message);
  }, [error]);

  useEffect(() => {
    if (!token) return;
    fetchServiceCategories(token, 1, 100)
      .then((res) => setServiceCategories(res.data || []))
      .catch(() => {});
  }, [token]);

  const resetQuoteForm = () => {
    setNewQuote({ price: 0, description: "", timeline: new Date().toISOString().split("T")[0], termsAndConditions: "" });
    setPrimaryImageFile(null);
    setSecondaryImageFile(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData || !token) return;

    const formData = new FormData();
    if (editFormData.title) formData.append("title", editFormData.title);
    if (editFormData.description) formData.append("description", editFormData.description);
    if (editFormData.serviceCategoryId) formData.append("serviceCategoryId", String(editFormData.serviceCategoryId));
    if (editFormData.subCategoryId) formData.append("subCategoryId", String(editFormData.subCategoryId));
    if (editFormData.budget) formData.append("budget", String(editFormData.budget));
    if (editFormData.deadline) formData.append("deadline", editFormData.deadline.split("T")[0]);
    if (editFormData.primaryImage instanceof File) formData.append("primaryImage", editFormData.primaryImage);
    if (editFormData.secondaryImage instanceof File) formData.append("secondaryImage", editFormData.secondaryImage);

    try {
      await updateServiceRFQ(token, editFormData.id, formData);
      toast.success("Service RFQ updated successfully");
      setIsEditModalOpen(false);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update Service RFQ");
    }
  };

  const handleDelete = async () => {
    if (!token || !serviceRfq?.id) return;
    setDeleting(true);
    try {
      await deleteServiceRFQ(token, serviceRfq.id);
      toast.success("Service RFQ deleted successfully");
      router.push("/userMarketplace");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete Service RFQ");
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleDeleteQuote = async () => {
    if (!token || !quoteToDelete) return;
    setDeletingQuote(true);
    try {
      const res = await deleteServiceQuote(token, quoteToDelete);
      toast.success(res.message || "Quote deleted successfully");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete quote");
    } finally {
      setDeletingQuote(false);
      setShowDeleteQuoteModal(false);
      setQuoteToDelete(null);
    }
  };

  const handleQuoteResponseSubmit = async (serviceQuoteId: number) => {
    if (!quoteResponse.trim()) {
      setQuoteResponseError("Response cannot be empty");
      return;
    }
    try {
      await addServiceQuoteResponse(token || "", serviceQuoteId, quoteResponse);
      toast.success("Response added successfully");
      setQuoteResponse("");
      setQuoteResponseError("");
      refetch();
    } catch (err) {
      toast.error("Failed to submit response");
    }
  };

  const handleDeleteQuoteResponse = async (responseId: string) => {
    if (!token) return;
    setDeletingResponse(true);
    try {
      const res = await deleteServiceQuoteResponse(token, responseId);
      toast.success(res.message || "Response deleted successfully");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete response");
    } finally {
      setDeletingResponse(false);
      setShowDeleteResponseModal(false);
      setResponseToDelete(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "CLOSED": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "AWARDED": return "bg-gold-100 text-gold-800 dark:bg-gold-900 dark:text-gold-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const serviceRfq: ServiceRFQ | undefined = response?.data;

  if (!serviceRfq) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">Service RFQ not found</p>
        <Link href="/userMarketplace">
          <div className="px-4 py-2 bg-gold-600 text-white rounded-md hover:bg-gold-700 transition-colors">
            Return to Marketplace
          </div>
        </Link>
      </div>
    );
  }

  const isOwner = user && Number(user.id) === Number(serviceRfq.userId);
  const quotes: ServiceQuote[] = serviceRfq.serviceQuotes ?? [];
  const hasSubmittedQuote = user && quotes.some((q) => Number(q.userId) === Number(user.id));
  const canSubmitQuote = !isOwner && serviceRfq.status === "OPEN" && !hasSubmittedQuote;

  const selectedServiceCategory = serviceCategories.find(
    (c) => c.id === editFormData?.serviceCategoryId
  );

  return (
    <>
      <Head>
        <title>{serviceRfq.title} - Service RFQ - PBC Dubai</title>
        <meta name="description" content={serviceRfq.description.substring(0, 160)} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="flex mb-8 text-sm">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link href="/userMarketplace">
                  <div className="text-gray-700 dark:text-gray-300 hover:text-gold-600 dark:hover:text-gold-400">
                    Marketplace
                  </div>
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-1 text-gray-500 dark:text-gray-400 md:ml-2">Service RFQs</span>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-1 text-gray-500 dark:text-gray-400 md:ml-2 font-medium truncate max-w-xs">
                    {serviceRfq.title}
                  </span>
                </div>
              </li>
            </ol>
          </nav>

          {/* Main card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-8">
            <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div className="flex items-center gap-4 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                    {serviceRfq.title}
                  </h1>
                  {hasSubmittedQuote && !isOwner && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gold-100 text-gold-800 dark:bg-gold-900 dark:text-gold-200">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11.414V5a1 1 0 10-2 0v1.586A2 2 0 008 9v3a2 2 0 104 0V9a2 2 0 00-1-1.414zM10 13a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd" />
                      </svg>
                      Quote Submitted
                    </span>
                  )}
                </div>
                <span className={`mt-2 md:mt-0 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(serviceRfq.status)}`}>
                  {serviceRfq.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: images + related service */}
                <div>
                  <div className="relative h-64 md:h-80 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-4">
                    {selectedImage ? (
                      <Image
                        src={selectedImage}
                        alt={serviceRfq.title}
                        layout="fill"
                        objectFit="contain"
                        className="transition-opacity duration-300"
                        priority
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <svg className="w-16 h-16 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {serviceRfq.primaryImage && serviceRfq.secondaryImage && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div
                        className={`relative h-20 bg-gray-200 dark:bg-gray-700 rounded cursor-pointer border-2 ${selectedImage === serviceRfq.primaryImage ? "border-gold-500" : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"}`}
                        onClick={() => setSelectedImage(serviceRfq.primaryImage)}
                      >
                        <Image src={serviceRfq.primaryImage} alt={`${serviceRfq.title} - Main`} layout="fill" objectFit="cover" className="rounded" />
                      </div>
                      <div
                        className={`relative h-20 bg-gray-200 dark:bg-gray-700 rounded cursor-pointer border-2 ${selectedImage === serviceRfq.secondaryImage ? "border-gold-500" : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"}`}
                        onClick={() => setSelectedImage(serviceRfq.secondaryImage!)}
                      >
                        <Image src={serviceRfq.secondaryImage!} alt={`${serviceRfq.title} - Secondary`} layout="fill" objectFit="cover" className="rounded" />
                      </div>
                    </div>
                  )}

                  {serviceRfq.service && (
                    <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
                      <div className="p-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Related Service</h3>
                        <Link href={`/service/${serviceRfq.service.id}`}>
                          <div className="flex items-center gap-3 group cursor-pointer">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center">
                              <svg className="w-5 h-5 text-gold-600 dark:text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <span className="text-gold-600 dark:text-gold-400 group-hover:text-gold-700 dark:group-hover:text-gold-300 font-medium">
                              {serviceRfq.service.name}
                            </span>
                          </div>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: details */}
                <div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Service Category</p>
                      <p className="font-medium text-gray-900 dark:text-white">{serviceRfq.serviceCategory?.name ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Sub Category</p>
                      <p className="font-medium text-gray-900 dark:text-white">{serviceRfq.subCategory?.name ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Budget</p>
                      <p className="font-medium text-gray-900 dark:text-white"><CurrencyAmount amount={serviceRfq.budget} /></p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Deadline</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatDateAndTime(serviceRfq.deadline, true, true)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Posted</p>
                      <p className="font-medium text-gray-900 dark:text-white">{formatDateAndTime(serviceRfq.createdAt, true)}</p>
                    </div>
                  </div>

                  <div className="mb-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Description</p>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{serviceRfq.description}</p>
                  </div>

                  <Can I="create" a="ServiceQuote">
                    {canSubmitQuote && (
                      <button
                        onClick={() => setIsQuoteModalOpen(true)}
                        className="w-full py-3 px-4 bg-gold-600 hover:bg-gold-700 text-white font-medium rounded-md transition-colors"
                      >
                        Submit Quote
                      </button>
                    )}
                  </Can>

                  {hasSubmittedQuote && (
                    <div className="p-4 bg-gold-50 dark:bg-gold-900/30 rounded-md">
                      <p className="text-gold-800 dark:text-gold-200 font-semibold flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11.414V5a1 1 0 10-2 0v1.586A2 2 0 008 9v3a2 2 0 104 0V9a2 2 0 00-1-1.414zM10 13a1 1 0 110-2 1 1 0 010 2z" clipRule="evenodd" />
                        </svg>
                        You have already submitted a quote for this Service RFQ.
                      </p>
                    </div>
                  )}

                  {isOwner && serviceRfq.status === "OPEN" && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => { setEditFormData(serviceRfq); setIsEditModalOpen(true); }}
                        className="w-full py-3 px-4 bg-gold-600 hover:bg-gold-700 text-white font-medium rounded-md transition-colors"
                      >
                        Edit Service RFQ
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors"
                      >
                        Delete Service RFQ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quotes section */}
          {(isOwner || hasSubmittedQuote) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mt-8">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Quotes</h2>

                {user && quotes.length > 0 ? (
                  <div className="space-y-8">
                    {quotes.map((quote: ServiceQuote) => {
                      const canViewQuote = isOwner || Number(quote.userId) === Number(user.id);
                      if (!canViewQuote) return null;

                      return (
                        <div
                          key={quote.id}
                          className={`border ${quote.isAwarded ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20" : "border-gray-200 dark:border-gray-700"} rounded-lg p-4 md:p-6`}
                        >
                          <div className="flex flex-col md:flex-row justify-between mb-4">
                            <div className="mb-3 md:mb-0">
                              <div className="flex items-center">
                                <svg className="h-10 w-10 text-gray-400 dark:text-gray-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 005 10a6 6 0 0012 0c0-.352-.035-.696-.1-1.028A5 5 0 0010 11z" clipRule="evenodd" />
                                </svg>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{quote.user.name}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Submitted on {formatDateAndTime(quote.createdAt, true)}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col items-start md:items-end">
                              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                <CurrencyAmount amount={quote.price} />
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Timeline: {formatDateAndTime(quote.timeline, true)}
                              </p>
                              {quote.isAwarded && (
                                <span className="mt-2 px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs font-medium">
                                  Awarded
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</p>
                              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">{quote.description}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Terms and Conditions</p>
                              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">{quote.termsAndConditions}</p>
                            </div>
                          </div>

                          {quote.primaryImage && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Images</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div className="relative h-32 bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden">
                                  <Image src={quote.primaryImage || "/placeholder.svg"} alt={`Quote image from ${quote.user.name}`} layout="fill" objectFit="cover" />
                                </div>
                                {quote.secondaryImage && (
                                  <div className="relative h-32 bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden">
                                    <Image src={quote.secondaryImage || "/placeholder.svg"} alt={`Secondary quote image from ${quote.user.name}`} layout="fill" objectFit="cover" />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Responses / Chat */}
                          <div className="mt-6">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Responses</h3>
                              <button
                                onClick={() => setActiveQuoteId(activeQuoteId === quote.id ? null : quote.id)}
                                className="text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-300 text-sm flex items-center"
                              >
                                {activeQuoteId === quote.id ? "Hide Responses" : "Show Responses"}
                                <svg
                                  className={`ml-1 w-4 h-4 transition-transform ${activeQuoteId === quote.id ? "rotate-180" : ""}`}
                                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>

                            {activeQuoteId === quote.id && (
                              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                {quote.responses && quote.responses.length > 0 ? (
                                  <div className="space-y-4 mb-6">
                                    {quote.responses.map((resp) => (
                                      <div
                                        key={resp.id}
                                        className="bg-white dark:bg-gray-800 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group border border-gray-200 dark:border-gray-600"
                                      >
                                        <div className="flex items-start">
                                          <div className="mr-3 mt-1">
                                            {/* @ts-ignore */}
                                            <HiUserCircle className="h-8 w-8 text-gray-400" />
                                          </div>
                                          <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                              <span className="font-medium text-gray-800 dark:text-white">{resp.user.name}</span>
                                              {resp.user?.Role?.name && (
                                                <span className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 text-xs font-medium px-2 py-0.5 rounded">
                                                  {resp.user.Role.name}
                                                </span>
                                              )}
                                              <span className="text-gray-500 dark:text-gray-400 text-xs">
                                                {formatDateAndTime(resp.createdAt, true)}
                                              </span>
                                              {Number(resp.user.id) === Number(user?.id) && serviceRfq.status === "OPEN" && (
                                                <button
                                                  onClick={() => { setResponseToDelete(resp.id); setShowDeleteResponseModal(true); }}
                                                  className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                  Delete
                                                </button>
                                              )}
                                            </div>
                                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{resp.response}</p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-gray-500 dark:text-gray-400 italic mb-4">No responses yet for this quote.</p>
                                )}

                                {serviceRfq.status === "OPEN" && (isOwner || Number(quote.userId) === Number(user.id)) && (
                                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                    <h4 className="font-medium text-gray-800 dark:text-gold-500 text-sm mb-3">Add a response</h4>
                                    <div className="flex">
                                      <div className="mr-3 mt-1">
                                        {/* @ts-ignore */}
                                        <HiUserCircle className="h-8 w-8 text-gray-400" />
                                      </div>
                                      <div className="flex-1">
                                        <textarea
                                          value={activeQuoteId === quote.id ? quoteResponse : ""}
                                          onChange={(e) => {
                                            setQuoteResponse(e.target.value);
                                            if (e.target.value.trim().length >= 1) setQuoteResponseError("");
                                          }}
                                          placeholder="Type your response..."
                                          rows={2}
                                          className={`bg-white dark:bg-gray-700 border ${quoteResponseError && activeQuoteId === quote.id ? "border-red-500" : "border-gray-300 dark:border-gray-600"} text-gray-800 dark:text-white w-full rounded-lg p-2 text-sm`}
                                        />
                                        {quoteResponseError && activeQuoteId === quote.id && (
                                          <p className="text-red-500 text-xs mt-1">{quoteResponseError}</p>
                                        )}
                                        <div className="mt-2 flex justify-end">
                                          <button
                                            onClick={() => handleQuoteResponseSubmit(quote.id)}
                                            className="px-3 py-1 text-sm bg-gold-600 hover:bg-gold-700 text-white rounded transition-colors"
                                          >
                                            Post Response
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Quote actions */}
                          <div className="mt-4 flex justify-end gap-2">
                            {Number(quote.userId) === Number(user?.id) && serviceRfq.status === "OPEN" && (
                              <button
                                onClick={() => {
                                  setEditQuoteData({ id: quote.id, price: quote.price, description: quote.description, termsAndConditions: quote.termsAndConditions });
                                  setShowEditQuoteModal(true);
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
                              >
                                Edit Quote
                              </button>
                            )}

                            {Number(quote.userId) === Number(user?.id) && serviceRfq.status === "OPEN" && !quote.isAwarded && (
                              <button
                                onClick={() => { setQuoteToDelete(quote.id); setShowDeleteQuoteModal(true); }}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors"
                              >
                                Delete Quote
                              </button>
                            )}

                            {isOwner && serviceRfq.status === "OPEN" && !quote.isAwarded && (
                              <button
                                onClick={() => { setSelectedQuoteId(quote.id); setIsConfirmAwardOpen(true); }}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
                                disabled={awardQuoteMutation.isPending}
                              >
                                {awardQuoteMutation.isPending ? "Awarding..." : "Award Quote"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No quotes have been submitted for this Service RFQ yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit quote modal */}
      {isQuoteModalOpen && (
        <UniversalFormModal
          title="Submit Quote"
          isOpen={isQuoteModalOpen}
          onClose={() => setIsQuoteModalOpen(false)}
          onSubmit={(e) => { e.preventDefault(); submitQuoteMutation.mutate(newQuote); }}
          isSubmitting={submitQuoteMutation.isPending}
          fields={[
            {
              id: "price",
              label: "Quoted Price",
              type: "number",
              value: newQuote.price,
              onChange: (e) => setNewQuote((prev) => ({ ...prev, price: parseFloat(e.target.value) })),
              className: "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            },
            {
              id: "timeline",
              label: "Estimated Delivery Date",
              type: "date",
              value: newQuote.timeline.split("T")[0],
              onChange: (e) => setNewQuote((prev) => ({ ...prev, timeline: new Date(e.target.value).toISOString() })),
            },
            {
              id: "description",
              label: "Detailed Quote Description",
              type: "textarea",
              value: newQuote.description,
              onChange: (e) => setNewQuote((prev) => ({ ...prev, description: e.target.value })),
            },
            {
              id: "termsAndConditions",
              label: "Terms & Conditions of Your Offer",
              type: "textarea",
              value: newQuote.termsAndConditions,
              onChange: (e) => setNewQuote((prev) => ({ ...prev, termsAndConditions: e.target.value })),
            },
            {
              id: "primaryImage",
              label: "Primary Reference Image (optional)",
              type: "file",
              onChange: (e) => { const file = e.target.files?.[0]; if (file) setPrimaryImageFile(file); },
              value: undefined,
            },
            {
              id: "secondaryImage",
              label: "Additional Reference Image (optional)",
              type: "file",
              onChange: (e) => { const file = e.target.files?.[0]; if (file) setSecondaryImageFile(file); },
              value: undefined,
            },
          ]}
        />
      )}

      {/* Edit quote modal */}
      {showEditQuoteModal && editQuoteData && (
        <UniversalFormModal
          title="Edit Quote"
          isOpen={showEditQuoteModal}
          onClose={() => { setShowEditQuoteModal(false); setEditQuoteData(null); }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!editQuoteData) return;
            updateQuoteMutation.mutate({ serviceQuoteId: editQuoteData.id, price: editQuoteData.price, description: editQuoteData.description, termsAndConditions: editQuoteData.termsAndConditions });
          }}
          isSubmitting={updateQuoteMutation.isPending}
          fields={[
            {
              id: "price",
              label: "Price",
              type: "number",
              value: editQuoteData.price,
              onChange: (e) => setEditQuoteData((prev) => ({ ...prev!, price: parseFloat(e.target.value) })),
            },
            {
              id: "description",
              label: "Description",
              type: "textarea",
              value: editQuoteData.description,
              onChange: (e) => setEditQuoteData((prev) => ({ ...prev!, description: e.target.value })),
            },
            {
              id: "termsAndConditions",
              label: "Terms and Conditions",
              type: "textarea",
              value: editQuoteData.termsAndConditions,
              onChange: (e) => setEditQuoteData((prev) => ({ ...prev!, termsAndConditions: e.target.value })),
            },
          ]}
        />
      )}

      {/* Edit Service RFQ modal */}
      {isEditModalOpen && editFormData && (
        <UniversalFormModal
          title="Edit Service RFQ"
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleEditSubmit}
          isSubmitting={false}
          fields={[
            { id: "title", label: "Title", type: "text", value: editFormData.title, onChange: (e) => setEditFormData((prev) => ({ ...prev!, title: e.target.value })) },
            { id: "description", label: "Description", type: "textarea", value: editFormData.description, onChange: (e) => setEditFormData((prev) => ({ ...prev!, description: e.target.value })) },
            { id: "budget", label: "Budget", type: "number", value: editFormData.budget, onChange: (e) => setEditFormData((prev) => ({ ...prev!, budget: parseFloat(e.target.value) })) },
            { id: "deadline", label: "Deadline", type: "date", value: editFormData.deadline.split("T")[0], onChange: (e) => setEditFormData((prev) => ({ ...prev!, deadline: new Date(e.target.value).toISOString() })) },
            {
              id: "serviceCategoryId", label: "Service Category", type: "select",
              value: editFormData.serviceCategoryId,
              onChange: (e) => setEditFormData((prev) => ({ ...prev!, serviceCategoryId: Number(e.target.value), subCategoryId: undefined as any })),
              options: serviceCategories.map((c) => ({ value: c.id, label: c.name })),
            },
            {
              id: "subCategoryId", label: "Sub Category", type: "select",
              value: editFormData.subCategoryId ?? "",
              onChange: (e) => setEditFormData((prev) => ({ ...prev!, subCategoryId: Number(e.target.value) })),
              options: (selectedServiceCategory?.subCategories || []).map((s: any) => ({ value: s.id, label: s.name })),
            },
            { id: "primaryImage", label: "Primary Image", type: "file", onChange: (e) => { const file = e.target.files?.[0]; if (file) setEditFormData((prev) => ({ ...prev!, primaryImage: file as any })); }, value: undefined },
            { id: "secondaryImage", label: "Secondary Image", type: "file", onChange: (e) => { const file = e.target.files?.[0]; if (file) setEditFormData((prev) => ({ ...prev!, secondaryImage: file as any })); }, value: undefined },
          ]}
        />
      )}

      {/* Award confirmation */}
      {isConfirmAwardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Confirm Award</h2>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to award this quote? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setIsConfirmAwardOpen(false)}
                className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedQuoteId !== null) awardQuoteMutation.mutate(selectedQuoteId);
                  setIsConfirmAwardOpen(false);
                }}
                className="px-4 py-2 rounded bg-[#BF9B30] text-white hover:bg-[#a88824]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        show={showDeleteResponseModal}
        onClose={() => { setShowDeleteResponseModal(false); setResponseToDelete(null); }}
        onConfirm={() => { if (responseToDelete) handleDeleteQuoteResponse(responseToDelete); }}
        title="Delete Response"
        message="Are you sure you want to delete this response? This action cannot be undone."
        confirmText="Delete"
        confirmColor="red"
        isProcessing={deletingResponse}
      />

      <ConfirmationModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Service RFQ"
        message="Are you sure you want to delete this Service RFQ? This will remove all associated quotes and responses."
        confirmText="Delete"
        confirmColor="red"
        isProcessing={deleting}
      />

      <ConfirmationModal
        show={showDeleteQuoteModal}
        onClose={() => { setShowDeleteQuoteModal(false); setQuoteToDelete(null); }}
        onConfirm={handleDeleteQuote}
        title="Delete Quote"
        message="Are you sure you want to delete this quote? This will remove all associated responses."
        confirmText="Delete"
        confirmColor="red"
        isProcessing={deletingQuote}
      />
    </>
  );
}
