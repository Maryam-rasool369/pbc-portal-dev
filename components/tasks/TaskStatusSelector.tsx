"use client";

import React from "react";
import { TaskStatus } from "@/types/task";

interface TaskStatusSelectorProps {
  value: TaskStatus | string;
  onChange: (status: string) => void;
  className?: string;
  showAllOption?: boolean;
}

const TaskStatusSelector: React.FC<TaskStatusSelectorProps> = ({
  value,
  onChange,
  className = "",
  showAllOption = true,
}) => {
  if (showAllOption && value === "") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`bg-gray-800 text-white border border-gray-700 rounded-md px-4 py-2 ${className}`}
      >
        <option value="">All Statuses</option>
        <option value="PENDING">Pending</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="COMPLETED">Completed</option>
      </select>
    );
  }

  const getNextStatus = (currentStatus: string): string => {
    switch (currentStatus) {
      case "PENDING":
        return "IN_PROGRESS";
      case "IN_PROGRESS":
        return "COMPLETED";
      default:
        return currentStatus;
    }
  };

  const getButtonStyle = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-500 hover:bg-yellow-600 text-black";
      case "IN_PROGRESS":
        return "bg-blue-500 hover:bg-blue-600 text-white";
      case "COMPLETED":
        return "bg-green-500 hover:bg-green-600 text-white cursor-not-allowed";
      default:
        return "bg-gray-500 hover:bg-gray-600 text-white";
    }
  };

  const getButtonText = (status: string) => {
    switch (status) {
      case "PENDING":
        return "Start Task";
      case "IN_PROGRESS":
        return "Complete Task";
      case "COMPLETED":
        return "Completed";
      default:
        return "Unknown Status";
    }
  };

  const nextStatus = getNextStatus(value as string);
  const isCompleted = value === "COMPLETED";
  // Prevent going from PENDING to COMPLETED
  const canMoveToNext = value !== "PENDING" || nextStatus !== "COMPLETED";

  return (
    <button
      onClick={() => !isCompleted && canMoveToNext && onChange(nextStatus)}
      disabled={isCompleted}
      className={`px-4 py-2 rounded-md transition-colors font-medium flex items-center justify-center gap-2 ${getButtonStyle(value as string)} ${className}`}
    >
      {value === "COMPLETED" && (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {getButtonText(value as string)}
    </button>
  );
};

export default TaskStatusSelector;
