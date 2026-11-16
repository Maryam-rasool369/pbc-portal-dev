import React, { useEffect } from "react";
import { useRouter } from "next/router";
import AuthLayout from "@/layouts/AuthLayout";
import Head from "next/head";
import Link from "next/link";

export default function SubscriptionSuccess() {
  const router = useRouter();
  const { stripe_standard_account } = router.query;

  useEffect(() => {
    const url = `ae.pbcdubai.admin://(success-pages)/application-approved?payment_failed=false`;
    window.location.href = url;
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/userMarketplace");
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Head>
        <title>You have successfully {stripe_standard_account ? "created your stripe account" : "subscribed to PBC"}</title>
      </Head>
      <AuthLayout heading={`${stripe_standard_account ? "Stripe Account" : "Payment"} Confirmation`}>
        <p className="my-6 text-base text-center font-normal text-gray-500 dark:text-gray-400">
          Thank you for {stripe_standard_account ? "creating your stripe account" : "subscribing to PBC"}.
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
