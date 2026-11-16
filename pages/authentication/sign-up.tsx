import React, { useEffect, useRef, useState } from "react";
import AuthLayout from "@/layouts/AuthLayout";

import StepOne from "@/components/auth/signup/StepOne";
import StepTwo from "@/components/auth/signup/stepTwo";
import { useLoadingStore } from "@/store/useLoadingStore";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import Link from "next/link";
import StepOTP from "@/components/auth/signup/stepOTP";
import { useRouter } from "next/router";
import { useSignUpStore } from "@/store/useSignUpStore";
import ReCaptcha, { ReCaptchaRef } from "@/components/common/ReCaptcha";

export default function SignUp() {
  const [step, setStep] = useState(1);
  const setLoading = useLoadingStore((state) => state.setLoading);
  const token = useAuthStore((state) => state.token);
  const setAuthUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const setSignUpData = useSignUpStore((state) => state.setSignUp);
  const signUpUser = useSignUpStore((state) => state.signUp);
  const router = useRouter();
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCaptchaRef>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const persistApi = (useAuthStore as any).persist;
    if (!persistApi) {
      setHasHydrated(true);
      return;
    }
    setHasHydrated(Boolean(persistApi.hasHydrated?.()));
    const unsub = persistApi.onFinishHydration?.(() => setHasHydrated(true));
    return () => {
      unsub?.();
    };
  }, []);

  const stepLimit = 3;

  const getMembershipRoute = (currentMembership: any, userMembership: any) => {
    const registrationStatus = String(currentMembership?.status || "").toUpperCase();
    const membershipStatus = String(userMembership?.status || "").toUpperCase();

    const status =
      registrationStatus === "APPROVED" || membershipStatus === "APPROVED"
        ? "APPROVED"
        : registrationStatus || membershipStatus;

    if (status === "REJECTED") {
      return "/authentication/membership-status?status=rejected";
    }

    if (!currentMembership || !currentMembership?.completionStatus?.isComplete) {
      const currentStep = Number(currentMembership?.completionStatus?.currentStep || 0);
      const isGovernmentEntity = Boolean(
        currentMembership?.completionStatus?.isGovernmentEntity,
      );

      return {
        pathname: "/authentication/membership",
        query: {
          step: String(
            isGovernmentEntity
              ? Math.max(1, Math.min(currentStep + 1, 3))
              : Math.max(1, Math.min(currentStep + 1, 6)),
          ),
          isGovernmentEntity: String(isGovernmentEntity),
        },
      };
    }

    if (status !== "APPROVED") {
      return "/authentication/membership-status?status=pending";
    }

    const isPaymentVerified =
      currentMembership?.paymentVerified || userMembership?.paymentVerified;
    const isSubscriptionActive =
      currentMembership?.tapSubscriptionStatus === "ACTIVE" ||
      userMembership?.tapSubscriptionStatus === "ACTIVE";

    if (!isPaymentVerified || !isSubscriptionActive) {
      return "/authentication/payment-pending";
    }

    return "/userMarketplace";
  };

  useEffect(() => {
    if (!hasHydrated) return;
    const { completeProfile: queryStep } = router.query;
    if (queryStep !== "true") return;

    const guardVerifiedProfileFlow = async () => {
      if (!token) {
        setStep(3);
        return;
      }

      try {
        const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token,
          },
        });

        const userPayload = await userRes.json();
        const userData = userPayload?.data;

        if (!userRes.ok || !userData) {
          setStep(3);
          return;
        }

        if (!userData?.isProfileVerified) {
          setStep(3);
          return;
        }

        const membershipRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/membership-registration/my/memberships`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              token,
            },
          },
        );

        const membershipPayload = await membershipRes.json();
        const currentMembership = membershipRes.ok ? membershipPayload?.data : null;

        const nextRoute = getMembershipRoute(currentMembership, userData?.membership);
        router.replace(nextRoute as any);
      } catch {
        setStep(3);
      }
    };

    guardVerifiedProfileFlow();
  }, [hasHydrated, router, router.query.completeProfile, token]);

  const requireRecaptcha = () => {
    if (!recaptchaToken) {
      toast.error("Please complete the reCAPTCHA verification.");
      return false;
    }
    return true;
  };

  const resetRecaptcha = () => {
    setRecaptchaToken(null);
    recaptchaRef.current?.reset();
  };

  const signUp = async (signUpData: {
    name: string;
    email: string;
    password: string;
    phoneNumber: string;
  }) => {
    if (!requireRecaptcha()) return;

    setLoading(true);
    try {
      setSignUpData(signUpData);
      const userResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: signUpData.name,
            email: signUpData.email,
            password: signUpData.password,
            phoneNumber: signUpData.phoneNumber,
            recaptchaToken,
          }),
        },
      );
      const response = await userResponse.json();
      if (userResponse.ok && response.message) {
        toast.success(response.message);
        setStep((prev) => Math.min(prev + 1, stepLimit));
        resetRecaptcha();
      } else if (
        response?.error?.[0]?.msg ===
        "Otps for email and phone number are still valid. Please use the existing OTPs to verify your account."
      ) {
        toast.info(response.error[0].msg);
        setStep(2);
        resetRecaptcha();
      } else {
        toast.error(response?.error?.[0]?.msg || "Registration failed.");
        resetRecaptcha();
      }
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.";
      toast.error(errorMessage);
      resetRecaptcha();
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (otpData: {
    emailOtp: string[];
    phoneOtp: string[];
  }) => {
    if (!requireRecaptcha()) return;

    setLoading(true);
    try {
      if (!signUpUser?.email || !signUpUser?.phoneNumber || !signUpUser?.password) {
        throw new Error("Missing registration details. Please complete registration again.");
      }

      const userResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/verify-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            emailOtp: otpData.emailOtp.join(""),
            phoneOtp: otpData.phoneOtp.join(""),
            email: signUpUser.email,
            phoneNumber: signUpUser.phoneNumber,
            recaptchaToken,
          }),
        },
      );
      const response = await userResponse.json();
      if (userResponse.ok && response.message) {
        toast.success(response.message);
        toast.info(
          "Profile is under review. Please wait while the admin approves your account.",
        );
        router.replace("/authentication/sign-in");
        resetRecaptcha();
      } else {
        toast.error(response?.error?.[0]?.msg || "OTP verification failed.");
        resetRecaptcha();
      }
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.";
      toast.error(errorMessage);
      resetRecaptcha();
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!requireRecaptcha()) return;

    setLoading(true);
    try {
      if (!signUpUser?.email || !signUpUser?.phoneNumber) {
        throw new Error("Missing registration details. Please complete registration again.");
      }

      const resendResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/resend-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: signUpUser.email,
            phoneNumber: signUpUser.phoneNumber,
            recaptchaToken,
          }),
        },
      );

      const response = await resendResponse.json();

      if (resendResponse.ok && response.message) {
        toast.success(response.message);
        resetRecaptcha();
      } else {
        toast.error(response?.error?.[0]?.msg || "Failed to resend OTP.");
        resetRecaptcha();
      }
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.";
      toast.error(errorMessage);
      resetRecaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleProfileCompletion = async (values: {
    bio: string;
    gender: string;
    country: string;
    city: string;
    nativeCountry: string;
    nativeCity: string;
    longitude: number;
    latitude: number;
    profilePicture: File | null;
    tradeLicense: File;
    tradeLicenseSecondary: File | null;
    passport: File;
    passportSecondary: File | null;
    emiratesId: File | null;
    emiratesIdSecondary: File | null;
    bioVideo: File;
    isResident: boolean;
    socialLinks: Array<{ platform: string; url: string }>;
  }) => {
    const formData = new FormData();
    formData.append("bio", values.bio);
    if (values.gender) {
      formData.append("gender", values.gender);
    }
    formData.append("country", values.country);
    formData.append("city", values.city);
    formData.append("nativeCountry", values.nativeCountry);
    formData.append("nativeCity", values.nativeCity);
    formData.append(
      "longitude",
      Number(values.longitude).toFixed(7).toString(),
    );
    formData.append("latitude", Number(values.latitude).toFixed(7).toString());
    if (values.profilePicture) {
      formData.append("profilePicture", values.profilePicture);
    }
    formData.append("tradeLicense", values.tradeLicense);
    if (values.tradeLicenseSecondary) {
      formData.append("tradeLicenseSecondary", values.tradeLicenseSecondary);
    }
    formData.append("passport", values.passport);
    if (values.passportSecondary) {
      formData.append("passportSecondary", values.passportSecondary);
    }
    formData.append("isResident", String(values.isResident));
    if (values.emiratesId) {
      formData.append("emiratesId", values.emiratesId);
    }
    if (values.emiratesIdSecondary) {
      formData.append("emiratesIdSecondary", values.emiratesIdSecondary);
    }
    formData.append("bioVideo", values.bioVideo);

    values.socialLinks.forEach((link, index) => {
      formData.append(`socialLinks[${index}][platform]`, link.platform);
      formData.append(`socialLinks[${index}][url]`, link.url);
    });

    setLoading(true);
    try {
      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/profile/add`,
        {
          method: "POST",
          headers: {
            token: `${token}`,
          },
          body: formData,
        },
      );
      const result = await response.json();
      if (response.ok && result.message) {
        toast.success(result.message);
        setSignUpData({
          ...signUpUser,
          ...values,
        });

        const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token: `${token}`,
          },
        });

        const userPayload = await userResponse.json();
        if (userResponse.ok && userPayload?.data) {
          setAuthUser(userPayload.data);
        }

        router.push("/authentication/membership");
      } else {
        toast.error(result?.error?.[0]?.msg || "Profile submission failed.");
      }
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <StepOne
            nextStep={(formData) =>
              signUp({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                phoneNumber: `${formData.countryCode}${formData.phone}`,
              })
            }
          />
        );
      case 2:
        return (
          <StepOTP
            nextStep={verifyOtp}
            resendOtp={resendOtp}
            prevStep={prevStep}
            recaptchaReady={Boolean(recaptchaToken)}
          />
        );
      case 3:
        return (
          <StepTwo nextStep={handleProfileCompletion} prevStep={prevStep} />
        );
      default:
        return null;
    }
  };

  return (
    <AuthLayout
      heading="Create Account"
      headerAction={
        step === 3 && token ? (
          <button
            type="button"
            title="Logout"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-white transition duration-300 hover:bg-red-600"
            onClick={() => {
              logout();
              localStorage.clear();
              sessionStorage.clear();
              router.push("/authentication/sign-in");
            }}
            aria-label="Logout"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-5 w-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 12h9m0 0l-3-3m3 3l-3 3"
              />
            </svg>
          </button>
        ) : undefined
      }
    >
      {renderStep()}
      {step <= 2 && (
        <ReCaptcha
          ref={recaptchaRef}
          onChange={(nextToken) => setRecaptchaToken(nextToken)}
          onExpired={() => setRecaptchaToken(null)}
          onError={() => {
            setRecaptchaToken(null);
            toast.error("reCAPTCHA verification failed. Please try again.");
          }}
        />
      )}
      {step === 1 && (
        <p className="text-white mt-4">
          Already have an account?{" "}
          <Link href={"/"} className="text-gold-400">
            Sign In
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}
