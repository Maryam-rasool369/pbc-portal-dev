import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { toast } from "react-toastify";
import { HiOutlinePencilAlt, HiExternalLink } from "react-icons/hi";
import useAuthStore from "@/store/authStore";
import dynamic from "next/dynamic";
import Can from "@/components/rbac/Can";
import { useAbility } from "@/hooks/useAbility";
import { JobSkill } from "@/types/jobSkill";
import { fetchJobSkills } from "@/services/jobSkill";
import { formatDateAndTime } from "@/utils/formatDateAndTime";

const CKEditorClient = dynamic(() => import("@/components/CKEditorClient"), {
  ssr: false,
  loading: () => <p>Loading Editor...</p>,
});

interface JobPost {
  id: number;
  title: string;
  description: string;
  deadline: string;
  status: string;
  jobCategoryId: number;
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
  user: {
    id: number;
    name: string;
  };
  _count: {
    JobApplication: number;
  };
}

interface JobCategory {
  id: number;
  name: string;
  slug: string;
}

interface CreateJobPostModalProps {
  onClose: () => void;
  onSubmit: (jobPostData: {
    title: string;
    description: string;
    deadline: string;
    jobCategoryId: number;
    status: string;
    minExperience?: number;
    maxExperience?: number;
    minSalary?: number;
    maxSalary?: number;
    jobType:
      | "FULL_TIME"
      | "PART_TIME"
      | "CONTRACT"
      | "INTERNSHIP"
      | "FREELANCE";
    jobMode: "REMOTE" | "ONSITE" | "HYBRID";
    location: string;
    linkedInProfile?: string;
    twitterProfile?: string;
  }) => void;
  jobCategories: JobCategory[];
  editingJob?: JobPost | null;
  skills: JobSkill[];
}

const normalizeOptionalProfileUrl = (value: string) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  return /^https?:\/\//i.test(trimmedValue)
    ? trimmedValue
    : `https://${trimmedValue}`;
};

export default function PostJobsPage() {
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingJobPost, setEditingJobPost] = useState<JobPost | null>(null);
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [filter, setFilter] = useState<"OPEN" | "FILLED" | "" | "CLOSED">("");
  const [searchTitle, setSearchTitle] = useState<string>("");
  const [searchUser, setSearchUser] = useState<string>("");
  const token = useAuthStore((state) => state.token);
  const [skills, setSkills] = useState<JobSkill[]>([]);
  const ability = useAbility();

  const router = useRouter();

  const fetchJobCategories = async () => {
    if (!token || token === "undefined") return router.push("/");
    if (!ability?.can("read", "JobCategory")) {
      toast.error("You do not have permission to view job categories");
      return;
    }
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/job-category`,
        {
          headers: { "Content-Type": "application/json", token },
        },
      );
      const data = await response.json();
      setJobCategories(data.data || []);
    } catch (error) {
      console.error("Error fetching job categories:", error);
    }
  };

  const fetchSkills = async () => {
    if (!token || token === "undefined") return router.push("/");

    try {
      const response = await fetchJobSkills(token);
      setSkills(response || []);
    } catch (error: any) {
      console.error(error?.message || "Error fetching skills:", error);
    }
  };

  const fetchJobPosts = async () => {
    if (!token || token === "undefined") return router.push("/");
    if (!ability?.can("read", "JobPost")) {
      toast.error("You do not have permission to view job posts");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(sort && { sort }),
        ...(filter && { filter }),
      });

      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/api/job-post/my-jobPosts/?${params.toString()}`,
        {
          headers: { "Content-Type": "application/json", token },
        },
      );
      const data = await response.json();
      setJobPosts(data.data || []);
    } catch (error) {
      console.error("Error fetching job posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdateJobPost = async (jobPostData: {
    title: string;
    description: string;
    deadline: string;
    jobCategoryId: number;
  }) => {
    if (!token || token === "undefined") return router.push("/");

    try {
      const url = editingJobPost
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/job-post/${editingJobPost.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/job-post/add`;
      const method = editingJobPost ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", token },
        body: JSON.stringify(jobPostData),
      });

      const data = await response.json();
      if (data.message) {
        setIsModalOpen(false);
        setEditingJobPost(null);
        toast.success(data.message);
        fetchJobPosts();
      } else {
        toast.error(data.error?.[0]?.msg || "Something went wrong");
      }
    } catch (error) {
      toast.error("Error saving job post");
      console.error("Error saving job post:", error);
    }
  };

  useEffect(() => {
    fetchJobCategories();
    fetchSkills();
  }, []);

  useEffect(() => {
    fetchJobPosts();
  }, [sort, filter]);

  // Frontend filtering
  const filteredJobPosts = jobPosts.filter((job) => {
    const matchesTitle = searchTitle
      ? job.title.toLowerCase().includes(searchTitle.toLowerCase()) ||
        job.id.toString().includes(searchTitle)
      : true;

    const matchesUser = searchUser
      ? job.user.name?.toLowerCase().includes(searchUser.toLowerCase())
      : true;

    return matchesTitle && matchesUser;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-2 px-4">
      <div className="mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            My Job Posts
          </h1>
          <div className="flex gap-4">
            <Can I="read" a="JobSkill">
              <Link
                href="/job-post/jobSkills"
                className="inline-flex items-center px-5 py-2 text-sm font-medium text-white bg-gold-600 rounded-lg hover:bg-gold-700 focus:ring-4 focus:ring-gold-300 dark:bg-gold-700 dark:hover:bg-gold-800 dark:focus:ring-gold-900"
              >
                Manage Skills
              </Link>
            </Can>
            <Can I="read" a="JobCategory">
              <Link
                href="/job-post/jobCategories"
                className="inline-flex items-center px-5 py-2 text-sm font-medium text-white bg-gold-600 rounded-lg hover:bg-gold-700 focus:ring-4 focus:ring-gold-300 dark:bg-gold-700 dark:hover:bg-gold-800 dark:focus:ring-gold-900"
              >
                Manage Categories
              </Link>
            </Can>
            <Can I="create" a="JobPost">
              <button
                onClick={() => {
                  setEditingJobPost(null);
                  setIsModalOpen(true);
                }}
                className="px-4 py-2 text-white bg-gold-600 rounded-lg hover:bg-gold-700 focus:ring-4 focus:ring-gold-300 dark:bg-gold-700 dark:hover:bg-gold-800 dark:focus:ring-gold-900"
              >
                Post a Job
              </button>
            </Can>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          <Can I="read" a="JobPost">
            <aside className="w-full md:w-1/4 space-y-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 rounded-xl">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Filters
              </h2>
              <div className="w-full h-0.5 bg-gray-200 dark:bg-gray-700"></div>

              <input
                type="text"
                placeholder="Search by Title/Ref Code/Job ID"
                value={searchTitle}
                onChange={(e) => setSearchTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
              />

              <div className="space-y-2">
                <p className="font-semibold text-gray-700 dark:text-gray-300">
                  Job Status
                </p>
                {[
                  { name: "All", value: "ALL" },
                  { name: "Open", value: "OPEN" },
                  { name: "Filled", value: "FILLED" },
                  { name: "Closed", value: "CLOSED" },
                ].map(({ name, value }) => (
                  <label
                    key={value}
                    className="block text-sm text-gray-600 dark:text-gray-400"
                  >
                    <input
                      type="radio"
                      name="jobStatus"
                      value={value}
                      checked={
                        filter === value || (value === "ALL" && filter === "")
                      }
                      onChange={() =>
                        setFilter(
                          value === "ALL" ? "" : (value as "OPEN" | "FILLED"),
                        )
                      }
                      className="mr-2"
                    />
                    {name}
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-gray-700 dark:text-gray-300">
                  Job Posted By
                </p>
                <input
                  type="text"
                  placeholder="Search by username"
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
            </aside>

            <main className="w-full md:w-3/4 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as "asc" | "desc")}
                  className="px-3 py-2 rounded border border-gray-300 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                >
                  <option value="desc">Sort: Oldest</option>
                  <option value="asc">Sort: Newest</option>
                </select>
              </div>

              {loading ? (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  Loading job posts...
                </div>
              ) : filteredJobPosts.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  No job posts found.
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredJobPosts.map((jobPost) => (
                    <div
                      key={jobPost.id}
                      className="flex justify-between items-center p-4 bg-white border border-gray-200 rounded-xl shadow-sm dark:bg-gray-800 dark:border-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 transition-shadow duration-300 hover:dark:border-gold-600"
                    >
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                          {jobPost.title}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Deadline: {formatDateAndTime(jobPost.deadline, true)} | Status:{" "}
                          <span
                            className={
                              jobPost.status === "OPEN"
                                ? "text-green-500"
                                : "text-red-500"
                            }
                          >
                            {jobPost.status}
                          </span>
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Posted On: {formatDateAndTime(jobPost.createdAt, true)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Total Applicants:{" "}
                          <b>{jobPost._count?.JobApplication || 0}</b>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingJobPost(jobPost);
                            setIsModalOpen(true);
                          }}
                          className="px-3 py-1 text-sm"
                        >
                          {/* @ts-ignore */}
                          <HiOutlinePencilAlt className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        </button>
                        <Link href={`/job-post/${jobPost.id}`}>
                          {/* @ts-ignore */}
                          <HiExternalLink className="w-7 h-7 text-gray-500 dark:text-gray-400" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </main>
          </Can>
        </div>
      </div>

      {isModalOpen && (
        <CreateJobPostModal
          onClose={() => {
            setIsModalOpen(false);
            setEditingJobPost(null);
          }}
          onSubmit={handleCreateOrUpdateJobPost}
          jobCategories={jobCategories}
          editingJob={editingJobPost}
          skills={skills}
        />
      )}
    </div>
  );
}

function CreateJobPostModal({
  onClose,
  onSubmit,
  jobCategories,
  editingJob,
  skills,
}: CreateJobPostModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [jobCategoryId, setJobCategoryId] = useState<number | "">("");
  const [minExperience, setMinExperience] = useState<number>(0);
  const [maxExperience, setMaxExperience] = useState<number>(0);
  const [minSalary, setMinSalary] = useState<number>(0);
  const [maxSalary, setMaxSalary] = useState<number>(0);
  const [jobType, setJobType] = useState<
    "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE"
  >("FULL_TIME");
  const [jobMode, setJobMode] = useState<"REMOTE" | "ONSITE" | "HYBRID">(
    "ONSITE",
  );
  const [location, setLocation] = useState("");
  const [linkedInProfile, setLinkedInProfile] = useState("");
  const [twitterProfile, setTwitterProfile] = useState("");
  const [jobSkills, setJobSkills] = useState<number[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (editingJob) {
      setTitle(editingJob.title);
      setDescription(editingJob.description);
      setDeadline(editingJob.deadline.slice(0, 10));
      setJobCategoryId(editingJob.jobCategoryId);
      setMinExperience(editingJob.minExperience || 0);
      setMaxExperience(editingJob.maxExperience || 0);
      setMinSalary(editingJob.minSalary || 0);
      setMaxSalary(editingJob.maxSalary || 0);
      setJobType(editingJob.jobType || "FULL_TIME");
      setJobMode(editingJob.jobMode || "ONSITE");
      setLocation(editingJob.location || "");
      setLinkedInProfile(editingJob.linkedInProfile || "");
      setTwitterProfile(editingJob.twitterProfile || "");
    }
  }, [editingJob]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (jobCategoryId === "") {
      toast.error("Please select a job category");
      return;
    }

    const normalizedLinkedInProfile = normalizeOptionalProfileUrl(linkedInProfile);
    const normalizedTwitterProfile = normalizeOptionalProfileUrl(twitterProfile);

    onSubmit({
      title,
      description,
      deadline: new Date(deadline).toISOString().split("T")[0],
      jobCategoryId,
      status: editingJob?.status || "OPEN",
      minExperience,
      maxExperience,
      minSalary,
      maxSalary,
      jobType,
      jobMode,
      location,
      ...(normalizedLinkedInProfile && { linkedInProfile: normalizedLinkedInProfile }),
      ...(normalizedTwitterProfile && { twitterProfile: normalizedTwitterProfile }),
      ...(!editingJob && { skills: jobSkills }),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
            {editingJob ? "Edit Job Post" : "Create Job Post"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <div className="mt-1">
                  <CKEditorClient
                    value={description}
                    onChange={(val) => {
                      if (val.length <= 1000) {
                        setDescription(val);
                      } else {
                        toast.warn("Description cannot exceed 1000 characters");
                      }
                    }}
                  />
                  <p className="text-sm text-right text-gray-500 dark:text-gray-400 mt-1">
                    {description.length}/1000 characters
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Min Experience (years)
                </label>
                <input
                  type="number"
                  value={minExperience}
                  onChange={(e) => setMinExperience(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Max Experience (years)
                </label>
                <input
                  type="number"
                  value={maxExperience}
                  onChange={(e) => setMaxExperience(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Min Salary
                </label>
                <input
                  type="number"
                  value={minSalary}
                  onChange={(e) => setMinSalary(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Max Salary
                </label>
                <input
                  type="number"
                  value={maxSalary}
                  onChange={(e) => setMaxSalary(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Job Type
                </label>
                <select
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value as typeof jobType)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="INTERNSHIP">Internship</option>
                  <option value="FREELANCE">Freelance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Job Mode
                </label>
                <select
                  value={jobMode}
                  onChange={(e) => setJobMode(e.target.value as typeof jobMode)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="REMOTE">Remote</option>
                  <option value="ONSITE">Onsite</option>
                  <option value="HYBRID">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Deadline
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Company&apos;s LinkedIn Profile
                </label>
                <input
                  type="text"
                  inputMode="url"
                  value={linkedInProfile}
                  onChange={(e) => setLinkedInProfile(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="linkedin.com/company/company-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Company&apos;s Twitter Profile
                </label>
                <input
                  type="text"
                  inputMode="url"
                  value={twitterProfile}
                  onChange={(e) => setTwitterProfile(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="twitter.com/username"
                />
              </div>

              <div className="col-span-1 sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Job Category
                </label>
                <select
                  value={jobCategoryId}
                  onChange={(e) => setJobCategoryId(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="">Select a category</option>
                  {jobCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {!editingJob && (
                <div className="col-span-1 sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Job Skills
                  </label>
                  <div className="mt-1">
                    {skills.length > 0 ? (
                      <>
                        <select
                          multiple
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          value={jobSkills.map(id => id.toString())}
                          onChange={(e) => {
                            const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                            setJobSkills(selectedOptions);
                          }}
                          size={5}
                        >
                          {skills.map((skill) => (
                            <option key={skill.id} value={skill.id} className="py-1">
                              {skill.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-sm text-gray-500 mt-2 dark:text-gray-400">
                          Hold Ctrl (or Cmd on Mac) to select multiple skills
                        </p>
                      </>
                    ) : (
                      <div className="py-3 px-4 border border-gray-300 rounded-md text-gray-500 dark:text-gray-400 dark:border-gray-600 dark:bg-gray-700">
                        No skills available. Please add skills from the Manage Skills section.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-gold-600 rounded-lg hover:bg-gold-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 dark:bg-gold-700 dark:hover:bg-gold-800"
              >
                {editingJob ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
