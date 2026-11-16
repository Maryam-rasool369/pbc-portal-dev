import React, { useEffect } from "react";
import AuthLayout from "@/layouts/AuthLayout";
import Head from "next/head";
import Link from "next/link";

export default function SubscriptionCancel() {
  useEffect(() => {
    const url = `ae.pbcdubai.admin://(success-pages)/application-approved?payment_failed=true`;
    window.location.href = url;
  }, [])

  return (
    <>
      <Head>
        <title>Your subscription payment is not processed.</title>
        <meta
          name="description"
          content="Your subscription payment has failed"
        />
      </Head>
      <AuthLayout heading="Order Confirmation">
        <p className="my-6 text-base text-center font-normal text-gray-500 dark:text-gray-400">
          Thank you for considering PBC as the marketplace for your needs.
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
