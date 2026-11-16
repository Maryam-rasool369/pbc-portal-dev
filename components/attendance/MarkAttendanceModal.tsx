// components/attendance/MarkAttendanceModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { markAttendance } from "@/services/attendance";
import _ from "lodash";
import useAuthStore from "@/store/authStore";

interface MarkAttendanceModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  action?: "in" | "out";
}

export default function MarkAttendanceModal({
  open,
  onClose,
  onSuccess,
  action = "in",
}: MarkAttendanceModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [coordinates, setCoordinates] = useState<string | null>(null);
  const token = useAuthStore((state) => state.token);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close the modal
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        !submitting
      ) {
        onClose();
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, onClose, submitting]);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);

  // Get geolocation when modal opens
  useEffect(() => {
    if (open) {
      getLocation();
    } else {
      setLocationStatus("idle");
      setCoordinates(null);
    }
  }, [open]);

  const applyPosition = (position: GeolocationPosition) => {
    const { latitude, longitude } = position.coords;
    setCoordinates(`${latitude.toFixed(4)},${longitude.toFixed(4)}`);
    setLocationStatus("success");
  };

  const getCurrentPosition = (options: PositionOptions) =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });

  const queryGeoPermission = async (): Promise<PermissionState | null> => {
    try {
      if (!navigator.permissions?.query) return null;
      const result = await navigator.permissions.query({
        name: "geolocation",
      });
      return result.state;
    } catch {
      return null;
    }
  };

  const messageForGeoError = (
    error: GeolocationPositionError,
    permissionState: PermissionState | null,
  ) => {
    if (error.code === error.PERMISSION_DENIED) {
      // Browsers often report PERMISSION_DENIED when high-accuracy GPS fails,
      // OS location is off, or the request was not tied to a user gesture —
      // even when the site permission is already "Allow".
      if (permissionState === "granted") {
        return "Location is allowed in this browser, but the device could not provide a position. Check system Location Services for your browser, then try again.";
      }
      return "Location permission denied. Please enable location access for this site in your browser settings, then click Try Again.";
    }
    if (error.code === error.POSITION_UNAVAILABLE) {
      return "Location information is unavailable. Please check your device settings.";
    }
    if (error.code === error.TIMEOUT) {
      return "Location request timed out. Please try again.";
    }
    return `Unable to access your location: ${error.message}`;
  };

  const getLocation = async () => {
    setLocationStatus("loading");
    setCoordinates(null);

    if (!window.isSecureContext) {
      toast.error(
        "Location requires a secure connection (HTTPS or localhost). Please open the portal over HTTPS.",
      );
      setLocationStatus("error");
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setLocationStatus("error");
      return;
    }

    const permissionState = await queryGeoPermission();

    // High-accuracy + timeout:0 is a common source of false PERMISSION_DENIED.
    // Try a cached/network position first, then GPS.
    const attempts: PositionOptions[] = [
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    ];

    let lastError: GeolocationPositionError | null = null;

    for (const options of attempts) {
      try {
        const position = await getCurrentPosition(options);
        applyPosition(position);
        return;
      } catch (error) {
        lastError = error as GeolocationPositionError;
      }
    }

    console.error("Error getting geolocation:", lastError);
    const errorMessage = lastError
      ? messageForGeoError(lastError, permissionState)
      : "Unable to access your location";
    toast.error(errorMessage);
    setLocationStatus("error");
  };

  const handleSubmit = async () => {
    if (!coordinates) {
      toast.error("Your location is required to mark attendance");
      return;
    }

    setSubmitting(true);
    try {
      await markAttendance(token, { location: coordinates }, action);
      toast.success("Attendance marked successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error marking attendance:", error);
      toast.error(error?.message || "Failed to mark attendance. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
      <div
        ref={modalRef}
        className="bg-gray-900 border border-gold-500/30 rounded-lg shadow-lg w-full max-w-md mx-4"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gold-500">
              Mark {_.capitalize(action)} Attendance
            </h2>
            <button
              onClick={onClose}
              disabled={submitting}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
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

          <div className="space-y-4">
            <div className="bg-gray-800 p-4 rounded-md">
              <h3 className="text-white font-medium mb-2">Location Status</h3>
              <div className="flex items-center">
                {locationStatus === "loading" && (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-gold-500 mr-2"></div>
                    <p className="text-gray-300">
                      Getting your current location...
                    </p>
                  </>
                )}
                {locationStatus === "success" && (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-green-500 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-green-500">
                      Location captured successfully
                    </p>
                  </>
                )}
                {locationStatus === "error" && (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-red-500 mr-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <p className="text-red-500">Failed to capture location</p>
                  </>
                )}
              </div>
              {locationStatus === "error" && (
                <button
                  onClick={getLocation}
                  className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
                >
                  Try Again
                </button>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors mr-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || locationStatus !== "success"}
                className={`px-4 py-2 ${
                  submitting || locationStatus !== "success"
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-gold-500 hover:bg-gold-600"
                } text-black rounded-md transition-colors flex items-center`}
              >
                {submitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-black"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  `Mark ${_.capitalize(action)} Attendance`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
