"use client";
import React, { useEffect, useState } from "react";
import Select from "react-select";
import { Country, City } from "country-state-city";
import Dropzone from "react-dropzone";
import { Autocomplete, GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import Image from "next/image";

interface SocialLink {
  platform: string;
  url: string;
}

interface Props {
  nextStep: (data: {
    bio: string;
    gender: string;
    country: string;
    city: string;
    nativeCountry: string;
    nativeCity: string;
    longitude: number;
    latitude: number;
    profilePicture: File | null;
    tradeLicense: File | null;
    tradeLicenseSecondary: File | null;
    passport: File;
    passportSecondary: File | null;
    emiratesId: File | null;
    emiratesIdSecondary: File | null;
    bioVideo: File;
    isResident: boolean;
    socialLinks: SocialLink[];
  }) => void;
  prevStep: () => void;
}

const defaultPosition = { lat: 25.276987, lng: 55.296249 };
const mapContainerStyle = { width: "100%", height: "100%" };
const googleLibraries = ["places"] as any;

const ACCEPTED_FILE_TYPES: Record<string, Record<string, string[]>> = {
  profilePicture: {
    "image/jpeg": [".jpeg", ".jpg"],
    "image/png": [".png"],
  },
  tradeLicense: {
    "image/jpeg": [".jpeg", ".jpg"],
    "image/png": [".png"],
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
  },
  tradeLicenseSecondary: {
    "image/jpeg": [".jpeg", ".jpg"],
    "image/png": [".png"],
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
  },
  passport: {
    "image/jpeg": [".jpeg", ".jpg"],
    "image/png": [".png"],
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
  },
  passportSecondary: {
    "image/jpeg": [".jpeg", ".jpg"],
    "image/png": [".png"],
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
  },
  emiratesId: {
    "image/jpeg": [".jpeg", ".jpg"],
    "image/png": [".png"],
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
  },
  emiratesIdSecondary: {
    "image/jpeg": [".jpeg", ".jpg"],
    "image/png": [".png"],
    "application/pdf": [".pdf"],
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      ".docx",
    ],
  },
  bioVideo: {
    "video/mp4": [".mp4"],
    "video/quicktime": [".mov"],
    "video/webm": [".webm"],
    "video/x-matroska": [".mkv"],
  },
};

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

const SOCIAL_URL_PATTERNS = {
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

const GENDER_OPTIONS = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
];

const documentLabels: Record<string, string> = {
  profilePicture: "Profile Picture",
  tradeLicense: "Trade License",
  tradeLicenseSecondary: "Trade License Secondary",
  passport: "Passport",
  passportSecondary: "Passport Secondary",
  emiratesId: "Emirates ID",
  emiratesIdSecondary: "Emirates ID Secondary",
  bioVideo: "Bio Video",
};

export default function StepTwo({ nextStep, prevStep }: Props) {
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("MALE");
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [cities, setCities] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState<any>(null);

  const [selectedNativeCountry, setSelectedNativeCountry] =
    useState<any>(null);
  const [nativeCities, setNativeCities] = useState<any[]>([]);
  const [selectedNativeCity, setSelectedNativeCity] = useState<any>(null);

  const [location, setLocation] = useState(defaultPosition);
  const [mapSearchInput, setMapSearchInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [autocompleteInstance, setAutocompleteInstance] = useState<any>(null);
  const [isResident, setIsResident] = useState<"" | "true" | "false">("");

  const [documents, setDocuments] = useState<Record<string, File | null>>({
    profilePicture: null,
    tradeLicense: null,
    tradeLicenseSecondary: null,
    passport: null,
    passportSecondary: null,
    emiratesId: null,
    emiratesIdSecondary: null,
    bioVideo: null,
  });

  useEffect(() => {
    if (selectedCountry) {
      const cityList = City.getCitiesOfCountry(selectedCountry.isoCode) || [];
      setCities(
        cityList.map((city) => ({
          label: city.name,
          value: city.name,
          latitude: city.latitude,
          longitude: city.longitude,
        })),
      );
    } else {
      setCities([]);
    }
    setSelectedCity(null);
    setMapSearchInput("");
  }, [selectedCountry]);

  useEffect(() => {
    if (selectedNativeCountry) {
      const cityList = City.getCitiesOfCountry(selectedNativeCountry.isoCode) || [];
      setNativeCities(
        cityList.map((city) => ({
          label: city.name,
          value: city.name,
        })),
      );
    } else {
      setNativeCities([]);
    }
    setSelectedNativeCity(null);
  }, [selectedNativeCountry]);

  useEffect(() => {
    setDocuments((prev) => ({
      ...prev,
      ...(!prev.tradeLicense ? { tradeLicenseSecondary: null } : {}),
      ...(!prev.passport ? { passportSecondary: null } : {}),
      ...(!prev.emiratesId ? { emiratesIdSecondary: null } : {}),
    }));
  }, [documents.tradeLicense, documents.passport, documents.emiratesId]);

  const handleDocumentDrop = (key: string, acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const [file] = acceptedFiles;
      const allowedTypes = ACCEPTED_FILE_TYPES[key] || {};
      const allowedMimeTypes = Object.keys(allowedTypes);
      const allowedExtensions = Object.values(allowedTypes).flat();
      const fileExtension = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
      const isAllowedMime = allowedMimeTypes.includes(file.type);
      const isAllowedExtension = allowedExtensions.includes(fileExtension);

      if (!isAllowedMime && !isAllowedExtension) {
        setErrors((prev) => ({
          ...prev,
          [key]: `Unsupported file type. Allowed: ${allowedExtensions.join(", ")}`,
        }));
        return;
      }

      setDocuments((prev: any) => ({ ...prev, [key]: file }));
      setErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const normalizeLocationText = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ");

  const getAddressComponentValue = (
    components: any[],
    allowedTypes: string[],
  ) => {
    const item = components.find((component) =>
      component.types.some((componentType: string) =>
        allowedTypes.includes(componentType),
      ),
    );
    return item?.long_name || "";
  };

  const validateCoordinatesWithinSelectedLocation = async (
    latitude: number,
    longitude: number,
  ) => {
    if (!selectedCountry?.value || !selectedCity?.value) {
      return {
        isValid: false,
        error: "Please select country and city before choosing a map location.",
      };
    }

    if (typeof window === "undefined" || !window.google?.maps) {
      return {
        isValid: false,
        error: "Google Maps is not loaded yet. Please try again.",
      };
    }

    try {
      const geocoder = new window.google.maps.Geocoder();
      const geocodeResult = await geocoder.geocode({
        location: { lat: latitude, lng: longitude },
      });

      const topResult = geocodeResult.results?.[0];
      if (!topResult) {
        return {
          isValid: false,
          error: "Unable to validate selected location. Please try another point.",
        };
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

      const expectedCountry = normalizeLocationText(selectedCountry.value);
      const actualCountry = normalizeLocationText(detectedCountry);
      if (!actualCountry || actualCountry !== expectedCountry) {
        return {
          isValid: false,
          error: `Location must be within ${selectedCountry.value}.`,
        };
      }

      const expectedCity = normalizeLocationText(selectedCity.value);
      const cityMatches = detectedCityCandidates.some((candidate) => {
        const normalizedCandidate = normalizeLocationText(candidate);
        return (
          normalizedCandidate === expectedCity ||
          normalizedCandidate.includes(expectedCity) ||
          expectedCity.includes(normalizedCandidate)
        );
      });

      if (!cityMatches) {
        return {
          isValid: false,
          error: `Location must be within ${selectedCity.value}, ${selectedCountry.value}.`,
        };
      }

      return { isValid: true };
    } catch (_error) {
      return {
        isValid: false,
        error: "Unable to validate location. Please try another point.",
      };
    }
  };

  const applyValidatedLocation = async (latitude: number, longitude: number) => {
    const validation = await validateCoordinatesWithinSelectedLocation(
      latitude,
      longitude,
    );

    if (!validation.isValid) {
      setErrors((prev) => ({
        ...prev,
        location: validation.error || "Invalid location selected.",
      }));
      return;
    }

    setLocation({ lat: latitude, lng: longitude });
    setErrors((prev) => ({ ...prev, location: "" }));
  };

  const normalizeSocialUrl = (url = "") => {
    const trimmed = url.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  const detectPlatformFromUrl = (url = "") => {
    const normalizedUrl = normalizeSocialUrl(url);
    if (!normalizedUrl) return "";

    const detectedPlatform = Object.keys(SOCIAL_URL_PATTERNS).find(
      (platformKey) =>
        SOCIAL_URL_PATTERNS[platformKey as keyof typeof SOCIAL_URL_PATTERNS].test(
          normalizedUrl,
        ),
    );

    return detectedPlatform || "";
  };

  const getSocialPlatformLabel = (platform: string) => {
    const selectedPlatform = SOCIAL_PLATFORM_OPTIONS.find(
      (item) => item.value === platform,
    );
    return selectedPlatform ? selectedPlatform.label : "social";
  };

  const updateSocialLink = (
    index: number,
    field: "platform" | "url",
    value: string,
  ) => {
    setSocialLinks((prev) =>
      prev.map((item, itemIndex) =>
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
    );

    setErrors((prev) => ({
      ...prev,
      [`socialLink-${index}`]: "",
    }));
  };

  const addSocialLinkRow = () => {
    if (socialLinks.length >= SOCIAL_PLATFORM_OPTIONS.length) return;
    setSocialLinks((prev) => [...prev, { platform: "", url: "" }]);
  };

  const removeSocialLinkRow = (index: number) => {
    setSocialLinks((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    setErrors((prev) => {
      const updated = { ...prev };
      delete updated[`socialLink-${index}`];
      return updated;
    });
  };

  const validateSocialLinks = () => {
    const socialLinkErrors: Record<string, string> = {};
    const unique = new Map<string, SocialLink>();

    socialLinks.forEach((link, index) => {
      const selectedPlatform = link.platform?.trim();
      const enteredUrl = link.url?.trim();

      if (!selectedPlatform && !enteredUrl) return;

      const normalizedUrl = normalizeSocialUrl(enteredUrl);
      const inferredPlatform = detectPlatformFromUrl(normalizedUrl);
      const platform = selectedPlatform || inferredPlatform;

      if (!platform && enteredUrl) {
        socialLinkErrors[`socialLink-${index}`] =
          "Use a supported social URL or select its platform.";
        return;
      }

      if (!normalizedUrl) return;

      const pattern =
        SOCIAL_URL_PATTERNS[platform as keyof typeof SOCIAL_URL_PATTERNS];
      if (pattern && !pattern.test(normalizedUrl)) {
        socialLinkErrors[`socialLink-${index}`] =
          `Please enter a valid ${getSocialPlatformLabel(platform)} link.`;
        return;
      }

      unique.set(`${platform}:${normalizedUrl}`, {
        platform,
        url: normalizedUrl,
      });
    });

    return {
      socialLinkErrors,
      linksToSubmit: Array.from(unique.values()),
    };
  };

  const isValidLatitude = (lat: string | number) => {
    const value = String(lat);
    const num = Number(lat);
    return num >= -90 && num <= 90 && /^-?\d+\.\d{4,7}$/.test(value);
  };

  const isValidLongitude = (lng: string | number) => {
    const value = String(lng);
    const num = Number(lng);
    return num >= -180 && num <= 180 && /^-?\d+\.\d{4,7}$/.test(value);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!bio.trim() || bio.length < 5 || bio.length > 1000) {
      newErrors.bio =
        bio.length === 0
          ? "Bio is required"
          : "Bio must be between 5 and 1000 characters.";
    }

    if (!selectedCountry) newErrors.country = "Country is required";
    if (!selectedCity?.value) newErrors.city = "City is required";

    if (!selectedNativeCountry)
      newErrors.nativeCountry = "Native country is required.";
    if (!selectedNativeCity?.value) {
      newErrors.nativeCity = "Native city is required.";
    }

    const lat = location.lat.toFixed(6);
    const lng = location.lng.toFixed(6);
    if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
      newErrors.location = "Please choose a valid map location.";
    }

    if (!isResident) {
      newErrors.isResident = "Resident status is required";
    }

    if (!documents.passport) newErrors.passport = "Passport is required";
    if (isResident === "true" && !documents.emiratesId) {
      newErrors.emiratesId = "Emirates ID is required";
    }
    if (!documents.bioVideo) newErrors.bioVideo = "Bio Video is required";

    if (documents.passportSecondary && !documents.passport) {
      newErrors.passportSecondary =
        "Passport is required before uploading secondary document.";
    }
    if (documents.emiratesIdSecondary && !documents.emiratesId) {
      newErrors.emiratesIdSecondary =
        "Emirates ID is required before uploading secondary document.";
    }

    const { socialLinkErrors } = validateSocialLinks();
    Object.assign(newErrors, socialLinkErrors);

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const countryOptions = Country.getAllCountries().map((c) => ({
    label: c.name,
    value: c.name,
    isoCode: c.isoCode,
  }));

  const reactSelectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      backgroundColor: "#374151",
      borderColor: state.isFocused ? "#6b7280" : "#4b5563",
      color: "white",
      boxShadow: state.isFocused ? "0 0 0 1px #6b7280" : "none",
      "&:hover": {
        borderColor: "#4b5563",
      },
    }),
    singleValue: (base: any) => ({
      ...base,
      color: "white",
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: "#374151",
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? "#1f2937" : "#374151",
      color: "white",
    }),
    placeholder: (base: any) => ({
      ...base,
      color: "#9ca3af",
    }),
    input: (base: any) => ({
      ...base,
      color: "white",
    }),
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!validate()) return;

        const { linksToSubmit } = validateSocialLinks();

        nextStep({
          bio,
          gender,
          country: selectedCountry.value,
          city: selectedCity.value,
          nativeCountry: selectedNativeCountry.value,
          nativeCity: selectedNativeCity.value,
          longitude: Number(location.lng.toFixed(7)),
          latitude: Number(location.lat.toFixed(7)),
          passport: documents.passport as File,
          profilePicture: documents.profilePicture,
          tradeLicense: documents.tradeLicense,
          tradeLicenseSecondary: documents.tradeLicenseSecondary,
          emiratesId: documents.emiratesId,
          emiratesIdSecondary: documents.emiratesIdSecondary,
          passportSecondary: documents.passportSecondary,
          bioVideo: documents.bioVideo as File,
          isResident: isResident === "true",
          socialLinks: linksToSubmit,
        });
      }}
      className="flex flex-col gap-6"
    >
      <p className="text-sm text-gray-300">
        Please fill in required details and submit your profile for review.
      </p>

      <div>
        <label
          htmlFor="bio"
          className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
        >
          Bio *
        </label>
        <textarea
          id="bio"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Please enter your bio"
          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          rows={4}
          required
        />
        {errors.bio && (
          <p className="text-red-500 text-sm mt-1">{errors.bio}</p>
        )}
      </div>

      <div>
        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Gender
        </label>
        <select
          value={gender}
          onChange={(event) => setGender(event.target.value)}
          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          {GENDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Residency Status *
        </label>
        <select
          value={isResident}
          onChange={(event) => {
            setIsResident(event.target.value as "" | "true" | "false");
            setErrors((prev) => ({ ...prev, isResident: "" }));
          }}
          className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="">Select Residency Status</option>
          <option value="true">UAE Resident</option>
          <option value="false">UAE Non-Resident</option>
        </select>
        {errors.isResident && (
          <p className="text-red-500 text-sm mt-1">{errors.isResident}</p>
        )}
      </div>

      <div className="z-50">
        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Country of residence *
        </label>
        <Select
          options={countryOptions}
          onChange={(val: any) => {
            setSelectedCountry(val);
            setErrors((prev) => ({ ...prev, country: "" }));
          }}
          value={selectedCountry}
          placeholder="Select your country"
          isClearable
          styles={reactSelectStyles}
        />
        {errors.country && (
          <p className="text-red-500 text-sm mt-1">{errors.country}</p>
        )}
      </div>

      {selectedCountry && (
        <div className="z-40">
          <label
            className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
          >
            City of residence *
          </label>
          <Select
            options={cities}
            onChange={(val: any) => {
              setSelectedCity(val);
              if (val?.latitude && val?.longitude) {
                setLocation({
                  lat: Number(val.latitude),
                  lng: Number(val.longitude),
                });
              }
              setErrors((prev) => ({ ...prev, city: "" }));
            }}
            value={selectedCity}
            placeholder="Select your city"
            isClearable
            styles={reactSelectStyles}
          />
          {errors.city && (
            <p className="text-red-500 text-sm mt-1">{errors.city}</p>
          )}
        </div>
      )}

      <div>
        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Pick Location *
        </label>

        {!googleMapsApiKey ? (
          <div className="h-60 w-full flex items-center justify-center bg-gray-800 text-sm text-red-400 px-4 text-center rounded-lg">
            Google Maps API key is missing. Please set
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.
          </div>
        ) : (
          <LoadScript
            googleMapsApiKey={googleMapsApiKey}
            libraries={googleLibraries}
          >
            <div className="mb-3">
              <Autocomplete
                onLoad={(instance) => setAutocompleteInstance(instance)}
                onPlaceChanged={async () => {
                  const place = autocompleteInstance?.getPlace?.();
                  const lat = place?.geometry?.location?.lat?.();
                  const lng = place?.geometry?.location?.lng?.();

                  if (typeof lat !== "number" || typeof lng !== "number") {
                    setErrors((prev) => ({
                      ...prev,
                      location: "Please select a valid result from location search.",
                    }));
                    return;
                  }

                  await applyValidatedLocation(lat, lng);
                }}
              >
                <input
                  value={mapSearchInput}
                  onChange={(e) => setMapSearchInput(e.target.value)}
                  placeholder={
                    selectedCountry?.value && selectedCity?.value
                      ? "Search for a location"
                      : "Select country and city first"
                  }
                  disabled={!selectedCountry?.value || !selectedCity?.value}
                  className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg block w-full p-2.5 disabled:opacity-60 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </Autocomplete>
            </div>

            <div className="h-60 rounded-lg overflow-hidden">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={location}
                zoom={12}
                onClick={async (event: any) => {
                  const lat = event?.latLng?.lat?.();
                  const lng = event?.latLng?.lng?.();
                  if (typeof lat === "number" && typeof lng === "number") {
                    await applyValidatedLocation(lat, lng);
                  }
                }}
              >
                <Marker
                  position={location}
                  draggable
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
          </LoadScript>
        )}
        <p className="text-sm mt-2 text-gray-500 dark:text-gray-400">
          Lat: {Number(location.lat).toFixed(6)}, Lng:{" "}
          {Number(location.lng).toFixed(6)}
        </p>
        {errors.location && (
          <p className="text-red-500 text-sm mt-1">{errors.location}</p>
        )}
      </div>

      <div>
        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Native Country *
        </label>
        <Select
          options={countryOptions}
          onChange={(val: any) => {
            setSelectedNativeCountry(val);
            setErrors((prev) => ({ ...prev, nativeCountry: "" }));
          }}
          value={selectedNativeCountry}
          placeholder="Select your native country"
          isClearable
          styles={reactSelectStyles}
        />
        {errors.nativeCountry && (
          <p className="text-red-500 text-sm mt-1">{errors.nativeCountry}</p>
        )}
      </div>

      {selectedNativeCountry && (
        <div className="z-30">
          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Native City *
          </label>
          <Select
            options={nativeCities}
            onChange={(val: any) => {
              setSelectedNativeCity(val);
              setErrors((prev) => ({ ...prev, nativeCity: "" }));
            }}
            value={selectedNativeCity}
            placeholder="Select your native city"
            isClearable
            styles={reactSelectStyles}
          />
          {errors.nativeCity && (
            <p className="text-red-500 text-sm mt-1">{errors.nativeCity}</p>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            Social Media Links
          </label>
          <span className="text-xs text-gray-400">Optional</span>
        </div>

        <div className="space-y-2">
          {socialLinks.map((link, index) => (
            <div key={`social-${index}`}>
              <div className="grid grid-cols-12 gap-2">
                <select
                  value={link.platform}
                  onChange={(e) =>
                    updateSocialLink(index, "platform", e.target.value)
                  }
                  className="col-span-4 bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Platform</option>
                  {SOCIAL_PLATFORM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={link.url}
                  onChange={(e) => updateSocialLink(index, "url", e.target.value)}
                  placeholder="Paste profile URL"
                  className="col-span-7 bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />

                <button
                  type="button"
                  onClick={() => removeSocialLinkRow(index)}
                  className="col-span-1 rounded-lg border border-red-500 text-red-500 hover:bg-red-500/10"
                >
                  x
                </button>
              </div>

              {errors[`socialLink-${index}`] && (
                <p className="text-red-500 text-sm mt-1">
                  {errors[`socialLink-${index}`]}
                </p>
              )}
            </div>
          ))}
        </div>

        {socialLinks.length < SOCIAL_PLATFORM_OPTIONS.length && (
          <button
            type="button"
            onClick={addSocialLinkRow}
            className="mt-2 text-sm text-gold-400 hover:text-gold-300"
          >
            + Add social link
          </button>
        )}
      </div>

      {[
        "profilePicture",
        "tradeLicense",
        ...(documents.tradeLicense ? ["tradeLicenseSecondary"] : []),
        "passport",
        ...(documents.passport ? ["passportSecondary"] : []),
        "emiratesId",
        ...(documents.emiratesId ? ["emiratesIdSecondary"] : []),
        "bioVideo",
      ].map((key) => {
        const file = documents[key];
        const required =
          ["passport", "bioVideo"].includes(key) ||
          (key === "emiratesId" && isResident === "true");
        const accepts = ACCEPTED_FILE_TYPES[key] || {};

        return (
          <div key={key}>
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              {documentLabels[key]} {required ? "*" : ""}
            </label>

            <Dropzone
              onDrop={(acceptedFiles) => handleDocumentDrop(key, acceptedFiles)}
              multiple={false}
              accept={accepts}
            >
              {({ getRootProps, getInputProps }) => (
                <div
                  {...getRootProps()}
                  className={`p-4 border-2 border-dashed rounded-lg cursor-pointer dark:border-gray-600 bg-white dark:bg-gray-800 ${
                    file ? "border-green-500" : ""
                  }`}
                >
                  <input {...getInputProps()} />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {file ? file.name : "Click or drag to upload"}
                  </p>
                </div>
              )}
            </Dropzone>

            {errors[key] && <p className="text-red-500 text-sm mt-1">{errors[key]}</p>}

            {file && file.type.startsWith("image") && (
              <Image
                src={URL.createObjectURL(file)}
                alt="Preview"
                width={0}
                height={0}
                sizes="100vw"
                unoptimized
                className="mt-2 max-h-40 w-auto rounded object-contain"
                style={{ width: "auto", height: "auto" }}
              />
            )}

            {file && file.type.startsWith("video") && (
              <video controls className="mt-2 max-h-56 rounded w-full">
                <source src={URL.createObjectURL(file)} type={file.type} />
                Your browser does not support the video preview.
              </video>
            )}
          </div>
        );
      })}

      <div className="flex justify-between">
        <button
          type="button"
          // onClick={prevStep}
          disabled={true}
          className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        >
          Back
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-gold-600 rounded hover:bg-gold-700 text-white"
        >
          Submit for Approval
        </button>
      </div>
    </form>
  );
}
