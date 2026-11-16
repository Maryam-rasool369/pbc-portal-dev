import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import JobApplyLayout from "@/layouts/JobApplyLayout";
import Link from "next/link";

interface JobPost {
  id: number;
  title: string;
  description: string;
  deadline: string;
  createdAt: string;
  jobCategory: {
    id: number;
    name: string;
  };

  user: {
    id: number;
    name: string;
  };
  status: string;
  _count: {
    JobApplication: number;
  };
}

export default function JobDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [job, setJob] = useState<JobPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);

  useEffect(() => {
    if (id) fetchJobDetails();
  }, [id]);

  const fetchJobDetails = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/job-post/public/${id}`,
      );
      const data = await response.json();
      setJob(data.data);
    } catch (error) {
      console.error("Failed to fetch job detail", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (data: {
    resume: File;
    applicantName: string;
    linkedInProfile?: string;
  }) => {
    try {
      setApplyLoading(true);
      const formData = new FormData();
      formData.append("resumeDoc", data.resume);
      formData.append("applicantName", data.applicantName);
      if (data.linkedInProfile) {
        formData.append("linkedInProfile", data.linkedInProfile);
      }
      formData.append("jobPostId", String(job?.id));

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/job-application/apply`,
        {
          method: "POST",
          body: formData,
        },
      );
      const resData = await response.json();
      if (resData.message) {
        toast.success("Application submitted successfully!");
        setModalOpen(false);
        router.push("/job-apply");
      } else {
        toast.error(resData.error?.[0]?.msg || "Failed to apply.");
      }
    } catch (error) {
      toast.error("Application failed.");
    } finally {
      setApplyLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-600"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center space-y-4">
        <div className="text-gray-500 dark:text-gray-400 text-xl">
          Job not found.
        </div>
        <Link
          href="/job-apply"
          className="px-6 py-2 bg-gold-600 text-white rounded-full hover:bg-gold-700 transition-colors"
        >
          View All Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Job Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/job-apply"
              className="text-gray-500 hover:text-gold-600 transition-colors"
            >
              ← Back to Jobs
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {job.title}
          </h1>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span className="font-medium">Posted:</span>
              {new Date(job.createdAt).toLocaleDateString("en-GB")}
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span className="font-medium">Category:</span>
              {job.jobCategory.name}
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span className="font-medium">Applications:</span>
              {job._count.JobApplication}
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="px-8 py-3 bg-gold-600 text-white rounded-full hover:bg-gold-700 transition-colors shadow-lg shadow-gold-600/30"
          >
            Apply Now
          </button>
        </div>
      </div>

      {/* Job Description */}
      <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg">
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3">
          Job Description
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 min-h-[100px]">
          <div
            className="max-w-none p-3 text-gray-700 dark:text-gray-300"
            dangerouslySetInnerHTML={{
              __html: job?.description || "",
            }}
          />
        </div>
      </div>

      {/* Application Deadline Card */}
      <div className="bg-gold-50 dark:bg-gold-900/20 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-gold-900 dark:text-gold-400 font-medium">
              Application Deadline
            </h3>
            <p className="text-gold-800 dark:text-gold-500 text-2xl font-bold">
              {new Date(job.deadline).toLocaleDateString("en-GB")}
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="px-6 py-2 bg-gold-600 text-white rounded-full hover:bg-gold-700 transition-colors shadow-lg shadow-gold-600/30"
          >
            Apply Now
          </button>
        </div>
      </div>

      {modalOpen && (
        <ApplyToJobModal
          onClose={() => setModalOpen(false)}
          onApply={handleApply}
          loading={applyLoading}
        />
      )}
    </div>
  );
}

interface ApplyToJobModalProps {
  onClose: () => void;
  loading: boolean;
  onApply: (data: {
    resume: File;
    applicantName: string;
    linkedInProfile?: string;
  }) => void;
}

function ApplyToJobModal({ onClose, onApply, loading }: ApplyToJobModalProps) {
  const [resume, setResume] = useState<File | null>(null);
  const [applicantName, setApplicantName] = useState("");
  const [linkedInProfile, setLinkedInProfile] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resume || !applicantName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    onApply({ resume, applicantName, linkedInProfile });
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 dark:bg-gray-900 opacity-75"></div>
        </div>
        <span
          className="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
        >
          &#8203;
        </span>
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left max-h-[70vh] overflow-y-auto shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="px-6 pt-5 pb-4">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Apply for this Position
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <span className="sr-only">Close</span>
                <svg
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
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  LinkedIn Profile (optional)
                </label>
                <input
                  type="url"
                  value={linkedInProfile}
                  onChange={(e) => setLinkedInProfile(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Resume <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setResume(e.target.files?.[0] || null)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 mr-2 bg-gray-200 rounded dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-gold-600 text-gray-800 rounded hover:bg-gold-700"
                >
                  {loading ? "Applying..." : "Apply"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

JobDetailPage.getLayout = function getLayout(page: React.ReactElement) {
  return <JobApplyLayout>{page}</JobApplyLayout>;
};
