"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useAuthStore from "@/store/authStore";
import Can from "@/components/rbac/Can";
import { useAbility } from "@/hooks/useAbility";
import { addJobSkill, fetchJobSkills } from "@/services/jobSkill";

interface JobSkill {
  id: number;
  name: string;
}

export default function JobSkillList() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<JobSkill[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const ability = useAbility();

  useEffect(() => {
    const getSkills = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await fetchJobSkills(token);
        setSkills(data);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to fetch job skills",
        );
      } finally {
        setLoading(false);
      }
    };

    getSkills();
  }, [token]);

  const handleSkillClick = (id: number) => {
    router.push(`/job-post/jobSkills/${id}`);
  };

  return (
    <div className="p-4 bg-gray-800 mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/job-post")}
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
            <h1 className="text-2xl font-bold text-white">Job Skills</h1>
            <p className="text-gray-400 text-sm">Manage your job skills</p>
          </div>
        </div>

        <Can I="create" a="JobSkill">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md flex items-center transition-colors"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Skill
          </button>
        </Can>
      </div>

      {/* Main Content */}
      <div className="bg-gray-900 rounded-lg border border-gray-700">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 mx-auto text-gray-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h2 className="text-xl font-medium text-gray-400">
              No job skills found
            </h2>
            <Can I="create" a="JobSkill">
              <p className="text-gray-500 mt-2">
                Add a new skill to get started
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-6 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-md transition-colors"
              >
                Add Skill
              </button>
            </Can>
          </div>
        ) : (
          <Can I="read" a="JobSkill">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="w-20 px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="w-24 px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {skills.map((skill) => (
                    <tr
                      key={skill.id}
                      onClick={() => handleSkillClick(skill.id)}
                      className="hover:bg-gray-750 cursor-pointer transition-colors"
                    >
                      <td className="w-20 px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        #{skill.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          {skill.name}
                        </div>
                      </td>
                      <td className="w-24 px-6 py-4 whitespace-nowrap text-right">
                        <div
                          className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSkillClick(skill.id);
                            }}
                            className="text-gold-500 hover:text-gold-400 transition-colors"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Can>
        )}
      </div>

      {/* Add Skill Modal */}
      {showAddModal && (
        <AddSkillModal
          onClose={() => setShowAddModal(false)}
          onRefresh={() => {
            token && fetchJobSkills(token).then(setSkills);
          }}
        />
      )}
    </div>
  );
}

// Add Skill Modal Component
interface AddSkillModalProps {
  onClose: () => void;
  onRefresh: () => void;
}

function AddSkillModal({ onClose, onRefresh }: AddSkillModalProps) {
  const token = useAuthStore((state) => state.token);
  const [name, setName] = useState("");
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

    setSubmitting(true);
    try {
      if (!token) return;
      await addJobSkill(token, name);
      toast.success("Job skill added successfully");
      onRefresh();
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add job skill",
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
            <h2 className="text-xl font-bold text-gold-500">
              Add New Job Skill
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
                disabled={submitting}
                className={`px-4 py-2 bg-gold-500 text-black rounded-md hover:bg-gold-600 transition-colors ${
                  submitting ? "opacity-70 cursor-not-allowed" : ""
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
                    Creating...
                  </span>
                ) : (
                  "Create Skill"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
