import React, { useEffect, useState, useRef } from "react";
import useAuthStore from "@/store/authStore";
import dynamic from "next/dynamic";
import Can from "@/components/rbac/Can";
import {
  formatDateAndTime,
  formatDateForInput,
  formatDateWithTimezoneForAPI,
  getRelativeTimezoneOffset,
} from "@/utils/formatDateAndTime";
import { toast } from "react-toastify";
import { Accordion } from "flowbite-react";
import { COMMON_TIMEZONES } from "@/constants/datetime";
import { DateTime } from "luxon";
import { useRouter } from "next/router";

const CKEditorClient = dynamic(() => import("@/components/CKEditorClient"), {
  ssr: false,
});

interface Article {
  id: number;
  title: string;
  content: string;
  updatedAt: string;
  constitutionId: number;
}

interface Constitution {
  id: number;
  title: string;
  version: string;
  isEditable: boolean;
  lastEditedBy: string | null;
  updatedAt: string;
  createdAt: string;
  articles: Article[];
}

interface AmendmentData {
  version: "major" | "minor" | "patch";
  content: string;
  startDate: string;
  endDate: string;
  timezone: string;
}

const getOneWeekFromDate = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + 7);
  return newDate;
};

export default function ConstitutionPage() {
  const router = useRouter();

  useEffect(() => {
    // Immediate redirect
    router.replace("/userMarketplace");
  }, [router]);

  return (
    <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">
          No constitution found. Redirecting to Marketplace...
        </p>
      </div>
    </div>
  );

  const [constitution, setConstitution] = useState<Constitution | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedArticleId, setSelectedArticleId] = useState<number | null>(
    null,
  );
  const modalRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  const oneWeekFromNow = getOneWeekFromDate(today);

  const userTimezone = DateTime.local().zoneName;

  const timezoneOptions = COMMON_TIMEZONES.map((tz) =>
    tz === "LOCAL_TIMEZONE_PLACEHOLDER" ? userTimezone : tz,
  ).filter((tz, index, self) => self.indexOf(tz) === index);

  const [amendmentData, setAmendmentData] = useState<AmendmentData>({
    version: "patch",
    content: "",
    startDate: formatDateForInput(today),
    endDate: formatDateForInput(oneWeekFromNow),
    timezone: userTimezone,
  });

  const [submitting, setSubmitting] = useState(false);
  const token = useAuthStore((state) => state.token);

  const [originalContent, setOriginalContent] = useState<string>("");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        !submitting
      ) {
        handleCloseModal();
      }
    }

    if (selectedArticleId) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedArticleId, submitting]);

  const fetchConstitution = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/constitution`,
        {
          headers: {
            ...(token && { token }),
          },
        },
      );

      const data = await response.json();

      if (!response.ok) throw new Error(data?.error[0]?.msg || "Failed to fetch constitution");

      setConstitution(data.data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAmendmentSubmit = async (articleId: number) => {
    if (!amendmentData.content) {
      toast.error("Please enter amendment content");
      return;
    }

    if (amendmentData.content === originalContent) {
      toast.error(
        "No changes detected. Please modify the content before submitting.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/constitution/amendment/${articleId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { token }),
          },
          body: JSON.stringify({
            ...amendmentData,
            startDate: formatDateWithTimezoneForAPI(
              amendmentData.startDate,
              amendmentData.timezone,
            ),
            endDate: formatDateWithTimezoneForAPI(
              amendmentData.endDate,
              amendmentData.timezone,
            ),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error[0].msg || "Amendment failed");
      }

      toast.success("Amendment submitted successfully");
      setSelectedArticleId(null);
      fetchConstitution();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedArticleId(null);
    setOriginalContent("");

    setTimeout(() => {
      setAmendmentData({
        version: "patch",
        content: "",
        startDate: formatDateForInput(new Date()),
        endDate: formatDateForInput(getOneWeekFromDate(new Date())),
        timezone: userTimezone,
      });
    }, 50);
  };

  const hasContentChanged = amendmentData.content !== originalContent;

  useEffect(() => {
    fetchConstitution();
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded-full dark:bg-gray-700 w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded-full dark:bg-gray-700 w-64 mb-8"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="mb-4">
              <div className="h-6 bg-gray-200 rounded-full dark:bg-gray-700 w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded-full dark:bg-gray-700 w-5/6"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!constitution) {
    return (
      <div className="p-4 bg-white mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No constitution found
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 bg-white mt-2 sm:mt-4 border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 sm:p-6 dark:bg-gray-800">
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {constitution.title}
          </h1>
          {!constitution.isEditable && (
            <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-amber-900 dark:text-amber-300">
              Amendment in progress
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Version {constitution.version}
          </span>
          {constitution.lastEditedBy && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Last updated {formatDateAndTime(constitution.updatedAt, true)}
          </span>
          )}
        </div>
      </div>

      <Accordion alwaysOpen={true} className="responsive-accordion">
        {constitution.articles.map((article) => (
          <Accordion.Panel key={article.id}>
            <Accordion.Title className="bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none focus:ring-0">
              <div className="flex justify-between items-center w-full px-2">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {article.title}
                </span>
              </div>
            </Accordion.Title>
            <Accordion.Content>
              <div
                className="prose dark:prose-invert max-w-none p-2 sm:p-4 text-gray-900 dark:text-gray-100 overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
              <div className="mt-3 px-2 sm:px-4 pb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {article.updatedAt && (
                  `Last modified: ${formatDateAndTime(article.updatedAt, true)}`
                )}
                </span>
                {constitution.isEditable && (
                  <Can I="update" a="Constitution">
                    <button
                      onClick={() => {
                        setSelectedArticleId(article.id);
                        setOriginalContent(article.content);
                        setAmendmentData({
                          version: "patch",
                          content: article.content,
                          startDate: formatDateForInput(new Date()),
                          endDate: formatDateForInput(
                            getOneWeekFromDate(new Date()),
                          ),
                          timezone: userTimezone,
                        });
                      }}
                      className="text-xs sm:text-sm bg-gold-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md hover:bg-gold-600 w-full sm:w-auto"
                    >
                      Propose Amendment
                    </button>
                  </Can>
                )}
              </div>
            </Accordion.Content>
          </Accordion.Panel>
        ))}
      </Accordion>

      {/* Amendment Modal */}
      {selectedArticleId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div
            ref={modalRef}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative"
          >
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b dark:border-gray-700">
              <h3 className="text-xl font-semibold dark:text-white">
                Propose Amendment
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close modal"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Version Change Type */}
              <div className="max-w-[200px]">
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                  Version Change Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={amendmentData.version}
                  onChange={(e) =>
                    setAmendmentData({
                      ...amendmentData,
                      version: e.target.value as "major" | "minor" | "patch",
                    })
                  }
                  className="w-full p-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white cursor-pointer"
                  required
                >
                  <option value="major">Major Change</option>
                  <option value="minor">Minor Change</option>
                  <option value="patch">Patch Update</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                  Timezone <span className="text-red-500">*</span>
                </label>
                <select
                  value={amendmentData.timezone}
                  onChange={(e) =>
                    setAmendmentData({
                      ...amendmentData,
                      timezone: e.target.value,
                    })
                  }
                  className="w-full p-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white cursor-pointer"
                  required
                >
                  {timezoneOptions.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz === userTimezone
                        ? `${tz.replace(/_/g, " ")} (Local time)`
                        : `${tz.replace(/_/g, " ")} (${getRelativeTimezoneOffset(tz, userTimezone)})`}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  All dates will be interpreted in this timezone. Offsets shown
                  are relative to your local time.
                </p>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label
                    htmlFor="startDate"
                    className="block text-sm font-medium mb-2 dark:text-gray-300"
                  >
                    Start Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    id="startDate"
                    value={amendmentData.startDate}
                    onChange={(e) =>
                      setAmendmentData({
                        ...amendmentData,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full p-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Voting period begins ({amendmentData.timezone})
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="endDate"
                    className="block text-sm font-medium mb-2 dark:text-gray-300"
                  >
                    End Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    id="endDate"
                    value={amendmentData.endDate}
                    onChange={(e) =>
                      setAmendmentData({
                        ...amendmentData,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full p-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-gold-500 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    required
                  />
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    Voting period ends ({amendmentData.timezone})
                  </p>
                </div>
              </div>

              {/* Amendment Content */}
              <div>
                <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                  Amendment Content <span className="text-red-500">*</span>
                </label>
                <div className="border rounded-lg dark:border-gray-600 editor-container">
                  <CKEditorClient
                    key={`editor-${selectedArticleId}`}
                    value={amendmentData.content}
                    onChange={(content: any) =>
                      setAmendmentData({ ...amendmentData, content })
                    }
                  />
                </div>
                {!hasContentChanged && amendmentData.content && (
                  <p className="mt-1.5 text-sm text-amber-500">
                    No changes detected. Please modify the content before
                    submitting.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 mt-6 border-t dark:border-gray-700">
                <button
                  onClick={handleCloseModal}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors order-2 sm:order-1"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAmendmentSubmit(selectedArticleId)}
                  className={`px-5 py-2.5 text-sm font-medium ${
                    hasContentChanged
                      ? "bg-gold-500 hover:bg-gold-600"
                      : "bg-gray-400"
                  } text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors order-1 sm:order-2`}
                  disabled={submitting || !hasContentChanged}
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Submitting...
                    </span>
                  ) : !hasContentChanged ? (
                    "No Changes Detected"
                  ) : (
                    "Submit Amendment"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .responsive-accordion .prose img {
          max-width: 100%;
          height: auto;
        }
        .responsive-accordion table {
          display: block;
          width: 100%;
          overflow-x: auto;
        }
      `}</style>
    </div>
  );
}
