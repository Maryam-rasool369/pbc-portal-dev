import React, { useState, useRef } from "react";
import AuthLayout from "@/layouts/AuthLayout";
import Link from "next/link";
import { useLoadingStore } from "@/store/useLoadingStore";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import ReCaptcha, { ReCaptchaRef } from "@/components/common/ReCaptcha";

export default function ForgotPassword() {
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCaptchaRef>(null);
  const setLoading = useLoadingStore((state) => state.setLoading);
  const router = useRouter();

  const forgotPassword = async (forgotPasswordData: { email: string }) => {
    if (!recaptchaToken) {
      toast.error("Please complete the reCAPTCHA verification");
      return;
    }

    setLoading(true);
    try {
      const userResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/forget-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: forgotPasswordData.email,
            recaptchaToken,
          }),
        },
      );
      const response = await userResponse.json();
      if (response.message) {
        toast.success(response.message);
        router.push(`/authentication/reset-password?email=${encodeURIComponent(forgotPasswordData.email)}`);
      } else {
        toast.error(response.error[0].msg);
        recaptchaRef.current?.reset();
      }
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.";
      toast.error(errorMessage);
      recaptchaRef.current?.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout heading="Forgot your password?">
      <p className="my-6 text-base font-normal text-gray-500 dark:text-gray-400">
        Don&apos;t fret! Just type in your email and we will send you a code to
        reset your password!
      </p>
      <form
        className="mt-8 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const email = formData.get("email") as string;
          forgotPassword({ email });
        }}
      >
        <div>
          <label
            htmlFor="email"
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            Your email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-gold-500 focus:border-gold-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gold-500 dark:focus:border-gold-500"
            placeholder="name@company.com"
            required
          />
        </div>

        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="remember"
              aria-describedby="remember"
              name="remember"
              type="checkbox"
              className="w-4 h-4 border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-gold-300 dark:focus:ring-gold-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
              required
            />
          </div>
          <div className="ml-3 text-sm">
            <label
              htmlFor="remember"
              className="font-medium text-gray-900 dark:text-white"
            >
              I accept the{" "}
              <Link href={"/privacy-policy"} className="text-gold-600 hover:underline">
                Privacy Policy
              </Link>
              {" "}and{" "}
              <Link href={"/terms-and-conditions"} className="text-gold-600 hover:underline">
                Terms and Conditions
              </Link>
            </label>
          </div>
        </div>

        <ReCaptcha
          ref={recaptchaRef}
          onChange={(token) => setRecaptchaToken(token)}
          onExpired={() => setRecaptchaToken(null)}
          onError={() => {
            setRecaptchaToken(null);
            toast.error("reCAPTCHA error. Please try again.");
          }}
        />

        <button
          type="submit"
          disabled={!recaptchaToken}
          className="w-full px-5 py-3 text-base font-medium text-center text-white rounded-lg bg-gold-500 hover:bg-gold-600 focus:ring-4 focus:ring-gold-300 sm:w-auto dark:bg-gold-600 dark:hover:bg-gold-700 dark:focus:ring-gold-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset password
        </button>
        <p className="text-white">
          <Link href={"/"} className="text-gold-400">
            Back to Login
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
