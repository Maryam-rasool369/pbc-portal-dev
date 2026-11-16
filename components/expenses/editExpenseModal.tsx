"use client";

import { fetchTransactionCategories } from "@/services/expenses";
import useAuthStore from "@/store/authStore";
import { useState, useEffect, useRef } from "react";
import type React from "react";

interface Category {
  id: number;
  name: string;
}

interface Expense {
  id: number;
  title: string;
  notes?: string;
  amount: number;
  categoryId: number;
  datePlanned?: string;
  primaryImage?: string;
  secondaryImage?: string | null;
}

interface EditExpenseModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  expense: Expense;
}

export default function EditExpenseModal({
  open,
  onClose,
  onSubmit,
  expense,
}: EditExpenseModalProps) {
  const [title, setTitle] = useState(expense.title || "");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState(expense.amount?.toString() || "");
  const [categoryId, setCategoryId] = useState(
    expense.categoryId?.toString() || ""
  );
  const [date, setDate] = useState(
    expense.datePlanned ? expense.datePlanned.split("T")[0] : ""
  );
  const [primaryImage, setPrimaryImage] = useState<File | null>(null);
  const [secondaryImage, setSecondaryImage] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const token = useAuthStore((state) => state.token);
  const modalRef = useRef<HTMLDivElement>(null);
  const primaryImageRef = useRef<HTMLInputElement>(null);
  const secondaryImageRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setTitle(expense.title || "");
      setNotes(expense.notes || "");
      setAmount(expense.amount?.toString() || "");
      setCategoryId(expense.categoryId?.toString() || "");
      setDate(expense.datePlanned ? expense.datePlanned.split("T")[0] : "");
      setPrimaryImage(null);
      setSecondaryImage(null);
    }
  }, [expense, open]);

  // Fetch categories when token is available
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const result = await fetchTransactionCategories(token || "");
      setCategories(result || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchCategories();
  }, [token]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose]);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  const handlePrimaryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPrimaryImage(e.target.files[0]);
    }
  };

  const handleSecondaryImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files[0]) {
      setSecondaryImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !amount || !categoryId) {
      alert("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();

      // 💡 Always convert values explicitly to match backend expectations
      formData.append("title", title.trim());
      formData.append("notes", notes.trim() || "");
      formData.append("amount", parseFloat(amount).toFixed(2)); // → e.g. "123.00"
      formData.append("categoryId", String(parseInt(categoryId))); // → e.g. "3"
      if (date.trim()) {
        formData.append("date", date);
      }

      if (primaryImage) formData.append("primaryImage", primaryImage);
      if (secondaryImage) formData.append("secondaryImage", secondaryImage);

      await onSubmit(formData); // This calls your editTransaction() function
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="bg-gray-900 border border-gold-500/30 rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gold-500">Edit Expense</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-300"
              >
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter expense title"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-300"
              >
                Description
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter expense description"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500 min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-gray-300"
                >
                  Amount *
                </label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-gray-300"
                >
                  Category *
                </label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="date"
                className="block text-sm font-medium text-gray-300"
              >
                Date *
              </label>
              <input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="primaryImage"
                className="block text-sm font-medium text-gray-300"
              >
                Primary Receipt Image{" "}
                {expense.primaryImage && "(Will replace existing image)"}
              </label>
              <input
                id="primaryImage"
                type="file"
                ref={primaryImageRef}
                onChange={handlePrimaryImageChange}
                accept="image/*"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              {primaryImage && (
                <div className="mt-2 p-2 bg-gray-800 rounded-md">
                  <p className="text-sm text-gray-300 truncate">
                    {primaryImage.name}
                  </p>
                </div>
              )}
              {expense.primaryImage && !primaryImage && (
                <div className="mt-2 p-2 bg-gray-800 rounded-md flex items-center">
                  <img
                    src={expense.primaryImage || "/placeholder.svg"}
                    alt="Current primary receipt"
                    className="h-10 w-10 object-cover rounded mr-2"
                  />
                  <p className="text-sm text-gray-300">
                    Current image will be kept if no new image is selected
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="secondaryImage"
                className="block text-sm font-medium text-gray-300"
              >
                Secondary Receipt Image{" "}
                {expense.secondaryImage && "(Will replace existing image)"}
              </label>
              <input
                id="secondaryImage"
                type="file"
                ref={secondaryImageRef}
                onChange={handleSecondaryImageChange}
                accept="image/*"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              {secondaryImage && (
                <div className="mt-2 p-2 bg-gray-800 rounded-md">
                  <p className="text-sm text-gray-300 truncate">
                    {secondaryImage.name}
                  </p>
                </div>
              )}
              {expense.secondaryImage && !secondaryImage && (
                <div className="mt-2 p-2 bg-gray-800 rounded-md flex items-center">
                  <img
                    src={expense.secondaryImage || "/placeholder.svg"}
                    alt="Current secondary receipt"
                    className="h-10 w-10 object-cover rounded mr-2"
                  />
                  <p className="text-sm text-gray-300">
                    Current image will be kept if no new image is selected
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gold-500 text-gold-500 rounded-md hover:bg-gold-500/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors ${
                  submitting ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {submitting ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-black"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Updating...
                  </span>
                ) : (
                  "Update Expense"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
