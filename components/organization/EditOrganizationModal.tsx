"use client";

import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import type { Organization } from "@/services/organization";
import "react-toastify/dist/ReactToastify.css";

interface EditOrganizationModalProps {
  open: boolean;
  onClose: () => void;
  organization: Organization | null;
  onSubmit: (data: { name: string; description: string }) => Promise<void> | void;
}

export default function EditOrganizationModal({
  open,
  onClose,
  organization,
  onSubmit,
}: EditOrganizationModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (organization && open) {
      setName(organization.name || "");
      setDescription(organization.description || "");
    } else if (!open) {
      setName("");
      setDescription("");
    }
  }, [organization, open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) {
      toast.error("No organization selected");
      return;
    }
    if (!name.trim() || !description.trim()) {
      toast.error("Fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ name, description });
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !organization) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg w-full max-w-md mx-4"
      >
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Edit Organization
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name*
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description*
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-md bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  required
                />
              </div>

              <div className="flex justify-between pt-2">
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-md text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md text-sm disabled:opacity-60 flex items-center"
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
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div>ID: {organization.id}</div>
              {organization.createdAt && (
                <div>Created: {new Date(organization.createdAt).toLocaleString()}</div>
              )}
              {organization.updatedAt && (
                <div>Updated: {new Date(organization.updatedAt).toLocaleString()}</div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}