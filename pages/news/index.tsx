"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { HiPlus, HiNewspaper, HiSearch } from 'react-icons/hi';
import useAuthStore from '@/store/authStore';
import MainLayout from '@/layouts/MainLayout';
import Can from '@/components/rbac/Can';
import Pagination from '@/components/common/Pagination';
import { getAllNews, deleteNews, toggleArchiveNews } from '@/services/news';
import { NewsItem, NewsPaginationMeta } from '@/types/news';
import NewsCard from '@/components/news/NewsCard';
import SearchFilter from '@/components/news/SearchFilter';
import LoadingSkeleton from '@/components/news/LoadingSkeleton';
import ConfirmDialog from '@/components/news/ConfirmDialog';
import { formatDateAndTime } from '@/utils/formatDateAndTime';

const ITEMS_PER_PAGE = 10;

export default function NewsPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<NewsPaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isArchived, setIsArchived] = useState(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedTab, setSelectedTab] = useState<'all' | 'my'>('all');

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'delete' | 'archive' | 'unarchive';
    newsId: number | null;
    title: string;
  }>({ isOpen: false, type: 'delete', newsId: null, title: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/authentication/sign-in');
      return;
    }
    fetchNews();
  }, [token, router, currentPage, searchTerm, isArchived, sortOrder]);

  const fetchNews = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await getAllNews(token, {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        isArchived,
        searchTerm: searchTerm.length >= 3 ? searchTerm : undefined,
        sort: sortOrder,
      });

      setNews(response.data);
      setPagination(response.pagination || null);
    } catch (error: any) {
      console.error('Failed to fetch news:', error);
      toast.error(error.message || 'Failed to fetch news items');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleArchivedChange = (archived: boolean) => {
    setIsArchived(archived);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: 'newest' | 'oldest') => {
    setSortOrder(sort);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleEdit = (id: number) => {
    router.push(`/news/${id}/edit`);
  };

  const handleDelete = (id: number) => {
    const newsItem = news.find(n => n.id === id);
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      newsId: id,
      title: newsItem?.title || 'Unknown',
    });
  };

  const handleToggleArchive = (id: number, shouldArchive: boolean) => {
    const newsItem = news.find(n => n.id === id);
    setConfirmDialog({
      isOpen: true,
      type: shouldArchive ? 'archive' : 'unarchive',
      newsId: id,
      title: newsItem?.title || 'Unknown',
    });
  };

  const confirmAction = async () => {
    if (!token || !confirmDialog.newsId) return;

    setActionLoading(true);
    try {
      if (confirmDialog.type === 'delete') {
        await deleteNews(token, confirmDialog.newsId);
        toast.success('News item deleted successfully');
      } else {
        const shouldArchive = confirmDialog.type === 'archive';
        await toggleArchiveNews(token, confirmDialog.newsId, shouldArchive);
        toast.success(`News item ${shouldArchive ? 'archived' : 'unarchived'} successfully`);
      }

      // Refresh the list
      await fetchNews();
    } catch (error: any) {
      console.error('Action failed:', error);
      toast.error(error.message || 'Action failed');
    } finally {
      setActionLoading(false);
      setConfirmDialog({ isOpen: false, type: 'delete', newsId: null, title: '' });
    }
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

  return (
    <>
      <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gold-100 dark:bg-gold-900 rounded-lg">
              {/* @ts-ignore */}
              <HiNewspaper className="h-6 w-6 text-gold-600 dark:text-gold-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                News & Announcements Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage and browse News & Announcements
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Tab Navigation */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => {
                  setSelectedTab('all');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${selectedTab === 'all'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                All News & Announcements
              </button>
              <Link
                href="/news/my"
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${selectedTab === 'my'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                My News & Announcements
              </Link>
            </div>

            {/* Create Button */}
            <Can I="create" a="News">
              <Link
                href="/news/create"
                className="inline-flex items-center px-4 py-2 bg-gold-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-gold-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 transition-colors"
              >
                {/* @ts-ignore */}
                <HiPlus className="h-4 w-4 mr-1" />
                Create News & Announcements
              </Link>
            </Can>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <SearchFilter
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            isArchived={isArchived}
            onArchivedChange={handleArchivedChange}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
            showSortFilter={true}
            showArchiveFilter={false}
            placeholder="Search news & announcements by title or content (min 3 characters)..."
          />
        </div>

        {/* Stats */}
        {pagination && (
          <div className="mb-6 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, pagination.totalItems)} of {pagination.totalItems} news items
            </div>
            <div className="flex items-center space-x-4">
              <span>Page {currentPage} of {pagination.totalPages}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && <LoadingSkeleton count={6} variant="card" />}

        {/* Empty State */}
        {!loading && news.length === 0 && (
          <div className="text-center py-12">
            {/* @ts-ignore */}
            <HiNewspaper className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No news found' : isArchived ? 'No archived news' : 'No news available'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchTerm
                ? 'Try adjusting your search terms or filters'
                : isArchived
                  ? 'There are no archived news items yet'
                  : 'Get started by creating your first news article'}
            </p>
            {!searchTerm && !isArchived && (
              <Can I="create" a="News">
                <Link
                  href="/news/create"
                  className="inline-flex items-center px-4 py-2 bg-gold-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-gold-700"
                >
                  {/* @ts-ignore */}
                  <HiPlus className="h-4 w-4 mr-1" />
                  Create First News & Announcements
                </Link>
              </Can>
            )}
          </div>
        )}

        {/* News Grid */}
        {!loading && user && news.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {news.map((newsItem) => (
              <NewsCard
                key={newsItem.id}
                news={newsItem}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleArchive={handleToggleArchive}
                showActions={String(user.id) === String(newsItem.authorId)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            isLoading={loading}
            onPageChange={handlePageChange}
          />
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'delete', newsId: null, title: '' })}
        onConfirm={confirmAction}
        loading={actionLoading}
        {...getConfirmDialogProps()}
      />
    </>
  );
}

// Layout configuration
NewsPage.getLayout = (page: React.ReactNode) => (
  <MainLayout activeMenu="news">{page}</MainLayout>
);
