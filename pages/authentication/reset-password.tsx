import React, { useEffect, useState } from "react";
import Link from "next/link";
import AuthLayout from "@/layouts/AuthLayout";
import { useLoadingStore } from "@/store/useLoadingStore";
import { toast } from "react-toastify";
import { useRouter } from "next/router";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const setLoading = useLoadingStore((state) => state.setLoading);
  const router = useRouter();

  useEffect(() => {
    if (router.query.email) {
      setEmail(decodeURIComponent(router.query.email as string));
    }
  }, [router.query.email]);

  const verifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp) {
      toast.error("Email and OTP are required");
      return;
    }

    setIsVerifying(true);
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/otp-validation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            resetOtp: otp
          })
        }
      );

      const data = await response.json();

      if (data.message) {
        toast.success("OTP verified successfully!");
        setOtpVerified(true);
      } else {
        toast.error(data.error?.[0]?.msg || "Invalid OTP. Please try again.");
      }
    } catch (error) {
      toast.error("An error occurred while verifying OTP. Please try again.");
      console.error("OTP verification error:", error);
    } finally {
      setIsVerifying(false);
      setLoading(false);
    }
  };
  
  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      toast.error(
        "Password must be at least 8 characters, with one uppercase, one lowercase, one number, and one special character.",
      );
      return;
    }

    setIsResetting(true);
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password: newPassword
          })
        }
      );

      const data = await response.json();

      if (data.message) {
        toast.success("Password reset successfully!");
        router.push("/authentication/sign-in");
      } else {
        toast.error(data.error?.[0]?.msg || "Failed to reset password.");
      }
    } catch (error) {
      toast.error("An error occurred while resetting password. Please try again.");
      console.error("Password reset error:", error);
    } finally {
      setIsResetting(false);
      setLoading(false);
    }
  };
  
  return (
    <AuthLayout heading={otpVerified ? "Create new password" : "Reset your password"}>
      {!otpVerified ? (
        <>
          <p className="my-4 text-base font-normal text-gray-500 dark:text-gray-400">
            Enter the email address and OTP sent to your inbox to reset your password
          </p>
          <form className="mt-6 space-y-6" onSubmit={verifyOtp}>
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-gold-500 focus:border-gold-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gold-500 dark:focus:border-gold-500"
                placeholder="name@company.com"
                readOnly={!!router.query.email}
                required
              />
            </div>
            <div>
              <label
                htmlFor="otp"
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                One-Time Password (OTP)
              </label>
              <input
                type="text"
                name="otp"
                id="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-gold-500 focus:border-gold-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gold-500 dark:focus:border-gold-500"
                placeholder="Enter OTP"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isVerifying}
              className="w-full px-5 py-3 text-base font-medium text-center text-white rounded-lg bg-gold-500 hover:bg-gold-600 focus:ring-4 focus:ring-gold-300 sm:w-auto dark:bg-gold-600 dark:hover:bg-gold-700 dark:focus:ring-gold-800 disabled:opacity-70"
            >
              {isVerifying ? "Verifying..." : "Verify OTP"}
            </button>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              <Link href="/authentication/forgot-password" className="text-gold-600 hover:underline">
                Didn&apos;t receive the OTP? Request again
              </Link>
            </div>
          </form>
        </>
      ) : (
        <>
          <p className="my-4 text-base font-normal text-gray-500 dark:text-gray-400">
            Your identity has been verified! Set your new password below.
          </p>
          <form className="mt-6 space-y-6" onSubmit={resetPassword}>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    name="new-password"
                    id="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-gold-500 focus:border-gold-500 block w-full p-2.5 pr-10 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gold-500 dark:focus:border-gold-500"
                    placeholder="••••••••"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    {showNewPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirm-password"
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-gold-500 focus:border-gold-500 block w-full p-2.5 pr-10 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-gold-500 dark:focus:border-gold-500"
                    placeholder="••••••••"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-start mt-2">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    aria-describedby="terms"
                    name="terms"
                    type="checkbox"
                    className="w-4 h-4 border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-gold-300 dark:focus:ring-gold-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                    required
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label
                    htmlFor="terms"
                    className="font-medium text-gray-900 dark:text-white"
                  >
                    I accept the{" "}
                    <Link href="/privacy-policy" className="text-gold-600 hover:underline">
                      Privacy Policy
                    </Link>
                    {" "}and{" "}
                    <Link href="/terms-and-conditions" className="text-gold-600 hover:underline">
                      Terms and Conditions
                    </Link>
                  </label>
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={isResetting}
              className="w-full px-5 py-3 text-base font-medium text-center text-white rounded-lg bg-gold-500 hover:bg-gold-600 focus:ring-4 focus:ring-gold-300 sm:w-auto dark:bg-gold-600 dark:hover:bg-gold-700 dark:focus:ring-gold-800 disabled:opacity-70"
            >
              {isResetting ? "Updating Password..." : "Reset Password"}
            </button>
          </form>
        </>
      )}
      <div className="mt-6">
        <Link
          href="/authentication/sign-in"
          className="text-gold-600 hover:underline dark:text-gold-500"
        >
          Back to Login
        </Link>
      </div>
    </AuthLayout>
  );
}
