"use client";

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { HiPlus, HiNewspaper } from 'react-icons/hi';
import useAuthStore from '@/store/authStore';
import MainLayout from '@/layouts/MainLayout';
import Can from '@/components/rbac/Can';
import Pagination from '@/components/common/Pagination';
import { deleteNewsletter, getMyAllNewsletters } from '@/services/newsletter';
import { NewsletterItem, NewsletterPaginationMeta } from '@/types/newsletter';
import NewsletterCard from '@/components/newsletter/NewsletterCard';
import SearchFilter from '@/components/news/SearchFilter';
import LoadingSkeleton from '@/components/news/LoadingSkeleton';
import ConfirmDialog from '@/components/news/ConfirmDialog';

const ITEMS_PER_PAGE = 10;

export default function MyNewsletterPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  
  const [newsletters, setNewsletters] = useState<NewsletterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<NewsletterPaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNewsletters, setSelectedNewsletters] = useState<number[]>([]);
  
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'delete' | 'bulkDelete';
    newsletterId: number | null;
    title: string;
  }>({ isOpen: false, type: 'delete', newsletterId: null, title: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMyNews = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await getMyAllNewsletters(token, {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        searchTerm: searchTerm.length >= 3 ? searchTerm : undefined,
      });
      
      setNewsletters(response.data);
      setPagination(response.pagination || null);
    } catch (error: any) {
      console.error('Failed to fetch my newsletters:', error);
      toast.error(error.message || 'Failed to fetch your newsletter items');
    } finally {
      setLoading(false);
    }
  }, [token, currentPage, searchTerm]);

  useEffect(() => {
    if (!token) {
      router.push('/authentication/sign-in');
      return;
    }
    fetchMyNews();
  }, [token, router, fetchMyNews]);

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSelectedNewsletters([]);
  };

  const handleDelete = (id: number) => {
    const newsletter = newsletters.find((item) => item.id === id);
    setConfirmDialog({
      isOpen: true,
      type: 'delete',
      newsletterId: id,
      title: newsletter?.title || 'Unknown',
    });
  };

  const handleBulkDelete = () => {
    if (selectedNewsletters.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      type: 'bulkDelete',
      newsletterId: null,
      title: `${selectedNewsletters.length} items`,
    });
  };

  const toggleNewsletterSelection = (id: number) => {
    setSelectedNewsletters((prev) =>
      prev.includes(id) 
        ? prev.filter((newsletterId) => newsletterId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedNewsletters.length === newsletters.length) {
      setSelectedNewsletters([]);
    } else {
      setSelectedNewsletters(newsletters.map((newsletter) => newsletter.id));
    }
  };

  const confirmAction = async () => {
    if (!token) return;
    
    setActionLoading(true);
    try {
      if (confirmDialog.type === 'delete' && confirmDialog.newsletterId) {
        await deleteNewsletter(token, confirmDialog.newsletterId);
        toast.success('Newsletter item deleted successfully');
      } else if (confirmDialog.type === 'bulkDelete') {
        await Promise.all(
          selectedNewsletters.map((id) => deleteNewsletter(token, id)),
        );
        toast.success(`${selectedNewsletters.length} newsletter items deleted successfully`);
        setSelectedNewsletters([]);
      }
      
      await fetchMyNews();
    } catch (error: any) {
      console.error('Action failed:', error);
      toast.error(error.message || 'Action failed');
    } finally {
      setActionLoading(false);
      setConfirmDialog({ isOpen: false, type: 'delete', newsletterId: null, title: '' });
    }
  };

  const getConfirmDialogProps = () => {
    switch (confirmDialog.type) {
      case 'delete':
        return {
          title: 'Delete Newsletter Item',
          message: `Are you sure you want to delete "${confirmDialog.title}"? This action cannot be undone.`,
          confirmText: 'Delete',
          type: 'danger' as const,
        };
      case 'bulkDelete':
        return {
          title: 'Delete Newsletter Items',
          message: `Are you sure you want to delete ${confirmDialog.title}? This action cannot be undone.`,
          confirmText: 'Delete All',
          type: 'danger' as const,
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
                My Newsletters
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your newsletters
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <Link
                href="/newsletter"
                className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                All Newsletters
              </Link>
              <button
                className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm"
              >
                My Newsletters
              </button>
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

        <div className="mb-6">
          <SearchFilter
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            showArchiveFilter={false}
            placeholder="Search your newsletters by title or content (min 3 characters)..."
          />
        </div>

        {newsletters.length > 0 && (
          <div className="mb-6 flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedNewsletters.length === newsletters.length && newsletters.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Select all ({selectedNewsletters.length} selected)
                </span>
              </label>
            </div>
            
            {selectedNewsletters.length > 0 && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleBulkDelete}
                  className="inline-flex items-center px-3 py-1.5 border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900 dark:text-red-300 dark:border-red-600 rounded-md text-sm font-medium transition-colors"
                >
                  Delete ({selectedNewsletters.length})
                </button>
              </div>
            )}
          </div>
        )}

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

        {loading && <LoadingSkeleton count={6} variant="card" />}

        {!loading && newsletters.length === 0 && (
          <div className="text-center py-12">
            {/* @ts-ignore */}
            <HiNewspaper className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {searchTerm ? 'No newsletters found' : 'No newsletters created yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchTerm ? 'Try adjusting your search terms' : 'Start creating newsletters to share with the community'}
            </p>
            {!searchTerm && (
              <Can I="create" a="Newsletter">
                <Link
                  href="/newsletter/create"
                  className="inline-flex items-center px-4 py-2 bg-gold-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-gold-700"
                >
                  {/* @ts-ignore */}
                  <HiPlus className="h-4 w-4 mr-1" />
                  Create Your First Newsletter
                </Link>
              </Can>
            )}
          </div>
        )}

        {!loading && newsletters.length > 0 && (
          <div className="space-y-6 mb-8">
            {newsletters.map((newsletter) => (
              <div key={newsletter.id} className="flex items-start space-x-4">
                <input
                  type="checkbox"
                  checked={selectedNewsletters.includes(newsletter.id)}
                  onChange={() => toggleNewsletterSelection(newsletter.id)}
                  className="mt-4 h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <div className="flex-1">
                  <NewsletterCard
                    newsletter={newsletter}
                    onDelete={handleDelete}
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

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'delete', newsletterId: null, title: '' })}
        onConfirm={confirmAction}
        loading={actionLoading}
        {...getConfirmDialogProps()}
      />
    </>
  );
}

// Layout configuration
MyNewsletterPage.getLayout = (page: React.ReactNode) => (
  <MainLayout activeMenu="newsletter">{page}</MainLayout>
);
