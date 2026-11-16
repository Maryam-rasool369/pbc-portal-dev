"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { HiPlus, HiNewspaper, HiArchive } from 'react-icons/hi';
import useAuthStore from '@/store/authStore';
import MainLayout from '@/layouts/MainLayout';
import Can from '@/components/rbac/Can';
import Pagination from '@/components/common/Pagination';
import { getMyNews, deleteNews, toggleArchiveNews } from '@/services/news';
import { NewsItem, NewsPaginationMeta } from '@/types/news';
import NewsCard from '@/components/news/NewsCard';
import SearchFilter from '@/components/news/SearchFilter';
import LoadingSkeleton from '@/components/news/LoadingSkeleton';
import ConfirmDialog from '@/components/news/ConfirmDialog';
import { formatDateAndTime } from '@/utils/formatDateAndTime';

const ITEMS_PER_PAGE = 10;

export default function MyNewsPage() {
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
  const [selectedNews, setSelectedNews] = useState<number[]>([]);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'delete' | 'archive' | 'unarchive' | 'bulkDelete' | 'bulkArchive';
    newsId: number | null;
    title: string;
  }>({ isOpen: false, type: 'delete', newsId: null, title: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/authentication/sign-in');
      return;
    }
    fetchMyNews();
  }, [token, router, currentPage, searchTerm, isArchived, sortOrder]);

  const fetchMyNews = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await getMyNews(token, {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        isArchived,
        searchTerm: searchTerm.length >= 3 ? searchTerm : undefined,
        sort: sortOrder,
      });

      setNews(response.data);
      setPagination(response.pagination || null);
    } catch (error: any) {
      console.error('Failed to fetch my news:', error);
      toast.error(error.message || 'Failed to fetch your news items');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
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
    setSelectedNews([]); // Clear selections on page change
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

  const handleBulkDelete = () => {
    if (selectedNews.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      type: 'bulkDelete',
      newsId: null,
      title: `${selectedNews.length} items`,
    });
  };

  const handleBulkArchive = () => {
    if (selectedNews.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      type: 'bulkArchive',
      newsId: null,
      title: `${selectedNews.length} items`,
    });
  };

  const toggleNewsSelection = (id: number) => {
    setSelectedNews(prev =>
      prev.includes(id)
        ? prev.filter(nId => nId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedNews.length === news.length) {
      setSelectedNews([]);
    } else {
      setSelectedNews(news.map(n => n.id));
    }
  };

  const confirmAction = async () => {
    if (!token) return;

    setActionLoading(true);
    try {
      if (confirmDialog.type === 'delete' && confirmDialog.newsId) {
        await deleteNews(token, confirmDialog.newsId);
        toast.success('News item deleted successfully');
      } else if (confirmDialog.type === 'archive' && confirmDialog.newsId) {
        await toggleArchiveNews(token, confirmDialog.newsId, true);
        toast.success('News item archived successfully');
      } else if (confirmDialog.type === 'unarchive' && confirmDialog.newsId) {
        await toggleArchiveNews(token, confirmDialog.newsId, false);
        toast.success('News item unarchived successfully');
      } else if (confirmDialog.type === 'bulkDelete') {
        await Promise.all(selectedNews.map(id => deleteNews(token, id)));
        toast.success(`${selectedNews.length} news items deleted successfully`);
        setSelectedNews([]);
      } else if (confirmDialog.type === 'bulkArchive') {
        await Promise.all(selectedNews.map(id => toggleArchiveNews(token, id, !isArchived)));
        toast.success(`${selectedNews.length} news items ${isArchived ? 'unarchived' : 'archived'} successfully`);
        setSelectedNews([]);
      }

      await fetchMyNews();
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
      case 'bulkDelete':
        return {
          title: 'Delete News Items',
          message: `Are you sure you want to delete ${confirmDialog.title}? This action cannot be undone.`,
          confirmText: 'Delete All',
          type: 'danger' as const,
        };
      case 'archive':
        return {
          title: 'Archive News Item',
          message: `Are you sure you want to archive "${confirmDialog.title}"?`,
          confirmText: 'Archive',
          type: 'warning' as const,
        };
      case 'bulkArchive':
        return {
          title: `${isArchived ? 'Unarchive' : 'Archive'} News Items`,
          message: `Are you sure you want to ${isArchived ? 'unarchive' : 'archive'} ${confirmDialog.title}?`,
          confirmText: isArchived ? 'Unarchive All' : 'Archive All',
          type: 'warning' as const,
        };
      case 'unarchive':
        return {
          title: 'Unarchive News Item',
          message: `Are you sure you want to unarchive "${confirmDialog.title}"?`,
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
                My News & Announcements
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your news & announcements articles
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Tab Navigation */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <Link
                href="/news"
                className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                All News & Announcements
              </Link>
              <button
                className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
              >
                My News & Announcements
              </button>
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
            showArchiveFilter={true}
            placeholder="Search your news & announcements articles by title or content (min 3 characters)..."
          />
        </div>

        {/* Bulk Actions */}
        {news.length > 0 && (
          <div className="mb-6 flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedNews.length === news.length && news.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Select all ({selectedNews.length} selected)
                </span>
              </label>
            </div>

            {selectedNews.length > 0 && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleBulkArchive}
                  className="inline-flex items-center px-3 py-1.5 border border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-600 rounded-md text-sm font-medium transition-colors"
                >
                  {/* @ts-ignore */}
                  <HiArchive className="h-4 w-4 mr-1" />
                  {isArchived ? 'Unarchive' : 'Archive'} ({selectedNews.length})
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="inline-flex items-center px-3 py-1.5 border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:text-red-300 dark:border-red-600 rounded-md text-sm font-medium transition-colors"
                >
                  Delete ({selectedNews.length})
                </button>
              </div>
            )}
          </div>
        )}

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
              {searchTerm ? 'No news found' : isArchived ? 'No archived news' : 'No news created yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchTerm
                ? 'Try adjusting your search terms'
                : isArchived
                  ? 'You have not archived any news items yet'
                  : 'Start creating news articles to share with the community'}
            </p>
            {!searchTerm && !isArchived && (
              <Can I="create" a="News">
                <Link
                  href="/news/create"
                  className="inline-flex items-center px-4 py-2 bg-gold-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-gold-700"
                >
                  {/* @ts-ignore */}
                  <HiPlus className="h-4 w-4 mr-1" />
                  Create Your First News & Announcement
                </Link>
              </Can>
            )}
          </div>
        )}

        {/* News Grid */}
        {!loading && news.length > 0 && (
          <div className="space-y-6 mb-8">
            {news.map((newsItem) => (
              <div key={newsItem.id} className="flex items-start space-x-4">
                <input
                  type="checkbox"
                  checked={selectedNews.includes(newsItem.id)}
                  onChange={() => toggleNewsSelection(newsItem.id)}
                  className="mt-4 h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <div className="flex-1">
                  <NewsCard
                    news={newsItem}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleArchive={handleToggleArchive}
                    showActions={true}
                  />
                </div>
              </div>
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
MyNewsPage.getLayout = (page: React.ReactNode) => (
  <MainLayout activeMenu="news">{page}</MainLayout>
);
