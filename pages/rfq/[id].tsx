"use client";

import React from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import useAuthStore from "@/store/authStore";
import UniversalFormModal from "@/components/modals/UniversalFormModal";
import Can from "@/components/rbac/Can";
import RelatedProduct from "@/components/RelatedProduct";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import {
  useQuery,
  useMutation,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { awardQuote, deleteRFQ, fetchRFQDetail, updateRFQ } from "@/services/rfqs";
import CurrencyAmount from "@/components/ui/CurrencyAmount";
import {
  addQuote,
  QuotePayload,
  updateQuote,
  addQuoteResponse,
  deleteQuoteResponse,
  deleteQuote,
} from "@/services/quote";
import type { RFQ, NewQuoteData, Quote } from "@/types/marketplace";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import { HiUserCircle } from "react-icons/hi";

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

export default function RFQDetailWithQueryClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <RFQDetail />
    </QueryClientProvider>
  );
}

function RFQDetail() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<RFQ | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [showEditQuoteModal, setShowEditQuoteModal] = useState(false);
  const [editQuoteData, setEditQuoteData] = useState<{
    id: number;
    price: number;
    description: string;
    termsAndConditions: string;
  } | null>(null);
  const [newQuote, setNewQuote] = useState<NewQuoteData>({
    price: null,
    description: "",
    timeline: "",
    termsAndConditions: "",
  });
  const [primaryImageFile, setPrimaryImageFile] = useState<File | null>(null);
  const [secondaryImageFile, setSecondaryImageFile] = useState<File | null>(
    null
  );
  const [primaryImagePreview, setPrimaryImagePreview] = useState<string | null>(
    null
  );
  const [secondaryImagePreview, setSecondaryImagePreview] = useState<
    string | null
  >(null);
  const [activeQuoteId, setActiveQuoteId] = useState<number | null>(null);
  const [quoteResponse, setQuoteResponse] = useState("");
  const [quoteResponseError, setQuoteResponseError] = useState("");
  const [showDeleteResponseModal, setShowDeleteResponseModal] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null);
  const [deletingResponse, setDeletingResponse] = useState(false);
  const [showDeleteRfqModal, setShowDeleteRfqModal] = useState(false);
  const [deletingRfq, setDeletingRfq] = useState(false);
  const [showDeleteQuoteModal, setShowDeleteQuoteModal] = useState(false);
  const [deletingQuote, setDeletingQuote] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<number | null>(null);

  const {
    data: rfqResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["rfq", id],
    queryFn: () => fetchRFQDetail(token || "", id || ""),
    enabled: !!id && !!token,
  });

  const updateQuoteMutation = useMutation({
    mutationFn: (data: {
      quoteId: number;
      price: number;
      description: string;
      termsAndConditions: string;
    }) =>
      updateQuote(token || "", data.quoteId, {
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
    mutationFn: (quoteId: number) => awardQuote(token || "", id || "", quoteId),
    onSuccess: () => {
      toast.success("Quote awarded successfully");
      refetch();
    },
    onError: (error) => {
      toast.error((error as Error).message);
    },
  });

  const submitQuoteMutation = useMutation({
    mutationFn: async (quoteData: NewQuoteData) => {
      if (!id || !token) throw new Error("Not authenticated");

      const formattedQuoteData = {
        ...quoteData,
        timeline: quoteData.timeline.split("T")[0],
      };

      return await addQuote(token, {
        rfqId: id.toString(),
        ...formattedQuoteData,
        primaryImage: primaryImageFile ?? undefined,
        secondaryImage: secondaryImageFile ?? undefined,
      } as QuotePayload);
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

  useEffect(() => {
    if (rfqResponse?.data) {
      setSelectedImage(rfqResponse.data.primaryImage);
    }
  }, [rfqResponse]);

  useEffect(() => {
    if (error) {
      toast.error((error as Error).message);
      if ((error as Error).message.includes("not authenticated")) {
        router.push("/");
      }
    }
  }, [error, router]);

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "primary" | "secondary"
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (type === "primary") {
        setPrimaryImageFile(file);
        setPrimaryImagePreview(URL.createObjectURL(file));
      } else {
        setSecondaryImageFile(file);
        setSecondaryImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleEditRFQSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editFormData || !token) return;

    const formattedDeadline = new Date(editFormData.deadline)
      .toISOString()
      .split("T")[0];

    const formData = new FormData();
    if (editFormData.title) formData.append("title", editFormData.title);
    if (editFormData.description)
      formData.append("description", editFormData.description);
    if (editFormData.categoryName)
      formData.append("categoryName", editFormData.categoryName);
    if (editFormData.quantity)
      formData.append("quantity", String(editFormData.quantity));
    if (editFormData.budget)
      formData.append("budget", String(editFormData.budget));
    if (formattedDeadline) formData.append("deadline", formattedDeadline);
    if (editFormData.status) formData.append("status", editFormData.status);

    if (editFormData.primaryImage instanceof File) {
      formData.append("primaryImage", editFormData.primaryImage);
    }

    if (editFormData.secondaryImage instanceof File) {
      formData.append("secondaryImage", editFormData.secondaryImage);
    }
    try {
      await updateRFQ(token, editFormData.id, formData);
      toast.success("RFQ updated successfully");
      setIsEditModalOpen(false);
      refetch();
    } catch (err: any) {
      console.error("🚨 Update RFQ error:", err);
      toast.error(err.message || "Failed to update RFQ");
    }
  };

  const resetQuoteForm = () => {
    setNewQuote({
      price: 0,
      description: "",
      timeline: new Date().toISOString().split("T")[0],
      termsAndConditions: "",
    });
    setPrimaryImageFile(null);
    setSecondaryImageFile(null);
    setPrimaryImagePreview(null);
    setSecondaryImagePreview(null);
  };

  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    submitQuoteMutation.mutate(newQuote);
  };
  const handleAwardQuote = (quoteId: number) => {
    setSelectedQuoteId(quoteId);
    setIsConfirmModalOpen(true);
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "CLOSED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "AWARDED":
        return "bg-gold-100 text-gold-800 dark:bg-gold-900 dark:text-gold-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const handleQuoteResponseSubmit = async (quoteId: number) => {
    if (!quoteResponse.trim()) {
      setQuoteResponseError("Response cannot be empty");
      return;
    }

    if (quoteResponse.trim().length < 1) {
      setQuoteResponseError("Response must be at least 1 character long");
      return;
    }

    try {
      await addQuoteResponse(token || "", quoteId, quoteResponse);
      toast.success("Response added successfully");
      setQuoteResponse("");
      setQuoteResponseError("");
      refetch();
    } catch (error) {
      console.error("Failed to submit response:", error);
      toast.error("Failed to submit response");
    }
  };

  const handleDeleteQuoteResponse = async (responseId: string) => {
    if (!token) return;
    setDeletingResponse(true);

    try {
      const res = await deleteQuoteResponse(token, responseId);
      toast.success(res.message || "Response deleted successfully");
      refetch();
    } catch (error: any) {
      console.error("Failed to delete response:", error);
      toast.error(error.message || "Failed to delete response");
    } finally {
      setDeletingResponse(false);
      setShowDeleteResponseModal(false);
      setResponseToDelete(null);
    }
  };

  const handleDeleteRfq = async () => {
    if (!token || !rfq?.id) return;
    setDeletingRfq(true);

    try {
      const res = await deleteRFQ(token, rfq.id);
      toast.success(res.message || "RFQ deleted successfully");
      router.push("/rfqList");
    } catch (error: any) {
      console.error("Failed to delete RFQ:", error);
      toast.error(error.message || "Failed to delete RFQ");
    } finally {
      setDeletingRfq(false);
      setShowDeleteRfqModal(false);
    }
  };

  const handleDeleteQuote = async () => {
    if (!token || !quoteToDelete) return;
    setDeletingQuote(true);

    try {
      const res = await deleteQuote(token, quoteToDelete);
      toast.success(res.message || "Quote deleted successfully");
      refetch();
    } catch (error: any) {
      console.error("Failed to delete quote:", error);
      toast.error(error.message || "Failed to delete quote");
    } finally {
      setDeletingQuote(false);
      setShowDeleteQuoteModal(false);
      setQuoteToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const rfq = rfqResponse && {
    ...rfqResponse.data,
  };

  if (!rfq) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
          RFQ not found
        </p>
        <Link href="/marketplace">
          <div className="px-4 py-2 bg-gold-600 text-white rounded-md hover:bg-gold-700 transition-colors">
            Return to Marketplace
          </div>
        </Link>
      </div>
    );
  }

  const isRfqOwner = rfq && user && user.id === rfq.userId;
  const hasSubmittedQuote =
    user &&
    rfq.quotes.some((quote: Quote) => Number(quote.userId) === Number(user.id));
  const canSubmitQuote =
    !isRfqOwner && rfq.status === "OPEN" && !hasSubmittedQuote;

  return (
    <>
      <Head>
        <title>{rfq.title} - RFQ Details - PBC Dubai</title>
        <meta name="description" content={rfq.description.substring(0, 160)} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="bg-gray-50 dark:bg-gray-900 py-8">
        <div className="container mx-auto px-4">
          <nav className="flex mb-8 text-sm">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <Link href="/userMarketplace">
                  <div className="text-gray-700 dark:text-gray-300 hover:text-gold-600 dark:hover:text-gold-400">
                    Home
                  </div>
                </Link>
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
                  <Link href="/marketplace">
                    <div className="ml-1 text-gray-700 dark:text-gray-300 hover:text-gold-600 dark:hover:text-gold-400 md:ml-2">
                      Marketplace
                    </div>
                  </Link>
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
                  <Link href="/rfqList">
                    <div className="ml-1 text-gray-700 dark:text-gray-300 hover:text-gold-600 dark:hover:text-gold-400 md:ml-2">
                     Product RFQs
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
                  <span className="ml-1 text-gray-500 dark:text-gray-400 md:ml-2 font-medium truncate max-w-xs">
                    {rfq.title}
                  </span>
                </div>
              </li>
            </ol>
          </nav>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mb-8">
            <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div className="flex items-center gap-4 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                    {rfq.title}
                  </h1>

                  {hasSubmittedQuote && !isRfqOwner && (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gold-100 text-gold-800 dark:bg-gold-900 dark:text-gold-200">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11.414V5a1 1 0 10-2 0v1.586A2 2 0 008 9v3a2 2 0 104 0V9a2 2 0 00-1-1.414zM10 13a1 1 0 110-2 1 1 0 010 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Quote Submitted
                    </span>
                  )}
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    rfq.status
                  )}`}
                >
                  {rfq.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="relative h-64 md:h-80 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-4">
                    {selectedImage && (
                      <Image
                        src={selectedImage || "/placeholder.svg"}
                        alt={rfq.title}
                        layout="fill"
                        objectFit="contain"
                        className="transition-opacity duration-300"
                        priority={true}
                      />
                    )}
                  </div>

                  {rfq.secondaryImage && (
                    <div className="grid grid-cols-2 gap-2">
                      <div
                        className={`relative h-20 bg-gray-200 dark:bg-gray-700 rounded cursor-pointer border-2 ${
                          selectedImage === rfq.primaryImage
                            ? "border-gold-500"
                            : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                        onClick={() => setSelectedImage(rfq.primaryImage)}
                      >
                        <Image
                          src={rfq.primaryImage || "/placeholder.svg"}
                          alt={`${rfq.title} - Main`}
                          layout="fill"
                          objectFit="cover"
                          className="rounded"
                        />
                      </div>
                      <div
                        className={`relative h-20 bg-gray-200 dark:bg-gray-700 rounded cursor-pointer border-2 ${
                          selectedImage === rfq.secondaryImage
                            ? "border-gold-500"
                            : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                        onClick={() => setSelectedImage(rfq.secondaryImage)}
                      >
                        <Image
                          src={rfq.secondaryImage || "/placeholder.svg"}
                          alt={`${rfq.title} - Secondary`}
                          layout="fill"
                          objectFit="cover"
                          className="rounded"
                        />
                      </div>
                    </div>
                  )}
                  {rfq.product && (
                    <div className="mt-8 mb-4">
                      <RelatedProduct product={rfq.product} />
                    </div>
                  )}
                </div>

                <div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Category
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {rfq.categoryName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Quantity
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {rfq.quantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Budget
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        <CurrencyAmount amount={rfq.budget} />
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Deadline
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDateAndTime(rfq.deadline, true, true)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Created
                      </p>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {formatDateAndTime(rfq.createdAt, true)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-6 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Description
                    </p>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                        {rfq.description}
                      </p>
                    </div>
                  </div>

                  <Can I="create" a="Quote">
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
                        <svg
                          className="w-5 h-5 mr-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11.414V5a1 1 0 10-2 0v1.586A2 2 0 008 9v3a2 2 0 104 0V9a2 2 0 00-1-1.414zM10 13a1 1 0 110-2 1 1 0 010 2z"
                            clipRule="evenodd"
                          />
                        </svg>
                        You have already submitted a quote for this RFQ.
                      </p>
                    </div>
                  )}

                  {isRfqOwner && rfq.status === "OPEN" && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          setEditFormData(rfq);
                          setIsEditModalOpen(true);
                        }}
                        className="w-full py-3 px-4 bg-gold-600 hover:bg-gold-700 text-white font-medium rounded-md transition-colors"
                      >
                        Edit RFQ
                      </button>
                      <button
                        onClick={() => setShowDeleteRfqModal(true)}
                        className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors"
                      >
                        Delete RFQ
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {isEditModalOpen && editFormData && (
            <UniversalFormModal
              title="Edit RFQ"
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              onSubmit={handleEditRFQSubmit}
              isSubmitting={false}
              fields={[
                {
                  id: "title",
                  label: "Title",
                  type: "text",
                  value: editFormData.title,
                  onChange: (e) =>
                    setEditFormData((prev) => ({
                      ...prev!,
                      title: e.target.value,
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
                  id: "budget",
                  label: "Budget",
                  type: "number",
                  value: editFormData.budget,
                  onChange: (e) =>
                    setEditFormData((prev) => ({
                      ...prev!,
                      budget: parseFloat(e.target.value),
                    })),
                },
                {
                  id: "quantity",
                  label: "Quantity",
                  type: "number",
                  value: editFormData.quantity,
                  onChange: (e) =>
                    setEditFormData((prev) => ({
                      ...prev!,
                      quantity: parseInt(e.target.value),
                    })),
                },
                {
                  id: "deadline",
                  label: "Deadline",
                  type: "date",
                  value: editFormData.deadline.split("T")[0],
                  onChange: (e) =>
                    setEditFormData((prev) => ({
                      ...prev!,
                      deadline: new Date(e.target.value).toISOString(),
                    })),
                },
                {
                  id: "primaryImage",
                  label: "Primary Image",
                  type: "file",
                  onChange: (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setEditFormData((prev) => ({
                        ...prev!,
                        primaryImage: file,
                      }));
                    }
                  },
                  value: undefined,
                },
                {
                  id: "secondaryImage",
                  label: "Secondary Image",
                  type: "file",
                  onChange: (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setEditFormData((prev) => ({
                        ...prev!,
                        secondaryImage: file,
                      }));
                    }
                  },
                  value: undefined,
                },
              ]}
            />
          )}

          {isQuoteModalOpen && (
            <UniversalFormModal
              title="Submit Quote"
              isOpen={isQuoteModalOpen}
              onClose={() => setIsQuoteModalOpen(false)}
              onSubmit={handleSubmitQuote}
              isSubmitting={submitQuoteMutation.isPending}
              fields={[
                {
                  id: "price",
                  label: "Quoted Price ",
                  type: "number",
                  value: newQuote.price,
                  onChange: (e) =>
                    setNewQuote((prev) => ({
                      ...prev,
                      price: parseFloat(e.target.value),
                    })),
                  className:
                    "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                },
                {
                  id: "timeline",
                  label: "Estimated Delivery Date",
                  type: "date",
                  value: newQuote.timeline.split("T")[0],
                  onChange: (e) =>
                    setNewQuote((prev) => ({
                      ...prev,
                      timeline: new Date(e.target.value).toISOString(),
                    })),
                },
                {
                  id: "description",
                  label: "Detailed Quote Description",
                  type: "textarea",
                  value: newQuote.description,
                  onChange: (e) =>
                    setNewQuote((prev) => ({
                      ...prev,
                      description: e.target.value,
                    })),
                },
                {
                  id: "termsAndConditions",
                  label: "Terms & Conditions of Your Offer",
                  type: "textarea",
                  value: newQuote.termsAndConditions,
                  onChange: (e) =>
                    setNewQuote((prev) => ({
                      ...prev,
                      termsAndConditions: e.target.value,
                    })),
                },
                {
                  id: "primaryImage",
                  label: "Primary Reference Image (optional)",
                  type: "file",
                  onChange: (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPrimaryImageFile(file);
                    }
                  },
                  value: undefined,
                },
                {
                  id: "secondaryImage",
                  label: "Additional Reference Image (optional)",
                  type: "file",
                  onChange: (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSecondaryImageFile(file);
                    }
                  },
                  value: undefined,
                },
              ]}
            />
          )}

          {(isRfqOwner || hasSubmittedQuote) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden mt-8">
              <div className="p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Quotes
                </h2>

                {user && rfq.quotes && rfq.quotes.length > 0 ? (
                  <div className="space-y-8">
                    {rfq.quotes.map((quote: Quote) => {
                      const canViewQuote =
                        isRfqOwner || Number(quote.userId) === Number(user.id);

                      if (!canViewQuote) return null;

                      return (
                        <div
                          key={quote.id}
                          className={`border ${
                            quote.isAwarded
                              ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20"
                              : "border-gray-200 dark:border-gray-700"
                          } rounded-lg p-4 md:p-6`}
                        >
                          <div className="flex flex-col md:flex-row justify-between mb-4">
                            <div className="mb-3 md:mb-0">
                              <div className="flex items-center">
                                <svg
                                  className="h-10 w-10 text-gray-400 dark:text-gray-500 mr-3"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 005 10a6 6 0 0012 0c0-.352-.035-.696-.1-1.028A5 5 0 0010 11z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {quote.user.name}
                                  </p>
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
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Description
                              </p>
                              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                                {quote.description}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Terms and Conditions
                              </p>
                              <p className="text-gray-600 dark:text-gray-400 whitespace-pre-line">
                                {quote.termsAndConditions}
                              </p>
                            </div>
                          </div>

                          {quote.primaryImage && (
                            <div className="mt-4">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Images
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div className="relative h-32 bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden">
                                  <Image
                                    src={
                                      quote.primaryImage || "/placeholder.svg"
                                    }
                                    alt={`Quote image from ${quote.user.name}`}
                                    layout="fill"
                                    objectFit="cover"
                                  />
                                </div>
                                {quote.secondaryImage && (
                                  <div className="relative h-32 bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden">
                                    <Image
                                      src={
                                        quote.secondaryImage ||
                                        "/placeholder.svg"
                                      }
                                      alt={`Secondary quote image from ${quote.user.name}`}
                                      layout="fill"
                                      objectFit="cover"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="mt-6">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                                Responses
                              </h3>
                              <button
                                onClick={() =>
                                  setActiveQuoteId(
                                    activeQuoteId === quote.id ? null : quote.id
                                  )
                                }
                                className="text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-300 text-sm flex items-center"
                              >
                                {activeQuoteId === quote.id
                                  ? "Hide Responses"
                                  : "Show Responses"}
                                <svg
                                  className={`ml-1 w-4 h-4 transition-transform ${activeQuoteId === quote.id ? "rotate-180" : ""}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 9l-7 7-7-7"
                                  ></path>
                                </svg>
                              </button>
                            </div>

                            {activeQuoteId === quote.id && (
                              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                {quote.responses &&
                                quote.responses.length > 0 ? (
                                  <div className="space-y-4 mb-6">
                                    {quote.responses.map((response) => (
                                      <div
                                        key={response.id}
                                        className="bg-white dark:bg-gray-800 rounded-lg p-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group border border-gray-200 dark:border-gray-600"
                                      >
                                        <div className="flex items-start">
                                          <div className="mr-3 mt-1">
                                            {/* @ts-ignore */}
                                            <HiUserCircle className="h-8 w-8 text-gray-400" />
                                          </div>
                                          <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                              <span className="font-medium text-gray-800 dark:text-white">
                                                {response.user.name}
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

                                              {Number(response.user.id) ===
                                                Number(user?.id) &&
                                                rfq.status === "OPEN" && (
                                                  <button
                                                    onClick={() => {
                                                      setResponseToDelete(
                                                        response.id
                                                      );
                                                      setShowDeleteResponseModal(
                                                        true
                                                      );
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
                                ) : (
                                  <p className="text-gray-500 dark:text-gray-400 italic mb-4">
                                    No responses yet for this quote.
                                  </p>
                                )}

                                {/* Response form - only show if RFQ is OPEN */}
                                {rfq.status === "OPEN" &&
                                  (isRfqOwner ||
                                    Number(quote.userId) ===
                                      Number(user.id)) && (
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                                      <h4 className="font-medium text-gray-800 dark:text-gold-500 text-sm mb-3">
                                        Add a response
                                      </h4>
                                      <div className="flex">
                                        <div className="mr-3 mt-1">
                                          {/* @ts-ignore */}
                                          <HiUserCircle className="h-8 w-8 text-gray-400" />
                                        </div>
                                        <div className="flex-1">
                                          <textarea
                                            value={
                                              activeQuoteId === quote.id
                                                ? quoteResponse
                                                : ""
                                            }
                                            onChange={(e) => {
                                              setQuoteResponse(e.target.value);
                                              if (
                                                e.target.value.trim().length >= 1
                                              ) {
                                                setQuoteResponseError("");
                                              }
                                            }}
                                            placeholder="Type your response..."
                                            rows={2}
                                            className={`bg-white dark:bg-gray-700 border ${
                                              quoteResponseError &&
                                              activeQuoteId === quote.id
                                                ? "border-red-500"
                                                : "border-gray-300 dark:border-gray-600"
                                            } text-gray-800 dark:text-white w-full rounded-lg p-2 text-sm`}
                                          />

                                          {quoteResponseError &&
                                            activeQuoteId === quote.id && (
                                              <p className="text-red-500 text-xs mt-1">
                                                {quoteResponseError}
                                              </p>
                                            )}

                                          <div className="mt-2 flex justify-end">
                                            <button
                                              onClick={() =>
                                                handleQuoteResponseSubmit(
                                                  quote.id
                                                )
                                              }
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

                          <div className="mt-4 flex justify-end gap-2">
                            {Number(quote.userId) === Number(user?.id) &&
                              rfq.status === "OPEN" && (
                                <button
                                  onClick={() => {
                                    setEditQuoteData({
                                      id: quote.id,
                                      price: quote.price,
                                      description: quote.description,
                                      termsAndConditions:
                                        quote.termsAndConditions,
                                    });
                                    setShowEditQuoteModal(true);
                                  }}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
                                >
                                  Edit Quote
                                </button>
                              )}

                            {Number(quote.userId) === Number(user?.id) &&
                              rfq.status === "OPEN" &&
                              !quote.isAwarded && (
                                <button
                                  onClick={() => {
                                    setQuoteToDelete(quote.id);
                                    setShowDeleteQuoteModal(true);
                                  }}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors"
                                >
                                  Delete Quote
                                </button>
                              )}

                            {isRfqOwner &&
                              rfq.status === "OPEN" &&
                              !quote.isAwarded && (
                                <button
                                  onClick={() => handleAwardQuote(quote.id)}
                                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
                                  disabled={awardQuoteMutation.isPending}
                                >
                                  {awardQuoteMutation.isPending
                                    ? "Awarding..."
                                    : "Award Quote"}
                                </button>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No quotes have been submitted for this RFQ yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {isConfirmModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Confirm Award
                </h2>
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  Are you sure you want to award this quote? This action cannot
                  be undone.
                </p>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setIsConfirmModalOpen(false)}
                    className="px-4 py-2 rounded bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (selectedQuoteId !== null) {
                        awardQuoteMutation.mutate(selectedQuoteId);
                      }
                      setIsConfirmModalOpen(false);
                    }}
                    className="px-4 py-2 rounded bg-[#BF9B30] text-white hover:bg-[#a88824]"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {showEditQuoteModal && editQuoteData && (
        <UniversalFormModal
          title="Edit Quote"
          isOpen={showEditQuoteModal}
          onClose={() => {
            setShowEditQuoteModal(false);
            setEditQuoteData(null);
          }}
          onSubmit={(e) => {
            e.preventDefault();
            if (!editQuoteData) return;

            updateQuoteMutation.mutate({
              quoteId: editQuoteData.id,
              price: editQuoteData.price,
              description: editQuoteData.description,
              termsAndConditions: editQuoteData.termsAndConditions,
            });
          }}
          isSubmitting={updateQuoteMutation.isPending}
          fields={[
            {
              id: "price",
              label: "Price",
              type: "number",
              value: editQuoteData.price,
              onChange: (e) =>
                setEditQuoteData((prev) => ({
                  ...prev!,
                  price: parseFloat(e.target.value),
                })),
            },
            {
              id: "description",
              label: "Description",
              type: "textarea",
              value: editQuoteData.description,
              onChange: (e) =>
                setEditQuoteData((prev) => ({
                  ...prev!,
                  description: e.target.value,
                })),
            },
            {
              id: "termsAndConditions",
              label: "Terms and Conditions",
              type: "textarea",
              value: editQuoteData.termsAndConditions,
              onChange: (e) =>
                setEditQuoteData((prev) => ({
                  ...prev!,
                  termsAndConditions: e.target.value,
                })),
            },
          ]}
        />
      )}

      <ConfirmationModal
        show={showDeleteResponseModal}
        onClose={() => {
          setShowDeleteResponseModal(false);
          setResponseToDelete(null);
        }}
        onConfirm={() => {
          if (responseToDelete) {
            handleDeleteQuoteResponse(responseToDelete);
          }
        }}
        title="Delete Response"
        message="Are you sure you want to delete this response? This action cannot be undone."
        confirmText="Delete"
        confirmColor="red"
        isProcessing={deletingResponse}
      />

      <ConfirmationModal
        show={showDeleteRfqModal}
        onClose={() => setShowDeleteRfqModal(false)}
        onConfirm={handleDeleteRfq}
        title="Delete RFQ"
        message="Are you sure you want to delete this RFQ? This will remove all associated quotes and responses."
        confirmText="Delete"
        confirmColor="red"
        isProcessing={deletingRfq}
      />

      <ConfirmationModal
        show={showDeleteQuoteModal}
        onClose={() => {
          setShowDeleteQuoteModal(false);
          setQuoteToDelete(null);
        }}
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
