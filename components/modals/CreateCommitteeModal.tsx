"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import { fetchAllUsers } from "@/services/committee";

const CKEditorClient = dynamic(() => import("@/components/CKEditorClient"), {
  ssr: false,
  loading: () => <p className="text-gray-400">Loading Editor...</p>,
});
import type { UserProfile } from "@/types/user";

interface MemberSelection {
  userId: number;
  role: "HEAD" | "MEMBER" | "SECRETARY" | "TREASURER";
}

interface CreateCommitteeModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name?: string;
    details?: string;
    startDate?: string;
    endDate?: string;
    members?: MemberSelection[];
  }) => Promise<void> | void;
}

const MEMBER_ROLES = ["HEAD", "MEMBER", "SECRETARY", "TREASURER"] as const;

export default function CreateCommitteeModal({
  open,
  onClose,
  onSubmit,
}: CreateCommitteeModalProps) {
  const token = useAuthStore((s) => s.token);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
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

    if (!name.trim()) {
      toast.error("Committee name is required");
      return;
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        toast.error("End date must be after start date");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
      };

      if (description) {
        payload.details = description.trim();
      }

      if (startDate) {
        const start = new Date(startDate);
        payload.startDate = start.toISOString();
      }

      if (endDate) {
        const end = new Date(endDate);
        payload.endDate = end.toISOString();
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
    setName("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setMembers([]);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full max-w-2xl mx-4 max-h-[95vh] overflow-y-auto"
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
            {/* Committee Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Committee Name*
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                placeholder="e.g., Sports Committee"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <CKEditorClient
                value={description}
                onChange={setDescription}
              />
            </div>

            {/* Start & End Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
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
                  End Date
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
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Create Committee
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
