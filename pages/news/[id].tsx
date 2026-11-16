"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { HiArrowLeft, HiPencilAlt, HiTrash, HiArchive, HiUser, HiMail, HiCalendar, HiClock, HiExternalLink } from 'react-icons/hi';
import useAuthStore from '@/store/authStore';
import MainLayout from '@/layouts/MainLayout';
import Can from '@/components/rbac/Can';
import { getNewsById, deleteNews, toggleArchiveNews } from '@/services/news';
import { NewsItem } from '@/types/news';
import VideoPlayer from '@/components/news/VideoPlayer';
import ConfirmDialog from '@/components/news/ConfirmDialog';
import { NewsDetailSkeleton } from '@/components/news/LoadingSkeleton';
import { formatDateAndTime } from '@/utils/formatDateAndTime';
import demoImage from '@/public/images/users/userProfile2.png';

export default function NewsDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageModal, setImageModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    imageIndex: number;
  }>({ isOpen: false, imageUrl: '', imageIndex: 0 });

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'delete' | 'archive' | 'unarchive';
    title: string;
  }>({ isOpen: false, type: 'delete', title: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const displayDate = news?.datePlanned || news?.createdAt;

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);

  useEffect(() => {
    if (!token) {
      router.push('/authentication/sign-in');
      return;
    }
    if (id && typeof id === 'string') {
      fetchNewsDetail(parseInt(id));
    }
  }, [token, router, id]);

  const fetchNewsDetail = async (newsId: number) => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await getNewsById(token, newsId);
      setNews(response.data);
    } catch (error: any) {
      console.error('Failed to fetch news detail:', error);
      toast.error(error.message || 'Failed to fetch news details');
      // Redirect to news list if not found
      if (error.message?.includes('not found')) {
        router.push('/news');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (news) {
      router.push(`/news/${news.id}/edit`);
    }
  };

  const handleDelete = () => {
    if (news) {
      setConfirmDialog({
        isOpen: true,
        type: 'delete',
        title: news.title,
      });
    }
  };

  const handleToggleArchive = () => {
    if (news) {
      setConfirmDialog({
        isOpen: true,
        type: news.isArchived ? 'unarchive' : 'archive',
        title: news.title,
      });
    }
  };

  const confirmAction = async () => {
    if (!token || !news) return;

    setActionLoading(true);
    try {
      if (confirmDialog.type === 'delete') {
        await deleteNews(token, news.id);
        toast.success('News item deleted successfully');
        router.push('/news');
      } else {
        const shouldArchive = confirmDialog.type === 'archive';
        await toggleArchiveNews(token, news.id, shouldArchive);
        toast.success(`News item ${shouldArchive ? 'archived' : 'unarchived'} successfully`);

        // Update local state
        setNews(prev => prev ? { ...prev, isArchived: shouldArchive } : null);
      }
    } catch (error: any) {
      console.error('Action failed:', error);
      toast.error(error.message || 'Action failed');
    } finally {
      setActionLoading(false);
      setConfirmDialog({ isOpen: false, type: 'delete', title: '' });
    }
  };

  const openImageModal = (imageUrl: string, imageIndex: number) => {
    setImageModal({ isOpen: true, imageUrl, imageIndex });
  };

  const closeImageModal = () => {
    setImageModal({ isOpen: false, imageUrl: '', imageIndex: 0 });
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (!news?.photoUrls) return;

    const validUrls = news.photoUrls.filter(url => url && url.trim() && isImageUrl(url));
    const currentIndex = imageModal.imageIndex;
    let newIndex;

    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : validUrls.length - 1;
    } else {
      newIndex = currentIndex < validUrls.length - 1 ? currentIndex + 1 : 0;
    }

    setImageModal({
      isOpen: true,
      imageUrl: validUrls[newIndex],
      imageIndex: newIndex,
    });
  };

  const getConfirmDialogProps = () => {
    switch (confirmDialog.type) {
      case 'delete':
        return {
          title: 'Delete News Item',
          message: `Are you sure you want to delete "${confirmDialog.title}"? This action cannot be undone.`,
          confirmText: 'Delete',
          type: 'danger' as const,
        };
      case 'archive':
        return {
          title: 'Archive News Item',
          message: `Are you sure you want to archive "${confirmDialog.title}"? It will no longer be visible to users.`,
          confirmText: 'Archive',
          type: 'warning' as const,
        };
      case 'unarchive':
        return {
          title: 'Unarchive News Item',
          message: `Are you sure you want to unarchive "${confirmDialog.title}"? It will become visible to users again.`,
          confirmText: 'Unarchive',
          type: 'info' as const,
        };
    }
  };

  if (loading) {
    return <NewsDetailSkeleton />;
  }

  if (!news) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          News Not Found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The requested news article could not be found.
        </p>
        <Link
          href="/news"
          className="inline-flex items-center px-4 py-2 bg-gold-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-gold-700"
        >
          {/* @ts-ignore */}
          <HiArrowLeft className="h-4 w-4 mr-1" />
          Back to News & Announcements
        </Link>
      </div>
    );
  }

  const canEdit = user && news && String(user.id) === String(news.authorId);
  const validMediaUrls = news.photoUrls ? news.photoUrls.filter(url => url && url.trim()) : [];
  const imageUrls = validMediaUrls.filter(url => isImageUrl(url));
  const documentUrls = validMediaUrls.filter(url => !isImageUrl(url));

  return (
    <>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/news')}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {/* @ts-ignore */}
            <HiArrowLeft className="h-5 w-5 mr-1" />
            Back to News & Announcements
          </button>

          {canEdit && (
            <div className="flex items-center space-x-3">
              <Can I="update" a="News">
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center px-3 py-2 border border-gold-600 rounded-lg text-sm font-medium text-gold-600 bg-white dark:bg-gray-800 hover:bg-gold-50 dark:hover:bg-gold-900 transition-colors"
                >
                  {/* @ts-ignore */}
                  <HiPencilAlt className="h-4 w-4 mr-1" />
                  Edit
                </button>
              </Can>

              <button
                onClick={handleToggleArchive}
                className="inline-flex items-center px-3 py-2 border border-yellow-600 rounded-lg text-sm font-medium text-yellow-600 bg-white dark:bg-gray-800 hover:bg-yellow-50 dark:hover:bg-yellow-900 transition-colors"
              >
                {/* @ts-ignore */}
                <HiArchive className="h-4 w-4 mr-1" />
                {news.isArchived ? 'Unarchive' : 'Archive'}
              </button>

              <Can I="delete" a="News">
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-3 py-2 border border-red-600 rounded-lg text-sm font-medium text-red-600 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900 transition-colors"
                >
                  {/* @ts-ignore */}
                  <HiTrash className="h-4 w-4 mr-1" />
                  Delete
                </button>
              </Can>
            </div>
          )}
        </div>

        {/* Article */}
        <article className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Title and Status */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            {news.isArchived && (
              <div className="mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                  {/* @ts-ignore */}
                  <HiArchive className="w-4 h-4 mr-1" />
                  Archived
                </span>
              </div>
            )}

            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {news.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                {/* @ts-ignore */}
                <HiUser className="h-4 w-4 mr-1" />
                <span>{news.author.name}</span>
                {news.author.Role && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {news.author.Role.name}
                  </span>
                )}
              </div>

              <div className="flex items-center">
                {/* @ts-ignore */}
                <HiCalendar className="h-4 w-4 mr-1" />
                <span>Published {displayDate ? formatDateAndTime(displayDate) : ''}</span>
              </div>

              {news.updatedAt !== news.createdAt && (
                <div className="flex items-center">
                  {/* @ts-ignore */}
                  <HiClock className="h-4 w-4 mr-1" />
                  <span>Updated {formatDateAndTime(news.updatedAt)}</span>
                </div>
              )}

              {news.retentionPeriod && (
                <div className="flex items-center">
                  {/* @ts-ignore */}
                  <HiClock className="h-4 w-4 mr-1" />
                  <span>{news.retentionPeriod} days retention</span>
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            {imageUrls.length > 0 ? (
              <div className={`grid gap-4 ${imageUrls.length === 1 ? 'grid-cols-1' : imageUrls.length === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`}>
                {imageUrls.map((url, index) => (
                  <div key={index} className="relative group cursor-pointer" onClick={() => openImageModal(url, index)}>
                    <Image
                      src={url}
                      alt={`News image ${index + 1}`}
                      width={400}
                      height={300}
                      className="w-full h-64 object-cover rounded-lg transition-transform group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-lg flex items-center justify-center">
                      <button className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-90 text-gray-900 px-3 py-1 rounded-md text-sm font-medium transition-opacity">
                        View Full Size
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : documentUrls.length === 0 ? (
              <div className="flex justify-center">
                <div className="w-full max-w-md h-64 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <svg
                      className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-sm text-gray-500 dark:text-gray-400">No images available</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">This article contains text content only</p>
                  </div>
                </div>
              </div>
            ) : null}

            {documentUrls.length > 0 && (
              <div className={`${imageUrls.length > 0 ? 'mt-6' : ''}`}>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Documents</h3>
                <div className="space-y-2">
                  {documentUrls.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-200 break-all pr-3">
                        {url.split('/').pop() || `Document ${index + 1}`}
                      </span>
                      {/* @ts-ignore */}
                      <HiExternalLink className="w-4 h-4 text-gold-600 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Video */}
          {news.videoUrl && (
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Video Content</h3>
              <VideoPlayer url={news.videoUrl} title={news.title} />
            </div>
          )}

          {/* Content */}
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Content</h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-5">
              <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 min-h-[100px]">
                <div
                  className="max-w-none p-3 text-gray-700 dark:text-gray-300"
                  dangerouslySetInnerHTML={{
                    __html: news.content || "",
                  }}
                />
              </div>
            </div>
          </div>
        </article>

        {/* Author Card */}
        <div className="mt-8 bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">About the Author</h3>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <Image
                src={demoImage}
                alt={news.author.name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full"
              />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-medium text-gray-900 dark:text-white">
                {news.author.name}
              </h4>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                {/* @ts-ignore */}
                <HiMail className="h-4 w-4 mr-1" />
                <a href={`mailto:${news.author.email}`} className="hover:text-gold-600 transition-colors">
                  {news.author.email}
                </a>
              </div>
              {news.author.Role && (
                <div className="mt-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {news.author.Role.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {imageModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90">
          {/* Image container - Lower z-index */}
          <div className="flex items-center justify-center w-full h-full p-4 relative z-10">
            <Image
              src={imageModal.imageUrl}
              alt={`News image ${imageModal.imageIndex + 1}`}
              width={1200}
              height={800}
              className="max-w-full max-h-full object-contain"
              style={{ maxWidth: 'calc(100vw - 2rem)', maxHeight: 'calc(100vh - 2rem)' }}
            />
          </div>

          {/* UI Controls - Higher z-index to overlay on top */}
          <div className="fixed inset-0 z-20 pointer-events-none">
            {/* Close button - Fixed to viewport */}
            <button
              onClick={closeImageModal}
              className="fixed top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all backdrop-blur-sm pointer-events-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navigation buttons - Fixed to viewport edges */}
            {imageUrls.length > 1 && (
              <>
                <button
                  onClick={() => navigateImage('prev')}
                  className="fixed left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all backdrop-blur-sm pointer-events-auto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => navigateImage('next')}
                  className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all backdrop-blur-sm pointer-events-auto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Image counter - Fixed to viewport bottom */}
            {imageUrls.length > 1 && (
              <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-20 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
                {imageModal.imageIndex + 1} / {imageUrls.length}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'delete', title: '' })}
        onConfirm={confirmAction}
        loading={actionLoading}
        {...getConfirmDialogProps()}
      />
    </>
  );
}

// Layout configuration
NewsDetailPage.getLayout = (page: React.ReactNode) => (
  <MainLayout activeMenu="news">{page}</MainLayout>
);
