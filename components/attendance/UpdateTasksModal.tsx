// components/attendance/UpdateTasksModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { toast } from "react-toastify";
import { updateAttendanceTasks } from "@/services/attendance";
import useAuthStore from "@/store/authStore";

const CKEditorClient = dynamic(() => import("@/components/CKEditorClient"), {
  ssr: false,
});

interface UpdateTasksModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialTasks?: string;
}

export default function UpdateTasksModal({
  open,
  onClose,
  onSuccess,
  initialTasks = "",
}: UpdateTasksModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [tasks, setTasks] = useState(initialTasks);
  const token = useAuthStore((state) => state.token);
  const modalRef = useRef<HTMLDivElement>(null);

  // Update tasks when initialTasks changes
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Handle click outside to close the modal
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        !submitting
      ) {
        onClose();
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose, submitting]);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  const handleSubmit = async () => {
    if (!tasks.trim()) {
      toast.error("Tasks description is required");
      return;
    }

    setSubmitting(true);
    try {
      await updateAttendanceTasks(token, { tasks });
      toast.success("Tasks updated successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating tasks:", error);
      toast.error(error?.message || "Failed to update tasks. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          ref={modalRef}
          className="bg-gray-900 border border-gold-500/30 rounded-lg shadow-lg w-full max-w-3xl mx-auto my-8"
        >
          <div className="p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gold-500">
                Update Today&apos;s Tasks
              </h2>
              <button
                onClick={onClose}
                disabled={submitting}
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

            <div className="space-y-4">
              <div className="bg-gray-800 p-4 rounded-md">
                <h3 className="text-white font-medium mb-2">
                  Tasks Description*
                </h3>
                <div className="min-h-[100px] bg-gray-900 rounded-md">
                  <CKEditorClient value={tasks} onChange={setTasks} />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors mr-2"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !tasks.trim()}
                  className={`px-4 py-2 ${
                    submitting || !tasks.trim()
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-gold-500 hover:bg-gold-600"
                  } text-black rounded-md transition-colors flex items-center`}
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
                      Saving...
                    </>
                  ) : (
                    "Save Tasks"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
