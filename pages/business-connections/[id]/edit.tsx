"use client";

import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import BusinessConnectionForm from "@/components/business-connections/BusinessConnectionForm";
import {
  deleteBusinessConnectionAttachment,
  fetchBusinessConnectionById,
  fetchBusinessConnectionMembers,
  updateBusinessConnection,
} from "@/services/businessConnections";
import useAuthStore from "@/store/authStore";
import {
  BusinessConnection,
  BusinessConnectionAttachment,
  BusinessConnectionFormValues,
} from "@/types/businessConnection";
import { UserProfile } from "@/types/user";
import { useAbility } from "@/hooks/useAbility";

export default function EditBusinessConnectionPage() {
  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [connection, setConnection] = useState<BusinessConnection | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<number | null>(null);
  const ability = useAbility();

  const isOwner = connection && String(connection.userId) === String(user?.id);

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

  useEffect(() => {
    loadConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  // Redirect if user doesn't have permission to edit
  useEffect(() => {
    if (connection && !isOwner && !ability?.can("manage", "BusinessConnection")) {
      toast.error("You don't have permission to edit this business connection");
      router.push(`/business-connections/${id}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, isOwner, id, router]);

  useEffect(() => {
    const loadMembers = async () => {
      if (!token || token === "undefined") return;
      setLoadingMembers(true);
      try {
        const data = await fetchBusinessConnectionMembers(token);
        setMembers(data.filter((member) => String(member.id) !== String(user?.id || "")));
      } catch (error: any) {
        toast.error(error?.message || "Failed to load members");
      } finally {
        setLoadingMembers(false);
      }
    };
    loadMembers();
  }, [token, user?.id]);

  const handleSubmit = async (values: BusinessConnectionFormValues) => {
    if (!token || !id) return;
    setSubmitting(true);
    try {
      const updated = await updateBusinessConnection(token, String(id), values);
      toast.success("Business connection updated successfully");
      router.push(`/business-connections/${updated.id}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update business connection");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAttachment = async (attachment: BusinessConnectionAttachment) => {
    if (!token || !id) return;
    setDeletingAttachmentId(attachment.id);
    try {
      await deleteBusinessConnectionAttachment(token, String(id), attachment.id);
      toast.success("Attachment deleted successfully");
      await loadConnection();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete attachment");
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  return (
    <>
      <Head>
        <title>Edit Business Connection | PBC</title>
      </Head>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Edit Business Connection
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Update details, swap member modes, overwrite attachment slots, or remove existing files.
          </p>
        </div>

        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
            Loading connection...
          </div>
        ) : connection ? (
          <BusinessConnectionForm
            initialConnection={connection}
            members={members}
            loadingMembers={loadingMembers}
            submitting={submitting}
            submitLabel="Save Changes"
            existingAttachments={connection.attachments || []}
            deletingAttachmentId={deletingAttachmentId}
            onDeleteAttachment={handleDeleteAttachment}
            onSubmit={handleSubmit}
            onCancel={() => router.push(`/business-connections/${connection.id}`)}
          />
        ) : null}
      </div>
    </>
  );
}
