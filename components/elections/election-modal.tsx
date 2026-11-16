"use client";

import type React from "react";
import useAuthStore from "@/store/authStore";
import { fetchAllPolicies } from "@/services/election";
import { ElectionType } from "@/types/election";
import { useState, useEffect, useRef } from "react";
import { DateTime } from "luxon";
import { COMMON_TIMEZONES } from "@/constants/datetime";
import {
  formatDateForInput,
  formatDateWithTimezoneForAPI,
  getRelativeTimezoneOffset,
} from "@/utils/formatDateAndTime";
import { toast } from "react-toastify";

interface ElectionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  existingData?: any;
}

interface User {
  id: number;
  name: string;
  role: string;
}

interface Policy {
  id: number;
  title: string;
  description: string;
}

export default function ElectionModal({
  open,
  onClose,
  onSubmit,
  existingData,
}: ElectionModalProps) {
  const userTimezone = DateTime.local().zoneName;

  const formatExistingDate = (dateString: string): string => {
    if (!dateString) return formatDateForInput(new Date());
    try {
      return formatDateForInput(new Date(dateString));
    } catch (error) {
      toast.error("Error formatting date. Please check the date format.");
      return formatDateForInput(new Date());
    }
  };

  const timezoneOptions = COMMON_TIMEZONES.map((tz) =>
    tz === "LOCAL_TIMEZONE_PLACEHOLDER" ? userTimezone : tz
  ).filter((tz, index, self) => self.indexOf(tz) === index);

  const [formData, setFormData] = useState({
    title: existingData?.title || "",
    description: existingData?.description || "",
    type: existingData?.type || ElectionType.CANDIDATE_ELECTION,
    startDate: existingData?.startDate
      ? formatExistingDate(existingData.startDate)
      : formatDateForInput(new Date()),
    endDate: existingData?.endDate
      ? formatExistingDate(existingData.endDate)
      : formatDateForInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    timezone: userTimezone,
    candidateIds: existingData?.candidateIds || [],
    policyId: existingData?.policyId || "",
  });

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(
    existingData?.pollOptions || ["", ""]
  );
  const token = useAuthStore((state) => state.token);

  const modalRef = useRef<HTMLDivElement>(null);
  const candidateModalRef = useRef<HTMLDivElement>(null);
  const policyModalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const policiesData = await fetchAllPolicies(token);
        setPolicies(policiesData.data);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast.error(
          error?.message || "Failed to fetch policies or candidates data. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        policyModalRef.current &&
        !policyModalRef.current.contains(event.target as Node)
      ) {
        setShowPolicyModal(false);
      }
    };

    if (showPolicyModal) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPolicyModal]);

  useEffect(() => {
    if (open || showCandidateModal || showPolicyModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open, showCandidateModal, showPolicyModal]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const addPollOption = () => {
    setPollOptions([...pollOptions, ""]);
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length <= 2) return;
    const newOptions = pollOptions.filter((_, i) => i !== index);
    setPollOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.title ||
      !formData.description ||
      !formData.startDate ||
      !formData.endDate
    ) {
      toast.error("Please fill all required fields.");
      return;
    }

    if (formData.type === ElectionType.POLICY_ELECTION && !formData.policyId) {
      toast.error("Please select a policy.");
      return;
    }

    if (formData.type === ElectionType.POLLING_ELECTION) {
      const validOptions = pollOptions.filter((opt) => opt.trim() !== "");
      if (validOptions.length < 2) {
        toast.error("Please add at least 2 poll options.");
        return;
      }
    }

    const startDateWithTZ = formatDateWithTimezoneForAPI(
      formData.startDate,
      formData.timezone
    );
    const endDateWithTZ = formatDateWithTimezoneForAPI(
      formData.endDate,
      formData.timezone
    );

    if (!startDateWithTZ || !endDateWithTZ) {
      toast.error("Invalid date format. Please check your input.");
      return;
    }

    const startDate = DateTime.fromISO(startDateWithTZ);
    const endDate = DateTime.fromISO(endDateWithTZ);

    if (endDate <= startDate) {
      toast.error("End date must be after start date.");
      return;
    }

    const payload: {
      title: string;
      description: string;
      type: ElectionType;
      startDate: string;
      endDate: string;
      policyId?: number;
      candidateIds?: number[];
      pollOptions?: string[];
    } = {
      title: formData.title,
      description: formData.description,
      type: formData.type,
      startDate: startDateWithTZ,
      endDate: endDateWithTZ,
    };

    if (formData.type === ElectionType.POLICY_ELECTION) {
      payload.policyId = Number.parseInt(formData.policyId);
    } else if (formData.type === ElectionType.POLLING_ELECTION) {
      payload.pollOptions = pollOptions.filter((opt) => opt.trim() !== "");
    }

    onSubmit(payload);
  };

  const toggleCandidateSelection = (candidateId: number) => {
    setFormData((prev) => ({
      ...prev,
      candidateIds: prev.candidateIds.includes(candidateId)
        ? prev.candidateIds.filter((id: number) => id !== candidateId)
        : [...prev.candidateIds, candidateId],
    }));
  };

  const getSelectedPolicyText = () => {
    if (!formData.policyId) return "Select Policy";

    const policy = policies.find(
      (p) => p.id === Number.parseInt(formData.policyId)
    );
    return policy ? policy.title : "Select Policy";
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto p-4">
      <div
        ref={modalRef}
        className="bg-gray-800 border border-gold-500/30 rounded-lg shadow-lg w-full max-w-md my-8"
      >
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gold-500">
                {existingData ? "Edit Election" : "Create New Election"}
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
              id="election-form"
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
                  placeholder="Enter election title"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-300"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter election description"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500 min-h-[100px]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Election Type
                </label>
                <div className="flex space-x-4">
                  
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-md ${
                      formData.type === ElectionType.POLICY_ELECTION
                        ? "bg-gold-500 text-black"
                        : "bg-gray-800 text-white border border-gray-700 hover:bg-gray-700"
                    }`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        type: ElectionType.POLICY_ELECTION,
                      }))
                    }
                  >
                    Policy
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 rounded-md ${
                      formData.type === ElectionType.POLLING_ELECTION
                        ? "bg-gold-500 text-black"
                        : "bg-gray-800 text-white border border-gray-700 hover:bg-gray-700"
                    }`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        type: ElectionType.POLLING_ELECTION,
                      }))
                    }
                  >
                    Poll
                  </button>
                </div>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Start Date & Time
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      id="startDate"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Election begins ({formData.timezone})
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="endDate"
                    className="block text-sm font-medium text-gray-300"
                  >
                    End Date & Time
                  </label>
                  <div className="relative">
                    <input
                      type="datetime-local"
                      id="endDate"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Election ends ({formData.timezone})
                  </p>
                </div>
              </div>

              {formData.type === ElectionType.POLICY_ELECTION && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Policy
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPolicyModal(true)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-left focus:outline-none focus:ring-2 focus:ring-gold-500"
                  >
                    {getSelectedPolicyText()}
                  </button>
                </div>
              )}

              {formData.type === ElectionType.POLLING_ELECTION && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">
                    Poll Options
                  </label>
                  <div className="space-y-3">
                    {pollOptions.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) =>
                            handlePollOptionChange(index, e.target.value)
                          }
                          placeholder={`Option ${index + 1}`}
                          className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                        />
                        {pollOptions.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removePollOption(index)}
                            className="p-2 text-red-400 hover:text-red-300"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addPollOption}
                      className="w-full px-3 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      + Add Option
                    </button>
                  </div>
                </div>
              )}

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
                    form="election-form"
                    className="px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
                  >
                    {existingData ? "Update" : "Create"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Policy Selection Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div
            ref={policyModalRef}
            className="bg-gray-800 border border-gold-500/30 rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
          >
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-lg font-medium text-gold-500">
                Select Policy
              </h3>
            </div>

            <div className="overflow-y-auto flex-grow p-4">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold-500"></div>
                </div>
              ) : policies.length > 0 ? (
                <div className="space-y-2">
                  {policies.map((policy) => (
                    <div
                      key={policy.id}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          policyId: policy.id.toString(),
                        }));
                        setShowPolicyModal(false);
                      }}
                      className={`p-3 rounded-md cursor-pointer ${
                        Number.parseInt(formData.policyId) === policy.id
                          ? "bg-gold-500/20 border border-gold-500"
                          : "bg-gray-800 border border-gray-700 hover:bg-gray-700"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-white font-medium">
                          {policy.title}
                        </span>
                        <span className="text-gray-400 text-sm mt-1">
                          {policy.description}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">
                  No policies available
                </p>
              )}
            </div>

            <div className="p-4 border-t border-gray-800">
              <button
                onClick={() => setShowPolicyModal(false)}
                className="w-full px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
