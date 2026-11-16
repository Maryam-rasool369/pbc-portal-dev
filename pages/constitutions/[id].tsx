"use client";

import { formatDateAndTime } from "@/utils/formatDateAndTime";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import useAuthStore from "@/store/authStore";
import {
  HiChevronDown,
  HiChevronUp,
  HiCheckCircle,
  HiXCircle,
  HiClock,
  HiDocumentText,
} from "react-icons/hi";

interface ConstitutionDoc {
  id: number;
  status: "APPROVED" | "PENDING" | "REJECTED";
  constitutionDoc: string;
  version: string;
  effectiveDate: string;
  createdAt: string;
}

interface Constitution {
  id: number;
  title: string;
  description: string;
  constitutionDocs: ConstitutionDoc[];
}

export default function ConstitutionDetails() {
  const router = useRouter();
  const { id } = router.query;
  const [constitution, setConstitution] = useState<Constitution | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const token = useAuthStore((state) => state.token);

  const fetchConstitution = async () => {
    if (!id) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/constitution/${id}`,
        {
          headers: { token: token || "" },
        },
      );
      const data = await res.json();
      setConstitution(data.data);
    } catch (error) {
      console.error("Failed to fetch constitution:", error);
    }
  };

  const handleApproveReject = async (status: string) => {
    // Approval logic remains similar
  };

  useEffect(() => {
    fetchConstitution();
  }, [id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gold-500 mb-2">
          {constitution?.title}
        </h1>
        <p className="text-gray-300 max-w-3xl">{constitution?.description}</p>
      </div>

      {/* Articles Grid */}
      <div className="grid gap-4">
        {constitution?.constitutionDocs.map((article) => (
          <div
            key={article.id}
            className="bg-gray-800 rounded-xl p-6 shadow-xl border border-gray-700 transition-all"
          >
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() =>
                setExpandedArticle(
                  expandedArticle === article.id ? null : article.id,
                )
              }
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gray-700 rounded-lg">
                  {/*@ts-ignore */}
                  <HiDocumentText className="w-6 h-6 text-gold-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">
                    Article v{article.version}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`px-2 py-1 rounded-full text-sm ${
                        article.status === "APPROVED"
                          ? "bg-green-900 text-green-300"
                          : article.status === "PENDING"
                            ? "bg-yellow-900 text-yellow-300"
                            : "bg-red-900 text-red-300"
                      }`}
                    >
                      {article.status}
                    </span>
                    <span className="text-gray-400 text-sm flex items-center gap-1">
                      {/*@ts-ignore */}
                      <HiClock className="w-4 h-4" />
                      {formatDateAndTime(article.effectiveDate)}
                    </span>
                  </div>
                </div>
              </div>
              <button className="text-gray-400 hover:text-white">
                {expandedArticle === article.id ? (
                  //  @ts-ignore
                  <HiChevronUp className="w-6 h-6" />
                ) : (
                  // @ts-ignore
                  <HiChevronDown className="w-6 h-6" />
                )}
              </button>
            </div>

            {expandedArticle === article.id && (
              <div className="mt-6 border-t border-gray-700 pt-6">
                <div className="mb-6">
                  <a
                    href={article.constitutionDoc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-gold-500 hover:text-gold-400"
                  >
                    {/*@ts-ignore */}
                    <HiDocumentText className="w-5 h-5" />
                    View Full Document
                  </a>
                </div>

                {article.status === "PENDING" && (
                  <div className="flex gap-4 mt-6">
                    <button
                      onClick={() => setStatus("APPROVED")}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl flex items-center justify-center gap-2"
                    >
                      {/*@ts-ignore */}
                      <HiCheckCircle className="w-6 h-6" />
                      Approve Amendment
                    </button>
                    <button
                      onClick={() => setStatus("REJECTED")}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl flex items-center justify-center gap-2"
                    >
                      {/*@ts-ignore */}
                      <HiXCircle className="w-6 h-6" />
                      Reject Amendment
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Approval Modal */}
      {status && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-700">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              {status === "APPROVED" ? (
                // @ts-ignore
                <HiCheckCircle className="text-green-500 w-6 h-6" />
              ) : (
                // @ts-ignore
                <HiXCircle className="text-red-500 w-6 h-6" />
              )}
              {status} Amendment
            </h3>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={`Add your comment...`}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4 text-white placeholder-gray-500"
              rows={4}
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setStatus(null)}
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApproveReject(status)}
                className="px-6 py-2 bg-gold-500 hover:bg-gold-600 text-black rounded-lg"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
