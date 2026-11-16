"use client";

import type React from "react";

import { useState, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";
import { usePagination } from "@/utils/usePagination";
import UniversalFormModal from "@/components/modals/UniversalFormModal";
import Can from "@/components/rbac/Can";
import Pagination from "@/components/common/Pagination";
import Filter from "@/components/common/Filter";
import CurrencyAmount from "@/components/ui/CurrencyAmount";

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

interface RFQ {
  id: number;
  userId: number;
  title: string;
  categoryName: string;
  quantity: number;
  budget: number;
  deadline: string;
  description: string;
  primaryImage: string | null;
  secondaryImage: string | null;
  status: "OPEN" | "CLOSED" | "AWARDED";
  createdAt: string;
  updatedAt: string;
  awardedQuoteId: number | null;
}

export default function RFQsWithQueryClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <RFQsList />
    </QueryClientProvider>
  );
}

function RFQsList() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [isCreateRfqModalOpen, setIsCreateRfqModalOpen] = useState(false);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filters, setFilters] = useState<any>({});

  

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/category`,
          {
            headers: {
              "Content-Type": "application/json",
              ...(token && { token }),
            },
          },
        );

        const json = await res.json();
        if (!res.ok || json.error)
          throw new Error(json?.error[0]?.msg || "Failed to fetch categories");
        setCategories(json.data);
      } catch (err) {
        console.error("Failed to load categories", err);
        toast.error("Could not load categories");
      }
    };

    if (token) {
      fetchCategories();
    }
  }, [token]);

  const [rfqForm, setRfqForm] = useState({
    title: "",
    description: "",
    quantity: "",
    budget: "",
    deadline: "",
    categoryName: "",
    primaryImage: null,
    secondaryImage: null,
  });

  const handleRfqInputChange = (e) => {
    const { name, value } = e.target;
    setRfqForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setRfqForm((prev) => ({ ...prev, [name]: files[0] }));
    }
  };

  const handleRfqSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedDate = new Date(rfqForm.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate <= today) {
        throw new Error("Deadline must be a future date.");
      }

      const form = new FormData();
      Object.entries(rfqForm).forEach(([key, val]) => {
        if (val) form.append(key, val);
      });

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rfq/add`,
        {
          method: "POST",
          headers: { token },
          body: form,
        },
      );

      const result = await res.json();
      if (!res.ok || result.error)
        throw new Error(result.error?.[0]?.msg || "Failed to create RFQ");

      toast.success("RFQ created successfully");
      setIsCreateRfqModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["rfqs"] });
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const {
    data: rfqs,
    pagination,
    isLoading,
    isError,
    error,
    currentPage,
    hasNextPage,
    hasPreviousPage,
    nextPage,
    previousPage,
    goToPage,
    resetPagination,
  } = usePagination<RFQ>({
    queryKey: ["rfqs", filters],
    fetchFn: async (page, limit) => {
      if (token === null || token === "undefined") {
        throw new Error("Authentication required");
      }

      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/rfq?page=${page}&limit=${limit}`;
      if (filters.status && filters.status !== "") {
        url += `&status=${filters.status}`;
      }

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          token: token,
        },
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data?.error[0]?.msg || "Error fetching RFQs");
      }

      return {
        ...data,
        data: data.data.filter((rfq: RFQ) => rfq.userId !== Number(user?.id)),
      };
    },
    limit: 12,
    enabled: !!token,
  });

  useEffect(() => {
    if (isError) {
      toast.error((error as Error)?.message || "Error fetching RFQs");
      if ((error as Error)?.message?.includes("Authentication required")) {
        router.push("/");
      }
    }
  }, [isError, error, router]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
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
  // Filter Fields
  const filterFields = [
    { name: "status", label: "Status", options: [
      { value: "OPEN", label: "Open" },
      { value: "CLOSED", label: "Closed" },
      { value: "AWARDED", label: "Awarded" },
    ] },
  ];

  // Filter Functions
  const handleFilterChange = (filters: any) => {
    setFilters(filters);
  };

  const handleFilterApply = (filters: any) => {
    setFilters(filters);
    resetPagination(); 
  };

  const handleFilterClear = () => {
    setFilters({});
    resetPagination();
  };


  useEffect(() => {
    resetPagination();
  }, [filters, resetPagination]);

  return (
    <>
      <Head>
        <title>RFQs - PBC Dubai</title>
        <meta name="description" content="Browse all RFQs on PBC Dubai" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-8">
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
                  <span className="ml-1 text-gray-500 dark:text-gray-400 md:ml-2 font-medium truncate max-w-xs">
                    RFQs
                  </span>
                </div>
              </li>
            </ol>
          </nav>

          <Filter
        title="RFQs"
        heading="Request for Quotations (RFQs)"
        description="Looking to quote? Browse active RFQs and find new opportunities."
        filters={filters}
        onChange={handleFilterChange}
        onApply={handleFilterApply}
        onClear={handleFilterClear}
        fields={filterFields}
      /> 
      
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {rfqs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {rfqs.map((rfq) => (
                    <Link key={rfq.id} href={`/rfq/${rfq.id}`}>
                      <div className="block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300 h-[500px] w-full flex flex-col">
                        <div className="h-48 w-full relative">
                          {rfq.primaryImage ? (
                            <Image
                              src={rfq.primaryImage}
                              alt={rfq.title}
                              layout="fill"
                              objectFit="cover"
                              className="rounded-t-lg"
                              onError={(e) => {
                                const fallback = e.currentTarget.closest("div");
                                if (fallback) {
                                  fallback.innerHTML = "";
                                  fallback.className =
                                    "h-48 w-full rounded-t-lg bg-gradient-to-r from-gold-500 via-purple-500 to-pink-500 flex items-center justify-center";
                                  fallback.innerHTML =
                                    '<span class="text-white text-sm font-medium">Image not available</span>';
                                }
                              }}
                            />
                          ) : (
                            <div className="h-48 w-full rounded-t-lg bg-gradient-to-r from-gold-500 via-purple-500 to-pink-500 flex items-center justify-center">
                              <span className="text-white text-sm font-medium">
                                No Image
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {rfq.title}
                            </h2>
                            <span
                              className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(
                                rfq.status,
                              )}`}
                            >
                              {rfq.status}
                            </span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                            {rfq.categoryName}
                          </p>
                          <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 line-clamp-2">
                            {rfq.description}
                          </p>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Quantity
                              </p>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {rfq.quantity}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Budget
                              </p>
                              <p className="font-medium text-gray-900 dark:text-white">
                                <CurrencyAmount amount={rfq.budget} />
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Deadline
                              </p>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {formatDate(rfq.deadline)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Posted
                              </p>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {formatDate(rfq.createdAt)}
                              </p>
                            </div>
                          </div>
                          <button className="w-full mt-2 py-2 bg-gold-600 text-gray-900 rounded-md hover:bg-gold-700 transition-colors">
                            View Details
                          </button>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    No RFQs found matching your criteria.
                  </p>
                  <button
                    onClick={resetPagination}
                    className="px-4 py-2 bg-gold-600 text-white rounded-md hover:bg-gold-700 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
              {/* Pagination */}
              {pagination && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  isLoading={isLoading}
                  onPageChange={goToPage}
                />
              )}
            </>
          )}
        </div>
        {isCreateRfqModalOpen && (
          <UniversalFormModal
            title="Create New RFQ"
            isOpen={isCreateRfqModalOpen}
            onClose={() => setIsCreateRfqModalOpen(false)}
            onSubmit={handleRfqSubmit}
            isSubmitting={isSubmitting}
            fields={[
              {
                id: "title",
                label: "Title",
                type: "text",
                value: rfqForm.title,
                onChange: handleRfqInputChange,
              },
              {
                id: "description",
                label: "Description",
                type: "textarea",
                value: rfqForm.description,
                onChange: handleRfqInputChange,
              },
              {
                id: "quantity",
                label: "Quantity",
                type: "number",
                value: rfqForm.quantity,
                onChange: handleRfqInputChange,
              },
              {
                id: "budget",
                label: "Budget",
                type: "number",
                value: rfqForm.budget,
                onChange: handleRfqInputChange,
              },
              {
                id: "deadline",
                label: "Deadline",
                type: "date",
                value: rfqForm.deadline,
                onChange: handleRfqInputChange,
              },
              {
                id: "categoryName",
                label: "Category",
                type: "select",
                value: rfqForm.categoryName,
                onChange: handleRfqInputChange,
                options: categories.map((cat) => ({
                  value: cat.name,
                  label: cat.name,
                })),
              },
              {
                id: "primaryImage",
                label: "Primary Image",
                type: "file",
                onChange: (e) => handleImageChange(e, "primaryImage"),
              },
              {
                id: "secondaryImage",
                label: "Secondary Image",
                type: "file",
                onChange: (e) => handleImageChange(e, "secondaryImage"),
              },
            ]}
          />
        )}
      </div>
    </>
  );
}
