"use client";

import { useState, useEffect, useRef } from "react";
import type React from "react";
import useAuthStore from "@/store/authStore";
import { toast } from "react-toastify";
import { RoleIdStr } from "@/enums/Roles";
import Image from "next/image";
import { HiUpload } from "react-icons/hi";

type MediaSlot = File | null;
const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.ms-excel.sheet.macroEnabled.12",
  "text/plain",
  "text/csv",
];
const FILE_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv";

interface User {
  id: number;
  name: string;
}

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function AddTaskModal({
  open,
  onClose,
  onSubmit,
}: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [imageSlots, setImageSlots] = useState<MediaSlot[]>(Array(10).fill(null));
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const token = useAuthStore((state) => state.token);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setDate("");
      setAssigneeIds([]);
      setImageSlots(Array(10).fill(null));
      setAssigneeSearch("");
    }
  }, [open]);

  const isImageFile = (file: File | null) => {
    if (!file) return false;
    return file.type.startsWith("image/");
  };

  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    slotIndex: number,
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const file = files[0];

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error(`${file.name} is not supported. Allowed: JPG, PNG, WEBP`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name} is too large. Maximum size is 25MB`);
      return;
    }

    setImageSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = file;
      return next;
    });

    if (event.target) {
      event.target.value = "";
    }
  };

  const removeImage = (slotIndex: number) => {
    setImageSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
  };

  const filteredUsers = users.filter((user) =>
    user.name.toLowerCase().includes(assigneeSearch.trim().toLowerCase())
  );

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/user/all/users?status=active&membership=verified&roleId=${[RoleIdStr.ADMIN, RoleIdStr.PBC_STAFF, RoleIdStr.DIRECTOR, RoleIdStr.PBC_ADVISOR, RoleIdStr.VC_FINANCE, RoleIdStr.GENERAL_SECRETARY, RoleIdStr.CHAIRMAN].join(',')}`,
          {
            headers: {
              "Content-Type": "application/json",
              token: token || "",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.[0]?.msg || "Failed to fetch users");
        }

        if (data && Array.isArray(data.data)) {
          console.log("Fetched users:", data.data);
          setUsers(data.data);
        } else {
          console.error("Unexpected user data format:", data);
          setUsers([]);
        }
      } catch (error) {
        console.error("Failed to fetch users:", error);
      } finally {
        setLoading(false);
      }
    };

    if (open && token) {
      fetchUsers();
    }
  }, [open, token]);

  // Close modal when clicking outside
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

  // Prevent body scrolling when modal is open
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || assigneeIds.length === 0) {
      toast.error(
        "Please fill all required fields and select at least one assignee"
      );
      return;
    }

    setSubmitting(true);

    try {
      const taskData = {
        title,
        description,
        ...(date.trim() && { date }),
        assignees: assigneeIds,
        images: imageSlots.filter((slot): slot is File => slot instanceof File),
      };

      await onSubmit(taskData);

      // Reset form
      setTitle("");
      setDescription("");
      setDate("");
      setAssigneeIds([]);
      setImageSlots(Array(10).fill(null));

      onClose();
    } catch (error) {
      console.error("Error submitting task:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAssignee = (userId: number) => {
    setAssigneeIds((prevIds) => {
      if (prevIds.includes(userId)) {
        return prevIds.filter((id) => id !== userId);
      } else {
        return [...prevIds, userId];
      }
    });
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
                Create New Task
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Title*
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
                  placeholder="Task title"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Description*
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
                  placeholder="Task description"
                  required
                ></textarea>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Date *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Images/Documents (Optional, up to {MAX_IMAGES})
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                  {imageSlots.map((slot, index) => {
                    const slotNumber = index + 1;
                    const isEmpty = slot === null;

                    return (
                      <div key={index} className="relative">
                        <div className="aspect-square border-2 border-dashed border-gray-600 rounded-lg overflow-hidden hover:border-gold-400 transition-colors bg-gray-800">
                          {isEmpty ? (
                            <div className="w-full h-full flex flex-col items-center justify-center px-1">
                              <div className="text-center">
                                <div className="mb-1">
                                  {/* @ts-ignore */}
                                  <HiUpload className="h-5 w-5 text-gray-400 mx-auto" />
                                </div>
                                <p className="text-[10px] text-gray-400">
                                  Slot {slotNumber}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const input = document.createElement("input");
                                    input.type = "file";
                                    input.accept = FILE_ACCEPT;
                                    input.onchange = (e) =>
                                      handleImageChange(e as any, index);
                                    input.click();
                                  }}
                                  className="mt-1 text-[10px] px-2 py-0.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
                                >
                                  Upload
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="relative w-full h-full group">
                              {isImageFile(slot) && (
                                <Image
                                  src={URL.createObjectURL(slot as File)}
                                  alt={`Image ${slotNumber}`}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 768px) 50vw, 20vw"
                                />
                              )}
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex flex-col items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const input = document.createElement("input");
                                      input.type = "file";
                                      input.accept = FILE_ACCEPT;
                                      input.onchange = (e) =>
                                        handleImageChange(e as any, index);
                                      input.click();
                                    }}
                                    className="bg-blue-500 text-white px-2 py-0.5 rounded text-[10px] hover:bg-blue-600"
                                    title="Replace"
                                  >
                                    Replace
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] hover:bg-red-600"
                                    title="Remove"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                              <div className="absolute top-1 left-1 bg-black bg-opacity-60 text-white text-[10px] px-1 py-0.5 rounded">
                                {slotNumber}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500">
                  Supported formats: JPG, PNG, PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, CSV. Max size: 25MB per file.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Assign To*{" "}
                  <span className="text-xs text-gray-500">
                    (select at least one)
                  </span>
                </label>

                <input
                  type="text"
                  value={assigneeSearch}
                  onChange={(e) => setAssigneeSearch(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
                  placeholder="Search users by name"
                />

                {loading ? (
                  <div className="p-3 bg-gray-800 rounded-md text-gray-400">
                    Loading users...
                  </div>
                ) : users.length === 0 ? (
                  <div className="p-3 bg-gray-800 rounded-md text-gray-400 italic">
                    No users available
                  </div>
                ) : filteredUsers.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto bg-gray-800 border border-gray-700 rounded-md divide-y divide-gray-700">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-center p-2 cursor-pointer hover:bg-gray-700 transition-colors ${assigneeIds.includes(user.id) ? "bg-gray-700" : ""
                          }`}
                      >
                        <div className="flex items-center w-full" onClick={() => toggleAssignee(user.id)}>
                          <input
                            type="checkbox"
                            id={`user-${user.id}`}
                            checked={assigneeIds.includes(user.id)}
                            onChange={() => toggleAssignee(user.id)}
                            className="w-4 h-4 text-gold-500 bg-gray-600 border-gray-500 rounded"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <label
                            className="ml-2 w-full text-sm text-gray-300 cursor-pointer"
                          >
                            {user.name}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-gray-800 rounded-md text-gray-400 italic">
                    No matching users found
                  </div>
                )}

                {assigneeIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <p className="text-xs text-gray-400 w-full">
                      Selected ({assigneeIds.length}):
                    </p>
                    {assigneeIds.map((id) => {
                      const user = users.find((u) => u.id === id);
                      return user ? (
                        <span
                          key={id}
                          className="inline-flex items-center px-2 py-1 bg-gray-700 text-xs rounded-full"
                        >
                          {user.name}
                          <button
                            type="button"
                            onClick={() => toggleAssignee(id)}
                            className="ml-1 text-gray-400 hover:text-white"
                          >
                            <svg
                              className="h-3 w-3"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors mr-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors flex items-center"
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
                    "Create Task"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
