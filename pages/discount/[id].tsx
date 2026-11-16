"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import {
  deleteDiscount,
  getDiscount,
  updateDiscount,
} from "@/services/discounts";
import UniversalFormModal from "@/components/modals/UniversalFormModal";
import useAuthStore from "@/store/authStore";
import { formatDateAndTime } from "@/utils/formatDateAndTime";

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

export default function DiscountDetailWithQueryClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <DiscountDetail />
    </QueryClientProvider>
  );
}

function DiscountDetail() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const authUserId = useAuthStore((state) => state.userId);
  const {
    data: discountData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["discount", id],
    queryFn: () => getDiscount(token, id),
    enabled: !!id && !!token,
  });

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editFormData || !token) return;

    try {
      const payload = {
        ...editFormData,
        value: parseInt(editFormData.value),
        startDate: editFormData.startDate.split("T")[0],
        validUntil: editFormData.validUntil.split("T")[0],
      };

      await updateDiscount(token, editFormData.id, payload);
      await queryClient.refetchQueries({ queryKey: ["discount", id] });
      toast.success("Discount updated successfully");
      setIsEditModalOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to update discount");
    }
  };

  const confirmDelete = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!token || !discount?.id) return;
    try {
      await deleteDiscount(token, discount.id);
      toast.success("Discount deleted successfully");
      router.push("/admin/discounts");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete discount");
    } finally {
      setShowDeleteModal(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !discount?.id) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this discount?",
    );
    if (!confirmed) return;

    try {
      await deleteDiscount(token, discount.id);
      toast.success("Discount deleted successfully");
      router.push("/admin/discounts");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete discount");
    }
  };

  useEffect(() => {
    if (error) {
      toast.error(error.message);
    }
  }, [error]);

  const discount = discountData;

  return (
    <>
      {discount ? (
        <>
          <Head>
            <title>{discount.title} | PBC Dubai</title>
            <meta name="description" content={discount.description} />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />
            <link rel="icon" href="/favicon.ico" />
          </Head>

          <div className="container mx-auto px-4 py-8 h-screen">
            <button
              onClick={() => router.push("/userMarketplace")}
              className="flex items-center text-gray-400 hover:text-gold-500 transition-colors mb-4"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Marketplace
            </button>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {discount.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {discount.description}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Value
                  </p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {discount.value}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Code
                  </p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {discount.discountCode}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Start At
                  </p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatDateAndTime(discount.startDate, true, true)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Valid Until
                  </p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatDateAndTime(discount.validUntil, true, true)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Is Active
                  </p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {discount.isActive ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Is Featured
                  </p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {discount.isFeatured ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Created At
                  </p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatDateAndTime(discount.createdAt, false)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Last Updated At
                  </p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {formatDateAndTime(discount.updatedAt, false)}
                  </p>
                </div>
              </div>

              {discount.userId === authUserId && (
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <button
                    onClick={() => {
                      setEditFormData(discount);
                      setIsEditModalOpen(true);
                    }}
                    className="py-2 px-4 bg-yellow-500 hover:bg-yellow-700 text-white rounded-md"
                  >
                    Edit Discount
                  </button>

                  <button
                    onClick={confirmDelete}
                    className="py-2 px-4 bg-red-800 hover:bg-red-800 text-white rounded-md"
                  >
                    Delete Discount
                  </button>
                </div>
              )}
            </div>

            {isEditModalOpen && editFormData && (
              <UniversalFormModal
                title="Edit Discount"
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSubmit={handleEditSubmit}
                isSubmitting={false}
                fields={[
                  {
                    id: "title",
                    label: "Title",
                    type: "text",
                    value: editFormData.title,
                    onChange: (e) =>
                      setEditFormData((prev) => ({
                        ...prev,
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
                        ...prev,
                        description: e.target.value,
                      })),
                  },
                  {
                    id: "value",
                    label: "Discount Value",
                    type: "number",
                    value: editFormData.value,
                    onChange: (e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        value: e.target.value,
                      })),
                  },
                  {
                    id: "discountCode",
                    label: "Discount Code",
                    type: "text",
                    value: editFormData.discountCode,
                    onChange: (e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        discountCode: e.target.value,
                      })),
                  },
                  {
                    id: "startDate",
                    label: "Start Date",
                    type: "date",
                    value: editFormData.startDate.split("T")[0],
                    onChange: (e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      })),
                  },
                  {
                    id: "validUntil",
                    label: "Valid Until",
                    type: "date",
                    value: editFormData.validUntil.split("T")[0],
                    onChange: (e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        validUntil: e.target.value,
                      })),
                  },
                ]}
              />
            )}
          </div>
        </>
      ) : (
        <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
          <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-md shadow-md">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Confirm Deletion
            </h2>
            <p className="mb-6 text-gray-700 dark:text-gray-300">
              Are you sure you want to delete this discount?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirmed}
                className="px-4 py-2 bg-red-600 hover:bg-red-800 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
