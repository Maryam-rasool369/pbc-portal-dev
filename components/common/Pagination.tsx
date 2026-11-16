import React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  isLoading?: boolean;
  onPageChange: (page: number) => void;
  maxVisiblePages?: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  isLoading = false,
  onPageChange,
  maxVisiblePages = 3,
}: PaginationProps) {
  if (!totalPages || totalPages <= 1) return null;

  const pages = [];

  if (totalPages <= maxVisiblePages + 2) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    if (currentPage <= maxVisiblePages) {
      pages.push(1, 2, 3, "...", totalPages);
    } else if (currentPage >= totalPages - maxVisiblePages + 1) {
      pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(
        1,
        "...",
        currentPage - 1,
        currentPage,
        currentPage + 1,
        "...",
        totalPages,
      );
    }
  }

  return (
    <div className="flex justify-center mt-8">
      <div className="flex items-center gap-2">
        <button
          className={`px-3 py-2 rounded-lg text-white flex items-center gap-1 ${
            currentPage === 1
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-gold-500 hover:bg-gold-600"
          }`}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Prev
        </button>

        {pages.map((pageNum, index) => (
          <button
            key={index}
            onClick={() => typeof pageNum === "number" && onPageChange(pageNum)}
            disabled={pageNum === "..." || isLoading}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              currentPage === pageNum
                ? "bg-gold-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            } ${pageNum === "..." ? "cursor-default" : "cursor-pointer"}`}
          >
            {pageNum}
          </button>
        ))}

        <button
          className={`px-3 py-2 rounded-lg text-white flex items-center gap-1 ${
            currentPage === totalPages
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-gold-500 hover:bg-gold-600"
          }`}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
        >
          Next
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
