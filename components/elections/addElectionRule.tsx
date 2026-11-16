"use client";

import { useState, useEffect, useRef } from "react";
import type React from "react";
import dynamic from "next/dynamic";

const CKEditorClient = dynamic(() => import("@/components/CKEditorClient"), {
  ssr: false,
  loading: () => <p className="text-gray-400">Loading editor...</p>,
});

interface AddElectionRuleModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; content: string }) => void;
}

export default function AddElectionRuleModal({
  open,
  onClose,
  onSubmit,
}: AddElectionRuleModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

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
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setTitle("");
      setContent("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle) {
      alert("Please fill in the title field");
      return;
    }

    if (!trimmedContent) {
      alert("Please fill in the content field");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ title: trimmedTitle, content: trimmedContent });
      setTitle("");
      setContent("");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="bg-gray-800 border border-gold-500/30 rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">Add New Election Rule</h2>
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
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                placeholder="Enter election rule title"
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="content"
                className="block text-sm font-medium text-gray-300"
              >
                Content
              </label>
              <div className="border border-gray-700 rounded-md">
                <CKEditorClient
                  value={content}
                  onChange={setContent}
                  readOnly={false}
                />
              </div>
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
                    Creating...
                  </span>
                ) : (
                  "Create Rule"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

