"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import type { Committee } from "@/types/committee";

interface CreateSubCommitteeModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    description?: string;
    startDate: string;
    endDate: string;
    members: Array<{ userId: number; role: string }>;
  }) => Promise<void>;
  committeeMembers: Committee["members"];
  loading?: boolean;
}

export default function CreateSubCommitteeModal({
  open,
  onClose,
  onSubmit,
  committeeMembers = [],
  loading = false,
}: CreateSubCommitteeModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<
    Array<{ userId: number; role: string }>
  >([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setSelectedMembers([]);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Sub-committee name is required");
      return;
    }
    if (!startDate) {
      toast.error("Start date is required");
      return;
    }
    if (!endDate) {
      toast.error("End date is required");
      return;
    }
    if (selectedMembers.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      toast.error("End date must be after start date");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name,
        description,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        members: selectedMembers,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create Sub-Committee
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
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

          {/* Name Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sub-Committee Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Finance Sub-Committee"
              className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            />
          </div>

          {/* Description Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter sub-committee description"
              rows={3}
              className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 resize-none"
            />
          </div>

          {/* Date Fields */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              />
            </div>
          </div>

          {/* Members Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Members from Committee *
            </label>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-700/50">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading members...</div>
              ) : committeeMembers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No members available
                </div>
              ) : (
                committeeMembers.map((member) => {
                  const isSelected = selectedMembers.some(
                    (m) => m.userId === member.user.id
                  );
                  const selectedMember = selectedMembers.find(
                    (m) => m.userId === member.user.id
                  );

                  return (
                    <div
                      key={member.user.id}
                      className="flex items-center gap-3 p-3 border-b border-gray-200 dark:border-gray-600 last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setSelectedMembers(
                              selectedMembers.filter(
                                (m) => m.userId !== member.user.id
                              )
                            );
                          } else {
                            setSelectedMembers([
                              ...selectedMembers,
                              { userId: member.user.id, role: "MEMBER" },
                            ]);
                          }
                        }}
                        className="h-4 w-4 rounded cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {member.user?.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {member.user?.email}
                        </div>
                      </div>

                      {isSelected && (
                        <select
                          value={selectedMember?.role || "MEMBER"}
                          onChange={(e) => {
                            setSelectedMembers(
                              selectedMembers.map((m) =>
                                m.userId === member.user.id
                                  ? { ...m, role: e.target.value }
                                  : m
                              )
                            );
                          }}
                          className="px-2 py-1 text-sm rounded-md bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                        >
                          <option value="HEAD">HEAD</option>
                          <option value="MEMBER">MEMBER</option>
                          <option value="SECRETARY">SECRETARY</option>
                          <option value="TREASURER">TREASURER</option>
                        </select>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Members Summary */}
          {selectedMembers.length > 0 && (
            <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                Selected Members: {selectedMembers.length}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map((m) => {
                  const member = committeeMembers.find(
                    (cm) => cm.user.id === m.userId
                  );
                  return (
                    <span
                      key={m.userId}
                      className="text-xs px-2 py-1 bg-blue-200 dark:bg-blue-700 text-blue-900 dark:text-blue-100 rounded"
                    >
                      {member?.user?.name} ({m.role})
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md disabled:opacity-60 flex items-center transition-colors font-medium"
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
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Creating...
                </>
              ) : (
                "Create Sub-Committee"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
