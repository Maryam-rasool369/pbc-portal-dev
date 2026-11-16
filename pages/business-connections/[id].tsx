"use client";

import Head from "next/head";
import Link from "next/link"; // Added Next.js Link
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { HiArrowLeft, HiTrash } from "react-icons/hi";
import {
  AttachmentList,
  BusinessConnectionSummary,
  getCounterparty,
  natureBadgeClass,
  natureLabel,
} from "@/components/business-connections/BusinessConnectionHelpers";
import {
  deleteBusinessConnection,
  deleteBusinessConnectionAttachment,
  fetchBusinessConnectionById,
} from "@/services/businessConnections";
import useAuthStore from "@/store/authStore";
import { BusinessConnection, BusinessConnectionAttachment } from "@/types/businessConnection";
import { useAbility } from "@/hooks/useAbility";

const IconArrowLeft = HiArrowLeft as any;
const IconTrash = HiTrash as any;

export default function BusinessConnectionDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const ability = useAbility();
  const [connection, setConnection] = useState<BusinessConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);

  useEffect(() => {
    const loadConnection = async () => {
      if (!token || token === "undefined" || !id) return;
      setLoading(true);
      try {
        setConnection(await fetchBusinessConnectionById(token, String(id)));
      } catch (error: any) {
        toast.error(error?.message || "Failed to fetch business connection");
        router.push("/business-connections");
      } finally {
        setLoading(false);
      }
    };
    loadConnection();
  }, [token, id, router]);

  const isOwner = connection && String(connection.userId) === String(user?.id);
  const canManageBusinessConnection = isOwner || ability?.can("manage", "BusinessConnection");

  const handleDeleteAttachment = async (attachment: BusinessConnectionAttachment) => {
    if (!token) return;

    const confirmed = window.confirm("Delete this attachment?");
    if (!confirmed) return;

    try {
      setDeletingAttachmentId(attachment.id);
      await deleteBusinessConnectionAttachment(token, connection!.id, attachment.id);
      toast.success("Attachment deleted successfully");
      // Refresh connection data
      setConnection(await fetchBusinessConnectionById(token, String(id)));
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete attachment");
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  return (
    <>
      <Head>
        <title>Business Connection Details | PBC</title>
      </Head>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => router.push("/business-connections")}
            className="inline-flex w-fit items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <IconArrowLeft className="h-4 w-4" />
            Back
          </button>
          {canManageBusinessConnection && connection && (
            <button
              type="button"
              onClick={async () => {
                const confirmed = window.confirm(
                  "Delete this business connection? This will also remove its attachments.",
                );
                if (!confirmed) return;

                if (!token) return;

                try {
                  await deleteBusinessConnection(token, connection.id);
                  toast.success("Business connection deleted successfully");
                  router.push("/business-connections");
                } catch (error: any) {
                  toast.error(error?.message || "Failed to delete business connection");
                }
              }}
              className="inline-flex w-fit items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              <IconTrash className="h-4 w-4" />
              Delete Connection
            </button>
          )}
        </div>

        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            Loading connection details...
          </div>
        ) : connection ? (
          <>
            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Business Connection
                  </h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Created by {connection.user?.name || "Unknown"}
                  </p>
                </div>
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${natureBadgeClass[connection.natureOfBusiness]
                    }`}
                >
                  {natureLabel[connection.natureOfBusiness]}
                </span>
              </div>
              <BusinessConnectionSummary connection={connection} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Counterparty Card */}
              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {getCounterparty(connection).type}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                  {connection.connectedUser?.id ? (
                    <Link
                      href={`/users/${connection.connectedUser.id}`}
                      className="text-gold-600 dark:text-gold-400 hover:underline"
                    >
                      {getCounterparty(connection).name}
                    </Link>
                  ) : (
                    getCounterparty(connection).name
                  )}
                </h2>
                <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                  {getCounterparty(connection).companyName}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Nature of Business
                </p>
                <span
                  className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${natureBadgeClass[connection.natureOfBusiness]
                    }`}
                >
                  {natureLabel[connection.natureOfBusiness]}
                </span>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Created By
                </p>
                <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                  {connection.user?.name || "Unknown"}
                </h2>
                <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                  {connection.user?.membership?.companyName || "Not specified"}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                Description
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700 dark:text-gray-300">
                {connection.description}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Attachments
              </h2>
              <AttachmentList 
                attachments={connection.attachments || []} 
                onDelete={canManageBusinessConnection ? handleDeleteAttachment : undefined}
                deletingId={deletingAttachmentId}
              />
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
