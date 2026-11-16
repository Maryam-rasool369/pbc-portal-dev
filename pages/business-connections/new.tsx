"use client";

import Head from "next/head";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import BusinessConnectionForm from "@/components/business-connections/BusinessConnectionForm";
import {
  createBusinessConnection,
  fetchBusinessConnectionMembers,
} from "@/services/businessConnections";
import useAuthStore from "@/store/authStore";
import { BusinessConnectionFormValues } from "@/types/businessConnection";
import { UserProfile } from "@/types/user";

export default function NewBusinessConnectionPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    if (!token) return;
    setSubmitting(true);
    try {
      const connection = await createBusinessConnection(token, values);
      toast.success("Business connection created successfully");
      router.push(`/business-connections/${connection.id}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to create business connection");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create Business Connection | PBC</title>
      </Head>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Create Business Connection
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Record a member or non-member business outcome with optional supporting files.
          </p>
        </div>
        <BusinessConnectionForm
          members={members}
          loadingMembers={loadingMembers}
          submitting={submitting}
          submitLabel="Create Connection"
          onSubmit={handleSubmit}
          onCancel={() => router.push("/business-connections")}
        />
      </div>
    </>
  );
}
