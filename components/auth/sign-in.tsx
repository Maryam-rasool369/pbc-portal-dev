"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import useAuthStore from "@/store/authStore";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { useLoadingStore } from "@/store/useLoadingStore";
import { defineAbilitiesFrom } from "@/utils/ability";
import { useAbility } from "@/hooks/useAbility";
import { Roles } from "@/enums/Roles";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

const isMember = (role: Roles): boolean => {
  return [Roles.INDIVIDUAL, Roles.CORPORATE].includes(role);
};

const memberBaseUri = process.env.NEXT_PUBLIC_MEMBER_BASE_URI;
const adminBaseUri = process.env.NEXT_PUBLIC_ADMIN_BASE_URI;

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [baseURI, setBaseURI] = useState<string>("");
  const setLoading = useLoadingStore((state) => state.setLoading);
  const router = useRouter();
  const setToken = useAuthStore((state) => state.setToken);
  const setUser = useAuthStore((state) => state.setUser);
  const token = useAuthStore((state) => state.token);
  const setPermissions = useAuthStore((state) => state.setPermissions);
  const ability = useAbility();

  useEffect(() => {
    // Only redirect if the user arrived at sign-in with a pre-existing
    // session. Do NOT redirect when a fresh login just set the token —
    // login() handles routing based on profile/membership status.
    const checkPreExistingSession = () => {
      const preExistingToken = useAuthStore.getState().token;
      if (
        preExistingToken &&
        preExistingToken !== "undefined" &&
        router.pathname === "/authentication/sign-in"
      ) {
        router.push("/userMarketplace");
      }
    };

    const persistApi = (useAuthStore as any).persist;
    if (persistApi?.hasHydrated?.()) {
      checkPreExistingSession();
      return;
    }
    const unsub = persistApi?.onFinishHydration?.(() => checkPreExistingSession());
    return () => {
      unsub?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setBaseURI(window.location.hostname);
  }, []);

  const buildMembershipRoute = (step: number, isGovernmentEntity: boolean) => ({
    pathname: "/authentication/membership",
    query: {
      step: String(step),
      isGovernmentEntity: String(isGovernmentEntity),
    },
  });

  const fetchMembershipStatus = async (authToken: string) => {
    const membershipResponse = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/membership-registration/my/memberships`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          token: authToken,
        },
      },
    );

    const membershipPayload = await membershipResponse.json();
    if (!membershipResponse.ok || membershipPayload?.error) {
      return null;
    }

    return membershipPayload?.data || null;
  };

  const completeLogin = (
    authToken: string,
    userData: any,
    userPermissions: any,
  ) => {
    const abilityInstance = defineAbilitiesFrom(userPermissions);
    ability?.update(abilityInstance.rules);
    setPermissions(userPermissions);

    sessionStorage.setItem("token", authToken);
    sessionStorage.setItem("user", JSON.stringify(userData));

    setUser(userData);
    setToken(authToken);
  };

  const validateInputs = () => {
    if (!email || !password) {
      toast.error("Please fill in both fields.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email.");
      return false;
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      toast.error(
        "Password must be at least 8 characters, with one uppercase, one lowercase, one number, and one special character.",
      );
      return false;
    }
    return true;
  };

  const login = async (email: string, password: string) => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const userResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        }
      );

      const response = await userResponse.json();

      if (response.error) {
        toast.error(response.error[0]?.msg || "Invalid login credentials");
        setLoading(false);
        return;
      }

      if (!response.data || !response.user) {
        toast.error("Invalid response from server");
        setLoading(false);
        return;
      }

      const isUserMember = isMember(response.user?.role?.name);
      const isMemberPortal = baseURI === memberBaseUri;
      const isAdminPortal = baseURI === adminBaseUri;
      const genMessage = (type: string) =>
        `You are not allowed to access your account from this page. Please use the ${type} portal to access your account`;

      if (isUserMember && !isMemberPortal) {
        toast.error(genMessage("member"));
        setLoading(false);
        return;
      }

      if (!isUserMember && !isAdminPortal) {
        toast.error(genMessage("admin"));
        setLoading(false);
        return;
      }

      const profileResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token: response.data,
          },
        }
      );
      
      const userProfileResponse = await profileResponse.json();
      
      if (userProfileResponse.error) {
        throw new Error(userProfileResponse?.error[0]?.msg || "Failed to fetch user profile");
      }

      if (!userProfileResponse.data?.Role?.permissions) {
        throw new Error("User permissions not available");
      }

      const userData = userProfileResponse.data;
      const permissions = userData.Role.permissions;
      const isProfileVerified = Boolean(userData?.isProfileVerified);
      const isDocumentReviewPending = Boolean(
        userData?.isDocumentReviewPending,
      );

      completeLogin(response.data, userData, permissions);

      if (isDocumentReviewPending) {
        toast.success(response.message || "Login successful!");
        router.push("/userMarketplace");
        return;
      }

      if (!isProfileVerified && !isDocumentReviewPending) {
        toast.info("Please complete your profile to continue.");
        router.push("/authentication/sign-up?completeProfile=true");
        return;
      }

      const currentMembership = await fetchMembershipStatus(response.data);
      const registrationStatus = (
        currentMembership?.status || ""
      ).toUpperCase();
      const membershipStatus = (userData?.membership?.status || "").toUpperCase();
      const status =
        registrationStatus === "APPROVED" || membershipStatus === "APPROVED"
          ? "APPROVED"
          : registrationStatus || membershipStatus;

      if (status === "APPROVED") {
        const isPaymentVerified =
          currentMembership?.paymentVerified || userData?.membership?.paymentVerified;
        const isSubscriptionActive =
          currentMembership?.tapSubscriptionStatus === "ACTIVE" ||
          userData?.membership?.tapSubscriptionStatus === "ACTIVE";

        if (isPaymentVerified && isSubscriptionActive) {
          toast.success(response.message || "Login successful!");
          router.push("/userMarketplace");
          return;
        }

        toast.info("Your membership is approved. Please complete payment to continue.");
        router.push("/authentication/payment-pending");
        return;
      }

      if (status === "REJECTED") {
        router.push("/authentication/membership-status?status=rejected");
        return;
      }

      if (!userData?.isActive) {
        toast.info("Your membership request is under review.");
        router.push(buildMembershipRoute(6, false));
        return;
      }

      if (!currentMembership || !status || !currentMembership?.completionStatus?.isComplete) {
        const currentStep = Number(currentMembership?.completionStatus?.currentStep || 0);
        const isComplete = Boolean(currentMembership?.completionStatus?.isComplete);
        const isGovernmentEntity = Boolean(
          currentMembership?.completionStatus?.isGovernmentEntity,
        );

        if (isGovernmentEntity) {
          if (currentStep === 2 && isComplete) {
            router.push(buildMembershipRoute(3, true));
            return;
          }

          if (currentStep === 0) {
            router.push(buildMembershipRoute(1, true));
            return;
          }

          if (currentStep === 1) {
            router.push(buildMembershipRoute(2, true));
            return;
          }

          router.push(buildMembershipRoute(1, true));
          return;
        }

        if (currentStep === 5 && isComplete) {
          router.push(buildMembershipRoute(6, false));
          return;
        }

        if (currentStep === 0) {
          router.push(buildMembershipRoute(1, false));
          return;
        }

        if (currentStep >= 1 && currentStep <= 4) {
          router.push(buildMembershipRoute(currentStep + 1, false));
          return;
        }

        router.push(buildMembershipRoute(1, false));
        return;
      }

      if (!userData?.isMembershipVerified) {
        toast.info("Your membership is under review.");
        const isGovernmentEntity = Boolean(
          currentMembership?.completionStatus?.isGovernmentEntity,
        );
        router.push(buildMembershipRoute(isGovernmentEntity ? 3 : 6, isGovernmentEntity));
        return;
      }

      toast.success(response.message || "Login successful!");

      router.push("/userMarketplace");
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form className="mt-8 space-y-6 w-full" action="#">
        <div>
          <label
            htmlFor="email"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-gold-500 focus:border-gold-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gold-500 dark:focus:border-gold-500"
            placeholder="name@company.com"
            required
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              id="password"
              value={password}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  login(email, password);
                }
              }}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-gold-500 focus:border-gold-500 block w-full p-2.5 pr-10 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gold-500 dark:focus:border-gold-500"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        <div>
          <button
            type="button"
            onClick={() => login(email, password)}
            className="w-full px-5 py-3 text-base font-medium text-center text-white bg-gold-500 rounded-lg hover:bg-gold-600 focus:ring-4 focus:ring-gold-300 dark:bg-gold-600 dark:hover:bg-gold-700 dark:focus:ring-gold-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Login
          </button>
        </div>
        <p className="text-white mt-4">
          <Link
            href={"/job-apply"}
            className="w-full px-5 py-3 text-base font-medium text-center text-white bg-gold-500 rounded-lg hover:bg-gold-600 focus:ring-4 focus:ring-gold-300 dark:bg-gold-600 dark:hover:bg-gold-700 dark:focus:ring-gold-800"
          >
            Apply to Jobs
          </Link>
        </p>
        <p className="text-white flex items-center justify-between gap-4">
          <Link href={"/authentication/sign-up"} className="text-gold-400">
            Register
          </Link>
          <Link
            href={"/authentication/forgot-password"}
            className="text-gold-400"
          >
            Forgot password?
          </Link>
        </p>
      </form>
    </>
  );
}
