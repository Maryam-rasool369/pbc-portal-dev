"use client";


import Head from "next/head";
import { useState, useEffect, useRef } from "react";
import Loading from "@/components/ui/Loading";
import Image from "next/image";
import useAuthStore from "@/store/authStore";
import Link from "next/link";
import UniversalFormModal from "@/components/modals/UniversalFormModal";
import ProfileVisibilityModal from "@/components/modals/ProfileVisibilityModal";
import UserHeaderCard from "@/components/UserHeaderCard";
import Can from "@/components/rbac/Can";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pagination, Product } from "@/types/marketplace";
import { addService, fetchAllServices } from "@/services/userServices";
import { fetchServiceCategories } from "@/services/serviceCategories";
import { UserProfile } from "@/types/user";
import { addRFQ } from "@/services/rfqs";
import { addServiceRFQ } from "@/services/serviceRfqs";
import { addOrder } from "@/services/orders";
import { fetchCategories, addCategory, updateCategory, deleteCategory } from "@/services/categories";
import {
  addServiceCategory,
  updateServiceCategory,
  deleteServiceCategory,
  addServiceSubCategory,
  deleteServiceSubCategory,
  updateServiceSubCategory,
} from "@/services/serviceCategories";
import { addProduct } from "@/services/products";
import { addProductWanted } from "@/services/productWanted";
import { addServiceWanted } from "@/services/serviceWanted";
import { addDiscount } from "@/services/discounts";
import { useAbility } from "@/hooks/useAbility";
import { fetchAllProducts } from "@/services/products";
import { getAccountStatus } from "@/services/stripe";
import { createStandardAccount } from "@/services/stripe";
import { fetchProfileVisibility, updateProfileVisibility } from "@/services/profileVisibility";
import { DateTime } from "luxon";
import {
  formatDateWithTimezoneForAPI,
  getRelativeTimezoneOffset,
} from "@/utils/formatDateAndTime";
import { COMMON_TIMEZONES } from "@/constants/datetime";
import CurrencyAmount from "@/components/ui/CurrencyAmount";

type ProductVariantFormState = {
  sku: string;
  price: string;
  stockQuantity: string;
  weightKg: string;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  attributes: VariantAttributePair[];
  isDefault: boolean;
};

type VariantAttributePair = {
  key: string;
  value: string;
};

type ProductFormState = {
  name: string;
  brand: string;
  description: string;
  categoryId: string;
  primaryImage: File | null;
  secondaryImage: File | null;
  tertiaryImage: File | null;
  variants: ProductVariantFormState[];
};

const createEmptyVariant = (isDefault: boolean = false): ProductVariantFormState => ({
  sku: "",
  price: "",
  stockQuantity: "",
  weightKg: "",
  lengthCm: "",
  widthCm: "",
  heightCm: "",
  attributes: [{ key: "", value: "" }],
  isDefault,
});

const calculateFees = (price: number) => {
  const pbcFee = price * 0.02;
  const stripeFee = price * 0.049 + 1;
  const totalDeductions = pbcFee + stripeFee;
  const sellerReceives = price - totalDeductions;
  const taxAmount = price * 0.05;

  return {
    pbcFee: Number(pbcFee.toFixed(2)),
    stripeFee: Number(stripeFee.toFixed(2)),
    totalDeductions: Number(totalDeductions.toFixed(2)),
    sellerReceives: Number(sellerReceives.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
  };
};

export default function UserMarketplace() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("Product");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isVisibilityModalOpen, setIsVisibilityModalOpen] = useState(false);
  const [formType, setFormType] = useState<
    "product" | "productwanted" | "discount" | "rfq" | "servicerfq" | "category" | "servicecategory" | "service" | "servicewanted" | null
  >(null);
  const ability = useAbility();
  const [accountStatus, setAccountStatus] = useState<any>(null);
  const [accountStatusError, setAccountStatusError] = useState<string | null>(null);
  const [showStripeModal, setShowStripeModal] = useState<boolean>(false);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<{ id: number; name: string; description: string } | null>(null);
  const [isCategoryEditModalOpen, setIsCategoryEditModalOpen] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<number | null>(null);
  const [categoryEditFormState, setCategoryEditFormState] = useState({ name: "", description: "" });
  const [categorySearch, setCategorySearch] = useState("");
  const [debouncedCategorySearch, setDebouncedCategorySearch] = useState("");

  // Service Category state
  const [serviceCategorySearch, setServiceCategorySearch] = useState("");
  const [debouncedServiceCategorySearch, setDebouncedServiceCategorySearch] = useState("");
  const [editingServiceCategory, setEditingServiceCategory] = useState<{
    id: number;
    name: string;
    description: string;
    subCategories: { id: number; name: string }[];
  } | null>(null);
  const [isServiceCategoryEditModalOpen, setIsServiceCategoryEditModalOpen] = useState(false);
  const [deletingServiceCategoryId, setDeletingServiceCategoryId] = useState<number | null>(null);
  const [serviceCategoryEditForm, setServiceCategoryEditForm] = useState({ name: "", description: "" });
  const [editSubCatAdditions, setEditSubCatAdditions] = useState<string[]>([]);
  const [newServiceSubCatNames, setNewServiceSubCatNames] = useState<string[]>([""]);
  const [profileVisibilityData, setProfileVisibilityData] = useState<any[]>([]);
  const [isLoadingVisibility, setIsLoadingVisibility] = useState<boolean>(false);

  const [awardedRfqPage, setAwardedRfqPage] = useState(1);
  const [awardedRfqPagination, setAwardedRfqPagination] = useState<Pagination | null>(null);
  const [awardedServiceRfqPage, setAwardedServiceRfqPage] = useState(1);
  const [awardedServiceRfqPagination, setAwardedServiceRfqPagination] = useState<Pagination | null>(null);

  // Service form state
  const [serviceCategories, setServiceCategories] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [serviceFormState, setServiceFormState] = useState({
    name: "",
    brand: "",
    description: "",
    serviceCategoryId: "",
    subCategoryId: "",
    primaryImage: null as File | null,
  });

  // Service Wanted form state
  const [serviceWantedFormState, setServiceWantedFormState] = useState({
    name: "",
    description: "",
    serviceCategoryId: "",
    subCategoryId: "",
    image: null as File | null,
  });

  const token = useAuthStore((state) => state.token);


  const userTimezone = DateTime.local().zoneName;

  const getTodayDateTimeString = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [formStates, setFormStates] = useState({
    category: {
      name: "",
      description: "",
    },
    rfq: {
      title: "",
      description: "",
      quantity: 0,
      budget: 0,
      deadline: "",
      categoryName: "",
      primaryImage: null,
      secondaryImage: null,
      productId: "", // Add this line
    },
    servicerfq: {
      title: "",
      description: "",
      budget: 0,
      deadline: "",
      serviceCategoryId: "",
      subCategoryId: "",
      serviceId: "",
      primaryImage: null,
      secondaryImage: null,
    },
    product: {
      name: "",
      brand: "",
      description: "",
      categoryId: "",
      primaryImage: null,
      secondaryImage: null,
      tertiaryImage: null,
      variants: [createEmptyVariant(true)],
    },
    discount: {
      title: "",
      description: "",
      value: "",
      discountCode: "",
      startDate: "",
      validUntil: "",
      timezone: userTimezone,
      isFeatured: false,
    },
    productwanted: {
      name: "",
      description: "",
      quantity: "",
      categoryId: "",
      primaryImage: null,
      secondaryImage: null,
    },
  });

  const defaultVariantForFees =
    formStates.product.variants.find((variant) => variant.isDefault) ||
    formStates.product.variants[0];
  const defaultVariantPrice = Number(defaultVariantForFees?.price) || 0;
  const fees = calculateFees(defaultVariantPrice);



  useEffect(() => {
    if (!token) return;

    const fetchAccountStatus = async () => {
      try {
        const data = await getAccountStatus(token);

        setAccountStatus(data);
        setAccountStatusError(null);
      } catch (err: any) {
        console.error("Error fetching account status:", err);
        setAccountStatusError(err.message);
        setAccountStatus(null);
      }
    };

    fetchAccountStatus();
  }, [token]);



  const handleInputChange = (formType, e) => {
    const { id, value } = e.target;
    setFormStates((prev) => ({
      ...prev,
      [formType]: { ...prev[formType], [id]: value },
    }));
  };

  const handleProductVariantInputChange = (
    index: number,
    field: keyof ProductVariantFormState,
    value: string | boolean | VariantAttributePair[],
  ) => {
    setFormStates((prev) => {
      const updatedVariants = [...prev.product.variants];
      updatedVariants[index] = {
        ...updatedVariants[index],
        [field]: value,
      };

      return {
        ...prev,
        product: {
          ...prev.product,
          variants: updatedVariants,
        },
      };
    });
  };

  const setDefaultVariant = (index: number) => {
    setFormStates((prev) => ({
      ...prev,
      product: {
        ...prev.product,
        variants: prev.product.variants.map((variant, variantIndex) => ({
          ...variant,
          isDefault: variantIndex === index,
        })),
      },
    }));
  };

  const addVariantRow = () => {
    setFormStates((prev) => ({
      ...prev,
      product: {
        ...prev.product,
        variants: [...prev.product.variants, createEmptyVariant(false)],
      },
    }));
  };

  const removeVariantRow = (index: number) => {
    setFormStates((prev) => {
      if (prev.product.variants.length === 1) {
        return prev;
      }

      const filteredVariants = prev.product.variants.filter(
        (_, variantIndex) => variantIndex !== index,
      );

      if (!filteredVariants.some((variant) => variant.isDefault)) {
        filteredVariants[0] = {
          ...filteredVariants[0],
          isDefault: true,
        };
      }

      return {
        ...prev,
        product: {
          ...prev.product,
          variants: filteredVariants,
        },
      };
    });
  };

  const handleVariantAttributeChange = (
    variantIndex: number,
    attributeIndex: number,
    field: keyof VariantAttributePair,
    value: string,
  ) => {
    setFormStates((prev) => {
      const updatedVariants = [...prev.product.variants];
      const updatedAttributes = [...updatedVariants[variantIndex].attributes];
      updatedAttributes[attributeIndex] = {
        ...updatedAttributes[attributeIndex],
        [field]: value,
      };

      updatedVariants[variantIndex] = {
        ...updatedVariants[variantIndex],
        attributes: updatedAttributes,
      };

      return {
        ...prev,
        product: {
          ...prev.product,
          variants: updatedVariants,
        },
      };
    });
  };

  const addVariantAttributeRow = (variantIndex: number) => {
    setFormStates((prev) => {
      const updatedVariants = [...prev.product.variants];
      updatedVariants[variantIndex] = {
        ...updatedVariants[variantIndex],
        attributes: [
          ...updatedVariants[variantIndex].attributes,
          { key: "", value: "" },
        ],
      };

      return {
        ...prev,
        product: {
          ...prev.product,
          variants: updatedVariants,
        },
      };
    });
  };

  const removeVariantAttributeRow = (
    variantIndex: number,
    attributeIndex: number,
  ) => {
    setFormStates((prev) => {
      const updatedVariants = [...prev.product.variants];
      const filteredAttributes = updatedVariants[variantIndex].attributes.filter(
        (_, idx) => idx !== attributeIndex,
      );

      updatedVariants[variantIndex] = {
        ...updatedVariants[variantIndex],
        attributes:
          filteredAttributes.length > 0
            ? filteredAttributes
            : [{ key: "", value: "" }],
      };

      return {
        ...prev,
        product: {
          ...prev.product,
          variants: updatedVariants,
        },
      };
    });
  };

  const validateDiscountDates = () => {
    const { startDate, validUntil } = formStates.discount;

    if (!startDate || !validUntil) {
      toast.error("Please fill all required date fields");
      return false;
    }

    try {
      const startDateTime = DateTime.fromISO(startDate);
      const endDateTime = DateTime.fromISO(validUntil);
      const now = DateTime.local();

      if (startDateTime < now) {
        toast.error("Start date cannot be in the past");
        return false;
      }

      if (endDateTime <= startDateTime) {
        toast.error("Valid until date must be after start date");
        return false;
      }
    } catch (error) {
      toast.error("Invalid date format");
      return false;
    }

    return true;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, formType: string, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormStates((prev) => ({
        ...prev,
        [formType]: { ...prev[formType], [field]: file },
      }));
    }
  };

  const handleProfileVisibilitySave = async (fieldVisibilityData: any[]) => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    try {
      await updateProfileVisibility(token, fieldVisibilityData);
      // Refresh profile visibility data
      await loadProfileVisibilityData();
    } catch (error: any) {
      throw error;
    }
  };

  const loadProfileVisibilityData = async () => {
    if (!token) return;

    try {
      setIsLoadingVisibility(true);
      const visibilityData = await fetchProfileVisibility(token);
      setProfileVisibilityData(visibilityData);
    } catch (error) {
      console.error("Error loading profile visibility data:", error);
      toast.error("Failed to load profile visibility data");
    } finally {
      setIsLoadingVisibility(false);
    }
  };

  const submitHandlers = {
    category: async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        await addCategory(token!, formStates.category);
        toast.success("Category added successfully");
        setIsAddModalOpen(false);
        setFormStates((prev) => ({ ...prev, category: { name: "", description: "" } }));
        await queryClient.invalidateQueries({ queryKey: ["tabData", "Category"] });
      } catch (err) {
        toast.error((err as any).message);
      } finally {
        setIsSubmitting(false);
      }
    },
    rfq: async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        const form = new FormData();
        const data = formStates.rfq;
        const selectedDate = new Date(data.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate <= today)
          throw new Error("Deadline must be a future date.");

        Object.entries(data).forEach(([k, v]) => {
          if (v) {
            if (k === "productId" && v === "") return;
            form.append(k, v);
          }
        });

        await addRFQ(token, form);
        toast.success("RFQ created successfully");
        setIsAddModalOpen(false);
        await queryClient.invalidateQueries({ queryKey: ["tabData", "RFQ"] });
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsSubmitting(false);
      }
    },
    servicerfq: async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        const form = new FormData();
        const data = formStates.servicerfq;
        const selectedDate = new Date(data.deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate <= today)
          throw new Error("Deadline must be a future date.");

        Object.entries(data).forEach(([k, v]) => {
          if (v) form.append(k, v);
        });

        await addServiceRFQ(token, form);
        toast.success("Service RFQ created successfully");
        setIsAddModalOpen(false);
        await queryClient.invalidateQueries({ queryKey: ["tabData", "ServiceRFQ"] });
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsSubmitting(false);
      }
    },
    product: async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        const data = formStates.product;

        if (!data.primaryImage) {
          throw new Error("Primary product picture is required.");
        }

        if (!data.brand.trim()) {
          throw new Error("Brand is required.");
        }

        if (data.variants.length === 0) {
          throw new Error("At least one product variant is required.");
        }

        const defaultCount = data.variants.filter((variant) => variant.isDefault)
          .length;
        if (defaultCount !== 1) {
          throw new Error("Exactly one variant must be set as default.");
        }

        const normalizedVariants = data.variants.map((variant, index) => {
          const price = Number(variant.price);
          const stockQuantity = Number(variant.stockQuantity);

          if (!Number.isFinite(price) || price <= 0) {
            throw new Error(
              `Variant ${index + 1}: price must be greater than 0.`,
            );
          }

          if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
            throw new Error(
              `Variant ${index + 1}: stock quantity must be a non-negative integer.`,
            );
          }

          const parsedAttributes: Record<string, string> = {};
          for (const attribute of variant.attributes) {
            const key = attribute.key.trim();
            const value = attribute.value.trim();

            if (!key && !value) {
              continue;
            }

            if (!key || !value) {
              throw new Error(
                `Variant ${index + 1}: attribute key and value are both required.`,
              );
            }

            if (Object.prototype.hasOwnProperty.call(parsedAttributes, key)) {
              throw new Error(
                `Variant ${index + 1}: duplicate attribute key '${key}' is not allowed.`,
              );
            }

            parsedAttributes[key] = value;
          }

          return {
            sku: variant.sku.trim() || undefined,
            price,
            stockQuantity,
            weightKg: variant.weightKg ? Number(variant.weightKg) : undefined,
            lengthCm: variant.lengthCm ? Number(variant.lengthCm) : undefined,
            widthCm: variant.widthCm ? Number(variant.widthCm) : undefined,
            heightCm: variant.heightCm ? Number(variant.heightCm) : undefined,
            attributes: parsedAttributes,
            isDefault: variant.isDefault,
          };
        });

        await addProduct(token, {
          name: data.name,
          brand: data.brand,
          description: data.description,
          categoryId: Number(data.categoryId),
          primaryImage: data.primaryImage,
          secondaryImage: data.secondaryImage,
          tertiaryImage: data.tertiaryImage,
          variants: normalizedVariants,
        });

        toast.success("Product added successfully");
        setIsAddModalOpen(false);
        await queryClient.invalidateQueries({
          queryKey: ["tabData", "Product"],
        });
        setFormStates((prev) => ({
          ...prev,
          product: {
            name: "",
            brand: "",
            description: "",
            categoryId: "",
            primaryImage: null,
            secondaryImage: null,
            tertiaryImage: null,
            variants: [createEmptyVariant(true)],
          },
        }));
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsSubmitting(false);
      }
    },
    productwanted: async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        const data = formStates.productwanted;

        if (!data.name.trim()) {
          throw new Error("Product name is required.");
        }

        if (!data.categoryId) {
          throw new Error("Category is required.");
        }

        const quantity = Number(data.quantity);
        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new Error("Quantity must be a positive whole number.");
        }

        await addProductWanted(token, {
          name: data.name,
          description: data.description,
          quantity,
          categoryId: Number(data.categoryId),
          primaryImage: data.primaryImage,
          secondaryImage: data.secondaryImage,
        });

        toast.success("Product wanted added successfully");
        setIsAddModalOpen(false);
        await queryClient.invalidateQueries({
          queryKey: ["tabData", "ProductWanted"],
        });
        setFormStates((prev) => ({
          ...prev,
          productwanted: {
            name: "",
            description: "",
            quantity: "",
            categoryId: "",
            primaryImage: null,
            secondaryImage: null,
          },
        }));
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsSubmitting(false);
      }
    },
    discount: async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
        const data = formStates.discount;
        const code = data.discountCode?.trim() || "";

        if (/^\d+$/.test(code)) {
          throw new Error("Discount code cannot be only numbers.");
        }

        if (!validateDiscountDates()) {
          return;
        }

        const { timezone, ...dataWithoutTimezone } = data;
        const formattedData = {
          ...dataWithoutTimezone,
          value: parseInt(data.value),
          startDate: formatDateWithTimezoneForAPI(
            data.startDate,
            data.timezone
          ),
          validUntil: formatDateWithTimezoneForAPI(
            data.validUntil,
            data.timezone
          ),
        };

        await addDiscount(token, formattedData);

        toast.success("Discount added successfully");
        setIsAddModalOpen(false);
        await queryClient.invalidateQueries({
          queryKey: ["tabData", "Discount"],
        });
        setFormStates((prev) => ({
          ...prev,
          discount: {
            title: "",
            description: "",
            value: "",
            discountCode: "",
            startDate: "",
            validUntil: "",
            timezone: userTimezone,
            isFeatured: false,
          },
        }));
      } catch (err) {
        toast.error(err.message);
      } finally {
        setIsSubmitting(false);
      }
    },
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceFormState.serviceCategoryId) {
      toast.error("Please select a category");
      return;
    }
    if (!serviceFormState.subCategoryId) {
      toast.error("Please select a sub category");
      return;
    }
    setIsSubmitting(true);
    try {
      await addService(token!, {
        name: serviceFormState.name,
        brand: serviceFormState.brand,
        description: serviceFormState.description,
        serviceCategoryId: Number(serviceFormState.serviceCategoryId),
        subCategoryId: serviceFormState.subCategoryId
          ? Number(serviceFormState.subCategoryId)
          : undefined,
        primaryImage: serviceFormState.primaryImage,
      });
      toast.success("Service added successfully");
      setIsAddModalOpen(false);
      setServiceFormState({
        name: "",
        brand: "",
        description: "",
        serviceCategoryId: "",
        subCategoryId: "",
        primaryImage: null,
      });
      await queryClient.invalidateQueries({ queryKey: ["tabData", "Service"] });
    } catch (err) {
      toast.error((err as any).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedServiceCategory = serviceCategories.find(
    (c) => String(c.id) === serviceFormState.serviceCategoryId,
  );

  const handleServiceWantedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceWantedFormState.serviceCategoryId) {
      toast.error("Please select a category");
      return;
    }
    if (!serviceWantedFormState.subCategoryId) {
      toast.error("Please select a sub category");
      return;
    }
    setIsSubmitting(true);
    try {
      await addServiceWanted(token!, {
        name: serviceWantedFormState.name,
        description: serviceWantedFormState.description,
        serviceCategoryId: Number(serviceWantedFormState.serviceCategoryId),
        subCategoryId: Number(serviceWantedFormState.subCategoryId),
        image: serviceWantedFormState.image,
      });
      toast.success("Service I Want listing added successfully");
      setIsAddModalOpen(false);
      setServiceWantedFormState({
        name: "",
        description: "",
        serviceCategoryId: "",
        subCategoryId: "",
        image: null,
      });
      await queryClient.invalidateQueries({ queryKey: ["tabData", "ServiceWanted"] });
    } catch (err) {
      toast.error((err as any).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedServiceWantedCategory = serviceCategories.find(
    (c) => String(c.id) === serviceWantedFormState.serviceCategoryId,
  );

  const modalConfig = {
    category: {
      title: "Add Category",
      onSubmit: submitHandlers.category,
      fields: [
        {
          id: "name",
          label: "Name",
          type: "text",
          value: formStates.category.name,
          onChange: (e) => handleInputChange("category", e),
        },
        {
          id: "description",
          label: "Description",
          type: "textarea",
          value: formStates.category.description,
          onChange: (e) => handleInputChange("category", e),
        },
      ],
    },
    rfq: {
      title: "Create New RFQ",
      onSubmit: submitHandlers.rfq,
      fields: [
        {
          id: "title",
          label: "Title",
          type: "text",
          value: formStates.rfq.title,
          onChange: (e) => handleInputChange("rfq", e),
        },
        {
          id: "description",
          label: "Description",
          type: "textarea",
          value: formStates.rfq.description,
          onChange: (e) => handleInputChange("rfq", e),
        },
        {
          id: "quantity",
          label: "Quantity",
          type: "number",
          value: formStates.rfq.quantity,
          onChange: (e) => handleInputChange("rfq", e),
        },
        {
          id: "budget",
          label: "Budget",
          type: "number",
          value: formStates.rfq.budget,
          onChange: (e) => handleInputChange("rfq", e),
        },
        {
          id: "deadline",
          label: "Deadline",
          type: "date",
          min: new Date().toISOString().split("T")[0],
          value: formStates.rfq.deadline,
          onChange: (e) => handleInputChange("rfq", e),
        },
        {
          id: "categoryName",
          label: "Category",
          type: "select",
          value: formStates.rfq.categoryName,
          onChange: (e) => handleInputChange("rfq", e),
          options: categories.map((cat) => ({
            value: cat.name,
            label: cat.name,
          })),
        },
        {
          id: "productId",
          label: "Related Product (Optional)",
          type: "select",
          value: formStates.rfq.productId,
          onChange: (e) => handleInputChange("rfq", e),
          options: products
            .filter((p) => p.userId !== user?.id)
            .map((product) => ({
              value: product.id,
              label: product.name,
            })),
        },
        {
          id: "primaryImage",
          label: "Primary Image",
          type: "file",
          onChange: (e) => handleImageChange(e, "rfq", "primaryImage"),
        },
        {
          id: "secondaryImage",
          label: "Secondary Image",
          type: "file",
          onChange: (e) => handleImageChange(e, "rfq", "secondaryImage"),
        },
      ],
    },
    servicerfq: {
      title: "Create New Service RFQ",
      onSubmit: submitHandlers.servicerfq,
      fields: [
        {
          id: "title",
          label: "Title",
          type: "text",
          value: formStates.servicerfq.title,
          onChange: (e) => handleInputChange("servicerfq", e),
        },
        {
          id: "description",
          label: "Description",
          type: "textarea",
          value: formStates.servicerfq.description,
          onChange: (e) => handleInputChange("servicerfq", e),
        },
        {
          id: "budget",
          label: "Budget",
          type: "number",
          value: formStates.servicerfq.budget,
          onChange: (e) => handleInputChange("servicerfq", e),
        },
        {
          id: "deadline",
          label: "Deadline",
          type: "date",
          min: new Date().toISOString().split("T")[0],
          value: formStates.servicerfq.deadline,
          onChange: (e) => handleInputChange("servicerfq", e),
        },
        {
          id: "serviceCategoryId",
          label: "Service Category",
          type: "select",
          value: formStates.servicerfq.serviceCategoryId,
          onChange: (e) => {
            handleInputChange("servicerfq", e);
            setFormStates((prev) => ({
              ...prev,
              servicerfq: { ...prev.servicerfq, subCategoryId: "" },
            }));
          },
          options: serviceCategories.map((cat) => ({
            value: cat.id,
            label: cat.name,
          })),
        },
        {
          id: "subCategoryId",
          label: "Sub Category",
          type: "select",
          value: formStates.servicerfq.subCategoryId,
          onChange: (e) => handleInputChange("servicerfq", e),
          options: (
            serviceCategories.find(
              (cat) => cat.id === Number(formStates.servicerfq.serviceCategoryId)
            )?.subCategories || []
          ).map((sub) => ({ value: sub.id, label: sub.name })),
        },
        {
          id: "serviceId",
          label: "Related Service (Optional)",
          type: "select",
          value: formStates.servicerfq.serviceId,
          onChange: (e) => handleInputChange("servicerfq", e),
          options: allServices
            .filter((s) => s.userId !== user?.id)
            .map((s) => ({ value: s.id, label: s.name })),
        },
        {
          id: "primaryImage",
          label: "Primary Image",
          type: "file",
          onChange: (e) => handleImageChange(e, "servicerfq", "primaryImage"),
        },
        {
          id: "secondaryImage",
          label: "Secondary Image",
          type: "file",
          onChange: (e) => handleImageChange(e, "servicerfq", "secondaryImage"),
        },
      ],
    },
    product: {
      title: "Add Product",
      onSubmit: submitHandlers.product,
      fields: [
        {
          id: "name",
          label: "Product Name",
          type: "text",
          value: formStates.product.name,
          onChange: (e) => handleInputChange("product", e),
        },
        {
          id: "brand",
          label: "Brand",
          type: "text",
          value: formStates.product.brand,
          onChange: (e) => handleInputChange("product", e),
        },
        {
          id: "description",
          label: "Description",
          type: "textarea",
          value: formStates.product.description,
          onChange: (e) => handleInputChange("product", e),
        },
        {
          id: "categoryId",
          label: "Category",
          type: "select",
          value: formStates.product.categoryId,
          onChange: (e) => handleInputChange("product", e),
          options: categories.map((cat) => ({
            value: cat.id,
            label: cat.name,
          })),
        },
        {
          id: "primaryImage",
          label: "Primary Image",
          type: "file",
          onChange: (e) => handleImageChange(e, "product", "primaryImage"),
        },
        {
          id: "secondaryImage",
          label: "Secondary Image",
          type: "file",
          onChange: (e) => handleImageChange(e, "product", "secondaryImage"),
        },
        {
          id: "tertiaryImage",
          label: "Tertiary Image",
          type: "file",
          onChange: (e) => handleImageChange(e, "product", "tertiaryImage"),
        },
      ],
    },
    discount: {
      title: "Create Discount",
      onSubmit: submitHandlers.discount,
      fields: [
        {
          id: "title",
          label: "Title",
          type: "text",
          value: formStates.discount.title,
          onChange: (e) => handleInputChange("discount", e),
        },
        {
          id: "description",
          label: "Description",
          type: "textarea",
          value: formStates.discount.description,
          onChange: (e) => handleInputChange("discount", e),
        },
        {
          id: "value",
          label: "Value (%)",
          type: "number",
          value: formStates.discount.value,
          onChange: (e) => handleInputChange("discount", e),
        },
        {
          id: "discountCode",
          label: "Code",
          type: "text",
          value: formStates.discount.discountCode,
          onChange: (e) => handleInputChange("discount", e),
        },
        {
          id: "timezone",
          label: "Timezone",
          type: "select",
          value: formStates.discount.timezone,
          onChange: (e) => handleInputChange("discount", e),
          options: COMMON_TIMEZONES.map((tz) => ({
            value: tz,
            label: tz === userTimezone
              ? `${tz.replace(/_/g, " ")} (Local time)`
              : `${tz.replace(/_/g, " ")} (${getRelativeTimezoneOffset(tz, userTimezone)})`,
          })),
        },
        {
          id: "startDate",
          label: "Start Date & Time",
          type: "datetime-local",
          min: getTodayDateTimeString(),
          value: formStates.discount.startDate,
          onChange: (e) => handleInputChange("discount", e),
          helperText: `Discount starts (${formStates.discount.timezone})`,
        },
        {
          id: "validUntil",
          label: "Valid Until Date & Time",
          type: "datetime-local",
          min: formStates.discount.startDate || getTodayDateTimeString(),
          value: formStates.discount.validUntil,
          onChange: (e) => handleInputChange("discount", e),
          helperText: `Discount expires (${formStates.discount.timezone})`,
        },
      ],
    },
    productwanted: {
      title: "Add Product I Want",
      onSubmit: submitHandlers.productwanted,
      fields: [
        {
          id: "name",
          label: "Product Name",
          type: "text",
          value: formStates.productwanted.name,
          onChange: (e) => handleInputChange("productwanted", e),
        },
        {
          id: "description",
          label: "Description",
          type: "textarea",
          value: formStates.productwanted.description,
          onChange: (e) => handleInputChange("productwanted", e),
        },
        {
          id: "categoryId",
          label: "Category",
          type: "select",
          value: formStates.productwanted.categoryId,
          onChange: (e) => handleInputChange("productwanted", e),
          options: categories.map((cat) => ({
            value: cat.id,
            label: cat.name,
          })),
        },
        {
          id: "quantity",
          label: "Quantity",
          type: "number",
          value: formStates.productwanted.quantity,
          onChange: (e) => handleInputChange("productwanted", e),
        },
        {
          id: "primaryImage",
          label: "Primary Image (Optional)",
          type: "file",
          onChange: (e) => handleImageChange(e, "productwanted", "primaryImage"),
        },
        {
          id: "secondaryImage",
          label: "Secondary Image (Optional)",
          type: "file",
          onChange: (e) => handleImageChange(e, "productwanted", "secondaryImage"),
        },
      ],
    },
  };

  const limit: number = 8;

  const router = useRouter();
  const { id } = router.query;

  const fetchUserProfile = async () => {
    if (token === null || token === "undefined") {
      toast.error("User ID not provided or not authenticated");
      router.push("/");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            token: token,
          },
        }
      );

      const userData = await response.json();
      if (userData.error) {
        toast.error(userData.error[0]?.msg || "Error fetching user profile");
        if (userData.error[0]?.path === "token") {
          router.push("/");
        }
      } else {
        const membership = userData.data.membership;
        const membershipData = membership ? {
          membershipId: membership.membershipId || undefined,
          decision_at: membership.decision_at || undefined,
          lastBillingDate: membership.lastBillingDate || undefined,
          nextBillingDate: membership.nextBillingDate || undefined,
          membershipCategory: membership.membershipCategoryRef ? {
            id: membership.membershipCategoryRef.id,
            name: membership.membershipCategoryRef.name,
          } : undefined,
          membershipSubCategory: membership.membershipSubCategoryRef ? {
            id: membership.membershipSubCategoryRef.id,
            name: membership.membershipSubCategoryRef.name,
          } : undefined,
          businessGroups: membership.businessGroup && Array.isArray(membership.businessGroup)
            ? membership.businessGroup.map((bg: any) => ({
              id: bg.id,
              name: bg.name,
            }))
            : undefined,
          tradeLicenseExpiry: membership.tradeLicenseExpiry || undefined,
          passportExpiryDate: membership.passportExpiryDate || undefined,
          emiratesIdExpiryDate: membership.emiratesIdExpiryDate || undefined,
        } : undefined;

        setUser({
          id: userData.data.id,
          name: userData.data.name,
          email: userData.data.email,
          role: userData.data.Role.name,
          company: userData.data.company || "Not specified",
          location: userData.data.location || "Not specified",
          phoneNumber: userData.data.phoneNumber || "Not specified",
          joinDate: formatDateAndTime(userData.data.createdAt),
          profilePicture: userData.data.profile.profilePicture,
          isActive: userData.data.isActive,
          isContactsVerfied: userData?.data?.isContactsVerfied || false,
          isDocumentReviewPending: userData?.data?.isDocumentReviewPending || false,
          profile: {
            country: userData.data.profile.country || null,
            bio: userData.data.profile.bio || undefined,
            facebookSocial: userData.data.profile.facebookSocial || undefined,
            linkedInSocial: userData.data.profile.linkedInSocial || undefined,
            calendlyLink: userData.data.profile.calendlyLink || undefined,
            tradeLicense: userData.data.profile.tradeLicense || undefined,
            tradeLicenseSecondary:
              userData.data.profile.tradeLicenseSecondary || undefined,
            passport: userData.data.profile.passport || undefined,
            passportSecondary:
              userData.data.profile.passportSecondary || undefined,
            emiratesId: userData.data.profile.emiratesId || undefined,
            emiratesIdSecondary:
              userData.data.profile.emiratesIdSecondary || undefined,
          },
          membership: membershipData,
        });
      }
    } catch (error) {
      toast.error("Error fetching user profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUserProfile();
      loadProfileVisibilityData();
    }
  }, [id, token]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCategorySearch(categorySearch), 400);
    return () => clearTimeout(timer);
  }, [categorySearch]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedServiceCategorySearch(serviceCategorySearch), 400);
    return () => clearTimeout(timer);
  }, [serviceCategorySearch]);

  useEffect(() => {
    if (activeTab === "Category") setCurrentPage(1);
    if (activeTab === "ServiceCategory") setCurrentPage(1);
  }, [debouncedCategorySearch, debouncedServiceCategorySearch, activeTab]);

  const {
    data: tabItems = [],
    isLoading: tabLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      "tabData",
      activeTab,
      currentPage,
      activeTab === "Category"
        ? debouncedCategorySearch
        : activeTab === "ServiceCategory"
          ? debouncedServiceCategorySearch
          : "",
    ],
    queryFn: async () => {
      if (!token) throw new Error("Token missing");

      let url: string;
      if (activeTab === "Category") {
        const params = new URLSearchParams({ page: String(currentPage), limit: String(limit) });
        if (debouncedCategorySearch) params.set("search", debouncedCategorySearch);
        url = `${process.env.NEXT_PUBLIC_API_URL}/api/category?${params.toString()}`;
      } else if (activeTab === "ServiceCategory") {
        const params = new URLSearchParams({ page: String(currentPage), limit: String(limit) });
        if (debouncedServiceCategorySearch) params.set("search", debouncedServiceCategorySearch);
        url = `${process.env.NEXT_PUBLIC_API_URL}/api/service-category?${params.toString()}`;
      } else if (activeTab === "Service") {
        url = `${process.env.NEXT_PUBLIC_API_URL}/api/service/my/services?page=${currentPage}&limit=${limit}`;
      } else if (activeTab === "ServiceRFQ") {
        url = `${process.env.NEXT_PUBLIC_API_URL}/api/service-rfq/my/service-rfqs?page=${currentPage}&limit=${limit}`;
      } else if (activeTab === "ProductWanted") {
        url = `${process.env.NEXT_PUBLIC_API_URL}/api/product-wanted/my/products-wanted?page=${currentPage}&limit=${limit}`;
      } else if (activeTab === "ServiceWanted") {
        url = `${process.env.NEXT_PUBLIC_API_URL}/api/service-wanted/my/services-wanted?page=${currentPage}&limit=${limit}`;
      } else {
        url = `${process.env.NEXT_PUBLIC_API_URL}/api/${activeTab.toLowerCase()}/my/${activeTab.toLowerCase()}s?page=${currentPage}&limit=${limit}`;
      }

      const res = await fetch(url, {
        headers: { "Content-Type": "application/json", token },
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error?.[0]?.msg || "Fetch failed");

      setPagination(data.pagination);
      return data.data.map((item: any) => ({
        ...item,
        ...(activeTab !== "ServiceWanted" && {
          image: item.image || "/placeholder.svg?height=100&width=100",
        }),
        date: formatDateAndTime(item.createdAt || item.date),
      }));
    },
    enabled: !!token && !loading,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: awardedRfqs = [],
    isLoading: awardedRfqLoading,
  } = useQuery({
    queryKey: ["awardedRfqs", awardedRfqPage],
    queryFn: async () => {
      if (!token) throw new Error("Token missing");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/rfq/my/awarded-quote?page=${awardedRfqPage}&limit=${limit}`,
        { headers: { "Content-Type": "application/json", token } },
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error?.[0]?.msg || "Fetch failed");
      setAwardedRfqPagination(data.pagination);
      return data.data || [];
    },
    enabled: !!token && !loading && activeTab === "RFQ",
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: awardedServiceRfqs = [],
    isLoading: awardedServiceRfqLoading,
  } = useQuery({
    queryKey: ["awardedServiceRfqs", awardedServiceRfqPage],
    queryFn: async () => {
      if (!token) throw new Error("Token missing");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/service-rfq/my/awarded-quote?page=${awardedServiceRfqPage}&limit=${limit}`,
        { headers: { "Content-Type": "application/json", token } },
      );
      const data = await res.json();
      if (data.error) throw new Error(data.error?.[0]?.msg || "Fetch failed");
      setAwardedServiceRfqPagination(data.pagination);
      return data.data || [];
    },
    enabled: !!token && !loading && activeTab === "ServiceRFQ",
    staleTime: 5 * 60 * 1000,
  });

  const handlePageChange = (page: number) => {
    if (pagination && page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
    }
  };

  const renderTabContent = () => {
    const items = tabItems;

    if (tabLoading) {
      return (
        <div className="flex justify-center items-center h-40">
          <Loading />
        </div>
      );
    }

    if (activeTab === "ServiceCategory") {
      return (
        <>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="text"
              placeholder="Search service categories..."
              value={serviceCategorySearch}
              onChange={(e) => setServiceCategorySearch(e.target.value)}
              className="w-full max-w-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            {serviceCategorySearch && (
              <button
                onClick={() => {
                  setServiceCategorySearch("");
                  setDebouncedServiceCategorySearch("");
                  setCurrentPage(1);
                  queryClient.invalidateQueries({ queryKey: ["tabData", "ServiceCategory"] });
                }}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <div className="mt-3 overflow-x-auto rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sub-categories</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {!items || items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      {serviceCategorySearch ? `No results for "${serviceCategorySearch}"` : "No service categories found"}
                    </td>
                  </tr>
                ) : items.map((item: any) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => router.push(`/userMarketplace/service-category/${item.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex flex-wrap gap-1">
                        {(item.subCategories || []).map((sub: any) => (
                          <span key={sub.id} className="inline-block px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded-full text-xs">
                            {sub.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{item.description}</td>
                    <td
                      className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Can I="update" a="ServiceCategory">
                        <button
                          onClick={() => {
                            setEditingServiceCategory({
                              id: item.id,
                              name: item.name,
                              description: item.description,
                              subCategories: item.subCategories || [],
                            });
                            setServiceCategoryEditForm({ name: item.name, description: item.description });
                            setEditSubCatAdditions([]);
                            setIsServiceCategoryEditModalOpen(true);
                          }}
                          className="px-3 py-1 bg-gold-500 hover:bg-gold-600 text-gray-900 rounded-md transition-colors text-xs"
                        >
                          Edit
                        </button>
                      </Can>
                      <Can I="delete" a="ServiceCategory">
                        <button
                          onClick={() => setDeletingServiceCategoryId(item.id)}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors text-xs"
                        >
                          Delete
                        </button>
                      </Can>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex flex-wrap justify-center items-center gap-2 overflow-x-auto max-w-full px-2">
                <button
                  className={`px-4 py-2 rounded-lg text-white ${currentPage === 1 ? "bg-gray-400 cursor-not-allowed" : "bg-gold-500 hover:bg-gold-600"}`}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || tabLoading}
                >
                  Prev
                </button>
                {(() => {
                  const pages: (number | string)[] = [];
                  const totalPages = pagination.totalPages;
                  const maxVisiblePages = 3;
                  if (totalPages <= maxVisiblePages + 2) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else if (currentPage <= maxVisiblePages) {
                    pages.push(1, 2, 3, "...", totalPages);
                  } else if (currentPage >= totalPages - maxVisiblePages + 1) {
                    pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
                  } else {
                    pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
                  }
                  return pages.map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === "number" && handlePageChange(page)}
                      disabled={page === "..." || tabLoading}
                      className={`px-3 py-1 rounded-md ${currentPage === page ? "bg-gold-500 text-white" : "bg-gray-200 text-black hover:bg-gray-300"}`}
                    >
                      {page}
                    </button>
                  ));
                })()}
                <button
                  className={`px-4 py-2 rounded-lg text-white ${currentPage === pagination.totalPages ? "bg-gray-400 cursor-not-allowed" : "bg-gold-500 hover:bg-gold-600"}`}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages || tabLoading}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      );
    }

    if (activeTab === "Category") {
      return (
        <>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="text"
              placeholder="Search categories..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="w-full max-w-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
            {categorySearch && (
              <button
                onClick={() => {
                  setCategorySearch("");
                  setDebouncedCategorySearch("");
                  setCurrentPage(1);
                  queryClient.invalidateQueries({ queryKey: ["tabData", "Category"] });
                }}
                className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <div className="mt-3 overflow-x-auto rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {!items || items.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                      {categorySearch ? `No categories found for "${categorySearch}"` : "No categories found"}
                    </td>
                  </tr>
                ) : items.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate">{item.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Can I="update" a="Category">
                          <button
                            onClick={() => {
                              setEditingCategory({ id: item.id, name: item.name, description: item.description });
                              setCategoryEditFormState({ name: item.name, description: item.description });
                              setIsCategoryEditModalOpen(true);
                            }}
                            className="px-3 py-1 bg-gold-500 hover:bg-gold-600 text-gray-900 rounded-md transition-colors text-xs"
                          >
                            Edit
                          </button>
                        </Can>
                        <Can I="delete" a="Category">
                          <button
                            onClick={() => setDeletingCategoryId(item.id)}
                            className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors text-xs"
                          >
                            Delete
                          </button>
                        </Can>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex flex-wrap justify-center items-center gap-2 overflow-x-auto max-w-full px-2">
                <button
                  className={`px-4 py-2 rounded-lg text-white ${currentPage === 1 ? "bg-gray-400 cursor-not-allowed" : "bg-gold-500 hover:bg-gold-600"}`}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || tabLoading}
                >
                  Prev
                </button>
                {(() => {
                  const pages = [];
                  const totalPages = pagination.totalPages;
                  const maxVisiblePages = 3;
                  if (totalPages <= maxVisiblePages + 2) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else if (currentPage <= maxVisiblePages) {
                    pages.push(1, 2, 3, "...", totalPages);
                  } else if (currentPage >= totalPages - maxVisiblePages + 1) {
                    pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
                  } else {
                    pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
                  }
                  return pages.map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === "number" && handlePageChange(page)}
                      disabled={page === "..." || tabLoading}
                      className={`px-3 py-1 rounded-md ${currentPage === page ? "bg-gold-500 text-white" : "bg-gray-200 text-black hover:bg-gray-300"}`}
                    >
                      {page}
                    </button>
                  ));
                })()}
                <button
                  className={`px-4 py-2 rounded-lg text-white ${currentPage === pagination.totalPages ? "bg-gray-400 cursor-not-allowed" : "bg-gold-500 hover:bg-gold-600"}`}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages || tabLoading}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      );
    }

    if (activeTab === "ProductWanted" || activeTab === "ServiceWanted") {
      const isServiceWanted = activeTab === "ServiceWanted";
      return (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
            {!items || items.length === 0 ? (
              <p className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 py-10">
                {isServiceWanted ? "No services wanted found" : "No products wanted found"}
              </p>
            ) : (
              items.map((item: any) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
                >
                  <div className="relative h-40 w-full bg-gray-200 dark:bg-gray-700">
                    {(isServiceWanted ? item.image : item.primaryImage) ? (
                      <Image
                        src={isServiceWanted ? item.image : item.primaryImage}
                        alt={item.name}
                        fill
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-r from-gold-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold"></div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {item.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mt-1 text-xs truncate">
                      {isServiceWanted
                        ? `${item.serviceCategory?.name || ""}${item.subCategory ? ` › ${item.subCategory.name}` : ""}`
                        : item.category?.name}
                    </p>
                    {!isServiceWanted && (
                      <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                        Quantity: {item.quantity}
                      </p>
                    )}
                    <p className="text-gray-600 dark:text-gray-300 mt-1 text-sm line-clamp-2">
                      {item.description}
                    </p>
                    <Link
                      href={
                        isServiceWanted
                          ? `/userMarketplace/service-wanted/${item.id}`
                          : `/userMarketplace/product-wanted/${item.id}`
                      }
                      className="block w-full mt-4 py-2 text-center bg-gold-600 text-gray-800 rounded-md hover:bg-gold-700 transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex flex-wrap justify-center items-center gap-2 overflow-x-auto max-w-full px-2">
                <button
                  className={`px-4 py-2 rounded-lg text-white ${currentPage === 1 ? "bg-gray-400 cursor-not-allowed" : "bg-gold-500 hover:bg-gold-600"}`}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1 || tabLoading}
                >
                  Prev
                </button>
                {(() => {
                  const pages: (number | string)[] = [];
                  const totalPages = pagination.totalPages;
                  const maxVisiblePages = 3;
                  if (totalPages <= maxVisiblePages + 2) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else if (currentPage <= maxVisiblePages) {
                    pages.push(1, 2, 3, "...", totalPages);
                  } else if (currentPage >= totalPages - maxVisiblePages + 1) {
                    pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
                  } else {
                    pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
                  }
                  return pages.map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === "number" && handlePageChange(page)}
                      disabled={page === "..." || tabLoading}
                      className={`px-3 py-1 rounded-md ${currentPage === page ? "bg-gold-500 text-white" : "bg-gray-200 text-black hover:bg-gray-300"}`}
                    >
                      {page}
                    </button>
                  ));
                })()}
                <button
                  className={`px-4 py-2 rounded-lg text-white ${currentPage === pagination.totalPages ? "bg-gray-400 cursor-not-allowed" : "bg-gold-500 hover:bg-gold-600"}`}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages || tabLoading}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6 ">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/${activeTab === "Product"
                  ? "Product"
                  : activeTab === "Service"
                    ? "service"
                    : activeTab === "RFQ"
                      ? "rfq"
                      : activeTab === "ServiceRFQ"
                        ? "service-rfq"
                        : "discount"
                }/${item.id}`}
              className="block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 cursor-pointer"
            >
              <div className="cursor-pointer">
                <div className="relative h-40 w-full bg-gray-200 dark:bg-gray-700">
                  {item.primaryImage ? (
                    <Image
                      src={item.primaryImage}
                      alt={item.name || item.title || item.orderNumber}
                      layout="fill"
                      objectFit="cover"
                      className="transition-transform duration-300 hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-r from-gold-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold"></div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {item.name || item.title || item.orderNumber}
                  </h3>

                  {activeTab === "Product" && (
                    <p className="text-gray-600 dark:text-gray-300 mt-1">
                      View details for pricing
                    </p>
                  )}
                  {activeTab === "Service" && (
                    <>
                      <p className="text-gray-600 dark:text-gray-300 mt-1 text-xs truncate">
                        {item.serviceCategory?.name}
                        {item.subCategory ? ` › ${item.subCategory.name}` : ""}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mt-1 text-xs truncate">
                        {item.brand}
                      </p>
                    </>
                  )}
                  {activeTab === "rfq" && (
                    <>
                      <p className="text-gray-600 dark:text-gray-300 mt-1">
                        {item.date}
                      </p>
                      <span
                        className={`inline-block px-2 py-1 mt-2 text-xs rounded-full ${item.status === "AWARDED"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : item.status === "REJECTED"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          }`}
                      >
                        {item.status}
                      </span>
                    </>
                  )}
                  {activeTab === "ServiceRFQ" && (
                    <>
                      <p className="text-gray-600 dark:text-gray-300 mt-1">
                        {item.date}
                      </p>
                      <span
                        className={`inline-block px-2 py-1 mt-2 text-xs rounded-full ${item.status === "CLOSED"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          }`}
                      >
                        {item.status}
                      </span>
                    </>
                  )}
                  {activeTab === "discount" && (
                    <>
                      <p className="text-gray-600 dark:text-gray-300 mt-1">
                        Code:{" "}
                        <span className="font-medium">{item.discountCode}</span>
                      </p>
                      <p className="text-gray-600 dark:text-gray-300 mt-1">
                        Value:{" "}
                        <span className="font-medium">{item.value}%</span>
                      </p>

                      {item.isFeatured ? (
                        <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full bg-gold-100 text-gold-800 dark:bg-gold-900 dark:text-gold-200">
                          Featured
                        </span>
                      ) : (
                        <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          Not Featured
                        </span>
                      )}
                    </>
                  )}

                  <button className="w-full mt-4 py-2 bg-gold-600 text-gray-800 rounded-md hover:bg-gold-700 transition-colors">
                    View Details
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <div className="flex flex-wrap justify-center items-center gap-2 overflow-x-auto max-w-full px-2">
              <button
                className={`px-4 py-2 rounded-lg text-white ${currentPage === 1
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gold-500 hover:bg-gold-600"
                  }`}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || tabLoading}
              >
                Prev
              </button>

              {(() => {
                const pages = [];
                const totalPages = pagination.totalPages;
                const maxVisiblePages = 3;

                if (totalPages <= maxVisiblePages + 2) {
                  for (let i = 1; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  if (currentPage <= maxVisiblePages) {
                    pages.push(1, 2, 3, "...", totalPages);
                  } else if (currentPage >= totalPages - maxVisiblePages + 1) {
                    pages.push(
                      1,
                      "...",
                      totalPages - 2,
                      totalPages - 1,
                      totalPages
                    );
                  } else {
                    pages.push(
                      1,
                      "...",
                      currentPage - 1,
                      currentPage,
                      currentPage + 1,
                      "...",
                      totalPages
                    );
                  }
                }

                return pages.map((page, index) => (
                  <button
                    key={index}
                    onClick={() =>
                      typeof page === "number" && handlePageChange(page)
                    }
                    disabled={page === "..." || tabLoading}
                    className={`px-3 py-1 rounded-md ${currentPage === page
                        ? "bg-gold-500 text-white"
                        : "bg-gray-200 text-black hover:bg-gray-300"
                      }`}
                  >
                    {page}
                  </button>
                ));
              })()}

              <button
                className={`px-4 py-2 rounded-lg text-white ${currentPage === pagination.totalPages
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gold-500 hover:bg-gold-600"
                  }`}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.totalPages || tabLoading}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Awarded RFQs Section */}
        {activeTab === "RFQ" && (
          <div className="mt-10">
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mb-4 flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Awarded RFQs
              </h3>
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                — RFQs where your quote was selected
              </span>
            </div>

            {awardedRfqLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : awardedRfqs.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
                No awarded RFQs yet
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {awardedRfqs.map((rfq: any) => (
                    <Link key={rfq.id} href={`/rfq/${rfq.id}`} className="block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                      <div className="relative h-40 w-full bg-gray-200 dark:bg-gray-700">
                        {rfq.primaryImage ? (
                          <Image src={rfq.primaryImage} alt={rfq.title} layout="fill" objectFit="cover" className="transition-transform duration-300 hover:scale-105" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-r from-gold-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold" />
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">{rfq.title}</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mt-1 truncate">{rfq.categoryName}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Budget: <span className="font-medium text-gray-900 dark:text-white">{rfq.budget}</span>
                          </span>
                          <span className="inline-block px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 font-semibold">
                            AWARDED
                          </span>
                        </div>
                        <button className="w-full mt-3 py-2 bg-gold-600 text-gray-800 rounded-md hover:bg-gold-700 transition-colors text-sm">
                          View Details
                        </button>
                      </div>
                    </Link>
                  ))}
                </div>

                {awardedRfqPagination && awardedRfqPagination.totalPages > 1 && (
                  <div className="flex justify-center mt-6 gap-2 flex-wrap">
                    <button
                      className={`px-4 py-2 rounded-lg text-white ${awardedRfqPage === 1 ? "bg-gray-400 cursor-not-allowed" : "bg-gold-500 hover:bg-gold-600"}`}
                      onClick={() => setAwardedRfqPage((p) => Math.max(1, p - 1))}
                      disabled={awardedRfqPage === 1}
                    >
                      Prev
                    </button>
                    {Array.from({ length: awardedRfqPagination.totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setAwardedRfqPage(p)}
                        className={`px-3 py-1 rounded-md ${awardedRfqPage === p ? "bg-gold-500 text-white" : "bg-gray-200 text-black hover:bg-gray-300"}`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      className={`px-4 py-2 rounded-lg text-white ${awardedRfqPage === awardedRfqPagination.totalPages ? "bg-gray-400 cursor-not-allowed" : "bg-gold-500 hover:bg-gold-600"}`}
                      onClick={() => setAwardedRfqPage((p) => Math.min(awardedRfqPagination.totalPages, p + 1))}
                      disabled={awardedRfqPage === awardedRfqPagination.totalPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Awarded Service RFQs Section */}
        {activeTab === "ServiceRFQ" && (
          <div className="mt-10">
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mb-4 flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Awarded Service RFQs
              </h3>
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                — Service RFQs where your quote was selected
              </span>
            </div>

            {awardedServiceRfqLoading ? (
              <div className="flex justify-center items-center h-32">
                <div className="w-10 h-10 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : awardedServiceRfqs.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
                No awarded service RFQs yet
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {awardedServiceRfqs.map((rfq: any) => (
                    <Link key={rfq.id} href={`/service-rfq/${rfq.id}`} className="block bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
                      <div className="relative h-40 w-full bg-gray-200 dark:bg-gray-700">
                        {rfq.primaryImage ? (
                          <Image src={rfq.primaryImage} alt={rfq.title} layout="fill" objectFit="cover" className="transition-transform duration-300 hover:scale-105" />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-r from-gold-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-bold" />
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">{rfq.title}</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mt-1 truncate">
                          {rfq.serviceCategory?.name}
                          {rfq.subCategory ? ` › ${rfq.subCategory.name}` : ""}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            Budget: <span className="font-medium text-gray-900 dark:text-white">{rfq.budget}</span>
                          </span>
                          <span className="inline-block px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 font-semibold">
                            AWARDED
                          </span>
                        </div>
                        <button className="w-full mt-3 py-2 bg-gold-600 text-gray-800 rounded-md hover:bg-gold-700 transition-colors text-sm">
                          View Details
                        </button>
                      </div>
                    </Link>
                  ))}
                </div>

                {awardedServiceRfqPagination && awardedServiceRfqPagination.totalPages > 1 && (
                  <div className="flex justify-center mt-6 gap-2 flex-wrap">
                    <button
                      className={`px-4 py-2 rounded-lg text-white ${awardedServiceRfqPage === 1 ? "bg-gray-400 cursor-not-allowed" : "bg-gold-500 hover:bg-gold-600"}`}
                      onClick={() => setAwardedServiceRfqPage((p) => Math.max(1, p - 1))}
                      disabled={awardedServiceRfqPage === 1}
                    >
                      Prev
                    </button>
                    {Array.from({ length: awardedServiceRfqPagination.totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setAwardedServiceRfqPage(p)}
                        className={`px-3 py-1 rounded-md ${awardedServiceRfqPage === p ? "bg-gold-500 text-white" : "bg-gray-200 text-black hover:bg-gray-300"}`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      className={`px-4 py-2 rounded-lg text-white ${awardedServiceRfqPage === awardedServiceRfqPagination.totalPages ? "bg-gray-400 cursor-not-allowed" : "bg-gold-500 hover:bg-gold-600"}`}
                      onClick={() => setAwardedServiceRfqPage((p) => Math.min(awardedServiceRfqPagination.totalPages, p + 1))}
                      disabled={awardedServiceRfqPage === awardedServiceRfqPagination.totalPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </>
    );
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [categoriesResult, productsResult, serviceCatsResult, servicesResult] =
          await Promise.allSettled([
            fetchCategories(token || ""),
            fetchAllProducts(token || ""),
            fetchServiceCategories(token || ""),
            fetchAllServices(token || ""),
          ]);

        if (categoriesResult.status === "fulfilled") {
          setCategories(categoriesResult.value);
        }
        if (productsResult.status === "fulfilled") {
          setProducts(productsResult.value);
        }
        if (serviceCatsResult.status === "fulfilled") {
          setServiceCategories(serviceCatsResult.value.data || []);
        }
        if (servicesResult.status === "fulfilled") {
          setAllServices(servicesResult.value);
        }
      } catch (err) {
        console.error("Could not load form data", err);
      }
    };
    if (token) loadInitialData();
  }, [token]);

  // Define the tabs with their required permissions
  const tabs = [
    {
      id: "Product",
      label: "Products",
      readPermission: "read",
      createPermission: "create",
    },
    {
      id: "ProductWanted",
      label: "Product I Want",
      readPermission: "read",
      createPermission: "create",
    },

     {
      id: "RFQ",
      label: "Product RFQs",
      readPermission: "read",
      createPermission: "create",
    },

     {
      id: "Category",
      label: "Product Categories",
      readPermission: "read",
      createPermission: "create",
    },
    {
      id: "Service",
      label: "Services",
      readPermission: "read",
      createPermission: "create",
    },

    {
      id: "ServiceWanted",
      label: "Service I Want",
      readPermission: "read",
      createPermission: "create",
    },

    {
      id: "ServiceRFQ",
      label: "Service RFQs",
      readPermission: "read",
      createPermission: "create",
    },
    // {
    //   id: "Discount",
    //   label: "Discounts",
    //   readPermission: "read",
    //   createPermission: "create",
    // },
   
    {
      id: "ServiceCategory",
      label: "Service Categories",
      readPermission: "read",
      createPermission: "create",
    },
  ];

  const isDocumentReviewPending = Boolean(user?.isDocumentReviewPending);

  const authorizedTabs = tabs.filter((tab) => {
    if (isDocumentReviewPending && ["Product", "ProductWanted", "Service", "ServiceWanted", "RFQ", "ServiceRFQ", "Discount"].includes(tab.id)) {
      return false;
    }
    return ability?.can(tab.readPermission, tab.id);
  });

  useEffect(() => {
    if (authorizedTabs.length > 0 && !authorizedTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(authorizedTabs[0].id);
      setCurrentPage(1);
    }
  }, [authorizedTabs, activeTab]);

  // Initialize tab from URL ?tab= param (used by detail pages' back button)
  useEffect(() => {
    const tabParam = router.query.tab as string | undefined;
    if (tabParam && authorizedTabs.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.tab, authorizedTabs.length]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <Loading />
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>PBC Dubai - User Profile</title>
        <meta name="description" content="User profile page for PBC Dubai" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex overflow-hidden bg-gray-50 dark:bg-gray-900 h-screen">
        <div className="relative flex flex-col flex-1 overflow-hidden">
          <div
            id="main-content"
            className="relative w-full h-full overflow-y-auto bg-gray-50 dark:bg-gray-900"
          >
            <div className="p-4">
              {user && (
                <UserHeaderCard
                  isProfileExpanded={isProfileExpanded}
                  setIsProfileExpanded={setIsProfileExpanded}
                  isEditModalOpen={isEditModalOpen}
                  setIsEditModalOpen={setIsEditModalOpen}
                  isVisibilityModalOpen={isVisibilityModalOpen}
                  setIsVisibilityModalOpen={setIsVisibilityModalOpen}
                />
              )}
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex -mb-px overflow-x-auto">
                  {authorizedTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setCurrentPage(1);
                      }}
                      className={`py-4 px-6 text-center border-b-2 font-medium text-sm focus:outline-none transition-colors duration-200 ${activeTab === tab.id
                          ? "border-gold-500 text-gold-600 dark:text-gold-400"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
              {!isDocumentReviewPending && <Can I="create" a={activeTab}>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => {

                      // if(activeTab === "Product" && (accountStatusError || accountStatus?.accountStatus?.statusLevel === "not_submitted")) {
                      //   // bypassing payment for now
                      //   setShowStripeModal(false);

                      // } else {
                      //   setFormType(activeTab.toLowerCase());
                      //   setIsAddModalOpen(true);
                      // }




                      setFormType(activeTab.toLowerCase());
                      setIsAddModalOpen(true);
                    }}
                    className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-gray-900 rounded-md transition-colors"
                  >
                    Add {activeTab}
                  </button>
                </div>
              </Can>}

              {formType && formType !== "product" && formType !== "servicecategory" && formType !== "service" && formType !== "servicewanted" && modalConfig[formType] && (
                <UniversalFormModal
                  title={modalConfig[formType].title}
                  isOpen={isAddModalOpen}
                  onClose={() => setIsAddModalOpen(false)}
                  onSubmit={modalConfig[formType].onSubmit}
                  isSubmitting={isSubmitting}
                  fields={modalConfig[formType].fields as any}
                />
              )}

              {formType === "servicecategory" && isAddModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Service Category</h2>
                        <button
                          onClick={() => { setIsAddModalOpen(false); setNewServiceSubCatNames([""]); }}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const validSubs = newServiceSubCatNames.filter((n) => n.trim());
                          if (validSubs.length === 0) {
                            toast.error("At least one sub-category is required");
                            return;
                          }
                          setIsSubmitting(true);
                          try {
                            const nameEl = (e.currentTarget as HTMLFormElement).elements.namedItem("sc-name") as HTMLInputElement;
                            const descEl = (e.currentTarget as HTMLFormElement).elements.namedItem("sc-description") as HTMLTextAreaElement;
                            await addServiceCategory(token!, {
                              name: nameEl.value,
                              description: descEl.value,
                              subCategories: validSubs.map((n) => ({ name: n })),
                            });
                            toast.success("Service category created successfully");
                            setIsAddModalOpen(false);
                            setNewServiceSubCatNames([""]);
                            await queryClient.invalidateQueries({ queryKey: ["tabData", "ServiceCategory"] });
                          } catch (err) {
                            toast.error((err as any).message);
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name <span className="text-red-500">*</span></label>
                          <input
                            name="sc-name"
                            type="text"
                            required
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span className="text-red-500">*</span></label>
                          <textarea
                            name="sc-description"
                            rows={3}
                            required
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                              Sub-categories <span className="text-red-500">*</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setNewServiceSubCatNames((prev) => [...prev, ""])}
                              className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded"
                            >
                              + Add
                            </button>
                          </div>
                          <div className="space-y-2">
                            {newServiceSubCatNames.map((name, idx) => (
                              <div key={idx} className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  placeholder={`Sub-category ${idx + 1}`}
                                  value={name}
                                  onChange={(e) => {
                                    const updated = [...newServiceSubCatNames];
                                    updated[idx] = e.target.value;
                                    setNewServiceSubCatNames(updated);
                                  }}
                                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                />
                                {newServiceSubCatNames.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setNewServiceSubCatNames((prev) => prev.filter((_, i) => i !== idx))}
                                    className="text-red-500 hover:text-red-700 text-sm px-2"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-end space-x-3 pt-2">
                          <button
                            type="button"
                            onClick={() => { setIsAddModalOpen(false); setNewServiceSubCatNames([""]); }}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white font-medium rounded-md transition-colors"
                          >
                            {isSubmitting ? "Creating..." : "Create"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {formType === "product" && isAddModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                          Add Product
                        </h2>
                        <button
                          onClick={() => setIsAddModalOpen(false)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          <svg
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

                      <form
                        onSubmit={submitHandlers.product}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Product Name
                            </label>
                            <input
                              id="name"
                              type="text"
                              value={formStates.product.name}
                              onChange={(e) => handleInputChange("product", e)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Brand
                            </label>
                            <input
                              id="brand"
                              type="text"
                              value={formStates.product.brand}
                              onChange={(e) => handleInputChange("product", e)}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                          </label>
                          <textarea
                            id="description"
                            value={formStates.product.description}
                            onChange={(e) => handleInputChange("product", e)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Category
                          </label>
                          <select
                            id="categoryId"
                            value={formStates.product.categoryId}
                            onChange={(e) => handleInputChange("product", e)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                          >
                            <option value="">Select an option</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Primary Image
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleImageChange(e, "product", "primaryImage")
                              }
                              className="w-full text-sm text-gray-500 dark:text-gray-400"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Secondary Image
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleImageChange(
                                  e,
                                  "product",
                                  "secondaryImage",
                                )
                              }
                              className="w-full text-sm text-gray-500 dark:text-gray-400"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Tertiary Image
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handleImageChange(e, "product", "tertiaryImage")
                              }
                              className="w-full text-sm text-gray-500 dark:text-gray-400"
                            />
                          </div>
                        </div>

                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                              Variants
                            </h3>
                            <button
                              type="button"
                              onClick={addVariantRow}
                              className="px-3 py-1 bg-gold-600 hover:bg-gold-700 text-white text-sm rounded-md"
                            >
                              Add Variant
                            </button>
                          </div>

                          <div className="space-y-4">
                            {formStates.product.variants.map((variant, index) => (
                              <div
                                key={`variant-${index}`}
                                className="border border-gray-200 dark:border-gray-600 rounded-md p-3"
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    Variant {index + 1}
                                  </p>
                                  <div className="flex items-center gap-3">
                                    <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 gap-1">
                                      <input
                                        type="radio"
                                        checked={variant.isDefault}
                                        onChange={() => setDefaultVariant(index)}
                                      />
                                      Default
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => removeVariantRow(index)}
                                      disabled={formStates.product.variants.length === 1}
                                      className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <input
                                    type="text"
                                    placeholder="SKU (optional)"
                                    value={variant.sku}
                                    onChange={(e) =>
                                      handleProductVariantInputChange(
                                        index,
                                        "sku",
                                        e.target.value,
                                      )
                                    }
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Price (required)"
                                    value={variant.price}
                                    onChange={(e) =>
                                      handleProductVariantInputChange(
                                        index,
                                        "price",
                                        e.target.value,
                                      )
                                    }
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                  />
                                  <input
                                    type="number"
                                    placeholder="Stock quantity (required)"
                                    value={variant.stockQuantity}
                                    onChange={(e) =>
                                      handleProductVariantInputChange(
                                        index,
                                        "stockQuantity",
                                        e.target.value,
                                      )
                                    }
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    required
                                  />
                                  <input
                                    type="number"
                                    placeholder="Weight (kg)"
                                    value={variant.weightKg}
                                    onChange={(e) =>
                                      handleProductVariantInputChange(
                                        index,
                                        "weightKg",
                                        e.target.value,
                                      )
                                    }
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Length (cm)"
                                    value={variant.lengthCm}
                                    onChange={(e) =>
                                      handleProductVariantInputChange(
                                        index,
                                        "lengthCm",
                                        e.target.value,
                                      )
                                    }
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Width (cm)"
                                    value={variant.widthCm}
                                    onChange={(e) =>
                                      handleProductVariantInputChange(
                                        index,
                                        "widthCm",
                                        e.target.value,
                                      )
                                    }
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Height (cm)"
                                    value={variant.heightCm}
                                    onChange={(e) =>
                                      handleProductVariantInputChange(
                                        index,
                                        "heightCm",
                                        e.target.value,
                                      )
                                    }
                                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white md:col-span-3"
                                  />
                                </div>

                                <div className="mt-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      Attributes (optional)
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => addVariantAttributeRow(index)}
                                      className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded"
                                    >
                                      Add Attribute
                                    </button>
                                  </div>

                                  <div className="space-y-2">
                                    {variant.attributes.map((attribute, attributeIndex) => (
                                      <div
                                        key={`variant-${index}-attribute-${attributeIndex}`}
                                        className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2"
                                      >
                                        <input
                                          type="text"
                                          placeholder="Key"
                                          value={attribute.key}
                                          onChange={(e) =>
                                            handleVariantAttributeChange(
                                              index,
                                              attributeIndex,
                                              "key",
                                              e.target.value,
                                            )
                                          }
                                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                        <input
                                          type="text"
                                          placeholder="Value"
                                          value={attribute.value}
                                          onChange={(e) =>
                                            handleVariantAttributeChange(
                                              index,
                                              attributeIndex,
                                              "value",
                                              e.target.value,
                                            )
                                          }
                                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            removeVariantAttributeRow(index, attributeIndex)
                                          }
                                          className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* {defaultVariantPrice > 0 && (
                          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                              Fee Breakdown (Default Variant)
                            </h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                                <span>Default Variant Price:</span>
                                <CurrencyAmount amount={defaultVariantPrice} className="font-medium" />
                              </div>
                              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>PBC Marketplace Fee (2%):</span>
                                <CurrencyAmount amount={-fees.pbcFee} />
                              </div>
                              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                <span>Transaction Fee (4.9% + 1 dirham):</span>
                                <CurrencyAmount amount={-fees.stripeFee} />
                              </div>
                              <div className="border-t border-gray-300 dark:border-gray-600 pt-2 mt-2"></div>
                              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                                <span>Total Deductions:</span>
                                <CurrencyAmount amount={-fees.totalDeductions} className="font-medium" />
                              </div>
                              <div className="flex justify-between text-lg font-bold text-green-600 dark:text-green-400 pt-2 border-t border-gray-300 dark:border-gray-600">
                                <span>You Receive:</span>
                                <CurrencyAmount amount={fees.sellerReceives} />
                              </div>
                              <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  <span className="font-medium">Note:</span> Tax (5% = <CurrencyAmount amount={fees.taxAmount} />) is your responsibility as the seller. The full product price is transferred to you, and you are required to pay the tax separately.
                                </p>
                              </div>
                            </div>
                          </div>
                        )} */}

                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white font-medium rounded-md transition-colors"
                          >
                            {isSubmitting ? "Submitting..." : "Submit"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {formType === "service" && isAddModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Service</h2>
                        <button
                          onClick={() => setIsAddModalOpen(false)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <form onSubmit={handleServiceSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Service Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={serviceFormState.name}
                              onChange={(e) => setServiceFormState((p) => ({ ...p, name: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Brand <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={serviceFormState.brand}
                              onChange={(e) => setServiceFormState((p) => ({ ...p, brand: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            rows={3}
                            value={serviceFormState.description}
                            onChange={(e) => setServiceFormState((p) => ({ ...p, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Category <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={serviceFormState.serviceCategoryId}
                              onChange={(e) =>
                                setServiceFormState((p) => ({
                                  ...p,
                                  serviceCategoryId: e.target.value,
                                  subCategoryId: "",
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              required
                            >
                              <option value="">Select a category</option>
                              {serviceCategories.map((cat: any) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Sub Category <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={serviceFormState.subCategoryId}
                              onChange={(e) =>
                                setServiceFormState((p) => ({ ...p, subCategoryId: e.target.value }))
                              }
                              disabled={!selectedServiceCategory}
                              required
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                            >
                              <option value="">Select a sub category</option>
                              {(selectedServiceCategory?.subCategories || []).map((sub: any) => (
                                <option key={sub.id} value={sub.id}>
                                  {sub.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Image (optional)
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              setServiceFormState((p) => ({
                                ...p,
                                primaryImage: e.target.files?.[0] || null,
                              }))
                            }
                            className="w-full text-sm text-gray-500 dark:text-gray-400"
                          />
                        </div>

                        <div className="flex justify-end space-x-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-gray-900 font-medium rounded-md transition-colors disabled:opacity-50"
                          >
                            {isSubmitting ? "Adding..." : "Add Service"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {formType === "servicewanted" && isAddModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Service I Want</h2>
                        <button
                          onClick={() => setIsAddModalOpen(false)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <form onSubmit={handleServiceWantedSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Service Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={serviceWantedFormState.name}
                            onChange={(e) => setServiceWantedFormState((p) => ({ ...p, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            rows={3}
                            value={serviceWantedFormState.description}
                            onChange={(e) => setServiceWantedFormState((p) => ({ ...p, description: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Category <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={serviceWantedFormState.serviceCategoryId}
                              onChange={(e) =>
                                setServiceWantedFormState((p) => ({
                                  ...p,
                                  serviceCategoryId: e.target.value,
                                  subCategoryId: "",
                                }))
                              }
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              required
                            >
                              <option value="">Select a category</option>
                              {serviceCategories.map((cat: any) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Sub Category <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={serviceWantedFormState.subCategoryId}
                              onChange={(e) =>
                                setServiceWantedFormState((p) => ({ ...p, subCategoryId: e.target.value }))
                              }
                              disabled={!selectedServiceWantedCategory}
                              required
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                            >
                              <option value="">Select a sub category</option>
                              {(selectedServiceWantedCategory?.subCategories || []).map((sub: any) => (
                                <option key={sub.id} value={sub.id}>
                                  {sub.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Image (optional)
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              setServiceWantedFormState((p) => ({
                                ...p,
                                image: e.target.files?.[0] || null,
                              }))
                            }
                            className="w-full text-sm text-gray-500 dark:text-gray-400"
                          />
                        </div>

                        <div className="flex justify-end space-x-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-gray-900 font-medium rounded-md transition-colors disabled:opacity-50"
                          >
                            {isSubmitting ? "Adding..." : "Add Listing"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {isCategoryEditModalOpen && editingCategory && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Category</h2>
                        <button
                          onClick={() => setIsCategoryEditModalOpen(false)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setIsSubmitting(true);
                          try {
                            await updateCategory(token!, editingCategory.id, categoryEditFormState);
                            toast.success("Category updated successfully");
                            setIsCategoryEditModalOpen(false);
                            setEditingCategory(null);
                            await queryClient.invalidateQueries({ queryKey: ["tabData", "Category"] });
                          } catch (err) {
                            toast.error((err as any).message);
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                          <input
                            type="text"
                            value={categoryEditFormState.name}
                            onChange={(e) => setCategoryEditFormState((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                          <textarea
                            value={categoryEditFormState.description}
                            onChange={(e) => setCategoryEditFormState((prev) => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                          />
                        </div>
                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => setIsCategoryEditModalOpen(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white font-medium rounded-md transition-colors"
                          >
                            {isSubmitting ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {deletingCategoryId !== null && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Category</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to delete this category? This action cannot be undone.</p>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setDeletingCategoryId(null)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={isSubmitting}
                        onClick={async () => {
                          setIsSubmitting(true);
                          try {
                            await deleteCategory(token!, deletingCategoryId!);
                            toast.success("Category deleted successfully");
                            setDeletingCategoryId(null);
                            await queryClient.invalidateQueries({ queryKey: ["tabData", "Category"] });
                          } catch (err) {
                            toast.error((err as any).message);
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors"
                      >
                        {isSubmitting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isServiceCategoryEditModalOpen && editingServiceCategory && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <div className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Service Category</h2>
                        <button
                          onClick={() => setIsServiceCategoryEditModalOpen(false)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const validAdditions = editSubCatAdditions.filter((n) => n.trim());
                          const remainingCount = editingServiceCategory.subCategories.length + validAdditions.length;
                          if (remainingCount === 0) {
                            toast.error("At least one sub-category is required");
                            return;
                          }
                          setIsSubmitting(true);
                          try {
                            await updateServiceCategory(token!, editingServiceCategory.id, {
                              name: serviceCategoryEditForm.name,
                              description: serviceCategoryEditForm.description,
                            });
                            for (const name of validAdditions) {
                              await addServiceSubCategory(token!, editingServiceCategory.id, { name });
                            }
                            toast.success("Service category updated successfully");
                            setIsServiceCategoryEditModalOpen(false);
                            setEditingServiceCategory(null);
                            setEditSubCatAdditions([]);
                            await queryClient.invalidateQueries({ queryKey: ["tabData", "ServiceCategory"] });
                          } catch (err) {
                            toast.error((err as any).message);
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={serviceCategoryEditForm.name}
                            onChange={(e) => setServiceCategoryEditForm((prev) => ({ ...prev, name: e.target.value }))}
                            required
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description <span className="text-red-500">*</span></label>
                          <textarea
                            value={serviceCategoryEditForm.description}
                            onChange={(e) => setServiceCategoryEditForm((prev) => ({ ...prev, description: e.target.value }))}
                            rows={3}
                            required
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sub-categories</label>
                            <button
                              type="button"
                              onClick={() => setEditSubCatAdditions((prev) => [...prev, ""])}
                              className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded"
                            >
                              + Add
                            </button>
                          </div>
                          <div className="space-y-2">
                            {editingServiceCategory.subCategories.map((sub) => (
                              <div key={sub.id} className="flex gap-2 items-center">
                                <span className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-sm text-gray-900 dark:text-white">
                                  {sub.name}
                                </span>
                                <button
                                  type="button"
                                  disabled={editingServiceCategory.subCategories.length + editSubCatAdditions.filter((n) => n.trim()).length <= 1}
                                  onClick={async () => {
                                    if (editingServiceCategory.subCategories.length + editSubCatAdditions.filter((n) => n.trim()).length <= 1) return;
                                    setIsSubmitting(true);
                                    try {
                                      await deleteServiceSubCategory(token!, editingServiceCategory.id, sub.id);
                                      setEditingServiceCategory((prev) => prev ? {
                                        ...prev,
                                        subCategories: prev.subCategories.filter((s) => s.id !== sub.id),
                                      } : null);
                                      await queryClient.invalidateQueries({ queryKey: ["tabData", "ServiceCategory"] });
                                    } catch (err) {
                                      toast.error((err as any).message);
                                    } finally {
                                      setIsSubmitting(false);
                                    }
                                  }}
                                  className="text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed text-sm px-2"
                                  title={editingServiceCategory.subCategories.length <= 1 ? "Cannot delete the last sub-category" : "Remove"}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                            {editSubCatAdditions.map((name, idx) => (
                              <div key={`new-${idx}`} className="flex gap-2 items-center">
                                <input
                                  type="text"
                                  placeholder="New sub-category name"
                                  value={name}
                                  onChange={(e) => {
                                    const updated = [...editSubCatAdditions];
                                    updated[idx] = e.target.value;
                                    setEditSubCatAdditions(updated);
                                  }}
                                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => setEditSubCatAdditions((prev) => prev.filter((_, i) => i !== idx))}
                                  className="text-red-500 hover:text-red-700 text-sm px-2"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-end space-x-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsServiceCategoryEditModalOpen(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white font-medium rounded-md transition-colors"
                          >
                            {isSubmitting ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {deletingServiceCategoryId !== null && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Delete Service Category</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">Are you sure you want to delete this service category and all its sub-categories? This action cannot be undone.</p>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setDeletingServiceCategoryId(null)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={isSubmitting}
                        onClick={async () => {
                          setIsSubmitting(true);
                          try {
                            await deleteServiceCategory(token!, deletingServiceCategoryId!);
                            toast.success("Service category deleted successfully");
                            setDeletingServiceCategoryId(null);
                            await queryClient.invalidateQueries({ queryKey: ["tabData", "ServiceCategory"] });
                          } catch (err) {
                            toast.error((err as any).message);
                          } finally {
                            setIsSubmitting(false);
                          }
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors"
                      >
                        {isSubmitting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <ProfileVisibilityModal
                isOpen={isVisibilityModalOpen}
                onClose={() => setIsVisibilityModalOpen(false)}
                onSave={handleProfileVisibilitySave}
                currentPermissions={profileVisibilityData}
                isLoading={isLoadingVisibility}
                token={token}
              />


              {showStripeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Stripe Account Required
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      You need to create a Stripe account to sell products. Please set up your Stripe account first.
                    </p>
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => setShowStripeModal(false)}
                        className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          if (!token) {
                            toast.error("Authentication required");
                            return;
                          }
                          setShowStripeModal(false);
                          const res = await createStandardAccount(token, 'AE');

                          if (res.onboardingUrl) {
                            // window.location.href = res.onboardingUrl;
                            window.open(res.onboardingUrl, '_blank');
                          }

                        }}
                        className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-gray-900 rounded-md transition-colors"
                      >
                        Setup Stripe Account
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {isDocumentReviewPending ? (
                <div className="flex justify-center items-center h-40">
                  <p className="text-gray-500 dark:text-gray-400">
                    Product, RFQ, Service RFQ, and Discount are hidden while your documents are under review.
                  </p>
                </div>
              ) : ability?.can("read", activeTab) ? (
                renderTabContent()
              ) : (
                <div className="flex justify-center items-center h-40">
                  <p className="text-gray-500 dark:text-gray-400">
                    You do not have permission to view this content
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
