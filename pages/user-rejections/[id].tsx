import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { toast } from "react-toastify";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import useAuthStore from "@/store/authStore";
import { Roles } from "@/enums/Roles";
import {
  FaArrowLeft,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaClock,
  FaExclamationCircle,
} from "react-icons/fa";

interface UserRejection {
  id: number;
  reason: string;
  email: string;
  phoneNumber: string;
  rejectedBy: string;
  createdAt: string;
}

export default function UserRejectionDetails() {
  const [rejection, setRejection] = useState<UserRejection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);

  const router = useRouter();
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const clearToken = useAuthStore((state) => state.clearToken);
  const clearUser = useAuthStore((state) => state.clearUser);
  const clearRoles = useAuthStore((state) => state.clearRoles);
  
  const MemberRoles = [Roles.CORPORATE, Roles.INDIVIDUAL];
  const hasAccess = user && !MemberRoles.includes(user.Role?.name as Roles);

  useEffect(() => {
    if (user && !hasAccess) {
      toast.error("You don't have permission to access this page");
      clearToken();
      clearUser();
      clearRoles();
      router.push("/authentication/sign-in");
    }
  }, [user, hasAccess, clearToken, clearUser, clearRoles, router]);

  useEffect(() => {
    if (!id || !token || token === "undefined") {
      return;
    }

    const fetchRejectionDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/user/rejections/${id}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              token: token,
            },
          },
        );

        const data = await response.json();

        if (data.error || !data.data) {
          setNotFound(true);
          if (data.error?.[0]?.path === "token") {
            useAuthStore.getState().clearToken();
            router.push("/");
          }
        } else {
          setRejection(data.data);
        }
      } catch (error) {
        console.error("Error fetching rejection details:", error);
        toast.error("Failed to fetch rejection details");
      } finally {
        setLoading(false);
      }
    };

    fetchRejectionDetails();
  }, [id, token, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  if (notFound) {
    return (
      <>
        <div className="text-center mt-6 p-10 bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="flex flex-col items-center">
            <svg
              className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-2">
              User Rejection Not Found
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              The rejection record you&apos;re looking for doesn&apos;t exist or
              has been removed.
            </p>
            <button
              onClick={() => router.push("/user-rejections")}
              className="text-white bg-gold-500 hover:bg-gold-600 px-5 py-2 rounded-md transition-colors"
            >
              Back to Rejections
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="mb-6">
          <button
            onClick={() => router.push("/user-rejections")}
            className="text-gold-600 dark:text-gold-400 flex items-center hover:text-gold-800 dark:hover:text-gold-300"
          >
            {/* @ts-ignore */}
            <FaArrowLeft className="mr-2" />
            Back to Rejections List
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
              <div className="flex justify-between items-start mb-6">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                  User Rejection Details
                </h1>
                <div className="px-4 py-1.5 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 rounded-full text-sm font-medium">
                  Rejected
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center">
                    {/* @ts-ignore */}
                    <FaExclamationCircle className="mr-2 text-red-500" />
                    Rejection Reason
                  </h2>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded border border-gray-200 dark:border-gray-600">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {rejection?.reason}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-gray-50 dark:bg-gray-700 p-5 rounded-lg h-fit">
              <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4 pb-2 border-b border-gray-200 dark:border-gray-600">
                Rejection Details
              </h2>

              <div className="space-y-4">
                <div className="flex items-start">
                  {/* @ts-ignore */}
                  <FaEnvelope className="text-gray-500 dark:text-gray-400 mt-1 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Rejected User Email
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {rejection?.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  {/* @ts-ignore */}
                  <FaPhone className="text-gray-500 dark:text-gray-400 mt-1 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Rejected User Phone
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {rejection?.phoneNumber}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  {/* @ts-ignore */}
                  <FaUser className="text-gray-500 dark:text-gray-400 mt-1 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Rejected By
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {rejection?.rejectedBy}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  {/* @ts-ignore */}
                  <FaClock className="text-gray-500 dark:text-gray-400 mt-1 mr-3" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Rejection Date
                    </p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {formatDateAndTime(rejection?.createdAt || "")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
