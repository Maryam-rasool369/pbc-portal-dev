import { Flowbite } from "flowbite-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";

const AuthLayout = ({
  children,
  heading,
  headerAction,
}: {
  children: React.ReactNode;
  heading: string;
  headerAction?: React.ReactNode;
}) => {
  const [baseURI, setBaseURI] = useState<string>("");

  useEffect(() => {
    setBaseURI(window?.location?.hostname || "");
  }, []);

  return (
    <Flowbite theme={{ mode: "dark" }}>
      <div className="flex flex-col md:flex-row w-screen h-screen overflow-hidden bg-gray-900">
        {/* Left Panel */}
        <div className="w-full md:w-1/2 bg-white dark:bg-gray-900 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-y-auto">
            <div className="min-h-full w-full max-w-md px-6 mx-auto flex flex-col justify-center py-12">
              {headerAction ? (
                <div className="mb-4 flex items-center justify-between gap-3">
                  <p className="text-3xl md:text-4xl font-medium text-white/90">
                    {heading}
                  </p>
                  {headerAction}
                </div>
              ) : (
                <p className="text-4xl text-center font-medium text-white/90 mb-4">
                  {heading}
                </p>
              )}
              {children}
            </div>
          </div>

          {/* Bottom Left Policies Grouped */}
          {/* <div className="absolute bottom-6 left-6 text-sm text-white/80 flex flex-col space-y-1">
            <Link href="/privacy-policy" className="hover:underline">
              Privacy Policy
            </Link>
            <Link href="/terms-and-conditions" className="hover:underline">
              Terms and Conditions
            </Link>
            <Link href="/data-processing-agreement" className="hover:underline">
              Data Processing Agreement
            </Link>
          </div> */}
        </div>

        {/* Right Panel */}
        <div className="w-full md:w-1/2 bg-gold-500 text-white dark:text-white items-center justify-center relative py-12 md:py-0 md:flex hidden">
          <div className="text-center px-8">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-wide drop-shadow-lg">
              Pakistan Business Council
            </h1>
            <p className="mt-6 text-3xl md:text-5xl font-medium text-white/90">
              Dubai
            </p>
            <p className="mt-6 text-lg font-medium text-white/90">
              {baseURI && baseURI.includes("admin") ? "Admin" : "Member"} Portal
            </p>
          </div>

          {/* Copyright Bottom Right */}
          <div className="absolute bottom-6 right-6 text-sm text-white/80 flex flex-col space-y-1">
            <Link href="/privacy-policy" className="hover:underline text-center">
              Privacy Policy
            </Link>
            <Link href="/terms-and-conditions" className="hover:underline text-center">
              Terms and Conditions
            </Link>
            <Link href="/data-processing-agreement" className="hover:underline text-center">
              Data Processing Agreement
            </Link>
            <p className="mt-2">
              © {new Date().getFullYear()} All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </Flowbite>
  );
};

export default AuthLayout;
