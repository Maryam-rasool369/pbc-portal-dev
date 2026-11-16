"use client";

import { useEffect, useRef } from "react";

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface DeleteCategoryModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  category: Category;
}

export default function DeleteCategoryModal({
  open,
  onClose,
  onConfirm,
  category,
}: DeleteCategoryModalProps) {
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="bg-gray-900 border border-red-500/30 rounded-lg shadow-lg w-full max-w-md mx-4"
      >
        <div className="p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-red-500">
              Delete Ticket Category
            </h2>
          </div>

          <div className="text-center mb-6">
            <p className="text-gray-300">
              Are you sure you want to delete the ticket category{" "}
              <span className="font-bold text-white">{category.name}</span>?
            </p>
            <p className="text-gray-400 mt-2">This action cannot be undone.</p>
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-md text-sm text-red-300">
              <p>
                <strong>Warning:</strong> Deleting this category may affect
                tickets that use it. Make sure there are no active tickets using
                this category before deleting.
              </p>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Delete Ticket Category
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
