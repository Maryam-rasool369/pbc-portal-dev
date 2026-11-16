import React, { useEffect } from "react";
import { useRouter } from "next/router";
import AuthLayout from "@/layouts/AuthLayout";
import Head from "next/head";
import Link from "next/link";

const DEFAULT_MESSAGE =
  "We could not start your membership payment. Please request a new link or contact support.";

export default function SubscriptionError() {
  const router = useRouter();
  const { message } = router.query;

  const displayMessage =
    typeof message === "string" && message.trim()
      ? message
      : DEFAULT_MESSAGE;

  useEffect(() => {
    const url = `ae.pbcdubai.admin://(success-pages)/application-approved?payment_failed=true`;
    window.location.href = url;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/");
    }, 8000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <>
      <Head>
        <title>Membership payment could not be started</title>
      </Head>
      <AuthLayout heading="Payment Error">
        <p className="my-6 text-base text-center font-normal text-gray-500 dark:text-gray-400">
          {displayMessage}
          <br />
          <br />
          Redirecting you in a moment...
        </p>

        <div className="loader" style={{ margin: "0 auto" }}>
          <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-white mt-6 text-center">
          <Link href="/" className="text-gold-400 hover:underline">
            Return to Login
          </Link>
        </p>
      </AuthLayout>
    </>
  );
}
