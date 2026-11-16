import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { toast } from 'react-toastify';
import {
  HiX,
  HiUpload,
  HiSave,
  HiArrowLeft
} from 'react-icons/hi';
import type { IconType } from 'react-icons';
import { NewsItem, NewsCreatePayload, NewsUpdatePayload } from '@/types/news';
import { createNews, updateNews, deleteNewsImage } from '@/services/news';
import useAuthStore from '@/store/authStore';

const CKEditorClient = dynamic(() => import('@/components/CKEditorClient'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center py-10">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gold-500"></div>
    </div>
  ),
});

interface NewsFormProps {
  initialData?: NewsItem | null;
  isEditMode?: boolean;
  onSuccess?: (newsItem: NewsItem) => void;
  onCancel?: () => void;
}

const MAX_IMAGES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_EXTENSIONS = [
  '.pptx',
  '.docx',
  '.doc',
  '.ppt',
  '.pdf',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
  '.jpeg',
  '.png',
  '.jpg',
];
const FILE_ACCEPT = ALLOWED_FILE_EXTENSIONS.join(',');

const toDateInputValue = (value?: string) => {
  if (!value) return '';
  return value.split('T')[0];
};

export default function NewsForm({
  initialData,
  isEditMode = false,
  onSuccess,
  onCancel
}: NewsFormProps) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    content: initialData?.content || '',
    date: toDateInputValue(initialData?.datePlanned || initialData?.createdAt),
    videoUrl: initialData?.videoUrl || '',
    retentionPeriod: initialData?.retentionPeriod || 30,
  });

  const [imageSlots, setImageSlots] = useState<(string | File | null)[]>(() => {
    if (initialData?.photoUrls) {
      const slots = initialData.photoUrls.map(url => url && url.trim() ? url : null);
      while (slots.length < MAX_IMAGES) {
        slots.push(null);
      }
      return slots.slice(0, MAX_IMAGES);
    }
    return [null, null, null, null];
  });

  const [originalSlots] = useState<(string | null)[]>(() => {
    if (initialData?.photoUrls) {
      const slots = initialData.photoUrls.map(url => url && url.trim() ? url : null);
      while (slots.length < MAX_IMAGES) {
        slots.push(null);
      }
      return slots.slice(0, MAX_IMAGES);
    }
    return [null, null, null, null];
  });

  const [loading, setLoading] = useState(false);
  const [deletingImage, setDeletingImage] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});



  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length > 255) {
      newErrors.title = 'Title must be less than 255 characters';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (formData.videoUrl && !isValidVideoUrl(formData.videoUrl)) {
      newErrors.videoUrl = 'Please enter a valid video URL (YouTube, Vimeo, etc.)';
    }

    if (formData.retentionPeriod < 1 || formData.retentionPeriod > 365) {
      newErrors.retentionPeriod = 'Retention period must be between 1 and 365 days';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidVideoUrl = (url: string) => {
    const videoPatterns = [
      /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/,
      /^https?:\/\/(www\.)?vimeo\.com\/.+/,
      /^https?:\/\/.+\.(mp4|webm|ogg)$/,
    ];
    return videoPatterns.some(pattern => pattern.test(url));
  };

  const isImageFile = (slot: string | File | null) => {
    if (!slot) return false;
    if (slot instanceof File) {
      return slot.type.startsWith('image/');
    }
    return /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(slot);
  };

  const getFileLabel = (slot: string | File) => {
    if (slot instanceof File) {
      return slot.name;
    }
    const parts = slot.split('/');
    return parts[parts.length - 1] || 'File';
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, slotIndex?: number) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    const file = files[0]; // Take only the first file for slot-based upload

    const lowerName = file.name.toLowerCase();
    const extension = lowerName.includes('.')
      ? `.${lowerName.split('.').pop()}`
      : '';

    if (!ALLOWED_FILE_EXTENSIONS.includes(extension)) {
      toast.error(
        `${file.name} is not supported. Allowed: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`,
      );
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name} is too large. Maximum size is 5MB`);
      return;
    }

    if (slotIndex !== undefined) {
      // Replace specific slot
      setImageSlots(prev => {
        const newSlots = [...prev];
        newSlots[slotIndex] = file;
        return newSlots;
      });
    } else {
      // Find first empty slot
      const emptySlotIndex = imageSlots.findIndex(slot => slot === null);
      if (emptySlotIndex !== -1) {
        setImageSlots(prev => {
          const newSlots = [...prev];
          newSlots[emptySlotIndex] = file;
          return newSlots;
        });
      } else {
        toast.error('All image slots are filled. Please remove an existing image first.');
      }
    }

    // Reset input
    if (e.target) {
      e.target.value = '';
    }
  };

  const removeImage = async (slotIndex: number) => {
    const currentSlot = imageSlots[slotIndex];

    // If it's an existing image (URL string) and we're in edit mode, call the delete API
    if (isEditMode && typeof currentSlot === 'string' && initialData) {
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      setDeletingImage(slotIndex);
      try {
        const imageKey = `image${slotIndex + 1}` as 'image1' | 'image2' | 'image3' | 'image4';
        await deleteNewsImage(token, initialData.id, imageKey);

        // Update local state after successful deletion
        setImageSlots(prev => {
          const newSlots = [...prev];
          newSlots[slotIndex] = null;
          return newSlots;
        });

        // Also update original slots to reflect the deletion
        (originalSlots as (string | null)[])[slotIndex] = null;

        toast.success(`Image ${slotIndex + 1} deleted successfully`);
      } catch (error: any) {
        console.error('Failed to delete image:', error);
        toast.error(error.message || 'Failed to delete image');
      } finally {
        setDeletingImage(null);
      }
    } else {
      // For new files or create mode, just remove from local state
      setImageSlots(prev => {
        const newSlots = [...prev];
        newSlots[slotIndex] = null;
        return newSlots;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    if (!token) {
      toast.error('Authentication required');
      return;
    }

    setLoading(true);

    try {
      const payload: any = { ...formData };

      if (isEditMode) {
        // For edit mode, send individual image keys only for slots that have changed
        let hasImageChanges = false;

        imageSlots.forEach((currentSlot, index) => {
          const originalSlot = originalSlots[index];
          const slotKey = `image${index + 1}`;

          if (currentSlot instanceof File) {
            // New file uploaded to this slot
            payload[slotKey] = currentSlot;
            hasImageChanges = true;
          } else if (currentSlot === null && originalSlot !== null) {
            // Slot was cleared (had an image, now empty)
            payload[slotKey] = null;
            hasImageChanges = true;
          }
          // If currentSlot === originalSlot (both are strings or both are null), no change needed
        });

        // Also send the complete photoUrls array to indicate the desired final state
        payload.photoUrls = imageSlots.map(slot => {
          if (typeof slot === 'string') {
            return slot; // Existing URL
          } else if (slot instanceof File) {
            return 'NEW_FILE'; // Placeholder - backend will replace with actual URL
          } else {
            return ''; // Empty slot
          }
        });
      } else {
        // For create mode, send all new files as a single images array
        const newFiles = imageSlots.filter((slot): slot is File => slot instanceof File);
        if (newFiles.length > 0) {
          payload.images = newFiles;
        }
      }

      let result;

      if (isEditMode && initialData) {
        result = await updateNews(token, initialData.id, payload as NewsUpdatePayload);
        toast.success('News & Announcements updated successfully!');
      } else {
        result = await createNews(token, payload as NewsCreatePayload);
        toast.success('News & Announcements created successfully!');
      }

      if (onSuccess) {
        // Note: We'd need to fetch the full item for onSuccess, or modify the API response
        onSuccess(result.data as any);
      } else {
        // Default: redirect to main news page after creation/update
        router.push('/news');
      }

    } catch (error: any) {
      console.error('Error saving news:', error);
      toast.error(error.message || 'Failed to save news item');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      // Default: go to main news page to avoid recursive routing
      router.push('/news');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleCancel}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {/* @ts-ignore */}
            <HiArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditMode ? 'Edit News & Announcements' : 'Create News & Announcements'}
          </h1>
        </div>


      </div>

      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent ${errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              placeholder="Enter news title..."
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content <span className="text-red-500">*</span>
            </label>
            <div className={`border rounded-lg ${errors.content ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}>
              <CKEditorClient
                value={formData.content}
                onChange={(content) => setFormData(prev => ({ ...prev, content }))}
              />
            </div>
            {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content}</p>}
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent ${errors.date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              required
            />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              You can select any date, including past dates.
            </p>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Files (Optional, up to {MAX_IMAGES})
            </label>

            {/* Image Slots */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {imageSlots.map((slot, index) => {
                const slotNumber = index + 1;
                const isEmpty = slot === null;
                const isFile = slot instanceof File;
                const isUrl = typeof slot === 'string';

                return (
                  <div key={index} className="relative">
                    <div className="aspect-square border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden hover:border-gold-400 transition-colors">
                      {isEmpty ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-700">
                          <div className="text-center">
                            <div className="mb-2">
                              {/* @ts-ignore */}
                              <HiUpload className="h-6 w-6 text-gray-400 mx-auto" />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">File {slotNumber}</p>
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = FILE_ACCEPT;
                                input.onchange = (e) => handleImageChange(e as any, index);
                                input.click();
                              }}
                              className="mt-1 text-xs text-gold-600 hover:text-gold-700 underline"
                            >
                              Upload
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full h-full group">
                          {isImageFile(slot) && isUrl ? (
                            <Image
                              src={slot}
                              alt={`Image ${slotNumber}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 50vw, 25vw"
                            />
                          ) : isImageFile(slot) && isFile ? (
                            <Image
                              src={URL.createObjectURL(slot)}
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
                              {isUrl && (
                                <a
                                  href={slot}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-2 text-xs text-gold-600 hover:text-gold-700 underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Open
                                </a>
                              )}
                            </div>
                          )}

                          {/* Overlay with actions */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = FILE_ACCEPT;
                                  input.onchange = (e) => handleImageChange(e as any, index);
                                  input.click();
                                }}
                                className="bg-blue-500 text-white p-1 rounded text-xs hover:bg-blue-600"
                                title="Replace"
                              >
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                disabled={deletingImage === index}
                                className="bg-red-500 text-white p-1 rounded text-xs hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Remove"
                              >
                                {deletingImage === index ? 'Deleting...' : 'Remove'}
                              </button>
                            </div>
                          </div>

                          {/* Slot indicator */}
                          <div className="absolute top-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1 rounded">
                            {slotNumber}{index === 0 ? ' (Primary)' : ''}
                          </div>

                          {/* File indicator for new files */}
                          {isFile && (
                            <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1 rounded">
                              New
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Allowed formats: PPTX, DOCX, DOC, PPT, PDF, XLS, XLSX, CSV, TXT, JPEG, PNG, JPG. Max size: 5MB per file.
              {imageSlots[0] && <span className="block mt-1"><strong>Image 1 is the primary image</strong> shown in cards and previews.</span>}
            </p>
          </div>

          {/* Video URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Video URL (Optional)
            </label>
            <input
              type="url"
              value={formData.videoUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent ${errors.videoUrl ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              placeholder="https://youtube.com/watch?v=..."
            />
            {errors.videoUrl && <p className="text-red-500 text-xs mt-1">{errors.videoUrl}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Supports YouTube, Vimeo, and direct video file URLs
            </p>
          </div>

          {/* Retention Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Retention Period (Days)
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={formData.retentionPeriod}
              onChange={(e) => setFormData(prev => ({ ...prev, retentionPeriod: parseInt(e.target.value) || 30 }))}
              className={`w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-transparent ${errors.retentionPeriod ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
            />
            {errors.retentionPeriod && <p className="text-red-500 text-xs mt-1">{errors.retentionPeriod}</p>}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              How long this news item should remain active
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>



            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-gold-600 border border-transparent rounded-lg text-sm font-medium text-white hover:bg-gold-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {/* @ts-ignore */}
                  <HiSave className="h-4 w-4 mr-1" />
                  {isEditMode ? 'Update News & Announcements' : 'Publish News & Announcements'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
