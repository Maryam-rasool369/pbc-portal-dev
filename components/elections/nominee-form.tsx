"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import { nominateCandidate, getCandidatesByElection } from "@/services/directorElection";
import { fetchOrganizations } from "@/services/organization";
import { fetchAllCandidateUsers } from "@/services/users";
import type { Organization } from "@/services/organization";

interface NomineeFormProps {
  electionId: number;
  onSuccess?: () => void;
  onClose?: () => void;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface Candidate {
  id: number;
  userId: number;
  status: string;
  contactAddress: string;
  poBoxNo: string;
  officeTel: string;
  organizationId: number;
  introducer1: number;
  introducer2: number;
  remarks?: string;
}

export default function NomineeForm({
  electionId,
  onSuccess,
  onClose,
}: NomineeFormProps) {
  const [formData, setFormData] = useState({
    organizationId: "",
    introducer1: "",
    introducer2: "",
    contactAddress: "",
    poBoxNo: "",
    officeTel: "",
  });

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [checkingApplied, setCheckingApplied] = useState(true);
  const [existingCandidate, setExistingCandidate] = useState<Candidate | null>(null);
  const [isEditable, setIsEditable] = useState(true);
  
  // Modal states
  const [showOrganizationModal, setShowOrganizationModal] = useState(false);
  const [showIntroducer1Modal, setShowIntroducer1Modal] = useState(false);
  const [showIntroducer2Modal, setShowIntroducer2Modal] = useState(false);
  
  // Search states
  const [orgSearchQuery, setOrgSearchQuery] = useState("");
  const [introducer1SearchQuery, setIntroducer1SearchQuery] = useState("");
  const [introducer2SearchQuery, setIntroducer2SearchQuery] = useState("");
  
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const formRef = useRef<HTMLFormElement>(null);
  const orgModalRef = useRef<HTMLDivElement>(null);
  const introducer1ModalRef = useRef<HTMLDivElement>(null);
  const introducer2ModalRef = useRef<HTMLDivElement>(null);

  // Fetch organizations and users
  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch organizations (get all pages)
        const orgPromises = [];
        for (let page = 1; page <= 10; page++) {
          orgPromises.push(fetchOrganizations(token, page, 100));
        }
        const orgResults = await Promise.all(orgPromises);
        const allOrgs = orgResults.flatMap((result) => result.data);
        setOrganizations(allOrgs);

        // Fetch users
        const usersList = await fetchAllCandidateUsers(token);
        setUsers(usersList);

        // Check if user already applied
        await checkIfApplied();
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast.error(
          error?.message || "Failed to fetch required data. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, electionId]);

  // Check if user already applied
  const checkIfApplied = async () => {
    if (!token || !user) return;

    setCheckingApplied(true);
    try {
      const candidates = await getCandidatesByElection(token, electionId, true);
      const userCandidate = candidates.find(
        (candidate: any) => candidate.userId === user.id || candidate.user?.id === user.id
      );
      
      if (userCandidate) {
        setHasApplied(true);
        setExistingCandidate(userCandidate);
        // Form is editable if status is PENDING or REJECTED (case-insensitive check)
        const status = userCandidate.status?.toUpperCase() || "";
        const canEdit = status === "PENDING" || status === "REJECTED";
        setIsEditable(canEdit);
        
        // Pre-fill form with existing data (always show data, but disable if not editable)
        setFormData({
          organizationId: userCandidate.organizationId ? String(userCandidate.organizationId) : "",
          introducer1: userCandidate.introducer1?.toString() || "",
          introducer2: userCandidate.introducer2?.toString() || "",
          contactAddress: userCandidate.contactAddress || "",
          poBoxNo: userCandidate.poBoxNo || "",
          officeTel: userCandidate.officeTel || "",
        });
      } else {
        setHasApplied(false);
        setIsEditable(true);
      }
    } catch (error: any) {
      console.error("Error checking application:", error);
      setHasApplied(false);
      setIsEditable(true);
    } finally {
      setCheckingApplied(false);
    }
  };

  // Handle click outside modals
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgModalRef.current && !orgModalRef.current.contains(event.target as Node)) {
        setShowOrganizationModal(false);
      }
      if (introducer1ModalRef.current && !introducer1ModalRef.current.contains(event.target as Node)) {
        setShowIntroducer1Modal(false);
      }
      if (introducer2ModalRef.current && !introducer2ModalRef.current.contains(event.target as Node)) {
        setShowIntroducer2Modal(false);
      }
    };

    if (showOrganizationModal || showIntroducer1Modal || showIntroducer2Modal) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showOrganizationModal, showIntroducer1Modal, showIntroducer2Modal]);

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (showOrganizationModal || showIntroducer1Modal || showIntroducer2Modal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showOrganizationModal, showIntroducer1Modal, showIntroducer2Modal]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!isEditable) return;
    const { name, value } = e.target;
    
    // Validate poBoxNo - only allow numbers
    if (name === "poBoxNo" && value && !/^\d*$/.test(value)) {
      return; // Don't update if non-numeric characters are entered
    }
    
    // Validate officeTel - only allow phone number characters (digits, spaces, +, -, (), )
    if (name === "officeTel" && value && !/^[0-9\s+\-()]*$/.test(value)) {
      return; // Don't update if invalid characters are entered
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditable) {
      toast.error("This form cannot be edited. Your nomination is currently under review.");
      return;
    }

    // Validate required fields
    const trimmedContactAddress = formData.contactAddress.trim();
    const trimmedPoBoxNo = formData.poBoxNo.trim();
    const trimmedOfficeTel = formData.officeTel.trim();

    if (
      !formData.organizationId ||
      !formData.introducer1 ||
      !formData.introducer2 ||
      !trimmedContactAddress ||
      !trimmedPoBoxNo ||
      !trimmedOfficeTel
    ) {
      toast.error("Please fill all required fields.");
      return;
    }

    // Validate poBoxNo is numeric
    if (!/^\d+$/.test(trimmedPoBoxNo)) {
      toast.error("PO Box No must contain only numbers.");
      return;
    }

    // Validate officeTel contains valid phone number characters and has at least some digits
    if (!/^[0-9\s+\-()]+$/.test(trimmedOfficeTel) || !/\d/.test(trimmedOfficeTel)) {
      toast.error("Office Tel must be a valid phone number.");
      return;
    }

    if (formData.introducer1 === formData.introducer2) {
      toast.error("Introducer 1 and Introducer 2 cannot be the same person.");
      return;
    }

    if (!token) {
      toast.error("You must be logged in to submit a nomination.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        organizationId: Number.parseInt(formData.organizationId),
        introducer1: Number.parseInt(formData.introducer1),
        introducer2: Number.parseInt(formData.introducer2),
        contactAddress: trimmedContactAddress,
        poBoxNo: trimmedPoBoxNo,
        officeTel: trimmedOfficeTel,
      };


      await nominateCandidate(token, electionId, payload);
      toast.success(
        existingCandidate && (existingCandidate.status?.toUpperCase() || "") === "PENDING"
          ? "Nomination updated successfully!"
          : existingCandidate && (existingCandidate.status?.toUpperCase() || "") === "REJECTED"
          ? "Nomination resubmitted successfully!"
          : "Nomination submitted successfully!"
      );
      
      if (onSuccess) {
        onSuccess();
      }
      if (onClose) {
        onClose();
      }
      
      if (!existingCandidate) {
        setFormData({
          organizationId: "",
          introducer1: "",
          introducer2: "",
          contactAddress: "",
          poBoxNo: "",
          officeTel: "",
        });
      }
    } catch (error: any) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to submit nomination. Please try again.";
      
      // Handle backend errors for PENDING nominations
      const candidateStatus = existingCandidate?.status?.toUpperCase() || "";
      if (existingCandidate && candidateStatus === "PENDING") {
        if (errorMessage.includes("already nominated") || errorMessage.includes("pending approval")) {
          toast.error("Your nomination is currently under review and cannot be updated at this time. Please wait for the review to complete or contact support if you need to make changes.");
        } else {
          toast.error(errorMessage);
        }
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Get selected organization name
  const getSelectedOrganizationName = () => {
    if (!formData.organizationId) return "Select Organization";
    const org = organizations.find((o) => String(o.id) === String(formData.organizationId));
    return org ? org.name : "Select Organization";
  };

  // Get selected introducer name
  const getSelectedIntroducerName = (introducerId: string) => {
    if (!introducerId) return "Select Introducer";
    const introducer = users.find((u) => u.id === Number.parseInt(introducerId));
    return introducer ? `${introducer.name} (${introducer.email})` : "Select Introducer";
  };

  // Filter organizations by search query
  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(orgSearchQuery.toLowerCase())
  );

  // Filter users by search query (excluding current user)
  const filteredUsers1 = users.filter(
    (u) =>
      u.id !== Number(user?.id) &&
      (u.name.toLowerCase().includes(introducer1SearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(introducer1SearchQuery.toLowerCase()))
  );

  const filteredUsers2 = users.filter(
    (u) =>
      u.id !== Number(user?.id) &&
      (u.name.toLowerCase().includes(introducer2SearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(introducer2SearchQuery.toLowerCase()))
  );

  if (checkingApplied) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }


  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-800 border border-gold-500/30 rounded-lg p-6">
        {hasApplied && existingCandidate && (
          <div className={`mb-4 p-4 rounded-lg ${
            (existingCandidate.status?.toUpperCase() || "") === "PENDING" 
              ? "bg-blue-500/10 border border-blue-500/30"
              : (existingCandidate.status?.toUpperCase() || "") === "REJECTED"
              ? "bg-amber-500/10 border border-amber-500/30"
              : "bg-amber-500/10 border border-amber-500/30"
          }`}>
            <div className="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 ${
                  (existingCandidate.status?.toUpperCase() || "") === "PENDING" 
                    ? "text-blue-500"
                    : (existingCandidate.status?.toUpperCase() || "") === "REJECTED"
                    ? "text-amber-500"
                    : "text-amber-500"
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {(existingCandidate.status?.toUpperCase() || "") === "PENDING" ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                )}
              </svg>
              <div>
                <p className={`text-sm font-medium ${
                  (existingCandidate.status?.toUpperCase() || "") === "PENDING" 
                    ? "text-blue-400"
                    : (existingCandidate.status?.toUpperCase() || "") === "REJECTED"
                    ? "text-amber-500"
                    : "text-amber-500"
                }`}>
                  Your nomination is {existingCandidate.status}. 
                  {(existingCandidate.status?.toUpperCase() || "") === "PENDING" && " You can edit your nomination details below. Note: Changes may require re-approval."}
                  {(existingCandidate.status?.toUpperCase() || "") === "REJECTED" && " You can update the information below and resubmit."}
                  {(existingCandidate.status?.toUpperCase() || "") === "APPROVED" && " Your nomination has been approved!"}
                </p>
                {existingCandidate.remarks && (
                  <p className="text-xs text-gray-400 mt-1">
                    <strong>Remarks:</strong> {existingCandidate.remarks}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        <h2 className="text-xl font-bold text-gold-500 mb-6">
          {(existingCandidate?.status?.toUpperCase() || "") === "REJECTED" ? "Resubmit Nomination" : "Nomination Form"}
        </h2>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          {/* Organization */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Organization <span className="text-red-400">*</span>
            </label>
            <button
              type="button"
              onClick={() => isEditable && setShowOrganizationModal(true)}
              disabled={!isEditable}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-left focus:outline-none focus:ring-2 focus:ring-gold-500 hover:border-gold-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {getSelectedOrganizationName()}
            </button>
          </div>

          {/* Introducer 1 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Introducer 1 <span className="text-red-400">*</span>
            </label>
            <button
              type="button"
              onClick={() => isEditable && setShowIntroducer1Modal(true)}
              disabled={!isEditable}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-left focus:outline-none focus:ring-2 focus:ring-gold-500 hover:border-gold-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {getSelectedIntroducerName(formData.introducer1)}
            </button>
          </div>

          {/* Introducer 2 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Introducer 2 <span className="text-red-400">*</span>
            </label>
            <button
              type="button"
              onClick={() => isEditable && setShowIntroducer2Modal(true)}
              disabled={!isEditable}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-left focus:outline-none focus:ring-2 focus:ring-gold-500 hover:border-gold-500/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {getSelectedIntroducerName(formData.introducer2)}
            </button>
          </div>

          {/* Contact Address */}
          <div className="space-y-2">
            <label
              htmlFor="contactAddress"
              className="block text-sm font-medium text-gray-300"
            >
              Contact Address <span className="text-red-400">*</span>
            </label>
            <textarea
              id="contactAddress"
              name="contactAddress"
              value={formData.contactAddress}
              onChange={handleChange}
              rows={3}
              disabled={!isEditable}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
              required
            />
          </div>

          {/* PO Box No */}
          <div className="space-y-2">
            <label
              htmlFor="poBoxNo"
              className="block text-sm font-medium text-gray-300"
            >
              PO Box No <span className="text-red-400">*</span>
            </label>
            <input
              id="poBoxNo"
              name="poBoxNo"
              type="text"
              value={formData.poBoxNo}
              onChange={handleChange}
              disabled={!isEditable}
              pattern="\d*"
              inputMode="numeric"
              placeholder="Enter numbers only"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
              required
            />
          </div>

          {/* Office Tel */}
          <div className="space-y-2">
            <label
              htmlFor="officeTel"
              className="block text-sm font-medium text-gray-300"
            >
              Office Tel <span className="text-red-400">*</span>
            </label>
            <input
              id="officeTel"
              name="officeTel"
              type="tel"
              value={formData.officeTel}
              onChange={handleChange}
              disabled={!isEditable}
              placeholder="e.g., +971-4-1234567 or (04) 1234567"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
              required
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gold-500 text-gold-500 rounded-md hover:bg-gold-500/10 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={submitting || !isEditable}
              className={`px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors flex items-center gap-2 ${
                submitting || !isEditable 
                  ? "opacity-50 cursor-not-allowed" 
                  : ""
              }`}
              style={{ display: 'block' }}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-black"></div>
                  Submitting...
                </>
              ) : (
                (existingCandidate?.status?.toUpperCase() || "") === "REJECTED" 
                  ? "Resubmit Nomination" 
                  : (existingCandidate?.status?.toUpperCase() || "") === "PENDING"
                  ? "Update Nomination"
                  : "Submit Nomination"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Organization Selection Modal */}
      {showOrganizationModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div
            ref={orgModalRef}
            className="bg-gray-800 border border-gold-500/30 rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
          >
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-gold-500">
                Select Organization
              </h3>
              <input
                type="text"
                placeholder="Search organizations..."
                value={orgSearchQuery}
                onChange={(e) => setOrgSearchQuery(e.target.value)}
                className="w-full mt-3 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                autoFocus
              />
            </div>

            <div className="overflow-y-auto flex-grow p-4">
              {filteredOrganizations.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                  {orgSearchQuery ? "No organizations found" : "No organizations available"}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredOrganizations.map((org) => (
                    <div
                      key={org.id}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          organizationId: String(org.id),
                        }));
                        setShowOrganizationModal(false);
                        setOrgSearchQuery("");
                      }}
                      className={`p-3 rounded-md cursor-pointer ${
                        String(formData.organizationId) === String(org.id)
                          ? "bg-gold-500/20 border border-gold-500"
                          : "bg-gray-700 border border-gray-600 hover:bg-gray-600"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{org.name}</span>
                        {org.description && (
                          <span className="text-gray-400 text-sm mt-1">
                            {org.description}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowOrganizationModal(false);
                  setOrgSearchQuery("");
                }}
                className="w-full px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Introducer 1 Selection Modal */}
      {showIntroducer1Modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div
            ref={introducer1ModalRef}
            className="bg-gray-800 border border-gold-500/30 rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
          >
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-gold-500">
                Select Introducer 1
              </h3>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={introducer1SearchQuery}
                onChange={(e) => setIntroducer1SearchQuery(e.target.value)}
                className="w-full mt-3 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                autoFocus
              />
            </div>

            <div className="overflow-y-auto flex-grow p-4">
              {filteredUsers1.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                  {introducer1SearchQuery ? "No users found" : "No users available"}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredUsers1.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          introducer1: u.id.toString(),
                        }));
                        setShowIntroducer1Modal(false);
                        setIntroducer1SearchQuery("");
                      }}
                      className={`p-3 rounded-md cursor-pointer ${
                        formData.introducer1 === u.id.toString()
                          ? "bg-gold-500/20 border border-gold-500"
                          : "bg-gray-700 border border-gray-600 hover:bg-gray-600"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{u.name}</span>
                        <span className="text-gray-400 text-sm mt-1">{u.email}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowIntroducer1Modal(false);
                  setIntroducer1SearchQuery("");
                }}
                className="w-full px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Introducer 2 Selection Modal */}
      {showIntroducer2Modal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
          <div
            ref={introducer2ModalRef}
            className="bg-gray-800 border border-gold-500/30 rounded-lg shadow-lg w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
          >
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-gold-500">
                Select Introducer 2
              </h3>
              <input
                type="text"
                placeholder="Search by name or email..."
                value={introducer2SearchQuery}
                onChange={(e) => setIntroducer2SearchQuery(e.target.value)}
                className="w-full mt-3 px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                autoFocus
              />
            </div>

            <div className="overflow-y-auto flex-grow p-4">
              {filteredUsers2.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                  {introducer2SearchQuery ? "No users found" : "No users available"}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredUsers2.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          introducer2: u.id.toString(),
                        }));
                        setShowIntroducer2Modal(false);
                        setIntroducer2SearchQuery("");
                      }}
                      className={`p-3 rounded-md cursor-pointer ${
                        formData.introducer2 === u.id.toString()
                          ? "bg-gold-500/20 border border-gold-500"
                          : "bg-gray-700 border border-gray-600 hover:bg-gray-600"
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{u.name}</span>
                        <span className="text-gray-400 text-sm mt-1">{u.email}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-700">
              <button
                onClick={() => {
                  setShowIntroducer2Modal(false);
                  setIntroducer2SearchQuery("");
                }}
                className="w-full px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

