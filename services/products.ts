import { Product } from "@/types/marketplace";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface ProductVariantInput {
  sku?: string;
  price: number;
  stockQuantity: number;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  attributes?: Record<string, string>;
  isDefault: boolean;
}

export interface AddProductPayload {
  name: string;
  brand: string;
  description: string;
  categoryId: number;
  primaryImage: File;
  secondaryImage?: File | null;
  tertiaryImage?: File | null;
  variants: ProductVariantInput[];
}

export interface UpdateProductPayload {
  name?: string;
  brand?: string;
  description?: string;
  categoryId?: number;
  primaryImage?: File | null;
  secondaryImage?: File | null;
  tertiaryImage?: File | null;
}

export interface UpdateProductVariantPayload {
  sku?: string;
  price?: number;
  stockQuantity?: number;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  attributes?: Record<string, string>;
  isDefault?: boolean;
}

const parseApiResponse = async (res: Response, fallbackMessage: string) => {
  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || fallbackMessage);
  }

  return result;
};

export const fetchUserProducts = async (
  token: string,
  page: number,
  limit: number,
): Promise<Product[]> => {
  const res = await fetch(
    `${API_URL}/api/product/my/products?page=${page}&limit=${limit}`,
    {
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch products");
  }

  return data.data;
};

export const addProduct = async (token: string, payload: AddProductPayload) => {
  const formData = new FormData();

  formData.append("name", payload.name);
  formData.append("brand", payload.brand);
  formData.append("description", payload.description);
  formData.append("categoryId", String(payload.categoryId));
  formData.append("primaryImage", payload.primaryImage);

  if (payload.secondaryImage) {
    formData.append("secondaryImage", payload.secondaryImage);
  }

  if (payload.tertiaryImage) {
    formData.append("tertiaryImage", payload.tertiaryImage);
  }

  formData.append("variants", JSON.stringify(payload.variants));

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/product/add`,
    {
      method: "POST",
      headers: { token },
      body: formData,
    },
  );

  const result = await parseApiResponse(res, "Failed to add product");

  return result.data;
};

export const getProduct = async (
  token: string,
  id: string,
): Promise<Product> => {
  const res = await fetch(`${API_URL}/api/product/${id}`, {
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch product");
  }

  return data.data;
};

export const addProductResponse = async (
  token: string,
  productId: string,
  response: string,
  threadUserId?: number,
): Promise<{ data: unknown; message: string }> => {
  const res = await fetch(`${API_URL}/api/response/product`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token,
    },
    body: JSON.stringify({
      productId,
      response,
      ...(threadUserId ? { threadUserId } : {}),
    }),
  });

  return parseApiResponse(res, "Failed to add response");
};

export const deleteProductResponse = async (
  token: string,
  responseId: string,
): Promise<{ data: unknown; message: string }> => {
  const res = await fetch(`${API_URL}/api/response/${responseId}`, {
    method: "DELETE",
    headers: {
      token,
    },
  });

  return parseApiResponse(res, "Failed to delete response");
};

export const updateProduct = async (
  token: string,
  userId: number,
  productId: number,
  payload: UpdateProductPayload,
) => {
  const formData = new FormData();

  if (payload.name) formData.append("name", payload.name);
  if (payload.brand) formData.append("brand", payload.brand);
  if (payload.description) formData.append("description", payload.description);
  if (payload.categoryId !== undefined) {
    formData.append("categoryId", String(payload.categoryId));
  }

  if (payload.primaryImage) {
    formData.append("primaryImage", payload.primaryImage);
  }

  if (payload.secondaryImage) {
    formData.append("secondaryImage", payload.secondaryImage);
  }

  if (payload.tertiaryImage) {
    formData.append("tertiaryImage", payload.tertiaryImage);
  }

  const res = await fetch(`${API_URL}/api/product/${productId}`, {
    method: "PATCH",
    headers: {
      token,
      userId: String(userId),
    },
    body: formData,
  });

  const result = await parseApiResponse(res, "Failed to update product");

  return result.data;
};

export const updateProductVariant = async (
  token: string,
  productId: number,
  variantId: number,
  payload: UpdateProductVariantPayload,
) => {
  const res = await fetch(
    `${API_URL}/api/product/${productId}/variants/${variantId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify(payload),
    },
  );

  const result = await parseApiResponse(
    res,
    "Failed to update product variant",
  );

  return result.data;
};

export const addProductVariant = async (
  token: string,
  productId: number,
  payload: ProductVariantInput,
) => {
  const res = await fetch(`${API_URL}/api/product/${productId}/variants`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token,
    },
    body: JSON.stringify(payload),
  });

  const result = await parseApiResponse(res, "Failed to add product variant");
  return result.data;
};

export const deleteProductVariant = async (
  token: string,
  productId: number,
  variantId: number,
) => {
  const res = await fetch(
    `${API_URL}/api/product/${productId}/variants/${variantId}`,
    {
      method: "DELETE",
      headers: {
        token,
      },
    },
  );

  const result = await parseApiResponse(
    res,
    "Failed to delete product variant",
  );

  return result.data;
};

export const deleteProduct = async (
  token: string,
  productId: number,
) => {
  const res = await fetch(
    `${API_URL}/api/product/${productId}`,
    {
      method: "DELETE",
      headers: {
        token,
      },
    },
  );

  const result = await parseApiResponse(
    res,
    "Failed to delete product",
  );

  return result.data;
};

export const fetchAllProducts = async (token: string): Promise<Product[]> => {
  const res = await fetch(`${API_URL}/api/product`, {
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch products");
  }

  return data.data;
};
