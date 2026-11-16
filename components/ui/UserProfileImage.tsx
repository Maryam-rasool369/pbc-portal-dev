import useFileDownloader from "@/hooks/useFileDownloader";
import Image from "next/image";

interface UserProfileImageProps {
  src: string;
  title: string;
  isDownloadable?: boolean;
  mimeType?: string;
  showViewLink?: boolean;
}

const IMAGE_EXTENSION = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i;

export default function UserProfileImage({
  src,
  title,
  isDownloadable = false,
  mimeType,
  showViewLink = true,
}: UserProfileImageProps) {
  const { downloadFile, loading } = useFileDownloader();

  const lowerSrc = src?.toLowerCase() ?? "";
  const isPdf =
    mimeType === "application/pdf" || lowerSrc.includes(".pdf");
  const isImage =
    mimeType?.startsWith("image/") || IMAGE_EXTENSION.test(lowerSrc);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="relative h-48 w-full bg-gray-100 flex items-center justify-center">
        {isPdf ? (
          <iframe
            src={src}
            className="w-full h-full"
            title={title}
          />
        ) : isImage ? (
          <Image
            src={src}
            alt={title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center px-4 text-center">
            <svg
              className="h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 truncate max-w-full">
              {title}
            </p>
          </div>
        )}
      </div>

      <div className="p-3 bg-gray-50 dark:bg-gray-700">
        <h5 className="text-sm font-medium text-gray-900 dark:text-white">
          {title}
        </h5>

        {(showViewLink || isDownloadable) && (
          <div className="flex items-center gap-4 mt-1">
            {showViewLink && (
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                View full size
              </a>
            )}

            {isDownloadable && (
              <button
                onClick={() => downloadFile(src, title)}
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                disabled={loading}
              >
                {loading ? "Downloading..." : "Download"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}