"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import {
  createCheckoutSession,
} from "@/services/stripe";
import "react-toastify/dist/ReactToastify.css";
import {
  useQuery,
  useMutation,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";
import { addAddress } from "@/services/carts";
import { UserProfile } from "@/types/user";
import { fetchUserProfile } from "@/services/users";
import CurrencyAmount from "@/components/ui/CurrencyAmount";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1 * 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  productName: string;
  productImage: string;
  seller: string;
  sellerId: number;
}

interface Cart {
  id: number;
  userId: number;
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

interface Address {
  id: number;
  userId: number;
  addressLine1: string;
  addressLine2: string;
  country: string;
  city: string;
  zipCode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T> {
  message: string;
  data: T;
  error?: { msg: string; path?: string }[];
}

interface AddressFormData {
  addressLine1: string;
  addressLine2: string;
  country: string;
  city: string;
  zipCode: string;
}

export default function CheckoutWithQueryClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <CheckoutPage />
    </QueryClientProvider>
  );
}

function CheckoutPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    null
  );
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [isDisclaimerModalOpen, setIsDisclaimerModalOpen] = useState(false);
  const disclaimerModalRef = useRef<HTMLDivElement>(null);

  const totalQuery = router.query.total;

  const totalPrice =
    typeof totalQuery === "string" ? parseFloat(totalQuery) : 0;

  const [addressFormData, setAddressFormData] = useState<AddressFormData>({
    addressLine1: "",
    addressLine2: "",
    country: "",
    city: "",
    zipCode: "",
  });

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        if (!token) return;
        const profile = await fetchUserProfile(token);
        setUserProfile(profile);
      } catch (err) {
        toast.error("Failed to load user details");
        console.error(err);
      } finally {
        setUserLoading(false);
      }
    };

    loadUserProfile();
  }, [token]);

  const confirmOrderWithStripe = async (
    transactionId: string,
    type: string
  ) => {
    localStorage.removeItem("checkout_address_id");
    toast.success("Order placed successfully!");
    setTimeout(() => {
      router.push("/order-history");
    }, 2000);
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    const sessionId = url.searchParams.get("session_id");
    const paymentIntentId = url.searchParams.get("payment_intent");
    const addressIdFromUrl = url.searchParams.get("address_id");

    if ((sessionId || paymentIntentId) && !hasRedirected) {
      const transactionId = sessionId || paymentIntentId;

      if (addressIdFromUrl && !selectedAddressId) {
        setSelectedAddressId(parseInt(addressIdFromUrl));
      }

      // Set flag to prevent multiple redirects
      setHasRedirected(true);

      // Immediate redirect without setTimeout to prevent navigation issues
      if (sessionId) {
        confirmOrderWithStripe(sessionId, "session");
      } else if (paymentIntentId) {
        confirmOrderWithStripe(paymentIntentId, "payment_intent");
      }
    }
  }, [selectedAddressId, hasRedirected]);


  const {
    data: cartResponse,
    isLoading: isCartLoading,
    error: cartError,
  } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      if (token === null || token === "undefined") {
        throw new Error("Authentication required");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/cart`,
        {
          headers: {
            "Content-Type": "application/json",
            token: token,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch cart");
      }

      const data: ApiResponse<Cart> = await response.json();
      if (data.error) {
        throw new Error(data.error[0]?.msg || "Error fetching cart");
      }

      return data;
    },
    enabled: !!token && !hasRedirected,
  });
  const {
    data: addressesResponse,
    isLoading: isAddressesLoading,
    error: addressesError,
    refetch: refetchAddresses,
  } = useQuery({
    queryKey: ["addresses"],
    queryFn: async () => {
      if (token === null || token === "undefined") {
        throw new Error("Authentication required");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/address/my/address`,
        {
          headers: {
            "Content-Type": "application/json",
            token: token,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch addresses");
      }

      const data: ApiResponse<Address[]> = await response.json();
      if (data.error) {
        throw new Error(data.error[0]?.msg || "Error fetching addresses");
      }

      return data;
    },
    enabled: !!token && !hasRedirected,

  });

  const addAddressMutation = useMutation({
    mutationFn: async (addressData: AddressFormData) => {
      if (!token) throw new Error("Authentication required");
      return await addAddress(token, addressData);
    },
    onSuccess: (newAddress) => {
      toast.success("Address added and selected");
      setIsAddressModalOpen(false);
      refetchAddresses();
      setSelectedAddressId(newAddress.id);
    },
    onError: (error) => {
      toast.error((error as Error).message || "Failed to add address");
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setIsAddressModalOpen(false);
      }
      
      if (
        disclaimerModalRef.current &&
        !disclaimerModalRef.current.contains(event.target as Node)
      ) {
        setIsDisclaimerModalOpen(false);
      }
    };

    if (isAddressModalOpen || isDisclaimerModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAddressModalOpen, isDisclaimerModalOpen]);

  useEffect(() => {
    if (cartError) {
      toast.error((cartError as Error).message);
      if ((cartError as Error).message.includes("Authentication required")) {
        router.push("/");
      }
    }
    if (addressesError) {
      toast.error((addressesError as Error).message);
    }
  }, [cartError, addressesError, router]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setIsAddressModalOpen(false);
      }
    };

    if (isAddressModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAddressModalOpen]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setAddressFormData({
      ...addressFormData,
      [name]: value,
    });
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAddressMutation.mutate(addressFormData);
  };

  if (isCartLoading || isAddressesLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const cart = cartResponse?.data;
  const addresses = addressesResponse?.data || [];

  const handleStripeCheckout = async () => {
    if (!selectedAddressId) {
      toast.error("Please select a delivery address");
      return;
    }

    if (!cart || cart.items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    setIsDisclaimerModalOpen(true);
  };

  const processPayment = async () => {
    setIsDisclaimerModalOpen(false);

    if (!cart || cart.items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    try {
      setIsInitializingPayment(true);
      const stripeItems = cart.items.map((item: any) => ({
        name: item.productName || `Product ${item.productId}`,
        price: item.price,
        quantity: item.quantity || 1,
        images: item.productImage ? [item.productImage] : [],
      }));
      if (selectedAddressId) {
        localStorage.setItem("checkout_address_id", selectedAddressId.toString());
      }
      const successUrl = `${window.location.origin}/checkout?session_id={CHECKOUT_SESSION_ID}&address_id=${selectedAddressId}`;
      const cancelUrl = `${window.location.origin}/cart`;
      const { url } = await createCheckoutSession(
        token || "",
        stripeItems,
        successUrl,
        cancelUrl,
        { orderId: cart.id?.toString() || "" },
        selectedAddressId?.toString() 
      );

      if (url) {
        window.location.href = url;
      } else {
        throw new Error("Failed to create checkout session");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Payment failed to initialize");
    } finally {
      setIsInitializingPayment(false);
    }
  };

  return (
    <>
      <Head>
        <title>Checkout - PBC Dubai</title>
        <meta name="description" content="Complete your purchase" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Checkout
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Delivery Address
                    </h2>
                    <button
                      onClick={() => setIsAddressModalOpen(true)}
                      className="px-4 py-2 bg-gold-600 text-white rounded-md hover:bg-gold-700 transition-colors text-sm"
                    >
                      Add New Address
                    </button>
                  </div>

                  {addresses.length === 0 ? (
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-md">
                      <p className="text-yellow-800 dark:text-yellow-200">
                        You don&apos;t have any saved addresses. Please add a
                        delivery address to continue.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4">
                        <label
                          htmlFor="addressSelect"
                          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                        >
                          Select a delivery address
                        </label>
                        <select
                          id="addressSelect"
                          value={selectedAddressId ?? ""}
                          onChange={(e) =>
                            setSelectedAddressId(Number(e.target.value))
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="" disabled hidden>
                            Select Address
                          </option>
                          {addresses.map((address) => (
                            <option key={address.id} value={address.id}>
                              {address.addressLine1}, {address.city},{" "}
                              {address.country}{" "}
                              {address.isDefault ? "(Default)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedAddressId && (
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                          {(() => {
                            const selectedAddress = addresses.find(
                              (a) => a.id === selectedAddressId
                            );
                            if (!selectedAddress) return null;

                            return (
                              <>
                                <p className="font-medium text-gray-900 dark:text-white mb-2">
                                  Selected Address:
                                </p>
                                <p className="text-gray-700 dark:text-gray-300">
                                  {selectedAddress.addressLine1}
                                  <br />
                                  {selectedAddress.addressLine2}
                                  <br />
                                  {selectedAddress.city},{" "}
                                  {selectedAddress.zipCode}
                                  <br />
                                  {selectedAddress.country}
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                    Order Summary
                  </h2>

                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Subtotal ({cart?.items?.length || 0} items)
                      </span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        <CurrencyAmount amount={totalPrice} />
                      </span>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between">
                        <span className="text-lg font-medium text-gray-900 dark:text-white">
                          Total
                        </span>
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          <CurrencyAmount amount={totalPrice} />
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={handleStripeCheckout}
                      disabled={!selectedAddressId || isInitializingPayment}
                      className={`w-full py-3 px-4 rounded-md font-medium text-white ${
                        !selectedAddressId || isInitializingPayment
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-gold-600 hover:bg-gold-700"
                      } transition-colors`}
                    >
                      {isInitializingPayment ? (
                        <span className="flex justify-center items-center gap-2">
                          <svg
                            className="animate-spin h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                          Processing...
                        </span>
                      ) : (
                        "Pay with Stripe"
                      )}
                    </button>

                    <Link href="/cart">
                      <div className="block w-full text-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        Back to Cart
                      </div>
                    </Link>
                  </div>

                  <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      By placing your order, you agree to our{" "}
                      <a
                        href="/privacy-policy"
                        className="text-gold-600 dark:text-gold-400 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Privacy Policy
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div
            ref={modalRef}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Add New Address
                </h2>
                <button
                  onClick={() => setIsAddressModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddressSubmit}>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="addressLine1"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Address Line 1 *
                    </label>
                    <input
                      type="text"
                      id="addressLine1"
                      name="addressLine1"
                      value={addressFormData.addressLine1}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="addressLine2"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Address Line 2
                    </label>
                    <input
                      type="text"
                      id="addressLine2"
                      name="addressLine2"
                      value={addressFormData.addressLine2}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="country"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Country *
                    </label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={addressFormData.country}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="city"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      City *
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={addressFormData.city}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="zipCode"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Zip Code *
                    </label>
                    <input
                      type="text"
                      id="zipCode"
                      name="zipCode"
                      value={addressFormData.zipCode}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gold-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white font-medium rounded-md transition-colors"
                    disabled={addAddressMutation.isPending}
                  >
                    {addAddressMutation.isPending ? "Adding..." : "Add Address"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {isDisclaimerModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div
            ref={disclaimerModalRef}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Payment Security Notice
                </h2>
                <button
                  onClick={() => setIsDisclaimerModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                You are about to be redirected to our secure payment processor. Your payment details are protected and never stored on our servers.
              </p>
              
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-4">
                Total amount: <CurrencyAmount amount={totalPrice} />
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsDisclaimerModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={processPayment}
                  className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white font-medium rounded-md"
                >
                  Proceed to Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
