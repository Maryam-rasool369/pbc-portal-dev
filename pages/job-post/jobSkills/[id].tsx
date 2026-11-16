"use client";

import type React from "react";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getJobSkillById, updateJobSkill } from "@/services/jobSkill";
import type { JobSkill } from "@/types/jobSkill";
import useAuthStore from "@/store/authStore";
import Can from "@/components/rbac/Can";
import { useAbility } from "@/hooks/useAbility";

export default function JobSkillDetail() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const [skill, setSkill] = useState<JobSkill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const ability = useAbility();

  useEffect(() => {
    const fetchSkill = async () => {
      if (!id || !token) return;
      if (!ability?.can("read", "JobSkill")) {
        toast.error("You do not have permission to view job skills");
        return;
      }
      setLoading(true);
      try {
        const data = await getJobSkillById(token, Number(id));
        setSkill(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch job skill";
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchSkill();
  }, [id, token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 text-red-500 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <h2 className="text-2xl font-bold text-red-500 mb-2">Error</h2>
        <p className="text-gray-300 text-center">{error}</p>
        <button
          onClick={() => router.push("/job-post/jobSkills")}
          className="mt-6 px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
        >
          Back to Skills
        </button>
      </div>
    );
  }

  if (!skill) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold text-gold-500 mb-2">
          Skill Not Found
        </h2>
        <p className="text-gray-300 text-center">
          The job skill you&apos;re looking for doesn&apos;t exist or you
          don&apos;t have permission to view it.
        </p>
        <button
          onClick={() => router.push("/job-post/jobSkills")}
          className="mt-6 px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors"
        >
          Back to Skills
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="p-4 bg-gray-800 mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/job-post/jobSkills")}
              className="text-gray-400 hover:text-gold-500 transition-colors flex items-center"
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
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Skill Details</h1>
              <p className="text-gray-400 text-sm">View and manage job skill</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-gray-900 rounded-lg border border-gray-700">
          <Can I="read" a="JobSkill">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-medium text-gold-500 mb-4">
                    Basic Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-400">
                        Skill Name
                      </label>
                      <p className="text-white font-medium mt-1">
                        {skill.name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">ID</label>
                      <p className="text-white font-medium mt-1">#{skill.id}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">
                        Created At
                      </label>
                      <p className="text-white font-medium mt-1">
                        {new Date(skill.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <h3 className="text-lg font-medium text-gold-500 mb-4">
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    <Can I="update" a="JobSkill">
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="w-full px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors flex items-center justify-center"
                      >
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        Edit Skill
                      </button>
                    </Can>
                  </div>
                </div>
              </div>
            </div>
          </Can>
        </div>

        {/* Edit Skill Modal */}
        {showEditModal && (
          <EditSkillModal
            skill={skill}
            onClose={() => setShowEditModal(false)}
            onUpdate={(updatedSkill) => setSkill(updatedSkill)}
          />
        )}
      </div>
    </div>
  );
}

// Edit Skill Modal Component
interface EditSkillModalProps {
  skill: JobSkill;
  onClose: () => void;
  onUpdate: (skill: JobSkill) => void;
}

function EditSkillModal({ skill, onClose, onUpdate }: EditSkillModalProps) {
  const token = useAuthStore((state) => state.token);
  const [name, setName] = useState(skill.name);
  const [submitting, setSubmitting] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a skill name");
      return;
    }

    if (name === skill.name) {
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      if (!token) return;
      const updatedSkill = await updateJobSkill(token, skill.id, name);
      toast.success("Job skill updated successfully");
      onUpdate(updatedSkill);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update job skill",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="bg-gray-800 border border-gold-500/30 rounded-lg shadow-lg w-full max-w-md mx-4"
      >
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gold-500">Edit Job Skill</h2>
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
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-300"
              >
                Skill Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter skill name"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
                required
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gold-500 text-gold-500 rounded-md hover:bg-gold-500/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || name === skill.name}
                className={`px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors ${
                  submitting || name === skill.name
                    ? "opacity-70 cursor-not-allowed"
                    : ""
                }`}
              >
                {submitting ? (
                  <span className="flex items-center">
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
                    Updating...
                  </span>
                ) : (
                  "Update Skill"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
