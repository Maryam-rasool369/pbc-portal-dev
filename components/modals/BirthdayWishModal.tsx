"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { formatBirthdayMessage, getBirthdayAge } from "@/utils/birthdayUtils";
import demoImage from "@/public/images/users/userProfile2.png";
import { getBirthdayTemplate, type BirthdayTemplate } from "@/services/birthdayTemplate";
import useAuthStore from "@/store/authStore";

interface BirthdayWishModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  profilePicture: string | null | undefined;
  dateOfBirth: Date | string | null | undefined;
  template: BirthdayTemplate | null;
}

export default function BirthdayWishModal({
  isOpen,
  onClose,
  userName,
  profilePicture,
  dateOfBirth,
  template: templateProp,
}: BirthdayWishModalProps) {
  const token = useAuthStore((state) => state.token);
  const [template, setTemplate] = useState<BirthdayTemplate | null>(templateProp || null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const fetchTemplate = async () => {
        if (!token) return;
        try {
          const fetchedTemplate = await getBirthdayTemplate(token);
          if (fetchedTemplate) {
            setTemplate(fetchedTemplate);
          }
        } catch (error) {
          console.error("Failed to fetch birthday template:", error);
        }
      };
      
      fetchTemplate();
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, token]);

  // Update template when prop changes
  useEffect(() => {
    if (templateProp) {
      setTemplate(templateProp);
    }
  }, [templateProp]);

  const age = getBirthdayAge(dateOfBirth);
  const defaultMessage = formatBirthdayMessage(userName, age);
  
  // Use HTML template from backend if available, replace {name} placeholder
  const messageHTML = useMemo(() => {
    if (template?.html) {
      return template.html.replace(/\{name\}/gi, userName);
    }
    // Fallback to default message if no template
    return null;
  }, [template?.html, userName]);

  const imageUrl = profilePicture || demoImage;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop with blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal Content */}
      <div
        className="relative w-full max-w-6xl h-[90vh] max-h-[800px] rounded-2xl overflow-hidden shadow-2xl transform transition-all duration-300 animate-in fade-in zoom-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Image with blur and overlay */}
        <div className="absolute inset-0">
          <Image
            src={imageUrl}
            alt="Birthday background"
            fill
            className="object-contain"
            priority
            sizes="100vw"
          />
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-black/100" />
          {/* Blur effect */}
          <div className="absolute inset-0 backdrop-blur-[2px]" />
        </div>

        {/* Content - Scrollable */}
        <div className="relative z-10 flex-1 overflow-y-auto flex flex-col items-center justify-center p-8 text-center">
          {/* Confetti/Sparkle effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-yellow-300 rounded-full animate-ping"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${1 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>

          {/* Birthday Message */}
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-700 w-full">
            {/* Birthday Cake Icon */}
            <div className="flex justify-center mb-4">
              <div className="text-7xl animate-bounce" style={{ animationDuration: "2s" }}>
                🎂
              </div>
            </div>

            {/* Main Message - Render HTML from backend template */}
            {messageHTML ? (
              <div 
                className="drop-shadow-2xl w-full break-words"
                dangerouslySetInnerHTML={{ __html: messageHTML }}
                style={{
                  textAlign: "center",
                  lineHeight: "1.2",
                  wordWrap: "break-word",
                  overflowWrap: "break-word",
                }}
              />
            ) : (
              <h1 className="text-5xl md:text-7xl font-bold text-white drop-shadow-2xl break-words">
                {defaultMessage}
              </h1>
            )}

            {/* Subtitle - Only show if no custom template message */}
            {!template?.text && (
              <p className="text-xl md:text-2xl text-yellow-200 font-medium drop-shadow-lg">
                Wishing you a day filled with joy and happiness! 🎉
              </p>
            )}

            {/* Decorative elements */}
            <div className="flex justify-center gap-4 mt-8">
              <span className="text-4xl animate-pulse">🎈</span>
              <span className="text-4xl animate-pulse" style={{ animationDelay: "0.5s" }}>
                🎁
              </span>
              <span className="text-4xl animate-pulse" style={{ animationDelay: "1s" }}>
                🎊
              </span>
            </div>
          </div>

        </div>

        {/* Close Button - Fixed position */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all duration-200 text-white hover:scale-110"
          aria-label="Close birthday wish"
        >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes zoom-in {
          from {
            transform: scale(0.9);
          }
          to {
            transform: scale(1);
          }
        }

        @keyframes slide-in-from-bottom-8 {
          from {
            transform: translateY(2rem);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .animate-in {
          animation: fade-in 0.3s ease-out;
        }

        .fade-in {
          animation: fade-in 0.3s ease-out;
        }

        .zoom-in {
          animation: zoom-in 0.3s ease-out;
        }

        .slide-in-from-bottom-8 {
          animation: slide-in-from-bottom-8 0.7s ease-out;
        }
      `}</style>
    </div>
  );
}

