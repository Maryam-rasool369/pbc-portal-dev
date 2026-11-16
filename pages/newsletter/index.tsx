"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { HiPlus, HiNewspaper } from 'react-icons/hi';
import useAuthStore from '@/store/authStore';
import MainLayout from '@/layouts/MainLayout';
import Can from '@/components/rbac/Can';
import Pagination from '@/components/common/Pagination';
import { deleteNewsletter, getAllPublishedNewsletters } from '@/services/newsletter';
import { NewsletterItem, NewsletterPaginationMeta } from '@/types/newsletter';
import NewsletterCard from '@/components/newsletter/NewsletterCard';
import SearchFilter from '@/components/news/SearchFilter';
import LoadingSkeleton from '@/components/news/LoadingSkeleton';
import ConfirmDialog from '@/components/news/ConfirmDialog';

const ITEMS_PER_PAGE = 10;

export default function NewsletterPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  
  const [newsletters, setNewsletters] = useState<NewsletterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<NewsletterPaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'my'>('all');
  
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    newsletterId: number | null;
    title: string;
  }>({ isOpen: false, newsletterId: null, title: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNewsletters = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await getAllPublishedNewsletters(token, {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        searchTerm: searchTerm.length >= 3 ? searchTerm : undefined,
      });
      
      setNewsletters(response.data);
      setPagination(response.pagination || null);
    } catch (error: any) {
      console.error('Failed to fetch newsletters:', error);
      toast.error(error.message || 'Failed to fetch newsletter items');
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, searchTerm]);

  useEffect(() => {
    if (!token) {
      router.push('/authentication/sign-in');
      return;
    }
    fetchNewsletters();
  }, [token, router, fetchNewsletters]);

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDelete = (id: number) => {
    const newsletter = newsletters.find((item) => item.id === id);
    setConfirmDialog({
      isOpen: true,
      newsletterId: id,
      title: newsletter?.title || 'Unknown',
    });
  };

  const confirmAction = async () => {
    if (!token || !confirmDialog.newsletterId) return;
    
    setActionLoading(true);
    try {
      await deleteNewsletter(token, confirmDialog.newsletterId);
      toast.success('Newsletter deleted successfully');
      await fetchNewsletters();
    } catch (error: any) {
      console.error('Action failed:', error);
      toast.error(error.message || 'Action failed');
    } finally {
      setActionLoading(false);
      setConfirmDialog({ isOpen: false, newsletterId: null, title: '' });
    }
  };

  const getConfirmDialogProps = () => {
    return {
      title: 'Delete Newsletter',
      message: `Are you sure you want to delete "${confirmDialog.title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger' as const,
    };
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
                Newsletter Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage and browse newsletters
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
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  selectedTab === 'all'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                All Newsletters
              </button>
              <Link
                href="/newsletter/my"
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  selectedTab === 'my'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                My Newsletters
              </Link>
            </div>

            {/* Create Button */}
            <Can I="create" a="Newsletter">
              <Link
                href="/newsletter/create"
                className="inline-flex items-center px-4 py-2 bg-gold-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-gold-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 transition-colors"
              >
                {/* @ts-ignore */}
                <HiPlus className="h-4 w-4 mr-1" />
                Create Newsletter
              </Link>
            </Can>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <SearchFilter
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            showArchiveFilter={false}
            placeholder="Search newsletters by title or content (min 3 characters)..."
          />
        </div>

        {/* Stats */}
        {pagination && (
          <div className="mb-6 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, pagination.totalItems)} of {pagination.totalItems} newsletter items
            </div>
            <div className="flex items-center space-x-4">
              <span>Page {currentPage} of {pagination.totalPages}</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && <LoadingSkeleton count={6} variant="card" />}

        {/* Empty State */}
        {!loading && newsletters.length === 0 && (
          <div className="text-center py-12">
            {/* @ts-ignore */}
            <HiNewspaper className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No newsletters found' : 'No newsletters available'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchTerm ? 'Try adjusting your search terms or filters' : 'Get started by creating your first newsletter'}
            </p>
            {!searchTerm && (
              <Can I="create" a="Newsletter">
                <Link
                  href="/newsletter/create"
                  className="inline-flex items-center px-4 py-2 bg-gold-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-gold-700"
                >
                  {/* @ts-ignore */}
                  <HiPlus className="h-4 w-4 mr-1" />
                  Create First Newsletter
                </Link>
              </Can>
            )}
          </div>
        )}

        {!loading && user && newsletters.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {newsletters.map((newsletter) => (
              <NewsletterCard
                key={newsletter.id}
                newsletter={newsletter}
                onDelete={handleDelete}
                showActions={String(user.id) === String(newsletter.authorId)}
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
        onClose={() => setConfirmDialog({ isOpen: false, newsletterId: null, title: '' })}
        onConfirm={confirmAction}
        loading={actionLoading}
        {...getConfirmDialogProps()}
      />
    </>
  );
}

// Layout configuration
NewsletterPage.getLayout = (page: React.ReactNode) => (
  <MainLayout activeMenu="newsletter">{page}</MainLayout>
);
