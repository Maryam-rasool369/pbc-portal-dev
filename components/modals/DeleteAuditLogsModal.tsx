import React, { useState } from "react";
import { HiX } from "react-icons/hi";

interface DeleteAuditLogsModalProps {
  isOpen: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (fromDate: string, toDate: string) => void;
}

export default function DeleteAuditLogsModal({
  isOpen,
  isDeleting,
  onClose,
  onConfirm,
}: DeleteAuditLogsModalProps) {
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [error, setError] = useState<string>("");

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!fromDate || !toDate) {
      setError("Please select both a from and to date");
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      setError("'From' date must be earlier than 'To' date");
      return;
    }

    setError("");
    onConfirm(fromDate, toDate);
  };

  const handleClose = () => {
    setFromDate("");
    setToDate("");
    setError("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        <div className="inline-block align-middle bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-md sm:w-full">
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Delete Audit Logs
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {/* @ts-ignore */}
                <HiX className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="px-6 py-4 space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              All audit logs recorded within the selected date range will be
              permanently deleted. This action cannot be undone.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-gold-500 focus:border-gold-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-gold-500 focus:border-gold-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-t border-gray-200 dark:border-gray-600">
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleClose}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Logs"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
