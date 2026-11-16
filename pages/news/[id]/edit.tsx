"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-toastify';
import useAuthStore from '@/store/authStore';
import MainLayout from '@/layouts/MainLayout';
import Can from '@/components/rbac/Can';
import { getNewsById } from '@/services/news';
import { NewsItem } from '@/types/news';
import NewsForm from '@/components/news/NewsForm';
import { NewsDetailSkeleton } from '@/components/news/LoadingSkeleton';

export default function EditNewsPage() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionChecked, setPermissionChecked] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/authentication/sign-in');
      return;
    }
    if (id && typeof id === 'string') {
      fetchNewsDetail(parseInt(id));
    }
  }, [token, router, id]);

  useEffect(() => {
    if (news && user) {
      // Check if user owns this news item
      if (String(user.id) !== String(news.authorId)) {
        toast.error('You can only edit your own news articles');
        router.push(`/news/${news.id}`);
        return;
      }
      setPermissionChecked(true);
    }
  }, [news, user, router]);

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

  const handleSuccess = (updatedNewsItem: NewsItem) => {
    router.push(`/news/${updatedNewsItem.id}`);
  };

  const handleCancel = () => {
    if (news) {
      router.push(`/news/${news.id}`);
    } else {
      router.push('/news');
    }
  };

  if (!token || loading) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <NewsDetailSkeleton />
      </div>
    );
  }

  if (!news) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            News Not Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The requested news article could not be found.
          </p>
          <button
            onClick={() => router.push('/news')}
            className="inline-flex items-center px-4 py-2 bg-gold-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-gold-700"
          >
            Back to News & Announcements
          </button>
        </div>
      </div>
    );
  }

  if (!permissionChecked) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
        </div>
      </div>
    );
  }

  return (
    <Can I="update" a="News" fallback={
      <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Access Denied
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don&apos;t have permission to edit this news article.
          </p>
          <button
            onClick={() => router.push(`/news/${news.id}`)}
            className="inline-flex items-center px-4 py-2 bg-gold-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-gold-700"
          >
            Back to Article
          </button>
        </div>
      </div>
    }>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        {/* Archive Warning */}
        {news.isArchived && (
          <div className="mx-6 mt-6 p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Archived Article
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  This news article is currently archived. Updating it will not make it visible to users unless you unarchive it.
                </p>
              </div>
            </div>
          </div>
        )}

        <NewsForm
          initialData={news}
          isEditMode={true}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </Can>
  );
}

// Layout configuration
EditNewsPage.getLayout = (page: React.ReactNode) => (
  <MainLayout activeMenu="news">{page}</MainLayout>
);
