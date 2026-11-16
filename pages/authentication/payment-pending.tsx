import React, { useCallback, useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import AuthLayout from "@/layouts/AuthLayout";
import useAuthStore from "@/store/authStore";
import { useLoadingStore } from "@/store/useLoadingStore";

export async function getServerSideProps() {
  return {
    props: {},
  };
}

export default function PaymentPendingPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const setLoading = useLoadingStore((state) => state.setLoading);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [saveCard, setSaveCard] = useState(true);

  useEffect(() => {
    if (!token) {
      router.replace("/authentication/sign-in");
    }
  }, [token, router]);

  const fetchCurrentUser = useCallback(async () => {
    if (!token) return null;

    const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        token,
      },
    });

    const profilePayload = await profileResponse.json();
    if (!profileResponse.ok || profilePayload?.error) {
      return null;
    }

    return profilePayload?.data || null;
  }, [token]);

  useEffect(() => {
    const checkPaymentStatus = async () => {
      const user = await fetchCurrentUser();
      if (!user) return;

      const isPaymentVerified = Boolean(user?.membership?.paymentVerified);
      const isSubscriptionActive =
        String(user?.membership?.tapSubscriptionStatus || "").toUpperCase() ===
        "ACTIVE";

      if (isPaymentVerified && isSubscriptionActive) {
        toast.success("Membership payment verified.");
        router.replace("/userMarketplace");
      }
    };

    checkPaymentStatus();
  }, [fetchCurrentUser, router]);

  const handlePayNow = async () => {
    if (!token) {
      toast.error("Please sign in again to continue.");
      router.replace("/authentication/sign-in");
      return;
    }

    setLoading(true);
    setProcessingPayment(true);

    try {
      const payResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/membership/tap-subscription/pay?save_card=${saveCard}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token,
          },
        },
      );

      const payPayload = await payResponse.json();
      if (!payResponse.ok || payPayload?.error) {
        throw new Error(payPayload?.error?.[0]?.msg || "Unable to initiate payment.");
      }

      const paymentUrl =
        payPayload?.data?.paymentUrl ||
        payPayload?.data?.paymentReference ||
        payPayload?.paymentUrl ||
        payPayload?.paymentReference;

      if (!paymentUrl) {
        throw new Error("Payment link was not returned. Please try again.");
      }

      window.location.href = paymentUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to initiate payment.");
    } finally {
      setLoading(false);
      setProcessingPayment(false);
    }
  };

  return (
    <>
      <Head>
        <title>Membership Payment Pending | PBC Portal</title>
        <meta
          name="description"
          content="Complete your membership payment to activate your subscription."
        />
      </Head>

      <AuthLayout heading="Membership Approved">
        <div className="rounded-2xl p-8 max-w-md w-full text-center space-y-6 mx-auto">
          <h1 className="text-2xl font-semibold text-gold-400">Payment Pending</h1>
          <p className="text-white">
            Your membership is approved. Complete your payment to activate your
            subscription and continue to the portal.
          </p>

          <label className="flex items-center gap-3 cursor-pointer justify-center">
            <input
              type="checkbox"
              checked={saveCard}
              onChange={(e) => setSaveCard(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-gold-500 focus:ring-gold-500 cursor-pointer"
            />
            <span className="text-white text-sm">Save card details for future payments</span>
          </label>

          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={handlePayNow}
              disabled={processingPayment}
              className="bg-gold-500 hover:bg-gold-600 disabled:opacity-60 text-white font-medium px-6 py-2 rounded-full transition duration-300"
            >
              {processingPayment ? "Processing..." : "Proceed to Payment"}
            </button>
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/authentication/sign-in");
              }}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium px-6 py-2 rounded-full transition duration-300"
            >
              Logout
            </button>
          </div>
        </div>
      </AuthLayout>
    </>
  );
}
