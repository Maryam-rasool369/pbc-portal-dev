"use client";

import { useState, useEffect, useRef } from "react";
import type React from "react";
import { Task } from "@/types/task";
import { toast } from "react-toastify";
import Image from "next/image";
import { HiUpload } from "react-icons/hi";

type MediaSlot = File | string | null;
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

interface EditTaskModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { title?: string; description?: string; date?: string; images?: File[]; existingPhotoUrls?: string[] }) => void;
  currentTask: Task;
}

export default function EditTaskModal({
  open,
  onClose,
  onSubmit,
  currentTask,
}: EditTaskModalProps) {
  const [title, setTitle] = useState(currentTask?.title || "");
  const [description, setDescription] = useState(
    currentTask?.description || "",
  );
  const [date, setDate] = useState(
    currentTask?.datePlanned ? currentTask.datePlanned.split("T")[0] : "",
  );
  const [imageSlots, setImageSlots] = useState<MediaSlot[]>(Array(10).fill(null));
  const [imagesChanged, setImagesChanged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentTask) {
      setTitle(currentTask.title);
      setDescription(currentTask.description);
      setDate(currentTask.datePlanned ? currentTask.datePlanned.split("T")[0] : "");

      const prefilledMedia: MediaSlot[] = [
        ...(currentTask.photoUrls || []).slice(0, MAX_IMAGES),
      ];
      while (prefilledMedia.length < MAX_IMAGES) {
        prefilledMedia.push(null);
      }
      setImageSlots(prefilledMedia);
      setImagesChanged(false);
    }
  }, [currentTask]);

  const isImageFile = (file: MediaSlot) => {
    if (!file) return false;
    if (file instanceof File) return file.type.startsWith("image/");
    return /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(file);
  };

  const getFileLabel = (file: File | string) => {
    if (typeof file === "string") return decodeURIComponent(file.split("/").pop() || "File");
    return file.name || "File";
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
    setImagesChanged(true);

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
    setImagesChanged(true);
  };

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

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const hasChanges =
      title !== currentTask.title ||
      description !== currentTask.description ||
      date !== (currentTask.datePlanned ? currentTask.datePlanned.split("T")[0] : "") ||
      imagesChanged;

    if (!hasChanges) {
      onClose();
      return;
    }

    setSubmitting(true);

    try {
      const updates: { title?: string; description?: string; date?: string; images?: File[]; existingPhotoUrls?: string[] } = {};
      updates.title = title;
      updates.description = description;
      if (date.trim()) {
        updates.date = date;
      }
      if (imagesChanged) {
        updates.images = imageSlots.filter((slot): slot is File => slot instanceof File);
        updates.existingPhotoUrls = imageSlots.filter((slot): slot is string => typeof slot === "string");
      }

      await onSubmit(updates);
      onClose();
    } catch (error) {
      console.error("Error updating task:", error);
    } finally {
      setSubmitting(false);
    }
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
              <h2 className="text-xl font-bold text-gold-500">Edit Task</h2>
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
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
                  placeholder="Task description"
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
                              {isImageFile(slot) ? (
                                <Image
                                  src={slot instanceof File ? URL.createObjectURL(slot) : slot}
                                  alt={`Image ${slotNumber}`}
                                  fill
                                  className="object-cover"
                                  sizes="(max-width: 768px) 50vw, 20vw"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-700 p-1 text-center">
                                  <div className="mb-1 text-gray-300 text-[10px] font-semibold">
                                    DOCUMENT
                                  </div>
                                  <div className="text-[10px] text-gray-200 break-all line-clamp-3">
                                    {getFileLabel(slot)}
                                  </div>
                                </div>
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
                  disabled={
                    submitting ||
                    !title.trim() ||
                    (!imagesChanged &&
                      title === currentTask.title &&
                      description === currentTask.description &&
                      date ===
                      (currentTask.datePlanned
                        ? currentTask.datePlanned.split("T")[0]
                        : ""))
                  }
                  className={`px-4 py-2 ${!title.trim() ||
                    (!imagesChanged &&
                      title === currentTask.title &&
                      description === currentTask.description &&
                      date ===
                      (currentTask.datePlanned
                        ? currentTask.datePlanned.split("T")[0]
                        : ""))
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
                    "Save Changes"
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
