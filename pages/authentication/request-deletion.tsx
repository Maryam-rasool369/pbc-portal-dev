import React from "react";
import AuthLayout from "@/layouts/AuthLayout";
import Head from "next/head";
import Link from "next/link";
import { useLoadingStore } from "@/store/useLoadingStore";
import { toast } from "react-toastify";

export default function RequestDeletion() {
  const setLoading = useLoadingStore((state) => state.setLoading);

  const handleRequestDeletion = async (requestData: { email: string }) => {
    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/request-deletion`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: requestData.email,
          }),
        },
      );
      const data = await response.json();

      if (response.ok) {
        toast.success(
          data.message || "Deletion request submitted successfully",
        );
      } else {
        toast.error(
          data.error?.[0]?.msg ||
            data.error ||
            "Failed to submit deletion request",
        );
      }
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Request Account Deletion | PBC Portal</title>
        <meta
          name="description"
          content="Request deletion of your PBC Portal account"
        />
      </Head>
      <AuthLayout heading="Request Account Deletion">
        <p className="my-6 text-base font-normal text-gray-500 dark:text-gray-400">
          To request deletion of your account, please enter your email address
          below. You will receive a confirmation email with further
          instructions.
        </p>
        <form
          className="mt-8 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const email = formData.get("email") as string;
            handleRequestDeletion({ email });
          }}
        >
          <div>
            <label
              htmlFor="email"
              className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            >
              Your email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-gold-500 focus:border-gold-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gold-500 dark:focus:border-gold-500"
              placeholder="name@company.com"
              required
            />
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="confirm"
                aria-describedby="confirm"
                name="confirm"
                type="checkbox"
                className="w-4 h-4 border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-gold-300 dark:focus:ring-gold-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                required
              />
            </div>
            <div className="ml-3 text-sm">
              <label
                htmlFor="confirm"
                className="font-medium text-gray-900 dark:text-white"
              >
                I understand this action will initiate the process to delete my
                account
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full px-5 py-3 text-base font-medium text-center text-white rounded-lg bg-gold-500 hover:bg-gold-600 focus:ring-4 focus:ring-gold-300 sm:w-auto dark:bg-gold-600 dark:hover:bg-gold-700 dark:focus:ring-gold-800"
          >
            Request Deletion
          </button>
        </form>

        <p className="text-white mt-6 text-center">
          <Link href="/" className="text-gold-400 hover:underline">
            Return to Login
          </Link>
        </p>
      </AuthLayout>
    </>
  );
}
