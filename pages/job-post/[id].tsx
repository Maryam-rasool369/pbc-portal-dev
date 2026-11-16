"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import dynamic from "next/dynamic";
import { JobSkill } from "@/types/jobSkill";
import { formatStatus } from "@/utils/formatStatus";
import { formatDateAndTime } from "@/utils/formatDateAndTime";

const CKEditorClient = dynamic(() => import("@/components/CKEditorClient"), {
  ssr: false,
  loading: () => <p>Loading Editor...</p>,
});
interface JobApplication {
  id: number;
  resumeDoc: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
  applicantName: string;
  linkedInProfile?: string;
}

interface JobPostDetails {
  id: number;
  title: string;
  description: string;
  deadline: string;
  status: string;
  acceptedJobApplicationId: number | null;
  jobCategory: {
    id: number;
    name: string;
  };
  user: {
    id: number;
    name: string;
  };
  JobApplication: JobApplication[];
  skills: JobSkill[];
  minExperience?: number;
  maxExperience?: number;
  minSalary?: number;
  maxSalary?: number;
  jobType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
  jobMode: "REMOTE" | "ONSITE" | "HYBRID";
  location: string;
  linkedInProfile?: string;
  twitterProfile?: string;
  createdAt: string;
  updatedAt: string;
}

export default function JobDetails() {
  const [jobDetails, setJobDetails] = useState<JobPostDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);

  const fetchJobDetails = async () => {
    if (token === null || token === "undefined") {
      router.push("/");
    } else {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/job-post/${id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              token: token,
            },
          },
        );
        const data = await response.json();
        setJobDetails(data.data || null);
      } catch (error) {
        console.error("Error fetching job details:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAcceptApplication = async (applicationId: number) => {
    if (token === null || token === "undefined") {
      router.push("/");
    } else {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/job-post/accept-application/${id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              token: token,
            },
            body: JSON.stringify({ jobApplicationId: applicationId }),
          },
        );
        const data = await response.json();
        if (data.message) {
          toast.success("Application accepted successfully");
          fetchJobDetails();
        } else {
          toast.error(data.error?.[0]?.msg || "Something went wrong");
        }
      } catch (error) {
        console.error("Error accepting application:", error);
      }
    }
  };

  const handleRejectApplication = async (applicationId: number) => {
    if (token === null || token === "undefined") {
      router.push("/");
    } else {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/job-post/reject-application/${id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              token: token,
            },
            body: JSON.stringify({ jobApplicationId: applicationId }),
          },
        );
        const data = await response.json();
        if (data.message) {
          toast.success("Application rejected successfully");
          fetchJobDetails();
        } else {
          toast.error(data.error?.[0]?.msg || "Something went wrong");
        }
      } catch (error) {
        console.error("Error rejecting application:", error);
      }
    }
  };

  const handleGoBack = () => {
    router.push('/job-post');
  };

  useEffect(() => {
    if (id) fetchJobDetails();
  }, [id]);

  return (
    <div className="bg-gray-50 dark:bg-gray-900 py-10">
      <div className="container mx-auto px-4">
      <div className="flex items-center mb-6">
        <button
          onClick={handleGoBack}
          className="mr-4 text-gray-400 hover:text-gray-700 dark:hover:text-white flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back to Job Posts
        </button>
      </div>
      <div className="mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            Loading job details...
          </div>
        ) : jobDetails ? (
          <>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-4">
              {jobDetails.title}
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-6">
              <div>
                <strong className="text-gray-800 dark:text-gray-200">
                  Deadline:
                </strong>{" "}
                {formatDateAndTime(jobDetails.deadline, true)}
              </div>
              <div>
                <strong className="text-gray-800 dark:text-gray-200">
                  Status:
                </strong>{" "}
                <span
                  className={
                    jobDetails.status === "OPEN"
                      ? "text-green-500"
                      : "text-red-500"
                  }
                >
                  {jobDetails.status}
                </span>
              </div>
              <div>
                <strong className="text-gray-800 dark:text-gray-200">
                  Category:
                </strong>{" "}
                {jobDetails.jobCategory.name}
              </div>
              <div>
                <strong className="text-gray-800 dark:text-gray-200">
                  Posted by:
                </strong>{" "}
                {jobDetails.user.name}
                <span className="text-gray-500 dark:text-gray-400">
                  {" "}
                  (ID: {jobDetails.user.id})
                </span>
              </div>
              <div>
                <strong className="text-gray-800 dark:text-gray-200">
                  Total Applications:
                </strong>{" "}
                {jobDetails.JobApplication.length}
              </div>

              <div>
                <strong className="text-gray-800 dark:text-gray-200">
                  Created At:
                </strong>{" "}
                {formatDateAndTime(jobDetails.createdAt, true)}
              </div>
              <div>
                <strong className="text-gray-800 dark:text-gray-200">
                  Last Modified:
                </strong>{" "}
                {formatDateAndTime(jobDetails.updatedAt, true)}
              </div>
              <div>
                <strong className="text-gray-800 dark:text-gray-200">
                  Salary Range:
                </strong>{" "}
                {jobDetails.minSalary && jobDetails.maxSalary
                  ? `${jobDetails.minSalary} - ${jobDetails.maxSalary}`
                  : "Not specified"}
              </div>
              <div>
                <strong className="text-gray-800 dark:text-gray-200">
                  Experience Range:
                </strong>{" "}
                {jobDetails.minExperience !== undefined &&
                jobDetails.maxExperience !== undefined
                  ? `${jobDetails.minExperience} - ${jobDetails.maxExperience}`
                  : "Not specified"}
              </div>
              <div>
                <strong className="text-gray-800 dark:text-gray-200">
                  Job Type:
                </strong>{" "}
                {formatStatus(jobDetails.jobType || "")}
              </div>
              <div>
                <strong className="text-gray-800 dark:text-gray-200">
                  Job Mode:
                </strong>{" "}
                {jobDetails.jobMode}
              </div>
              <div>
                <strong className="text-gray-800 dark:text-gray-200">
                  Location:
                </strong>{" "}
                {jobDetails.location}
              </div>
              <div>
                <strong className="text-gray-800 dark:text-gray-200">
                  LinkedIn Profile:
                </strong>{" "}
                {jobDetails.linkedInProfile ? (
                  <a
                    href={jobDetails.linkedInProfile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-500 hover:text-gold-700"
                  >
                    {jobDetails.linkedInProfile}
                  </a>
                ) : (
                  "N/A"
                )}
              </div>
              <div>
                <strong className="text-gray-800 dark:text-gray-200">
                  Twitter Profile:
                </strong>{" "}
                {jobDetails.twitterProfile ? (
                  <a
                    href={jobDetails.twitterProfile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-500 hover:text-gold-700"
                  >
                    {jobDetails.twitterProfile}
                  </a>
                ) : (
                  "N/A"
                )}
              </div>
              {/* skills like small cards  */}
              <div>
                <strong className="text-gray-800 dark:text-gray-200">
                  Required Skills:
                </strong>
                <div className="flex flex-wrap gap-2 mt-2">
                  {jobDetails.skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 rounded-lg"
                    >
                      {skill.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg">
              <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3">
                Job Description
              </h2>
              <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 min-h-[100px]">
                <div
                  className="max-w-none p-3 text-gray-700 dark:text-gray-300"
                  dangerouslySetInnerHTML={{
                    __html: jobDetails?.description || "",
                  }}
                />
              </div>
            </div>
            <hr className="my-6 border-gray-300 dark:border-gray-700" />

            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              Applications
            </h2>

            {jobDetails.JobApplication.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400">
                No applications found.
              </div>
            ) : (
              <div className="space-y-4">
                {jobDetails.JobApplication.sort((a, b) => {
                  if (a.status === "ACCEPTED" && b.status !== "ACCEPTED")
                    return -1;
                  if (a.status !== "ACCEPTED" && b.status === "ACCEPTED")
                    return 1;
                  return 0;
                }).map((application) => (
                  <div
                    key={application.id}
                    className="bg-gray-100 dark:bg-gray-700 rounded-lg shadow p-4"
                  >
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {application.applicantName}
                        </p>

                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          Status:{" "}
                          <span
                            className={
                              application.status === "ACCEPTED"
                                ? "text-green-500"
                                : application.status === "REJECTED"
                                  ? "text-red-500"
                                  : "text-yellow-500"
                            }
                          >
                            {application.status}
                          </span>
                        </p>

                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          LinkedIn Profile:{" "}
                          {application.linkedInProfile ? (
                            <a
                              href={application.linkedInProfile}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gold-500 hover:text-gold-700"
                            >
                              {application.linkedInProfile}
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Applied At:{" "}
                          {formatDateAndTime(application.createdAt, true)}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-end">
                        {application.status === "PENDING" &&
                          !jobDetails.acceptedJobApplicationId && (
                            <>
                              <button
                                onClick={() =>
                                  handleAcceptApplication(application.id)
                                }
                                className="px-4 py-2 text-sm text-white bg-green-500 rounded-lg hover:bg-green-600 focus:ring-4 focus:ring-green-300 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() =>
                                  handleRejectApplication(application.id)
                                }
                                className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 focus:ring-4 focus:ring-red-300 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-800"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        <a
                          target="_blank"
                          href={application.resumeDoc}
                          className="px-4 py-2 text-sm text-white bg-gold-500 rounded-lg hover:bg-gold-600 focus:ring-4 focus:ring-gold-300 dark:bg-gold-600 dark:hover:bg-gold-700 dark:focus:ring-gold-800"
                        >
                          View Resume
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400">
            Job details not found.
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
