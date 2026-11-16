"use client";

import { useState, useEffect, useRef } from "react";
import type React from "react";
import { toast } from "react-toastify";

interface AddCategoryModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  planId: number | null;
}

export default function AddCategoryModal({
  open,
  onClose,
  onSubmit,
  planId,
}: AddCategoryModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
    }
  }, [open]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !description.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!planId) {
      toast.error("No plan selected");
      return;
    }

    setSubmitting(true);

    try {
      const categoryData = {
        name,
        description,
        planId,
      };

      await onSubmit(categoryData);

      // Reset form
      setName("");
      setDescription("");

      onClose();
    } catch (error) {
      console.error("Error submitting category:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="bg-white border border-gray-200 rounded-lg shadow-lg w-full max-w-md mx-4 dark:bg-gray-800 dark:border-gray-700"
      >
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Add New Category
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name*
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Category name"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description*
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 rounded-md bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Category description"
                required
              ></textarea>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md transition-colors mr-2 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors flex items-center"
              >
                {submitting ? (
                  <>
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
                    Creating...
                  </>
                ) : (
                  "Create Category"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}