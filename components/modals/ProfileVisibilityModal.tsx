"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { fetchAllMembershipCategories, MembershipCategory } from "@/services/membershipCategories";

interface ProfileField {
  id: string;
  label: string;
  value: string;
}

interface CategoryPermission {
  categoryId: number;
  categoryName: string;
  fieldPermissions: Record<string, boolean>;
}

interface ProfileVisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (visibilityData: any) => Promise<void>;
  currentPermissions?: CategoryPermission[];
  isLoading?: boolean;
  token: string;
}

const PROFILE_FIELDS: ProfileField[] = [
  { id: "COMPANY_NAME", label: "Company Name", value: "COMPANY_NAME" },
  { id: "PHONE_NUMBER", label: "Phone Number", value: "PHONE_NUMBER" },
  { id: "EMAIL", label: "Email Address", value: "EMAIL" },
  { id: "CITY", label: "City", value: "CITY" },
  { id: "COUNTRY", label: "Country", value: "COUNTRY" },
  { id: "WEBSITE", label: "Website", value: "WEBSITE" },
  { id: "PROFILE_PICTURE", label: "Display Photo", value: "PROFILE_PICTURE" },
  { id: "MEMBERSHIP", label: "Membership ID", value: "MEMBERSHIP" }, // need to fix this 
  { id: "MEMBERSHIP_CATEGORY", label: "Membership Category", value: "MEMBERSHIP_CATEGORY" },
  { id: "MEMBERSHIP_SUB_CATEGORY", label: "Membership Sub-category", value: "MEMBERSHIP_SUB_CATEGORY" },
  { id: "BUSINESS_GROUP", label: "Business Group", value: "BUSINESS_GROUP" },
];

export default function ProfileVisibilityModal({
  isOpen,
  onClose,
  onSave,
  currentPermissions = [],
  isLoading = false,
  token,
}: ProfileVisibilityModalProps) {
  const [permissions, setPermissions] = useState<Record<string, Record<number, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<MembershipCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  useEffect(() => {
    if (isOpen && token) {
      const fetchCategories = async () => {
        try {
          setCategoriesLoading(true);
          const fetchedCategories = await fetchAllMembershipCategories(token);
          setCategories(fetchedCategories);
        } catch (error: any) {
          toast.error("Failed to fetch membership categories");
          console.error("Error fetching categories:", error);
        } finally {
          setCategoriesLoading(false);
        }
      };
      
      fetchCategories();
    }
  }, [isOpen, token]);

  useEffect(() => {
    if (categories.length > 0) {
      if (currentPermissions.length > 0) {
        const initialPermissions: Record<string, Record<number, boolean>> = {};
        
        PROFILE_FIELDS.forEach(field => {
          initialPermissions[field.value] = {};
          categories.forEach(category => {
            const categoryPermission = currentPermissions.find(cp => cp.categoryId === category.id);
            initialPermissions[field.value][category.id] = 
              categoryPermission?.fieldPermissions[field.value] ?? true;
          });
        });
        
        setPermissions(initialPermissions);
      } else {
        const initialPermissions: Record<string, Record<number, boolean>> = {};
        PROFILE_FIELDS.forEach(field => {
          initialPermissions[field.value] = {};
          categories.forEach(category => {
            initialPermissions[field.value][category.id] = true;
          });
        });
        setPermissions(initialPermissions);
      }
    }
  }, [currentPermissions, categories]);

  const handlePermissionChange = (fieldValue: string, categoryId: number, isVisible: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [fieldValue]: {
        ...prev[fieldValue],
        [categoryId]: isVisible,
      },
    }));
  };

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      
      const fieldVisibilityData = PROFILE_FIELDS.map(field => ({
        field: field.value,
        visibleToCategories: categories.map(category => ({
          categoryId: category.id,
          isVisible: permissions[field.value]?.[category.id] ?? true,
        })),
      }));

      await onSave(fieldVisibilityData);
      toast.success("Profile visibility updated successfully");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile visibility");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-200 dark:scrollbar-track-gray-700">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Edit Profile Visibility
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Configure which profile fields are visible to different membership categories. 
            Toggle visibility for each field and category combination.
          
          </p>
        </div>

        {categoriesLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-300">Loading categories...</span>
          </div>
        ) : (
          <div className="relative">
            {categories.length > 4 && (
              <>
                <div className="absolute top-0 right-0 z-10 bg-gradient-to-l from-white dark:from-gray-800 to-transparent w-8 h-full pointer-events-none"></div>
                <div className="absolute top-0 left-0 z-10 bg-gradient-to-r from-white dark:from-gray-800 to-transparent w-8 h-full pointer-events-none"></div>
              </>
            )}
            <div className={`overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-200 dark:scrollbar-track-gray-700 ${categories.length > 4 ? 'max-w-full' : ''}`}>
              <div className={`${categories.length > 4 ? 'min-w-max' : 'w-full'}`}>
                <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <th className="border border-gray-300 dark:border-gray-600 p-3 text-left font-medium text-gray-900 dark:text-white">
                    Profile Fields
                  </th>
                  {categories.map(category => (
                    <th key={category.id} className="border border-gray-300 dark:border-gray-600 p-3 text-center min-w-[120px]">
                      <div className="flex flex-col items-center space-y-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                          {category.name}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PROFILE_FIELDS.map(field => (
                  <tr key={field.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="border border-gray-300 dark:border-gray-600 p-3">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {field.label}
                      </span>
                    </td>
                    {categories.map(category => (
                      <td
                        key={category.id}
                        className="border border-gray-300 dark:border-gray-600 p-3 text-center min-w-[120px]"
                      >
                        <button
                          onClick={() =>
                            handlePermissionChange(
                              field.value,
                              category.id,
                              !(permissions[field.value]?.[category.id] ?? true)
                            )
                          }
                          className="flex items-center justify-center w-6 h-6 mx-auto rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          {permissions[field.value]?.[category.id] ? (
                            <svg
                              className="w-5 h-5 text-green-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5 text-red-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          )}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSubmitting || isLoading || categoriesLoading}
            className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-gray-900 rounded-md transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
