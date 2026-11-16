"use client";

import type React from "react";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { HiDownload } from "react-icons/hi";

import Can from "@/components/rbac/Can";
import AddExpenseModal from "@/components/expenses/addExpenseModal";
import UpdateStatusModal from "@/components/expenses/updateStatusModal";
import Pagination from "@/components/common/Pagination";
import useAuthStore from "@/store/authStore";
import {
  createTransaction,
  exportTransactionsToExcel,
  fetchAllTransactions,
  updateTransactionStatus,
} from "@/services/expenses";
import { useAbility } from "@/hooks/useAbility";
import { Roles } from "@/enums/Roles";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import CurrencyAmount from "@/components/ui/CurrencyAmount";

interface Category {
  id: number;
  name: string;
}
interface Expense {
  id: number;
  title: string;
  amount: number;
  images: string[];
  date: string;
  status: string;
  category: Category;
  primaryImage: string;
  secondaryImage: string | null;
  datePlanned?: string;
  createdAt: string;
  userId: number;
}

interface PaginationInfo {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}

enum TransactionStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export default function Expenses() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TransactionStatus>(TransactionStatus.PENDING);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);
  const ability = useAbility();
  const user = useAuthStore((state) => state.user);

  const token = useAuthStore((state) => state.token);
  const [selectedExpense, setSelectedExpense] = useState<{
    id: number;
    status: string;
  } | null>(null);

  const [pagination, setPagination] = useState<PaginationInfo>({
    totalItems: 0,
    totalPages: 0,
    currentPage: 1,
    itemsPerPage: 10,
  });

  const fetchExpenses = async () => {
    if (!token || token === "undefined") return;

    setLoading(true);
    try {
      const data = await fetchAllTransactions(
        token,
        pagination.currentPage,
        pagination.itemsPerPage,
        selectedTab
      );
      const { data: transactions, pagination: paginationData } = data;

      setPagination(
        (user?.Role?.name === Roles.INDIVIDUAL ||
          user?.Role?.name === Roles.CORPORATE) &&
          user
          ? {
              totalItems: transactions.filter(
                (transaction: Expense) => transaction.userId === Number(user.id)
              ).length,
              totalPages: Math.ceil(
                transactions.filter(
                  (transaction: Expense) =>
                    transaction.userId === Number(user.id)
                ).length / pagination.itemsPerPage
              ),
              currentPage: paginationData.currentPage,
              itemsPerPage: pagination.itemsPerPage,
            }
          : {
              totalItems: paginationData.totalItems,
              totalPages: paginationData.totalPages,
              currentPage: paginationData.currentPage,
              itemsPerPage: pagination.itemsPerPage,
            }
      );

      const mappedExpenses = transactions.map((transaction: Expense) => ({
        id: transaction.id,
        title: transaction.title,
        category: transaction.category.name,
        amount: transaction.amount,
        images: [transaction.primaryImage, transaction.secondaryImage].filter(
          Boolean
        ),
        date: formatDateAndTime(
          transaction.datePlanned || transaction.createdAt,
          true
        ),
        status: transaction.status.toLowerCase(),
        userId: transaction.userId,
      }));

      setExpenses(
        user?.Role?.name === Roles.INDIVIDUAL ||
          user?.Role?.name === Roles.CORPORATE
          ? mappedExpenses.filter(
              (expense: Expense) => expense.userId === Number(user.id)
            )
          : mappedExpenses
      );
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch expenses"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || token === "undefined" || !user) return;

    if (token && !ability?.can("read", "Transaction")) {
      toast.error("You do not have permission to view transactions");
      router.push("/userMarketplace");
      return;
    }

    fetchExpenses();
  }, [token, pagination.currentPage, pagination.itemsPerPage, selectedTab]);

  useEffect(() => {
    if (!showExportDropdown) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showExportDropdown]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({
      ...prev,
      currentPage: newPage,
    }));
  };

  // Navigate to expense details
  const navigateToExpense = (id: number) => {
    router.push(`/expense/${id}`);
  };

  // Handle adding a new expense
  const handleAddExpense = async (expenseData: FormData) => {
    if (!token) {
      toast.error("You must be logged in to add an expense");
      return;
    }

    try {
      await createTransaction(token, expenseData);
      toast.success("Expense added successfully");

      await fetchExpenses();

      setShowAddModal(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add expense"
      );
      throw error;
    }
  };

  // Handle status update
  const handleStatusUpdate = async (newStatus: string) => {
    if (!token || !selectedExpense) return;

    try {
      await updateTransactionStatus(
        token,
        String(selectedExpense.id),
        newStatus
      );
      toast.success("Status updated successfully");
      setShowStatusModal(false);

      const updatedExpenses = expenses.map((expense) =>
        expense.id === selectedExpense.id
          ? { ...expense, status: newStatus.toLowerCase() }
          : expense
      );
      setExpenses(updatedExpenses);
      setSelectedExpense(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update status"
      );
    }
  };

  // Open status update modal
  const openStatusModal = (e: React.MouseEvent, expense: Expense) => {
    e.stopPropagation(); // Prevent navigation to expense details
    setSelectedExpense({
      id: expense.id,
      status: expense.status.toUpperCase(),
    });
    setShowStatusModal(true);
  };

  const handleExportExcel = async (
    exportStatus: "PENDING" | "APPROVED" | "REJECTED" | "ALL"
  ) => {
    if (!token || token === "undefined") {
      toast.error("You are not logged in");
      return;
    }

    try {
      setShowExportDropdown(false);
      setIsExporting(true);
      const blob = await exportTransactionsToExcel(token, exportStatus);
      const timestamp = new Date()
        .toLocaleString("en-US", { hour12: false })
        .replace(/[/:, ]/g, "-");

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses-${
        exportStatus === "ALL" ? "all-statuses" : exportStatus.toLowerCase()
      }-${timestamp}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Expenses exported successfully");
    } catch (error: any) {
      console.error("Failed to export expenses:", error);
      toast.error(error.message || "Failed to export expenses");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 bg-gray-800 mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h3 className="text-2xl font-bold text-white mb-4 sm:mb-0">Expenses</h3>
        <div className="flex gap-4">
          <Can I="manage" a="Transaction">
            <div className="relative" ref={exportDropdownRef}>
              <button
                onClick={() => setShowExportDropdown((prev) => !prev)}
                disabled={isExporting || loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                    Exporting...
                  </>
                ) : (
                  <>
                    {/* @ts-ignore */}
                    <HiDownload className="h-5 w-5 mr-2" />
                    Export Excel
                  </>
                )}
              </button>

              {showExportDropdown && !isExporting && (
                <div className="absolute right-0 mt-2 w-52 rounded-md border border-gray-700 bg-gray-900 shadow-xl z-20">
                  {[
                    { label: "Pending", value: "PENDING" },
                    { label: "Approved", value: "APPROVED" },
                    { label: "Rejected", value: "REJECTED" },
                    { label: "All", value: "ALL" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        handleExportExcel(
                          option.value as
                            | "PENDING"
                            | "APPROVED"
                            | "REJECTED"
                            | "ALL"
                        )
                      }
                      className="block w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-800"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Can>

          <Can I="create" a="Transaction">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Add Expense
            </button>
          </Can>

          <Can I="read" a="TransactionCategory">
            <button
              onClick={() => router.push(`/expense/categories`)}
              className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md flex items-center transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5h6M9 3h6a2 2 0 012 2v2H7V5a2 2 0 012-2zm3 7h4m-4 4h4m-4 4h4m-6 0H7m0-4h2m-2-4h2"
                />
              </svg>
              Categories
            </button>
          </Can>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex border-b border-gray-700">
          {Object.values(TransactionStatus).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-6 py-3 font-medium ${
                selectedTab === tab
                  ? "text-gold-500 border-b-2 border-gold-500"
                  : "text-gray-400 hover:text-gold-400 hover:border-b-2 hover:border-gold-400"
              } transition-colors`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-[500px]">
        {loading && expenses.length === 0 ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-20 bg-gray-800 rounded-lg border border-gray-700">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto text-gray-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
            <h2 className="text-xl font-medium text-gray-400">
              No {selectedTab} expenses found
            </h2>
            <p className="text-gray-500 mt-2">
              {selectedTab === TransactionStatus.PENDING
                ? "Add a new expense to get started"
                : `No ${selectedTab} expenses at the moment`}
            </p>
          </div>
        ) : (
          <Can I="read" a="Transaction">
            <div className="grid grid-cols-1 gap-6">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="bg-gray-800 border border-gold-500/30 hover:border-gold-500 rounded-xl p-5 cursor-pointer transition-all relative"
                >
                  <div onClick={() => navigateToExpense(expense.id)}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl text-gold-500 font-bold">
                          {expense.title}
                        </h2>
                        <p className="text-gray-400 mt-1">
                          {expense.category.name}
                        </p>
                      </div>
                      <span className="text-xl font-bold text-gold-500">
                        <CurrencyAmount amount={expense.amount} />
                      </span>
                    </div>

                    {expense.images && expense.images.length > 0 && (
                      <div className="flex mt-4 space-x-3">
                        {expense.images.map((image, idx) => (
                          <div
                            key={idx}
                            className="w-16 h-16 bg-gray-700 rounded-md overflow-hidden"
                          >
                            {image ? (
                              <img
                                src={image || "/placeholder.svg"}
                                alt={`Receipt ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-500">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-6 w-6"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
                      <span className="text-gray-400">{expense.date}</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          expense.status === "approved"
                            ? "bg-emerald-500/20 text-emerald-500"
                            : expense.status === "rejected"
                              ? "bg-red-500/20 text-red-500"
                              : "bg-amber-500/20 text-amber-500"
                        }`}
                      >
                        {expense.status.charAt(0).toUpperCase() +
                          expense.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {expense.status === "pending" && expense?.userId !== Number(user?.id) && (
                    <Can I="approve" a="Transaction">
                      <button
                        onClick={(e) => openStatusModal(e, expense)}
                        className="absolute top-20 right-5 p-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                        title="Update Status"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gold-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </button>
                    </Can>
                  )}
                </div>
              ))}
            </div>
          </Can>
        )}

        {/* Pagination Section */}
        {!loading && expenses.length > 0 && pagination && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            isLoading={loading}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {showAddModal && (
        <AddExpenseModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddExpense}
        />
      )}

      {showStatusModal && selectedExpense && (
        <UpdateStatusModal
          open={showStatusModal}
          onClose={() => {
            setShowStatusModal(false);
            setSelectedExpense(null);
          }}
          onSubmit={handleStatusUpdate}
          currentStatus={selectedExpense.status}
          expenseId={selectedExpense.id}
        />
      )}
    </div>
  );
}
