"use client";

import { useState, useEffect, useRef } from "react";
import type React from "react";
import { TaskStatus } from "@/types/task";

interface UpdateTaskStatusModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (status: TaskStatus) => void;
  currentStatus: TaskStatus;
  taskId: number;
}

export default function UpdateTaskStatusModal({
  open,
  onClose,
  onSubmit,
  currentStatus,
  taskId,
}: UpdateTaskStatusModalProps) {
  const [status, setStatus] = useState<TaskStatus>(currentStatus || "PENDING");
  const [submitting, setSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStatus(currentStatus || "PENDING");
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

  const handleSubmit = async (selectedStatus: TaskStatus) => {
    setSubmitting(true);
    try {
      await onSubmit(selectedStatus);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const getNextStatus = (current: TaskStatus): TaskStatus => {
    switch (current) {
      case "PENDING":
        return "IN_PROGRESS";
      case "IN_PROGRESS":
        return "COMPLETED";
      default:
        return current;
    }
  };

  const renderStatusButton = (
    buttonStatus: TaskStatus,
    label: string,
    description: string
  ) => {
    const isCurrentStatus = currentStatus === buttonStatus;
    // Determine if moving forward in the workflow
    const statusOrder: Record<TaskStatus, number> = {
      PENDING: 0,
      IN_PROGRESS: 1,
      COMPLETED: 2,
    };
    const isForward = statusOrder[buttonStatus] > statusOrder[currentStatus];
    const isPastStatus = statusOrder[buttonStatus] < statusOrder[currentStatus];

    let buttonStyle = "";

    if (isCurrentStatus) {
      buttonStyle = "border-2 cursor-not-allowed border-white bg-gray-700";
    } else if (isPastStatus) {
      // Allow reverting to previous stages
      buttonStyle = "bg-gray-600 hover:bg-gray-500 text-white";
    } else if (isForward) {
      buttonStyle = "bg-gold-500 hover:bg-gold-600 text-black";
    } else {
      buttonStyle = "bg-gray-700 hover:bg-gray-600";
    }

    const handleClick = async () => {
      if (submitting) return;
      if (isForward) {
        const confirmed = window.confirm(`Are you sure you want to move status to "${buttonStatus.toLowerCase().replace(/_/g, ' ')}"?`);
        if (!confirmed) return;
      }
      await handleSubmit(buttonStatus);
    };

    return (
      <button
        type="button"
        disabled={submitting || isCurrentStatus}
        onClick={handleClick}
        className={`relative p-4 rounded-lg transition-all w-full ${buttonStyle}`}
      >
        <div className="flex flex-col items-center">
          {isCurrentStatus && (
            <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
          {buttonStatus === "PENDING" && (
            <div className="text-yellow-500 mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          )}
          {buttonStatus === "IN_PROGRESS" && (
            <div className="text-blue-500 mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
          )}
          {buttonStatus === "COMPLETED" && (
            <div className="text-green-500 mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
          <span className="font-medium text-lg">{label}</span>
          <span className="text-xs text-gray-400 mt-1">{description}</span>
        </div>
      </button>
    );
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
        <div
          ref={modalRef}
          className="bg-gray-900 border border-gold-500/30 rounded-lg shadow-lg w-full max-w-md mx-4"
        >
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gold-500">
                Update Task Status
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

            <div className="mb-4">
              <p className="text-sm text-gray-300">
                Update the status of this task by selecting one of the options
                below:
              </p>
            </div>

            {submitting && (
              <div className="absolute inset-0 bg-gray-900 bg-opacity-70 flex items-center justify-center z-10 rounded-lg">
                <div className="flex flex-col items-center">
                  <svg
                    className="animate-spin h-8 w-8 text-gold-500"
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
                  <span className="mt-2 text-gold-500 font-medium">
                    Updating status...
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {/* Status progression visualization */}
              <div className="relative mb-8 px-6">
                <div className="h-1 bg-gray-700 absolute left-0 right-0 top-4"></div>
                <div className="flex justify-between relative">
                  <div
                    className={`flex flex-col items-center ${currentStatus === "PENDING" ? "text-yellow-500" : "text-green-500"}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${currentStatus === "PENDING" ? "bg-yellow-500 text-black" : "bg-green-500"}`}
                    >
                      {currentStatus === "IN_PROGRESS" ||
                        currentStatus === "COMPLETED" ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <span>1</span>
                      )}
                    </div>
                    <span className="text-xs mt-1">Pending</span>
                  </div>

                  <div
                    className={`flex flex-col items-center ${currentStatus === "IN_PROGRESS" ? "text-blue-500" : currentStatus === "COMPLETED" ? "text-green-500" : "text-gray-500"}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${currentStatus === "IN_PROGRESS" ? "bg-blue-500" : currentStatus === "COMPLETED" ? "bg-green-500" : "bg-gray-700"}`}
                    >
                      {currentStatus === "COMPLETED" ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <span>2</span>
                      )}
                    </div>
                    <span className="text-xs mt-1">In Progress</span>
                  </div>

                  <div
                    className={`flex flex-col items-center ${currentStatus === "COMPLETED" ? "text-green-500" : "text-gray-500"}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${currentStatus === "COMPLETED" ? "bg-green-500" : "bg-gray-700"}`}
                    >
                      {currentStatus === "COMPLETED" ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <span>3</span>
                      )}
                    </div>
                    <span className="text-xs mt-1">Completed</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-6">
                {renderStatusButton("PENDING", "Pending", "Task not started")}
                {renderStatusButton(
                  "IN_PROGRESS",
                  "In Progress",
                  "Currently working"
                )}
                {renderStatusButton("COMPLETED", "Completed", "Task finished")}
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
