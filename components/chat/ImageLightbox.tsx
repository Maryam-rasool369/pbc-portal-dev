import { useEffect } from "react";
import { createPortal } from "react-dom";
import { HiDownload, HiX } from "react-icons/hi";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export default function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        title="Close"
        className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2.5 transition-colors"
      >
        {/* @ts-ignore */}
        <HiX className="w-6 h-6" />
      </button>
      <a
        href={src}
        download
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        title="Download"
        className="absolute top-4 right-16 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2.5 transition-colors"
      >
        {/* @ts-ignore */}
        <HiDownload className="w-6 h-6" />
      </a>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt ?? "Attachment"}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
      />
    </div>,
    document.body,
  );
}
