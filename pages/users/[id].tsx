import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import useAuthStore from "@/store/authStore";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import Can from "@/components/rbac/Can";
import { createActivityLog, disableUser, enableUser } from "@/services/users";
import Loading from "@/components/ui/Loading";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import { RoleId } from "@/enums/Roles";
import VideoPlayer from "@/components/news/VideoPlayer";
import SoftDeleteRequestModal from "@/components/modals/SoftDeleteRequestModal";
import MembershipApplicationStatusModal from "@/components/modals/MembershipApplicationStatusModal";

interface BusinessGroup {
  id: number;
  name: string;
}

interface MembershipCategoryRef {
  id: number;
  name: string;
}

interface MembershipSubCategoryRef {
  id: number;
  name: string;
}

interface Membership {
  status: "APPROVED" | "PENDING" | "REJECTED";
  membershipId?: string;
  companyName?: string;
  city?: string;
  website?: string;
  businessGroup?: BusinessGroup[];
  membershipCategoryRef?: MembershipCategoryRef | null;
  membershipSubCategoryRef?: MembershipSubCategoryRef | null;
  tradeLicenseExpiry?: string;
  passportExpiryDate?: string;
  emiratesIdExpiryDate?: string;
  decision_at?: string;
}

type ApplicationStepStatus =
  | "completed"
  | "in_progress"
  | "pending"
  | "rejected";

interface MembershipApplicationSubStep {
  key: string;
  label: string;
  status: ApplicationStepStatus;
}

interface MembershipApplicationStep {
  step: number;
  key: string;
  label: string;
  status: ApplicationStepStatus;
  completedAt?: string | null;
  subSteps?: MembershipApplicationSubStep[];
}

interface MembershipApplicationStatus {
  currentStep: number;
  overallStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  steps: MembershipApplicationStep[];
}

interface Profile {
  country?: string;
  profilePicture?: string;
  bio?: string;
  city?: string;
  gender?: string;
  bioVideo?: string;
}

type UserRoleType = {
  id: number;
  name: string;
};

interface User {
  id: number;
  name: string;
  email?: string;
  phoneNumber?: string;
  isActive: boolean;
  isEnabled: boolean;
  isSoftDeleted: boolean;
  roleId: number;
  Role: UserRoleType;
  membership: Membership | null;
  profile: Profile | null;
  membershipApplicationStatus?: MembershipApplicationStatus;
}

interface Product {
  id: number;
  name: string;
  price: string;
  primaryImage?: string;
  image?: string;
  description?: string;
  createdAt: string;
}

interface Discount {
  id: number;
  title: string;
  description?: string;
  discountCode: string;
  value: number;
  startDate: string;
  validUntil: string;
  isActive: boolean;
}

interface Service {
  id: number;
  name: string;
  brand?: string;
  description?: string;
  primaryImage?: string;
  image?: string;
  createdAt: string;
}

type TabData = {
  product: Product[];
  discount: Discount[];
  service: Service[];
};

type Pagination = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

export default function UserDetailsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("discount");
  const [tabData, setTabData] = useState<TabData>({
    product: [],
    discount: [],
    service: [],
  });
  const [tabLoading, setTabLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const limit: number = 8;
  const [showSoftDeleteModal, setShowSoftDeleteModal] =
    useState<boolean>(false);
  const [showMembershipStatusModal, setShowMembershipStatusModal] =
    useState<boolean>(false);
  const token = useAuthStore((state) => state.token);
  const loggedInUser = useAuthStore((state) => state.user);
  const router = useRouter();
  const { id, returnPath } = router.query;
  const excludedDocumentExpiryRoleIds = [
    RoleId.INDIVIDUAL,
    RoleId.CORPORATE,
    RoleId.ELECTION_COMMISSIONER,
    RoleId.ELECTION_COMMITTEE_MEMBER,
  ];

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/${id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { token }),
          },
        },
      );

      const userData = await response.json();
      if (userData.error) {
        toast.error(userData.error[0].msg);
        if (userData.error[0].path === "token") {
          router.push("/");
        }
      } else {
        setUser(userData.data);
      }
    } catch (error) {
      toast.error("Error fetching user details");
    } finally {
      setLoading(false);
    }
  };

  const fetchTabData = async () => {
    if (!token || token === "undefined" || !id) return;

    const path = `${process.env.NEXT_PUBLIC_API_URL}/api/${activeTab}/user/${id}`;

    try {
      setTabLoading(true);

      const response = await fetch(
        `${path}?page=${currentPage}&limit=${limit}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token,
          },
        },
      );

      const data = await response.json();

      if (data.error) {
        toast.error(data.error[0]?.msg || `Error fetching ${activeTab}`);
        if (data.error[0]?.path === "token") {
          router.push("/");
        }
      } else {
        if (activeTab === "discount") {
          setTabData((prevData) => ({
            ...prevData,
            discount: data.data.map((item: any) => ({
              ...item,
              startDate: item.startDate,
              validUntil: item.validUntil,
            })),
          }));
        } else {
          setTabData((prevData) => ({
            ...prevData,
            [activeTab]: data.data.map((item: any) => ({
              ...item,
              image:
                item.image ||
                item.primaryImage ||
                "/placeholder.svg?height=100&width=100",
              primaryImage: item.primaryImage || item.image,
              date: formatDateAndTime(item.createdAt || item.date),
            })),
          }));
        }

        setPagination(data.pagination);
      }
    } catch (error) {
      toast.error(`Error fetching ${activeTab}`);
    } finally {
      setTabLoading(false);
    }
  };

  useEffect(() => {
    if (!id || !token || token === "undefined") {
      return;
    }

    fetchUserDetails();
  }, [id, token, router]);

  useEffect(() => {
    if (router.isReady && id && !loading && token) {
      fetchTabData();
    }
  }, [router.isReady, id, activeTab, currentPage, loading]);

  const handleToggleEnabled = async () => {
    if (!user || !token) return;

    try {
      setIsUpdating(true);
      if (user.isEnabled) {
        const res = await disableUser(token, user.id);
        toast.success(res.message || "User disabled successfully");
      } else {
        const res = await enableUser(token, user.id);
        toast.success(res.message || "User enabled successfully");
      }

      fetchUserDetails();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update user status",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (pagination && page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  };

  const isVisibleContactValue = (value?: string) => {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    return normalized !== "hidden" && normalized !== "na";
  };

  const formatGenderLabel = (value?: string) => {
    if (!value) return "NA";
    switch (value) {
      case "MALE":
        return "Male";
      case "FEMALE":
        return "Female";
      default:
        return value;
    }
  };

  const isValidVideoUrl = (url?: string) => {
    if (!url) return false;
    const normalized = url.trim();
    const videoPatterns = [
      /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i,
      /^https?:\/\/(www\.)?vimeo\.com\/.+/i,
      /^https?:\/\/.+\.(mp4|webm|ogg)(\?.*)?$/i,
      /^https?:\/\/[^\s]+\.s3[.-][^\s]+\.amazonaws\.com\/.+/i,
      /^https?:\/\/[^\s]+\.amazonaws\.com\/.+/i,
    ];
    return videoPatterns.some((pattern) => pattern.test(normalized));
  };

  const logContactActivity = async (
    interaction: "CLICK" | "COPY",
    interactionType: "EMAIL" | "PHONE",
    value?: string,
  ) => {
    if (!token || !isVisibleContactValue(value)) return;

    try {
      await createActivityLog(token, {
        interaction,
        interactionType,
        payload: value!.trim(),
      });
    } catch {
      // Activity logs should not block user actions.
    }
  };

  const handleEmailClick = async () => {
    const email = user?.email;
    if (!isVisibleContactValue(email)) return;

    await logContactActivity("CLICK", "EMAIL", email);
    window.location.href = `mailto:${email}`;
  };

  const handlePhoneClick = async () => {
    const phoneNumber = user?.phoneNumber;
    if (!isVisibleContactValue(phoneNumber)) return;

    await logContactActivity("CLICK", "PHONE", phoneNumber);
    window.location.href = `tel:${phoneNumber}`;
  };

  const handleCopyEmail = async () => {
    const email = user?.email;
    if (!isVisibleContactValue(email)) return;

    try {
      await navigator.clipboard.writeText(email!.trim());
      await logContactActivity("COPY", "EMAIL", email);
    } catch {}
  };

  const handleCopyPhone = async () => {
    const phoneNumber = user?.phoneNumber;
    if (!isVisibleContactValue(phoneNumber)) return;

    try {
      await navigator.clipboard.writeText(phoneNumber!.trim());
      await logContactActivity("COPY", "PHONE", phoneNumber);
    } catch {}
  };

  const renderTabContent = () => {
    const items = tabData[activeTab as keyof TabData];

    if (tabLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loading />
        </div>
      );
    }

    if (!items || items.length === 0) {
      return (
        <div className="flex justify-center items-center h-40">
          <p className="text-gray-500 dark:text-gray-400">No items found</p>
        </div>
      );
    }

    return (
      <>
        {activeTab === "product" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
              {tabData.product.map((item) => (
                <Link
                  key={item.id}
                  href={`/Product/${item.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                >
                  <div className="cursor-pointer">
                    <div className="relative h-40 w-full bg-gray-200 dark:bg-gray-700">
                      {item.primaryImage ? (
                        <Image
                          src={item.primaryImage}
                          alt={item.name}
                          fill
                          style={{ objectFit: "cover" }}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="transition-transform duration-300 hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-r from-gold-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold"></div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {item.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 mt-1">
                        {item.price}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {activeTab === "discount" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
              {tabData.discount.map((item) => (
                <Link
                  key={item.id}
                  href={`/discount/${item.id}`}
                  className="mb-4 p-4 bg-white dark:bg-gray-800 border rounded-lg shadow hover:shadow-lg transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {item.description}
                  </p>
                  <p className="text-sm text-gold-700 dark:text-gold-400 mt-2">
                    Code: <strong>{item.discountCode}</strong>
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Value: {item.value}% off
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Valid: {new Date(item.startDate).toLocaleDateString()} to{" "}
                    {new Date(item.validUntil).toLocaleDateString()}
                  </p>
                  <span
                    className={`inline-block mt-3 px-2 py-1 text-xs rounded-full ${
                      item.isActive
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                  >
                    {item.isActive ? "Active" : "Inactive"}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}

        {activeTab === "service" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
              {tabData.service.map((item) => (
                <Link
                  key={item.id}
                  href={`/service/${item.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                >
                  <div className="cursor-pointer">
                    <div className="relative h-40 w-full bg-gray-200 dark:bg-gray-700">
                      {item.primaryImage ? (
                        <Image
                          src={item.primaryImage}
                          alt={item.name}
                          fill
                          style={{ objectFit: "cover" }}
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="transition-transform duration-300 hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold"></div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {item.name}
                      </h3>
                      {item.brand && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {item.brand}
                        </p>
                      )}
                      {item.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <div className="flex flex-wrap justify-center items-center gap-2 overflow-x-auto max-w-full px-2">
              <button
                className={`px-4 py-2 rounded-lg text-white ${
                  currentPage === 1
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gold-500 hover:bg-gold-600"
                }`}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || tabLoading}
              >
                Prev
              </button>

              {(() => {
                const pages = [];
                const totalPages = pagination.totalPages;
                const maxVisiblePages = 3;

                if (totalPages <= maxVisiblePages + 2) {
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  if (currentPage <= maxVisiblePages) {
                    pages.push(1, 2, 3, "...", totalPages);
                  } else if (currentPage >= totalPages - maxVisiblePages + 1) {
                    pages.push(
                      1,
                      "...",
                      totalPages - 2,
                      totalPages - 1,
                      totalPages,
                    );
                  } else {
                    pages.push(
                      1,
                      "...",
                      currentPage - 1,
                      currentPage,
                      currentPage + 1,
                      "...",
                      totalPages,
                    );
                  }
                }

                return pages.map((page, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      typeof page === "number" && handlePageChange(page)
                    }
                    disabled={page === "..." || tabLoading}
                    className={`px-3 py-1 rounded-md ${
                      currentPage === page
                        ? "bg-gold-500 text-white"
                        : "bg-gray-200 text-black hover:bg-gray-300"
                    }`}
                  >
                    {page}
                  </button>
                ));
              })()}

              <button
                className={`px-4 py-2 rounded-lg text-white ${
                  currentPage === pagination.totalPages
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gold-500 hover:bg-gold-600"
                }`}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.totalPages || tabLoading}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <div className="p-4 bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* Header with back button */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <button
              onClick={() => {
                if (returnPath && typeof returnPath === "string") {
                  router.push(decodeURIComponent(returnPath));
                } else {
                  router.push("/users");
                }
              }}
              className="mr-4 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-500"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                ></path>
              </svg>
            </button>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              User Details
            </h3>
          </div>

          {user && (
            <div className="flex items-center gap-2">
              <Can I="manage" a="Membership">
                <button
                  onClick={() => setShowMembershipStatusModal(true)}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  title="View membership application status"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                  Membership Status
                </button>
              </Can>
              {user.isActive && (
                <>
                  <Can I="approve" a="User">
                    <button
                      onClick={handleToggleEnabled}
                      disabled={isUpdating}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                        user.isEnabled
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "bg-green-600 hover:bg-green-700 text-white"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isUpdating ? (
                        <>
                          <div className="h-4 w-4 border-t-2 border-white rounded-full animate-spin"></div>
                          Updating...
                        </>
                      ) : user.isEnabled ? (
                        <>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                            />
                          </svg>
                          Disable User
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Enable User
                        </>
                      )}
                    </button>
                  </Can>
                  {!user.isSoftDeleted && (
                    <Can I="create" a="SoftDeleteRequest">
                      <button
                        onClick={() => setShowSoftDeleteModal(true)}
                        className="px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                        title="Initiate Soft Delete Request"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        Initiate Soft Delete
                      </button>
                    </Can>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gold-500"></div>
          </div>
        ) : !user ? (
          <div className="flex flex-col items-center justify-center p-10 text-center">
            <svg
              className="w-12 h-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300">
              User not found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              The user may have been deleted or you may not have permission to
              view this user.
            </p>
            <Link
              href="/users"
              className="mt-4 px-4 py-2 bg-gold-600 text-gray-800 rounded-lg hover:bg-gold-700"
            >
              Back to Users
            </Link>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
            <div className="p-6">
              <div className="h-32 w-32 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-700 flex items-center justify-center mb-4">
                {user.profile?.profilePicture ? (
                  <Image
                    src={user.profile.profilePicture}
                    alt="Profile Picture"
                    width={128}
                    height={128}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="h-32 w-32 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 text-4xl font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {user.name}
                  </h1>
                  <span
                    className={`inline-block px-2 py-1 mt-2 text-xs rounded-full ${
                      user.isActive
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>

                  <span
                    className={`inline-block px-2 py-1 mt-2 text-xs rounded-full ${
                      user.Role.name === "ADMIN"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                  >
                    {user.Role.name}
                  </span>
                </div>
              </div>

              <div className="pt-6 space-y-6">
                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                    <svg
                      className="w-6 h-6 mr-2 text-gold-600 dark:text-gold-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      ></path>
                    </svg>
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Phone Number
                      </p>
                      {isVisibleContactValue(user.phoneNumber) ? (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handlePhoneClick}
                            className="text-base font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                          >
                            {user.phoneNumber}
                          </button>
                          <button
                            type="button"
                            onClick={handleCopyPhone}
                            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
                          >
                            Copy
                          </button>
                        </div>
                      ) : (
                        <p className="text-base font-semibold text-gray-900 dark:text-white">
                          {user.phoneNumber || "NA"}
                        </p>
                      )}
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Email Address
                      </p>
                      {isVisibleContactValue(user.email) ? (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleEmailClick}
                            className="text-base font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline break-all text-left"
                          >
                            {user.email}
                          </button>
                          <button
                            type="button"
                            onClick={handleCopyEmail}
                            className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
                          >
                            Copy
                          </button>
                        </div>
                      ) : (
                        <p className="text-base font-semibold text-gray-900 dark:text-white">
                          {user.email || "NA"}
                        </p>
                      )}
                    </div>
                    {(user.profile?.city || user.membership?.city) && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                          City of Residence
                        </p>
                        <p className="text-base font-semibold text-gray-900 dark:text-white">
                          {user.profile?.city || user.membership?.city || "NA"}
                        </p>
                      </div>
                    )}
                    {user.profile?.country && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                          Country of Residence
                        </p>
                        <p className="text-base font-semibold text-gray-900 dark:text-white">
                          {user.profile?.country || "NA"}
                        </p>
                      </div>
                    )}
                    {/* <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Gender
                      </p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {formatGenderLabel(user.profile?.gender)}
                      </p>
                    </div> */}
                  </div>
                  {user.profile?.bio && (
                    <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                        Bio
                      </p>
                      <p className="text-base text-gray-900 dark:text-white whitespace-pre-wrap">
                        {user.profile.bio}
                      </p>
                    </div>
                  )}
                  {isValidVideoUrl(user.profile?.bioVideo) && (
                    <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">
                        Bio Video
                      </p>
                      <VideoPlayer
                        url={user.profile?.bioVideo as string}
                        title={`${user.name} bio video`}
                        height={400}
                      />
                    </div>
                  )}
                </div>

                {/* Company Information Section */}
                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                    <svg
                      className="w-6 h-6 mr-2 text-gold-600 dark:text-gold-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      ></path>
                    </svg>
                    Company Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Company Name
                      </p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {user.membership?.companyName || "NA"}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Website
                      </p>
                      {user.membership?.website ? (
                        <a
                          href={user.membership.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 break-all font-semibold"
                        >
                          {user.membership.website}
                        </a>
                      ) : (
                        <p className="text-base font-semibold text-gray-900 dark:text-white">
                          NA
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Membership Details Section */}
                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600 shadow-sm">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                    <svg
                      className="w-6 h-6 mr-2 text-gold-600 dark:text-gold-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      ></path>
                    </svg>
                    Membership Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Membership ID
                      </p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {user.membership?.membershipId || "NA"}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Membership Category
                      </p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {user.membership?.membershipCategoryRef?.name || "NA"}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Membership Sub-category
                      </p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {user.membership?.membershipSubCategoryRef?.name ||
                          "NA"}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Business Groups
                      </p>
                      {user.membership?.businessGroup &&
                      user.membership.businessGroup.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {user.membership.businessGroup.map((group) => (
                            <span
                              key={group.id}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                            >
                              {group.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-base font-semibold text-gray-900 dark:text-white">
                          NA
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Document Expiry Dates Section */}
                  {loggedInUser?.roleId &&
                    !excludedDocumentExpiryRoleIds.includes(
                      loggedInUser.roleId,
                    ) &&
                    (user.membership?.tradeLicenseExpiry ||
                      user.membership?.passportExpiryDate ||
                      user.membership?.emiratesIdExpiryDate) && (
                      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                          <svg
                            className="w-5 h-5 mr-2 text-gold-600 dark:text-gold-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            ></path>
                          </svg>
                          Document Expiry Dates
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {user.membership.tradeLicenseExpiry && (
                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700 shadow-sm">
                              <div className="flex items-center mb-2">
                                <svg
                                  className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                  ></path>
                                </svg>
                                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                                  Trade License
                                </p>
                              </div>
                              <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">
                                Expiry Date
                              </p>
                              <p className="text-base font-bold text-blue-900 dark:text-blue-100">
                                {formatDateAndTime(
                                  user.membership.tradeLicenseExpiry,
                                )}
                              </p>
                            </div>
                          )}
                          {user.membership.passportExpiryDate && (
                            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-4 border border-green-200 dark:border-green-700 shadow-sm">
                              <div className="flex items-center mb-2">
                                <svg
                                  className="w-5 h-5 mr-2 text-green-600 dark:text-green-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                                  ></path>
                                </svg>
                                <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">
                                  Passport
                                </p>
                              </div>
                              <p className="text-sm text-green-600 dark:text-green-400 mb-1">
                                Expiry Date
                              </p>
                              <p className="text-base font-bold text-green-900 dark:text-green-100">
                                {formatDateAndTime(
                                  user.membership.passportExpiryDate,
                                )}
                              </p>
                            </div>
                          )}
                          {user.membership.emiratesIdExpiryDate && (
                            <div className="bg-gradient-to-br from-gold-50 to-gold-100 dark:from-gold-900/30 dark:to-gold-800/30 rounded-lg p-4 border border-gold-200 dark:border-gold-700 shadow-sm">
                              <div className="flex items-center mb-2">
                                <svg
                                  className="w-5 h-5 mr-2 text-gold-600 dark:text-gold-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                                  ></path>
                                </svg>
                                <p className="text-xs font-semibold text-gold-700 dark:text-gold-300 uppercase tracking-wide">
                                  Emirates ID
                                </p>
                              </div>
                              <p className="text-sm text-gold-600 dark:text-gold-400 mb-1">
                                Expiry Date
                              </p>
                              <p className="text-base font-bold text-gold-900 dark:text-gold-100">
                                {formatDateAndTime(
                                  user.membership.emiratesIdExpiryDate,
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between">
                  <button
                    onClick={() => {
                      if (returnPath && typeof returnPath === "string") {
                        router.push(decodeURIComponent(returnPath));
                      } else {
                        router.push("/users");
                      }
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    {returnPath && typeof returnPath === "string"
                      ? "Back"
                      : "Back to Users"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs Section */}
        {user && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex -mb-px overflow-x-auto">
                {["product", "discount", "service"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      setCurrentPage(1);
                    }}
                    className={`py-4 px-6 text-center border-b-2 font-medium text-sm focus:outline-none transition-colors duration-200 ${
                      activeTab === tab
                        ? "border-gold-500 text-gold-600 dark:text-gold-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}s
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">{renderTabContent()}</div>
          </div>
        )}
      </div>

      <SoftDeleteRequestModal
        isOpen={showSoftDeleteModal}
        onClose={() => setShowSoftDeleteModal(false)}
        user={user}
        token={token || ""}
        onSuccess={fetchUserDetails}
      />

      <MembershipApplicationStatusModal
        isOpen={showMembershipStatusModal}
        onClose={() => setShowMembershipStatusModal(false)}
        user={user}
      />
    </>
  );
}
