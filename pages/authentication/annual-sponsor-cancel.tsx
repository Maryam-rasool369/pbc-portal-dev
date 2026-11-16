import React, { useEffect } from "react";
import { useRouter } from "next/router";
import AuthLayout from "@/layouts/AuthLayout";
import Head from "next/head";
import Link from "next/link";
import { Button } from "flowbite-react";
import { FaArrowLeft, FaTimesCircle } from "react-icons/fa";
import { HiOutlineXCircle } from "react-icons/hi";

export default function AnnualSponsorCancel() {
  const router = useRouter();
  const { sponsorId } = router.query;

  useEffect(() => {
    const url = `ae.pbcdubai.admin:///(drawer)/annual-sponsor?sponsorPaymentSuccess=false`;
    window.location.href = url;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/annual-sponsor");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  const handleBackToSponsors = () => {
    router.push("/annual-sponsor");
  };

  return (
    <>
      <Head>
        <title>Annual Sponsorship Payment Cancelled | PBC Portal</title>
        <meta
          name="description"
          content="Your annual sponsorship payment was cancelled"
        />
      </Head>
      <AuthLayout heading="Payment Confirmation">
        <div className="flex flex-col items-center">
          {/* Error Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              {/* @ts-ignore */}
              <HiOutlineXCircle className="w-12 h-12 text-red-500" />
            </div>
          </div>

          {/* Error Message */}
          <p className="my-6 text-base text-center font-normal text-gray-500 dark:text-gray-400">
            Thank you for considering becoming an annual sponsor.
            <br />
            <br />
            Your payment was not completed. The payment process was cancelled and no charges have been made to your account.
            <br />
            <br />
            Redirecting you in a moment...
          </p>

          {/* Error Details */}
          <div className="w-full max-w-md bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700">
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                    {/* @ts-ignore */}
                    <FaTimesCircle className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">
                    Payment Not Processed
                  </p>
                  <p className="text-sm text-gray-400">
                    Your payment was cancelled and no charges were made.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                    {/* @ts-ignore */}
                    <FaTimesCircle className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">
                    Sponsorship Not Completed
                  </p>
                  <p className="text-sm text-gray-400">
                    You can try again from the annual sponsors page when you&apos;re ready.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Loading Spinner */}
          <div className="loader" style={{ margin: "0 auto" }}>
            <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 w-full max-w-md flex flex-col gap-3">
            <Button
              color="dark"
              className="bg-gold-500 hover:bg-gold-600 text-black border-0 w-full"
              onClick={handleBackToSponsors}
            >
              {/* @ts-ignore */}
              <FaArrowLeft className="mr-2" />
              Back to Annual Sponsors
            </Button>
            <Link href="/annual-sponsor" className="text-center">
              <span className="text-gold-400 hover:underline text-sm">
                View All Sponsors
              </span>
            </Link>
          </div>
        </div>
      </AuthLayout>
    </>
  );
}

