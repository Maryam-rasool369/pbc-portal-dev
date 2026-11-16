import React from "react";
import { Order } from "@/types/order";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import Can from "../rbac/Can";
import CurrencyAmount from "@/components/ui/CurrencyAmount";

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onTransferPayment?: (orderId: number) => void;
  onRefund?: (orderId: number) => void;
  onCancelOrder?: (orderId: number) => void;
  onContinuePayment?: (orderId: number) => void;
  transferringOrderId: number | null;
  refundingOrderId: number | null;
  cancellingOrderId: number | null;
  activeTab?: string;
}

export default function OrderDetailsModal({ 
  order, 
  isOpen, 
  onClose,
  onTransferPayment,
  onRefund,
  onCancelOrder,
  onContinuePayment,
  transferringOrderId,
  refundingOrderId,
  cancellingOrderId,
  activeTab
}: OrderDetailsModalProps) {
  if (!isOpen || !order) return null

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
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  const showPaymentActions = order.paymentStatus === 'COMPLETED' && order.transactionStatus === 'PENDING';
  const showRedoPaymentAction = order.paymentStatus === 'PENDING';
  

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Order Details
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Order Summary */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                Order Summary
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Order ID:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    #{order.id}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Order Date:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDateAndTime(order.createdAt, true, true)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Payment Status:</span>
                  <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.paymentStatus || "pending")}`}>
                    {order.paymentStatus || "Pending"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Transaction Status:</span>
                  <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.transactionStatus || "pending")}`}>
                    {order.transactionStatus || "Pending"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Total:</span>
                  <p className="font-medium text-gray-900 dark:text-white">
                    <CurrencyAmount amount={order.discountedPrice} />
                  </p>
                </div>
              </div>
            </div>

            {(order.user || order.buyer) && (
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                  {order.buyer ? "Buyer Information" : "Customer Information"}
                </h4>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                  <p className="text-gray-900 dark:text-white">
                    <span className="font-medium">Name:</span> {order.buyer?.name || order.user?.name || "Unknown"}
                  </p>
                  <p className="text-gray-900 dark:text-white">
                    <span className="font-medium">Email:</span> {order.buyer?.email || order.user?.email || "No email"}
                  </p>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                Order Items
              </h4>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <img
                      src={item.productImage}
                      alt={item.productName}
                      className="w-16 h-16 rounded object-cover"
                    />
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 dark:text-white">
                        {item.productName}
                      </h5>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Seller: {item.seller}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Price: <CurrencyAmount amount={item.price} />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                Pricing Details
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Subtotal:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    <CurrencyAmount amount={order.originalPrice} />
                  </span>
                </div>
                {order.isDiscountApplied && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Discount ({order.discountValue}%):</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      -<CurrencyAmount amount={order.originalPrice - order.discountedPrice} />
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-600 pt-2">
                  <span className="font-semibold text-gray-900 dark:text-white">Total:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    <CurrencyAmount amount={order.discountedPrice} />
                  </span>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                Delivery Address
              </h4>
              {order.address ? (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                  <p className="text-gray-900 dark:text-white">{order.address.addressLine1}</p>
                  {order.address.addressLine2 && (
                    <p className="text-gray-900 dark:text-white">{order.address.addressLine2}</p>
                  )}
                  <p className="text-gray-900 dark:text-white">
                    {order.address.city}, {order.address.country} {order.address.zipCode}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                  <p className="text-gray-500 dark:text-gray-400">
                    Address ID: {order.addressId}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Address details are stored separately and can be retrieved using the address ID.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3 border-t border-gray-200 dark:border-gray-600">
            <div className="flex justify-end space-x-3">

              {onCancelOrder && order.id && showRedoPaymentAction && (
                <button
                  onClick={() => onCancelOrder(order.id)}
                  disabled={!order.id || cancellingOrderId === order.id}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 border border-transparent rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancellingOrderId === order.id ? (
                    <>
                      <svg className="inline animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Cancelling...
                    </>
                  ) : (
                    "Cancel Order"
                  )}
                </button>
              )}
              {onContinuePayment && order.id && showRedoPaymentAction && (
                <button
                  onClick={() => onContinuePayment(order.id)}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-500 border border-transparent rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                  Continue Payment
                </button>
              )}

              {showPaymentActions && (
                <>
                  <Can I="manage" a="Order">
                    <button
                      onClick={() => onTransferPayment && order.id && onTransferPayment(order.id)}
                      disabled={!order.id || transferringOrderId === order.id || refundingOrderId === order.id}
                      className={`px-4 py-2 text-sm font-medium border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        transferringOrderId === order.id || refundingOrderId === order.id
                          ? 'text-gray-500 bg-gray-300 cursor-not-allowed'
                          : 'text-white bg-green-500 hover:bg-green-600 focus:ring-green-500'
                      }`}
                    >
                      {transferringOrderId === order.id ? (
                        <>
                          <svg className="inline animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                          Transferring...
                        </>
                      ) : (
                        "Transfer Payment"
                      )}
                    </button>
      
                    <button
                      onClick={() => onRefund && order.id && onRefund(order.id)}
                      disabled={!order.id || refundingOrderId === order.id || transferringOrderId === order.id}
                      className={`px-4 py-2 text-sm font-medium border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        refundingOrderId === order.id || transferringOrderId === order.id
                          ? 'text-gray-500 bg-gray-300 cursor-not-allowed'
                          : 'text-white bg-orange-500 hover:bg-orange-600 focus:ring-orange-500'
                      }`}
                    >
                      {refundingOrderId === order.id ? (
                        <>
                          <svg className="inline animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                          Refunding...
                        </>
                      ) : (
                        "Refund"
                      )}
                    </button>
                  </Can>
                </>
              )}
              
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
