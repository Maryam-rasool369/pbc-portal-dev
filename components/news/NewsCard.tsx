import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDateAndTime } from '@/utils/formatDateAndTime';
import { NewsItem } from '@/types/news';
import { HiCalendar, HiUser, HiEye, HiArchive } from 'react-icons/hi';
import Can from '@/components/rbac/Can';

interface NewsCardProps {
  news: NewsItem;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  onToggleArchive?: (id: number, isArchived: boolean) => void;
  showActions?: boolean;
}

export default function NewsCard({
  news,
  onEdit,
  onDelete,
  onToggleArchive,
  showActions = false,
}: NewsCardProps) {
  const displayDate = news.datePlanned || news.createdAt;

  const truncateContent = (content: string, maxLength: number = 200) => {
    // Remove HTML tags for preview
    const textContent = content.replace(/<[^>]*>/g, '');
    return textContent.length > maxLength
      ? textContent.substring(0, maxLength) + '...'
      : textContent;
  };

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);

  const validImages = news.photoUrls
    ? news.photoUrls.filter(url => url && url.trim() && isImageUrl(url))
    : [];
  const hasValidImages = validImages.length > 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Image Section */}
      <div className="relative h-48 w-full">
        {hasValidImages ? (
          <Image
            src={validImages[0]}
            alt={news.title}
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
        {news.isArchived && (
          <div className="absolute top-2 right-2 bg-yellow-500 text-yellow-900 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
            {/* @ts-ignore */}
            <HiArchive className="w-3 h-3" />
            Archived
          </div>
        )}
        {hasValidImages && validImages.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
            +{validImages.length - 1} more
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
          {news.title}
        </h3>

        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
          {truncateContent(news.content)}
        </p>

        {/* Author and Date */}
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            {/* @ts-ignore */}
            <HiUser className="w-3 h-3" />
            <span>{news.author.name}</span>
            {news.author.Role && (
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                {news.author.Role.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* @ts-ignore */}
            <HiCalendar className="w-3 h-3" />
            <span>{formatDateAndTime(displayDate)}</span>
          </div>
        </div>

        {/* Video Indicator */}
        {news.videoUrl && (
          <div className="flex items-center text-xs text-purple-600 dark:text-purple-400 mb-3">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
            Video attached
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Link
            href={`/news/${news.id}`}
            className="inline-flex items-center text-gold-600 hover:text-gold-700 text-sm font-medium gap-1"
          >
            {/* @ts-ignore */}
            <HiEye className="w-4 h-4" />
            Read More
          </Link>

          {showActions && (
            <Can I="update" a="News">
              <div className="flex items-center gap-2">
                {onEdit && (
                  <button
                    onClick={() => onEdit(news.id)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Edit
                  </button>
                )}
                {onToggleArchive && (
                  <button
                    onClick={() => onToggleArchive(news.id, !news.isArchived)}
                    className="text-yellow-600 hover:text-yellow-700 text-sm font-medium"
                  >
                    {news.isArchived ? 'Unarchive' : 'Archive'}
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(news.id)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                )}
              </div>
            </Can>
          )}
        </div>
      </div>
    </div>
  );
}
