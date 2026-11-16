import React, { useEffect } from "react";
import { useRouter } from "next/router";
import AuthLayout from "@/layouts/AuthLayout";
import Head from "next/head";
import { Button } from "flowbite-react";
import { FaArrowLeft, FaTimesCircle } from "react-icons/fa";
import { HiOutlineXCircle } from "react-icons/hi";

export default function GuestCancel() {
  const router = useRouter();
  const { eventId } = router.query;

  useEffect(() => {
    const url = `ae.pbcdubai.admin:///(drawer)/events?guestPaymentSuccess=false`;
    window.location.href = url;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (eventId) {
        router.push(`/events/${eventId}?payment=failed&type=guest`);
      } else {
        router.push("/events");
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [eventId, router]);

  const handleBackToEvent = () => {
    if (eventId) {
      router.push(`/events/${eventId}?payment=failed&type=guest`);
    } else {
      router.push("/events");
    }
  };

  return (
    <>
      <Head>
        <title>Guest Payment Failed | PBC Portal</title>
        <meta
          name="description"
          content="Your guest payment was not completed"
        />
      </Head>
      <AuthLayout heading="Payment Confirmation">
        <div className="flex flex-col items-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              {/* @ts-ignore */}
              <HiOutlineXCircle className="w-12 h-12 text-red-500" />
            </div>
          </div>

          <p className="my-6 text-base text-center font-normal text-gray-500 dark:text-gray-400">
            Guest payment was not completed.
            <br />
            <br />
            No charge has been made. Redirecting you back to the event page...
          </p>

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
                  <p className="text-sm font-medium text-white">Payment Not Processed</p>
                  <p className="text-sm text-gray-400">
                    Please retry payment from the event guest list.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="loader" style={{ margin: "0 auto" }}>
            <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
          </div>

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
          </div>
        </div>
      </AuthLayout>
    </>
  );
}
