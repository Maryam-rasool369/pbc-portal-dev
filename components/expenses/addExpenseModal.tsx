"use client";

import { fetchTransactionCategories } from "@/services/expenses";
import useAuthStore from "@/store/authStore";
import { useState, useEffect } from "react";
import { Modal, Button } from "flowbite-react";
import { toast } from "react-toastify";

interface AddExpenseModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
}

export default function AddExpenseModal({
  open,
  onClose,
  onSubmit,
}: AddExpenseModalProps) {
  const token = useAuthStore((state) => state.token);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    notes: "",
    amount: "",
    categoryId: "",
    date: "",
  });
  const [primaryImage, setPrimaryImage] = useState<File | null>(null);
  const [secondaryImage, setSecondaryImage] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchCategories = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await fetchTransactionCategories(token);
        setCategories(data);
        if (data.length > 0) {
          setFormData((prev) => ({ ...prev, categoryId: String(data[0].id) }));
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to fetch expense categories",
        );
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchCategories();
    }
  }, [open, token]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.amount) {
      newErrors.amount = "Amount is required";
    } else if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = "Amount must be a positive number";
    }

    if (!formData.categoryId) {
      newErrors.categoryId = "Category is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const submitData = new FormData();
    submitData.append("title", formData.title);
    submitData.append("notes", formData.notes);
    submitData.append("amount", formData.amount);
    submitData.append("categoryId", formData.categoryId);
    if (formData.date.trim()) {
      submitData.append("date", formData.date);
    }

    if (primaryImage) {
      submitData.append("primaryImage", primaryImage);
    }

    if (secondaryImage) {
      submitData.append("secondaryImage", secondaryImage);
    }

    try {
      setSubmitting(true);
      await onSubmit(submitData);
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setImage: React.Dispatch<React.SetStateAction<File | null>>,
  ) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const maxSize = 10 * 1024 * 1024;

      if (file.size > maxSize) {
        toast.error("Image file is too large. Maximum size is 10MB.");
        return;
      }

      setImage(file);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      notes: "",
      amount: "",
      categoryId: categories.length > 0 ? String(categories[0].id) : "",
      date: "",
    });
    setPrimaryImage(null);
    setSecondaryImage(null);
    setErrors({});
  };

  return (
    <Modal
      show={open}
      onClose={!submitting ? onClose : undefined}
      size="lg"
      dismissible={!submitting}
      popup={false}
      className="!h-auto"
      root={document.body}
    >
      <div className="flex flex-col max-h-[90vh]">
        <Modal.Header className="bg-gray-800 border-b border-gray-700 shrink-0">
          <span className="text-gold-500">Add New Expense</span>
        </Modal.Header>

        <div className="overflow-y-auto flex-grow">
          <Modal.Body className="bg-gray-800 p-6">
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Title*
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className={`w-full bg-gray-700 border ${
                    errors.title ? "border-red-500" : "border-gray-600"
                  } rounded-lg p-2.5 text-white focus:ring-gold-500 focus:border-gold-500`}
                  placeholder="Enter expense title"
                  disabled={submitting}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-gold-500 focus:border-gold-500"
                  placeholder="Enter expense description"
                  rows={3}
                  disabled={submitting}
                />
              </div>

              <div>
                <label
                  htmlFor="amount"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Amount*
                </label>
                <input
                  type="number"
                  id="amount"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className={`w-full bg-gray-700 border ${
                    errors.amount ? "border-red-500" : "border-gray-600"
                  } rounded-lg p-2.5 text-white focus:ring-gold-500 focus:border-gold-500`}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                  disabled={submitting}
                />
                {errors.amount && (
                  <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="category"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Category*
                </label>
                {loading ? (
                  <div className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-gray-400">
                    Loading categories...
                  </div>
                ) : (
                  <>
                    <select
                      id="category"
                      value={formData.categoryId}
                      onChange={(e) =>
                        setFormData({ ...formData, categoryId: e.target.value })
                      }
                      className={`w-full bg-gray-700 border ${
                        errors.categoryId ? "border-red-500" : "border-gray-600"
                      } rounded-lg p-2.5 text-white focus:ring-gold-500 focus:border-gold-500`}
                      disabled={submitting}
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {errors.categoryId && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.categoryId}
                      </p>
                    )}
                  </>
                )}
              </div>

              <div>
                <label
                  htmlFor="date"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Date *
                </label>
                <input
                  type="date"
                  id="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2.5 text-white focus:ring-gold-500 focus:border-gold-500"
                  disabled={submitting}
                />
              </div>

              <div>
                <label
                  htmlFor="primaryImage"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Primary Receipt*
                </label>
                <div className="mt-1 flex items-center">
                  <input
                    type="file"
                    id="primaryImage"
                    onChange={(e) => handleFileChange(e, setPrimaryImage)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white focus:ring-gold-500 focus:border-gold-500"
                    accept="image/*"
                    disabled={submitting}
                  />
                </div>
                {primaryImage && (
                  <p className="text-sm text-gray-400 mt-1">
                    Selected: {primaryImage.name}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="secondaryImage"
                  className="block text-sm font-medium text-gray-300 mb-1"
                >
                  Secondary Receipt (Optional)
                </label>
                <div className="mt-1 flex items-center">
                  <input
                    type="file"
                    id="secondaryImage"
                    onChange={(e) => handleFileChange(e, setSecondaryImage)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-white focus:ring-gold-500 focus:border-gold-500"
                    accept="image/*"
                    disabled={submitting}
                  />
                </div>
                {secondaryImage && (
                  <p className="text-sm text-gray-400 mt-1">
                    Selected: {secondaryImage.name}
                  </p>
                )}
              </div>
            </div>
          </Modal.Body>
        </div>

        <Modal.Footer className="bg-gray-800 border-t border-gray-700 shrink-0">
          <Button
            onClick={handleSubmit}
            className="bg-gold-500 hover:bg-gold-600 text-black"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Expense"}
          </Button>
          <Button color="gray" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
        </Modal.Footer>
      </div>
    </Modal>
  );
}
