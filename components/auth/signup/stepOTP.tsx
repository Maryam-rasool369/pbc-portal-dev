import React, { useRef, useState } from "react";

interface Props {
  nextStep: (v: any) => void;
  resendOtp: () => void;
  prevStep: () => void;
  recaptchaReady: boolean;
}

export default function StepOTP({
  nextStep,
  resendOtp,
  prevStep,
  recaptchaReady,
}: Props) {
  const [emailOtp, setEmailOtp] = useState(Array(6).fill(""));
  const [phoneOtp, setPhoneOtp] = useState(Array(6).fill(""));
  const [errors, setErrors] = useState<{
    emailOtp?: string;
    phoneOtp?: string;
  }>({});
  const emailRefs = useRef<HTMLInputElement[]>([]);
  const phoneRefs = useRef<HTMLInputElement[]>([]);

  const handleChange = (
    index: number,
    value: string,
    otp: string[],
    setOtp: (otp: string[]) => void,
    refs: React.RefObject<HTMLInputElement[]>,
  ) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      if (refs.current) {
        refs.current[index + 1]?.focus();
      }
    }
  };

  const validate = () => {
    const newErrors: { emailOtp?: string; phoneOtp?: string } = {};
    if (!emailOtp.every((d) => d)) newErrors.emailOtp = "Email OTP is required";
    if (!phoneOtp.every((d) => d)) newErrors.phoneOtp = "Phone OTP is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    nextStep({
      emailOtp,
      phoneOtp,
    });
  };

  const isValid = emailOtp.every((d) => d) && phoneOtp.every((d) => d);

  return (
    <form onSubmit={handleSubmit} className=" flex flex-col gap-y-8">
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-white mb-2 ">
          Enter the 6-digit OTP sent to your <b>EMAIL</b>:
        </p>
        <div className="flex gap-2 justify-center">
          {emailOtp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (emailRefs.current[i] = el!)}
              type="text"
              maxLength={1}
              inputMode="numeric"
              value={digit}
              onChange={(e) =>
                handleChange(
                  i,
                  e.target.value,
                  emailOtp,
                  setEmailOtp,
                  emailRefs,
                )
              }
              className={`w-10 h-12 text-center border rounded-md text-lg text-white bg-white dark:bg-gray-800 ${
                errors.emailOtp ? "border-red-500" : "dark:border-gray-600"
              }`}
            />
          ))}
        </div>
        {errors.emailOtp && (
          <p className="text-red-500 text-sm mt-1 text-center">
            {errors.emailOtp}
          </p>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-white mb-2">
          Enter the 6-digit OTP sent to your <b>PHONE</b>:
        </p>
        <div className="flex gap-2 justify-center">
          {phoneOtp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (phoneRefs.current[i] = el!)}
              type="text"
              maxLength={1}
              inputMode="numeric"
              value={digit}
              onChange={(e) =>
                handleChange(
                  i,
                  e.target.value,
                  phoneOtp,
                  setPhoneOtp,
                  phoneRefs,
                )
              }
              className={`w-10 h-12 text-center border rounded-md text-lg text-white bg-white dark:bg-gray-800 ${
                errors.phoneOtp ? "border-red-500" : "dark:border-gray-600"
              }`}
            />
          ))}
        </div>
        {errors.phoneOtp && (
          <p className="text-red-500 text-sm mt-1 text-center">
            {errors.phoneOtp}
          </p>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={prevStep}
          className="px-5 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-white"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!isValid || !recaptchaReady}
          className={`px-5 py-2 text-sm text-white rounded-lg ${
            isValid && recaptchaReady
              ? "bg-gold-500 hover:bg-gold-600 dark:bg-gold-600"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          Verify & Continue
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 text-sm text-gray-300">
        <span>
          {recaptchaReady
            ? "reCAPTCHA verified"
            : "Complete reCAPTCHA below to continue"}
        </span>
        <button
          type="button"
          onClick={resendOtp}
          disabled={!recaptchaReady}
          className={`font-medium ${
            recaptchaReady
              ? "text-gold-400 hover:text-gold-300"
              : "text-gray-500 cursor-not-allowed"
          }`}
        >
          Resend OTP
        </button>
      </div>
    </form>
  );
}
