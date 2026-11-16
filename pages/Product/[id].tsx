"use client";

import type React from "react";

import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import useAuthStore from "@/store/authStore";
import demoImage from "@/public/images/users/userProfile2.png";
import {
  addProductVariant,
  addProductResponse,
  deleteProduct,
  deleteProductResponse,
  deleteProductVariant,
  getProduct,
  ProductVariantInput,
  UpdateProductVariantPayload,
  updateProduct,
  updateProductVariant,
} from "@/services/products";
import UniversalFormModal from "@/components/modals/UniversalFormModal";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import { fetchCategories } from "@/services/categories";
import { Category } from "@/types/marketplace";
import { Product, ProductVariant } from "@/types/marketplace";
import CurrencyAmount from "@/components/ui/CurrencyAmount";
import { Textarea, Button } from "flowbite-react";
import { HiUserCircle } from "react-icons/hi";
import { formatDateAndTime } from "@/utils/formatDateAndTime";
import { useLoadingStore } from "@/store/useLoadingStore";
import { buildResponseThreads } from "@/utils/buildResponseThreads";

type VariantAttributePair = {
  key: string;
  value: string;
};

type VariantDraft = {
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

const createEmptyAttributePair = (): VariantAttributePair => ({
  key: "",
  value: "",
});

const createEmptyVariantDraft = (): VariantDraft => ({
  sku: "",
  price: "",
  stockQuantity: "",
  weightKg: "",
  lengthCm: "",
  widthCm: "",
  heightCm: "",
  attributes: [createEmptyAttributePair()],
  isDefault: false,
});

const mapAttributesToPairs = (
  attributes: Record<string, string> | undefined,
): VariantAttributePair[] => {
  const entries = Object.entries(attributes || {});
  if (entries.length === 0) {
    return [createEmptyAttributePair()];
  }

  return entries.map(([key, value]) => ({ key, value }));
};

const toOptionalNumericInput = (value: number | null | undefined): string => {
  return value === null || value === undefined ? "" : String(value);
};

const createVariantDraft = (variant: ProductVariant): VariantDraft => ({
  sku: variant.sku || "",
  price: String(variant.price ?? ""),
  stockQuantity: String(variant.stockQuantity ?? ""),
  weightKg: toOptionalNumericInput(variant.weightKg as number | null | undefined),
  lengthCm: toOptionalNumericInput(variant.lengthCm as number | null | undefined),
  widthCm: toOptionalNumericInput(variant.widthCm as number | null | undefined),
  heightCm: toOptionalNumericInput(variant.heightCm as number | null | undefined),
  attributes: mapAttributesToPairs(
    (variant.attributes as Record<string, string> | undefined) || {},
  ),
  isDefault: Boolean(variant.isDefault),
});

const asFile = (value: unknown): File | undefined => {
  if (typeof File === "undefined") return undefined;
  return value instanceof File ? value : undefined;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function ProductDetailWithQueryClient() {
  return (
    <QueryClientProvider client={queryClient}>
      <ProductDetail />
    </QueryClientProvider>
  );
}

function ProductDetail() {
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [variantActionId, setVariantActionId] = useState<number | null>(null);
  const { id } = router.query;
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setGlobalLoading = useLoadingStore((state) => state.setLoading);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Product | null>(null);
  const [variantDrafts, setVariantDrafts] = useState<Record<number, VariantDraft>>({});
  const [newVariantDraft, setNewVariantDraft] = useState<VariantDraft>(
    createEmptyVariantDraft(),
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [responseInputs, setResponseInputs] = useState<Record<string, string>>({});
  const [responseErrors, setResponseErrors] = useState<Record<string, string>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [responseToDelete, setResponseToDelete] = useState<string | null>(null);
  const [deletingResponse, setDeletingResponse] = useState(false);
  const [showDeleteProductModal, setShowDeleteProductModal] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(false);

  const getPreviewSource = (value: unknown): string | undefined => {
    if (typeof value === "string") {
      return value;
    }

    const fileValue = asFile(value);
    if (fileValue) {
      return URL.createObjectURL(fileValue);
    }

    return undefined;
  };
  const {
    data: productData,
    isLoading,
    isRefetching,
    error,
    refetch
  } = useQuery({
    queryKey: ["product", Array.isArray(id) ? id[0] : id],
    queryFn: () => getProduct(token as string, Array.isArray(id) ? id[0] : id || ""),
    enabled: Boolean((Array.isArray(id) ? id[0] : id) && token),
  });

  useEffect(() => {
    if (!productData) {
      return;
    }

    setActiveImage(productData.primaryImage || null);

    const draftMap: Record<number, VariantDraft> = {};
    (productData.variants || []).forEach((variant) => {
      draftMap[variant.id] = createVariantDraft(variant);
    });
    setVariantDrafts(draftMap);
  }, [productData]);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFormData || !token || !user) return;

    try {
      setIsAdding(true);
      await updateProduct(token, Number(user?.id || 0), editFormData.id, {
        name: editFormData.name,
        brand: editFormData.brand,
        description: editFormData.description,
        categoryId: Number(editFormData.categoryId),
        primaryImage: asFile(editFormData.primaryImage),
        secondaryImage: asFile(editFormData.secondaryImage),
        tertiaryImage: asFile(editFormData.tertiaryImage),
      });
      const editedProduct = await refetch();
      setActiveImage(editedProduct.data?.primaryImage || null);
      toast.success("Product updated successfully");

      setIsEditModalOpen(false);

      queryClient.invalidateQueries({ queryKey: ["product", id] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update product");
    } finally {
      setIsAdding(false);
    }
  };

  if (error) {
    toast.error((error as Error).message);
  }

  const handleVariantDraftChange = (
    variantId: number,
    field: keyof VariantDraft,
    value: string | boolean | VariantAttributePair[],
  ) => {
    setVariantDrafts((prev) => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        [field]: value,
      },
    }));
  };

  const handleVariantAttributeChange = (
    variantId: number,
    attributeIndex: number,
    field: keyof VariantAttributePair,
    value: string,
  ) => {
    setVariantDrafts((prev) => {
      const existingDraft = prev[variantId];
      if (!existingDraft) return prev;

      const updatedAttributes = [...existingDraft.attributes];
      updatedAttributes[attributeIndex] = {
        ...updatedAttributes[attributeIndex],
        [field]: value,
      };

      return {
        ...prev,
        [variantId]: {
          ...existingDraft,
          attributes: updatedAttributes,
        },
      };
    });
  };

  const addVariantAttributeRow = (variantId: number) => {
    setVariantDrafts((prev) => {
      const existingDraft = prev[variantId];
      if (!existingDraft) return prev;

      return {
        ...prev,
        [variantId]: {
          ...existingDraft,
          attributes: [...existingDraft.attributes, createEmptyAttributePair()],
        },
      };
    });
  };

  const removeVariantAttributeRow = (variantId: number, attributeIndex: number) => {
    setVariantDrafts((prev) => {
      const existingDraft = prev[variantId];
      if (!existingDraft) return prev;

      const filtered = existingDraft.attributes.filter(
        (_, index) => index !== attributeIndex,
      );

      return {
        ...prev,
        [variantId]: {
          ...existingDraft,
          attributes: filtered.length > 0 ? filtered : [createEmptyAttributePair()],
        },
      };
    });
  };

  const handleNewVariantFieldChange = (
    field: keyof VariantDraft,
    value: string | boolean | VariantAttributePair[],
  ) => {
    setNewVariantDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleNewVariantAttributeChange = (
    attributeIndex: number,
    field: keyof VariantAttributePair,
    value: string,
  ) => {
    setNewVariantDraft((prev) => {
      const updatedAttributes = [...prev.attributes];
      updatedAttributes[attributeIndex] = {
        ...updatedAttributes[attributeIndex],
        [field]: value,
      };

      return {
        ...prev,
        attributes: updatedAttributes,
      };
    });
  };

  const addNewVariantAttributeRow = () => {
    setNewVariantDraft((prev) => ({
      ...prev,
      attributes: [...prev.attributes, createEmptyAttributePair()],
    }));
  };

  const removeNewVariantAttributeRow = (attributeIndex: number) => {
    setNewVariantDraft((prev) => {
      const filtered = prev.attributes.filter((_, index) => index !== attributeIndex);
      return {
        ...prev,
        attributes: filtered.length > 0 ? filtered : [createEmptyAttributePair()],
      };
    });
  };

  const parseAttributesPairs = (
    attributes: VariantAttributePair[],
    errorPrefix: string,
  ): Record<string, string> => {
    const parsed: Record<string, string> = {};

    for (const attribute of attributes) {
      const key = attribute.key.trim();
      const value = attribute.value.trim();

      if (!key && !value) {
        continue;
      }

      if (!key || !value) {
        throw new Error(`${errorPrefix}: attribute key and value are both required.`);
      }

      if (Object.prototype.hasOwnProperty.call(parsed, key)) {
        throw new Error(`${errorPrefix}: duplicate attribute key '${key}' is not allowed.`);
      }

      parsed[key] = value;
    }

    return parsed;
  };

  const buildVariantPayload = (
    originalVariant: ProductVariant,
    draft: VariantDraft,
  ): UpdateProductVariantPayload => {
    const payload: UpdateProductVariantPayload = {};

    const normalizedSku = draft.sku.trim();
    if (normalizedSku && normalizedSku !== (originalVariant.sku || "")) {
      payload.sku = normalizedSku;
    }

    const rawPrice = draft.price.trim();
    if (!rawPrice) {
      throw new Error("Variant price is required.");
    }

    const draftPrice = Number(rawPrice);
    if (!Number.isFinite(draftPrice) || draftPrice <= 0) {
      throw new Error("Variant price must be greater than 0.");
    }
    if (draftPrice !== Number(originalVariant.price)) {
      payload.price = draftPrice;
    }

    const rawStockQuantity = draft.stockQuantity.trim();
    if (!rawStockQuantity) {
      throw new Error("Variant stock quantity is required.");
    }

    const draftStock = Number(rawStockQuantity);
    if (!Number.isInteger(draftStock) || draftStock < 0) {
      throw new Error("Variant stock quantity must be a non-negative integer.");
    }
    if (draftStock !== Number(originalVariant.stockQuantity)) {
      payload.stockQuantity = draftStock;
    }

    const applyOptionalNumeric = (
      payloadField: keyof UpdateProductVariantPayload,
      rawValue: string,
      originalValue: number | undefined,
    ) => {
      const normalized = rawValue.trim();
      if (
        normalized.toLowerCase() === "null"
        || normalized.toLowerCase() === "undefined"
      ) {
        return;
      }
      const parsed = normalized ? Number(normalized) : undefined;

      if (normalized && (parsed === undefined || !Number.isFinite(parsed) || parsed < 0)) {
        throw new Error(`${String(payloadField)} must be a non-negative number.`);
      }

      if ((parsed ?? undefined) !== (originalValue ?? undefined)) {
        if (payloadField === "weightKg") payload.weightKg = parsed;
        if (payloadField === "lengthCm") payload.lengthCm = parsed;
        if (payloadField === "widthCm") payload.widthCm = parsed;
        if (payloadField === "heightCm") payload.heightCm = parsed;
      }
    };

    applyOptionalNumeric("weightKg", draft.weightKg, originalVariant.weightKg);
    applyOptionalNumeric("lengthCm", draft.lengthCm, originalVariant.lengthCm);
    applyOptionalNumeric("widthCm", draft.widthCm, originalVariant.widthCm);
    applyOptionalNumeric("heightCm", draft.heightCm, originalVariant.heightCm);

    if (draft.isDefault !== Boolean(originalVariant.isDefault)) {
      payload.isDefault = draft.isDefault;
    }

    const originalAttributes =
      (originalVariant.attributes as Record<string, string> | undefined) || {};

    const parsedAttributes = parseAttributesPairs(
      draft.attributes,
      "Variant",
    );

    if (JSON.stringify(parsedAttributes) !== JSON.stringify(originalAttributes)) {
      payload.attributes = parsedAttributes;
    }

    return payload;
  };

  const buildNewVariantPayload = (draft: VariantDraft): ProductVariantInput => {
    const price = Number(draft.price);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("New variant: price must be greater than 0.");
    }

    const stockQuantity = Number(draft.stockQuantity);
    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      throw new Error(
        "New variant: stock quantity must be a non-negative integer.",
      );
    }

    const payload: ProductVariantInput = {
      sku: draft.sku.trim() || undefined,
      price,
      stockQuantity,
      isDefault: Boolean(draft.isDefault),
      attributes: parseAttributesPairs(draft.attributes, "New variant"),
    };

    const optionalNumericFields: Array<[keyof ProductVariantInput, string]> = [
      ["weightKg", draft.weightKg],
      ["lengthCm", draft.lengthCm],
      ["widthCm", draft.widthCm],
      ["heightCm", draft.heightCm],
    ];

    for (const [field, raw] of optionalNumericFields) {
      const trimmed = raw.trim();
      if (!trimmed) continue;

      const value = Number(trimmed);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`New variant: ${String(field)} must be a non-negative number.`);
      }

      if (field === "weightKg") payload.weightKg = value;
      if (field === "lengthCm") payload.lengthCm = value;
      if (field === "widthCm") payload.widthCm = value;
      if (field === "heightCm") payload.heightCm = value;
    }

    return payload;
  };

  const handleVariantUpdate = async (variantId: number) => {
    if (!token || !productData) return;

    const originalVariant = (productData.variants || []).find(
      (variant) => variant.id === variantId,
    );

    if (!originalVariant) {
      toast.error("Could not find variant to update.");
      return;
    }

    const draft = variantDrafts[variantId] || createVariantDraft(originalVariant);

    try {
      const payload = buildVariantPayload(originalVariant, draft);

      if (Object.keys(payload).length === 0) {
        toast.info("No variant changes to save.");
        return;
      }

      setVariantActionId(variantId);
      await updateProductVariant(token, Number(productData.id), variantId, payload);
      await refetch();
      toast.success("Variant updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update variant");
    } finally {
      setVariantActionId(null);
    }
  };

  const handleVariantDelete = async (variantId: number) => {
    if (!token || !productData) return;

    const confirmed = window.confirm("Delete this variant?");
    if (!confirmed) return;

    try {
      setVariantActionId(variantId);
      await deleteProductVariant(token, Number(productData.id), variantId);
      await refetch();
      toast.success("Variant deleted successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete variant");
    } finally {
      setVariantActionId(null);
    }
  };

  const handleAddVariant = async () => {
    if (!token || !productData) return;

    try {
      const payload = buildNewVariantPayload(newVariantDraft);
      setVariantActionId(-1);
      await addProductVariant(token, Number(productData.id), payload);
      setNewVariantDraft(createEmptyVariantDraft());
      await refetch();
      toast.success("Variant added successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to add variant");
    } finally {
      setVariantActionId(null);
    }
  };

  const handleResponseSubmit = async (
    inputKey: string,
    threadUserId?: number,
  ) => {
    if (!token || !productData) return;

    const response = (responseInputs[inputKey] ?? "").trim();

    if (!response) {
      setResponseErrors((prev) => ({
        ...prev,
        [inputKey]: "Response cannot be empty",
      }));
      return;
    }

    if (response.length < 1) {
      setResponseErrors((prev) => ({
        ...prev,
        [inputKey]: "Response must be at least 1 character long",
      }));
      return;
    }

    try {
      setGlobalLoading(true);
      const res = await addProductResponse(
        token,
        String(productData.id),
        response,
        threadUserId,
      );
      toast.success(res.message || "Response added successfully");
      setResponseInputs((prev) => ({ ...prev, [inputKey]: "" }));
      setResponseErrors((prev) => ({ ...prev, [inputKey]: "" }));
      await refetch();
    } catch (err) {
      console.error("Failed to submit response:", err);
      toast.error("Failed to submit response");
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleDeleteResponse = async (responseId: string) => {
    if (!token) return;

    try {
      setDeletingResponse(true);
      const res = await deleteProductResponse(token, responseId);
      toast.success(res.message || "Response deleted successfully");
      await refetch();
    } catch (err) {
      console.error("Failed to delete response:", err);
      toast.error("Failed to delete response");
    } finally {
      setDeletingResponse(false);
      setShowDeleteModal(false);
      setResponseToDelete(null);
    }
  };

  const handleDeleteProduct = async () => {
    if (!token || !productData) return;

    try {
      setDeletingProduct(true);
      await deleteProduct(token, Number(productData.id));
      toast.success("Product deleted successfully");
      router.push("/marketplace");
    } catch (err: any) {
      console.error("Failed to delete product:", err);
      toast.error(err.message || "Failed to delete product");
    } finally {
      setDeletingProduct(false);
      setShowDeleteProductModal(false);
    }
  };

  useEffect(() => {
    if (!token) return;

    const loadCategories = async () => {
      try {
        const data = await fetchCategories(token);
        setCategories(data);
      } catch (err) {
        console.error("Failed to load categories", err);
        toast.error("Could not load categories");
      }
    };
    loadCategories();
  }, [isEditModalOpen, token]);

  const product = productData;
  const isOwner = Boolean(product && product.userId === Number(user?.id));
  const canRespond = Boolean(token);
  const responseThreads = useMemo(
    () => buildResponseThreads(product?.responses || [], product?.userId || 0),
    [product?.responses, product?.userId],
  );
  const visibleThreads = isOwner
    ? responseThreads.threads
    : responseThreads.threads.filter(
        (thread) => thread.threadUserId === Number(user?.id),
      );
  const canStartThread = canRespond && !isOwner && visibleThreads.length === 0;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="loader">
          <div className="w-16 h-16 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Product not found
        </p>
        <Link href="/marketplace">
          <div className="px-4 py-2 bg-gold-600 text-white rounded-md hover:bg-gold-700 transition-colors">
            Back to Marketplace
          </div>
        </Link>
      </div>
    );
  }

  const defaultVariant =
    product.variants?.find((variant) => variant.isDefault)
    || product.variants?.[0];

  return (
    <>
      <Head>
        <title>{product.name} | PBC Dubai</title>
        <meta name="description" content={product.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container mx-auto px-4 py-8 pb-12 min-h-screen">
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <div className="inline-flex items-center text-sm text-gray-700 hover:text-gold-600 dark:text-gray-400 dark:hover:text-white">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                </svg>
                Home
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <Link href="/marketplace">
                  <div className="ml-1 text-sm text-gray-700 hover:text-gold-600 md:ml-2 dark:text-gray-400 dark:hover:text-white">
                    Marketplace
                  </div>
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-gray-400 truncate max-w-xs">
                  {product.name}
                </span>
              </div>
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-4">
            <div className="relative h-96 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
              <Image
                src={activeImage || product.primaryImage}
                alt={product.name}
                layout="fill"
                objectFit="contain"
                className="transition-opacity duration-300"
                priority={true}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[product.primaryImage, product.secondaryImage, product.tertiaryImage]
                .filter(Boolean)
                .map((imageSrc, index) => (
                  <button
                    key={`gallery-image-${index}`}
                    type="button"
                    onClick={() => setActiveImage(imageSrc as string)}
                    className={`relative h-24 rounded-md overflow-hidden border-2 transition-colors ${
                      (activeImage || product.primaryImage) === imageSrc
                        ? "border-gold-500"
                        : "border-gray-200 dark:border-gray-700"
                    }`}
                  >
                    <Image
                      src={imageSrc as string}
                      alt={`${product.name} preview ${index + 1}`}
                      layout="fill"
                      objectFit="cover"
                    />
                  </button>
                ))}
            </div>
          </div>

          <div>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {product.name}
              </h1>
              <div className="flex items-center mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                  Category:
                </span>
                <span className="bg-gold-100 text-gold-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-gold-900 dark:text-gold-300">
                  {product.category.name}
                </span>
              </div>
              <div className="flex items-center mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                  Brand:
                </span>
                <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">
                  {product.brand || "NA"}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                {defaultVariant
                  ? <CurrencyAmount amount={defaultVariant.price} />
                  : "View details for pricing"}
              </div>
              <div className="prose prose-sm dark:prose-invert mb-6">
                <p className="text-gray-700 dark:text-gray-300">
                  {product.description}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Seller Information
              </h3>
              <div className="flex items-center">
                <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 mr-3">
                  <Image
                    src={
                      product.user.profile?.profilePicture
                        ? product.user.profile.profilePicture
                        : demoImage
                    }
                    alt={product.user.name}
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {product.user.name}
                  </p>
                  <Link
                    key={product.user.id}
                    href={`/users/${product.user.id}`}
                  >
                    <button
                      className="text-sm text-gold-600 dark:text-gold-400 hover:underline"
                    >
                      Contact Seller
                    </button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mt-4">
              {product.user.id === Number(user?.id) && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setEditFormData(product);
                      setIsEditModalOpen(true);
                    }}
                    className="py-1 px-4 bg-yellow-500 hover:bg-yellow-700 text-white rounded-md flex items-center justify-center"
                  >
                    Edit Product
                  </button>
                  <button
                    onClick={() => setShowDeleteProductModal(true)}
                    className="py-1 px-4 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center justify-center"
                  >
                    Delete Product
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Variants
          </h3>

          {!product.variants || product.variants.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No variants available for this product.
            </p>
          ) : (
            <div className="space-y-4">
              {product.variants.map((variant, i) => {
                const draft = variantDrafts[variant.id] || createVariantDraft(variant);
                const variantAttributes =
                  (variant.attributes as Record<string, string> | undefined) || {};
                const attributeEntries = Object.entries(variantAttributes);

                return (
                  <div
                    key={variant.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-md p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        Variant #{i + 1}
                      </p>
                      {variant.isDefault && (
                        <span className="px-2 py-1 text-xs rounded-full bg-gold-100 text-gold-800 dark:bg-gold-900 dark:text-gold-300">
                          Default
                        </span>
                      )}
                    </div>

                    {isOwner ? (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input
                            type="text"
                            value={draft.sku}
                            onChange={(e) =>
                              handleVariantDraftChange(
                                variant.id,
                                "sku",
                                e.target.value,
                              )
                            }
                            placeholder="SKU"
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <input
                            type="number"
                            value={draft.price}
                            onChange={(e) =>
                              handleVariantDraftChange(
                                variant.id,
                                "price",
                                e.target.value,
                              )
                            }
                            placeholder="Price (required)"
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <input
                            type="number"
                            value={draft.stockQuantity}
                            onChange={(e) =>
                              handleVariantDraftChange(
                                variant.id,
                                "stockQuantity",
                                e.target.value,
                              )
                            }
                            placeholder="Stock quantity (required)"
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <input
                            type="number"
                            value={draft.weightKg}
                            onChange={(e) =>
                              handleVariantDraftChange(
                                variant.id,
                                "weightKg",
                                e.target.value,
                              )
                            }
                            placeholder="Weight (kg)"
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <input
                            type="number"
                            value={draft.lengthCm}
                            onChange={(e) =>
                              handleVariantDraftChange(
                                variant.id,
                                "lengthCm",
                                e.target.value,
                              )
                            }
                            placeholder="Length (cm)"
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <input
                            type="number"
                            value={draft.widthCm}
                            onChange={(e) =>
                              handleVariantDraftChange(
                                variant.id,
                                "widthCm",
                                e.target.value,
                              )
                            }
                            placeholder="Width (cm)"
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <input
                            type="number"
                            value={draft.heightCm}
                            onChange={(e) =>
                              handleVariantDraftChange(
                                variant.id,
                                "heightCm",
                                e.target.value,
                              )
                            }
                            placeholder="Height (cm)"
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
                              onClick={() => addVariantAttributeRow(variant.id)}
                              className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded"
                            >
                              Add Attribute
                            </button>
                          </div>

                          <div className="space-y-2">
                            {draft.attributes.map((attribute, attributeIndex) => (
                              <div
                                key={`variant-${variant.id}-attribute-${attributeIndex}`}
                                className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2"
                              >
                                <input
                                  type="text"
                                  placeholder="Key"
                                  value={attribute.key}
                                  onChange={(e) =>
                                    handleVariantAttributeChange(
                                      variant.id,
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
                                      variant.id,
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
                                    removeVariantAttributeRow(
                                      variant.id,
                                      attributeIndex,
                                    )
                                  }
                                  className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <input
                              type="checkbox"
                              checked={draft.isDefault}
                              onChange={(e) =>
                                handleVariantDraftChange(
                                  variant.id,
                                  "isDefault",
                                  e.target.checked,
                                )
                              }
                            />
                            Mark as default
                          </label>
                          <button
                            type="button"
                            onClick={() => handleVariantUpdate(variant.id)}
                            disabled={variantActionId === variant.id}
                            className="px-3 py-1 bg-gold-600 hover:bg-gold-700 text-white text-sm rounded-md disabled:opacity-60"
                          >
                            {variantActionId === variant.id
                              ? "Saving..."
                              : "Save Variant"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVariantDelete(variant.id)}
                            disabled={variantActionId === variant.id}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md disabled:opacity-60"
                          >
                            Delete Variant
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              SKU
                            </p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                              {variant.sku || "N/A"}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              Price
                            </p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                              <CurrencyAmount amount={variant.price} />
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              Stock
                            </p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                              {variant.stockQuantity}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              Weight
                            </p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                              {variant.weightKg ? `${variant.weightKg} kg` : "N/A"}
                            </p>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              Dimensions
                            </p>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                              {variant.lengthCm && variant.widthCm && variant.heightCm
                                ? `${variant.lengthCm} x ${variant.widthCm} x ${variant.heightCm} cm`
                                : "N/A"}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Attributes
                          </p>
                          {attributeEntries.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {attributeEntries.map(([key, value]) => (
                                <span
                                  key={`${variant.id}-${key}`}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gold-50 text-gold-800 border border-gold-200 dark:bg-gold-900/30 dark:text-gold-200 dark:border-gold-800"
                                >
                                  <span className="opacity-80">{key}:</span>
                                  <span>{value}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              No attributes specified.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Responses
          </h3>

          {visibleThreads.length > 0 ? (
            <div className="space-y-6">
              {visibleThreads.map((thread) => {
                const threadKey = String(thread.threadUserId);
                const threadInput = responseInputs[threadKey] ?? "";
                const threadError = responseErrors[threadKey];
                const threadLabel =
                  thread.threadUser?.name || `User #${thread.threadUserId}`;

                return (
                  <div
                    key={thread.threadUserId}
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                  >
                    <div className="mb-4">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Conversation with
                      </p>
                      <p className="text-base font-semibold text-gray-800 dark:text-white">
                        {threadLabel}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {thread.responses.map((responseItem) => (
                        <div
                          key={responseItem.id}
                          className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-650 transition-colors group border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-start">
                            <div className="mr-3 mt-1">
                              {/* @ts-ignore */}
                              <HiUserCircle className="h-8 w-8 text-gray-400" />
                            </div>
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="font-medium text-gray-800 dark:text-white">
                                  {Number(responseItem.user.id) === Number(user?.id)
                                    ? "You"
                                    : responseItem.user.name}
                                </span>
                                {responseItem.user?.Role?.name && (
                                  <span className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400 text-xs font-medium px-2 py-0.5 rounded">
                                    {responseItem.user.Role.name}
                                  </span>
                                )}
                                <span className="text-gray-500 dark:text-gray-400 text-xs">
                                  {formatDateAndTime(responseItem.createdAt, true)}
                                </span>

                                {Number(responseItem.user.id) === Number(user?.id) && (
                                  <button
                                    onClick={() => {
                                      setResponseToDelete(responseItem.id);
                                      setShowDeleteModal(true);
                                    }}
                                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {responseItem.response}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {canRespond && (
                      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                        <h3 className="font-medium text-gray-800 dark:text-gold-500 mb-3">
                          Reply in this thread
                        </h3>
                        <div className="flex">
                          <div className="mr-3 mt-1">
                            {/* @ts-ignore */}
                            <HiUserCircle className="h-8 w-8 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <Textarea
                              value={threadInput}
                              onChange={(e) => {
                                const value = e.target.value;
                                setResponseInputs((prev) => ({
                                  ...prev,
                                  [threadKey]: value,
                                }));
                                if (value.trim().length >= 1) {
                                  setResponseErrors((prev) => ({
                                    ...prev,
                                    [threadKey]: "",
                                  }));
                                }
                              }}
                              placeholder="Type your response..."
                              rows={3}
                              className={`bg-white dark:bg-gray-700 border ${
                                threadError
                                  ? "border-red-500"
                                  : "border-gray-300 dark:border-gray-600"
                              } text-gray-800 dark:text-white w-full rounded-lg p-3`}
                            />
                            {threadError && (
                              <p className="text-red-500 text-sm mt-1">
                                {threadError}
                              </p>
                            )}
                            <div className="mt-3 flex justify-end">
                              <Button
                                onClick={() =>
                                  handleResponseSubmit(
                                    threadKey,
                                    isOwner ? thread.threadUserId : undefined,
                                  )
                                }
                                className="bg-gold-500 hover:bg-gold-600 text-black flex items-center"
                              >
                                Post Response
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 italic">
              {isOwner
                ? "No conversations yet. Members can start a thread here."
                : "No responses yet. Start the discussion by adding a comment."}
            </p>
          )}

          {canStartThread && (
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
              <h3 className="font-medium text-gray-800 dark:text-gold-500 mb-3">
                Start a new thread
              </h3>
              <div className="flex">
                <div className="mr-3 mt-1">
                  {/* @ts-ignore */}
                  <HiUserCircle className="h-8 w-8 text-gray-400" />
                </div>
                <div className="flex-1">
                  <Textarea
                    value={responseInputs[String(user?.id ?? "new")] || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      const inputKey = String(user?.id ?? "new");
                      setResponseInputs((prev) => ({
                        ...prev,
                        [inputKey]: value,
                      }));
                      if (value.trim().length >= 1) {
                        setResponseErrors((prev) => ({
                          ...prev,
                          [inputKey]: "",
                        }));
                      }
                    }}
                    placeholder="Type your response..."
                    rows={3}
                    className={`bg-white dark:bg-gray-700 border ${
                      responseErrors[String(user?.id ?? "new")]
                        ? "border-red-500"
                        : "border-gray-300 dark:border-gray-600"
                    } text-gray-800 dark:text-white w-full rounded-lg p-3`}
                  />

                  {responseErrors[String(user?.id ?? "new")] && (
                    <p className="text-red-500 text-sm mt-1">
                      {responseErrors[String(user?.id ?? "new")]}
                    </p>
                  )}

                  <div className="mt-3 flex justify-end">
                    <Button
                      onClick={() =>
                        handleResponseSubmit(String(user?.id ?? "new"))
                      }
                      className="bg-gold-500 hover:bg-gold-600 text-black flex items-center"
                    >
                      Post Response
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {product.user.id === Number(user?.id) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Add New Variant
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={newVariantDraft.sku}
                onChange={(e) => handleNewVariantFieldChange("sku", e.target.value)}
                placeholder="SKU (optional)"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="number"
                value={newVariantDraft.price}
                onChange={(e) => handleNewVariantFieldChange("price", e.target.value)}
                placeholder="Price"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="number"
                value={newVariantDraft.stockQuantity}
                onChange={(e) =>
                  handleNewVariantFieldChange("stockQuantity", e.target.value)
                }
                placeholder="Stock"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="number"
                value={newVariantDraft.weightKg}
                onChange={(e) => handleNewVariantFieldChange("weightKg", e.target.value)}
                placeholder="Weight (kg)"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="number"
                value={newVariantDraft.lengthCm}
                onChange={(e) => handleNewVariantFieldChange("lengthCm", e.target.value)}
                placeholder="Length (cm)"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="number"
                value={newVariantDraft.widthCm}
                onChange={(e) => handleNewVariantFieldChange("widthCm", e.target.value)}
                placeholder="Width (cm)"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <input
                type="number"
                value={newVariantDraft.heightCm}
                onChange={(e) => handleNewVariantFieldChange("heightCm", e.target.value)}
                placeholder="Height (cm)"
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
                  onClick={addNewVariantAttributeRow}
                  className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded"
                >
                  Add Attribute
                </button>
              </div>

              <div className="space-y-2">
                {newVariantDraft.attributes.map((attribute, attributeIndex) => (
                  <div
                    key={`new-variant-attribute-${attributeIndex}`}
                    className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Key"
                      value={attribute.key}
                      onChange={(e) =>
                        handleNewVariantAttributeChange(
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
                        handleNewVariantAttributeChange(
                          attributeIndex,
                          "value",
                          e.target.value,
                        )
                      }
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewVariantAttributeRow(attributeIndex)}
                      className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={newVariantDraft.isDefault}
                  onChange={(e) =>
                    handleNewVariantFieldChange("isDefault", e.target.checked)
                  }
                />
                Mark as default
              </label>
              <button
                type="button"
                onClick={handleAddVariant}
                disabled={variantActionId === -1}
                className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white text-sm rounded-md disabled:opacity-60"
              >
                {variantActionId === -1 ? "Adding..." : "Add Variant"}
              </button>
            </div>
          </div>
        )}

        {isEditModalOpen && editFormData && (
          <UniversalFormModal
            title="Edit Product"
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSubmit={handleEditSubmit}
            isSubmitting={isRefetching || isAdding}
            fields={[
              {
                id: "name",
                label: "Product Name",
                type: "text",
                value: editFormData.name,
                onChange: (e) =>
                  setEditFormData((prev) => ({
                    ...prev!,
                    name: e.target.value,
                  })),
              },
              {
                id: "brand",
                label: "Brand",
                type: "text",
                value: editFormData.brand || "",
                onChange: (e) =>
                  setEditFormData((prev) => ({
                    ...prev!,
                    brand: e.target.value,
                  })),
              },
              {
                id: "description",
                label: "Description",
                type: "textarea",
                value: editFormData.description,
                onChange: (e) =>
                  setEditFormData((prev) => ({
                    ...prev!,
                    description: e.target.value,
                  })),
              },
              {
                id: "categoryId",
                label: "Category",
                type: "select",
                value: editFormData.categoryId,
                onChange: (e) =>
                  setEditFormData((prev) => ({
                    ...prev!,
                    categoryId: parseInt(e.target.value),
                  })),
                options: categories.map((cat) => ({
                  label: cat.name,
                  value: cat.id.toString(),
                })),
              },
              {
                id: "primaryImage",
                label: "Primary Image",
                type: "file",
                onChange: (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setEditFormData((prev) => ({
                      ...prev!,
                      primaryImage: file,
                    }));
                  }
                },
                preview: getPreviewSource(editFormData.primaryImage),
                value: undefined,
              },
              {
                id: "secondaryImage",
                label: "Secondary Image",
                type: "file",
                onChange: (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setEditFormData((prev) => ({
                      ...prev!,
                      secondaryImage: file,
                    }));
                  }
                },
                preview: getPreviewSource(editFormData.secondaryImage),
                value: undefined,
              },
              {
                id: "tertiaryImage",
                label: "Tertiary Image",
                type: "file",
                onChange: (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setEditFormData((prev) => ({
                      ...prev!,
                      tertiaryImage: file,
                    }));
                  }
                },
                preview: getPreviewSource(editFormData.tertiaryImage),
                value: undefined,
              },
            ]}
          />
        )}
      </div>
      <ConfirmationModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setResponseToDelete(null);
        }}
        onConfirm={() => {
          if (responseToDelete) {
            handleDeleteResponse(responseToDelete);
          }
        }}
        title="Delete Response"
        message="Are you sure you want to delete this response? This action cannot be undone."
        confirmText="Delete"
        confirmColor="red"
        isProcessing={deletingResponse}
      />
      <ConfirmationModal
        show={showDeleteProductModal}
        onClose={() => setShowDeleteProductModal(false)}
        onConfirm={handleDeleteProduct}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        confirmColor="red"
        isProcessing={deletingProduct}
      />
    </>
  );
}
