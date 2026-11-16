"use client";

import { useState, useEffect, useRef } from "react";
import type React from "react";

interface UpdateStatusModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (status: string) => void;
  currentStatus: string;
  expenseId: number;
}

export default function UpdateStatusModal({
  open,
  onClose,
  onSubmit,
  currentStatus,
  expenseId,
}: UpdateStatusModalProps) {
  const [status, setStatus] = useState("REJECTED");
  const [submitting, setSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStatus("REJECTED");
  }, [currentStatus]);

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

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(status);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="bg-gray-900 border border-gold-500/30 rounded-lg shadow-lg w-full max-w-md mx-4"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gold-500">
              Update Expense Status
            </h2>
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
                htmlFor="status"
                className="block text-sm font-medium text-gray-300"
              >
                Select New Status
              </label>
              <div className="grid grid-cols-2 gap-4">
                {["APPROVED", "REJECTED"].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatus(value)}
                    className={`px-4 py-3 rounded-md text-center transition-colors ${
                      status === value
                        ? {
                            APPROVED: "bg-emerald-500 text-black font-medium",
                            REJECTED: "bg-red-500 text-black font-medium",
                          }[value]
                        : {
                            APPROVED:
                              "bg-gray-800 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/10",
                            REJECTED:
                              "bg-gray-800 text-red-500 border border-red-500/30 hover:bg-red-500/10",
                          }[value]
                    }`}
                  >
                    {value.charAt(0) + value.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-800 rounded-md border border-gray-700">
              <p className="text-gray-300 text-sm">
                You are about to update the status of expense #{expenseId} to{" "}
                <span
                  className={`font-medium ${
                    status === "APPROVED" ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {status.charAt(0) + status.slice(1).toLowerCase()}
                </span>
                .
              </p>
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
                className="px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
              >
                {submitting ? "Updating..." : "Update Status"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
