"use client";

import type React from "react";
import useAuthStore from "@/store/authStore";
import { fetchActiveElectionRules } from "@/services/directorElection";
import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { DateTime } from "luxon";
import { COMMON_TIMEZONES } from "@/constants/datetime";
import {
  formatDateForInput,
  formatDateWithTimezoneForAPI,
  getRelativeTimezoneOffset,
} from "@/utils/formatDateAndTime";
import type { ElectionRule } from "@/types/election";

interface DirectorElectionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    term: string;
    feeAmount: number;
    ruleId: number;
    nominationStartDate: string;
    nominationEndDate: string;
    startDate: string;
    endDate: string;
  }) => void;
}

export default function DirectorElectionModal({
  open,
  onClose,
  onSubmit,
}: DirectorElectionModalProps) {
  const userTimezone = DateTime.local().zoneName;

  const [formData, setFormData] = useState({
    title: "",
    term: "",
    feeAmount: 10,
    ruleId: "",
    timezone: userTimezone,
    nominationStartDate: formatDateForInput(new Date()),
    nominationEndDate: formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    startDate: formatDateForInput(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)),
    endDate: formatDateForInput(new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)),
  });

  const timezoneOptions = COMMON_TIMEZONES.map((tz) =>
    tz === "LOCAL_TIMEZONE_PLACEHOLDER" ? userTimezone : tz
  ).filter((tz, index, self) => self.indexOf(tz) === index);

  const [electionRules, setElectionRules] = useState<ElectionRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const token = useAuthStore((state) => state.token);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && token) {
      const fetchRules = async () => {
        setLoading(true);
        try {
          const rules = await fetchActiveElectionRules(token);
          setElectionRules(rules);
        } catch (error: any) {
          console.error("Error fetching election rules:", error);
          toast.error(
            error?.message || "Failed to fetch election rules. Please try again later."
          );
        } finally {
          setLoading(false);
        }
      };

      fetchRules();
    }
  }, [open, token]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
      setSubmitting(false);
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "feeAmount"
          ? value === "" ? 0 : Number.parseInt(value, 10) || 0
          : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = formData.title.trim();
    const trimmedTerm = formData.term.trim();

    if (!trimmedTitle || !trimmedTerm || !formData.ruleId || formData.ruleId === "") {
      toast.error("Please fill all required fields.");
      return;
    }

    if (formData.feeAmount < 10 || isNaN(formData.feeAmount)) {
      toast.error("Fee amount must be at least 10 dirhams.");
      return;
    }

    // Format dates with timezone
    const nominationStartDate = formatDateWithTimezoneForAPI(
      formData.nominationStartDate,
      formData.timezone
    );
    const nominationEndDate = formatDateWithTimezoneForAPI(
      formData.nominationEndDate,
      formData.timezone
    );
    const startDate = formatDateWithTimezoneForAPI(
      formData.startDate,
      formData.timezone
    );
    const endDate = formatDateWithTimezoneForAPI(
      formData.endDate,
      formData.timezone
    );

    if (!nominationStartDate || !nominationEndDate || !startDate || !endDate) {
      toast.error("Invalid date format. Please check your input.");
      return;
    }

    // Validate date order
    const nomStart = DateTime.fromISO(nominationStartDate);
    const nomEnd = DateTime.fromISO(nominationEndDate);
    const elecStart = DateTime.fromISO(startDate);
    const elecEnd = DateTime.fromISO(endDate);

    if (nomEnd <= nomStart) {
      toast.error("Nomination end date must be after nomination start date.");
      return;
    }

    if (elecEnd <= elecStart) {
      toast.error("Election end date must be after election start date.");
      return;
    }

    if (elecStart <= nomEnd) {
      toast.error("Election start date must be after nomination end date.");
      return;
    }

    setSubmitting(true);
    onSubmit({
      title: trimmedTitle,
      term: trimmedTerm,
      feeAmount: formData.feeAmount,
      ruleId: Number.parseInt(formData.ruleId),
      nominationStartDate,
      nominationEndDate,
      startDate,
      endDate,
    });
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4"
      onClick={(e) => {
        // Prevent closing modal when clicking outside during submission
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="bg-gray-800 border border-gold-500/30 rounded-lg shadow-lg w-full max-w-3xl my-8"
      >
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gold-500">
                Create Director Election
              </h2>

              <button
                onClick={onClose}
                disabled={submitting}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>

          <div className="p-6">
            <form
              id="director-election-form"
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-300"
                >
                  Title
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="term"
                  className="block text-sm font-medium text-gray-300"
                >
                  Term
                </label>
                <input
                  id="term"
                  name="term"
                  type="text"
                  value={formData.term}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="feeAmount"
                  className="block text-sm font-medium text-gray-300"
                >
                  Fee Amount (excl. VAT)
                </label>
                  <input
                  id="feeAmount"
                  name="feeAmount"
                  type="number"
                  step="1"
                  min="5"
                  value={formData.feeAmount || ""}
                  onChange={handleChange}
                  disabled={submitting}
                  onKeyPress={(e) => {
                    // Allow only numbers and decimal point
                    if (!/[0-9.]/.test(e.key)) {
                      e.preventDefault();
                    }
                    // Prevent multiple decimal points
                    if (e.key === '.' && formData.feeAmount.toString().includes('.')) {
                      e.preventDefault();
                    }
                  }}
                  onInput={(e) => {
                    const input = e.target as HTMLInputElement;
                    const value = input.value;
                    // Enforce 2 decimal places
                    if (value.includes('.')) {
                      const parts = value.split('.');
                      if (parts[1] && parts[1].length > 2) {
                        input.value = `${parts[0]}.${parts[1].slice(0, 2)}`;
                        setFormData((prev) => ({
                          ...prev,
                          feeAmount: parseFloat(input.value) || 0,
                        }));
                      }
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />

              </div>

              <div className="space-y-2">
                <label
                  htmlFor="ruleId"
                  className="block text-sm font-medium text-gray-300"
                >
                  Election Rule
                </label>
                {loading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gold-500"></div>
                  </div>
                ) : (
                  <select
                    id="ruleId"
                    name="ruleId"
                    value={formData.ruleId}
                    onChange={handleChange}
                    disabled={submitting}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  >
                    <option value="" disabled hidden>
                      
                    </option>
                    {electionRules.map((rule) => (
                      <option key={rule.id} value={rule.id}>
                        {rule.title || `Rule ${rule.id}`}
                      </option>
                    ))}
                  </select>
                )}
                {electionRules.length === 0 && !loading && (
                  <p className="text-xs text-amber-500 mt-1">
                    No active election rules available. Please create and approve an election rule first.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="timezone"
                  className="block text-sm font-medium text-gray-300"
                >
                  Timezone
                </label>
                <select
                  id="timezone"
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {timezoneOptions.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz === userTimezone
                        ? `${tz.replace(/_/g, " ")} (Local time)`
                        : `${tz.replace(/_/g, " ")} (${getRelativeTimezoneOffset(tz, userTimezone)})`}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400">
                  All dates will be interpreted in this timezone
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="nominationStartDate"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Nomination Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    id="nominationStartDate"
                    name="nominationStartDate"
                    value={formData.nominationStartDate}
                    onChange={handleChange}
                    disabled={submitting}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  />
                  <p className="text-xs text-gray-400">
                    Nomination begins ({formData.timezone})
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="nominationEndDate"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Nomination End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    id="nominationEndDate"
                    name="nominationEndDate"
                    value={formData.nominationEndDate}
                    onChange={handleChange}
                    disabled={submitting}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  />
                  <p className="text-xs text-gray-400">
                    Nomination ends ({formData.timezone})
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Election Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    disabled={submitting}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  />
                  <p className="text-xs text-gray-400">
                    Election begins ({formData.timezone})
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="endDate"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Election End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    id="endDate"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    disabled={submitting}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    required
                  />
                  <p className="text-xs text-gray-400">
                    Election ends ({formData.timezone})
                  </p>
                </div>
              </div>

              <div className="sticky bottom-0 z-10 bg-gray-800 border-t border-gray-700 p-6">
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={submitting}
                    className="px-4 py-2 border border-gold-500 text-gold-500 rounded-md hover:bg-gold-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="director-election-form"
                    disabled={loading || electionRules.length === 0 || submitting}
                    className="px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {submitting && (
                      <svg
                        className="animate-spin h-4 w-4"
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
                    )}
                    {submitting ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
