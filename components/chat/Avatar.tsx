import { useEffect, useState } from "react";

interface AvatarProps {
  name?: string | null;
  picture?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-lg",
  xl: "w-20 h-20 text-2xl",
};

const DOT_CLASSES: Record<NonNullable<AvatarProps["size"]>, string> = {
  xs: "w-1.5 h-1.5",
  sm: "w-2 h-2",
  md: "w-2.5 h-2.5",
  lg: "w-3.5 h-3.5",
  xl: "w-4 h-4",
};

function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  name,
  picture,
  size = "md",
  online,
  className = "",
}: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [picture]);

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      {picture && !imgFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={picture}
          alt={name ?? "Avatar"}
          onError={() => setImgFailed(true)}
          className={`${SIZE_CLASSES[size]} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${SIZE_CLASSES[size]} rounded-full bg-gold-500 text-gray-900 font-bold flex items-center justify-center`}
        >
          {getInitials(name)}
        </div>
      )}
      {online && (
        <span
          className={`absolute bottom-0 right-0 ${DOT_CLASSES[size]} rounded-full bg-green-500 ring-2 ring-gray-900`}
        />
      )}
    </div>
  );
}
