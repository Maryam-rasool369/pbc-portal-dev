"use client";

import dynamic from "next/dynamic";
import useAuthStore from "@/store/authStore";
import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { FaArrowLeft } from "react-icons/fa";
import * as wishlistService from "@/services/wishlist";

const CKEditorClient = dynamic(() => import("@/components/CKEditorClient"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center py-10">
      <svg
        className="animate-spin h-6 w-6 text-gold-400"
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
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
        />
      </svg>
      <p className="ml-2 text-gold-400 text-sm">Loading Editor...</p>
    </div>
  ),
});

export default function NewWishlist() {
  const [title, setTitle] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef(null);

  const router = useRouter();

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!token || token === "undefined" || !user) {
      toast.error("You need to log in to create a wishlist");
      router.push("/");
      return;
    }

    if (user.Role?.name === "ADMIN") {
      toast.info("Admins cannot create wishlists");
      router.push("/wishlists");
      return;
    }
  }, [token, user, router]);

  useEffect(() => {
    if (submitted) {
      const redirectTimer = setTimeout(() => {
        router.push("/wishlists");
      }, 1500);

      return () => clearTimeout(redirectTimer);
    }
  }, [submitted, router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (user?.Role.name === "ADMIN") {
      toast.error("Admins cannot create wishlists");
      router.push("/wishlists");
      return;
    }

    if (!title.trim() || !suggestions.trim()) {
      toast.warn("Please fill in all fields.");
      return;
    }

    if (!token || token === "undefined") {
      toast.error("You are not authorized. Please log in.");
      router.push("/");
      return;
    }

    try {
      setLoading(true);
      setIsSubmitting(true);

      const res = await wishlistService.createWishlist(token, {
        title,
        suggestions,
      });

      toast.success(res.message || "Wishlist submitted for approval!");
      setSubmitted(true);
      setTitle("");
      setSuggestions("");
    } catch (error) {
      console.error("Failed to create wishlist:", error);
      toast.error(
        error instanceof Error ? error.message : "Something went wrong.",
      );
      setIsSubmitting(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !isSubmitting) {
    return (
      <>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto py-10 px-4">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl text-gold-500 font-bold">New Wishlist</h1>
          {!isSubmitting && (
            <button
              onClick={() => router.push("/wishlists")}
              className="text-gold-600 dark:text-gold-400 flex items-center hover:text-gold-800 dark:hover:text-gold-300"
              type="button"
            >
              {/* @ts-ignore */}
              <FaArrowLeft className="mr-2" />
              Back to Wishlists
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          {isSubmitting ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold-500 mx-auto mb-4"></div>
              <p className="text-gray-700 dark:text-gray-300">
                {submitted
                  ? "Redirecting to wishlists..."
                  : "Submitting your wishlist..."}
              </p>
            </div>
          ) : (
            <form ref={formRef} onSubmit={handleSave}>
              <div className="mb-4">
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  placeholder="Enter wishlist title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>

              <div className="mb-6">
                <label
                  htmlFor="suggestions"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Suggestions
                </label>
                <div className="border border-gray-300 rounded-md dark:border-gray-600 mt-1">
                  <CKEditorClient
                    value={suggestions}
                    onChange={setSuggestions}
                    readOnly={false}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-gold-500 text-gray-800 rounded-md hover:bg-gold-600 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:ring-offset-2 transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  Submit
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
