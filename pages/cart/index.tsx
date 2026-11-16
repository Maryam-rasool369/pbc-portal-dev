"use client";

import type React from "react";

import { useState, useEffect } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useQuery,
  useMutation,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";
import { fetchUserCarts, removeFromCart } from "@/services/carts";
import CurrencyAmount from "@/components/ui/CurrencyAmount";
import { Cart } from "@/types/marketplace";
import { verifyDiscount } from "@/services/carts";
import { createStandardAccount } from "@/services/stripe";

export default function CartWithQueryClient() {
  return <CartPage />;
}

function CartPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [couponCode, setCouponCode] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [discountCode, setDiscountCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);
  const {
    data: cart,
    isLoading,
    error,
    refetch,
  } = useQuery<Cart[]>({
    queryKey: ["carts"],
    queryFn: async () => {
      const data = await fetchUserCarts(token);
      if (!data || data.error) return { items: [] };
      return data.data;
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({
      itemId,
      quantity,
    }: {
      itemId: number;
      quantity: number;
    }) => {
      if (token === null || token === "undefined") {
        throw new Error("Authentication required");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cart/item/${itemId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            token: token,
          },
          body: JSON.stringify({ quantity }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update quantity");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error[0]?.msg || "Error updating quantity");
      }

      return data;
    },
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      toast.error((error as Error).message || "Failed to update quantity");
    },
  });

  const handleRemoveItem = (productId: number) => {
    setItemToDelete(productId);
    setShowDeleteModal(true);
  };

  const applyCouponMutation = useMutation({
    mutationFn: async (code: string) => {
      if (token === null || token === "undefined") {
        throw new Error("Authentication required");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cart/coupon`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            token: token,
          },
          body: JSON.stringify({ code }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to apply coupon");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error[0]?.msg || "Error applying coupon");
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Coupon applied successfully");
      setCouponCode("");
      refetch();
    },
    onError: (error) => {
      toast.error((error as Error).message || "Failed to apply coupon");
    },
  });

  useEffect(() => {
    if (error) {
      toast.error((error as Error).message);
      if ((error as Error).message.includes("Authentication required")) {
        router.push("/");
      }
    }
  }, [error, router]);

  const handleQuantityChange = (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    updateQuantityMutation.mutate({ itemId, quantity: newQuantity });
  };

  const handleApplyDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountCode.trim()) {
      toast.error("Please enter a discount code");
      return;
    }

    setIsVerifying(true);
    try {
      const response = await verifyDiscount(token, discountCode);
      if (response.data?.isDiscountApplied) {
        const percent = response.data.discountValue;
        setDiscountPercent(percent);
        toast.success(`Discount applied: ${percent}%`);
      } else {
        toast.error("Invalid or expired discount code");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!itemToDelete) return;

    try {
      await removeFromCart(token, itemToDelete);
      toast.success("Item removed from cart");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove item");
    } finally {
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Your Cart - PBC Dubai</title>
        <meta name="description" content="View and manage your shopping cart" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Your Shopping Cart
          </h1>

          {!cart || cart?.items?.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
              <div className="flex justify-center mb-6">
                <svg
                  className="w-24 h-24 text-gray-400 dark:text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Your cart is empty
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Looks like you have not added any products to your cart yet.
              </p>
              <Link href="/marketplace">
                <div className="px-6 py-3 bg-gold-600 text-gray-900 rounded-md hover:bg-gold-700 transition-colors inline-block">
                  Continue Shopping
                </div>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Cart Items ({cart?.items?.length})
                    </h2>

                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {cart?.items?.map((item) => (
                        <div key={item} className="py-6 first:pt-0 last:pb-0">
                          <div className="flex flex-col md:flex-row items-start">
                            <div className="relative h-24 w-24 flex-shrink-0 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                              <Image
                                src={
                                  item.productImage ||
                                  "/placeholder.svg?height=96&width=96"
                                }
                                alt={item.productName}
                                layout="fill"
                                objectFit="contain"
                                className="transition-opacity duration-300"
                                priority={true}
                                sizes="(max-width: 768px) 100vw, 50vw"
                              />
                            </div>
                            <div className="flex flex-1 flex-col mt-4 md:mt-0 md:ml-4">
                              <div className="flex justify-between">
                                <div>
                                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                    <Link href={`/Product/${item.productId}`}>
                                      <div className="hover:text-gold-600 dark:hover:text-gold-400">
                                        {item.productName}
                                      </div>
                                    </Link>
                                  </h3>
                                  {/* <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                    {item.product.description}
                                  </p> */}
                                </div>
                                <p className="text-lg font-medium text-gray-900 dark:text-white">
                                  <CurrencyAmount amount={item.price} />
                                </p>
                              </div>
                              <div className="flex items-center justify-end mt-4 flex-row">
                                {/* <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded">
                                  <button
                                    className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() =>
                                      handleQuantityChange(
                                        item.id,
                                        item.quantity - 1
                                      )
                                    }
                                    disabled={updateQuantityMutation.isPending}
                                  >
                                    -
                                  </button>
                                  <span className="px-4 py-1 text-gray-800 dark:text-gray-200">
                                    {item.quantity}
                                  </span>
                                  <button
                                    className="px-3 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    onClick={() =>
                                      handleQuantityChange(
                                        item.id,
                                        item.quantity + 1
                                      )
                                    }
                                    disabled={updateQuantityMutation.isPending}
                                  >
                                    +
                                  </button>
                                </div> */}

                                <button
                                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex flex-row gap-1"
                                  onClick={() =>
                                    handleRemoveItem(item.productId)
                                  }
                                >
                                  <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                  <div>Delete</div>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                      Order Summary
                    </h2>

                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">
                          Subtotal
                        </span>
                        <span className="text-gray-900 dark:text-white">
                          <CurrencyAmount amount={cart?.originalPrice} />
                        </span>
                      </div>

                      {discountPercent && (
                        <div className="flex justify-between text-green-600 font-medium">
                          <span>Discount ({discountPercent}%)</span>
                          <span>
                            -
                            <CurrencyAmount
                              amount={cart?.originalPrice * (discountPercent / 100)}
                            />
                          </span>
                        </div>
                      )}

                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between">
                          <span className="text-lg font-medium text-gray-900 dark:text-white">
                            Total
                          </span>
                          <span className="text-lg font-bold text-gray-900 dark:text-white">
                            <CurrencyAmount
                              amount={
                                discountPercent
                                  ? cart?.originalPrice -
                                      cart?.originalPrice * (discountPercent / 100)
                                  : cart?.originalPrice
                              }
                            />
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <form onSubmit={handleApplyDiscount}>
                        <label
                          htmlFor="discount"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                          Apply Discount Code
                        </label>
                        <div className="flex">
                          <input
                            type="text"
                            id="discount"
                            value={discountCode}
                            onChange={(e) => setDiscountCode(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Enter discount code"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 bg-gold-600 text-white rounded-r-md hover:bg-gold-700 transition-colors"
                            disabled={isVerifying}
                          >
                            Apply
                          </button>
                        </div>
                      </form>
                    </div>

                    <div className="mt-6">
                      <button
                        className="w-full block text-center px-6 py-3 bg-gold-600 text-white rounded-md hover:bg-gold-700 transition-colors"
                        onClick={() =>
                          router.push({
                            pathname: "/checkout",
                            query: {
                              total: discountPercent
                                ? cart?.originalPrice -
                                  cart?.originalPrice * (discountPercent / 100)
                                : cart?.originalPrice,
                            },
                          })
                        }
                      >
                        Proceed to Checkout
                      </button>
                    </div>

                    <div className="mt-4 text-center">
                      <Link href="/marketplace">
                        <div className="text-gold-600 dark:text-gold-400 hover:underline">
                          Continue Shopping
                        </div>
                      </Link>
                    </div>


                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-md shadow-md w-80">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Confirm Deletion
              </h2>
              <p className="mb-6 text-gray-700 dark:text-gray-300">
                Are you sure you want to delete this item from your cart?
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-white rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirmed}
                  className="px-4 py-2 bg-red-600 hover:bg-red-800 text-white rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
