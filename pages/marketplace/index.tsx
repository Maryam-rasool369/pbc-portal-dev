"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Image from "next/image";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useAuthStore from "@/store/authStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Category, Product, ProductWanted, RFQ, Service, ServiceCategory, ServiceRFQ, ServiceWanted } from "@/types/marketplace";
import { formatDate } from "@/utils/formatDate";
import Can from "@/components/rbac/Can";
import { useAbility } from "@/hooks/useAbility";
import CurrencyAmount from "@/components/ui/CurrencyAmount";

export default function Marketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<number | null>(null);
  const [selectedProductWantedCategory, setSelectedProductWantedCategory] = useState<number | null>(null);
  const [selectedServiceWantedCategory, setSelectedServiceWantedCategory] = useState<number | null>(null);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [serviceRfqs, setServiceRfqs] = useState<ServiceRFQ[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const headerRef = useRef<HTMLDivElement>(null);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const carouselRef = useRef<HTMLDivElement>(null);
  const serviceRfqCarouselRef = useRef<HTMLDivElement>(null);
  const ability = useAbility();

  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        const scrollPosition = window.scrollY;
        headerRef.current.style.backgroundPositionY = `${
          scrollPosition * 0.5
        }px`;
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (token === null || token === "undefined") {
        router.push("/");
        return;
      }

      try {
        setLoading(true);

        // Only fetch RFQs if user has permission to read them
        if (ability?.can("read", "RFQ")) {
          try {
            const rfqResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/rfq?page=1&limit=8`,
              {
                headers: {
                  "Content-Type": "application/json",
                  token: token,
                },
              },
            );

            const rfqData = await rfqResponse.json();
            if (rfqData.error) {
              // Silently handle permission errors - don't show toast if it's a permission issue
              if (!rfqData.error[0]?.msg?.includes("permission")) {
                toast.error(rfqData.error[0]?.msg || "Error fetching RFQs");
              }
            } else {
              setRfqs(
                rfqData.data.filter((rfq: RFQ) => rfq.userId !== Number(user?.id)),
              );
            }
          } catch (rfqError) {
            // Silently handle RFQ fetch errors if user doesn't have permission
            console.error("Error fetching RFQs:", rfqError);
          }
        }

        const categoryResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/category`,
          {
            headers: {
              "Content-Type": "application/json",
              token: token,
            },
          },
        );

        const categoryData = await categoryResponse.json();
        if (categoryData.error && !categoryData.error[0]?.msg?.includes("session")) {
          toast.error(
            categoryData.error[0]?.msg || "Error fetching categories",
          );
        } else {
          setCategories(categoryData.data || []);

          if (categoryData.data && categoryData.data.length > 0) {
            setSelectedCategory(categoryData.data[0].id);
            setSelectedProductWantedCategory(categoryData.data[0].id);
          }
        }

        // Fetch service categories
        try {
          const serviceCategoryResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/service-category?page=1&limit=50`,
            { headers: { "Content-Type": "application/json", token } },
          );
          const serviceCategoryData = await serviceCategoryResponse.json();
          if (!serviceCategoryData.error) {
            setServiceCategories(serviceCategoryData.data || []);
            if (serviceCategoryData.data && serviceCategoryData.data.length > 0) {
              setSelectedServiceCategory(serviceCategoryData.data[0].id);
              setSelectedServiceWantedCategory(serviceCategoryData.data[0].id);
            }
          }
        } catch {
          // silently ignore
        }

        // Fetch service RFQs if user has permission
        if (ability?.can("read", "ServiceRFQ")) {
          try {
            const serviceRfqResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/api/service-rfq?page=1&limit=8`,
              { headers: { "Content-Type": "application/json", token } },
            );
            const serviceRfqData = await serviceRfqResponse.json();
            if (!serviceRfqData.error) {
              setServiceRfqs(
                serviceRfqData.data.filter((rfq: ServiceRFQ) => rfq.userId !== Number(user?.id)),
              );
            }
          } catch {
            // silently ignore
          }
        }
      } catch (error) {
        toast.error("Error fetching marketplace data");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [token, router, ability, user?.id]);

  const {
    data: serviceData = [],
    isLoading: servicesLoading,
  } = useQuery<Service[]>({
    queryKey: ["servicesByCategory", selectedServiceCategory],
    queryFn: async () => {
      if (!selectedServiceCategory || token === null || token === "undefined") return [];
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/service/category/${selectedServiceCategory}?page=1&limit=20`,
        { headers: { "Content-Type": "application/json", ...(token && { token }) } },
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error[0]?.msg || "Error fetching services");
      return data.data || [];
    },
    enabled: !!selectedServiceCategory && !!token,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: productData = [],
    isLoading: productsLoading,
    isError: productError,
  } = useQuery<Product[]>({
    queryKey: ["products", selectedCategory, searchQuery],
    queryFn: async () => {
      if (!selectedCategory || token === null || token === "undefined")
        return [];
      const url = searchQuery
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/product/category/${selectedCategory}?search=${searchQuery}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/product/category/${selectedCategory}`;

      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { token }),
        },
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error[0]?.msg || "Error fetching products");
      }
      return data.data || [];
    },
    enabled: !!selectedCategory && !!token,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: productWantedData = [],
    isLoading: productWantedLoading,
  } = useQuery<ProductWanted[]>({
    queryKey: ["productsWantedByCategory", selectedProductWantedCategory],
    queryFn: async () => {
      if (!selectedProductWantedCategory || token === null || token === "undefined") return [];
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/product-wanted/category/${selectedProductWantedCategory}?page=1&limit=20`,
        { headers: { "Content-Type": "application/json", ...(token && { token }) } },
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error[0]?.msg || "Error fetching products wanted");
      return (data.data || []).filter(
        (item: ProductWanted) => item.userId !== Number(user?.id),
      );
    },
    enabled: !!selectedProductWantedCategory && !!token,
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: serviceWantedData = [],
    isLoading: serviceWantedLoading,
  } = useQuery<ServiceWanted[]>({
    queryKey: ["servicesWantedByCategory", selectedServiceWantedCategory],
    queryFn: async () => {
      if (!selectedServiceWantedCategory || token === null || token === "undefined") return [];
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/service-wanted/category/${selectedServiceWantedCategory}?page=1&limit=20`,
        { headers: { "Content-Type": "application/json", ...(token && { token }) } },
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error[0]?.msg || "Error fetching services wanted");
      return (data.data || []).filter(
        (item: ServiceWanted) => item.userId !== Number(user?.id),
      );
    },
    enabled: !!selectedServiceWantedCategory && !!token,
    staleTime: 1000 * 60 * 5,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleCategoryChange = (categoryId: number) => {
    setSelectedCategory(categoryId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="loader">
          <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>PBC Dubai - Marketplace</title>
        <meta name="description" content="Marketplace for PBC Dubai" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {/* <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 shadow-md py-3 px-4">
        <div className="container mx-auto flex items-center justify-between">
          <form onSubmit={handleSearch} className="flex-1 mr-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 pl-10 pr-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </form>
        </div>
      </div> */}

      <div className="container mx-auto px-4">
        <Can I="read" a="RFQ">
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
               Product RFQs
              </h2>
              <Link href={"/rfqList"}>
                <div className="text-gold-600 dark:text-gold-400 text-sm hover:underline">
                  View All
                </div>
              </Link>
            </div>

            <div className="relative">
              <div
                className="flex overflow-x-auto pb-4 space-x-4 scrollbar-hide"
                ref={carouselRef}
              >
                {rfqs.length > 0 ? (
                  rfqs.map((rfq) => (
                    <Link key={rfq.id} href={`/rfq/${rfq.id}`}>
                      <div>
                        <div
                          className="flex-shrink-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col"
                          style={{ height: "380px" }}
                        >
                          <div className="h-40 w-full relative flex-shrink-0">
                              <Image
                                src={rfq.primaryImage || "/images/placeholder-image.png"}
                                alt={rfq.primaryImage ? rfq.title : "Placeholder Image. No image available."}
                                layout="fill"
                                objectFit="cover"
                                className="rounded-t-lg"
                              />
                          </div>

                          <div
                            className="p-4 flex-grow overflow-y-auto"
                            style={{ maxHeight: "calc(420px - 160px)" }}
                          >
                            <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-1 break-words">
                              {rfq.title}
                            </h3>

                            <p className="text-gray-600 dark:text-gray-300 text-sm mb-2 break-words">
                              {rfq.categoryName}
                            </p>

                            <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                              Qty: {rfq.quantity} | Budget: <CurrencyAmount amount={rfq.budget} />
                            </p>

                            <div className="flex justify-between items-center">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                                Deadline: {formatDate(rfq.deadline)}
                              </p>
                              <p
                                className={`inline-block px-2 py-1 text-xs rounded-full font-semibold ${
                                  rfq.status === "OPEN"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                    : rfq.status === "AWARDED"
                                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                                }`}
                              >
                                {rfq.status}
                              </p>
                            </div>

                            <div className="mt-3 flex justify-between items-center">
                              <span className="text-sm text-gray-500 dark:text-gray-400 break-words">
                                Posted: {formatDate(rfq.createdAt)}
                              </span>
                              <button className="text-gold-600 dark:text-gold-400 text-sm hover:underline">
                                View Details
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="w-full text-center py-8 text-gray-500 dark:text-gray-400">
                    No RFQs available
                  </div>
                )}
              </div>

              <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -ml-4 hidden md:block">
                <button
                  onClick={() => {
                    if (carouselRef.current) {
                      carouselRef.current.scrollBy({
                        left: -300,
                        behavior: "smooth",
                      });
                    }
                  }}
                  className="p-1 rounded-full bg-white dark:bg-gray-800 shadow-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              </div>
              <div className="absolute top-1/2 right-0 transform -translate-y-1/2 -mr-4 hidden md:block">
                <button
                  onClick={() => {
                    if (carouselRef.current) {
                      carouselRef.current.scrollBy({
                        left: 300,
                        behavior: "smooth",
                      });
                    }
                  }}
                  className="p-1 rounded-full bg-white dark:bg-gray-800 shadow-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </Can>

        <Can I="read" a="Product">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Products
            </h2>
          </div>
          <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex overflow-x-auto scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.id)}
                  onMouseEnter={() =>
                    queryClient.prefetchQuery({
                      queryKey: ["products", category.id, ""],
                      queryFn: () =>
                        fetch(
                          `${process.env.NEXT_PUBLIC_API_URL}/api/product/category/${category.id}`,
                          {
                            headers: {
                              "Content-Type": "application/json",
                              ...(token && { token }),
                            },
                          },
                        ).then((res) => res.json().then((d) => d.data)),
                      staleTime: 1000 * 60 * 5,
                    })
                  }
                  className={`py-3 px-6 text-center whitespace-nowrap font-medium text-sm focus:outline-none transition-colors duration-200 ${
                    selectedCategory === category.id
                      ? "border-b-2 border-gold-500 text-gold-600 dark:text-gold-400"
                      : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {productsLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {productData && productData.length > 0 ? (
                productData.map((product: any) => (
                    <Link
                    key={product.id}
                    href={`/Product/${product.id}`}
                    className="block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300 h-full"
                  >
                    <div className="h-full flex flex-col">
                      <div className="relative h-48 bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                        <Image
                          src={
                            product.primaryImage ||
                            "/placeholder.svg?height=200&width=300"
                          }
                          alt={product.name}
                          layout="fill"
                          objectFit="cover"
                          className="transition-transform duration-300 hover:scale-105"
                        />
                      </div>
                      <div className="p-4 flex flex-col flex-grow">
                        <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-1 truncate">
                          {product.name}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2 flex-grow">
                          {product.description}
                        </p>

                        <div className="flex justify-between items-center mb-3">
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            View details for pricing
                          </span>
                        </div>

                        {product.type && (
                          <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                            <span className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full">
                              {product.type}
                            </span>
                          </div>
                        )}

                        <button className="w-full mt-auto py-2 bg-gold-600 text-gray-900 rounded-md hover:bg-gold-700 transition-colors">
                          View Details
                        </button>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                  No products found in this category
                </div>
              )}
            </div>
          )}
        </Can>

        {/* Product in Demand Section */}
        <Can I="read" a="ProductWanted">
          <div className="mt-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Product in Demand
              </h2>
            </div>

            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex overflow-x-auto scrollbar-hide">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedProductWantedCategory(category.id)}
                    onMouseEnter={() =>
                      queryClient.prefetchQuery({
                        queryKey: ["productsWantedByCategory", category.id],
                        queryFn: () =>
                          fetch(
                            `${process.env.NEXT_PUBLIC_API_URL}/api/product-wanted/category/${category.id}?page=1&limit=20`,
                            { headers: { "Content-Type": "application/json", ...(token && { token }) } },
                          ).then((res) =>
                            res.json().then((d) =>
                              (d.data || []).filter(
                                (item: ProductWanted) => item.userId !== Number(user?.id),
                              ),
                            ),
                          ),
                        staleTime: 1000 * 60 * 5,
                      })
                    }
                    className={`py-3 px-6 text-center whitespace-nowrap font-medium text-sm focus:outline-none transition-colors duration-200 ${
                      selectedProductWantedCategory === category.id
                        ? "border-b-2 border-gold-500 text-gold-600 dark:text-gold-400"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {productWantedLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {productWantedData && productWantedData.length > 0 ? (
                  productWantedData.map((item) => (
                    <Link
                      key={item.id}
                      href={`/product-wanted/${item.id}`}
                      className="block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300 h-full"
                    >
                      <div className="h-full flex flex-col">
                        <div className="relative h-48 bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                          {item.primaryImage ? (
                            <Image
                              src={item.primaryImage}
                              alt={item.name}
                              layout="fill"
                              objectFit="cover"
                              className="transition-transform duration-300 hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-r from-gold-500 via-purple-500 to-pink-500 flex items-center justify-center">
                              <span className="text-white font-bold text-lg">{item.name[0]}</span>
                            </div>
                          )}
                          <span className="absolute top-2 left-2 px-2 py-1 text-xs font-semibold rounded-full bg-gold-600 text-gray-900">
                            Demanded
                          </span>
                        </div>
                        <div className="p-4 flex flex-col flex-grow">
                          <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-1 truncate">
                            {item.name}
                          </h3>
                          <p className="text-gold-600 dark:text-gold-400 text-xs mb-1">
                            {item.category?.name}
                          </p>
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2 flex-grow">
                            {item.description}
                          </p>
                          <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                            <span className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full">
                              Qty needed: {item.quantity}
                            </span>
                          </div>
                          <button className="w-full mt-auto py-2 bg-gold-600 text-gray-900 rounded-md hover:bg-gold-700 transition-colors">
                            View Details
                          </button>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                    No products in demand for this category
                  </div>
                )}
              </div>
            )}
          </div>
        </Can>

        {/* Service RFQs Section */}
        <Can I="read" a="ServiceRFQ">
          <div className="mt-10 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Service RFQs
              </h2>
              <Link href={"/service-rfq-list"}>
                <div className="text-gold-600 dark:text-gold-400 text-sm hover:underline">
                  View All
                </div>
              </Link>
            </div>

            <div className="relative">
              <div
                className="flex overflow-x-auto pb-4 space-x-4 scrollbar-hide"
                ref={serviceRfqCarouselRef}
              >
                {serviceRfqs.length > 0 ? (
                  serviceRfqs.map((rfq) => (
                    <Link key={rfq.id} href={`/service-rfq/${rfq.id}`}>
                      <div
                        className="flex-shrink-0 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col"
                        style={{ height: "380px" }}
                      >
                        <div className="h-40 w-full relative flex-shrink-0">
                          <Image
                            src={rfq.primaryImage || "/images/placeholder-image.png"}
                            alt={rfq.primaryImage ? rfq.title : "Placeholder Image. No image available."}
                            layout="fill"
                            objectFit="cover"
                            className="rounded-t-lg"
                          />
                        </div>
                        <div className="p-4 flex-grow overflow-y-auto" style={{ maxHeight: "calc(420px - 160px)" }}>
                          <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-1 break-words">
                            {rfq.title}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-2 break-words">
                            {rfq.serviceCategory?.name}
                            {rfq.subCategory ? ` › ${rfq.subCategory.name}` : ""}
                          </p>
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">
                            Budget: <CurrencyAmount amount={rfq.budget} />
                          </p>
                          <div className="flex justify-between items-center">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-2">
                              Deadline: {formatDate(rfq.deadline)}
                            </p>
                            <p
                              className={`inline-block px-2 py-1 text-xs rounded-full font-semibold ${
                                rfq.status === "OPEN"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : rfq.status === "AWARDED"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              }`}
                            >
                              {rfq.status}
                            </p>
                          </div>
                          <div className="mt-3 flex justify-between items-center">
                            <span className="text-sm text-gray-500 dark:text-gray-400 break-words">
                              Posted: {formatDate(rfq.createdAt)}
                            </span>
                            <button className="text-gold-600 dark:text-gold-400 text-sm hover:underline">
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="w-full text-center py-8 text-gray-500 dark:text-gray-400">
                    No service RFQs available
                  </div>
                )}
              </div>

              <div className="absolute top-1/2 left-0 transform -translate-y-1/2 -ml-4 hidden md:block">
                <button
                  onClick={() => serviceRfqCarouselRef.current?.scrollBy({ left: -300, behavior: "smooth" })}
                  className="p-1 rounded-full bg-white dark:bg-gray-800 shadow-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
              <div className="absolute top-1/2 right-0 transform -translate-y-1/2 -mr-4 hidden md:block">
                <button
                  onClick={() => serviceRfqCarouselRef.current?.scrollBy({ left: 300, behavior: "smooth" })}
                  className="p-1 rounded-full bg-white dark:bg-gray-800 shadow-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </Can>

        {/* Services Section */}
        <Can I="read" a="Service">
          <div className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Services
              </h2>
            </div>

            {/* Service Category Tabs */}
            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex overflow-x-auto scrollbar-hide">
                {serviceCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedServiceCategory(cat.id)}
                    onMouseEnter={() =>
                      queryClient.prefetchQuery({
                        queryKey: ["servicesByCategory", cat.id],
                        queryFn: () =>
                          fetch(
                            `${process.env.NEXT_PUBLIC_API_URL}/api/service/category/${cat.id}?page=1&limit=20`,
                            { headers: { "Content-Type": "application/json", ...(token && { token }) } },
                          ).then((res) => res.json().then((d) => d.data)),
                        staleTime: 1000 * 60 * 5,
                      })
                    }
                    className={`py-3 px-6 text-center whitespace-nowrap font-medium text-sm focus:outline-none transition-colors duration-200 ${
                      selectedServiceCategory === cat.id
                        ? "border-b-2 border-gold-500 text-gold-600 dark:text-gold-400"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {servicesLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {serviceData && serviceData.length > 0 ? (
                  serviceData.map((service) => (
                    <Link
                      key={service.id}
                      href={`/service/${service.id}`}
                      className="block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300 h-full"
                    >
                      <div className="h-full flex flex-col">
                        <div className="relative h-48 bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                          {service.primaryImage ? (
                            <Image
                              src={service.primaryImage}
                              alt={service.name}
                              layout="fill"
                              objectFit="cover"
                              className="transition-transform duration-300 hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-r from-gold-500 via-purple-500 to-pink-500 flex items-center justify-center">
                              <span className="text-white font-bold text-lg">{service.name[0]}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-4 flex flex-col flex-grow">
                          <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-1 truncate">
                            {service.name}
                          </h3>
                          <p className="text-gold-600 dark:text-gold-400 text-xs mb-1">
                            {service.serviceCategory?.name}
                            {service.subCategory ? ` › ${service.subCategory.name}` : ""}
                          </p>
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2 flex-grow">
                            {service.description}
                          </p>
                          <button className="w-full mt-auto py-2 bg-gold-600 text-gray-900 rounded-md hover:bg-gold-700 transition-colors">
                            View Details
                          </button>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                    No services found in this category
                  </div>
                )}
              </div>
            )}
          </div>
        </Can>

        {/* Service in Demand Section */}
        <Can I="read" a="ServiceWanted">
          <div className="mt-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Service in Demand
              </h2>
            </div>

            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex overflow-x-auto scrollbar-hide">
                {serviceCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedServiceWantedCategory(cat.id)}
                    onMouseEnter={() =>
                      queryClient.prefetchQuery({
                        queryKey: ["servicesWantedByCategory", cat.id],
                        queryFn: () =>
                          fetch(
                            `${process.env.NEXT_PUBLIC_API_URL}/api/service-wanted/category/${cat.id}?page=1&limit=20`,
                            { headers: { "Content-Type": "application/json", ...(token && { token }) } },
                          ).then((res) =>
                            res.json().then((d) =>
                              (d.data || []).filter(
                                (item: ServiceWanted) => item.userId !== Number(user?.id),
                              ),
                            ),
                          ),
                        staleTime: 1000 * 60 * 5,
                      })
                    }
                    className={`py-3 px-6 text-center whitespace-nowrap font-medium text-sm focus:outline-none transition-colors duration-200 ${
                      selectedServiceWantedCategory === cat.id
                        ? "border-b-2 border-gold-500 text-gold-600 dark:text-gold-400"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {serviceWantedLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {serviceWantedData && serviceWantedData.length > 0 ? (
                  serviceWantedData.map((item) => (
                    <Link
                      key={item.id}
                      href={`/service-wanted/${item.id}`}
                      className="block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow duration-300 h-full"
                    >
                      <div className="h-full flex flex-col">
                        <div className="relative h-48 bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              layout="fill"
                              objectFit="cover"
                              className="transition-transform duration-300 hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-r from-gold-500 via-purple-500 to-pink-500 flex items-center justify-center">
                              <span className="text-white font-bold text-lg">{item.name[0]}</span>
                            </div>
                          )}
                          <span className="absolute top-2 left-2 px-2 py-1 text-xs font-semibold rounded-full bg-gold-600 text-gray-900">
                            Demanded
                          </span>
                        </div>
                        <div className="p-4 flex flex-col flex-grow">
                          <h3 className="font-medium text-gray-900 dark:text-white text-lg mb-1 truncate">
                            {item.name}
                          </h3>
                          <p className="text-gold-600 dark:text-gold-400 text-xs mb-1">
                            {item.serviceCategory?.name}
                            {item.subCategory ? ` › ${item.subCategory.name}` : ""}
                          </p>
                          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-2 flex-grow">
                            {item.description}
                          </p>
                          <button className="w-full mt-auto py-2 bg-gold-600 text-gray-900 rounded-md hover:bg-gold-700 transition-colors">
                            View Details
                          </button>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
                    No services in demand for this category
                  </div>
                )}
              </div>
            )}
          </div>
        </Can>
      </div>
    </>
  );
}
