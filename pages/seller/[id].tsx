"use client";

import Head from "next/head";
import Loading from "@/components/ui/Loading";
import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useAuthStore from "@/store/authStore";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import demoImage from "@/public/images/users/userProfile2.png";
import Link from "next/link";
import { countries } from "countries-list";

interface UserProfile {
  id: number;
  name: string;
  email: string;
  Role: {
    id: number;
    name: string;
  };
  company: string;
  location: string;
  phoneNumber: string;
  joinDate: string;
  profilePicture: string;
  isActive: boolean;
  profile: {
    country: string | null;
    bio?: string;
    facebookSocial?: string;
    linkedInSocial?: string;
    tradeLicense?: string;
    passport?: string;
    emiratesId?: string;
  };
  isContactsVerfied: boolean;
}

interface Product {
  id: number;
  name: string;
  price: string;
  image: string;
  description?: string;
  createdAt: string;
}

interface RFQ {
  id: number;
  title: string;
  status: string;
  date: string;
  image: string;
  description?: string;
}

interface Order {
  id: number;
  orderNumber: string;
  total: string;
  status: string;
  date: string;
  image: string;
  items?: number;
}

interface Cart {
  id: number;
  name: string;
  items: number;
  total: string;
  date: string;
  image: string;
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

type TabData = {
  product: Product[];
  discount: Discount[];
};

type Pagination = {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
};

export default function UserMarketplace() {
  const [activeTab, setActiveTab] = useState("discount");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tabData, setTabData] = useState<TabData>({
    product: [],
    discount: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [tabLoading, setTabLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const limit: number = 8;

  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const id = router.query.id as string | undefined;

  const fetchUserProfile = async () => {
    if (!token || token === "undefined") {
      toast.error("User not authenticated");
      router.push("/");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/${id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token,
          },
        },
      );

      const userData = await response.json();

      if (!response.ok || !userData.data) {
        const errorMsg =
          userData?.error?.[0]?.msg ||
          userData?.message ||
          "Error fetching user profile";
        toast.error(errorMsg);
        return;
      }

      const user = userData.data;

      setUser({
        id: user.id,
        name: user.name,
        email: user.email,
        Role: user.Role,
        company: user.company || "Not specified",
        location: user.location || "Not specified",
        phoneNumber: user.phoneNumber || "Not specified",
        joinDate: formatDateAndTime(user.createdAt ?? new Date().toISOString()),
        profilePicture: user.profile?.profilePicture || "",
        isActive: user.isActive,
        isContactsVerfied: user?.isContactsVerfied || false,
        profile: {
          country: user.profile?.country || null,
          bio: user.profile?.bio || undefined,
          facebookSocial: user.profile?.facebookSocial || undefined,
          linkedInSocial: user.profile?.linkedInSocial || undefined,
          tradeLicense: user.profile?.tradeLicense || undefined,
          passport: user.profile?.passport || undefined,
          emiratesId: user.profile?.emiratesId || undefined,
        },
      });
    } catch (error) {
      console.error("Network error:", error);
      toast.error("Network error while fetching user profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchTabData = async () => {
    if (!token || token === "undefined") return;

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
          // Don't assign image or remap date for discount tab
          setTabData((prevData) => ({
            ...prevData,
            discount: data.data.map((item: any) => ({
              ...item,
              // Optional formatting if needed
              startDate: item.startDate,
              validUntil: item.validUntil,
            })),
          }));
        } else {
          // For products and other tabs
          setTabData((prevData) => ({
            ...prevData,
            [activeTab]: data.data.map((item: any) => ({
              ...item,
              image: item.image || "/placeholder.svg?height=100&width=100",
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
    if (router.isReady && id && token) {
      fetchUserProfile();
    }
  }, [router.isReady, id, token]);

  useEffect(() => {
    if (router.isReady && id && !loading) {
      fetchTabData();
    }
  }, [router.isReady, id, activeTab, currentPage, loading]);

  const handlePageChange = (page: number) => {
    if (pagination && page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  };

  const renderTabContent = () => {
    const items = tabData[activeTab as keyof TabData];

    if (tabLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loading/>
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
                  key={item.id}
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

  if (loading || !router.isReady || !id) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>PBC Dubai - User Profile</title>
        <meta name="description" content="User profile page for PBC Dubai" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex overflow-hidden bg-gray-50 dark:bg-gray-900 h-screen">
        <div className="relative flex flex-col flex-1 overflow-hidden">
          <div
            id="main-content"
            className="relative w-full h-full overflow-y-auto bg-gray-50 dark:bg-gray-900"
          >
            <div className="p-4">
              {user && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
                  <div className="h-40 bg-gradient-to-r from-gold-500 to-purple-600 relative">
                    <div className="absolute -bottom-16 left-6">
                      <div className="relative h-32 w-32 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-700 flex items-center justify-center">
                        {user.profilePicture ? (
                          <div className="relative h-32 w-32 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-700 flex items-center justify-center">
                            <Image
                              src={user.profilePicture}
                              alt="User Profile Picture"
                              width={128}
                              height={128}
                              className="rounded-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="relative h-32 w-32 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-700 flex items-center justify-center">
                            <Image
                              src={demoImage}
                              alt="Default Demo Image"
                              width={128}
                              height={128}
                              className="rounded-full object-cover opacity-80"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="pt-20 pb-6 px-6">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center">
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
                      </div>
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gold-100 dark:bg-gold-900 flex items-center justify-center mr-3">
                          <svg
                            className="h-5 w-5 text-gold-600 dark:text-gold-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5.121 17.804A7 7 0 0112 15a7 7 0 016.879 2.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Role
                          </p>
                          <p className="text-gray-900 dark:text-white">
                            {user?.Role?.name || ""}
                          </p>
                        </div>
                      </div>{" "}
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gold-100 dark:bg-gold-900 flex items-center justify-center mr-3">
                          <svg
                            className="h-5 w-5 text-gold-600 dark:text-gold-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Email
                          </p>
                          <p className="text-gray-900 dark:text-white">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gold-100 dark:bg-gold-900 flex items-center justify-center mr-3">
                          <svg
                            className="h-5 w-5 text-gold-600 dark:text-gold-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Phone
                          </p>
                          <p className="text-gray-900 dark:text-white">
                            {user.phoneNumber}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gold-100 dark:bg-gold-900 flex items-center justify-center mr-3">
                          <svg
                            className="h-5 w-5 text-gold-600 dark:text-gold-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5.121 17.804A7 7 0 0112 15a7 7 0 016.879 2.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Role
                          </p>
                          <p className="text-gray-900 dark:text-white">
                            {user.role}
                          </p>
                        </div>
                      </div>{" "}
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gold-100 dark:bg-gold-900 flex items-center justify-center mr-3">
                          <svg
                            className="h-5 w-5 text-gold-600 dark:text-gold-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Email
                          </p>
                          <p className="text-gray-900 dark:text-white">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gold-100 dark:bg-gold-900 flex items-center justify-center mr-3">
                          <svg
                            className="h-5 w-5 text-gold-600 dark:text-gold-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Phone
                          </p>
                          <p className="text-gray-900 dark:text-white">
                            {user.phoneNumber}
                          </p>
                        </div>
                      </div>
                    </div> */}
                  </div>
                </div>
              )}

              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex -mb-px overflow-x-auto">
                  {["product", "discount"].map((tab) => (
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
                      {/* <span className="ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs">
                        {tabData[tab as keyof TabData]?.length || 0}
                      </span> */}
                    </button>
                  ))}
                </nav>
              </div>

              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
