import React, { useState, useEffect } from "react";
import { MembershipCategory } from "@/types/membershipPlan";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import { toast } from "react-toastify";

interface CategoryDetailsModalProps {
  category: MembershipCategory | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (categoryId: number, data: any) => Promise<void>;
  token?: string;
}

export default function CategoryDetailsModal({
  category,
  isOpen,
  onClose,
  onEdit,
  token,
}: CategoryDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatedCategory, setUpdatedCategory] = useState<MembershipCategory | null>(null);

  // Reset form state when modal opens or category changes
  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description);
      setIsEditing(false);
      setUpdatedCategory(category);
    }
  }, [category]);

  if (!isOpen || !category) return null;

  const displayCategory = updatedCategory || category;

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form to original values
    if (category) {
      setName(category.name);
      setDescription(category.description);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !description.trim()) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!category || !onEdit) return;

    setIsSubmitting(true);

    try {
      await onEdit(category.id, {
        name,
        description,
      });

      setUpdatedCategory({
        ...displayCategory,
        name,
        description,
        updatedAt: new Date().toISOString(),
      });

      toast.success("Category updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update category");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={isEditing ? undefined : onClose}></div>
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 dark:bg-gray-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {isEditing ? "Edit Category" : "Category Details"}
          </h3>
          <button
            onClick={isEditing ? handleCancel : onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name {isEditing && "*"}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
              ) : (
                <p className="text-sm text-gray-900 dark:text-white">{displayCategory.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description {isEditing && "*"}
              </label>
              {isEditing ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-md bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                ></textarea>
              ) : (
                <p className="text-sm text-gray-900 dark:text-white">{displayCategory.description}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last modified At
              </label>
              <p className="text-sm text-gray-900 dark:text-white">
                {formatDateAndTime(displayCategory.updatedAt, true)}
              </p>
            </div>
          </div>
          
          {/* <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="mr-3 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-gold-500 border border-transparent rounded-md hover:bg-gold-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="inline animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </>
            ) : (
              <>
                {onEdit && (
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="mr-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Edit Category
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </>
            )}
          </div> */}
        </form>
      </div>
    </div>
  );
}