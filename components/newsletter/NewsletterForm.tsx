import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { HiArrowLeft, HiPlus, HiSave, HiSearch, HiUpload } from "react-icons/hi";
import type { NewsletterItem, NewsletterRecipientUser } from "@/types/newsletter";
import {
  createNewsletter,
  fetchNewsletterRecipientUsers,
  updateNewsletter,
} from "@/services/newsletter";
import useAuthStore from "@/store/authStore";
import { COMMON_TIMEZONES } from "@/constants/datetime";
import { formatDateWithTimezoneForAPI } from "@/utils/formatDateAndTime";

const CKEditorClient = dynamic(() => import("@/components/CKEditorClient"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center py-10">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gold-500" />
    </div>
  ),
});

interface NewsletterFormProps {
  mode?: "create" | "edit";
  newsletterId?: number;
  initialData?: NewsletterItem | null;
  onSuccess?: (newsletterItem: NewsletterItem) => void;
  onCancel?: () => void;
}

type MediaSlot = File | string | null;

const MAX_IMAGES = 4;
const MAX_VIDEO_URLS = 3;
const MAX_ARTICLE_URLS = 3;
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const FILE_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,.ppt,.pptx";

export default function NewsletterForm({
  mode = "create",
  newsletterId,
  initialData,
  onSuccess,
  onCancel,
}: NewsletterFormProps) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    videoUrl1: "",
    videoUrl2: "",
    videoUrl3: "",
    articleUrl1: "",
    articleUrl2: "",
    articleUrl3: "",
    timezone: "UTC",
    publishedAt: "",
  });
  const [localTimezone, setLocalTimezone] = useState("UTC");

  const [visibleVideoInputs, setVisibleVideoInputs] = useState(1);
  const [visibleArticleInputs, setVisibleArticleInputs] = useState(1);

  const [imageSlots, setImageSlots] = useState<MediaSlot[]>([
    null,
    null,
    null,
    null,
  ]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<number[]>([]);
  const [recipientUsers, setRecipientUsers] = useState<NewsletterRecipientUser[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [recipientLoadError, setRecipientLoadError] = useState("");

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const videoFieldKeys: Array<"videoUrl1" | "videoUrl2" | "videoUrl3"> = [
    "videoUrl1",
    "videoUrl2",
    "videoUrl3",
  ];
  const articleFieldKeys: Array<"articleUrl1" | "articleUrl2" | "articleUrl3"> = [
    "articleUrl1",
    "articleUrl2",
    "articleUrl3",
  ];

  const timezoneOptions = useMemo(() => {
    const uniqueTimezones = new Set<string>(COMMON_TIMEZONES);
    if (localTimezone) uniqueTimezones.add(localTimezone);
    if (formData.timezone) uniqueTimezones.add(formData.timezone);
    return Array.from(uniqueTimezones);
  }, [localTimezone, formData.timezone]);

  useEffect(() => {
    const detectedTimezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    setLocalTimezone(detectedTimezone);
    setFormData((prev) =>
      prev.timezone === "UTC"
        ? { ...prev, timezone: detectedTimezone }
        : prev,
    );
  }, []);

  useEffect(() => {
    const loadRecipients = async () => {
      if (!token) return;

      setLoadingRecipients(true);
      setRecipientLoadError("");
      try {
        const users = await fetchNewsletterRecipientUsers(token);
        setRecipientUsers(users);
      } catch (error: any) {
        setRecipientLoadError(error?.message || "Failed to load users for selection");
      } finally {
        setLoadingRecipients(false);
      }
    };

    loadRecipients();
  }, [token]);

  useEffect(() => {
    if (mode !== "edit" || !initialData) {
      return;
    }

    const toDateTimeLocalValue = (isoDate: string) => {
      const date = new Date(isoDate);
      if (Number.isNaN(date.getTime())) {
        return "";
      }

      const timezoneOffset = date.getTimezoneOffset() * 60000;
      return new Date(date.getTime() - timezoneOffset)
        .toISOString()
        .slice(0, 16);
    };

    setFormData({
      title: initialData.title || "",
      content: initialData.content || "",
      videoUrl1: initialData.videoUrls?.[0] || "",
      videoUrl2: initialData.videoUrls?.[1] || "",
      videoUrl3: initialData.videoUrls?.[2] || "",
      articleUrl1: initialData.articleUrls?.[0] || "",
      articleUrl2: initialData.articleUrls?.[1] || "",
      articleUrl3: initialData.articleUrls?.[2] || "",
      timezone: localTimezone,
      publishedAt:
        initialData.status === "PENDING"
          ? toDateTimeLocalValue(initialData.publishedAt)
          : "",
    });

    const prefilledMedia: MediaSlot[] = [
      ...(initialData.photoUrls || []).slice(0, MAX_IMAGES),
    ];
    while (prefilledMedia.length < MAX_IMAGES) {
      prefilledMedia.push(null);
    }
    setImageSlots(prefilledMedia);

    setVisibleVideoInputs(
      Math.max(1, Math.min(MAX_VIDEO_URLS, initialData.videoUrls?.length || 0)),
    );
    setVisibleArticleInputs(
      Math.max(
        1,
        Math.min(MAX_ARTICLE_URLS, initialData.articleUrls?.length || 0),
      ),
    );
    setSelectedRecipientIds(initialData.recipients || []);
  }, [mode, initialData, localTimezone]);

  const filteredRecipientUsers = useMemo(() => {
    const term = recipientSearch.trim().toLowerCase();
    if (!term) return recipientUsers;

    return recipientUsers.filter((user) => {
      return (
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        String(user.id).includes(term)
      );
    });
  }, [recipientUsers, recipientSearch]);

  const isValidHttpUrl = (value: string) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const isImageFile = (file: File | string | null) => {
    if (!file) {
      return false;
    }

    if (file instanceof File) {
      return file.type.startsWith("image/");
    }

    return /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(file);
  };

  const getFileLabel = (file: File | string) => {
    if (typeof file === "string") {
      return decodeURIComponent(file.split("/").pop() || "File");
    }

    return file.name || "File";
  };

  const getInputClass = (hasError: boolean) =>
    `w-full px-3 py-2.5 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent transition-shadow ${
      hasError ? "border-red-500" : "border-gray-300 dark:border-gray-600"
    }`;

  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    slotIndex?: number,
  ) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const file = files[0];

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error(`${file.name} is not supported. Allowed: JPG, PNG, WEBP, PDF, PPT, PPTX`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name} is too large. Maximum size is 5MB`);
      return;
    }

    if (slotIndex !== undefined) {
      setImageSlots((prev) => {
        const next = [...prev];
        next[slotIndex] = file;
        return next;
      });
    } else {
      const firstEmptySlot = imageSlots.findIndex((slot) => slot === null);
      if (firstEmptySlot === -1) {
        toast.error("All image slots are filled. Remove one before uploading another.");
      } else {
        setImageSlots((prev) => {
          const next = [...prev];
          next[firstEmptySlot] = file;
          return next;
        });
      }
    }

    if (event.target) {
      event.target.value = "";
    }
  };

  const removeImage = (slotIndex: number) => {
    setImageSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
  };

  const toggleRecipient = (userId: number) => {
    setSelectedRecipientIds((prev) => {
      if (prev.includes(userId)) {
        return prev.filter((id) => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    } else if (formData.title.length > 255) {
      newErrors.title = "Title must be less than 255 characters";
    }

    const plainContent = formData.content.replace(/<[^>]*>/g, "").trim();
    if (!plainContent) {
      newErrors.content = "Content is required";
    }

    if (formData.publishedAt) {
      const publishDateIso = formatDateWithTimezoneForAPI(
        formData.publishedAt,
        formData.timezone,
      );

      if (!publishDateIso) {
        newErrors.publishedAt = "Published At must be a valid date";
      } else {
        const publishDate = new Date(publishDateIso);
        if (Number.isNaN(publishDate.getTime())) {
          newErrors.publishedAt = "Published At must be a valid date";
        } else if (publishDate.getTime() <= Date.now()) {
          newErrors.publishedAt = "Published At must be in the future";
        }
      }

      if (!formData.timezone) {
        newErrors.timezone = "Timezone is required when scheduling";
      }
    }

    const videoUrls = [formData.videoUrl1, formData.videoUrl2, formData.videoUrl3];
    videoUrls.forEach((url, index) => {
      if (url.trim() && !isValidHttpUrl(url.trim())) {
        newErrors[`videoUrl${index + 1}`] = `Video URL ${index + 1} must be a valid URL`;
      }
    });

    const articleUrls = [
      formData.articleUrl1,
      formData.articleUrl2,
      formData.articleUrl3,
    ];
    articleUrls.forEach((url, index) => {
      if (url.trim() && !isValidHttpUrl(url.trim())) {
        newErrors[`articleUrl${index + 1}`] = `Article URL ${index + 1} must be a valid URL`;
      }
    });

    if (selectedRecipientIds.length === 0) {
      newErrors.recipients = "Please select at least one recipient";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) return;
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    setLoading(true);

    try {
      const publishedAtIso = formData.publishedAt
        ? formatDateWithTimezoneForAPI(formData.publishedAt, formData.timezone)
        : undefined;

      const payload = {
        title: formData.title.trim(),
        content: formData.content,
        publishedAt: publishedAtIso || undefined,
        recipients: selectedRecipientIds,
        videoUrls: [formData.videoUrl1, formData.videoUrl2, formData.videoUrl3]
          .map((url) => url.trim())
          .filter(Boolean)
          .slice(0, MAX_VIDEO_URLS),
        articleUrls: [
          formData.articleUrl1,
          formData.articleUrl2,
          formData.articleUrl3,
        ]
          .map((url) => url.trim())
          .filter(Boolean)
          .slice(0, MAX_ARTICLE_URLS),
      };

      const images = imageSlots.filter((slot): slot is File => slot instanceof File);
      const existingPhotoUrls = imageSlots.filter(
        (slot): slot is string => typeof slot === "string",
      );

      let result;

      if (mode === "edit") {
        if (!newsletterId) {
          toast.error("Newsletter id is required for editing");
          return;
        }

        result = await updateNewsletter(token, newsletterId, {
          ...payload,
          images,
          existingPhotoUrls,
          recipients: selectedRecipientIds,
        });
        toast.success("Newsletter updated successfully!");
      } else {
        result = await createNewsletter(token, {
          ...payload,
          images,
          recipients: selectedRecipientIds,
        });
        toast.success("Newsletter created successfully!");
      }

      if (onSuccess) {
        onSuccess(result.data);
      } else {
        router.push("/newsletter");
      }
    } catch (error: any) {
      toast.error(
        error?.message ||
          (mode === "edit"
            ? "Failed to update newsletter"
            : "Failed to create newsletter"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push("/newsletter");
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-gold-200/70 dark:border-gray-700 bg-gradient-to-r from-gold-50 via-amber-50 to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 p-5 md:p-6 shadow-sm">
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gold-200/30 dark:bg-gold-700/20" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-amber-200/40 dark:bg-amber-700/20" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg bg-white/80 dark:bg-gray-700 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white shadow-sm"
            >
              {/* @ts-ignore */}
              <HiArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {mode === "edit" ? "Edit Newsletter" : "Create Newsletter"}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {mode === "edit"
                  ? "Update your pending newsletter before it gets published."
                  : "Craft a visually rich issue with media, links, scheduling, and recipients."}
              </p>
            </div>
          </div>
          <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white/80 dark:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200 shadow-sm">
            {mode === "edit" ? "Edit Mode" : "Draft Mode"}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5 md:p-6">
          <div className="mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Details</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Set the newsletter title and main content.</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className={getInputClass(Boolean(errors.title))}
                placeholder="Enter newsletter title..."
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content <span className="text-red-500">*</span>
              </label>
              <div
                className={`rounded-lg overflow-hidden border ${
                  errors.content
                    ? "border-red-500"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                <CKEditorClient
                  value={formData.content}
                  onChange={(content) =>
                    setFormData((prev) => ({ ...prev, content }))
                  }
                />
              </div>
              {errors.content && (
                <p className="text-red-500 text-xs mt-1">{errors.content}</p>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5 md:p-6 space-y-5">
          <div className="mb-2 pb-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Media & Schedule</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add visual assets and optionally schedule publishing.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              JPG/PDF (Optional, up to {MAX_IMAGES})
            </label>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
              {imageSlots.map((slot, index) => {
                const slotNumber = index + 1;
                const isEmpty = slot === null;

                return (
                  <div key={index} className="relative">
                    <div className="aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden hover:border-gold-400 transition-colors bg-gray-50 dark:bg-gray-700/50">
                      {isEmpty ? (
                        <div className="w-full h-full flex flex-col items-center justify-center px-3">
                          <div className="text-center">
                            <div className="mb-2">
                              {/* @ts-ignore */}
                              <HiUpload className="h-6 w-6 text-gray-400 mx-auto" />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Slot {slotNumber}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.createElement("input");
                                input.type = "file";
                                input.accept = FILE_ACCEPT;
                                input.onchange = (e) =>
                                  handleImageChange(e as any, index);
                                input.click();
                              }}
                              className="mt-2 text-xs px-2 py-1 rounded-md bg-gold-100 text-gold-700 hover:bg-gold-200 dark:bg-gold-900 dark:text-gold-200"
                            >
                              Upload
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full h-full group">
                          {isImageFile(slot) ? (
                            <Image
                              src={slot instanceof File ? URL.createObjectURL(slot) : slot}
                              alt={`Image ${slotNumber}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 25vw"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 p-2 text-center">
                              <div className="mb-2 text-gray-500 dark:text-gray-300 text-xs font-semibold">
                                DOCUMENT
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-200 break-all line-clamp-3">
                                {getFileLabel(slot)}
                              </div>
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.createElement("input");
                                  input.type = "file";
                                  input.accept = FILE_ACCEPT;
                                  input.onchange = (e) =>
                                    handleImageChange(e as any, index);
                                  input.click();
                                }}
                                className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                                title="Replace"
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                                title="Remove"
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          <div className="absolute top-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded-md">
                            {slotNumber}{index === 0 ? " (Primary)" : ""}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Supported formats: JPG, PNG, WebP, PDF, PPT, PPTX. Max size: 25MB per file.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, timezone: e.target.value }))
              }
              className={getInputClass(Boolean(errors.timezone))}
            >
              {timezoneOptions.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone === localTimezone
                    ? `${timezone} (Local time)`
                    : timezone}
                </option>
              ))}
            </select>
            {errors.timezone && (
              <p className="text-red-500 text-xs mt-1">{errors.timezone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Published At (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.publishedAt}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, publishedAt: e.target.value }))
              }
              className={getInputClass(Boolean(errors.publishedAt))}
            />
            {errors.publishedAt && (
              <p className="text-red-500 text-xs mt-1">{errors.publishedAt}</p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {mode === "edit"
                ? "Set a future date to keep it scheduled, or clear it to publish now."
                : "Leave empty to publish immediately."}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Selected time will be interpreted in {formData.timezone}.
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5 md:p-6 space-y-5">
          <div className="mb-2 pb-3 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Resource Links</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add optional video and article URLs to enrich the issue.</p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Video URLs (Optional)
              </label>
              {visibleVideoInputs < MAX_VIDEO_URLS && (
                <button
                  type="button"
                  onClick={() => setVisibleVideoInputs((prev) => Math.min(prev + 1, MAX_VIDEO_URLS))}
                  className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-gold-700 bg-gold-100 hover:bg-gold-200 dark:bg-gold-900 dark:text-gold-200 rounded-lg"
                >
                  {/* @ts-ignore */}
                  <HiPlus className="w-3.5 h-3.5 mr-1" />
                  Add Video URL
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: visibleVideoInputs }).map((_, index) => {
              const key = videoFieldKeys[index];
              return (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Video URL {index + 1}
                  </label>
                  <input
                    type="url"
                    value={formData[key]}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className={getInputClass(Boolean(errors[key]))}
                    placeholder="https://..."
                  />
                  {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key]}</p>}
                </div>
              );
            })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Article URLs (Optional)
              </label>
              {visibleArticleInputs < MAX_ARTICLE_URLS && (
                <button
                  type="button"
                  onClick={() => setVisibleArticleInputs((prev) => Math.min(prev + 1, MAX_ARTICLE_URLS))}
                  className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-gold-700 bg-gold-100 hover:bg-gold-200 dark:bg-gold-900 dark:text-gold-200 rounded-lg"
                >
                  {/* @ts-ignore */}
                  <HiPlus className="w-3.5 h-3.5 mr-1" />
                  Add Article URL
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: visibleArticleInputs }).map((_, index) => {
              const key = articleFieldKeys[index];
              return (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Article URL {index + 1}
                  </label>
                  <input
                    type="url"
                    value={formData[key]}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className={getInputClass(Boolean(errors[key]))}
                    placeholder="https://..."
                  />
                  {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key]}</p>}
                </div>
              );
            })}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-5 md:p-6 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Recipients
                </label>
                <div className="flex items-center gap-2">
                  {!loadingRecipients && recipientUsers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedRecipientIds(recipientUsers.map((u) => u.id))}
                      className="text-xs text-gold-600 hover:text-gold-700 font-medium"
                    >
                      Select All
                    </button>
                  )}
                  {selectedRecipientIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedRecipientIds([])}
                      className="text-xs text-red-600 hover:text-red-700"
                    >
                      Clear Selected ({selectedRecipientIds.length})
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Choose recipients from the active verified users list.
              </p>

              <div className="relative mb-3">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  {/* @ts-ignore */}
                  <HiSearch className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent border-gray-300 dark:border-gray-600"
                  placeholder="Search users by name, email, or ID"
                />
              </div>

              <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-700">
                {loadingRecipients && (
                  <div className="px-3 py-4 text-sm text-gray-600 dark:text-gray-300">
                    Loading users...
                  </div>
                )}

                {!loadingRecipients && recipientLoadError && (
                  <div className="px-3 py-4 text-sm text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900">
                    {recipientLoadError}
                  </div>
                )}

                {!loadingRecipients && !recipientLoadError && filteredRecipientUsers.length === 0 && (
                  <div className="px-3 py-4 text-sm text-gray-600 dark:text-gray-300">
                    No users found.
                  </div>
                )}

                {!loadingRecipients &&
                  !recipientLoadError &&
                  filteredRecipientUsers.map((user) => {
                    const isSelected = selectedRecipientIds.includes(user.id);
                    return (
                      <label
                        key={user.id}
                        className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/70 ${
                          isSelected ? "bg-gold-50 dark:bg-gold-900/20" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRecipient(user.id)}
                          className="mt-1 h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 dark:border-gray-600 rounded"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.name} (#{user.id})
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{user.email}</p>
                        </div>
                      </label>
                    );
                  })}
              </div>

              {errors.recipients && (
                <p className="text-red-500 text-xs mt-2">{errors.recipients}</p>
              )}
            </div>
        </section>

        <div className="sticky bottom-4 z-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur px-4 py-3 shadow-lg">
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-gold-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-gold-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {mode === "edit" ? "Saving..." : "Creating..."}
                </>
              ) : (
                <>
                  {/* @ts-ignore */}
                  <HiSave className="h-4 w-4 mr-1" />
                  {mode === "edit" ? "Save Changes" : "Publish Newsletter"}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
