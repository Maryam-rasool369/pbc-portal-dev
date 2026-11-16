import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { HiExternalLink } from "react-icons/hi";
import JobApplyLayout from "@/layouts/JobApplyLayout";
import Pagination from "@/components/common/Pagination";

interface JobPost {
  id: number;
  title: string;
  description: string;
  deadline: string;
  createdAt: string;
  status: string;
  jobCategoryId?: number; // Add this if not already present
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
}

type Pagination = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

export default function ApplyJobsPage() {
  const [jobPosts, setJobPosts] = useState<JobPost[]>([]);
  const [jobCategories, setJobCategories] = useState<JobCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"" | "OPEN" | "FILLED">("");
  const [sort, setSort] = useState<"asc" | "desc">("desc");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const limit: number = 6;
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const router = useRouter();
  const handlePageChange = (page: number) => {
    if (pagination && page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  };

  const fetchJobPosts = async () => {
    try {
      setLoadingMore(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/job-post?page=${currentPage}&limit=${limit}`
      );
      const data = await res.json();
      setJobPosts(data.data || []);
      setPagination(data.pagination || null);
    } catch (err) {
      console.error("Error fetching job posts:", err);
    } finally {
      setLoadingMore(false);
      setLoading(false);
    }
  };

  const fetchJobCategories = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/job-category`,
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      const data = await response.json();
      setJobCategories(data.data || []);
    } catch (error) {
      console.error("Error fetching job categories:", error);
    }
  };

  useEffect(() => {
    fetchJobCategories();
  }, []);

  useEffect(() => {
    fetchJobPosts();
  }, [currentPage]);

  const filteredPosts = jobPosts
    .filter(
      (job) =>
        searchTerm === "" ||
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.id.toString().includes(searchTerm)
    )
    .filter((job) => (filter === "" ? true : job.status === filter))
    .filter((job) =>
      selectedCategoryId === null
        ? true
        : job.jobCategoryId === selectedCategoryId
    )
    .sort((a, b) =>
      sort === "asc"
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-gold-600 to-gold-400 rounded-2xl p-8 overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white mb-4">
            Find Your Next Career Opportunity
          </h1>
          <p className="text-white/90 text-lg max-w-2xl">
            Join the Pakistan Business Council community in Dubai and be part of
            something extraordinary.
          </p>
        </div>
        <div className="absolute right-0 top-0 w-1/3 h-full opacity-10">
          {/* Add a decorative pattern or illustration here */}
          <div className="w-full h-full bg-white transform rotate-12 translate-x-1/4"></div>
        </div>
      </div>

      {/* Category Slider */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
        <div className="relative flex items-center">
          {/* Sticky All Jobs button with gradient fade effect */}
          <div className="sticky left-0 z-10 flex items-center">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`px-6 py-3 rounded-md text-sm font-medium transition-all duration-300 ${
                selectedCategoryId === null
                  ? "bg-gold-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              All Jobs
            </button>
            <div className="absolute right-0 h-full w-4" />
          </div>

          {/* Scrollable categories */}
          <div className="flex items-center gap-3 overflow-x-scroll scrollbar-show pl-4 ml-3">
            {jobCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-6 py-3 rounded-md text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                  selectedCategoryId === cat.id
                    ? "bg-gold-600 text-white shadow-lg shadow-gold-600/30"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:w-1/4 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Search for Jobs
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                  Browse
                </label>
                <input
                  type="text"
                  placeholder="Search by title or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-gold-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                  Sort By
                </label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as "asc" | "desc")}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-gold-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>
          </div>
        </aside>
        {/* Main Content */}
        <main className="lg:w-3/4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-600"></div>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
              <div className="text-gray-500 dark:text-gray-400 text-lg">
                No job posts found matching your criteria.
              </div>
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredPosts.map((jobPost) => (
                <Link
                  href={`/job-apply/${jobPost.id}`}
                  key={jobPost.id}
                  className="block bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden group"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-gold-600 transition-colors">
                          {jobPost.title}
                        </h2>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 text-xs rounded-full bg-gold-100 text-gold-800 dark:bg-gold-900/30 dark:text-gold-400">
                            {jobPost._count?.JobApplication || 0} Applicants
                          </span>
                          <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            Deadline:{" "}
                            {new Date(jobPost.deadline).toLocaleDateString(
                              "en-GB"
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="text-gray-400 group-hover:text-gold-600 transition-colors">
                        {/* @ts-ignore */}
                        <HiExternalLink className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!selectedCategoryId && pagination && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              isLoading={loading}
              onPageChange={handlePageChange}
            />
          )}
        </main>
      </div>
    </div>
  );
}

ApplyJobsPage.getLayout = function getLayout(page: React.ReactElement) {
  return <JobApplyLayout>{page}</JobApplyLayout>;
};
