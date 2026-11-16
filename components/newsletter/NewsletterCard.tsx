import React from "react";
import Link from "next/link";
import Image from "next/image";
import { HiCalendar, HiEye, HiPencil, HiTrash, HiUser } from "react-icons/hi";
import Can from "@/components/rbac/Can";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import { NewsletterItem } from "@/types/newsletter";

interface NewsletterCardProps {
  newsletter: NewsletterItem;
  onDelete?: (id: number) => void;
  showActions?: boolean;
}

export default function NewsletterCard({
  newsletter,
  onDelete,
  showActions = false,
}: NewsletterCardProps) {
  const truncateContent = (content: string, maxLength: number = 200) => {
    const textContent = content.replace(/<[^>]*>/g, "");
    return textContent.length > maxLength
      ? `${textContent.substring(0, maxLength)}...`
      : textContent;
  };

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);

  const validImages = newsletter.photoUrls
    ? newsletter.photoUrls.filter((url) => url && url.trim() && isImageUrl(url))
    : [];

  const activeVideoUrls = (newsletter.videoUrls || []).filter((url) => url && url.trim());
  const activeArticleUrls = (newsletter.articleUrls || []).filter((url) => url && url.trim());
  const isScheduled = newsletter.status === "PENDING";
  const statusLabel = isScheduled ? "Scheduled" : "Published";
  const statusClassName = isScheduled
    ? "bg-yellow-500 text-yellow-900"
    : "bg-green-500 text-green-50";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="relative h-48 w-full">
        {validImages.length > 0 ? (
          <Image
            src={validImages[0]}
            alt={newsletter.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
            <div className="text-center">
              <svg
                className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
              <p className="text-xs text-gray-500 dark:text-gray-400">No Image</p>
            </div>
          </div>
        )}

        <div
          className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${statusClassName}`}
        >
          {statusLabel}
        </div>

        {validImages.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
            +{validImages.length - 1} more
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
          {newsletter.title}
        </h3>

        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
          {truncateContent(newsletter.content)}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            {/* @ts-ignore */}
            <HiUser className="w-3 h-3" />
            <span>{newsletter.author.name}</span>
          </div>
          <div className="flex items-center gap-1">
            {/* @ts-ignore */}
            <HiCalendar className="w-3 h-3" />
            <span>{`${statusLabel} ${formatDateAndTime(newsletter.publishedAt)}`}</span>
          </div>
        </div>

        {(activeVideoUrls.length > 0 || activeArticleUrls.length > 0) && (
          <div className="flex items-center gap-2 mb-3 text-xs">
            {activeVideoUrls.length > 0 && (
              <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                {activeVideoUrls.length} video{activeVideoUrls.length > 1 ? "s" : ""}
              </span>
            )}
            {activeArticleUrls.length > 0 && (
              <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {activeArticleUrls.length} article link{activeArticleUrls.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-3">
            <Link
              href={`/newsletter/${newsletter.id}`}
              className="inline-flex items-center text-gold-600 hover:text-gold-700 text-sm font-medium gap-1"
            >
              {/* @ts-ignore */}
              <HiEye className="w-4 h-4" />
              Read More
            </Link>

            {showActions && isScheduled && (
              <Can I="update" a="Newsletter">
                <Link
                  href={`/newsletter/${newsletter.id}/edit`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium gap-1"
                >
                  {/* @ts-ignore */}
                  <HiPencil className="w-4 h-4" />
                  Edit
                </Link>
              </Can>
            )}
          </div>

          {showActions && onDelete && (
            <Can I="delete" a="Newsletter">
              <button
                onClick={() => onDelete(newsletter.id)}
                className="inline-flex items-center text-red-600 hover:text-red-700 text-sm font-medium gap-1"
              >
                {/* @ts-ignore */}
                <HiTrash className="w-4 h-4" />
                Delete
              </button>
            </Can>
          )}
        </div>
      </div>
    </div>
  );
}
