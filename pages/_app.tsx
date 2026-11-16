// _app.tsx

import type { AppProps } from "next/app";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import "@/styles/globals.css";
import MainLayout from "@/layouts/MainLayout";
import Head from "next/head";
import { ThemeModeScript } from "flowbite-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { defineAbilitiesFrom } from "@/utils/ability";
import useAuthStore from "@/store/authStore";
import { useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import { ToastContainer } from "react-toastify";
import { Loader } from "@/components/ui/Loader";
import "leaflet/dist/leaflet.css";
import { AbilityContext } from "@/context/AbilityContext";
import { createMongoAbility } from "@casl/ability";
import { subject } from "@casl/ability";
import { ReactElement, ReactNode } from "react";
import { PermissionProvider } from "@/components/rbac/PermissionsProvider";
import { Roles } from "@/enums/Roles";
import { SocketProvider } from "@/context/SocketContext";
import { SidebarProvider } from "@/context/SidebarContext";
import ChatCacheSync from "@/components/chat/ChatCacheSync";


type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
};
type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

export default function App({ Component, pageProps }: AppPropsWithLayout) {
  const router = useRouter();
  const { pathname } = router;
  const [queryClient] = useState(() => new QueryClient());
  const token = useAuthStore((s) => s.token);
  const setToken = useAuthStore((s) => s.setToken);
  const user = useAuthStore((s) => s.user);
  const roles = useAuthStore((s) => s.roles);
  const setUser = useAuthStore((s) => s.setUser);
  const clearToken = useAuthStore((s) => s.clearToken);
  const clearUser = useAuthStore((s) => s.clearUser);
  const permissions = useAuthStore((s) => s.permissions);
  const setPermissions = useAuthStore((s) => s.setPermissions);
  const setRoles = useAuthStore((s) => s.setRoles);
  const clearRoles = useAuthStore((s) => s.clearRoles);
  const logout = useAuthStore((s) => s.logout);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const previousRoleIdRef = useRef<number | null>(null);
  const publicRoutes = [
    "/",
    "/authentication/sign-in",
    "/authentication/sign-up",
    "/authentication/membership",
    "/authentication/membership-status",
    "/authentication/payment-pending",
    "/authentication/forgot-password",
    "/authentication/reset-password",
    "/privacy-policy",
    "/terms-and-conditions",
    "/data-processing-agreement",
    "/authentication/request-deletion",
    "/authentication/confirm-deletion",
    "/authentication/checkout-success",
    "/authentication/checkout-cancel",
    "/authentication/subscription-success",
    "/authentication/subscription-cancel",
    "/authentication/subscription-error",
    "/job-apply",
    "/job-apply/[id]",
    "/authentication/sponsor-success",
    "/authentication/sponsor-cancel",
    "/authentication/annual-sponsor-success",
    "/authentication/annual-sponsor-cancel",
    "/authentication/candidate-success",
    "/authentication/candidate-cancel",
    "/authentication/guest-success",
    "/authentication/guest-cancel",
    "/open-app",
    "/404",
    "/500",
  ];
  const documentReviewAllowedRoutes = ["/profile/edit"];
  const membershipFlowAllowedRoutes = [
    "/authentication/membership",
    "/authentication/membership-status",
    "/authentication/payment-pending",
  ];

  const isDocumentReviewPendingUser = (userData: any): boolean => {
    return Boolean(userData?.isDocumentReviewPending);
  };

  const isPendingUserAllowedPath = (path: string): boolean => {
    return documentReviewAllowedRoutes.some(
      (allowedRoute) =>
        path === allowedRoute || path.startsWith(`${allowedRoute}/`),
    );
  };

  const isMembershipFlowPath = (path: string): boolean => {
    return membershipFlowAllowedRoutes.some(
      (allowedRoute) =>
        path === allowedRoute || path.startsWith(`${allowedRoute}/`),
    );
  };

  const isPaymentVerified = (userData: any): boolean => {
    return userData?.membership?.paymentVerified !== false;
  };

  const getMembershipRegistrationState = async () => {
    try {
      if (!token || token === "undefined") return null;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/membership-registration/my/memberships`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json", token },
        },
      );

      const payload = await res.json();
      if (!res.ok || payload?.error) {
        return null;
      }
      return payload?.data || null;
    } catch (error) {
      console.error("getMembershipRegistrationState error:", error);
      return null;
    }
  };

  // First, check for token in sessionStorage on initial load
  useEffect(() => {
    const sessionToken = sessionStorage.getItem("token");
    if (sessionToken && (!token || token === "undefined")) {
      setToken(sessionToken);

      // Try to get user from session storage as well
      const sessionUser = sessionStorage.getItem("user");
      if (sessionUser) {
        try {
          const parsedUser = JSON.parse(sessionUser);
          const roleId = parsedUser.role?.id || parsedUser.Role?.id;
          if (roleId) {
            previousRoleIdRef.current = roleId;
          }
          setUser({...parsedUser, Role: { id: parsedUser.role.id, name: parsedUser.role.name, permissions: [] }});
        } catch (e) {
          console.error("Failed to parse user from session storage");
        }
      }

      // Try to get roles from session storage
      const sessionRoles = sessionStorage.getItem("roles");
      if (sessionRoles) {
        try {
          const parsedRoles = JSON.parse(sessionRoles);
          setRoles(parsedRoles);
        } catch (e) {
          console.error("Failed to parse roles from session storage");
        }
      }
    }
    setIsInitializing(false);
  }, []);

  const getUser = async () => {
    try {
      if (!token || token === "undefined") return null;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user`, {
        method: "GET",
        headers: { "Content-Type": "application/json", token },
      });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 401) {
          // Token expired or invalid
          clearToken();
          clearUser();
          clearRoles();
          return null;
        }
        throw new Error(data?.error[0]?.msg || "User fetch failed");
      }
      return await res.json();
    } catch (err: any) {
      console.error("getUser error:", err);
      if (err?.message?.includes("session")) {
        clearToken();
        clearUser();
        clearRoles();
        router.push("/authentication/sign-in");
      }
      return null;
    }
  };

  const getRoles = async () => {
    try {
      if (!token || token === "undefined") return null;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/roles`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json", token },
        },
      );
      if (!res.ok) {
        if (res.status === 401) {
          clearToken();
          clearUser();
          clearRoles();
          return null;
        }
        throw new Error("Roles fetch failed");
      }
      return await res.json();
    } catch (err) {
      console.error("getRoles error:", err);
      return null;
    }
  };

  useEffect(() => {
    // Skip during initialization phase
    if (isInitializing) return;

    const fetchUser = async () => {
      // Don't redirect if we're on a public route
      if (publicRoutes.includes(pathname)) {
        setIsUserLoaded(true);
        return;
      }

      // If we have a token, validate by fetching user data
      try {
        if (token && token !== "undefined") {
          const [userData, rolesData] = await Promise.all([
            getUser(),
            getRoles(),
          ]);
          if (userData?.data) {
            if (!isPaymentVerified(userData.data)) {
              logout();
              router.push("/authentication/sign-in");
              return;
            }
            const currentRoleId = userData.data.Role?.id;
            if (previousRoleIdRef.current !== null && previousRoleIdRef.current !== currentRoleId) {
              toast.info("Your role has been changed. Please log in again.");
              logout();
              router.push("/authentication/sign-in");
              return;
            }
            previousRoleIdRef.current = currentRoleId;
            setUser(userData.data);

            if (
              isDocumentReviewPendingUser(userData.data) &&
              !isPendingUserAllowedPath(pathname)
            ) {
              router.push("/profile/edit");
              return;
            }

            if (
              !userData.data?.isProfileVerified &&
              !isDocumentReviewPendingUser(userData.data)
            ) {
              if (pathname !== "/authentication/sign-up") {
                router.push("/authentication/sign-up?completeProfile=true");
                return;
              }
            }

            const isMemberUser = [Roles.INDIVIDUAL, Roles.CORPORATE].includes(
              userData.data?.Role?.name,
            );

            if (isMemberUser) {
              const currentMembership = await getMembershipRegistrationState();
              const registrationStatus = String(
                currentMembership?.status || "",
              ).toUpperCase();
              const membershipStatus = String(
                userData.data?.membership?.status || "",
              ).toUpperCase();

              const status =
                registrationStatus === "APPROVED" || membershipStatus === "APPROVED"
                  ? "APPROVED"
                  : registrationStatus || membershipStatus;

              if (status !== "APPROVED") {
                if (status === "REJECTED") {
                  if (pathname !== "/authentication/membership-status") {
                    router.push("/authentication/membership-status?status=rejected");
                    return;
                  }
                } else if (
                  !currentMembership ||
                  !currentMembership?.completionStatus?.isComplete
                ) {
                  const currentStep = Number(
                    currentMembership?.completionStatus?.currentStep || 0,
                  );
                  const isGovernmentEntity = Boolean(
                    currentMembership?.completionStatus?.isGovernmentEntity,
                  );

                  if (!isMembershipFlowPath(pathname)) {
                    router.push({
                      pathname: "/authentication/membership",
                      query: {
                        step: String(
                          isGovernmentEntity
                            ? Math.max(1, Math.min(currentStep + 1, 3))
                            : Math.max(1, Math.min(currentStep + 1, 6)),
                        ),
                        isGovernmentEntity: String(isGovernmentEntity),
                      },
                    });
                    return;
                  }
                } else if (pathname !== "/authentication/membership-status") {
                  router.push("/authentication/membership-status?status=pending");
                  return;
                }
              } else {
                const isPaymentVerified =
                  currentMembership?.paymentVerified ||
                  userData.data?.membership?.paymentVerified;
                const isSubscriptionActive =
                  currentMembership?.tapSubscriptionStatus === "ACTIVE" ||
                  userData.data?.membership?.tapSubscriptionStatus === "ACTIVE";

                if (!isPaymentVerified || !isSubscriptionActive) {
                  if (pathname !== "/authentication/payment-pending") {
                    router.push("/authentication/payment-pending");
                    return;
                  }
                }
              }
            }

            setPermissions(userData?.data.Role.permissions);
            defineAbilitiesFrom(userData?.data.Role.permissions);
            setRoles(rolesData?.data || []);
          } else {
            previousRoleIdRef.current = null;
            if (pathname !== "/authentication/sign-in") {
              clearToken();
              clearUser();
              clearRoles();
              router.push("/authentication/sign-in");
            }
          }
        } else if (!publicRoutes.includes(pathname)) {
          previousRoleIdRef.current = null;
          router.push("/authentication/sign-in");
        }
      } finally {
        setIsUserLoaded(true);
      }
    };

    fetchUser();
  }, [token, pathname, isInitializing]);

  useEffect(() => {
    if (isInitializing || !token || token === "undefined" || publicRoutes.includes(pathname)) {
      return;
    }

    // Only check if we have a previous role ID to compare against
    if (previousRoleIdRef.current === null) {
      return;
    }

    const checkRoleChange = async () => {
      // First check if the role ID in the store matches the previous one
      // Only make API call if we need to verify
      const currentStoreRoleId = user?.Role?.id;
      if (currentStoreRoleId && previousRoleIdRef.current === currentStoreRoleId) {
        // Role ID matches in store, no need to check API
        return;
      }

      const userData = await getUser();
      if (userData?.data) {
        const currentRoleId = userData.data.Role?.id;
        
        // Only proceed if role ID has actually changed
        if (previousRoleIdRef.current !== null && previousRoleIdRef.current !== currentRoleId) {
          toast.info("Your role has been changed. Please log in again.");
          logout();
          router.push("/authentication/sign-in");
          return;
        }
        
        // Update the ref if role ID is different
        if (previousRoleIdRef.current !== currentRoleId) {
          previousRoleIdRef.current = currentRoleId;
        }
      }
    };

    const handleFocus = () => {
      checkRoleChange();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [token, pathname, isInitializing, user]);

  const ability = useMemo(
    () => defineAbilitiesFrom(permissions),
    [permissions],
  );

  const noLayoutPaths = [
    "/",
    "/authentication/sign-in",
    "/authentication/sign-up",
    "/authentication/forgot-password",
    "/authentication/reset-password",
    "/authentication/profile-lock",
    "/authentication/membership",
    "/authentication/membership-status",
    "/authentication/payment-pending",
    "/privacy-policy",
    "/terms-and-conditions",
    "/data-processing-agreement",
    "/authentication/request-deletion",
    "/authentication/confirm-deletion",
    "/authentication/checkout-success",
    "/authentication/checkout-cancel",
    "/authentication/subscription-success",
    "/authentication/subscription-cancel",
    "/authentication/subscription-error",
    "/authentication/sponsor-success",
    "/authentication/sponsor-cancel",
    "/authentication/annual-sponsor-success",
    "/authentication/annual-sponsor-cancel",
    "/authentication/candidate-success",
    "/authentication/candidate-cancel",
    "/authentication/guest-success",
    "/authentication/guest-cancel",
    "/open-app",
    "/job-apply",
    "/job-apply/[id]",
    "/404",
    "/500",
  ];

  const shouldUseMainLayout = !noLayoutPaths.includes(pathname);

  // Show loader for protected routes until user data is loaded
  if (!publicRoutes.includes(pathname) && (!isInitializing || !isUserLoaded)) {
    if (!isInitializing && !isUserLoaded) {
      return <Loader />;
    }
  }

  if (isInitializing && !publicRoutes.includes(pathname)) {
    return <Loader />;
  }

  const getActiveMenu = () => {
    if (pathname.startsWith("/users")) return "users";
    else if (pathname.startsWith("/memberships")) return "memberships";
    else if (pathname.startsWith("/membership-analytics")) return "membership-analytics";
    else if (pathname.startsWith("/user-membership-analytics")) return "user-membership-analytics";
    else if (pathname.startsWith("/director-analytics")) return "director-analytics";
    else if (pathname.startsWith("/reports")) return "reports";
    else if (pathname.startsWith("/membership-plans")) return "membership-plans";
    else if (pathname.startsWith("/job-post")) return "job-post";
    else if (pathname.startsWith("/job-apply")) return "job-apply";
    else if (pathname.startsWith("/userMarketplace")) return "userMarketplace";
    else if (pathname.startsWith("/discount")) return "userMarketplace";
    else if (pathname.startsWith("/marketplace")) return "marketplace";
    else if (pathname.startsWith("/business-connections")) return "business-connections";
    else if (pathname.startsWith("/cart")) return "marketplace";
    else if (pathname.startsWith("/Product")) return "marketplace";
    else if (pathname.startsWith("/product")) return "marketplace";
    else if (pathname.startsWith("/rfqList")) return "marketplace";
    else if (pathname.startsWith("/rfq")) return "marketplace";
    else if (pathname.startsWith("/seller")) return "marketplace";
    else if (pathname.startsWith("/checkout")) return "marketplace";
    else if (pathname.startsWith("/product-wanted")) return "marketplace";
    else if (pathname.startsWith("/service-wanted")) return "marketplace";
    else if (pathname.startsWith("/service")) return "marketplace";
    else if (pathname.startsWith("/order-history")) return "order-history";
    else if (pathname.startsWith("/wishlists")) return "wishlists";
    else if (pathname.startsWith("/chat")) return "chat";
    else if (pathname.startsWith("/support")) return "support";
    else if (pathname.startsWith("/events")) return "events";
    else if (pathname.startsWith("/election")) return "election";
    else if (pathname.startsWith("/expense")) return "expense";
    else if (pathname.startsWith("/tasks")) return "tasks";
    else if (pathname.startsWith("/attendance")) return "attendance";
    else if (pathname.startsWith("/user-rejections")) return "user-rejections";
    else if (pathname.startsWith("/initiatives")) return "initiatives";
    else if (pathname.startsWith("/logs")) return "logs";
    else if (pathname.startsWith("/dashboard")) return "dashboard";
    else if (pathname.startsWith("/newsletter")) return "newsletter";
    else if (pathname.startsWith("/news")) return "news";
    else if (pathname.startsWith("/leads")) return "leads";
    else if (pathname.startsWith("/super-user")) return "super-user";
    else if (pathname.startsWith("/annual-sponsor")) return "annual-sponsor";

    else if (pathname.startsWith("/tenure")) return "tenure";
    else if (pathname.startsWith("/roleTransmission")) return "role-transmission";
    else if (pathname.startsWith("/soft-delete")) return "soft-delete";
    else if (pathname.startsWith("/admin/customize-birthday")) return "customize-birthday";
    return "userMarketplace";
  };

  const getLayout =
    Component.getLayout ??
    ((page) =>
      shouldUseMainLayout ? (
        <MainLayout activeMenu={getActiveMenu()}>{page}</MainLayout>
      ) : (
        page
      ));

  return (
    <>
      <AbilityContext.Provider value={ability}>
        <PermissionProvider permissions={permissions}>
          <Loader />
          <ToastContainer
            newestOnTop
            closeOnClick
            pauseOnHover
            autoClose={3000}
            theme="dark"
          />
          <Head>
            <title>PBC - Dubai</title>
            <meta
              name="description"
              content="Pakistan business council dubai member login."
            />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />
            <link rel="icon" href="/favicon.ico" />
            <ThemeModeScript />
          </Head>
          <QueryClientProvider client={queryClient}>
            <SocketProvider>
              <SidebarProvider>
                <ChatCacheSync />
                {getLayout(<Component {...pageProps} />)}
              </SidebarProvider>
            </SocketProvider>
          </QueryClientProvider>
        </PermissionProvider>
      </AbilityContext.Provider>
    </>
  );
}
