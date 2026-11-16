"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import MainLayout from "@/layouts/MainLayout";
import useAuthStore from "@/store/authStore";
import { useAbility } from "@/hooks/useAbility";
import Can from "@/components/rbac/Can";
import NewsletterForm from "@/components/newsletter/NewsletterForm";
import { getNewsletterById } from "@/services/newsletter";
import { NewsletterItem } from "@/types/newsletter";

export default function EditNewsletterPage() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const ability = useAbility();

  const [loading, setLoading] = useState(true);
  const [newsletter, setNewsletter] = useState<NewsletterItem | null>(null);

  useEffect(() => {
    if (!token) {
      router.push("/authentication/sign-in");
      return;
    }

    const fetchNewsletter = async () => {
      if (!id || typeof id !== "string") {
        return;
      }

      setLoading(true);
      try {
        const response = await getNewsletterById(token, Number(id));
        setNewsletter(response.data);
      } catch {
        setNewsletter(null);
      } finally {
        setLoading(false);
      }
    };

    fetchNewsletter();
  }, [token, router, id]);

  if (!token || loading) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <div className="text-center py-12 text-gray-600 dark:text-gray-300">
          Loading newsletter...
        </div>
      </div>
    );
  }

  if (!newsletter) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Newsletter Not Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The requested newsletter could not be loaded.
          </p>
          <button
            onClick={() => router.push("/newsletter")}
            className="inline-flex items-center px-4 py-2 bg-gold-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-gold-700"
          >
            Back to Newsletters
          </button>
        </div>
      </div>
    );
  }

  const canManageNewsletter = ability?.can("manage", "Newsletter") ?? false;
  const isOwner = user && String(user.id) === String(newsletter.authorId);
  const canEdit = (isOwner && newsletter.status === "PENDING") || canManageNewsletter;

  if (!canEdit) {
    return (
      <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Editing Not Allowed
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You do not have permission to edit this newsletter.
          </p>
          <button
            onClick={() => router.push(`/newsletter/${newsletter.id}`)}
            className="inline-flex items-center px-4 py-2 bg-gold-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-gold-700"
          >
            Back to Newsletter
          </button>
        </div>
      </div>
    );
  }

  return (
    <Can
      I="update"
      a="Newsletter"
      fallback={
        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Access Denied
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              You don&apos;t have permission to edit newsletters.
            </p>
          </div>
        </div>
      }
    >
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
        <NewsletterForm
          mode="edit"
          newsletterId={newsletter.id}
          initialData={newsletter}
          onSuccess={(updated) => router.push(`/newsletter/${updated.id}`)}
          onCancel={() => router.push(`/newsletter/${newsletter.id}`)}
        />
      </div>
    </Can>
  );
}

EditNewsletterPage.getLayout = (page: React.ReactNode) => (
  <MainLayout activeMenu="newsletter">{page}</MainLayout>
);
