"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { DateTime } from "luxon";
import { COMMON_TIMEZONES } from "@/constants/datetime";
import {
  formatDateForInput,
  formatDateWithTimezoneForAPI,
  getRelativeTimezoneOffset,
} from "@/utils/formatDateAndTime";
import { toast } from "react-toastify";

interface UpdateElectionDatesModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    nominationEndDate?: string;
    startDate?: string;
    endDate?: string;
  }) => void;
  existingData?: {
    nominationStartDate?: string;
    nominationEndDate?: string;
    startDate?: string;
    endDate?: string;
  };
}

export default function UpdateElectionDatesModal({
  open,
  onClose,
  onSubmit,
  existingData,
}: UpdateElectionDatesModalProps) {
  const userTimezone = DateTime.local().zoneName;

  const formatExistingDate = (dateString?: string): string => {
    if (!dateString) return "";
    try {
      return formatDateForInput(new Date(dateString));
    } catch (error) {
      return "";
    }
  };

  const [formData, setFormData] = useState({
    timezone: userTimezone,
    nominationEndDate: existingData?.nominationEndDate
      ? formatExistingDate(existingData.nominationEndDate)
      : "",
    startDate: existingData?.startDate
      ? formatExistingDate(existingData.startDate)
      : "",
    endDate: existingData?.endDate
      ? formatExistingDate(existingData.endDate)
      : "",
  });

  const timezoneOptions = COMMON_TIMEZONES.map((tz) =>
    tz === "LOCAL_TIMEZONE_PLACEHOLDER" ? userTimezone : tz
  ).filter((tz, index, self) => self.indexOf(tz) === index);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && existingData) {
      setFormData({
        timezone: userTimezone,
        nominationEndDate: existingData.nominationEndDate
          ? formatExistingDate(existingData.nominationEndDate)
          : "",
        startDate: existingData.startDate
          ? formatExistingDate(existingData.startDate)
          : "",
        endDate: existingData.endDate
          ? formatExistingDate(existingData.endDate)
          : "",
      });
    }
  }, [open, existingData]);

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

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nominationEndDate && !formData.startDate && !formData.endDate) {
      toast.error("Please provide at least one date to update.");
      return;
    }
    if (formData.startDate && !formData.endDate) {
      toast.error("Election end date must be provided when updating election start date.");
      return;
    }

    const payload: {
      nominationEndDate?: string;
      startDate?: string;
      endDate?: string;
    } = {};

    const hasDateChanged = (newDateISO: string, existingDateISO?: string): boolean => {
      if (!existingDateISO) return true; 
      const newDate = DateTime.fromISO(newDateISO);
      const existingDate = DateTime.fromISO(existingDateISO);
      return !newDate.equals(existingDate);
    };

    if (formData.nominationEndDate) {
      const formatted = formatDateWithTimezoneForAPI(
        formData.nominationEndDate,
        formData.timezone
      );
      if (!formatted) {
        toast.error("Invalid nomination end date format.");
        return;
      }
      if (hasDateChanged(formatted, existingData?.nominationEndDate)) {
        payload.nominationEndDate = formatted;
      }
    }

    if (formData.startDate) {
      const formatted = formatDateWithTimezoneForAPI(
        formData.startDate,
        formData.timezone
      );
      if (!formatted) {
        toast.error("Invalid election start date format.");
        return;
      }
      if (hasDateChanged(formatted, existingData?.startDate)) {
        payload.startDate = formatted;
      }
    }

    if (formData.endDate) {
      const formatted = formatDateWithTimezoneForAPI(
        formData.endDate,
        formData.timezone
      );
      if (!formatted) {
        toast.error("Invalid election end date format.");
        return;
      }
      if (hasDateChanged(formatted, existingData?.endDate)) {
        payload.endDate = formatted;
      }
    }



   

    if (payload.startDate && payload.endDate) {
      const elecStart = DateTime.fromISO(payload.startDate);
      const elecEnd = DateTime.fromISO(payload.endDate);

      if (elecEnd <= elecStart) {
        toast.error("Election end date must be after election start date.");
        return;
      }
    }

    if (payload.nominationEndDate && existingData?.nominationStartDate) {
      const nomStart = DateTime.fromISO(existingData.nominationStartDate);
      const nomEnd = DateTime.fromISO(payload.nominationEndDate);

      if (nomEnd <= nomStart) {
        toast.error("Nomination end date must be after nomination start date.");
        return;
      }
    }

    if (payload.nominationEndDate && payload.startDate) {
      const nomEnd = DateTime.fromISO(payload.nominationEndDate);
      const elecStart = DateTime.fromISO(payload.startDate);

      if (nomEnd > elecStart) {
        toast.error("Nomination end date must be before or equal to election start date.");
        return;
      }
    }

    onSubmit(payload);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4">
      <div
        ref={modalRef}
        className="bg-gray-800 border border-gold-500/30 rounded-lg shadow-lg w-full max-w-3xl my-8"
      >
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gold-500">
                Update Election Dates
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
          </div>

          <div className="p-6">
            <form
              id="update-election-dates-form"
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-400">
                  <strong>Note:</strong> You can update one or more dates. If updating election start date, you must also provide election end date.
                </p>
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
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
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
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
                <p className="text-xs text-gray-400">
                  Nomination ends ({formData.timezone})
                </p>
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
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
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
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
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
                    className="px-4 py-2 border border-gold-500 text-gold-500 rounded-md hover:bg-gold-500/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="update-election-dates-form"
                    className="px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
                  >
                    Update Dates
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

