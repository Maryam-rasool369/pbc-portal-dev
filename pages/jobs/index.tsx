import React from "react";
import Link from "next/link";

export default function JobsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4">
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800 flex flex-row">
        <div className="flex flex-col items-center justify-between lg:flex mb-6">
          <div className="flex justify-end mb-6 max-w-6xl w-full mx-auto">
            <Link
              href="/job-post/jobCategories"
              className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-800 rounded-md transition-colors flex items-center"
            >
              Manage Categories
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 max-w-6xl w-full mx-auto">
            <div className="p-8 bg-white border border-gold-700 rounded-xl shadow-lg dark:bg-gray-800 dark:border-gold-700 hover:shadow-2xl transition-shadow duration-300">
              <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
                Apply To Jobs
              </h2>
              <p className="mb-6 text-lg text-gray-600 dark:text-gray-400">
                Explore job opportunities and apply for your desired roles. Find
                the perfect match for your skills and career goals.
              </p>
              <Link
                href="/jobs/apply"
                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-800 rounded-md transition-colors "
              >
                Go to Apply
              </Link>
            </div>

            <div className="p-8 bg-white border border-gray-200 rounded-xl shadow-lg dark:bg-gray-800 dark:border-gold-700 hover:shadow-2xl transition-shadow duration-300">
              <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
                Post Jobs
              </h2>
              <p className="mb-6 text-lg text-gray-600 dark:text-gray-400">
                Post job openings and find the right candidates for your team.
                Reach out to talented professionals.
              </p>
              <Link
                href="/jobs/post"
                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-gray-800 rounded-md transition-colors "
              >
                Go to Post
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
