"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import useAuthStore from '@/store/authStore';
import MainLayout from '@/layouts/MainLayout';
import Can from '@/components/rbac/Can';
import NewsletterForm from '@/components/newsletter/NewsletterForm';
import { NewsletterItem } from '@/types/newsletter';

export default function CreateNewsletterPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!token) {
      router.push('/authentication/sign-in');
      return;
    }
  }, [token, router]);

  const handleSuccess = (newsletterItem: NewsletterItem) => {
    router.push('/newsletter');
  };

  const handleCancel = () => {
    router.push('/newsletter');
  };

  if (!token) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <Can I="create" a="Newsletter" fallback={
      <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Access Denied
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            You don&apos;t have permission to create newsletters.
          </p>
        </div>
      </div>
    }>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <NewsletterForm
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </div>
    </Can>
  );
}

// Layout configuration
CreateNewsletterPage.getLayout = (page: React.ReactNode) => (
  <MainLayout activeMenu="newsletter">{page}</MainLayout>
);
