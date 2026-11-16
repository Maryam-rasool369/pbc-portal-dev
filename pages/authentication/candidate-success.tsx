import React, { useEffect } from "react";
import { useRouter } from "next/router";
import AuthLayout from "@/layouts/AuthLayout";
import Head from "next/head";
import Link from "next/link";
import { Button } from "flowbite-react";
import { FaArrowLeft, FaCheckCircle } from "react-icons/fa";
import { HiOutlineCheckCircle } from "react-icons/hi";

export default function CandidateSuccess() {
  const router = useRouter();
  const { electionId } = router.query;

  useEffect(() => {
    if (!electionId) return;
    const url = `ae.pbcdubai.admin://(drawer)/voting/director-elections/${electionId}?success=true`;
    window.location.href = url;
  }, [electionId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (electionId) {
        router.push(`/election/director/${electionId}`);
      } else {
        router.push("/election");
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [electionId, router]);

  const handleBackToElection = () => {
    if (electionId) {
      router.push(`/election/director/${electionId}`);
    } else {
      router.push("/election");
    }
  };

  return (
    <>
      <Head>
        <title>Candidacy Payment Successful | PBC Portal</title>
        <meta
          name="description"
          content="Your director election candidacy payment has been successfully processed"
        />
      </Head>
      <AuthLayout heading="Payment Confirmation">
        <div className="flex flex-col items-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              {/* @ts-ignore */}
              <HiOutlineCheckCircle className="w-12 h-12 text-green-500" />
            </div>
          </div>

          {/* Success Message */}
          <p className="my-6 text-base text-center font-normal text-gray-500 dark:text-gray-400">
            Thank you for your candidacy!
            <br />
            <br />
            Your payment has been successfully processed. Your candidacy is now complete and will be reviewed by the election committee.
            <br />
            <br />
            Redirecting you in a moment...
          </p>

          {/* Success Details */}
          <div className="w-full max-w-md bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700">
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    {/* @ts-ignore */}
                    <FaCheckCircle className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">
                    Payment Confirmed
                  </p>
                  <p className="text-sm text-gray-400">
                    Your candidacy fee has been received and processed successfully.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    {/* @ts-ignore */}
                    <FaCheckCircle className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">
                    Candidacy Complete
                  </p>
                  <p className="text-sm text-gray-400">
                    Your nomination is now complete. You will be notified once the election committee reviews your candidacy.
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
              onClick={handleBackToElection}
            >
              {/* @ts-ignore */}
              <FaArrowLeft className="mr-2" />
              Back to Election
            </Button>
            <Link href="/election" className="text-center">
              <span className="text-gold-400 hover:underline text-sm">
                Browse All Elections
              </span>
            </Link>
          </div>
        </div>
      </AuthLayout>
    </>
  );
}

