"use client";

import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useQuery } from "@tanstack/react-query";
import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  UserIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  TrophyIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/solid";
import { getAllLeads } from "@/services/leads";
import { getAllQuotes } from "@/services/quote";
import useAuthStore from "@/store/authStore";
import Pagination from "@/components/common/Pagination";
import { Roles } from "@/enums/Roles";
import { useAbility } from "@/hooks/useAbility";
import { formatStatus } from "@/utils/formatStatus";
import { formatDateAndTime } from "@/utils/formatDateAndTime";

interface Lead {
  id: string;
  Buyer: { name: string };
  Seller: { name: string };
  Product: { name: string };
  status: string;
  createdAt: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

interface Quote {
  id: number;
  rfqId: number;
  userId: number;
  price: number;
  description: string;
  timeline: string;
  primaryImage: string;
  secondaryImage: string | null;
  termsAndConditions: string;
  createdAt: string;
  updatedAt: string;
  isAwarded: boolean;
  rfq: {
    id: number;
    userId: number;
    title: string;
    categoryName: string;
    quantity: number;
    budget: number;
    deadline: string;
    description: string;
    primaryImage: string;
    secondaryImage: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
    awardedQuoteId: number | null;
    user: {
      id: number;
      name: string;
    };
  };
}

export default function LeadsScreen() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [page, setPage] = useState(1);
  const [quotesPage, setQuotesPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [quotesPagination, setQuotesPagination] = useState<Pagination | null>(
    null
  );
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [quoteDetailModal, setQuoteDetailModal] = useState<Quote | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const MemberRoles = [Roles.CORPORATE, Roles.INDIVIDUAL];
  const router = useRouter();
  const limit = 8;

  const ability = useAbility();

  useEffect(() => {
    if (!token || token === "undefined" || !user) return;

    if (token && !ability?.can("read", "Lead")) {
      toast.error("You are not authorized to access this page. Routing you back to the homepage");
      router.push("/userMarketplace");
      return;
    }
  }, [token]);

  const fetchLeads = async (pageNumber = 1, reset = false) => {
    try {
      if (!token || !ability?.can("read", "Lead")) {
        return;
      }
      const { data, pagination } = await getAllLeads(token, pageNumber, limit);
      setLeads((prev) => (reset ? data : [...prev, ...data]));
      setPagination(pagination);
      return data;
    } catch (error: any) {
      console.error("Error fetching leads:", error);
      toast.error(error?.message || "Failed to fetch leads");
      return [];
    }
  };

  const getAllQuotesData = async (
    quotesPage: number = 1,
    quotesLimit: number = 8
  ) => {
    try {
      if (!token || !ability?.can("read", "Quote")) return;
      const { data, pagination } = await getAllQuotes(
        token,
        quotesPage,
        quotesLimit
      );
      setQuotes(data);
      setQuotesPagination(pagination);

      return data;
    } catch (error: any) {
      console.error("Error fetching quotes:", error);
      if (!error?.message?.includes("session")) {
        toast.error(error?.message || "Failed to fetch quotes");
      }
      return [];
    }
  };

  const {
    data: leadsData = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["leads", page],
    queryFn: () => fetchLeads(page, true),
    enabled: !!token,
    staleTime: 0,
  });

  const {
    data: quotesData = [],
    isLoading: isLoadingQuotes,
    isError: isErrorQuotes,
    refetch: refetchQuotes,
  } = useQuery({
    queryKey: ["quotes", quotesPage],
    queryFn: () => getAllQuotesData(quotesPage, 8),
    enabled: !!token,
    staleTime: 0,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await refetch();
    setRefreshing(false);
  };

  const handlePageChange = (newPage: number) => {
    if (pagination && newPage >= 1 && newPage <= pagination.totalPages) {
      setPage(newPage);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "confirmed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "rejected":
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "confirmed":
        return <CheckCircleIcon className="w-4 h-4" />;
      case "pending":
        return <ClockIcon className="w-4 h-4" />;
      case "rejected":
      case "cancelled":
        return <XCircleIcon className="w-4 h-4" />;
      case "completed":
        return <TrophyIcon className="w-4 h-4" />;
      default:
        return <QuestionMarkCircleIcon className="w-4 h-4" />;
    }
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <DocumentTextIcon className="w-16 h-16 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No Leads Found
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
        Your leads will appear here once they&apos;re available. Check back
        later or refresh the page.
      </p>
    </div>
  );

  const renderLeadCard = (lead: Lead) => (
    <div
      key={lead.id}
      onClick={() => {
        setSelectedLead(lead);
        setModalVisible(true);
      }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105 border border-gray-200 dark:border-gray-700"
    >
      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
            Lead #{lead.id}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatDateAndTime(lead.createdAt, true)}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <UserIcon className="w-4 h-4 text-gold-500 mr-2 flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-300 truncate">
              {lead.Buyer.name}
            </span>
          </div>

          <div className="flex items-center text-sm">
            <BuildingStorefrontIcon className="w-4 h-4 text-gold-500 mr-2 flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-300 truncate">
              {lead.Seller.name}
            </span>
          </div>

          <div className="flex items-center text-sm">
            <CubeIcon className="w-4 h-4 text-gold-500 mr-2 flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-300 truncate">
              {lead.Product.name}
            </span>
          </div>
        </div>

        <button className="w-full mt-4 py-2 bg-gold-600 text-white rounded-md hover:bg-gold-700 transition-colors text-sm font-medium">
          View Details
        </button>
      </div>
    </div>
  );

  if (isLoading && !refreshing) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Leads Management - PBC Dubai</title>
        <meta name="description" content="Manage your business leads" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="bg-gray-50 dark:bg-gray-900">
        {/* Header */}

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              All Leads
            </h2>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-md transition-colors disabled:opacity-50"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {leadsData.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {leadsData.map(renderLeadCard)}
              </div>

              {pagination && (
                <Pagination
                  currentPage={page}
                  totalPages={pagination.totalPages}
                  isLoading={isLoading}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </div>

        {/* Modal */}
        {modalVisible && selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Lead Details
                </h3>
                <button
                  onClick={() => setModalVisible(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="text-center mb-6">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      selectedLead.status
                    )}`}
                  >
                    {getStatusIcon(selectedLead.status)}
                    <span className="ml-2 capitalize">
                      {formatStatus(selectedLead.status || "")}
                    </span>
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <UserIcon className="w-5 h-5 text-gold-500 mr-3" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Buyer
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {selectedLead.Buyer.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <BuildingStorefrontIcon className="w-5 h-5 text-gold-500 mr-3" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Seller
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {selectedLead.Seller.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <CubeIcon className="w-5 h-5 text-gold-500 mr-3" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Product
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {selectedLead.Product.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <ClockIcon className="w-5 h-5 text-gold-500 mr-3" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Lead Creation Date
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {formatDateAndTime(selectedLead.createdAt, true)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => setModalVisible(false)}
                    className="w-full py-3 bg-gold-600 hover:bg-gold-700 text-white rounded-md transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            All Quotes Leads
          </h2>
          <button
            onClick={() => refetchQuotes()}
            disabled={isLoadingQuotes}
            className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {isLoadingQuotes ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {quotesData.length === 0 ? (
          <div className="text-center py-16">
            <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Quotes Found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Quotes will appear here once available.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {quotesData.map((quote: Quote) => (
                <div
                  key={quote.id}
                  onClick={() => setQuoteDetailModal(quote)}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:scale-105 border border-gray-200 dark:border-gray-700"
                >
                  <div className="p-4">
                    <div className="mb-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                        Quote #{quote.id}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDateAndTime(quote.createdAt, true)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm">
                        <UserIcon className="w-4 h-4 text-gold-500 mr-2 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-300 truncate">
                          {quote.rfq.user.name}
                        </span>
                      </div>

                      <div className="flex items-center text-sm">
                        <DocumentTextIcon className="w-4 h-4 text-gold-500 mr-2 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-300 truncate">
                          {quote.rfq.title}
                        </span>
                      </div>

                      <div className="flex items-center text-sm">
                        <ChartBarIcon className="w-4 h-4 text-gold-500 mr-2 flex-shrink-0" />
                        <span className="text-gray-600 dark:text-gray-300 truncate">
                          {quote.price} USD
                        </span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-1 mt-4 rounded-full text-xs font-medium ${
                        quote.isAwarded
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                      }`}
                    >
                      {quote.isAwarded ? "Awarded" : "Not Awarded"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {quotesPagination && (
              <Pagination
                currentPage={quotesPage}
                totalPages={quotesPagination.totalPages}
                isLoading={isLoadingQuotes}
                onPageChange={setQuotesPage}
              />
            )}
          </>
        )}

        {/* Quote Detail Modal */}
        {quoteDetailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Quote Details
                </h3>
                <button
                  onClick={() => setQuoteDetailModal(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center">
                    <UserIcon className="w-5 h-5 text-gold-500 mr-3" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Buyer
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {quoteDetailModal.rfq.user.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <DocumentTextIcon className="w-5 h-5 text-gold-500 mr-3" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        RFQ Title
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {quoteDetailModal.rfq.title}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <ChartBarIcon className="w-5 h-5 text-gold-500 mr-3" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Price
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {quoteDetailModal.price} USD
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <ClockIcon className="w-5 h-5 text-gold-500 mr-3" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Timeline
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {formatDateAndTime(quoteDetailModal.timeline, true)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <DocumentTextIcon className="w-5 h-5 text-gold-500 mr-3" />
                    <div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Description
                      </div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {quoteDetailModal.description}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => setQuoteDetailModal(null)}
                    className="w-full py-3 bg-gold-600 hover:bg-gold-700 text-white rounded-md transition-colors font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
