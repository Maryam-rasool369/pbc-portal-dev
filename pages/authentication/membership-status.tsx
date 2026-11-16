import React, { useCallback, useEffect, useState } from "react";
import AuthLayout from "@/layouts/AuthLayout";

import { useLoadingStore } from "@/store/useLoadingStore";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSignUpStore } from "@/store/useSignUpStore";
import MembershipApproved from "@/components/auth/membership/MembershipApproved";
import MembershipRejected from "@/components/auth/membership/MembershipRejected";

export default function MembershipStatus() {
  const [step, setStep] = useState("");
  const [rejectionReasons, setRejectionReasons] = useState<string[]>([]);
  const setLoading = useLoadingStore((state) => state.setLoading);
  const setToken = useAuthStore((state) => state.setToken);
  const token = useAuthStore((state) => state.token);
  const setUser = useSignUpStore((state) => state.setSignUp);
  const router = useRouter();
  const clearToken = useAuthStore((s) => s.clearToken);
  const clearUser = useAuthStore((s) => s.clearUser);
  const logout = useAuthStore((s) => s.logout);

  const getUser = useCallback(async () => {
    try {
      if (!token || token === "undefined") return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user`, {
        method: "GET",
        headers: { "Content-Type": "application/json", token },
      });
      if (!res.ok) throw new Error("User fetch failed");
      return await res.json();
    } catch (err) {
      console.error("getUser error:", err);
      return null;
    }
  }, [token]);

  useEffect(() => {
    if (!router.isReady) return;

    const queryStatus = String(router.query.status || "").toLowerCase();
    if (queryStatus === "approved") {
      setStep("active");
      return;
    }

    if (queryStatus === "rejected") {
      setStep("rejected");
      return;
    }

    if (queryStatus === "inactive" || queryStatus === "pending") {
      setStep("inactive");
    }
  }, [router.isReady, router.query.status]);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        const userData = await getUser();
        if (userData) {
          setUser(userData?.data);
          const membershipApprovals =
            userData?.data?.membership?.MembershipApproval || [];
          const reasons = membershipApprovals
            .filter(
              (approval: any) =>
                String(approval?.status || "").toUpperCase() === "REJECTED" &&
                approval?.comment,
            )
            .map((approval: any) => String(approval.comment).trim())
            .filter(Boolean);
          setRejectionReasons(reasons);

          const membershipStatus = String(
            userData?.data?.membership?.status || "",
          ).toLowerCase();
          if (!step) {
            if (membershipStatus === "approved") {
              setStep("active");
            } else if (membershipStatus === "rejected") {
              setStep("rejected");
            } else {
              setStep("inactive");
            }
          }
        } else {
          clearToken();
          clearUser();
          router.push("/");
        }
      }
    };
    fetchUser();
  }, [token, step, clearToken, clearUser, getUser, router, setUser]);

  const renderStep = () => {
    switch (step) {
      case "active":
        return <MembershipApproved />;
      case "rejected":
        return <MembershipRejected rejectionReasons={rejectionReasons} />;
      case "inactive":
        return (
          <div className="flex items-center justify-center px-4">
            <div className="rounded-2xl p-8 max-w-md w-full text-center space-y-6 animate-fade-in">
              <h1 className="text-2xl font-semibold text-gold-400">
                Membership Under Review
              </h1>
              <p className="text-white">
                Your membership application is currently under review. We will
                notify you once a decision is made.
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium px-4 py-2 rounded-lg transition duration-300"
                  onClick={() => {
                    logout();
                    localStorage.clear();
                    sessionStorage.clear();
                    router.push("/authentication/sign-in");
                  }}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return <AuthLayout heading="Create Account">{renderStep()}</AuthLayout>;
}
