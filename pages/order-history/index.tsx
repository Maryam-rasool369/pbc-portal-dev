"use client";

import React, { useEffect, useState } from "react";
import Head from "next/head";
import Breadcrumb from "@/components/headers/breadcrumb";
import Pagination from "@/components/common/Pagination";
import OrderDetailsModal from "@/components/orders/OrderDetailsModal";
import "react-toastify/dist/ReactToastify.css";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import { fetchMyOrders, fetchAllOrders, fetchSellerOrders } from "@/services/orderHistory";
import { Order } from "@/types/order";
import { cancelOrder, continuePayment } from "@/services/stripe";
import Filter, { FilterField } from "@/components/common/Filter";
import CurrencyAmount from "@/components/ui/CurrencyAmount";

type TabType = "my-orders" | "all-orders" | "seller-orders";

export default function OrderHistory() {
  const [activeTab, setActiveTab] = useState<TabType>("my-orders");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transferringOrderId, setTransferringOrderId] = useState<number | null>(null);
  const [refundingOrderId, setRefundingOrderId] = useState<number | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const ITEMS_PER_PAGE = 8;

  const [filters, setFilters] = useState<Record<string, string>>({});
  const {
    data: ordersData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["orders", activeTab, currentPage, filters],
    queryFn: async () => {
      if (!token) throw new Error("Authentication required");


      switch (activeTab) {
        case "my-orders":
          return await fetchMyOrders(token, currentPage, ITEMS_PER_PAGE, filters);
        case "all-orders":
          return await fetchAllOrders(token, currentPage, ITEMS_PER_PAGE, filters);
        case "seller-orders":
          return await fetchSellerOrders(token, currentPage, ITEMS_PER_PAGE, filters);
        default:
          return await fetchMyOrders(token, currentPage, ITEMS_PER_PAGE, filters);
      }
    },
    enabled: !!token,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filters?.status, filters?.role, filters?.search]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };


  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);
  

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (filters: Record<string, string>) => {
    setFilters((prev) => ({
      ...prev,
      ...filters,
    }));
  };
  const handleFilterApply = (filters: Record<string, string>) => {
    setFilters(filters);
  };
  const handleFilterClear = () => {
    setFilters({});
  };

  const filterFields: FilterField[] = [

    {
      name: "transactionStatus",
      label: "Transaction Status",
      type: "select",
      options: [
        { value: "PENDING", label: "Pending" },
        { value: "TRANSFER", label: "Transfer" },
        { value: "REFUNDED", label: "Refunded" },
      ],
    },
    {
      name: "paymentStatus",
      label: "Payment Status",
      type: "select",
      options: [
        { value: "PENDING", label: "Pending" },
        { value: "COMPLETED", label: "Completed" },
        { value: "CANCELLED", label: "Cancelled" },
      ],
    },
    
  ];

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };



  const handleTransferPayment = async (orderId: number) => {
    setTransferringOrderId(orderId);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/order/transfer-to-seller/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: token || '',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Payment transferred to seller successfully');
        refetch();
        setIsModalOpen(false);
        setSelectedOrder(null);
      } else {
        toast.error(data.error?.[0]?.msg || 'Failed to transfer payment');
      }
    } catch (error) {
      toast.error('An error occurred while transferring payment');
    } finally {
      setTransferringOrderId(null);
    }
  };


  const handleRefund = async (orderId: number) => {
    setRefundingOrderId(orderId);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/order/refund/${orderId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          token: token || '',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Refund processed successfully');
        refetch();
        // Close modal after successful refund
        setIsModalOpen(false);
        setSelectedOrder(null);
      } else {
        toast.error(data.error?.[0]?.msg || 'Failed to process refund');
      }
    } catch (error) {
      toast.error('An error occurred while processing refund');
    } finally {
      setRefundingOrderId(null);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    setCancellingOrderId(orderId);
    try {
      const response = await cancelOrder(token || '', orderId);
      if (response.ok) {
        toast.success('Order cancelled successfully');
        refetch();
        setIsModalOpen(false);
        setSelectedOrder(null);
      } else {
        toast.error(response.error?.[0]?.msg || 'Failed to cancel order');
      }
    } catch (error) {
      toast.error('An error occurred while cancelling order');
    } finally {
      setCancellingOrderId(null);
    }
  };

  
  const handleContinuePayment = async (orderId: number) => {
    try {
      const response = await continuePayment(token || '', orderId);
      if (response.ok) {
        if (response.isExistingSession) {
          toast.success('Redirecting to Payment Page...');
          // Close modal before redirecting
          setIsModalOpen(false);
          setSelectedOrder(null);
          window.location.href = response.url;
        } 
      } else {
          toast.error(response.error?.[0]?.msg || 'Failed to continue payment');
      }
    } catch (error) {
      toast.error('An error occurred while continuing payment');
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "succeeded":
      case "paid":
        return "bg-green-500/20 text-green-500";
      case "pending":
      case "processing":
        return "bg-yellow-500/20 text-yellow-500";
      case "failed":
      case "cancelled":
      case "declined":
        return "bg-red-500/20 text-red-500";
      case "refunded":
        return "bg-blue-500/20 text-blue-500";
        case "transfer":
          return "bg-green-500/20 text-green-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Authentication Required
          </h1>
          <p className="text-gray-600">
            Please log in to view your order history.
          </p>
        </div>
      </div>
    );
  }



  return (
    <>
      <Head>
        <title>Order History - PBC Dubai</title>
        <meta name="description" content="View your order history and manage orders" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
          
          </div>
          <Filter
            title="Order History"
            heading="Order History"
            description="View your order history and manage orders"
            filters={filters}
            onChange={handleFilterChange}
            onApply={handleFilterApply}
            onClear={handleFilterClear}
            fields={filterFields}
          />

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: "my-orders", label: "My Orders", permission: true },
                  { 
                    id: "all-orders", 
                    label: "All Orders", 
                    permission: user?.Role?.name !== "Individual" && user?.Role?.name !== "Corporate" 
                  },
                  { id: "seller-orders", label: "Seller Orders", permission: true },
                ].map((tab) => (
                  tab.permission && (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id as TabType)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? "border-gold-500 text-gold-600 dark:text-gold-400"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                      }`}
                    >
                      {tab.label}
                    </button>
                  )
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-gold-500 hover:bg-gold-400 transition ease-in-out duration-150 cursor-not-allowed">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Loading orders...
                </div>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="text-red-600 dark:text-red-400">
                  <p className="text-lg font-semibold mb-2">Error loading orders</p>
                  <p className="text-sm">{error.message}</p>
                  <button
                    onClick={() => refetch()}
                    className="mt-4 px-4 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Orders Table */}
                <div className="flex flex-col">
                  <div className="overflow-x-auto">
                    <div className="inline-block min-w-full align-middle">
                      <div className="overflow-hidden shadow">
                        <table className="min-w-full divide-y divide-gray-200 table-fixed dark:divide-gray-600">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="w-72 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Order Number
                              </th> 
                              {activeTab === "seller-orders" && (
                                <th className="w-72 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                  Buyer Info
                                </th>
                              )}
                              <th className="w-72 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Product Info
                              </th>
                              <th className="w-72 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Price
                              </th>
                              <th className="w-72 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Payment Status
                              </th>
                              <th className="w-72 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Transaction Status
                              </th>
                              <th className="w-72 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="w-72 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>

                          <tbody className="divide-y divide-gray-800">
                            {isLoading ? (
                              <tr>
                                <td colSpan={activeTab === "seller-orders" ? 8 : 7} className="px-6 py-20 text-center">
                                  <div className="flex justify-center">
                                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
                                  </div>
                                </td>
                              </tr>
                            ) : !ordersData?.data || ordersData.data.length === 0 ? (
                              <tr>
                                <td colSpan={activeTab === "seller-orders" ? 8 : 7} className="px-6 py-20 text-center">
                                  <div className="flex flex-col items-center">
                                    <svg
                                      className="w-12 h-12 text-gray-500 mb-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
                                    <p className="text-gray-400 text-lg font-medium">
                                      No {activeTab === "my-orders" ? "orders" : activeTab === "seller-orders" ? "seller orders" : "orders"} found
                                    </p>
                                    <p className="text-gray-500 text-sm mt-2">
                                      {activeTab === "my-orders" 
                                        ? "You haven't placed any orders yet." 
                                        : activeTab === "seller-orders" 
                                        ? "No orders have been placed for your products yet."
                                        : "No orders are available to view."
                                      }
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              ordersData?.data?.map((order: Order) => {
                                if (!order || !order.id) return null;

                                return (
                                  <tr key={order.id} className="hover:bg-gray-800/50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm">
                                        <div className="text-sm font-medium text-white mb-1">
                                          {" Order # " + order.id}
                                        </div>
                                        {activeTab !== "seller-orders" && (
                                          <>
                                            <div className="text-sm text-gray-300">
                                              {order.user?.name || "Unknown User"}
                                            </div>
                                            {order.address && (
                                              <div className="text-xs text-gray-400 mt-1">
                                                {order.address.city}, {order.address.country}
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </td>
                                    {activeTab === "seller-orders" && (
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm">
                                          <div className="text-sm font-medium text-white mb-1">
                                            {order.buyer?.name || order.user?.name || "Unknown Buyer"}
                                          </div>

                                          {order.address && (
                                            <div className="text-xs text-gray-400 mt-1">
                                              {order.address.city}, {order.address.country}
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      {order.items.map((item, index) => (
                                        <div key={index} className="flex items-center space-x-3">
                                       
                                          <div className="text-sm">
                                            <div className="text-sm font-medium text-white">
                                              {item.productName}
                                            </div>
                                            <div className="text-sm text-gray-300">
                                              {item.seller}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <div className="text-sm text-gray-300">
                                        <div className="font-medium text-white">
                                          <CurrencyAmount amount={order.discountedPrice || 0} />
                                        </div>
                                        {order.isDiscountApplied && order.originalPrice && (
                                          <div className="text-xs text-gray-400 line-through">
                                            <CurrencyAmount amount={order.originalPrice} />
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span
                                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.paymentStatus || "pending")}`}
                                      >
                                        {order.paymentStatus || "Pending"}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                      <span
                                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.transactionStatus || "pending")}`}
                                      >
                                        {order.transactionStatus || "Pending"}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                      {formatDate(order.createdAt || new Date().toISOString())}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                      <div className="flex space-x-5">
                                        <button
                                          onClick={() => handleViewDetails(order)}
                                          className="text-blue-400 hover:text-blue-300"
                                        >
                                          View
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Pagination */}
                  {ordersData?.pagination && (
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                      <Pagination
                        currentPage={ordersData.pagination.currentPage}
                        totalPages={ordersData.pagination.totalPages}
                        onPageChange={handlePageChange}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onTransferPayment={handleTransferPayment}
        onRefund={handleRefund}
        onCancelOrder={handleCancelOrder}
        onContinuePayment={handleContinuePayment}
        transferringOrderId={transferringOrderId}
        refundingOrderId={refundingOrderId}
        cancellingOrderId={cancellingOrderId}
        activeTab={activeTab}
      />
    </>
  );
} 
