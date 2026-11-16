import React from "react";
import { Flowbite } from "flowbite-react";
import Link from "next/link";
import Image from "next/image";

interface JobApplyLayoutProps {
  children: React.ReactNode;
}

export default function JobApplyLayout({ children }: JobApplyLayoutProps) {
  return (
    <Flowbite theme={{ mode: "dark" }}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <header className="bg-white/80 dark:bg-gray-800/80 shadow-lg backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link href="/job-apply" className="flex items-center space-x-3">
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-gold-600 to-gold-400 bg-clip-text text-transparent">
                    PBC Careers
                  </h1>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Pakistan Business Council - Dubai
                  </p>
                </div>
              </Link>
              <Link
                href="/authentication/sign-in"
                className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 hover:border-gold-500 dark:hover:border-gold-500 transition-all duration-300"
              >
                Member Login →
              </Link>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                © {new Date().getFullYear()} Pakistan Business Council - Dubai.
                All rights reserved.
              </p>
              <div className="flex space-x-6">
                <Link
                  href="/privacy-policy"
                  className="text-sm text-gray-500 hover:text-gold-600 dark:text-gray-400 dark:hover:text-gold-500"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/terms-and-conditions"
                  className="text-sm text-gray-500 hover:text-gold-600 dark:text-gray-400 dark:hover:text-gold-500"
                >
                  Terms and Conditions
                </Link>
                <Link
                  href="/data-processing-agreement"
                  className="text-sm text-gray-500 hover:text-gold-600 dark:text-gray-400 dark:hover:text-gold-500"
                >
                  Data Processing Agreement
                </Link>
                <Link
                  href="/contact"
                  className="text-sm text-gray-500 hover:text-gold-600 dark:text-gray-400 dark:hover:text-gold-500"
                >
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Flowbite>
  );
}
