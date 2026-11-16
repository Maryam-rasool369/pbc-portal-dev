import React, { useEffect } from "react";
import { useRouter } from "next/router";
import AuthLayout from "@/layouts/AuthLayout";
import Head from "next/head";
import Link from "next/link";
import { Button } from "flowbite-react";
import { FaArrowLeft, FaCheckCircle } from "react-icons/fa";
import { HiOutlineCheckCircle } from "react-icons/hi";

export default function SponsorSuccess() {
  const router = useRouter();
  const { eventId } = router.query;

  useEffect(() => {
    const url = `ae.pbcdubai.admin:///(drawer)/events?sponsorPaymentSuccess=true`;
    window.location.href = url;
  }, []);







  useEffect(() => {
    const timer = setTimeout(() => {
      if (eventId) {
        router.push(`/events/${eventId}`);
      } else {
        router.push("/events");
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [eventId, router]);

  const handleBackToEvent = () => {
    if (eventId) {
      router.push(`/events/${eventId}`);
    } else {
      router.push("/events");
    }
  };

  return (
    <>
      <Head>
        <title>Sponsorship Payment Successful | PBC Portal</title>
        <meta
          name="description"
          content="Your event sponsorship payment has been successfully processed"
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
            Thank you for sponsoring this event!
            <br />
            <br />
            Your payment has been successfully processed. Your sponsorship will be reviewed and displayed shortly.
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
                    Your payment has been received and processed successfully.
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
                    Sponsorship Active
                  </p>
                  <p className="text-sm text-gray-400">
                    Your sponsorship details will be visible on the event page once approved.
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
              onClick={handleBackToEvent}
            >
              {/* @ts-ignore */}
              <FaArrowLeft className="mr-2" />
              Back to Event
            </Button>
            <Link href="/events" className="text-center">
              <span className="text-gold-400 hover:underline text-sm">
                Browse All Events
              </span>
            </Link>
          </div>
        </div>
      </AuthLayout>
    </>
  );
}

