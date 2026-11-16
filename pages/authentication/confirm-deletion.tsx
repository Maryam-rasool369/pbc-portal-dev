import React, { useEffect, useState } from "react";
import AuthLayout from "@/layouts/AuthLayout";
import Head from "next/head";
import Link from "next/link";
import { useLoadingStore } from "@/store/useLoadingStore";
import { useRouter } from "next/router";
import { Spinner } from "flowbite-react";

export default function ConfirmDeletion() {
  const router = useRouter();
  const { token } = router.query;
  const setLoading = useLoadingStore((state) => state.setLoading);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    success?: boolean;
    message?: string;
  }>({});

  const confirmDeletion = async () => {
    setIsProcessing(true);
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/confirm-deletion`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            token: token as string,
          },
        },
      );

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message:
            data.message || "Your account has been successfully deleted.",
        });
      } else {
        setResult({
          success: false,
          message:
            data.error[0]?.msg ||
            "Failed to delete account. The link may have expired or is invalid.",
        });
      }
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.";

      setResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setIsProcessing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;

    confirmDeletion();
  }, [token]);

  return (
    <>
      <Head>
        <title>Confirm Account Deletion | PBC Portal</title>
        <meta
          name="description"
          content="Confirm the deletion of your PBC Portal account"
        />
      </Head>
      <AuthLayout heading="Account Deletion">
        <div className="mt-8 text-center">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <Spinner size="xl" color="warning" />
              <p className="text-base font-normal text-gray-300">
                Processing your account deletion request...
              </p>
            </div>
          ) : result.success === true ? (
            <div className="text-center space-y-4">
              <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <svg
                  className="w-8 h-8 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-200 mb-2">
                Account Successfully Deleted
              </h3>
              <p className="text-base font-normal text-gray-400 mb-4">
                {result.message}
              </p>
              <Link
                href="/"
                className="inline-flex items-center px-5 py-2.5 mt-4 sm:mt-6 text-base font-medium text-center text-white bg-gold-500 rounded-lg hover:bg-gold-600 focus:ring-4 focus:ring-gold-300"
              >
                Return to Login
              </Link>
            </div>
          ) : result.success === false ? (
            <div className="text-center space-y-4">
              <div className="inline-flex justify-center items-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-200 mb-2">Error</h3>
              <p className="text-base font-normal text-gray-400 mb-4">
                {result.message}
              </p>
              <div className="space-y-2">
                <Link
                  href="/authentication/request-deletion"
                  className="inline-block w-full px-5 py-2.5 text-base font-medium text-center text-white bg-gold-500 rounded-lg hover:bg-gold-600 focus:ring-4 focus:ring-gold-300 sm:w-auto"
                >
                  Try Again
                </Link>
                <p className="mt-4 text-sm text-gray-400">or</p>
                <Link
                  href="/"
                  className="inline-block text-gold-400 hover:underline mt-2"
                >
                  Return to Login
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-base font-normal text-gray-400">
              Initializing...
            </div>
          )}
        </div>
      </AuthLayout>
    </>
  );
}
