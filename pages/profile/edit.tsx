"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { Country, City } from "country-state-city";
import Select from "react-select";
import Image from "next/image";
import Dropzone from "react-dropzone";
import useAuthStore from "@/store/authStore";
import { fetchUserProfile } from "@/services/users";
import { fetchBusinessGroups } from "@/services/businessGroups";
import { fetchOrganizations, Organization } from "@/services/organization";
import { UserProfile } from "@/types/user";
import { BusinessGroup } from "@/types/businessGroup";
import demoImage from "@/public/images/users/userProfile2.png";
import { Autocomplete, GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type FileKey =
  | "profilePicture"
  | "tradeLicense"
  | "tradeLicenseSecondary"
  | "passport"
  | "passportSecondary"
  | "emiratesId"
  | "emiratesIdSecondary"
  | "bioVideo";

const ACCEPTED_FILE_TYPES: Record<string, Record<string, string[]>> = {
  profilePicture: {
    "image/jpeg": [".jpeg", ".jpg"],
    "image/png": [".png"],
  },
  tradeLicense: {
    "image/jpeg": [".jpeg", ".jpg"],
    "image/png": [".png"],
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  },
  tradeLicenseSecondary: {
    "image/jpeg": [".jpeg", ".jpg"],
    "image/png": [".png"],
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  },
  passport: {
    "image/jpeg": [".jpeg", ".jpg"],
    "image/png": [".png"],
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  },
  passportSecondary: {
    "image/jpeg": [".jpeg", ".jpg"],
    "image/png": [".png"],
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  },
  emiratesId: {
    "image/jpeg": [".jpeg", ".jpg"],
    "image/png": [".png"],
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  },
  emiratesIdSecondary: {
    "image/jpeg": [".jpeg", ".jpg"],
    "image/png": [".png"],
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  },
  bioVideo: {
    "video/mp4": [".mp4"],
    "video/quicktime": [".mov"],
    "video/webm": [".webm"],
    "video/x-matroska": [".mkv"],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDateForInput = (dateString: string | undefined): string => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

const normalizeGenderValue = (value?: string | null) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (!normalized) return "PREFER_NOT_TO_SAY";
  if (normalized === "PREFER_NOT_TO_SAY") return "PREFER_NOT_TO_SAY";
  if (normalized === "NOT_SPECIFIED") return "PREFER_NOT_TO_SAY";
  if (normalized === "MALE" || normalized === "FEMALE" || normalized === "OTHER") {
    return normalized;
  }

  return "PREFER_NOT_TO_SAY";
};

// ─── Sub-components ──────────────────────────────────────────────────────────

interface SectionHeadingProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
}

function SectionHeading({ icon, title, description }: SectionHeadingProps) {
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-gray-200 dark:border-gray-700 mb-6">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gold-50 dark:bg-gold-900/30 flex items-center justify-center text-gold-600 dark:text-gold-400">
        {icon}
      </div>
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h3>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}

interface FieldLabelProps {
  htmlFor?: string;
  label: string;
  required?: boolean;
  hint?: string;
}

function FieldLabel({ htmlFor, label, required, hint }: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="block mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-300"
    >
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
      {hint && <span className="ml-1 text-xs font-normal text-gray-400">({hint})</span>}
    </label>
  );
}

interface FieldErrorProps {
  message?: string;
}

function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return <p className="text-red-500 text-xs mt-1">{message}</p>;
}

interface FileUploadZoneProps {
  label: string;
  required?: boolean;
  file: File | null;
  preview?: string;
  accept: Record<string, string[]>;
  onDrop: (files: File[]) => void;
  onClear: () => void;
  existingUrl?: string;
  error?: string;
  disabled?: boolean;
  disabledReason?: string;
}

function getExistingFileType(url: string): "image" | "video" | "pdf" | "other" {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (ext === "pdf") return "pdf";
  return "other";
}

function FileUploadZone({
  label,
  required,
  file,
  preview,
  accept,
  onDrop,
  onClear,
  existingUrl,
  error,
  disabled,
  disabledReason,
}: FileUploadZoneProps) {
  const isVideo = file?.type?.startsWith("video") ?? false;
  const isImage = file?.type?.startsWith("image") ?? false;
  const hasExisting = Boolean(existingUrl);
  const existingFileType = existingUrl ? getExistingFileType(existingUrl) : null;

  return (
    <div>
      <FieldLabel label={label} required={required} />
      {disabled && disabledReason && (
        <p className="text-xs text-amber-500 mb-2">{disabledReason}</p>
      )}
      <Dropzone
        onDrop={onDrop}
        multiple={false}
        accept={accept}
        disabled={disabled}
      >
        {({ getRootProps, getInputProps, isDragActive }) => (
          <div
            {...getRootProps()}
            className={`
              relative flex flex-col items-center justify-center gap-2
              p-5 border-2 border-dashed rounded-xl cursor-pointer transition-colors
              ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              ${isDragActive
                ? "border-gold-500 bg-gold-50 dark:bg-gold-900/20"
                : file
                  ? "border-gold-500 bg-gold-50/50 dark:bg-gold-900/10"
                  : hasExisting
                    ? "border-blue-400 bg-blue-50/50 dark:bg-blue-900/10"
                    : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 hover:border-gold-400 hover:bg-gold-50/30 dark:hover:bg-gold-900/10"
              }
            `}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex flex-col items-center gap-1 text-center">
                <svg className="w-6 h-6 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <p className="text-sm font-medium text-gold-600 dark:text-gold-400 break-all">{file.name}</p>
                <p className="text-xs text-gray-400">Click to replace</p>
              </div>
            ) : hasExisting ? (
              <div className="flex flex-col items-center gap-1 text-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">File on record</p>
                <p className="text-xs text-gray-400">Click or drag to replace</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 text-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gold-600 dark:text-gold-400">Click to upload</span> or drag &amp; drop
                </p>
                <p className="text-xs text-gray-400">
                  {Object.keys(accept).map(t => t.split("/")[1]).join(", ").toUpperCase()}
                </p>
              </div>
            )}
          </div>
        )}
      </Dropzone>

      {file && (
        <div className="mt-2 flex items-center justify-end">
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Remove selection
          </button>
        </div>
      )}

      {preview && isImage && (
        <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <Image
            src={preview}
            alt="Preview"
            width={0}
            height={0}
            sizes="100vw"
            unoptimized
            className="w-full max-h-40 object-contain bg-gray-100 dark:bg-gray-800"
            style={{ width: "100%", height: "auto" }}
          />
        </div>
      )}

      {preview && isVideo && (
        <video controls className="mt-2 max-h-48 w-full rounded-lg border border-gray-200 dark:border-gray-700">
          <source src={preview} type={file?.type} />
        </video>
      )}

      {!file && existingUrl && existingFileType === "image" && (
        <div className="mt-3 rounded-lg overflow-hidden border border-blue-200 dark:border-blue-800">
          <Image
            src={existingUrl}
            alt="Existing file preview"
            width={0}
            height={0}
            sizes="100vw"
            unoptimized
            className="w-full max-h-56 object-contain bg-gray-100 dark:bg-gray-800"
            style={{ width: "100%", height: "auto" }}
          />
        </div>
      )}

      {!file && existingUrl && existingFileType === "video" && (
        <video controls className="mt-3 max-h-56 w-full rounded-lg border border-blue-200 dark:border-blue-800">
          <source src={existingUrl} />
        </video>
      )}

      {!file && existingUrl && existingFileType === "pdf" && (
        <div className="mt-3">
          <iframe
            src={existingUrl}
            className="w-full h-56 rounded-lg border border-blue-200 dark:border-blue-800"
            title="Document preview"
          />
        </div>
      )}

      {!file && existingUrl && existingFileType === "other" && (
        <div className="mt-3">
          <a
            href={existingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 underline hover:text-blue-700"
          >
            View Document
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}

      <FieldError message={error} />
    </div>
  );
}

// ─── Select styles (gold theme) ───────────────────────────────────────────────

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: "var(--select-bg, #f9fafb)",
    borderColor: state.isFocused ? "#a3802a" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 1px #a3802a" : "none",
    "&:hover": { borderColor: "#a3802a" },
    borderRadius: "0.5rem",
    minHeight: "42px",
  }),
  singleValue: (base: any) => ({ ...base }),
  menu: (base: any) => ({ ...base, zIndex: 50 }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused ? "#fdf9ed" : "white",
    color: "#111827",
    "&:active": { backgroundColor: "#f8efd6" },
  }),
  placeholder: (base: any) => ({ ...base, color: "#9ca3af" }),
};

// ─── Input className helper ───────────────────────────────────────────────────

const inputCls =
  "w-full px-3.5 py-2.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent transition";

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const GOVT_TABS = [
  { id: "profile-info", label: "Profile Info" },
  { id: "government-entity-info", label: "Government Entity Information" },
];

const DEFAULT_TABS = [
  { id: "profile-info", label: "Profile Info" },
  { id: "personal-info", label: "Personal Information" },
  { id: "business-info", label: "Business Information" },
  { id: "professional-info", label: "Professional Information" },
  { id: "membership-specific", label: "Membership-Specific" },
];

// ─── Predefined Client Types ───────────────────────────────────────────────

const PREDEFINED_CLIENT_TYPES = [
  "Government Department",
  "Corporates",
  "Industries",
  "Traders",
  "Retailers",
];

const SOCIAL_PLATFORM_OPTIONS = [
  { label: "Facebook", value: "facebook" },
  { label: "Instagram", value: "instagram" },
  { label: "TikTok", value: "tiktok" },
  { label: "WeChat", value: "wechat" },
  { label: "Telegram", value: "telegram" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "Calendly", value: "calendly" },
  { label: "Snapchat", value: "snapchat" },
  { label: "Twitter", value: "twitter" },
];

const GENDER_OPTIONS = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
];

const SOCIAL_URL_PATTERNS: Record<string, RegExp> = {
  facebook: /facebook\.com/i,
  instagram: /instagram\.com/i,
  tiktok: /tiktok\.com/i,
  wechat: /(wechat\.com|weixin\.qq\.com)/i,
  telegram: /(t\.me|telegram\.(me|org))/i,
  linkedin: /linkedin\.com\/(in|company)\//i,
  calendly: /calendly\.com/i,
  snapchat: /snapchat\.com/i,
  twitter: /(twitter\.com|x\.com)/i,
};

const googleLibraries = ["places"] as any;
const mapContainerStyle = { width: "100%", height: "100%" };
const defaultMapPosition = { lat: 25.276987, lng: 55.296249 };

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function EditProfilePage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("profile-info");
  const [saving, setSaving] = useState(false);

  // ── Profile Info state ──
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("MALE");
  const [isResident, setIsResident] = useState<"" | "true" | "false">("");
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [availableCities, setAvailableCities] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<any>(null);
  const [selectedNativeCountry, setSelectedNativeCountry] = useState<any>(null);
  const [availableNativeCities, setAvailableNativeCities] = useState<any[]>([]);
  const [selectedNativeCity, setSelectedNativeCity] = useState<any>(null);

  // Files
  const [files, setFiles] = useState<Partial<Record<FileKey, File | null>>>({});
  const [previews, setPreviews] = useState<Partial<Record<FileKey, string>>>({});

  // Expiry dates
  const [tradeLicenseExpiry, setTradeLicenseExpiry] = useState("");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [emiratesIdExpiry, setEmiratesIdExpiry] = useState("");
  const [emiratesIdNumber, setEmiratesIdNumber] = useState("");

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Social links
  const [socialLinks, setSocialLinks] = useState<Array<{ platform: string; url: string }>>([]);

  // Location (Google Maps)
  const [location, setLocation] = useState(defaultMapPosition);
  const [locationValidated, setLocationValidated] = useState(false);
  const [mapSearchInput, setMapSearchInput] = useState("");
  const autocompleteRef = useRef<any>(null);

  const [removedDocs, setRemovedDocs] = useState<string[]>([]);

  // Original values for change detection
  const [origValues, setOrigValues] = useState<{
    bio: string;
    gender: string;
    isResident: boolean;
    country: string;
    city: string;
    nativeCountry: string;
    nativeCity: string;
    emiratesIdNumber: string;
    emiratesIdExpiry: string;
  } | null>(null);

  // ── Personal Info state ──
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportExpiryDate, setPassportExpiryDate] = useState("");
  const [piEmiratesIdNumber, setPiEmiratesIdNumber] = useState("");
  const [piEmiratesIdExpiry, setPiEmiratesIdExpiry] = useState("");
  const [mailingAddress, setMailingAddress] = useState("");
  const [piSaving, setPiSaving] = useState(false);
  const [piErrors, setPiErrors] = useState<Record<string, string>>({});
  const [piOrigValues, setPiOrigValues] = useState<{
    dateOfBirth: string;
    passportNumber: string;
    passportExpiryDate: string;
    emiratesIdNumber: string;
    emiratesIdExpiry: string;
    mailingAddress: string;
  } | null>(null);

  // ── Business Info state ──
  const [biCompanyName, setBiCompanyName] = useState("");
  const [biBusinessAddress, setBiBusinessAddress] = useState("");
  const [biSelectedCountry, setBiSelectedCountry] = useState<any>(null);
  const [biAvailableCities, setBiAvailableCities] = useState<any[]>([]);
  const [biSelectedCity, setBiSelectedCity] = useState<any>(null);
  const [biTradeLicenseNumber, setBiTradeLicenseNumber] = useState("");
  const [biTradeLicenseExpiry, setBiTradeLicenseExpiry] = useState("");
  const [biYearOfEstablishment, setBiYearOfEstablishment] = useState("");
  const [biAffiliation, setBiAffiliation] = useState("");
  const [biLegalStatus, setBiLegalStatus] = useState("");
  const [biNatureOfBusiness, setBiNatureOfBusiness] = useState("");
  const [biKeywords, setBiKeywords] = useState<string[]>([]);
  const [biKeywordInput, setBiKeywordInput] = useState("");
  const [biHsCodes, setBiHsCodes] = useState<string[]>([]);
  const [biHsCodeInput, setBiHsCodeInput] = useState("");
  const [biWebsite, setBiWebsite] = useState("");
  const [biNoOfEmployees, setBiNoOfEmployees] = useState("");
  const [biVatRegistrationNumber, setBiVatRegistrationNumber] = useState("");
  const [biEmiratesIssuingAuthority, setBiEmiratesIssuingAuthority] = useState("");
  const [biBusinessGroups, setBiBusinessGroups] = useState<number[]>([]);
  const [biBusinessGroupOptions, setBiBusinessGroupOptions] = useState<BusinessGroup[]>([]);
  const [biBusinessGroupSearch, setBiBusinessGroupSearch] = useState("");
  const [biLoadingGroups, setBiLoadingGroups] = useState(false);
  const [biSaving, setBiSaving] = useState(false);
  const [biErrors, setBiErrors] = useState<Record<string, string>>({});
  const [biOrigValues, setBiOrigValues] = useState<Record<string, any> | null>(null);

  // ── Professional Info state ──
  const [profTitle, setProfTitle] = useState("");
  const [profEducation, setProfEducation] = useState("");
  const [profYears, setProfYears] = useState("");
  const [profLanguages, setProfLanguages] = useState<string[]>([]);
  const [profLanguageInput, setProfLanguageInput] = useState("");
  const [profClients, setProfClients] = useState<string[]>([]);
  const [profSaving, setProfSaving] = useState(false);
  const [profErrors, setProfErrors] = useState<Record<string, string>>({});
  const [profOrigValues, setProfOrigValues] = useState<Record<string, any> | null>(null);

  // ── Membership-Specific state ──
  const [msKeyObjectives, setMsKeyObjectives] = useState<string[]>([]);
  const [msKeyObjectiveInput, setMsKeyObjectiveInput] = useState("");
  const [msAreaOfInterest, setMsAreaOfInterest] = useState<string[]>([]);
  const [msAreaInput, setMsAreaInput] = useState("");
  const [msExpectations, setMsExpectations] = useState("");
  const [msSelfDescription, setMsSelfDescription] = useState("");
  const [msDiscoveryMethod, setMsDiscoveryMethod] = useState("");
  const [msClientComfort, setMsClientComfort] = useState<"" | "YES" | "NO">("");
  const [msTrainingInterest, setMsTrainingInterest] = useState<"" | "YES" | "NO">("");
  const [msSaving, setMsSaving] = useState(false);
  const [msErrors, setMsErrors] = useState<Record<string, string>>({});
  const [msOrigValues, setMsOrigValues] = useState<Record<string, any> | null>(null);

  // ── Government Entity state ──
  const [geSelectedCountry, setGeSelectedCountry] = useState<any>(null);
  const [geAvailableCities, setGeAvailableCities] = useState<any[]>([]);
  const [geSelectedCity, setGeSelectedCity] = useState<any>(null);
  const [geDesignation, setGeDesignation] = useState("");
  const [geOrganizationId, setGeOrganizationId] = useState<number | null>(null);
  const [geOrganizations, setGeOrganizations] = useState<Organization[]>([]);
  const [geLoadingOrgs, setGeLoadingOrgs] = useState(false);
  const [geGovtStreetAddress, setGeGovtStreetAddress] = useState("");
  const [gePassportNumber, setGePassportNumber] = useState("");
  const [gePassportExpiry, setGePassportExpiry] = useState("");
  const [geEmiratesId, setGeEmiratesId] = useState("");
  const [geEmiratesIdExpiry, setGeEmiratesIdExpiry] = useState("");
  const [geTradeLicenseNumber, setGeTradeLicenseNumber] = useState("");
  const [geTradeLicenseExpiry, setGeTradeLicenseExpiry] = useState("");
  const [geSaving, setGeSaving] = useState(false);
  const [geErrors, setGeErrors] = useState<Record<string, string>>({});
  const [geOrigValues, setGeOrigValues] = useState<Record<string, any> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => fetchUserProfile(token || ""),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const countryOptions = Country.getAllCountries().map((c) => ({
    label: c.name,
    value: c.isoCode,
    isoCode: c.isoCode,
  }));

  const isGovernmentEntity =
    (data as UserProfile | undefined)?.membership?.membershipCategory?.name === "Government Entity";

  const TABS = isGovernmentEntity ? GOVT_TABS : DEFAULT_TABS;

  // Load business groups when business-info tab is first visited
  useEffect(() => {
    if (activeTab !== "business-info" || !token || biBusinessGroupOptions.length > 0) return;
    const load = async () => {
      setBiLoadingGroups(true);
      try {
        const result = await fetchBusinessGroups(token, 1, 100);
        setBiBusinessGroupOptions(result.data);
      } catch {
        toast.error("Failed to load business groups");
      } finally {
        setBiLoadingGroups(false);
      }
    };
    load();
  }, [activeTab, token, biBusinessGroupOptions.length]);

  // Load organizations when government-entity-info tab is first visited
  useEffect(() => {
    if (activeTab !== "government-entity-info" || !token || geOrganizations.length > 0) return;
    const load = async () => {
      setGeLoadingOrgs(true);
      try {
        const result = await fetchOrganizations(token, 1, 200);
        setGeOrganizations(result.data);
      } catch {
        toast.error("Failed to load organizations");
      } finally {
        setGeLoadingOrgs(false);
      }
    };
    load();
  }, [activeTab, token, geOrganizations.length]);

  // Populate form when data loads
  useEffect(() => {
    if (!data) return;
    const user = data as UserProfile;

    // ── Profile Info ──
    setBio(user.profile?.bio || "");
    setGender(normalizeGenderValue(user.profile?.gender));
    setIsResident(
      user.profile?.isResident === true
        ? "true"
        : user.profile?.isResident === false
          ? "false"
          : ""
    );

    const countryIso = user.profile?.country || "";
    const countryOption = countryOptions.find((c) => c.isoCode === countryIso) || null;
    setSelectedCountry(countryOption);

    const cityName = user.profile?.city || "";
    if (cityName) setSelectedCity({ value: cityName, label: cityName });

    const nativeCountryName = user.profile?.nativeCountry || "";
    const nativeCountryOption = countryOptions.find((c) => c.label === nativeCountryName) || null;
    setSelectedNativeCountry(nativeCountryOption);

    const nativeCityName = user.profile?.nativeCity || "";
    if (nativeCityName) setSelectedNativeCity({ value: nativeCityName, label: nativeCityName });

    const emiratesNum = String(
      user.membership?.emiratesId || user.profile?.emiratesIdNumber || ""
    ).replace(/\D/g, "");
    setEmiratesIdNumber(emiratesNum);
    setTradeLicenseExpiry(formatDateForInput(user.membership?.tradeLicenseExpiry));
    setPassportExpiry(formatDateForInput(user.membership?.passportExpiryDate));
    setEmiratesIdExpiry(formatDateForInput(user.membership?.emiratesIdExpiryDate));

    setSocialLinks(user.profile?.socialLinks || []);

    const storedLat = parseFloat(user.profile?.latitude || "0");
    const storedLng = parseFloat(user.profile?.longitude || "0");
    if (storedLat && storedLng && !isNaN(storedLat) && !isNaN(storedLng)) {
      setLocation({ lat: storedLat, lng: storedLng });
      setLocationValidated(true);
    }

    setOrigValues({
      bio: user.profile?.bio || "",
      gender: normalizeGenderValue(user.profile?.gender),
      isResident: Boolean(user.profile?.isResident),
      country: countryIso,
      city: cityName,
      nativeCountry: nativeCountryName,
      nativeCity: nativeCityName,
      emiratesIdNumber: emiratesNum,
      emiratesIdExpiry: formatDateForInput(user.membership?.emiratesIdExpiryDate),
    });

    // ── Personal Info ──
    const dob = formatDateForInput(user.membership?.dateOfBirth);
    const pNum = user.membership?.passportNumber || "";
    const pExpiry = formatDateForInput(user.membership?.passportExpiryDate);
    const eidNum = emiratesNum;
    const eidExpiry = formatDateForInput(user.membership?.emiratesIdExpiryDate);
    const mailing = user.membership?.mailingAddress || user.membership?.govtStAddress || "";

    setDateOfBirth(dob);
    setPassportNumber(pNum);
    setPassportExpiryDate(pExpiry);
    setPiEmiratesIdNumber(eidNum);
    setPiEmiratesIdExpiry(eidExpiry);
    setMailingAddress(mailing);
    setPiOrigValues({
      dateOfBirth: dob,
      passportNumber: pNum,
      passportExpiryDate: pExpiry,
      emiratesIdNumber: eidNum,
      emiratesIdExpiry: eidExpiry,
      mailingAddress: mailing,
    });

    // ── Business Info ──
    const m = user.membership;
    setBiCompanyName(m?.companyName || "");
    setBiBusinessAddress(m?.businessAddress || "");

    const biCountryOption =
      countryOptions.find((c) => c.label === m?.country || c.isoCode === m?.country) || null;
    setBiSelectedCountry(biCountryOption);
    if (m?.city) setBiSelectedCity({ value: m.city, label: m.city });
    setBiTradeLicenseNumber(m?.tradeLicenseNumber || "");
    setBiTradeLicenseExpiry(formatDateForInput(m?.tradeLicenseExpiry));
    setBiYearOfEstablishment(m?.yearOfEstablishment ? String(m.yearOfEstablishment) : "");
    setBiAffiliation(m?.affiliation || "");
    setBiLegalStatus(m?.legalStatus || "");
    setBiNatureOfBusiness(m?.natureOfBusiness || "");
    setBiKeywords(m?.keywords || []);
    setBiHsCodes(m?.hsCodes?.map(String) || []);
    setBiWebsite(m?.website || "");
    setBiNoOfEmployees(m?.noOfEmployees ? String(m.noOfEmployees) : "");
    setBiVatRegistrationNumber(m?.vatRegistrationNumber || "");
    setBiEmiratesIssuingAuthority(m?.emiratesIssuingAuthority || "");
    setBiBusinessGroups(m?.businessGroups?.map((bg) => bg.id) || []);

    setBiOrigValues({
      companyName: m?.companyName || "",
      businessAddress: m?.businessAddress || "",
      country: biCountryOption?.isoCode || biCountryOption?.label || "",
      city: m?.city || "",
      tradeLicenseNumber: m?.tradeLicenseNumber || "",
      tradeLicenseExpiry: formatDateForInput(m?.tradeLicenseExpiry),
      yearOfEstablishment: m?.yearOfEstablishment ? String(m.yearOfEstablishment) : "",
      affiliation: m?.affiliation || "",
      legalStatus: m?.legalStatus || "",
      natureOfBusiness: m?.natureOfBusiness || "",
      keywords: m?.keywords || [],
      hsCodes: m?.hsCodes?.map(String) || [],
      website: m?.website || "",
      noOfEmployees: m?.noOfEmployees ? String(m.noOfEmployees) : "",
      vatRegistrationNumber: m?.vatRegistrationNumber || "",
      emiratesIssuingAuthority: m?.emiratesIssuingAuthority || "",
      businessGroups: m?.businessGroups?.map((bg) => bg.id) || [],
    });

    // ── Professional Info ──
    setProfTitle(m?.professionalTitle || "");
    setProfEducation(m?.educationalBackground || "");
    setProfYears(m?.yearsOfExperience != null ? String(m.yearsOfExperience) : "");
    setProfLanguages(m?.languagesSpoken || []);
    setProfClients(m?.primeClients || []);
    setProfOrigValues({
      professionalTitle: m?.professionalTitle || "",
      educationalBackground: m?.educationalBackground || "",
      yearsOfExperience: m?.yearsOfExperience != null ? String(m.yearsOfExperience) : "",
      languagesSpoken: m?.languagesSpoken || [],
      primeClients: m?.primeClients || [],
    });

    // ── Membership-Specific ──
    setMsKeyObjectives(m?.keyObjectives || []);
    setMsAreaOfInterest(m?.areaOfInterest || []);
    setMsExpectations(m?.expectations || "");
    setMsSelfDescription(m?.selfDescription || "");
    setMsDiscoveryMethod(m?.councilDiscoveryMethod || "");
    setMsClientComfort((m?.clientIntroductionComfort as "" | "YES" | "NO") || "");
    setMsTrainingInterest((m?.businessTrainingInterest as "" | "YES" | "NO") || "");
    setMsOrigValues({
      keyObjectives: m?.keyObjectives || [],
      areaOfInterest: m?.areaOfInterest || [],
      expectations: m?.expectations || "",
      selfDescription: m?.selfDescription || "",
      councilDiscoveryMethod: m?.councilDiscoveryMethod || "",
      clientIntroductionComfort: (m?.clientIntroductionComfort as string) || "",
      businessTrainingInterest: (m?.businessTrainingInterest as string) || "",
    });

    // ── Government Entity ──
    const geCountryOption = countryOptions.find((c) => c.label === m?.country || c.isoCode === m?.country) || null;
    setGeSelectedCountry(geCountryOption);
    if (m?.city) setGeSelectedCity({ value: m.city, label: m.city });
    setGeDesignation(m?.designation || "");
    setGeOrganizationId(m?.organizationId ?? null);
    setGeGovtStreetAddress(m?.govtStAddress || "");
    setGePassportNumber(m?.passportNumber || "");
    setGePassportExpiry(formatDateForInput(m?.passportExpiryDate));
    setGeEmiratesId(m?.emiratesId || "");
    setGeEmiratesIdExpiry(formatDateForInput(m?.emiratesIdExpiryDate));
    setGeTradeLicenseNumber(m?.tradeLicenseNumber || "");
    setGeTradeLicenseExpiry(formatDateForInput(m?.tradeLicenseExpiry));
    setGeOrigValues({
      country: geCountryOption?.label || "",
      city: m?.city || "",
      designation: m?.designation || "",
      organizationId: m?.organizationId ?? null,
      govtStAddress: m?.govtStAddress || "",
      passportNumber: m?.passportNumber || "",
      passportExpiry: formatDateForInput(m?.passportExpiryDate),
      emiratesId: m?.emiratesId || "",
      emiratesIdExpiry: formatDateForInput(m?.emiratesIdExpiryDate),
      tradeLicenseNumber: m?.tradeLicenseNumber || "",
      tradeLicenseExpiry: formatDateForInput(m?.tradeLicenseExpiry),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Update city options when profile country changes
  useEffect(() => {
    if (selectedCountry?.isoCode) {
      const cities = City.getCitiesOfCountry(selectedCountry.isoCode) || [];
      const unique = Array.from(new Set(cities.map((c) => c.name.trim()).filter(Boolean)));
      setAvailableCities(unique.map((n) => ({ value: n, label: n })));
    } else {
      setAvailableCities([]);
    }
  }, [selectedCountry]);

  // Update native city options when native country changes
  useEffect(() => {
    if (selectedNativeCountry?.isoCode) {
      const cities = City.getCitiesOfCountry(selectedNativeCountry.isoCode) || [];
      const unique = Array.from(new Set(cities.map((c) => c.name.trim()).filter(Boolean)));
      setAvailableNativeCities(unique.map((n) => ({ value: n, label: n })));
    } else {
      setAvailableNativeCities([]);
    }
  }, [selectedNativeCountry]);

  // Update business info city options when business country changes
  useEffect(() => {
    if (biSelectedCountry?.isoCode) {
      const cities = City.getCitiesOfCountry(biSelectedCountry.isoCode) || [];
      const unique = Array.from(new Set(cities.map((c) => c.name.trim()).filter(Boolean)));
      setBiAvailableCities(unique.map((n) => ({ value: n, label: n })));
    } else {
      setBiAvailableCities([]);
    }
  }, [biSelectedCountry]);

  // Update government entity city options when country changes
  useEffect(() => {
    if (geSelectedCountry?.isoCode) {
      const cities = City.getCitiesOfCountry(geSelectedCountry.isoCode) || [];
      const unique = Array.from(new Set(cities.map((c) => c.name.trim()).filter(Boolean)));
      setGeAvailableCities(unique.map((n) => ({ value: n, label: n })));
    } else {
      setGeAvailableCities([]);
    }
  }, [geSelectedCountry]);

  const handleFileDrop = (key: FileKey, acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setFiles((prev) => ({ ...prev, [key]: file }));
    const objectUrl = URL.createObjectURL(file);
    setPreviews((prev) => ({ ...prev, [key]: objectUrl }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    setRemovedDocs((prev) => prev.filter((k) => k !== key));
  };

  const clearFile = (key: FileKey) => {
    setFiles((prev) => ({ ...prev, [key]: null }));
    setPreviews((prev) => {
      const updated = { ...prev };
      if (updated[key]) URL.revokeObjectURL(updated[key]!);
      delete updated[key];
      return updated;
    });
  };

  // ── Business Info helpers ──
  const addKeyword = () => {
    const kw = biKeywordInput.trim();
    if (!kw) return;
    if (biKeywords.includes(kw)) {
      toast.warning("This keyword is already added");
      return;
    }
    setBiKeywords((prev) => [...prev, kw]);
    setBiKeywordInput("");
  };

  const removeKeyword = (kw: string) => {
    setBiKeywords((prev) => prev.filter((k) => k !== kw));
  };

  const addHsCode = () => {
    const code = biHsCodeInput.trim();
    const pattern = /^\d{4}\.\d{4}$/;
    if (!pattern.test(code)) {
      toast.error("HS Code must be in format: 1234.1234");
      return;
    }
    if (biHsCodes.includes(code)) {
      toast.warning("This HS Code is already added");
      return;
    }
    setBiHsCodes((prev) => [...prev, code]);
    setBiHsCodeInput("");
    setBiErrors((p) => ({ ...p, hsCodes: "" }));
  };

  const removeHsCode = (code: string) => {
    setBiHsCodes((prev) => prev.filter((c) => c !== code));
  };

  const toggleBusinessGroup = (id: number) => {
    setBiBusinessGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id],
    );
    setBiErrors((p) => ({ ...p, businessGroup: "" }));
  };

  const filteredBiGroups = biBusinessGroupOptions.filter((g) =>
    g.name.toLowerCase().includes(biBusinessGroupSearch.trim().toLowerCase()),
  );

  // ── Professional Info helpers ──
  const addLanguage = () => {
    const lang = profLanguageInput.trim();
    if (!lang) return;
    if (profLanguages.includes(lang)) { toast.warning("Language already added"); return; }
    setProfLanguages((p) => [...p, lang]);
    setProfLanguageInput("");
  };
  const removeLanguage = (l: string) => setProfLanguages((p) => p.filter((x) => x !== l));

  const toggleProfClient = (client: string) => {
    setProfClients((p) =>
      p.includes(client) ? p.filter((x) => x !== client) : [...p, client]
    );
    setProfErrors((p) => ({ ...p, primeClients: "" }));
  };

  // ── Membership-Specific helpers ──
  const addKeyObjective = () => {
    const kw = msKeyObjectiveInput.trim();
    if (!kw) return;
    if (msKeyObjectives.includes(kw)) { toast.warning("Objective already added"); return; }
    setMsKeyObjectives((p) => [...p, kw]);
    setMsKeyObjectiveInput("");
  };
  const removeKeyObjective = (kw: string) => setMsKeyObjectives((p) => p.filter((x) => x !== kw));

  const addAreaOfInterest = () => {
    const a = msAreaInput.trim();
    if (!a) return;
    if (msAreaOfInterest.includes(a)) { toast.warning("Area already added"); return; }
    setMsAreaOfInterest((p) => [...p, a]);
    setMsAreaInput("");
  };
  const removeAreaOfInterest = (a: string) => setMsAreaOfInterest((p) => p.filter((x) => x !== a));

  // ── Location helpers ──
  const normalizeLocationText = (value: string) =>
    value.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");

  const getAddressComponentValue = (components: any[], allowedTypes: string[]) => {
    const item = components.find((c) =>
      c.types.some((t: string) => allowedTypes.includes(t)),
    );
    return item?.long_name || "";
  };

  const validateCoordinatesWithinSelectedLocation = async (lat: number, lng: number) => {
    if (!selectedCountry?.isoCode || !selectedCity?.value) {
      return { isValid: false, error: "Please select country and city before choosing a map location." };
    }
    if (typeof window === "undefined" || !window.google?.maps) {
      return { isValid: false, error: "Google Maps is not loaded yet. Please try again." };
    }
    try {
      const geocoder = new window.google.maps.Geocoder();
      const geocodeResult = await geocoder.geocode({ location: { lat, lng } });
      const topResult = geocodeResult.results?.[0];
      if (!topResult) {
        return { isValid: false, error: "Unable to validate selected location. Please try another point." };
      }
      const components = topResult.address_components || [];
      const detectedCountry = getAddressComponentValue(components, ["country"]);
      const detectedCityCandidates = [
        getAddressComponentValue(components, ["locality"]),
        getAddressComponentValue(components, ["postal_town"]),
        getAddressComponentValue(components, ["administrative_area_level_2"]),
        getAddressComponentValue(components, ["administrative_area_level_1"]),
        getAddressComponentValue(components, ["sublocality", "sublocality_level_1"]),
      ].filter(Boolean);

      const expectedCountry = normalizeLocationText(selectedCountry.label);
      const actualCountry = normalizeLocationText(detectedCountry);
      if (!actualCountry || actualCountry !== expectedCountry) {
        return { isValid: false, error: `Location must be within ${selectedCountry.label}.` };
      }
      const expectedCity = normalizeLocationText(selectedCity.value);
      const cityMatches = detectedCityCandidates.some((candidate) => {
        const n = normalizeLocationText(candidate);
        return n === expectedCity || n.includes(expectedCity) || expectedCity.includes(n);
      });
      if (!cityMatches) {
        return { isValid: false, error: `Location must be within ${selectedCity.value}, ${selectedCountry.label}.` };
      }
      return { isValid: true };
    } catch {
      return { isValid: false, error: "Unable to validate location. Please try another point." };
    }
  };

  const applyValidatedLocation = async (lat: number, lng: number) => {
    const validation = await validateCoordinatesWithinSelectedLocation(lat, lng);
    if (!validation.isValid) {
      setErrors((prev) => ({ ...prev, location: validation.error || "Invalid location selected." }));
      return;
    }
    setLocation({ lat, lng });
    setLocationValidated(true);
    setErrors((prev) => ({ ...prev, location: "" }));
  };

  // ── Social links helpers ──
  const normalizeSocialUrl = (url = "") => {
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const detectPlatformFromUrl = (url = "") => {
    const normalized = normalizeSocialUrl(url);
    if (!normalized) return "";
    return Object.keys(SOCIAL_URL_PATTERNS).find((key) =>
      SOCIAL_URL_PATTERNS[key].test(normalized),
    ) || "";
  };

  const addSocialLinkRow = () => {
    if (socialLinks.length >= SOCIAL_PLATFORM_OPTIONS.length) return;
    setSocialLinks((prev) => [...prev, { platform: "", url: "" }]);
  };

  const removeSocialLinkRow = (index: number) => {
    setSocialLinks((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[`socialLink-${index}`];
      return updated;
    });
  };

  const updateSocialLink = (index: number, field: "platform" | "url", value: string) => {
    setSocialLinks((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
              ...(field === "url" && !item.platform
                ? { platform: detectPlatformFromUrl(value) }
                : {}),
            }
          : item,
      ),
    );
    setErrors((prev) => ({ ...prev, [`socialLink-${index}`]: "" }));
  };

  const buildSocialLinksToSubmit = () => {
    const linkErrors: Record<string, string> = {};
    const linksToSubmit: Array<{ platform: string; url: string }> = [];
    socialLinks.forEach((link, index) => {
      const platform = link.platform?.trim();
      const url = link.url?.trim();
      if (!platform && !url) return;
      const normalizedUrl = normalizeSocialUrl(url);
      const inferredPlatform = detectPlatformFromUrl(normalizedUrl);
      const finalPlatform = platform || inferredPlatform;
      if (!finalPlatform && url) {
        linkErrors[`socialLink-${index}`] = "Use a supported social URL or select its platform";
        return;
      }
      if (normalizedUrl) {
        const pattern = SOCIAL_URL_PATTERNS[finalPlatform];
        if (pattern && !pattern.test(normalizedUrl)) {
          linkErrors[`socialLink-${index}`] = `Please enter a valid ${finalPlatform} link`;
          return;
        }
        linksToSubmit.push({ platform: finalPlatform, url: normalizedUrl });
      }
    });
    return { linkErrors, linksToSubmit };
  };

  const markDocForRemoval = (key: string) => {
    setRemovedDocs((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const undoDocRemoval = (key: string) => {
    setRemovedDocs((prev) => prev.filter((k) => k !== key));
  };

  // ── Validators ──
  const validate = () => {
    const newErrors: Record<string, string> = {};
    const user = data as UserProfile | undefined;

    if (!bio.trim() || bio.length < 5 || bio.length > 1000) {
      newErrors.bio =
        bio.length === 0
          ? "Bio is required"
          : "Bio must be between 5 and 1000 characters";
    }

    if (!isResident) newErrors.isResident = "Residency status is required";

    if (!selectedCountry) newErrors.country = "Country of residence is required";
    if (!selectedCity) newErrors.city = "City of residence is required";

    if (!selectedNativeCountry) newErrors.nativeCountry = "Native Country is required";
    if (!selectedNativeCity) newErrors.nativeCity = "Native City is required";

    if (!locationValidated) {
      newErrors.location = "Please pick your location on the map";
    } else if (errors.location) {
      newErrors.location = errors.location;
    }

    const hasPassport = files.passport || user?.profile?.passport;
    if (!hasPassport) newErrors.passport = "Passport is required";

    if (isResident === "true") {
      const hasEmiratesDoc = files.emiratesId || user?.profile?.emiratesId;
      if (!hasEmiratesDoc) newErrors.emiratesId = "Emirates ID document is required for residents";
    }

    const hasExistingPassport = !!(user?.profile?.passport || user?.isDocumentReviewPending);
    if (files.passportSecondary && !files.passport && !hasExistingPassport) {
      newErrors.passportSecondary = "Upload primary Passport before the secondary document";
    }
    const hasExistingEmiratesId = !!(user?.profile?.emiratesId || user?.isDocumentReviewPending);
    if (files.emiratesIdSecondary && !files.emiratesId && !hasExistingEmiratesId) {
      newErrors.emiratesIdSecondary = "Upload primary Emirates ID before the secondary document";
    }
    const hasExistingTradeLicense = !!(user?.profile?.tradeLicense || user?.isDocumentReviewPending);
    if (files.tradeLicenseSecondary && !files.tradeLicense && !hasExistingTradeLicense) {
      newErrors.tradeLicenseSecondary = "Upload primary Trade Licence before the secondary document";
    }

    if (files.tradeLicense && !tradeLicenseExpiry) {
      newErrors.tradeLicenseExpiry = "Trade Licence expiry date is required when uploading a Trade Licence document";
    }

    if (files.passport && !passportExpiry) {
      newErrors.passportExpiry = "Passport expiry date is required when uploading a Passport document";
    }

    if (files.emiratesId && isResident === "true") {
      if (!emiratesIdExpiry) {
        newErrors.emiratesIdExpiry = "Emirates ID expiry date is required when uploading the document";
      }
    }

    const { linkErrors } = buildSocialLinksToSubmit();
    Object.assign(newErrors, linkErrors);

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit handlers ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the errors before saving");
      return;
    }
    if (!token) return;

    const user = data as UserProfile;
    const form = new FormData();

    if (bio !== origValues?.bio) form.append("bio", bio);
    if (gender !== origValues?.gender) form.append("gender", gender);
    form.append("isResident", String(isResident === "true"));

    if (selectedCountry?.isoCode) form.append("country", selectedCountry.isoCode);

    const cityName = selectedCity?.value || "";
    if (cityName) form.append("city", cityName);

    const nativeCountryName = selectedNativeCountry?.label || "";
    if (nativeCountryName !== origValues?.nativeCountry) {
      form.append("nativeCountry", nativeCountryName);
    }

    const nativeCityName = selectedNativeCity?.value || "";
    if (nativeCityName !== origValues?.nativeCity) {
      form.append("nativeCity", nativeCityName);
    }

    const tradeLicenseDocsToRemove = removedDocs.filter((k) =>
      ["tradeLicense", "tradeLicenseSecondary"].includes(k),
    );

    const isDocumentUploaded = !!(
      files.tradeLicense ||
      files.tradeLicenseSecondary ||
      files.passport ||
      files.passportSecondary ||
      files.emiratesId ||
      files.emiratesIdSecondary ||
      tradeLicenseDocsToRemove.length > 0
    );

    if (files.profilePicture) form.append("profilePicture", files.profilePicture);
    if (files.bioVideo) form.append("bioVideo", files.bioVideo);

    if (files.tradeLicense) form.append("tradeLicense", files.tradeLicense);
    if (tradeLicenseExpiry && (files.tradeLicense || (user.profile?.tradeLicense && !removedDocs.includes("tradeLicense")))) {
      form.append("tradeLicenseExpiry", tradeLicenseExpiry);
    }
    if (files.tradeLicenseSecondary) form.append("tradeLicenseSecondary", files.tradeLicenseSecondary);

    if (files.passport) form.append("passport", files.passport);
    if (passportExpiry && (files.passport || user.profile?.passport)) {
      form.append("passportExpiryDate", passportExpiry);
    }
    if (files.passportSecondary) form.append("passportSecondary", files.passportSecondary);

    if (files.emiratesId) form.append("emiratesId", files.emiratesId);
    if (files.emiratesIdSecondary) form.append("emiratesIdSecondary", files.emiratesIdSecondary);
    if (emiratesIdExpiry) form.append("emiratesIdExpiryDate", emiratesIdExpiry);
    if (emiratesIdNumber) {
      const normalizedEid = emiratesIdNumber.replace(/\D/g, "");
      if (normalizedEid.length === 15 && normalizedEid.startsWith("784")) {
        form.append("emiratesIdNumber", normalizedEid);
      }
    }

    const { linksToSubmit } = buildSocialLinksToSubmit();
    linksToSubmit.forEach((link) => {
      form.append(`socialLinks[${link.platform}]`, link.url);
    });

    const storedLat = parseFloat(user.profile?.latitude || "0");
    const storedLng = parseFloat(user.profile?.longitude || "0");
    if (locationValidated && (location.lat !== storedLat || location.lng !== storedLng)) {
      form.append("latitude", location.lat.toFixed(7));
      form.append("longitude", location.lng.toFixed(7));
    }

    try {
      setSaving(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/profile`,
        { method: "PATCH", headers: { token }, body: form }
      );
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error?.[0]?.msg || "Failed to update profile");
      }

      if (tradeLicenseDocsToRemove.includes("tradeLicense")) {
        const deleteRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/profile/primary-docs`,
          { method: "DELETE", headers: { token, "Content-Type": "application/json" }, body: JSON.stringify({ deleteTradeLicense: true }) },
        );
        if (!deleteRes.ok) {
          const deleteResult = await deleteRes.json();
          throw new Error(deleteResult.error?.[0]?.msg || "Failed to remove trade licence");
        }
      }
      if (tradeLicenseDocsToRemove.includes("tradeLicenseSecondary")) {
        const deleteRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/profile/secondary-docs`,
          { method: "DELETE", headers: { token, "Content-Type": "application/json" }, body: JSON.stringify({ deleteTradeLicenseSecondary: true }) },
        );
        if (!deleteRes.ok) {
          const deleteResult = await deleteRes.json();
          throw new Error(deleteResult.error?.[0]?.msg || "Failed to remove secondary trade licence");
        }
      }

      if (isDocumentUploaded) {
        toast.success(
          "Profile updated. You've been logged out as your documents are under review. You'll be notified once approved."
        );
        logout();
        router.push("/authentication/sign-in");
      } else {
        toast.success("Profile updated successfully");
        await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
        router.back();
      }
    } catch (err: any) {
      toast.error(err.message || "Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const handlePersonalInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validate mandatory fields
    if (!dateOfBirth.trim()) {
      newErrors.dateOfBirth = "Date of Birth is required";
    }
    if (!passportNumber.trim()) {
      newErrors.passportNumber = "Passport Number is required";
    }
    if (!passportExpiryDate.trim()) {
      newErrors.passportExpiryDate = "Passport Expiry Date is required";
    }
    if (!mailingAddress.trim()) {
      newErrors.mailingAddress = "Mailing Address is required";
    }

    const isRes = isResident === "true";
    if (isRes && piEmiratesIdNumber) {
      const normalized = piEmiratesIdNumber.replace(/\D/g, "");
      if (normalized.length !== 15 || !normalized.startsWith("784")) {
        newErrors.piEmiratesIdNumber =
          "Emirates ID must be 15 digits starting with 784";
      }
    }
    if (Object.keys(newErrors).length > 0) {
      setPiErrors(newErrors);
      toast.error("Please fix the errors before saving");
      return;
    }

    if (!token) return;
    try {
      setPiSaving(true);
      const body: Record<string, string> = {};

      if (dateOfBirth !== piOrigValues?.dateOfBirth) body.dateOfBirth = dateOfBirth;
      if (passportNumber !== piOrigValues?.passportNumber) body.passportNumber = passportNumber;
      if (passportExpiryDate !== piOrigValues?.passportExpiryDate) body.passportExpiryDate = passportExpiryDate;
      if (isRes) {
        if (piEmiratesIdNumber !== piOrigValues?.emiratesIdNumber)
          body.emiratesIdNumber = piEmiratesIdNumber.replace(/\D/g, "");
        if (piEmiratesIdExpiry !== piOrigValues?.emiratesIdExpiry)
          body.emiratesIdExpiryDate = piEmiratesIdExpiry;
      }
      if (mailingAddress !== piOrigValues?.mailingAddress) body.address = mailingAddress;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/profile/personal-info`,
        {
          method: "PATCH",
          headers: { token, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error?.[0]?.msg || "Failed to update personal info");
      }
      toast.success("Personal information updated successfully");
      await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      setPiOrigValues({
        dateOfBirth,
        passportNumber,
        passportExpiryDate,
        emiratesIdNumber: piEmiratesIdNumber,
        emiratesIdExpiry: piEmiratesIdExpiry,
        mailingAddress,
      });
    } catch (err: any) {
      toast.error(err.message || "Error updating personal information");
    } finally {
      setPiSaving(false);
    }
  };

  const handleBusinessInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!biCompanyName.trim()) newErrors.companyName = "Company Name is required";
    if (!biBusinessAddress.trim()) newErrors.businessAddress = "Business Address is required";
    if (!biSelectedCountry) newErrors.country = "Country is required";
    if (!biSelectedCity) newErrors.city = "City is required";

    // Mandatory business detail fields
    if (!biYearOfEstablishment.trim()) {
      newErrors.yearOfEstablishment = "Year of Establishment is required";
    } else {
      const yr = Number(biYearOfEstablishment);
      const currentYear = new Date().getFullYear();
      if (isNaN(yr) || yr < 1800 || yr > currentYear) {
        newErrors.yearOfEstablishment = `Enter a valid year between 1800 and ${currentYear}`;
      }
    }
    if (!biAffiliation.trim()) newErrors.affiliation = "Affiliation with Other Orgs is required";
    if (!biLegalStatus.trim()) newErrors.legalStatus = "Legal Status is required";
    if (!biNatureOfBusiness.trim()) newErrors.natureOfBusiness = "Nature of Business is required";

    if (biBusinessGroups.length === 0) newErrors.businessGroup = "Select at least one Business Group";

    if (biKeywords.length === 0) newErrors.keywords = "Add at least one Keyword";

    if (biHsCodes.length === 0) {
      newErrors.hsCodes = "Add at least one HS Code";
    } else if (biHsCodes.some((c) => !/^\d{4}\.\d{4}$/.test(c))) {
      newErrors.hsCodes = "HS Code must be in format: 1234.1234";
    }

    // Website mandatory
    if (!biWebsite.trim()) {
      newErrors.website = "Website is required";
    } else {
      try {
        new URL(biWebsite);
      } catch {
        newErrors.website = "Enter a valid URL (e.g. https://example.com)";
      }
    }

    // Number of Employees mandatory
    if (!biNoOfEmployees.trim()) {
      newErrors.noOfEmployees = "Number of Employees is required";
    } else if (!/^\d+$/.test(biNoOfEmployees) || Number(biNoOfEmployees) < 1) {
      newErrors.noOfEmployees = "Enter a valid positive number";
    }

    // VAT Registration Number mandatory
    if (!biVatRegistrationNumber.trim()) newErrors.vatRegistrationNumber = "VAT Registration Number is required";

    // Emirates / Issuing Authority mandatory
    if (!biEmiratesIssuingAuthority.trim()) newErrors.emiratesIssuingAuthority = "Emirates / Issuing Authority is required";

    // Trade License: if number is entered, expiry date is mandatory
    if (biTradeLicenseNumber.trim() && !biTradeLicenseExpiry.trim()) {
      newErrors.tradeLicenseExpiry = "Trade License Expiry Date is required when License Number is provided";
    }

    // Trade License Expiry Date must be a future date
    if (biTradeLicenseExpiry.trim()) {
      const expiryDate = new Date(biTradeLicenseExpiry);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate <= today) {
        newErrors.tradeLicenseExpiry = "Trade License Expiry Date must be a future date";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setBiErrors(newErrors);
      toast.error("Please fix the errors before saving");
      return;
    }

    if (!token) return;
    try {
      setBiSaving(true);

      const body: Record<string, any> = {};
      if (biCompanyName !== biOrigValues?.companyName) body.companyName = biCompanyName;
      if (biBusinessAddress !== biOrigValues?.businessAddress) body.businessAddress = biBusinessAddress;

      const countryLabel = biSelectedCountry?.label || "";
      if (countryLabel !== biOrigValues?.country) body.country = countryLabel;

      const cityVal = biSelectedCity?.value || "";
      if (cityVal !== biOrigValues?.city) body.city = cityVal;

      if (biTradeLicenseNumber !== biOrigValues?.tradeLicenseNumber)
        body.tradeLicenseNumber = biTradeLicenseNumber;
      if (biTradeLicenseExpiry !== biOrigValues?.tradeLicenseExpiry)
        body.tradeLicenseExpiry = biTradeLicenseExpiry;
      if (biYearOfEstablishment !== biOrigValues?.yearOfEstablishment)
        body.yearOfEstablishment = biYearOfEstablishment ? Number(biYearOfEstablishment) : null;
      if (biAffiliation !== biOrigValues?.affiliation) body.affiliation = biAffiliation;
      if (biLegalStatus !== biOrigValues?.legalStatus) body.legalStatus = biLegalStatus;
      if (biNatureOfBusiness !== biOrigValues?.natureOfBusiness) body.natureOfBusiness = biNatureOfBusiness;

      const kwChanged = JSON.stringify(biKeywords) !== JSON.stringify(biOrigValues?.keywords);
      if (kwChanged) body.keywords = biKeywords;

      const hsChanged = JSON.stringify(biHsCodes) !== JSON.stringify(biOrigValues?.hsCodes);
      if (hsChanged) body.hsCodes = biHsCodes;

      if (biWebsite !== biOrigValues?.website) body.website = biWebsite;
      if (biNoOfEmployees !== biOrigValues?.noOfEmployees)
        body.noOfEmployees = biNoOfEmployees ? Number(biNoOfEmployees) : null;
      if (biVatRegistrationNumber !== biOrigValues?.vatRegistrationNumber)
        body.vatRegistrationNumber = biVatRegistrationNumber;
      if (biEmiratesIssuingAuthority !== biOrigValues?.emiratesIssuingAuthority)
        body.emiratesIssuingAuthority = biEmiratesIssuingAuthority;

      const bgChanged =
        JSON.stringify([...biBusinessGroups].sort()) !==
        JSON.stringify([...(biOrigValues?.businessGroups || [])].sort());
      if (bgChanged) body.businessGroup = biBusinessGroups;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/profile/business-info`,
        {
          method: "PATCH",
          headers: { token, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error?.[0]?.msg || "Failed to update business information");
      }
      toast.success("Business information updated successfully");
      await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      setBiOrigValues({
        companyName: biCompanyName,
        businessAddress: biBusinessAddress,
        country: countryLabel,
        city: cityVal,
        tradeLicenseNumber: biTradeLicenseNumber,
        tradeLicenseExpiry: biTradeLicenseExpiry,
        yearOfEstablishment: biYearOfEstablishment,
        affiliation: biAffiliation,
        legalStatus: biLegalStatus,
        natureOfBusiness: biNatureOfBusiness,
        keywords: biKeywords,
        hsCodes: biHsCodes,
        website: biWebsite,
        noOfEmployees: biNoOfEmployees,
        vatRegistrationNumber: biVatRegistrationNumber,
        emiratesIssuingAuthority: biEmiratesIssuingAuthority,
        businessGroups: biBusinessGroups,
      });
    } catch (err: any) {
      toast.error(err.message || "Error updating business information");
    } finally {
      setBiSaving(false);
    }
  };

  const handleProfessionalInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validate mandatory fields
    if (!profTitle.trim()) newErrors.professionalTitle = "Professional Title / Designation is required";
    
    if (!profYears.trim()) {
      newErrors.yearsOfExperience = "Years of Experience is required";
    } else if (isNaN(Number(profYears)) || Number(profYears) < 0) {
      newErrors.yearsOfExperience = "Enter a valid non-negative number";
    }

    if (profLanguages.length === 0) newErrors.languagesSpoken = "Add at least one Language";

    if (profClients.length === 0) newErrors.primeClients = "Add at least one Prime Client";

    if (Object.keys(newErrors).length > 0) {
      setProfErrors(newErrors);
      toast.error("Please fix the errors before saving");
      return;
    }
    if (!token) return;
    try {
      setProfSaving(true);
      const body: Record<string, any> = {};
      if (profTitle !== profOrigValues?.professionalTitle) body.professionalTitle = profTitle;
      if (profEducation !== profOrigValues?.educationalBackground) body.educationalBackground = profEducation;
      if (profYears !== profOrigValues?.yearsOfExperience)
        body.yearsOfExperience = profYears ? Number(profYears) : null;
      if (JSON.stringify(profLanguages) !== JSON.stringify(profOrigValues?.languagesSpoken))
        body.languagesSpoken = profLanguages;
      if (JSON.stringify(profClients) !== JSON.stringify(profOrigValues?.primeClients))
        body.primeClients = profClients;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/profile/professional-info`,
        { method: "PATCH", headers: { token, "Content-Type": "application/json" }, body: JSON.stringify(body) },
      );
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error?.[0]?.msg || "Failed to update professional information");
      }
      toast.success("Professional information updated successfully");
      await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      setProfOrigValues({
        professionalTitle: profTitle,
        educationalBackground: profEducation,
        yearsOfExperience: profYears,
        languagesSpoken: profLanguages,
        primeClients: profClients,
      });
    } catch (err: any) {
      toast.error(err.message || "Error updating professional information");
    } finally {
      setProfSaving(false);
    }
  };

  const handleMembershipPreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (msKeyObjectives.length === 0) newErrors.keyObjectives = "Add at least one Key Objective";
    if (msAreaOfInterest.length === 0) newErrors.areaOfInterest = "Add at least one Area of Interest";
    if (!msExpectations.trim()) newErrors.expectations = "Required";
    if (!msSelfDescription.trim()) newErrors.selfDescription = "Required";
    if (!msDiscoveryMethod.trim()) newErrors.councilDiscoveryMethod = "Required";
    if (!msClientComfort) newErrors.clientIntroductionComfort = "Required";
    if (!msTrainingInterest) newErrors.businessTrainingInterest = "Required";

    if (Object.keys(newErrors).length > 0) {
      setMsErrors(newErrors);
      toast.error("Please fix the errors before saving");
      return;
    }
    if (!token) return;
    try {
      setMsSaving(true);
      const body: Record<string, any> = {};
      if (JSON.stringify(msKeyObjectives) !== JSON.stringify(msOrigValues?.keyObjectives))
        body.keyObjectives = msKeyObjectives;
      if (JSON.stringify(msAreaOfInterest) !== JSON.stringify(msOrigValues?.areaOfInterest))
        body.areaOfInterest = msAreaOfInterest;
      if (msExpectations !== msOrigValues?.expectations) body.expectations = msExpectations;
      if (msSelfDescription !== msOrigValues?.selfDescription) body.selfDescription = msSelfDescription;
      if (msDiscoveryMethod !== msOrigValues?.councilDiscoveryMethod) body.councilDiscoveryMethod = msDiscoveryMethod;
      if (msClientComfort !== msOrigValues?.clientIntroductionComfort) body.clientIntroductionComfort = msClientComfort;
      if (msTrainingInterest !== msOrigValues?.businessTrainingInterest) body.businessTrainingInterest = msTrainingInterest;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/profile/membership-preferences`,
        { method: "PATCH", headers: { token, "Content-Type": "application/json" }, body: JSON.stringify(body) },
      );
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error?.[0]?.msg || "Failed to update membership preferences");
      }
      toast.success("Membership preferences updated successfully");
      await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      setMsOrigValues({
        keyObjectives: msKeyObjectives,
        areaOfInterest: msAreaOfInterest,
        expectations: msExpectations,
        selfDescription: msSelfDescription,
        councilDiscoveryMethod: msDiscoveryMethod,
        clientIntroductionComfort: msClientComfort,
        businessTrainingInterest: msTrainingInterest,
      });
    } catch (err: any) {
      toast.error(err.message || "Error updating membership preferences");
    } finally {
      setMsSaving(false);
    }
  };

  const handleGovernmentEntitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    const isRes = isResident === "true";

    // Country & City
    if (!geSelectedCountry) newErrors.country = "Required";
    if (!geSelectedCity) newErrors.city = "Required";

    // Designation & Organization & Government Address
    if (!geDesignation.trim()) newErrors.designation = "Required";
    if (!geOrganizationId) newErrors.organizationId = "Required";
    if (!geGovtStreetAddress.trim()) newErrors.govtStAddress = "Required";

    // Passport
    if (!gePassportNumber.trim()) newErrors.passportNumber = "Required";
    if (!gePassportExpiry) newErrors.passportExpiry = "Required";

    // Emirates ID (required for residents)
    if (isRes) {
      if (!geEmiratesId.trim()) newErrors.emiratesId = "Required";
      else {
        const normalized = geEmiratesId.replace(/\D/g, "");
        if (normalized.length !== 15 || !normalized.startsWith("784")) {
          newErrors.emiratesId = "Emirates ID must be 15 digits starting with 784";
        }
      }
      if (!geEmiratesIdExpiry) newErrors.emiratesIdExpiry = "Required";
    }

    // Trade License (optional, but if number is provided, expiry becomes mandatory and must be future)
    if (geTradeLicenseNumber.trim()) {
      if (!geTradeLicenseExpiry) {
        newErrors.tradeLicenseExpiry = "Trade License Expiry Date is required when License Number is provided";
      } else {
        const expiryDate = new Date(geTradeLicenseExpiry);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiryDate <= today) {
          newErrors.tradeLicenseExpiry = "Trade License Expiry Date must be a future date";
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setGeErrors(newErrors);
      toast.error("Please fix the errors before saving");
      return;
    }
    if (!token) return;
    try {
      setGeSaving(true);
      const body: Record<string, any> = {};

      const countryLabel = geSelectedCountry?.label || "";
      if (countryLabel !== geOrigValues?.country) body.country = countryLabel;

      const cityVal = geSelectedCity?.value || "";
      if (cityVal !== geOrigValues?.city) body.city = cityVal;

      if (geDesignation !== geOrigValues?.designation) body.designation = geDesignation;
      if (geOrganizationId !== geOrigValues?.organizationId) body.organizationId = geOrganizationId;
      if (geGovtStreetAddress !== geOrigValues?.govtStAddress) body.govtStAddress = geGovtStreetAddress;
      if (gePassportNumber !== geOrigValues?.passportNumber) body.passportNumber = gePassportNumber;
      if (gePassportExpiry !== geOrigValues?.passportExpiry) body.passportExpiryDate = gePassportExpiry;

      if (isRes) {
        const normalizedEid = geEmiratesId.replace(/\D/g, "");
        if (normalizedEid !== geOrigValues?.emiratesId) body.emiratesId = normalizedEid;
        if (geEmiratesIdExpiry !== geOrigValues?.emiratesIdExpiry) body.emiratesIdExpiryDate = geEmiratesIdExpiry;
      }

      if (geTradeLicenseNumber !== geOrigValues?.tradeLicenseNumber) body.tradeLicenseNumber = geTradeLicenseNumber;
      if (geTradeLicenseExpiry !== geOrigValues?.tradeLicenseExpiry) body.tradeLicenseExpiry = geTradeLicenseExpiry;

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/profile/government-entity-info`,
        { method: "PATCH", headers: { token, "Content-Type": "application/json" }, body: JSON.stringify(body) },
      );
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error?.[0]?.msg || "Failed to update government entity information");
      }
      toast.success("Government entity information updated successfully");
      await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      setGeOrigValues({
        country: countryLabel,
        city: cityVal,
        designation: geDesignation,
        organizationId: geOrganizationId,
        govtStAddress: geGovtStreetAddress,
        passportNumber: gePassportNumber,
        passportExpiry: gePassportExpiry,
        emiratesId: geEmiratesId.replace(/\D/g, ""),
        emiratesIdExpiry: geEmiratesIdExpiry,
        tradeLicenseNumber: geTradeLicenseNumber,
        tradeLicenseExpiry: geTradeLicenseExpiry,
      });
    } catch (err: any) {
      toast.error(err.message || "Error updating government entity information");
    } finally {
      setGeSaving(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gold-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading profile…</p>
        </div>
      </div>
    );
  }

  const user = data as UserProfile;

  return (
    <div className="max-w-4xl mx-auto pb-16">
      {/* Page header */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 flex-shrink-0">
            <Image
              src={user.profilePicture ?? demoImage}
              alt="Profile"
              width={56}
              height={56}
              className="rounded-full object-cover w-full h-full"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Profile</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{user.name}</p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`
                px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${activeTab === tab.id
                  ? "border-gold-600 text-gold-600 dark:text-gold-400 dark:border-gold-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-500"
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Profile Info tab ── */}
      {activeTab === "profile-info" && (
        <form onSubmit={handleSubmit} className="space-y-10">

          {/* Profile Information */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Profile Information"
              description="Your public bio visible to other members"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
            <div>
              <FieldLabel htmlFor="bio" label="Bio" required hint="5–1000 characters" />
              <textarea
                id="bio"
                value={bio}
                onChange={(e) => { setBio(e.target.value); setErrors((p) => ({ ...p, bio: "" })); }}
                placeholder="Tell other members about yourself…"
                rows={4}
                className={`${inputCls} resize-none`}
              />
              <div className="flex justify-between mt-1">
                <FieldError message={errors.bio} />
                <span className={`text-xs ml-auto ${bio.length > 1000 ? "text-red-500" : "text-gray-400"}`}>
                  {bio.length}/1000
                </span>
              </div>
            </div>
            <div className="mt-5">
              <FieldLabel htmlFor="gender" label="Gender" hint="Optional" />
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={inputCls}
              >
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Residency & Location */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Residency & Location"
              description="Your current place of residence"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-1">
                <FieldLabel htmlFor="isResident" label="Resident Status" required />
                <select
                  id="isResident"
                  value={isResident}
                  onChange={(e) => {
                    setIsResident(e.target.value as "" | "true" | "false");
                    setErrors((p) => ({ ...p, isResident: "" }));
                  }}
                  className={inputCls}
                >
                  <option value="">Select status</option>
                  <option value="true">UAE Resident</option>
                  <option value="false">UAE Non-Resident</option>
                </select>
                <FieldError message={errors.isResident} />
              </div>

              <div className="md:col-span-1">
                <FieldLabel label="Country of Residence" required />
                <Select
                  options={countryOptions}
                  value={selectedCountry}
                  onChange={(val: any) => {
                    setSelectedCountry(val);
                    setSelectedCity(null);
                    setLocationValidated(false);
                    setErrors((p) => ({ ...p, country: "", city: "", location: "" }));
                  }}
                  placeholder="Select country"
                  isClearable
                  styles={selectStyles}
                  classNamePrefix="rselect"
                />
                <FieldError message={errors.country} />
              </div>

              <div className="md:col-span-1">
                <FieldLabel label="City of Residence" required />
                <Select
                  options={availableCities}
                  value={selectedCity}
                  onChange={(val: any) => {
                    setSelectedCity(val);
                    setLocationValidated(false);
                    setErrors((p) => ({ ...p, city: "", location: "" }));
                  }}
                  placeholder={selectedCountry ? "Select city" : "Select country first"}
                  isClearable
                  isDisabled={!selectedCountry}
                  styles={selectStyles}
                  classNamePrefix="rselect"
                />
                <FieldError message={errors.city} />
              </div>
            </div>
          </div>

          {/* Location Picker */}
          {(() => {
            const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
            const canPickLocation = !!(selectedCountry && selectedCity);
            return (
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                <SectionHeading
                  title="Pick Location"
                  description="Select country & city above, then pin your exact location"
                  icon={
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                />
                {!googleMapsApiKey ? (
                  <div className="h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-xl text-sm text-red-400 text-center px-4">
                    Google Maps API key is missing.
                  </div>
                ) : (
                  <LoadScript googleMapsApiKey={googleMapsApiKey} libraries={googleLibraries}>
                    <div className="mb-3">
                      <Autocomplete
                        onLoad={(inst) => { autocompleteRef.current = inst; }}
                        onPlaceChanged={async () => {
                          const place = autocompleteRef.current?.getPlace?.();
                          const lat = place?.geometry?.location?.lat?.();
                          const lng = place?.geometry?.location?.lng?.();
                          if (typeof lat === "number" && typeof lng === "number") {
                            await applyValidatedLocation(lat, lng);
                          }
                        }}
                      >
                        <input
                          value={mapSearchInput}
                          onChange={(e) => setMapSearchInput(e.target.value)}
                          placeholder={canPickLocation ? "Search for a location…" : "Select country and city first"}
                          disabled={!canPickLocation}
                          className={`${inputCls} disabled:opacity-60 disabled:cursor-not-allowed`}
                        />
                      </Autocomplete>
                    </div>
                    <div className={`h-60 rounded-xl overflow-hidden border ${errors.location ? "border-red-400" : "border-gray-200 dark:border-gray-700"}`}>
                      <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={location}
                        zoom={12}
                        onClick={async (event: any) => {
                          if (!canPickLocation) return;
                          const lat = event?.latLng?.lat?.();
                          const lng = event?.latLng?.lng?.();
                          if (typeof lat === "number" && typeof lng === "number") {
                            await applyValidatedLocation(lat, lng);
                          }
                        }}
                      >
                        <Marker
                          position={location}
                          draggable={canPickLocation}
                          onDragEnd={async (event: any) => {
                            const lat = event?.latLng?.lat?.();
                            const lng = event?.latLng?.lng?.();
                            if (typeof lat === "number" && typeof lng === "number") {
                              await applyValidatedLocation(lat, lng);
                            }
                          }}
                        />
                      </GoogleMap>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                    </p>
                    {errors.location && (
                      <p className="text-red-500 text-xs mt-1">{errors.location}</p>
                    )}
                    {!canPickLocation && (
                      <p className="text-amber-500 text-xs mt-1">Select your country and city of residence above to enable the map.</p>
                    )}
                  </LoadScript>
                )}
              </div>
            );
          })()}

          {/* Country of Origin */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Country of Origin"
              description="Your home country and city"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <FieldLabel label="Native Country" required />
                <Select
                  options={countryOptions}
                  value={selectedNativeCountry}
                  onChange={(val: any) => {
                    setSelectedNativeCountry(val);
                    setSelectedNativeCity(null);
                    setErrors((p) => ({ ...p, nativeCountry: "" }));
                  }}
                  placeholder="Select native country"
                  isClearable
                  styles={selectStyles}
                  classNamePrefix="rselect"
                />
                <FieldError message={errors.nativeCountry} />
              </div>
              <div>
                <FieldLabel label="Native City" required />
                <Select
                  options={availableNativeCities}
                  value={selectedNativeCity}
                  onChange={(val: any) => {
                    setSelectedNativeCity(val);
                    setErrors((p) => ({ ...p, nativeCity: "" }));
                  }}
                  placeholder={selectedNativeCountry ? "Select native city" : "Select native country first"}
                  isClearable
                  isDisabled={!selectedNativeCountry}
                  styles={selectStyles}
                  classNamePrefix="rselect"
                />
                <FieldError message={errors.nativeCity} />
              </div>
            </div>
          </div>

          {/* Social Media Links */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Social Media Links"
              description="Optional — add your public social profiles"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              }
            />
            <div className="space-y-3">
              {socialLinks.map((link, index) => (
                <div key={`social-${index}`}>
                  <div className="grid grid-cols-12 gap-2">
                    <select
                      value={link.platform}
                      onChange={(e) => updateSocialLink(index, "platform", e.target.value)}
                      className={`col-span-4 ${inputCls}`}
                    >
                      <option value="">Platform</option>
                      {SOCIAL_PLATFORM_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => updateSocialLink(index, "url", e.target.value)}
                      placeholder="Paste profile URL"
                      className={`col-span-7 ${inputCls}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeSocialLinkRow(index)}
                      className="col-span-1 rounded-lg border border-red-400 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {errors[`socialLink-${index}`] && (
                    <p className="text-red-500 text-xs mt-1">{errors[`socialLink-${index}`]}</p>
                  )}
                </div>
              ))}
            </div>
            {socialLinks.length < SOCIAL_PLATFORM_OPTIONS.length && (
              <button
                type="button"
                onClick={addSocialLinkRow}
                className="mt-3 text-sm text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-300 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add social link
              </button>
            )}
          </div>

          {/* Profile Media */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Profile Media"
              description="Profile picture and introduction video"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FileUploadZone
                label="Profile Picture"
                file={files.profilePicture ?? null}
                preview={previews.profilePicture}
                accept={ACCEPTED_FILE_TYPES.profilePicture}
                onDrop={(f) => handleFileDrop("profilePicture", f)}
                onClear={() => clearFile("profilePicture")}
                existingUrl={user.profilePicture ?? undefined}
                error={errors.profilePicture}
              />
              <FileUploadZone
                label="Bio Video"
                file={files.bioVideo ?? null}
                preview={previews.bioVideo}
                accept={ACCEPTED_FILE_TYPES.bioVideo}
                onDrop={(f) => handleFileDrop("bioVideo", f)}
                onClear={() => clearFile("bioVideo")}
                existingUrl={user.profile?.bioVideo ?? undefined}
                error={errors.bioVideo}
              />
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Documents"
              description="Uploading new documents will put your profile under review"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />

            <div className="flex items-start gap-2.5 p-3.5 mb-6 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50">
              <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Uploading any document will log you out and place your profile under review. You will be notified once approved.
              </p>
            </div>

            {/* Trade Licence */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-gold-500" />
                Trade Licence
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <FileUploadZone
                    label="Trade Licence"
                    file={files.tradeLicense ?? null}
                    preview={previews.tradeLicense}
                    accept={ACCEPTED_FILE_TYPES.tradeLicense}
                    onDrop={(f) => handleFileDrop("tradeLicense", f)}
                    onClear={() => clearFile("tradeLicense")}
                    existingUrl={removedDocs.includes("tradeLicense") ? undefined : (user.profile?.tradeLicense ?? undefined)}
                    error={errors.tradeLicense}
                  />
                  {(files.tradeLicense || (user.profile?.tradeLicense && !removedDocs.includes("tradeLicense"))) && (
                    <div>
                      <FieldLabel htmlFor="tlExpiry" label="Expiry Date" required={!!files.tradeLicense} />
                      <input
                        id="tlExpiry"
                        type="date"
                        value={tradeLicenseExpiry}
                        onChange={(e) => { setTradeLicenseExpiry(e.target.value); setErrors((p) => ({ ...p, tradeLicenseExpiry: "" })); }}
                        className={inputCls}
                      />
                      <FieldError message={errors.tradeLicenseExpiry} />
                    </div>
                  )}
                  {user.profile?.tradeLicense && !files.tradeLicense && !removedDocs.includes("tradeLicense") && (
                    <button
                      type="button"
                      onClick={() => markDocForRemoval("tradeLicense")}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Remove document
                    </button>
                  )}
                  {removedDocs.includes("tradeLicense") && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-red-500">Will be removed on save</span>
                      <button type="button" onClick={() => undoDocRemoval("tradeLicense")} className="text-blue-500 hover:underline">Undo</button>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <FileUploadZone
                    label="Trade Licence (Secondary)"
                    file={files.tradeLicenseSecondary ?? null}
                    preview={previews.tradeLicenseSecondary}
                    accept={ACCEPTED_FILE_TYPES.tradeLicenseSecondary}
                    onDrop={(f) => handleFileDrop("tradeLicenseSecondary", f)}
                    onClear={() => clearFile("tradeLicenseSecondary")}
                    existingUrl={removedDocs.includes("tradeLicenseSecondary") ? undefined : (user.profile?.tradeLicenseSecondary ?? undefined)}
                    error={errors.tradeLicenseSecondary}
                    disabled={!files.tradeLicense && !user.profile?.tradeLicense && !user.isDocumentReviewPending}
                    disabledReason={!files.tradeLicense && !user.profile?.tradeLicense && !user.isDocumentReviewPending ? "Upload the primary Trade Licence first" : undefined}
                  />
                  {user.profile?.tradeLicenseSecondary && !files.tradeLicenseSecondary && !removedDocs.includes("tradeLicenseSecondary") && (
                    <button
                      type="button"
                      onClick={() => markDocForRemoval("tradeLicenseSecondary")}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Remove secondary
                    </button>
                  )}
                  {removedDocs.includes("tradeLicenseSecondary") && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-red-500">Will be removed on save</span>
                      <button type="button" onClick={() => undoDocRemoval("tradeLicenseSecondary")} className="text-blue-500 hover:underline">Undo</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Passport */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                Passport
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <FileUploadZone
                    label="Passport"
                    required
                    file={files.passport ?? null}
                    preview={previews.passport}
                    accept={ACCEPTED_FILE_TYPES.passport}
                    onDrop={(f) => handleFileDrop("passport", f)}
                    onClear={() => clearFile("passport")}
                    existingUrl={user.profile?.passport ?? undefined}
                    error={errors.passport}
                  />
                  {(files.passport || user.profile?.passport) && (
                    <div>
                      <FieldLabel htmlFor="passportExpiry" label="Expiry Date" required={!!files.passport} />
                      <input
                        id="passportExpiry"
                        type="date"
                        value={passportExpiry}
                        onChange={(e) => { setPassportExpiry(e.target.value); setErrors((p) => ({ ...p, passportExpiry: "" })); }}
                        className={inputCls}
                      />
                      <FieldError message={errors.passportExpiry} />
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <FileUploadZone
                    label="Passport (Secondary)"
                    file={files.passportSecondary ?? null}
                    preview={previews.passportSecondary}
                    accept={ACCEPTED_FILE_TYPES.passportSecondary}
                    onDrop={(f) => handleFileDrop("passportSecondary", f)}
                    onClear={() => clearFile("passportSecondary")}
                    existingUrl={user.profile?.passportSecondary ?? undefined}
                    error={errors.passportSecondary}
                    disabled={!files.passport && !user.profile?.passport && !user.isDocumentReviewPending}
                    disabledReason={!files.passport && !user.profile?.passport && !user.isDocumentReviewPending ? "Upload the primary Passport first" : undefined}
                  />
                </div>
              </div>
            </div>

            {/* Emirates ID */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500" />
                Emirates ID
                {isResident === "true" && (
                  <span className="text-xs font-normal text-red-500">(required for residents)</span>
                )}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                <div className="space-y-3">
                  <FileUploadZone
                    label="Emirates ID"
                    required={isResident === "true"}
                    file={files.emiratesId ?? null}
                    preview={previews.emiratesId}
                    accept={ACCEPTED_FILE_TYPES.emiratesId}
                    onDrop={(f) => handleFileDrop("emiratesId", f)}
                    onClear={() => clearFile("emiratesId")}
                    existingUrl={user.profile?.emiratesId ?? undefined}
                    error={errors.emiratesId}
                  />
                  {(files.emiratesId || user.profile?.emiratesId) && (
                    <div className="grid grid-cols-1 gap-3">
                      {/* <div>
                        <FieldLabel htmlFor="eidNumber" label="Emirates ID Number" hint="15 digits, starts with 784" />
                        <input
                          id="eidNumber"
                          type="text"
                          value={emiratesIdNumber}
                          onChange={(e) => {
                            setEmiratesIdNumber(e.target.value);
                            setErrors((p) => ({ ...p, emiratesIdNumber: "" }));
                          }}
                          placeholder="784XXXXXXXXXXXX"
                          maxLength={18}
                          className={inputCls}
                        />
                        <FieldError message={errors.emiratesIdNumber} />
                      </div> */}
                      <div>
                        <FieldLabel htmlFor="eidExpiry" label="Expiry Date" required={!!files.emiratesId && isResident === "true"} />
                        <input
                          id="eidExpiry"
                          type="date"
                          value={emiratesIdExpiry}
                          onChange={(e) => {
                            setEmiratesIdExpiry(e.target.value);
                            setErrors((p) => ({ ...p, emiratesIdExpiry: "" }));
                          }}
                          className={inputCls}
                        />
                        <FieldError message={errors.emiratesIdExpiry} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <FileUploadZone
                    label="Emirates ID (Secondary)"
                    file={files.emiratesIdSecondary ?? null}
                    preview={previews.emiratesIdSecondary}
                    accept={ACCEPTED_FILE_TYPES.emiratesIdSecondary}
                    onDrop={(f) => handleFileDrop("emiratesIdSecondary", f)}
                    onClear={() => clearFile("emiratesIdSecondary")}
                    existingUrl={user.profile?.emiratesIdSecondary ?? undefined}
                    error={errors.emiratesIdSecondary}
                    disabled={!files.emiratesId && !user.profile?.emiratesId && !user.isDocumentReviewPending}
                    disabledReason={!files.emiratesId && !user.profile?.emiratesId && !user.isDocumentReviewPending ? "Upload the primary Emirates ID first" : undefined}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save bar */}
          <div className="sticky bottom-0 z-10 -mx-4 px-4 py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <p className="text-xs text-gray-400 hidden sm:block">
                Changes to documents will require profile re-approval.
              </p>
              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 text-sm font-medium rounded-lg bg-gold-600 hover:bg-gold-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

        </form>
      )}

      {/* ── Personal Information tab ── */}
      {activeTab === "personal-info" && (
        <form onSubmit={handlePersonalInfoSubmit} className="space-y-8">

          {/* Identity & Travel Document */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Identity & Travel Document"
              description="Passport details and date of birth"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                </svg>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <FieldLabel htmlFor="dob" label="Date of Birth" required />
                <input
                  id="dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => {
                    setDateOfBirth(e.target.value);
                    setPiErrors((p) => ({ ...p, dateOfBirth: "" }));
                  }}
                  className={inputCls}
                />
                <FieldError message={piErrors.dateOfBirth} />
              </div>
              <div>
                <FieldLabel htmlFor="passportNum" label="Passport Number" required />
                <input
                  id="passportNum"
                  type="text"
                  value={passportNumber}
                  onChange={(e) => {
                    setPassportNumber(e.target.value);
                    setPiErrors((p) => ({ ...p, passportNumber: "" }));
                  }}
                  placeholder="e.g. A12345678"
                  className={inputCls}
                />
                <FieldError message={piErrors.passportNumber} />
              </div>
              <div>
                <FieldLabel htmlFor="passportExpiry" label="Passport Expiry Date" required />
                <input
                  id="passportExpiry"
                  type="date"
                  value={passportExpiryDate}
                  onChange={(e) => {
                    setPassportExpiryDate(e.target.value);
                    setPiErrors((p) => ({ ...p, passportExpiryDate: "" }));
                  }}
                  className={inputCls}
                />
                <FieldError message={piErrors.passportExpiryDate} />
              </div>
            </div>
          </div>

          {/* Emirates ID — residents only */}
          {isResident === "true" && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <SectionHeading
                title="Emirates ID"
                description="Required for UAE residents"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 9a2 2 0 10-4 0v5a2 2 0 01-2 2h6m-6-4h4m8 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <FieldLabel
                    htmlFor="piEidNumber"
                    label="Emirates ID Number"
                    hint="15 digits, starts with 784"
                  />
                  <input
                    id="piEidNumber"
                    type="text"
                    value={piEmiratesIdNumber}
                    onChange={(e) => {
                      setPiEmiratesIdNumber(e.target.value);
                      setPiErrors((p) => ({ ...p, piEmiratesIdNumber: "" }));
                    }}
                    placeholder="784XXXXXXXXXXXX"
                    maxLength={18}
                    className={inputCls}
                  />
                  <FieldError message={piErrors.piEmiratesIdNumber} />
                </div>
                <div>
                  <FieldLabel htmlFor="piEidExpiry" label="Emirates ID Expiry Date" />
                  <input
                    id="piEidExpiry"
                    type="date"
                    value={piEmiratesIdExpiry}
                    onChange={(e) => setPiEmiratesIdExpiry(e.target.value)}
                    className={inputCls}
                  />
                  <FieldError message={piErrors.piEmiratesIdExpiry} />
                </div>
              </div>
            </div>
          )}

          {/* Mailing Address */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Mailing Address"
              description="Your official correspondence address"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              }
            />
            <div>
              <FieldLabel htmlFor="mailingAddr" label="Mailing Address" required />
              <textarea
                id="mailingAddr"
                value={mailingAddress}
                onChange={(e) => {
                  setMailingAddress(e.target.value);
                  setPiErrors((p) => ({ ...p, mailingAddress: "" }));
                }}
                placeholder="Enter your full mailing address…"
                rows={3}
                className={`${inputCls} resize-none`}
              />
              <FieldError message={piErrors.mailingAddress} />
            </div>
          </div>

          {/* Save bar */}
          <div className="sticky bottom-0 z-10 -mx-4 px-4 py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <p className="text-xs text-gray-400 hidden sm:block">
                {isResident !== "true" && "Emirates ID fields are hidden for non-residents."}
              </p>
              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={piSaving}
                  className="px-6 py-2.5 text-sm font-medium rounded-lg bg-gold-600 hover:bg-gold-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {piSaving && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {piSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

        </form>
      )}

      {/* ── Business Information tab ── */}
      {activeTab === "business-info" && (
        <form onSubmit={handleBusinessInfoSubmit} className="space-y-8">

          {/* Company & Address */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Company & Address"
              description="Your business name and registered address"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
            />
            <div className="space-y-5">
              <div>
                <FieldLabel htmlFor="biCompanyName" label="Company Name" required />
                <input
                  id="biCompanyName"
                  type="text"
                  value={biCompanyName}
                  onChange={(e) => { setBiCompanyName(e.target.value); setBiErrors((p) => ({ ...p, companyName: "" })); }}
                  placeholder="Enter company name"
                  className={inputCls}
                />
                <FieldError message={biErrors.companyName} />
              </div>
              <div>
                <FieldLabel htmlFor="biBusinessAddress" label="Business Address" required />
                <textarea
                  id="biBusinessAddress"
                  value={biBusinessAddress}
                  onChange={(e) => { setBiBusinessAddress(e.target.value); setBiErrors((p) => ({ ...p, businessAddress: "" })); }}
                  placeholder="Enter full business address"
                  rows={3}
                  className={`${inputCls} resize-none`}
                />
                <FieldError message={biErrors.businessAddress} />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Business Location"
              description="Country and city where your business operates"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <FieldLabel label="Country of Residence" required />
                <Select
                  options={countryOptions}
                  value={biSelectedCountry}
                  onChange={(val: any) => {
                    setBiSelectedCountry(val);
                    setBiSelectedCity(null);
                    setBiErrors((p) => ({ ...p, country: "" }));
                  }}
                  placeholder="Select country"
                  isClearable
                  styles={selectStyles}
                  classNamePrefix="rselect"
                />
                <FieldError message={biErrors.country} />
              </div>
              <div>
                <FieldLabel label="City of Residence" required />
                <Select
                  options={biAvailableCities}
                  value={biSelectedCity}
                  onChange={(val: any) => {
                    setBiSelectedCity(val);
                    setBiErrors((p) => ({ ...p, city: "" }));
                  }}
                  placeholder={biSelectedCountry ? "Select city" : "Select country first"}
                  isClearable
                  isDisabled={!biSelectedCountry}
                  styles={selectStyles}
                  classNamePrefix="rselect"
                />
                <FieldError message={biErrors.city} />
              </div>
            </div>
          </div>

          {/* Trade License */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Trade License"
              description="License number and expiry information"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <FieldLabel htmlFor="biTlNumber" label="Trade License Number" hint="optional" />
                <input
                  id="biTlNumber"
                  type="text"
                  value={biTradeLicenseNumber}
                  onChange={(e) => { setBiTradeLicenseNumber(e.target.value); setBiErrors((p) => ({ ...p, tradeLicenseExpiry: "" })); }}
                  placeholder="e.g. TL-123456"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel htmlFor="biTlExpiry" label="Trade License Expiry Date" required={biTradeLicenseNumber.trim() !== ""} hint={biTradeLicenseNumber.trim() ? undefined : "optional"} />
                <input
                  id="biTlExpiry"
                  type="date"
                  value={biTradeLicenseExpiry}
                  onChange={(e) => { setBiTradeLicenseExpiry(e.target.value); setBiErrors((p) => ({ ...p, tradeLicenseExpiry: "" })); }}
                  className={inputCls}
                />
                <FieldError message={biErrors.tradeLicenseExpiry} />
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Business Details"
              description="Establishment year, legal standing, and nature of business"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <FieldLabel htmlFor="biYear" label="Year of Establishment" required />
                <input
                  id="biYear"
                  type="number"
                  value={biYearOfEstablishment}
                  onChange={(e) => { setBiYearOfEstablishment(e.target.value); setBiErrors((p) => ({ ...p, yearOfEstablishment: "" })); }}
                  placeholder="e.g. 2005"
                  min={1800}
                  max={new Date().getFullYear()}
                  className={inputCls}
                />
                <FieldError message={biErrors.yearOfEstablishment} />
              </div>
              <div>
                <FieldLabel htmlFor="biAffiliation" label="Affiliation with Other Orgs" required />
                <input
                  id="biAffiliation"
                  type="text"
                  value={biAffiliation}
                  onChange={(e) => { setBiAffiliation(e.target.value); setBiErrors((p) => ({ ...p, affiliation: "" })); }}
                  placeholder="e.g. Chamber of Commerce"
                  className={inputCls}
                />
                <FieldError message={biErrors.affiliation} />
              </div>
              <div>
                <FieldLabel htmlFor="biLegalStatus" label="Legal Status" required />
                <input
                  id="biLegalStatus"
                  type="text"
                  value={biLegalStatus}
                  onChange={(e) => { setBiLegalStatus(e.target.value); setBiErrors((p) => ({ ...p, legalStatus: "" })); }}
                  placeholder="e.g. LLC, Sole Proprietor"
                  className={inputCls}
                />
                <FieldError message={biErrors.legalStatus} />
              </div>
              <div>
                <FieldLabel htmlFor="biNatureOfBusiness" label="Nature of Business" required />
                <input
                  id="biNatureOfBusiness"
                  type="text"
                  value={biNatureOfBusiness}
                  onChange={(e) => { setBiNatureOfBusiness(e.target.value); setBiErrors((p) => ({ ...p, natureOfBusiness: "" })); }}
                  placeholder="e.g. IT, Education, Trading"
                  className={inputCls}
                />
                <FieldError message={biErrors.natureOfBusiness} />
              </div>
            </div>
          </div>

          {/* Business Groups */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Business Groups"
              description="Select at least one business group (Required)"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
            <div>
              <input
                type="text"
                placeholder="Search business groups…"
                value={biBusinessGroupSearch}
                onChange={(e) => setBiBusinessGroupSearch(e.target.value)}
                className={`${inputCls} mb-3`}
              />
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 h-56 overflow-y-auto space-y-2 bg-gray-50 dark:bg-gray-900/30">
                {biLoadingGroups && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-4 h-4 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                    Loading business groups…
                  </div>
                )}
                {!biLoadingGroups && filteredBiGroups.map((group) => (
                  <label
                    key={group.id}
                    className="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gold-600 dark:hover:text-gold-400 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={biBusinessGroups.includes(group.id!)}
                      onChange={() => toggleBusinessGroup(group.id!)}
                      className="rounded border-gray-300 text-gold-600 focus:ring-gold-500"
                    />
                    {group.name}
                  </label>
                ))}
                {!biLoadingGroups && biBusinessGroupOptions.length === 0 && (
                  <p className="text-sm text-gray-400">No business groups found.</p>
                )}
                {!biLoadingGroups && biBusinessGroupOptions.length > 0 && filteredBiGroups.length === 0 && (
                  <p className="text-sm text-gray-400">No groups match your search.</p>
                )}
              </div>
              {biBusinessGroups.length > 0 && (
                <p className="mt-2 text-xs text-gold-600 dark:text-gold-400">
                  {biBusinessGroups.length} group{biBusinessGroups.length !== 1 ? "s" : ""} selected
                </p>
              )}
              <FieldError message={biErrors.businessGroup} />
            </div>
          </div>

          {/* Products & Services */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Products & Services"
              description="Keywords and HS codes are required to describe your business"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              }
            />
            <div className="space-y-6">
              {/* Keywords */}
              <div>
                <FieldLabel label="Keywords" required />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={biKeywordInput}
                    onChange={(e) => { setBiKeywordInput(e.target.value); setBiErrors((p) => ({ ...p, keywords: "" })); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                    placeholder="e.g. trading, legal, consulting"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={addKeyword}
                    disabled={!biKeywordInput.trim()}
                    className="px-4 py-2.5 text-sm font-medium rounded-lg bg-gold-600 hover:bg-gold-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
                {biKeywords.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {biKeywords.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 dark:bg-gold-900/40 px-3 py-1 text-xs font-medium text-gold-800 dark:text-gold-300"
                      >
                        {kw}
                        <button
                          type="button"
                          onClick={() => removeKeyword(kw)}
                          className="text-gold-600 hover:text-gold-800 dark:text-gold-400 dark:hover:text-gold-200"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <FieldError message={biErrors.keywords} />
              </div>

              {/* HS Codes */}
              <div>
                <FieldLabel label="HS Codes" required />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={biHsCodeInput}
                    onChange={(e) => { setBiHsCodeInput(e.target.value); setBiErrors((p) => ({ ...p, hsCodes: "" })); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addHsCode(); } }}
                    placeholder="e.g. 1234.5678"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    onClick={addHsCode}
                    disabled={!biHsCodeInput.trim()}
                    className="px-4 py-2.5 text-sm font-medium rounded-lg bg-gold-600 hover:bg-gold-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-gray-400">Format: 4 digits, dot, 4 digits (e.g. 1234.5678)</p>
                {biHsCodes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {biHsCodes.map((code) => (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 dark:bg-gold-900/40 px-3 py-1 text-xs font-medium text-gold-800 dark:text-gold-300"
                      >
                        {code}
                        <button
                          type="button"
                          onClick={() => removeHsCode(code)}
                          className="text-gold-600 hover:text-gold-800 dark:text-gold-400 dark:hover:text-gold-200"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <FieldError message={biErrors.hsCodes} />
              </div>
            </div>
          </div>

          {/* Online Presence & Registration */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Online Presence & Registration"
              description="Website, employee count, and tax registration"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <FieldLabel htmlFor="biWebsite" label="Website" required />
                <input
                  id="biWebsite"
                  type="url"
                  value={biWebsite}
                  onChange={(e) => { setBiWebsite(e.target.value); setBiErrors((p) => ({ ...p, website: "" })); }}
                  placeholder="https://example.com"
                  className={inputCls}
                />
                <FieldError message={biErrors.website} />
              </div>
              <div>
                <FieldLabel htmlFor="biNoOfEmployees" label="Number of Employees" required />
                <input
                  id="biNoOfEmployees"
                  type="number"
                  value={biNoOfEmployees}
                  onChange={(e) => { setBiNoOfEmployees(e.target.value); setBiErrors((p) => ({ ...p, noOfEmployees: "" })); }}
                  placeholder="e.g. 50"
                  min={1}
                  className={inputCls}
                />
                <FieldError message={biErrors.noOfEmployees} />
              </div>
              <div>
                <FieldLabel htmlFor="biVat" label="VAT Registration Number" required />
                <input
                  id="biVat"
                  type="text"
                  value={biVatRegistrationNumber}
                  onChange={(e) => { setBiVatRegistrationNumber(e.target.value); setBiErrors((p) => ({ ...p, vatRegistrationNumber: "" })); }}
                  placeholder="e.g. TRN100000000000"
                  className={inputCls}
                />
                <FieldError message={biErrors.vatRegistrationNumber} />
              </div>
            </div>
          </div>

          {/* Emirates / Issuing Authority */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Emirates / Issuing Authority"
              description="The emirate or authority that issued your trade license"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              }
            />
            <div>
              <FieldLabel htmlFor="biIssuingAuth" label="Emirates / Issuing Authority" required />
              <input
                id="biIssuingAuth"
                type="text"
                value={biEmiratesIssuingAuthority}
                onChange={(e) => { setBiEmiratesIssuingAuthority(e.target.value); setBiErrors((p) => ({ ...p, emiratesIssuingAuthority: "" })); }}
                placeholder="e.g. Dubai DED, Abu Dhabi ADDED"
                className={inputCls}
              />
              <FieldError message={biErrors.emiratesIssuingAuthority} />
            </div>
          </div>

          {/* Save bar */}
          <div className="sticky bottom-0 z-10 -mx-4 px-4 py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <p className="text-xs text-gray-400 hidden sm:block">
                Business information updates are applied immediately.
              </p>
              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={biSaving}
                  className="px-6 py-2.5 text-sm font-medium rounded-lg bg-gold-600 hover:bg-gold-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {biSaving && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  {biSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

        </form>
      )}

      {/* ── Professional Information tab ── */}
      {activeTab === "professional-info" && (
        <form onSubmit={handleProfessionalInfoSubmit} className="space-y-8">

          {/* Title & Experience */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Role & Experience"
              description="Your current professional title and years of experience"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <FieldLabel htmlFor="profTitle" label="Professional Title / Designation" required />
                <input
                  id="profTitle"
                  type="text"
                  value={profTitle}
                  onChange={(e) => { setProfTitle(e.target.value); setProfErrors((p) => ({ ...p, professionalTitle: "" })); }}
                  placeholder="e.g. Managing Director"
                  className={inputCls}
                />
                <FieldError message={profErrors.professionalTitle} />
              </div>
              <div>
                <FieldLabel htmlFor="profYears" label="Years of Experience in Current Role" required />
                <input
                  id="profYears"
                  type="number"
                  min={0}
                  value={profYears}
                  onChange={(e) => { setProfYears(e.target.value); setProfErrors((p) => ({ ...p, yearsOfExperience: "" })); }}
                  placeholder="e.g. 10"
                  className={inputCls}
                />
                <FieldError message={profErrors.yearsOfExperience} />
              </div>
            </div>
          </div>

          {/* Educational Background */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Educational Background"
              description="Your academic qualifications and institutions"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 14l9-5-9-5-9 5 9 5z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                  <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                </svg>
              }
            />
            <div>
              <FieldLabel htmlFor="profEducation" label="Educational Background" />
              <textarea
                id="profEducation"
                value={profEducation}
                onChange={(e) => { setProfEducation(e.target.value); setProfErrors((p) => ({ ...p, educationalBackground: "" })); }}
                placeholder="e.g. MBA from University of Dubai, BSc in Engineering from AUS"
                rows={3}
                className={`${inputCls} resize-none`}
              />
              <FieldError message={profErrors.educationalBackground} />
            </div>
          </div>

          {/* Languages Spoken */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Languages Spoken"
              description="Add at least one language you communicate in professionally"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
              }
            />
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={profLanguageInput}
                onChange={(e) => { setProfLanguageInput(e.target.value); setProfErrors((p) => ({ ...p, languagesSpoken: "" })); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLanguage(); } }}
                placeholder="e.g. Arabic, English, Urdu"
                className={`${inputCls} flex-1`}
              />
              <button
                type="button"
                onClick={addLanguage}
                className="px-4 py-2.5 text-sm font-medium rounded-lg bg-gold-600 hover:bg-gold-700 text-white transition-colors"
              >
                Add
              </button>
            </div>
            {profLanguages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {profLanguages.map((lang) => (
                  <span key={lang} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-gold-50 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300 border border-gold-200 dark:border-gold-700">
                    {lang}
                    <button type="button" onClick={() => removeLanguage(lang)} className="hover:text-red-500 transition-colors">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            <FieldError message={profErrors.languagesSpoken} />
          </div>

          {/* Prime Clients */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Prime Clients"
              description="Select at least one type of client or organisation you have worked with"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...new Set([...PREDEFINED_CLIENT_TYPES, ...profClients])].map((clientType) => (
                <label key={clientType} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={profClients.includes(clientType)}
                    onChange={() => { toggleProfClient(clientType); }}
                    className="w-4 h-4 text-gold-600 bg-white border-gray-300 rounded focus:ring-gold-500 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{clientType}</span>
                </label>
              ))}
            </div>
            <FieldError message={profErrors.primeClients} />
          </div>

          {/* Save bar */}
          <div className="sticky bottom-0 z-10 -mx-4 px-4 py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-4xl mx-auto flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={profSaving}
                className="px-6 py-2.5 text-sm font-medium rounded-lg bg-gold-600 hover:bg-gold-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {profSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {profSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>

        </form>
      )}

      {/* ── Membership-Specific Information tab ── */}
      {activeTab === "membership-specific" && (
        <form onSubmit={handleMembershipPreferencesSubmit} className="space-y-8">

          {/* Key Objectives & Areas of Interest */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Objectives & Interests"
              description="Your goals and areas of focus within the council"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
            />
            <div className="space-y-6">
              {/* Key Objectives */}
              <div>
                <FieldLabel label="Key Objectives for Joining the Council" required />
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={msKeyObjectiveInput}
                    onChange={(e) => { setMsKeyObjectiveInput(e.target.value); setMsErrors((p) => ({ ...p, keyObjectives: "" })); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyObjective(); } }}
                    placeholder="e.g. Expand business network"
                    className={`${inputCls} flex-1`}
                  />
                  <button type="button" onClick={addKeyObjective} className="px-4 py-2.5 text-sm font-medium rounded-lg bg-gold-600 hover:bg-gold-700 text-white transition-colors">Add</button>
                </div>
                {msKeyObjectives.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msKeyObjectives.map((kw) => (
                      <span key={kw} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-gold-50 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300 border border-gold-200 dark:border-gold-700">
                        {kw}
                        <button type="button" onClick={() => removeKeyObjective(kw)} className="hover:text-red-500 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <FieldError message={msErrors.keyObjectives} />
              </div>

              {/* Areas of Interest */}
              <div>
                <FieldLabel label="Specific Areas of Interest" required />
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={msAreaInput}
                    onChange={(e) => { setMsAreaInput(e.target.value); setMsErrors((p) => ({ ...p, areaOfInterest: "" })); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAreaOfInterest(); } }}
                    placeholder="e.g. Trade Finance, Logistics"
                    className={`${inputCls} flex-1`}
                  />
                  <button type="button" onClick={addAreaOfInterest} className="px-4 py-2.5 text-sm font-medium rounded-lg bg-gold-600 hover:bg-gold-700 text-white transition-colors">Add</button>
                </div>
                {msAreaOfInterest.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msAreaOfInterest.map((a) => (
                      <span key={a} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                        {a}
                        <button type="button" onClick={() => removeAreaOfInterest(a)} className="hover:text-red-500 transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <FieldError message={msErrors.areaOfInterest} />
              </div>
            </div>
          </div>

          {/* Expectations & Self Description */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Expectations & Self-Reflection"
              description="What you expect from PBC and how you describe yourself"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }
            />
            <div className="space-y-5">
              <div>
                <FieldLabel htmlFor="msExpectations" label="What are your expectations from PBC?" required />
                <textarea
                  id="msExpectations"
                  value={msExpectations}
                  onChange={(e) => { setMsExpectations(e.target.value); setMsErrors((p) => ({ ...p, expectations: "" })); }}
                  placeholder="Describe what you hope to gain from your membership…"
                  rows={4}
                  className={`${inputCls} resize-none`}
                />
                <FieldError message={msErrors.expectations} />
              </div>
              <div>
                <FieldLabel htmlFor="msSelfDesc" label="What do you think about yourself?" required />
                <textarea
                  id="msSelfDesc"
                  value={msSelfDescription}
                  onChange={(e) => { setMsSelfDescription(e.target.value); setMsErrors((p) => ({ ...p, selfDescription: "" })); }}
                  placeholder="Describe yourself as a professional and as a council member…"
                  rows={4}
                  className={`${inputCls} resize-none`}
                />
                <FieldError message={msErrors.selfDescription} />
              </div>
            </div>
          </div>

          {/* Discovery Method & Preferences */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Council Discovery & Preferences"
              description="How you found us and your participation preferences"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <div className="space-y-5">
              <div>
                <FieldLabel htmlFor="msDiscovery" label="How did you learn about the Council?" required />
                <input
                  id="msDiscovery"
                  type="text"
                  value={msDiscoveryMethod}
                  onChange={(e) => { setMsDiscoveryMethod(e.target.value); setMsErrors((p) => ({ ...p, councilDiscoveryMethod: "" })); }}
                  placeholder="e.g. Through a friend, LinkedIn, PBC event"
                  className={inputCls}
                />
                <FieldError message={msErrors.councilDiscoveryMethod} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <FieldLabel htmlFor="msClientComfort" label="Comfortable introducing clients to members in different trade?" required />
                  <select
                    id="msClientComfort"
                    value={msClientComfort}
                    onChange={(e) => { setMsClientComfort(e.target.value as "" | "YES" | "NO"); setMsErrors((p) => ({ ...p, clientIntroductionComfort: "" })); }}
                    className={inputCls}
                  >
                    <option value="">Select an option</option>
                    <option value="YES">Yes</option>
                    <option value="NO">No</option>
                  </select>
                  <FieldError message={msErrors.clientIntroductionComfort} />
                </div>
                <div>
                  <FieldLabel htmlFor="msTraining" label="Interested in business trainings and brainstorming workshops?" required />
                  <select
                    id="msTraining"
                    value={msTrainingInterest}
                    onChange={(e) => { setMsTrainingInterest(e.target.value as "" | "YES" | "NO"); setMsErrors((p) => ({ ...p, businessTrainingInterest: "" })); }}
                    className={inputCls}
                  >
                    <option value="">Select an option</option>
                    <option value="YES">Yes</option>
                    <option value="NO">No</option>
                  </select>
                  <FieldError message={msErrors.businessTrainingInterest} />
                </div>
              </div>
            </div>
          </div>

          {/* Save bar */}
          <div className="sticky bottom-0 z-10 -mx-4 px-4 py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-4xl mx-auto flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={msSaving}
                className="px-6 py-2.5 text-sm font-medium rounded-lg bg-gold-600 hover:bg-gold-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {msSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {msSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>

        </form>
      )}

      {/* ── Government Entity Information tab ── */}
      {activeTab === "government-entity-info" && (
        <form onSubmit={handleGovernmentEntitySubmit} className="space-y-8">

          {/* Location */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Location"
              description="Country and city of your government entity"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <FieldLabel label="Country" required />
                <Select
                  options={countryOptions}
                  value={geSelectedCountry}
                  onChange={(val: any) => { setGeSelectedCountry(val); setGeSelectedCity(null); setGeErrors((p) => ({ ...p, country: "" })); }}
                  placeholder="Select country"
                  isClearable
                  styles={selectStyles}
                  classNamePrefix="rselect"
                />
                <FieldError message={geErrors.country} />
              </div>
              <div>
                <FieldLabel label="City" required />
                <Select
                  options={geAvailableCities}
                  value={geSelectedCity}
                  onChange={(val: any) => { setGeSelectedCity(val); setGeErrors((p) => ({ ...p, city: "" })); }}
                  placeholder={geSelectedCountry ? "Select city" : "Select country first"}
                  isClearable
                  isDisabled={!geSelectedCountry}
                  styles={selectStyles}
                  classNamePrefix="rselect"
                />
                <FieldError message={geErrors.city} />
              </div>
            </div>
          </div>

          {/* Designation & Organization */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Role & Organization"
              description="Your designation and the government organization you represent"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <FieldLabel htmlFor="geDesignation" label="Designation" required />
                <input
                  id="geDesignation"
                  type="text"
                  value={geDesignation}
                  onChange={(e) => { setGeDesignation(e.target.value); setGeErrors((p) => ({ ...p, designation: "" })); }}
                  placeholder="e.g. Director General"
                  className={inputCls}
                />
                <FieldError message={geErrors.designation} />
              </div>
              <div>
                <FieldLabel label="Organization" required />
                {geLoadingOrgs ? (
                  <div className="flex items-center gap-2 py-2.5 text-sm text-gray-500">
                    <div className="w-4 h-4 border-2 border-gold-600 border-t-transparent rounded-full animate-spin" />
                    Loading organizations…
                  </div>
                ) : (
                  <select
                    value={geOrganizationId ?? ""}
                    onChange={(e) => { setGeOrganizationId(e.target.value ? Number(e.target.value) : null); setGeErrors((p) => ({ ...p, organizationId: "" })); }}
                    className={inputCls}
                  >
                    <option value="">Select an organization</option>
                    {geOrganizations.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                )}
                <FieldError message={geErrors.organizationId} />
              </div>
            </div>
            <div className="mt-5">
              <FieldLabel htmlFor="geGovtAddr" label="Government Street Address" required />
              <textarea
                id="geGovtAddr"
                value={geGovtStreetAddress}
                onChange={(e) => { setGeGovtStreetAddress(e.target.value); setGeErrors((p) => ({ ...p, govtStAddress: "" })); }}
                placeholder="Enter the full government street address"
                rows={3}
                className={`${inputCls} resize-none`}
              />
              <FieldError message={geErrors.govtStAddress} />
            </div>
          </div>

          {/* Passport */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Passport Details"
              description="Your travel document information"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                </svg>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <FieldLabel htmlFor="gePassportNum" label="Passport Number" required />
                <input
                  id="gePassportNum"
                  type="text"
                  value={gePassportNumber}
                  onChange={(e) => { setGePassportNumber(e.target.value); setGeErrors((p) => ({ ...p, passportNumber: "" })); }}
                  placeholder="e.g. A12345678"
                  className={inputCls}
                />
                <FieldError message={geErrors.passportNumber} />
              </div>
              <div>
                <FieldLabel htmlFor="gePassportExpiry" label="Passport Expiry Date" required />
                <input
                  id="gePassportExpiry"
                  type="date"
                  value={gePassportExpiry}
                  onChange={(e) => { setGePassportExpiry(e.target.value); setGeErrors((p) => ({ ...p, passportExpiry: "" })); }}
                  className={inputCls}
                />
                <FieldError message={geErrors.passportExpiry} />
              </div>
            </div>
          </div>

          {/* Emirates ID — residents only */}
          {isResident === "true" && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <SectionHeading
                title="Emirates ID"
                description="Required for UAE residents"
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 9a2 2 0 10-4 0v5a2 2 0 01-2 2h6m-6-4h4m8 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <FieldLabel htmlFor="geEid" label="Emirates ID Number" required hint="15 digits, starts with 784" />
                  <input
                    id="geEid"
                    type="text"
                    value={geEmiratesId}
                    onChange={(e) => { setGeEmiratesId(e.target.value.replace(/\D/g, "")); setGeErrors((p) => ({ ...p, emiratesId: "" })); }}
                    placeholder="784xxxxxxxxxxxx"
                    maxLength={15}
                    className={inputCls}
                  />
                  <FieldError message={geErrors.emiratesId} />
                </div>
                <div>
                  <FieldLabel htmlFor="geEidExpiry" label="Emirates ID Expiry Date" required />
                  <input
                    id="geEidExpiry"
                    type="date"
                    value={geEmiratesIdExpiry}
                    onChange={(e) => { setGeEmiratesIdExpiry(e.target.value); setGeErrors((p) => ({ ...p, emiratesIdExpiry: "" })); }}
                    className={inputCls}
                  />
                  <FieldError message={geErrors.emiratesIdExpiry} />
                </div>
              </div>
            </div>
          )}

          {/* Trade License (Optional) */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <SectionHeading
              title="Trade License"
              description="Optional — only if applicable to your entity"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <FieldLabel htmlFor="geTlNum" label="Trade License Number" hint="Optional" />
                <input
                  id="geTlNum"
                  type="text"
                  value={geTradeLicenseNumber}
                  onChange={(e) => { setGeTradeLicenseNumber(e.target.value); setGeErrors((p) => ({ ...p, tradeLicenseNumber: "" })); }}
                  placeholder="Enter trade license number"
                  className={inputCls}
                />
                <FieldError message={geErrors.tradeLicenseNumber} />
              </div>
              <div>
                <FieldLabel htmlFor="geTlExpiry" label="Trade License Expiry Date" hint="Optional" />
                <input
                  id="geTlExpiry"
                  type="date"
                  value={geTradeLicenseExpiry}
                  onChange={(e) => { setGeTradeLicenseExpiry(e.target.value); setGeErrors((p) => ({ ...p, tradeLicenseExpiry: "" })); }}
                  className={inputCls}
                />
                <FieldError message={geErrors.tradeLicenseExpiry} />
              </div>
            </div>
          </div>

          {/* Save bar */}
          <div className="sticky bottom-0 z-10 -mx-4 px-4 py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <p className="text-xs text-gray-400 hidden sm:block">
                {isResident !== "true" && "Emirates ID fields are hidden for non-residents."}
              </p>
              <div className="flex items-center gap-3 ml-auto">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={geSaving}
                  className="px-6 py-2.5 text-sm font-medium rounded-lg bg-gold-600 hover:bg-gold-700 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {geSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {geSaving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

        </form>
      )}
    </div>
  );
}
