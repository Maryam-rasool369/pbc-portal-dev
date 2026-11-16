"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import { fetchAllUsers } from "@/services/committee";
import { COMMON_TIMEZONES } from "@/constants/datetime";
import type { UserProfile } from "@/types/user";

interface MemberSelection {
  userId: number;
  role: "HEAD" | "MEMBER" | "SECRETARY" | "TREASURER";
}

interface CommitteeMeetingModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title?: string;
    name?: string;
    details?: string;
    venue?: string;
    startDate?: string;
    endDate?: string;
    timezone?: string;
    members?: MemberSelection[];
  }) => Promise<void> | void;
}

const MEMBER_ROLES = ["HEAD", "MEMBER", "SECRETARY", "TREASURER"] as const;

export default function CommitteeMeetingModal({
  open,
  onClose,
  onSubmit,
}: CommitteeMeetingModalProps) {
  const token = useAuthStore((s) => s.token);

  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [venue, setVenue] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [timezone, setTimezone] = useState("Asia/Dubai");

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [members, setMembers] = useState<MemberSelection[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  // Load users when modal opens
  useEffect(() => {
    if (open && token) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, token]);

  const loadUsers = async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const data = await fetchAllUsers(token);
      setUsers(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDetails("");
      setVenue("");
      setStartDateTime("");
      setEndDateTime("");
      setTimezone("Asia/Dubai");
      setMembers([]);
      setSearchQuery("");
    }
  }, [open]);



  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  const handleToggleMember = (userId: number) => {
    const isMember = members.some((m) => m.userId === userId);
    if (isMember) {
      setMembers(members.filter((m) => m.userId !== userId));
    } else {
      setMembers([...members, { userId, role: "MEMBER" }]);
    }
  };

  const handleRoleChange = (userId: number, role: string) => {
    setMembers(
      members.map((m) =>
        m.userId === userId
          ? {
              ...m,
              role: role as "HEAD" | "MEMBER" | "SECRETARY" | "TREASURER",
            }
          : m,
      ),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Committee title is required");
      return;
    }

    if (startDateTime && endDateTime) {
      const start = new Date(startDateTime);
      const end = new Date(endDateTime);
      if (start >= end) {
        toast.error("End date/time must be after start date/time");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: any = {
        title: title.trim(),
        name: title.trim(),
        details: details.trim() || undefined,
        venue: venue.trim() || undefined,
        timezone: timezone || undefined,
      };

      if (startDateTime) {
        const startDate = new Date(startDateTime);
        payload.startDate = startDate.toISOString();
      }

      if (endDateTime) {
        const endDate = new Date(endDateTime);
        payload.endDate = endDate.toISOString();
      }

      if (members.length > 0) {
        payload.members = members;
      }

      await onSubmit(payload);
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDetails("");
    setVenue("");
    setStartDateTime("");
    setEndDateTime("");
    setTimezone("Asia/Dubai");
    setMembers([]);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Sort timezones with Asia first
  const sortedTimezones = [...COMMON_TIMEZONES].sort((a, b) => {
    const aIsAsia = a.startsWith("Asia/");
    const bIsAsia = b.startsWith("Asia/");
    if (aIsAsia && !bIsAsia) return -1;
    if (!aIsAsia && bIsAsia) return 1;
    return a.localeCompare(b);
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full max-w-3xl mx-4 max-h-[95vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create Committee
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

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Committee Title*
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                placeholder="e.g., Sports Committee"
                required
              />
            </div>

            {/* Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Details
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                placeholder="Describe the purpose and goals of this committee"
              />
            </div>

            {/* Venue */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Venue
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                placeholder="e.g., Conference Room A, Building 1"
              />
            </div>

            {/* Start & End Date-Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={startDateTime}
                  onChange={(e) => setStartDateTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={endDateTime}
                  onChange={(e) => setEndDateTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                />
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                {sortedTimezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>

            {/* Members Selection */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select Members ({members.length})
              </label>

              {/* Search */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search members by name or email..."
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 mb-4"
              />

              {/* Members List */}
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-700/50">
                {loadingUsers ? (
                  <div className="p-4 text-center text-gray-500">
                    Loading users...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No users found
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const selected = members.find((m) => m.userId === user.id);
                    return (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 border-b border-gray-200 dark:border-gray-600 last:border-b-0 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={!!selected}
                          onChange={() => handleToggleMember(user.id)}
                          className="h-4 w-4 rounded cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white truncate">
                            {user.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {user.email}
                          </div>
                        </div>
                        {selected && (
                          <select
                            value={selected.role}
                            onChange={(e) =>
                              handleRoleChange(user.id, e.target.value)
                            }
                            className="px-2 py-1 text-sm rounded-md bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                          >
                            {MEMBER_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
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
                  "Create Committee"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
