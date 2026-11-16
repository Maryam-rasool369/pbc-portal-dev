"use client";

import type React from "react";

import { useState, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";
import { usePagination } from "@/utils/usePagination";
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

interface ServiceRFQ {
  id: number;
  userId: number;
  title: string;
  description: string;
  budget: number;
  deadline: string;
  primaryImage: string | null;
  secondaryImage: string | null;
  status: "OPEN" | "CLOSED" | "AWARDED";
  createdAt: string;
  updatedAt: string;
  serviceCategory?: { id: number; name: string };
  subCategory?: { id: number; name: string };
  awardedServiceQuoteId: number | null;
}

export default function ServiceRFQsWithQueryClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <ServiceRFQsList />
    </QueryClientProvider>
  );
}

function ServiceRFQsList() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [filters, setFilters] = useState<any>({});

  const {
    data: serviceRfqs,
    pagination,
    isLoading,
    isError,
    error,
    currentPage,
    goToPage,
    resetPagination,
  } = usePagination<ServiceRFQ>({
    queryKey: ["serviceRfqs", filters],
    fetchFn: async (page, limit) => {
      if (token === null || token === "undefined") {
        throw new Error("Authentication required");
      }

      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/service-rfq?page=${page}&limit=${limit}`;
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
        throw new Error(data?.error[0]?.msg || "Error fetching Service RFQs");
      }

      return {
        ...data,
        data: data.data.filter((rfq: ServiceRFQ) => rfq.userId !== Number(user?.id)),
      };
    },
    limit: 12,
    enabled: !!token,
  });

  useEffect(() => {
    if (isError) {
      toast.error((error as Error)?.message || "Error fetching Service RFQs");
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

  const filterFields = [
    {
      name: "status",
      label: "Status",
      options: [
        { value: "OPEN", label: "Open" },
        { value: "CLOSED", label: "Closed" },
        { value: "AWARDED", label: "Awarded" },
      ],
    },
  ];

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const handleFilterApply = (newFilters: any) => {
    setFilters(newFilters);
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
        <title>Service RFQs - PBC Dubai</title>
        <meta name="description" content="Browse all Service RFQs on PBC Dubai" />
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
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
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
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-1 text-gray-500 dark:text-gray-400 md:ml-2 font-medium truncate max-w-xs">
                    Service RFQs
                  </span>
                </div>
              </li>
            </ol>
          </nav>

          <Filter
            title="Service RFQs"
            heading="Service Request for Quotations"
            description="Looking to quote on a service? Browse active Service RFQs and find new opportunities."
            filters={filters}
            onChange={handleFilterChange}
            onApply={handleFilterApply}
            onClear={handleFilterClear}
            fields={filterFields}
          />

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {serviceRfqs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {serviceRfqs.map((rfq) => (
                    <Link key={rfq.id} href={`/service-rfq/${rfq.id}`}>
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
                              <span className="text-white text-sm font-medium">No Image</span>
                            </div>
                          )}
                        </div>

                        <div className="p-4 flex flex-col flex-grow">
                          <div className="flex justify-between items-start mb-2">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {rfq.title}
                            </h2>
                            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(rfq.status)}`}>
                              {rfq.status}
                            </span>
                          </div>

                          <p className="text-gold-600 dark:text-gold-400 text-sm mb-1">
                            {rfq.serviceCategory?.name}
                            {rfq.subCategory ? ` › ${rfq.subCategory.name}` : ""}
                          </p>

                          <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 line-clamp-2 flex-grow">
                            {rfq.description}
                          </p>

                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Budget</p>
                              <p className="font-medium text-gray-900 dark:text-white">
                                <CurrencyAmount amount={rfq.budget} />
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Deadline</p>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {formatDate(rfq.deadline)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Posted</p>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {formatDate(rfq.createdAt)}
                              </p>
                            </div>
                          </div>

                          <button className="w-full mt-auto py-2 bg-gold-600 text-gray-900 rounded-md hover:bg-gold-700 transition-colors">
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
                    No Service RFQs found matching your criteria.
                  </p>
                  <button
                    onClick={resetPagination}
                    className="px-4 py-2 bg-gold-600 text-white rounded-md hover:bg-gold-700 transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              )}

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
      </div>
    </>
  );
}
