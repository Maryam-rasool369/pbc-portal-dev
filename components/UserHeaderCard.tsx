"use client";

import Image from "next/image";
import demoImage from "@/public/images/users/userProfile2.png";
import useAuthStore from "@/store/authStore";
import UniversalFormModal from "./modals/UniversalFormModal";
import Can from "./rbac/Can";
import UserProfileImage from "./ui/UserProfileImage";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUserProfile } from "@/services/users";
import { UserProfile } from "@/types/user";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import { fetchBusinessGroups } from "@/services/businessGroups";
import { BusinessGroup } from "@/types/businessGroup";
import { Country, City } from "country-state-city";

interface UserHeaderCardProps {
  isProfileExpanded: boolean;
  setIsProfileExpanded: (val: boolean) => void;
  isEditModalOpen: boolean;
  setIsEditModalOpen: (val: boolean) => void;
  isVisibilityModalOpen?: boolean;
  setIsVisibilityModalOpen?: (val: boolean) => void;
}

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

type SocialLinkEntry = {
  platform: string;
  url: string;
};

export default function UserHeaderCard({
  isProfileExpanded,
  setIsProfileExpanded,
  setIsEditModalOpen,
  isEditModalOpen,
  isVisibilityModalOpen,
  setIsVisibilityModalOpen,
}: UserHeaderCardProps) {
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<{
    profilePicture?: string;
    tradeLicense?: string;
    tradeLicenseSecondary?: string;
    passport?: string;
    passportSecondary?: string;
    emiratesId?: string;
    emiratesIdSecondary?: string;
    bioVideo?: string;
  }>({});
  const [fileInfo, setFileInfo] = useState<{
    tradeLicense?: { name: string; type: string };
    tradeLicenseSecondary?: { name: string; type: string };
    passport?: { name: string; type: string };
    passportSecondary?: { name: string; type: string };
    emiratesId?: { name: string; type: string };
    emiratesIdSecondary?: { name: string; type: string };
  }>({});
  const [editFormData, setEditFormData] = useState({
    name: "",
    profilePicture: null,
    nativeCountry: "",
    nativeCity: "",
    address: "",
    hsCodes: [] as string[],
    businessGroup: [] as number[],
    profile: {
      bio: "",
      country: "",
      city: "",
      isResident: false,
      emiratesIdNumber: "",
      socialLinks: [] as SocialLinkEntry[],
      latitude: "",
      longitude: "",
      tradeLicense: null,
      tradeLicenseSecondary: null,
      tradeLicenseExpiry: "",
      passport: null,
      passportSecondary: null,
      passportExpiryDate: "",
      emiratesId: null,
      emiratesIdSecondary: null,
      emiratesIdExpiryDate: "",
      bioVideo: null,
    },
  });
  const queryClient = useQueryClient();
  const [businessGroups, setBusinessGroups] = useState<BusinessGroup[]>([]);
  const [loadingBusinessGroups, setLoadingBusinessGroups] = useState(false);

  const [selectedNativeCountry, setSelectedNativeCountry] = useState<string>("");
  const [availableNativeCities, setAvailableNativeCities] = useState<{value: string, label: string}[]>([]);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("");
  const [availableCities, setAvailableCities] = useState<{ value: string; label: string }[]>([]);
  const [socialLinkErrors, setSocialLinkErrors] = useState<Record<number, string>>({});
  
  // Track original values to detect changes
  const [originalValues, setOriginalValues] = useState<{
    hsCodes: string[];
    businessGroup: number[];
    city: string;
    nativeCountry: string;
    nativeCity: string;
  }>({
    hsCodes: [],
    businessGroup: [],
    city: "",
    nativeCountry: "",
    nativeCity: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => fetchUserProfile(token || ""),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (data) setUser(data);
  }, [data]);

  // Helper function to format date for input field (YYYY-MM-DD)
  const formatDateForInput = (dateString: string | undefined): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split('T')[0];
    } catch {
      return "";
    }
  };

  const getSocialPlatformLabel = (platform: string) => {
    const found = SOCIAL_PLATFORM_OPTIONS.find((item) => item.value === platform);
    return found ? found.label : platform;
  };

  const normalizeSocialUrl = (url = "") => {
    const trimmed = url.trim();
    if (!trimmed) {
      return "";
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    return `https://${trimmed}`;
  };

  const detectPlatformFromUrl = (url = "") => {
    const normalizedUrl = normalizeSocialUrl(url);
    if (!normalizedUrl) {
      return "";
    }

    const detected = Object.keys(SOCIAL_URL_PATTERNS).find((platformKey) =>
      SOCIAL_URL_PATTERNS[platformKey].test(normalizedUrl),
    );

    return detected || "";
  };

  const clearSocialLinkErrors = () => {
    setSocialLinkErrors({});
  };

  const updateSocialLink = (
    index: number,
    field: "platform" | "url",
    value: string,
  ) => {
    setEditFormData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        socialLinks: prev.profile.socialLinks.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]: value,
                ...(field === "url" && !item.platform
                  ? { platform: detectPlatformFromUrl(value) }
                  : {}),
              }
            : item,
        ),
      },
    }));

    setSocialLinkErrors((prev) => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  const addSocialLinkRow = () => {
    const currentLinks = editFormData.profile.socialLinks || [];
    if (currentLinks.length >= SOCIAL_PLATFORM_OPTIONS.length) {
      toast.warning("All supported social platforms are already added");
      return;
    }

    setEditFormData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        socialLinks: [...(prev.profile.socialLinks || []), { platform: "", url: "" }],
      },
    }));
    clearSocialLinkErrors();
  };

  const removeSocialLinkRow = (index: number) => {
    setEditFormData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        socialLinks: (prev.profile.socialLinks || []).filter(
          (_, itemIndex) => itemIndex !== index,
        ),
      },
    }));
    clearSocialLinkErrors();
  };

  const validateSocialLinks = (links: SocialLinkEntry[]) => {
    const rowErrors: Record<number, string> = {};
    const linksByPlatform = new Map<string, string>();

    links.forEach((link, index) => {
      const selectedPlatform = link.platform?.trim().toLowerCase();
      const enteredUrl = link.url?.trim();

      if (!selectedPlatform && !enteredUrl) {
        return;
      }

      const normalizedUrl = normalizeSocialUrl(enteredUrl);
      const inferredPlatform = detectPlatformFromUrl(normalizedUrl);
      const platform = selectedPlatform || inferredPlatform;

      if (!platform && enteredUrl) {
        rowErrors[index] = "Use a supported social URL or select its platform.";
        return;
      }

      if (!normalizedUrl) {
        rowErrors[index] = "Please add a profile URL.";
        return;
      }

      const pattern = SOCIAL_URL_PATTERNS[platform];
      if (pattern && !pattern.test(normalizedUrl)) {
        rowErrors[index] = `Please enter a valid ${getSocialPlatformLabel(platform)} link.`;
        return;
      }

      if (linksByPlatform.has(platform)) {
        rowErrors[index] = `${getSocialPlatformLabel(platform)} is already added.`;
        return;
      }

      linksByPlatform.set(platform, normalizedUrl);
    });

    const linksToSubmit = Array.from(linksByPlatform.entries()).map(
      ([platform, url]) => ({ platform, url }),
    );

    return { rowErrors, linksToSubmit };
  };

  const loadBusinessGroups = async () => {
    if (!token) return;
    try {
      setLoadingBusinessGroups(true);
      const response = await fetchBusinessGroups(token, 1, 1000); // Fetch all
      setBusinessGroups(response.data || []);
    } catch (error: any) {
      console.error("Failed to fetch business groups:", error);
      toast.error("Failed to load business groups");
    } finally {
      setLoadingBusinessGroups(false);
    }
  };

  useEffect(() => {
    if (selectedNativeCountry) {
      const cities = City.getCitiesOfCountry(selectedNativeCountry);
      const uniqueCityNames = Array.from(
        new Set((cities || []).map((city) => city.name.trim()).filter(Boolean)),
      );
      const cityOptions = uniqueCityNames.map((cityName) => ({
        value: cityName,
        label: cityName,
      }));
      setAvailableNativeCities(cityOptions);
    } else {
      setAvailableNativeCities([]);
    }
  }, [selectedNativeCountry]);

  useEffect(() => {
    if (selectedCountryCode) {
      const cities = City.getCitiesOfCountry(selectedCountryCode);
      const uniqueCityNames = Array.from(
        new Set((cities || []).map((city) => city.name.trim()).filter(Boolean)),
      );
      const cityOptions = uniqueCityNames.map((cityName) => ({
        value: cityName,
        label: cityName,
      }));
      setAvailableCities(cityOptions);
    } else {
      setAvailableCities([]);
    }
  }, [selectedCountryCode]);

  if (isLoading || !user) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-center py-10">
        Loading user...
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!token) throw new Error("Not authenticated");

      const { rowErrors, linksToSubmit } = validateSocialLinks(
        editFormData.profile.socialLinks || [],
      );
      if (Object.keys(rowErrors).length > 0) {
        setSocialLinkErrors(rowErrors);
        toast.error("Please fix your social links before submitting");
        return;
      }

      const originalSocialLinks = (user?.profile.socialLinks || []).map((link) => ({
        platform: String(link.platform || "").toLowerCase(),
        url: normalizeSocialUrl(link.url || ""),
      }));
      const currentSocialLinks = linksToSubmit.map((link) => ({
        platform: String(link.platform || "").toLowerCase(),
        url: normalizeSocialUrl(link.url || ""),
      }));
      const socialLinksChanged =
        JSON.stringify(
          [...originalSocialLinks].sort((a, b) =>
            `${a.platform}:${a.url}`.localeCompare(`${b.platform}:${b.url}`),
          ),
        ) !==
        JSON.stringify(
          [...currentSocialLinks].sort((a, b) =>
            `${a.platform}:${a.url}`.localeCompare(`${b.platform}:${b.url}`),
          ),
        );

      const emiratesIdNumber = String(
        editFormData.profile.emiratesIdNumber || "",
      ).trim();
      const normalizedEmiratesIdNumber = emiratesIdNumber.replace(/\D/g, "");
      const originalEmiratesIdNumber = String(
        user?.membership?.emiratesId || user?.profile.emiratesIdNumber || "",
      ).replace(/\D/g, "");
      const emiratesNumberChanged =
        normalizedEmiratesIdNumber !== originalEmiratesIdNumber;
      const originalEmiratesExpiryDate = formatDateForInput(
        user?.membership?.emiratesIdExpiryDate,
      );
      const emiratesExpiryDate = editFormData.profile.emiratesIdExpiryDate || "";
      const emiratesExpiryChanged = emiratesExpiryDate !== originalEmiratesExpiryDate;

      const hasExistingEmiratesFile = Boolean(user?.profile.emiratesId);
      const hasExistingEmiratesExpiry = Boolean(
        user?.membership?.emiratesIdExpiryDate,
      );
      const hasExistingEmiratesNumber = Boolean(originalEmiratesIdNumber);

      const hasUploadedEmiratesFile = Boolean(editFormData.profile.emiratesId);
      const hasProvidedEmiratesExpiry = Boolean(emiratesExpiryDate);
      const hasProvidedEmiratesNumber = Boolean(normalizedEmiratesIdNumber);

      const hasEffectiveEmiratesFile =
        hasExistingEmiratesFile || hasUploadedEmiratesFile;
      const hasAnyCurrentEmiratesBundleInput =
        hasUploadedEmiratesFile || hasProvidedEmiratesExpiry || hasProvidedEmiratesNumber;
      const hasNoExistingEmiratesBundle =
        !hasExistingEmiratesFile &&
        !hasExistingEmiratesExpiry &&
        !hasExistingEmiratesNumber;

      if (editFormData.profile.tradeLicenseSecondary && !editFormData.profile.tradeLicense && !user?.profile.tradeLicense) {
        toast.error("Trade License is required before uploading secondary document.");
        return;
      }

      if (editFormData.profile.passportSecondary && !editFormData.profile.passport && !user?.profile.passport) {
        toast.error("Passport is required before uploading secondary document.");
        return;
      }

      if (editFormData.profile.emiratesIdSecondary && !editFormData.profile.emiratesId && !user?.profile.emiratesId) {
        toast.error("Emirates ID is required before uploading secondary document.");
        return;
      }

      if (
        hasProvidedEmiratesNumber &&
        (normalizedEmiratesIdNumber.length !== 15 ||
          !normalizedEmiratesIdNumber.startsWith("784"))
      ) {
        toast.error(
          "Emirates ID Number must be 15 digits and start with 784.",
        );
        return;
      }

      if (editFormData.profile.isResident) {
        if (!hasEffectiveEmiratesFile || !hasProvidedEmiratesExpiry || !hasProvidedEmiratesNumber) {
          toast.error(`
            Resident users must provide ${!hasEffectiveEmiratesFile ? "Emirates ID Document, " : ""}${!hasProvidedEmiratesExpiry ? "Emirates ID Expiry Date, " : ""}${!hasProvidedEmiratesNumber ? "Emirates ID Number" : ""}.
          `);
          return;
        }
      }

      const form = new FormData();
      const profilePictureFile = editFormData.profilePicture;
      const isProfilePicChanged = !!profilePictureFile;

      // Track if any primary or secondary document is uploaded
      const isDocumentUploaded = !!(
        editFormData.profile.tradeLicense ||
        editFormData.profile.tradeLicenseSecondary ||
        editFormData.profile.passport ||
        editFormData.profile.passportSecondary ||
        editFormData.profile.emiratesId ||
        editFormData.profile.emiratesIdSecondary
      );

      if (user?.name !== editFormData.name) {
        form.append("name", editFormData.name);
      }

      if (editFormData.profile) {
        form.append("isResident", String(editFormData.profile.isResident));

        if (editFormData.profile.bio && user?.profile.bio !== editFormData.profile.bio) {
          form.append("bio", editFormData.profile.bio);
        }
        if (user?.profile.country !== editFormData.profile.country) {
          form.append("country", editFormData.profile.country);
        }
        if (socialLinksChanged) {
          currentSocialLinks.forEach(({ platform, url }) => {
            form.append(`socialLinks[${platform}]`, url);
          });
        }
        if (editFormData.profile.tradeLicense) {
          form.append("tradeLicense", editFormData.profile.tradeLicense);
          if (editFormData.profile.tradeLicenseExpiry) {
            form.append("tradeLicenseExpiry", editFormData.profile.tradeLicenseExpiry);
          }
        }
        if (editFormData.profile.tradeLicenseSecondary) {
          form.append("tradeLicenseSecondary", editFormData.profile.tradeLicenseSecondary);
        }
        if (editFormData.profile.passport) {
          form.append("passport", editFormData.profile.passport);
          if (editFormData.profile.passportExpiryDate) {
            form.append("passportExpiryDate", editFormData.profile.passportExpiryDate);
          }
        }
        if (editFormData.profile.passportSecondary) {
          form.append("passportSecondary", editFormData.profile.passportSecondary);
        }
        if (editFormData.profile.emiratesId) {
          form.append("emiratesId", editFormData.profile.emiratesId);
        }
        if (editFormData.profile.emiratesIdSecondary) {
          form.append("emiratesIdSecondary", editFormData.profile.emiratesIdSecondary);
        }
        // Send emiratesIdExpiryDate if changed (including cleared for non-residents)
        if (emiratesExpiryChanged || (emiratesExpiryDate && editFormData.profile.emiratesId)) {
          form.append("emiratesIdExpiryDate", emiratesExpiryDate);
        }
        if (emiratesNumberChanged) {
          form.append("emiratesIdNumber", normalizedEmiratesIdNumber);
        }
        if (editFormData.profile.bioVideo) {
          form.append("bioVideo", editFormData.profile.bioVideo);
        }
        if (editFormData.profile.latitude && user?.profile.latitude !== editFormData.profile.latitude) {
          form.append("latitude", editFormData.profile.latitude);
        }
        if (editFormData.profile.longitude && user?.profile.longitude !== editFormData.profile.longitude) {
          form.append("longitude", editFormData.profile.longitude);
        }
      }

      if (isProfilePicChanged) {
        form.append("profilePicture", profilePictureFile);
      }

      const isGovtEntity = user?.membership?.membershipCategory?.name === "Government Entity";
      const originalAddress = isGovtEntity
        ? user?.membership?.govtStAddress || ""
        : user?.membership?.mailingAddress || "";
      if (editFormData.address !== originalAddress) {
        form.append("address", editFormData.address);
      }

      // Helper to check if arrays are equal
      const arraysEqual = (a: any[], b: any[]) => {
        if (a.length !== b.length) return false;
        const sortedA = [...a].sort();
        const sortedB = [...b].sort();
        return sortedA.every((val, idx) => val === sortedB[idx]);
      };

      const selectedCountry = Country.getAllCountries().find(c => c.isoCode === editFormData.nativeCountry);
      const nativeCountryName = selectedCountry?.name || editFormData.nativeCountry;
      const nativeCountryChanged = nativeCountryName !== originalValues.nativeCountry;
      
      if (nativeCountryChanged) {
        if (nativeCountryName) {
          form.append("nativeCountry", nativeCountryName);
        }
      }

      const nativeCityName = editFormData.nativeCity;
      const nativeCityChanged = nativeCityName !== originalValues.nativeCity;
      
      if (nativeCityChanged) {
        if (nativeCityName) {
          form.append("nativeCity", nativeCityName);
        }
      }

      const cityName = editFormData.profile?.city || "";
      const cityChanged = cityName !== originalValues.city;

      if (cityChanged) {
        if (cityName) {
          form.append("city", cityName);
        }
      }

      // Add hsCodes only if changed
      const hsCodesChanged = !arraysEqual(editFormData.hsCodes, originalValues.hsCodes);
      if (hsCodesChanged) {
        // Send all hsCodes (even if empty array, to clear them)
        editFormData.hsCodes.forEach((hsCode) => {
          form.append("hsCodes", hsCode);
        });
      }

      // Add businessGroup only if changed
      const businessGroupChanged = !arraysEqual(editFormData.businessGroup, originalValues.businessGroup);
      if (businessGroupChanged) {
        // Send all businessGroups (even if empty array, to clear them)
        editFormData.businessGroup.forEach((groupId) => {
          form.append("businessGroup", groupId.toString());
        });
      }

      setEditingProfile(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/profile`,
        {
          method: "PATCH",
          headers: {
            token,
          },
          body: form,
        },
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error?.[0]?.msg || "Failed to update profile");
      }

      setIsEditModalOpen(false);

      // If any document was uploaded, logout user and redirect
      if (isDocumentUploaded) {
        toast.success("You have been logged out, your profile is now inactive & under review. You can update your profile at any time. You will receive a notification once your profile is reviewed. Thank you for your patience!");
        logout();
        router.push("/authentication/sign-in");
        await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      } else {
        toast.success("Profile updated successfully");
        await queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      }
    } catch (err: any) {
      toast.error(err.message || "❌ Error updating profile");
    } finally {
      setEditingProfile(false);
    }
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden mb-6">
      <div className="p-6">
        <div className="h-32 w-32 rounded-full border-4 border-white dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-700 flex items-center justify-center">
          <Image
            src={user.profilePicture !== null ? user.profilePicture : demoImage}
            alt="Profile Picture"
            width={128}
            height={128}
            className="rounded-full object-cover"
          />
        </div>

        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {user.name}
            </h1>
            <span
              className={`inline-block px-2 py-1 mt-2 text-xs rounded-full ${
                user.isActive
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              }`}
            >
              {user.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-gold-100 dark:bg-gold-900 flex items-center justify-center mr-3">
              <svg
                className="h-5 w-5 text-gold-600 dark:text-gold-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5.121 17.804A7 7 0 0112 15a7 7 0 016.879 2.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
              <p className="text-gray-900 dark:text-white">{user.role}</p>
            </div>
          </div>{" "}
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-gold-100 dark:bg-gold-900 flex items-center justify-center mr-3">
              <svg
                className="h-5 w-5 text-gold-600 dark:text-gold-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
              <p className="text-gray-900 dark:text-white">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-gold-100 dark:bg-gold-900 flex items-center justify-center mr-3">
              <svg
                className="h-5 w-5 text-gold-600 dark:text-gold-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
              <p className="text-gray-900 dark:text-white">
                {user.phoneNumber}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsProfileExpanded(!isProfileExpanded)}
            className="mt-4 px-4 py-2 bg-gold-600 hover:bg-gold-700 text-gray-800 rounded-md flex items-center space-x-2 transition-colors"
          >
            <span>
              {isProfileExpanded ? (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              )}
            </span>
            <Can I="read" a="Profile">
              <span>{isProfileExpanded ? "Hide Profile" : "View Profile"}</span>
            </Can>
          </button>
        </div>
        {isProfileExpanded && (
          <div className="pt-6 px-6 md:px-10 space-y-8 flex-row">
            <div>
              {user.profile.bio && (
                <div className="mb-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    Bio
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    {user.profile.bio}
                  </p>
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-4">
                {Array.isArray(user.profile.socialLinks) &&
                  user.profile.socialLinks.length > 0 && (
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {user.profile.socialLinks.map((socialLink, index) => (
                      <div
                        key={`${socialLink.platform}-${socialLink.url}-${index}`}
                        className="flex items-center"
                      >
                        <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                          {getSocialPlatformLabel(socialLink.platform)}:
                        </span>
                        <a
                          href={socialLink.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold-600 dark:text-gold-400 hover:underline"
                        >
                          {getSocialPlatformLabel(socialLink.platform)} Profile
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                <Can I="update" a="Profile">
                  <div className="flex space-x-3 md:ml-auto">
                    <button
                      onClick={() => router.push("/profile/edit")}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                    >
                      Edit Profile
                    </button>
                    
                    {user && !user.isDocumentReviewPending && (
                      <button
                        onClick={() => {
                          setIsVisibilityModalOpen?.(true);
                        }}
                        className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-gray-800 rounded-md flex items-center space-x-2 transition-colors"
                      >
                        Profile Visibility
                      </button>
                    )}
                  </div>
                </Can>
              </div>
            </div>

            {user.profile?.latitude && user.profile?.longitude && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-gray-500 dark:text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    ></path>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    ></path>
                  </svg>
                  User Location
                </h4>

                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <div className="bg-gray-100 dark:bg-gray-700 p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        Coordinates
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${user.profile.latitude},${user.profile.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                      >
                        View on Google Maps
                      </a>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Latitude: {user.profile.latitude}, Longitude:{" "}
                      {user.profile.longitude}
                    </div>
                  </div>
                  <div className="h-64 relative">
                    {typeof window !== "undefined" &&
                      (() => {
                        const ClientSideReadOnlyMapView = dynamic(
                          () => import("@/components/ui/ReadOnlyMapView"),
                          { ssr: false },
                        );
                        const location = {
                          lat: parseFloat(user.profile.latitude),
                          lng: parseFloat(user.profile.longitude),
                        };
                        return (
                          <ClientSideReadOnlyMapView location={location} />
                        );
                      })()}
                  </div>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Documents
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {user.profile.tradeLicense && (
                  <UserProfileImage
                    src={user.profile.tradeLicense}
                    title="Trade License"
                  />
                )}
                {user.profile.tradeLicenseSecondary && (
                  <UserProfileImage
                    src={user.profile.tradeLicenseSecondary}
                    title="Trade License Secondary"
                  />
                )}
                {user.profile.passport && (
                  <UserProfileImage
                    src={user.profile.passport}
                    title="Passport"
                  />
                )}
                {user.profile.passportSecondary && (
                  <UserProfileImage
                    src={user.profile.passportSecondary}
                    title="Passport Secondary"
                  />
                )}
                {user.profile.emiratesId && (
                  <UserProfileImage
                    src={user.profile.emiratesId}
                    title="Emirates ID"
                  />
                )}
                {user.profile.emiratesIdSecondary && (
                  <UserProfileImage
                    src={user.profile.emiratesIdSecondary}
                    title="Emirates ID Secondary"
                  />
                )}
              </div>
            </div>

           

            {/* Membership Details Section */}
            {user.membership && (
              <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600 shadow-sm">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                  <svg
                    className="w-6 h-6 mr-2 text-gold-600 dark:text-gold-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                    ></path>
                  </svg>
                  Membership Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {user.membership.membershipId && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Membership ID
                      </p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {user.membership.membershipId}
                      </p>
                    </div>
                  )}
                  {user.membership.membershipCategory && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Membership Category
                      </p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {user.membership.membershipCategory.name}
                      </p>
                    </div>
                  )}
                  {user.membership.membershipSubCategory && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Membership Sub-category
                      </p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {user.membership.membershipSubCategory.name}
                      </p>
                    </div>
                  )}
                  {user.membership.decision_at && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Membership Activation Date
                      </p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {formatDateAndTime(user.membership.decision_at)}
                      </p>
                    </div>
                  )}
                  {user.membership.lastBillingDate && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Member Since
                      </p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {user.membership.lastBillingDate 
                        ? formatDateAndTime(user.membership.lastBillingDate)
                        : "N/A"}
                      </p>
                    </div>
                  )}
                  {user.membership.nextBillingDate && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Next Billing Date
                      </p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {user.membership.nextBillingDate 
                          ? formatDateAndTime(user.membership.nextBillingDate)
                          : "N/A"}
                      </p>
                    </div>
                  )}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                      Business Groups
                    </p>
                    {user.membership.businessGroups && user.membership.businessGroups.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {user.membership.businessGroups.map((group) => (
                          <span
                            key={group.id}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                          >
                            {group.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-base font-semibold text-gray-900 dark:text-white">N/A</p>
                    )}
                  </div>
                </div>

                {(user.membership.tradeLicenseExpiry || 
                  user.membership.passportExpiryDate || 
                  user.membership.emiratesIdExpiryDate) && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-gold-600 dark:text-gold-400"
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
                        ></path>
                      </svg>
                      Document Expiry Dates
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {user.membership.tradeLicenseExpiry && (
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700 shadow-sm">
                          <div className="flex items-center mb-2">
                            <svg
                              className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400"
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
                              ></path>
                            </svg>
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                              Trade License
                            </p>
                          </div>
                          <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Expiry Date</p>
                          <p className="text-base font-bold text-blue-900 dark:text-blue-100">
                            {formatDateAndTime(user.membership.tradeLicenseExpiry)}
                          </p>
                        </div>
                      )}
                      {user.membership.passportExpiryDate && (
                        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg p-4 border border-green-200 dark:border-green-700 shadow-sm">
                          <div className="flex items-center mb-2">
                            <svg
                              className="w-5 h-5 mr-2 text-green-600 dark:text-green-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                              ></path>
                            </svg>
                            <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">
                              Passport
                            </p>
                          </div>
                          <p className="text-sm text-green-600 dark:text-green-400 mb-1">Expiry Date</p>
                          <p className="text-base font-bold text-green-900 dark:text-green-100">
                            {formatDateAndTime(user.membership.passportExpiryDate)}
                          </p>
                        </div>
                      )}
                      {user.membership.emiratesIdExpiryDate && (
                        <div className="bg-gradient-to-br from-gold-50 to-gold-100 dark:from-gold-900/30 dark:to-gold-800/30 rounded-lg p-4 border border-gold-200 dark:border-gold-700 shadow-sm">
                          <div className="flex items-center mb-2">
                            <svg
                              className="w-5 h-5 mr-2 text-gold-600 dark:text-gold-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                              ></path>
                            </svg>
                            <p className="text-xs font-semibold text-gold-700 dark:text-gold-300 uppercase tracking-wide">
                              Emirates ID
                            </p>
                          </div>
                          <p className="text-sm text-gold-600 dark:text-gold-400 mb-1">Expiry Date</p>
                          <p className="text-base font-bold text-gold-900 dark:text-gold-100">
                            {formatDateAndTime(user.membership.emiratesIdExpiryDate)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {isEditModalOpen && (
          <UniversalFormModal
            title="Edit Profile "
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSubmit={handleSubmit}
            isSubmitting={editingProfile}
            fields={[
              {
                id: "name",
                label: "Full Name",
                type: "text",
                value: editFormData.name,
                onChange: (e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    name: e.target.value,
                  })),
              },
              {
                id: "bio",
                label: "Bio",
                type: "textarea",
                value: editFormData.profile?.bio || "",
                onChange: (e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    profile: {
                      ...prev.profile,
                      bio: e.target.value,
                    },
                  })),
              },
              {
                id: "isResident",
                label: "Residency Status",
                type: "select",
                value:
                  editFormData.profile?.isResident === true
                    ? "true"
                    : editFormData.profile?.isResident === false
                      ? "false"
                      : "",
                options: [
                  { value: "true", label: "UAE Resident" },
                  { value: "false", label: "UAE Non-Resident" },
                ],
                onChange: (e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    profile: {
                      ...prev.profile,
                      isResident: e.target.value === "true",
                    },
                  })),
              },
              {
                id: "country",
                label: "Country of residence",
                type: "select",
                value: editFormData.profile?.country || "",
                options: Country.getAllCountries().map(country => ({
                  value: country.isoCode,
                  label: `${country.name} (${country.isoCode})`
                })),
                onChange: (e) => {
                  const newCountryCode = e.target.value;
                  setSelectedCountryCode(newCountryCode);
                  setEditFormData((prev) => ({
                    ...prev,
                    profile: {
                      ...prev.profile,
                      country: newCountryCode,
                      city: "",
                    },
                  }));
                },
              },
              {
                id: "city",
                label: "City of residence",
                type: "select",
                value: editFormData.profile?.city || "",
                options: availableCities,
                onChange: (e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    profile: {
                      ...prev.profile,
                      city: e.target.value,
                    },
                  })),
              },
              {
                id: "nativeCountry",
                label: "Native Country",
                type: "select",
                value: editFormData.nativeCountry || "",
                options: Country.getAllCountries().map(country => ({
                  value: country.isoCode,
                  label: country.name
                })),
                onChange: (e) => {
                  const newCountryCode = e.target.value;
                  setSelectedNativeCountry(newCountryCode);
                  setAvailableNativeCities([]);
                  setEditFormData((prev) => ({
                    ...prev,
                    nativeCountry: newCountryCode,
                    nativeCity: "", // Reset city when country changes
                  }));
                },
              },
              {
                id: "nativeCity",
                label: "Native City",
                type: "select",
                value: editFormData.nativeCity || "",
                options: availableNativeCities,
                onChange: (e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    nativeCity: e.target.value,
                  })),
              },
              {
                id: "address",
                label:"Address",
                type: "text",
                value: editFormData.address,
                onChange: (e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    address: e.target.value,
                  })),
                placeholder: "Enter your address",
              },
              {
                id: "socialLinks",
                label: "Social Media Links",
                type: "social-links-table" as any,
                value: editFormData.profile?.socialLinks || [],
                options: SOCIAL_PLATFORM_OPTIONS,
                onChange: () => {},
                onSocialLinkAddRow: addSocialLinkRow,
                onSocialLinkRemoveRow: removeSocialLinkRow,
                onSocialLinkUpdate: updateSocialLink,
                socialLinkErrors,
                maxItems: SOCIAL_PLATFORM_OPTIONS.length,
                placeholder: "Paste profile URL",
                helperText:
                  "Add any profiles you want to share. Empty rows are skipped.",
              },
              {
                id: "latitude",
                label: "Latitude",
                type: "text",
                value: editFormData.profile?.latitude || "",
                onChange: (e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    profile: {
                      ...prev.profile,
                      latitude: e.target.value,
                    },
                  })),
              },
              {
                id: "longitude",
                label: "Longitude",
                type: "text",
                value: editFormData.profile?.longitude || "",
                onChange: (e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    profile: {
                      ...prev.profile,
                      longitude: e.target.value,
                    },
                  })),
                },
              {
                id: "profilePicture",
                label: "Profile Picture",
                type: "file",
                accept: "image/*",
                value: editFormData.profilePicture,
                onChange: (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setEditFormData((prev) => ({
                      ...prev,
                      profilePicture: file,
                    }));
                    // Create preview
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setImagePreviews((prev) => ({
                        ...prev,
                        profilePicture: reader.result as string,
                      }));
                    };
                    reader.readAsDataURL(file);
                  }
                },
                preview: imagePreviews.profilePicture || user.profilePicture,
              },
              {
              id: "tradeLicense",
              label: "Trade License (Image or PDF)",
              type: "file",
              value: editFormData.profile?.tradeLicense,
              accept: "image/*,application/pdf",
              onChange: (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Validate file type
                  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
                  if (!validTypes.includes(file.type)) {
                    toast.error('Please upload an image (JPEG, PNG, GIF, WebP) or PDF file');
                    return;
                  }
                  
                  setEditFormData((prev) => ({
                    ...prev,
                    profile: {
                      ...prev.profile,
                      tradeLicense: file,
                    },
                  }));
                  
                  // Store file info for display
                  setFileInfo((prev) => ({
                    ...prev,
                    tradeLicense: { name: file.name, type: file.type },
                  }));
                  
                  // Create preview for images only
                  if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setImagePreviews((prev) => ({
                        ...prev,
                        tradeLicense: reader.result as string,
                      }));
                    };
                    reader.readAsDataURL(file);
                  } else {
                  const previewUrl = URL.createObjectURL(file);
                  setImagePreviews((prev) => ({
                    ...prev,
                    tradeLicense: previewUrl,
                  }));
                }
               }
              },
              preview: imagePreviews.tradeLicense || user.profile.tradeLicense,
              fileInfo: fileInfo.tradeLicense,
            },
            {
              id: "tradeLicenseSecondary",
              label: "Trade License Secondary (Image or PDF)",
              type: "file",
              value: editFormData.profile?.tradeLicenseSecondary,
              accept: "image/*,application/pdf",
              onChange: (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
                  if (!validTypes.includes(file.type)) {
                    toast.error('Please upload an image (JPEG, PNG, GIF, WebP) or PDF file');
                    return;
                  }

                  setEditFormData((prev) => ({
                    ...prev,
                    profile: {
                      ...prev.profile,
                      tradeLicenseSecondary: file,
                    },
                  }));

                  setFileInfo((prev) => ({
                    ...prev,
                    tradeLicenseSecondary: { name: file.name, type: file.type },
                  }));

                  if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setImagePreviews((prev) => ({
                        ...prev,
                        tradeLicenseSecondary: reader.result as string,
                      }));
                    };
                    reader.readAsDataURL(file);
                  } else {
              const previewUrl = URL.createObjectURL(file);

              setImagePreviews((prev) => ({
                ...prev,
                tradeLicenseSecondary: previewUrl,
              }));
                  }
                }
              },
              preview: imagePreviews.tradeLicenseSecondary || user.profile.tradeLicenseSecondary,
              fileInfo: fileInfo.tradeLicenseSecondary,
            },
            {
              id: "tradeLicenseExpiry",
              label: "Trade License Expiry Date",
              type: "date",
              value: editFormData.profile?.tradeLicenseExpiry || "",
              onChange: (e) => {
                setEditFormData((prev) => ({
                  ...prev,
                  profile: {
                    ...prev.profile,
                    tradeLicenseExpiry: e.target.value,
                  },
                }));
              },
            },
            {
              id: "passport",
              label: "Passport (Image or PDF)",
              type: "file",
              accept: "image/*,application/pdf",
              value: editFormData.profile?.passport,
              onChange: (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Validate file type
                  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
                  if (!validTypes.includes(file.type)) {
                    toast.error('Please upload an image (JPEG, PNG, GIF, WebP) or PDF file');
                    return;
                  }
                  
                  setEditFormData((prev) => ({
                    ...prev,
                    profile: {
                      ...prev.profile,
                      passport: file,
                    },
                  }));
                  
                  // Store file info for display
                  setFileInfo((prev) => ({
                    ...prev,
                    passport: { name: file.name, type: file.type },
                  }));
                  
                  // Create preview for images only
                  if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setImagePreviews((prev) => ({
                        ...prev,
                        passport: reader.result as string,
                      }));
                    };
                    reader.readAsDataURL(file);
                  }  else {
  const previewUrl = URL.createObjectURL(file);
  setImagePreviews((prev) => ({
    ...prev,
    passport: previewUrl,
  }));
}
                }
              },
              preview: imagePreviews.passport || user.profile.passport,
              fileInfo: fileInfo.passport,
            },
            {
              id: "passportSecondary",
              label: "Passport Secondary (Image or PDF)",
              type: "file",
              accept: "image/*,application/pdf",
              value: editFormData.profile?.passportSecondary,
              onChange: (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
                  if (!validTypes.includes(file.type)) {
                    toast.error('Please upload an image (JPEG, PNG, GIF, WebP) or PDF file');
                    return;
                  }

                  setEditFormData((prev) => ({
                    ...prev,
                    profile: {
                      ...prev.profile,
                      passportSecondary: file,
                    },
                  }));

                  setFileInfo((prev) => ({
                    ...prev,
                    passportSecondary: { name: file.name, type: file.type },
                  }));

                  if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setImagePreviews((prev) => ({
                        ...prev,
                        passportSecondary: reader.result as string,
                      }));
                    };
                    reader.readAsDataURL(file);
                  } else {
                  const previewUrl = URL.createObjectURL(file);
                  setImagePreviews((prev) => ({
                    ...prev,
                    passportSecondary: previewUrl,
                  }));
                }
                }
              },
              preview: imagePreviews.passportSecondary || user.profile.passportSecondary,
              fileInfo: fileInfo.passportSecondary,
            },
            {
              id: "passportExpiryDate",
              label: "Passport Expiry Date",
              type: "date",
              value: editFormData.profile?.passportExpiryDate || "",
              onChange: (e) => {
                setEditFormData((prev) => ({
                  ...prev,
                  profile: {
                    ...prev.profile,
                    passportExpiryDate: e.target.value,
                  },
                }));
              },
            },
            {
              id: "emiratesIdNumber",
              label: "Emirates ID Number",
              type: "text",
              value: editFormData.profile?.emiratesIdNumber || "",
              onChange: (e) => {
                setEditFormData((prev) => ({
                  ...prev,
                  profile: {
                    ...prev.profile,
                    emiratesIdNumber: e.target.value,
                  },
                }));
              },
            },
            {
              id: "emiratesId",
              label: "Emirates ID (Image or PDF)",
              type: "file",
              value: editFormData.profile?.emiratesId,
              accept: "image/*,application/pdf",
              onChange: (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Validate file type
                  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
                  if (!validTypes.includes(file.type)) {
                    toast.error('Please upload an image (JPEG, PNG, GIF, WebP) or PDF file');
                    return;
                  }
                  
                  setEditFormData((prev) => ({
                    ...prev,
                    profile: {
                      ...prev.profile,
                      emiratesId: file,
                    },
                  }));
                  
                  // Store file info for display
                  setFileInfo((prev) => ({
                    ...prev,
                    emiratesId: { name: file.name, type: file.type },
                  }));
                  
                  // Create preview for images only
                  if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setImagePreviews((prev) => ({
                        ...prev,
                        emiratesId: reader.result as string,
                      }));
                    };
                    reader.readAsDataURL(file);
                  } else {
                    // Clear image preview for PDFs
                    setImagePreviews((prev) => ({
                      ...prev,
                      emiratesId: undefined,
                    }));
                  }
                }
                },
              preview: imagePreviews.emiratesId || user.profile.emiratesId,
              fileInfo: fileInfo.emiratesId,
              },
              {
              id: "emiratesIdSecondary",
              label: "Emirates ID Secondary (Image or PDF)",
              type: "file",
              value: editFormData.profile?.emiratesIdSecondary,
              accept: "image/*,application/pdf",
              onChange: (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
                  if (!validTypes.includes(file.type)) {
                    toast.error('Please upload an image (JPEG, PNG, GIF, WebP) or PDF file');
                    return;
                  }

                  setEditFormData((prev) => ({
                    ...prev,
                    profile: {
                      ...prev.profile,
                      emiratesIdSecondary: file,
                    },
                  }));

                  setFileInfo((prev) => ({
                    ...prev,
                    emiratesIdSecondary: { name: file.name, type: file.type },
                  }));

                  if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setImagePreviews((prev) => ({
                        ...prev,
                        emiratesIdSecondary: reader.result as string,
                      }));
                    };
                    reader.readAsDataURL(file);
                  }else {
                const previewUrl = URL.createObjectURL(file);
                setImagePreviews((prev) => ({
                  ...prev,
                  emiratesIdSecondary: previewUrl,
                }));
              }
                }
                },
              preview: imagePreviews.emiratesIdSecondary || user.profile.emiratesIdSecondary,
              fileInfo: fileInfo.emiratesIdSecondary,
              },
              {
                id: "emiratesIdExpiryDate",
                label: "Emirates ID Expiry Date",
                type: "date",
                value: editFormData.profile?.emiratesIdExpiryDate || "",
                onChange: (e) => {
                  setEditFormData((prev) => ({
                    ...prev,
                    profile: {
                      ...prev.profile,
                      emiratesIdExpiryDate: e.target.value,
                    },
                  }));
                },
              },
              {
                id: "bioVideo",
                label: "Bio Video (MP4, MOV, AVI, WEBM, MKV)",
                type: "file",
                accept: "video/mp4,video/quicktime,video/x-msvideo,video/webm,video/mkv",
                value: editFormData.profile?.bioVideo,
                onChange: (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setEditFormData((prev) => ({
                    ...prev,
                    profile: {
                      ...prev.profile,
                      bioVideo: file,
                    },
                  }));
                  // Create preview for video
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setImagePreviews((prev) => ({
                      ...prev,
                      bioVideo: reader.result as string,
                    }));
                  };
                  reader.readAsDataURL(file);
                }
              },
              preview: imagePreviews.bioVideo || user.profile.bioVideo,
            },
            {
              id: "hsCodes",
              label: "HS Codes",
              type: "multiselect-tags" as any,
              value: editFormData.hsCodes || [],
              onChange: () => {}, // Not used for this type
              onAdd: (hsCode: string) => {
                // Validate HS code format (should be like 1234.1234)
                const hsCodePattern = /^\d{4}\.\d{4}$/;
                if (!hsCodePattern.test(hsCode)) {
                  toast.error("HS Code must be in format: 1234.1234");
                  return;
                }
                if (!editFormData.hsCodes.includes(hsCode)) {
                  setEditFormData((prev) => ({
                    ...prev,
                    hsCodes: [...prev.hsCodes, hsCode],
                  }));
                } else {
                  toast.warning("This HS Code is already added");
                }
              },
              onRemove: (hsCode: string | number) => {
                setEditFormData((prev) => ({
                  ...prev,
                  hsCodes: prev.hsCodes.filter((code) => code !== hsCode),
                }));
              },
              placeholder: "Enter HS Code (e.g., 1234.5678)",
              pattern: "\\d{4}\\.\\d{4}",
              helperText: "Format: 4 digits, dot, 4 digits (e.g., 1234.5678). Press Enter or click Add.",
            },
            {
              id: "businessGroup",
              label: "Business Groups",
              type: "multiselect-checkboxes" as any,
              value: editFormData.businessGroup || [],
              onChange: () => {}, // Not used for this type
              onToggle: (groupId: number) => {
                setEditFormData((prev) => {
                  const currentGroups = prev.businessGroup || [];
                  const isSelected = currentGroups.includes(groupId);
                  
                  return {
                    ...prev,
                    businessGroup: isSelected
                      ? currentGroups.filter((id) => id !== groupId)
                      : [...currentGroups, groupId],
                  };
                });
              },
              options: businessGroups.map((bg) => ({
                value: bg.id,
                label: bg.name,
              })),
              helperText: loadingBusinessGroups ? "Loading business groups..." : "Select business groups to associate with your profile",
            },

            ]}
          />
        )}
      </div>
    </div>
  );
}
