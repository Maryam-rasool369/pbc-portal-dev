"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Button, Modal } from "flowbite-react";
import { HiArrowLeft } from "react-icons/hi";

import Link from "next/link";
import useAuthStore from "@/store/authStore";
import EditExpenseModal from "@/components/expenses/editExpenseModal";
import UpdateStatusModal from "@/components/expenses/updateStatusModal";
import Can from "@/components/rbac/Can";
import UserProfileImage from "@/components/ui/UserProfileImage";
import { useAbility } from "@/hooks/useAbility";
import {
  deleteTransaction,
  editTransaction,
  getTransactionById,
  updateTransactionStatus,
} from "@/services/expenses";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import CurrencyAmount from "@/components/ui/CurrencyAmount";

interface Expense {
  id: number;
  zohoExpenseId: string | null;
  userId: number;
  title: string;
  notes: string;
  categoryId: number;
  category: {
    id: number;
    name: string;
  };
  amount: number;
  primaryImage: string;
  secondaryImage: string | null;
  status: string;
  datePlanned?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: number;
    name: string;
  };
}

export default function ExpenseDetail() {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const ability = useAbility();

  useEffect(() => {
    if (!id || !token) return;

    if (token && !ability?.can("read", "Transaction")) {
      toast.error("You do not have permission to view transactions");
      router.push("/userMarketplace");
      return;
    }

    const fetchExpense = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getTransactionById(token, id);
        setExpense(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to fetch expense details";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    };

    fetchExpense();
  }, [id, token]);

  const handleEdit = async (formData: FormData) => {
    if (!token || !expense) return;
    try {
      await editTransaction(token, id, formData);
      toast.success("Expense updated successfully");
      setShowEditModal(false);

      const refreshed = await getTransactionById(token, id);
      setExpense(refreshed);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update expense"
      );
    }
  };

  // Handle status update
  const handleStatusUpdate = async (newStatus: string) => {
    if (!token || !expense) return;

    try {
      await updateTransactionStatus(token, id as string, newStatus);
      toast.success("Status updated successfully");

      const refreshed = await getTransactionById(token, id);
      setExpense(refreshed);
      setShowStatusModal(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status"
      );
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!token || !expense) return;
    setSubmitting(true);
    try {
      await deleteTransaction(token, String(expense.id));
      toast.success("Expense deleted successfully");
      router.push("/expense");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete expense"
      );
    } finally {
      setSubmitting(false);
      setShowDeleteModal(false);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-500/20 text-green-500";
      case "rejected":
        return "bg-red-500/20 text-red-500";
      case "pending":
        return "bg-yellow-500/20 text-yellow-500";
      default:
        return "bg-blue-500/20 text-blue-500";
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-gold-600 text-center">Loading expense...</div>
    );
  }

  if (!expense) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
        <p className="text-gray-400">
          Expense not found or you don&apos;t have permission to view it.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen">
      <div className="flex items-center mb-6">
        <button
          onClick={() => router.push("/expense")}
          className="mr-4 text-gray-400 hover:text-white flex items-center"
        >
          {/* @ts-ignore */}
          <HiArrowLeft className="h-5 w-5 mr-1" />
          Back to Expenses
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      ) : expense ? (
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden shadow-lg">
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2 md:mb-0">
                #{expense.id} - {expense.title}
              </h1>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadgeClass(expense.status)}`}
                >
                  {expense.status.charAt(0) +
                    expense.status.slice(1).toLowerCase()}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gold-500 mb-2">
                  Details
                </h2>
                <div className="bg-gray-800 p-4 rounded-md">
                  <p className="text-gray-300 whitespace-pre-wrap">
                    {expense.notes || "No description provided."}
                  </p>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gold-500 mb-2">
                  Information
                </h2>
                <div className="bg-gray-800 p-4 rounded-md">
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <p className="text-sm text-gray-400">Amount</p>
                      <p className="text-white font-bold">
                        <CurrencyAmount amount={expense.amount} />
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Zoho Expense ID</p>
                      <p className="text-white">
                        {expense.zohoExpenseId || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Category</p>
                      <p className="text-white">{expense.category.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Date Planned</p>
                      <p className="text-white">
                        {expense.datePlanned
                          ? formatDateAndTime(expense.datePlanned, true)
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Submitted At</p>
                      <p className="text-white">
                        {formatDateAndTime(expense.createdAt, true)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Last Updated</p>
                      <p className="text-white">
                        {formatDateAndTime(expense.updatedAt, true)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Receipt Images */}
            {[expense.primaryImage, expense.secondaryImage].filter(Boolean)
              .length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gold-500 mb-2">
                  Receipts
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {expense.primaryImage && (
                    <UserProfileImage
                    src={expense.primaryImage}
                    title="Receipt #1" 
                    />
                  )}
                  {expense.secondaryImage && (
                    <UserProfileImage
                    src={expense.secondaryImage}
                    title="Receipt #2" 
                    />
                  )}
                </div>
              </div>
            )}

            {expense?.status === "PENDING" && (
              <div className="flex flex-wrap gap-3 justify-end">
                {Number(user?.id) === expense.userId && (
                  <Can I="update" a="Transaction">
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                      Edit Expense
                    </button>
                  </Can>
                )}

                {Number(user?.id) !== expense.userId && (
                  <Can I="approve" a="Transaction">
                    <button
                      onClick={() => setShowStatusModal(true)}
                      className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors"
                    >
                      Update Status
                    </button>
                  </Can>
                )}

                {Number(user?.id) === expense.userId && (
                  <Can I="delete" a="Transaction">
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                    >
                      Delete Expense
                    </button>
                  </Can>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 text-center">
          <p className="text-gray-400">
            Expense not found or you don&apos;t have permission to view it.
          </p>
        </div>
      )}

      {showEditModal && expense && (
        <EditExpenseModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleEdit}
          expense={expense}
        />
      )}

      {showStatusModal && expense && (
        <UpdateStatusModal
          open={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          onSubmit={handleStatusUpdate}
          currentStatus={expense.status}
          expenseId={expense.id}
        />
      )}

      {/* Delete Modal */}
      <Modal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        size="md"
      >
        <Modal.Header className="bg-gray-800 border-b border-gray-700">
          <span className="text-gold-500">Confirm Deletion</span>
        </Modal.Header>
        <Modal.Body className="bg-gray-800 p-6">
          <p className="text-gray-300">
            Are you sure you want to delete the expense{" "}
            <span className="text-white font-bold">{expense?.title}</span>?
          </p>
        </Modal.Body>
        <Modal.Footer className="bg-gray-800 border-t border-gray-700">
          <Button
            onClick={handleDeleteConfirmed}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {submitting ? "Deleting..." : "Delete"}
          </Button>
          <Button color="gray" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
