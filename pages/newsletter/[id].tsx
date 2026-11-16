"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import Image from "next/image";
import { toast } from "react-toastify";
import {
  HiArrowLeft,
  HiCalendar,
  HiClock,
  HiExternalLink,
  HiMail,
  HiPencil,
  HiTrash,
  HiUser,
} from "react-icons/hi";
import useAuthStore from "@/store/authStore";
import { useAbility } from "@/hooks/useAbility";
import MainLayout from "@/layouts/MainLayout";
import Can from "@/components/rbac/Can";
import {
  deleteNewsletter,
  getNewsletterById,
} from "@/services/newsletter";
import { NewsletterItem } from "@/types/newsletter";
import VideoPlayer from "@/components/news/VideoPlayer";
import ConfirmDialog from "@/components/news/ConfirmDialog";
import { NewsDetailSkeleton } from "@/components/news/LoadingSkeleton";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import demoImage from "@/public/images/users/userProfile2.png";

export default function NewsletterDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const ability = useAbility();

  const [newsletter, setNewsletter] = useState<NewsletterItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageModal, setImageModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    imageIndex: number;
  }>({ isOpen: false, imageUrl: "", imageIndex: 0 });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
  }>({ isOpen: false, title: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(url);

  const fetchNewsletterDetail = useCallback(async (newsletterId: number) => {
    if (!token) return;

    setLoading(true);
    try {
      const response = await getNewsletterById(token, newsletterId);
      setNewsletter(response.data);
    } catch (error: any) {
      console.error("Failed to fetch newsletter detail:", error);
      toast.error(error.message || "Failed to fetch newsletter details");
      if (error.message?.includes("not found")) {
        router.push("/newsletter");
      }
    } finally {
      setLoading(false);
    }
  }, [token, router]);

  useEffect(() => {
    if (!token) {
      router.push("/authentication/sign-in");
      return;
    }

    if (id && typeof id === "string") {
      fetchNewsletterDetail(Number(id));
    }
  }, [token, router, id, fetchNewsletterDetail]);

  const handleDelete = () => {
    if (!newsletter) return;
    setConfirmDialog({ isOpen: true, title: newsletter.title });
  };

  const confirmDelete = async () => {
    if (!token || !newsletter) return;

    setActionLoading(true);
    try {
      await deleteNewsletter(token, newsletter.id);
      toast.success("Newsletter deleted successfully");
      router.push("/newsletter");
    } catch (error: any) {
      toast.error(error.message || "Action failed");
    } finally {
      setActionLoading(false);
      setConfirmDialog({ isOpen: false, title: "" });
    }
  };

  const openImageModal = (imageUrl: string, imageIndex: number) => {
    setImageModal({ isOpen: true, imageUrl, imageIndex });
  };

  const closeImageModal = () => {
    setImageModal({ isOpen: false, imageUrl: "", imageIndex: 0 });
  };

  const navigateImage = (direction: "prev" | "next") => {
    if (!newsletter?.photoUrls) return;

    const validUrls = newsletter.photoUrls.filter(
      (url) => url && url.trim() && isImageUrl(url),
    );

    const currentIndex = imageModal.imageIndex;
    const newIndex =
      direction === "prev"
        ? currentIndex > 0
          ? currentIndex - 1
          : validUrls.length - 1
        : currentIndex < validUrls.length - 1
          ? currentIndex + 1
          : 0;

    setImageModal({
      isOpen: true,
      imageUrl: validUrls[newIndex],
      imageIndex: newIndex,
    });
  };

  if (loading) {
    return <NewsDetailSkeleton />;
  }

  if (!newsletter) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Newsletter Not Found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The requested newsletter could not be found.
        </p>
        <Link
          href="/newsletter"
          className="inline-flex items-center px-4 py-2 bg-gold-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-gold-700"
        >
          {/* @ts-ignore */}
          <HiArrowLeft className="h-4 w-4 mr-1" />
          Back to Newsletters
        </Link>
      </div>
    );
  }

  const canManageNewsletter = ability?.can("manage", "Newsletter") ?? false;
  const isOwner = user && String(user.id) === String(newsletter.authorId);
  const canDelete = isOwner;
  const canEdit =
    (isOwner && newsletter.status === "PENDING") ||
    (canManageNewsletter && newsletter.status === "PUBLISHED");
  const statusLabel = newsletter.status === "PENDING" ? "Scheduled" : "Published";
  const validMediaUrls = newsletter.photoUrls
    ? newsletter.photoUrls.filter((url) => url && url.trim())
    : [];
  const imageUrls = validMediaUrls.filter((url) => isImageUrl(url));
  const documentUrls = validMediaUrls.filter((url) => !isImageUrl(url));
  const videoUrls = (newsletter.videoUrls || []).filter((url) => url && url.trim());
  const articleUrls = (newsletter.articleUrls || []).filter((url) => url && url.trim());

  return (
    <>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/newsletter")}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            {/* @ts-ignore */}
            <HiArrowLeft className="h-5 w-5 mr-1" />
            Back to Newsletters
          </button>

          <div className="inline-flex items-center gap-2">
            {canEdit && (
              <Can I="update" a="Newsletter">
                <Link
                  href={`/newsletter/${newsletter.id}/edit`}
                  className="inline-flex items-center px-3 py-2 border border-blue-600 rounded-lg text-sm font-medium text-blue-600 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors"
                >
                  {/* @ts-ignore */}
                  <HiPencil className="h-4 w-4 mr-1" />
                  Edit
                </Link>
              </Can>
            )}

            {canDelete && (
              <Can I="delete" a="Newsletter">
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-3 py-2 border border-red-600 rounded-lg text-sm font-medium text-red-600 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900 transition-colors"
                >
                  {/* @ts-ignore */}
                  <HiTrash className="h-4 w-4 mr-1" />
                  Delete
                </button>
              </Can>
            )}
          </div>
        </div>

        <article className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="mb-4 flex items-center gap-3">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  newsletter.status === "PENDING"
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                }`}
              >
                {newsletter.status === "PENDING" ? "Scheduled" : "Published"}
              </span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {newsletter.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                {/* @ts-ignore */}
                <HiUser className="h-4 w-4 mr-1" />
                <span>{newsletter.author.name}</span>
              </div>

              <div className="flex items-center">
                {/* @ts-ignore */}
                <HiCalendar className="h-4 w-4 mr-1" />
                <span>{statusLabel} {formatDateAndTime(newsletter.publishedAt)}</span>
              </div>

              <div className="flex items-center">
                {/* @ts-ignore */}
                <HiClock className="h-4 w-4 mr-1" />
                <span>Created {formatDateAndTime(newsletter.createdAt)}</span>
              </div>

              {newsletter.updatedAt !== newsletter.createdAt && (
                <div className="flex items-center">
                  {/* @ts-ignore */}
                  <HiClock className="h-4 w-4 mr-1" />
                  <span>Updated {formatDateAndTime(newsletter.updatedAt)}</span>
                </div>
              )}
            </div>

         
          </div>

          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            {imageUrls.length > 0 ? (
              <div
                className={`grid gap-4 ${
                  imageUrls.length === 1
                    ? "grid-cols-1"
                    : imageUrls.length === 2
                      ? "grid-cols-2"
                      : "grid-cols-2 md:grid-cols-3"
                }`}
              >
                {imageUrls.map((url, index) => (
                  <div
                    key={index}
                    className="relative group cursor-pointer"
                    onClick={() => openImageModal(url, index)}
                  >
                    <Image
                      src={url}
                      alt={`Newsletter image ${index + 1}`}
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No images available
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {documentUrls.length > 0 && (
              <div className={`${imageUrls.length > 0 ? "mt-6" : ""}`}>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Documents
                </h3>
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
                        {url.split("/").pop() || `Document ${index + 1}`}
                      </span>
                      {/* @ts-ignore */}
                      <HiExternalLink className="w-4 h-4 text-gold-600 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {videoUrls.length > 0 && (
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Video Content
              </h3>
              <div className="space-y-4">
                {videoUrls.map((url, index) => (
                  <VideoPlayer
                    key={index}
                    url={url}
                    title={`${newsletter.title} - Video ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          {articleUrls.length > 0 && (
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Article URLs
              </h3>
              <div className="space-y-2">
                {articleUrls.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-200 break-all pr-3">
                      {url}
                    </span>
                    {/* @ts-ignore */}
                    <HiExternalLink className="w-4 h-4 text-gold-600 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Content
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-5">
              <div className="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 min-h-[100px]">
                <div
                  className="max-w-none p-3 text-gray-700 dark:text-gray-300"
                  dangerouslySetInnerHTML={{ __html: newsletter.content || "" }}
                />
              </div>
            </div>
          </div>
        </article>

        <div className="mt-8 bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            About the Author
          </h3>
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <Image
                src={demoImage}
                alt={newsletter.author.name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full"
              />
            </div>
            <div className="flex-1">
              <h4 className="text-base font-medium text-gray-900 dark:text-white">
                {newsletter.author.name}
              </h4>
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                {/* @ts-ignore */}
                <HiMail className="h-4 w-4 mr-1" />
                <a
                  href={`mailto:${newsletter.author.email}`}
                  className="hover:text-gold-600 transition-colors"
                >
                  {newsletter.author.email}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {imageModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90">
          <div className="flex items-center justify-center w-full h-full p-4 relative z-10">
            <Image
              src={imageModal.imageUrl}
              alt={`Newsletter image ${imageModal.imageIndex + 1}`}
              width={1200}
              height={800}
              className="max-w-full max-h-full object-contain"
              style={{
                maxWidth: "calc(100vw - 2rem)",
                maxHeight: "calc(100vh - 2rem)",
              }}
            />
          </div>

          <div className="fixed inset-0 z-20 pointer-events-none">
            <button
              onClick={closeImageModal}
              className="fixed top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all backdrop-blur-sm pointer-events-auto"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {imageUrls.length > 1 && (
              <>
                <button
                  onClick={() => navigateImage("prev")}
                  className="fixed left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all backdrop-blur-sm pointer-events-auto"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => navigateImage("next")}
                  className="fixed right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all backdrop-blur-sm pointer-events-auto"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </>
            )}

            {imageUrls.length > 1 && (
              <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white bg-opacity-20 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
                {imageModal.imageIndex + 1} / {imageUrls.length}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, title: "" })}
        onConfirm={confirmDelete}
        loading={actionLoading}
        title="Delete Newsletter"
        message={`Are you sure you want to delete "${confirmDialog.title}"? This action cannot be undone.`}
        confirmText="Delete"
        type="danger"
      />
    </>
  );
}

NewsletterDetailPage.getLayout = (page: React.ReactNode) => (
  <MainLayout activeMenu="newsletter">{page}</MainLayout>
);
