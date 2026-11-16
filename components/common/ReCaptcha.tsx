import React, { useRef, useImperativeHandle, forwardRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";

interface ReCaptchaProps {
  onChange: (token: string | null) => void;
  onExpired?: () => void;
  onError?: () => void;
}

export interface ReCaptchaRef {
  reset: () => void;
}

const ReCaptcha = forwardRef<ReCaptchaRef, ReCaptchaProps>(
  ({ onChange, onExpired, onError }, ref) => {
    const recaptchaRef = useRef<ReCAPTCHA>(null);
    const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
        }
        onChange(null);
      },
    }));

  if (!siteKey) {
    console.warn("NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set");
    return null;
  }

  const handleExpired = () => {
    if (onExpired) {
      onExpired();
    }
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }
  };

  const handleError = () => {
    if (onError) {
      onError();
    }
  };

  return (
    <div className="flex justify-center my-4">
      <ReCAPTCHA
        ref={recaptchaRef}
        sitekey={siteKey}
        onChange={onChange}
        onExpired={handleExpired}
        onError={handleError}
        theme="dark"
      />
    </div>
  );
});

ReCaptcha.displayName = "ReCaptcha";

export default ReCaptcha;
