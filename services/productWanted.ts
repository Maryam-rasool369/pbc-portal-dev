import { ProductWanted } from "@/types/marketplace";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface AddProductWantedPayload {
  name: string;
  description: string;
  quantity: number;
  categoryId: number;
  primaryImage?: File | null;
  secondaryImage?: File | null;
}

export interface UpdateProductWantedPayload {
  name?: string;
  description?: string;
  quantity?: number;
  categoryId?: number;
  primaryImage?: File | null;
  secondaryImage?: File | null;
}

const parseApiResponse = async (res: Response, fallbackMessage: string) => {
  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || fallbackMessage);
  }

  return result;
};

export const fetchUserProductsWanted = async (
  token: string,
  page: number,
  limit: number,
): Promise<ProductWanted[]> => {
  const res = await fetch(
    `${API_URL}/api/product-wanted/my/products-wanted?page=${page}&limit=${limit}`,
    {
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );

  const result = await parseApiResponse(res, "Failed to fetch products wanted");

  return result.data;
};

export const fetchAllProductsWanted = async (
  token: string,
): Promise<ProductWanted[]> => {
  const res = await fetch(`${API_URL}/api/product-wanted`, {
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  const result = await parseApiResponse(res, "Failed to fetch products wanted");

  return result.data;
};

export const getProductWanted = async (
  token: string,
  id: string,
): Promise<ProductWanted> => {
  const res = await fetch(`${API_URL}/api/product-wanted/${id}`, {
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  const result = await parseApiResponse(res, "Failed to fetch product wanted");

  return result.data;
};

export const addProductWanted = async (
  token: string,
  payload: AddProductWantedPayload,
) => {
  const formData = new FormData();

  formData.append("name", payload.name);
  formData.append("description", payload.description);
  formData.append("quantity", String(payload.quantity));
  formData.append("categoryId", String(payload.categoryId));

  if (payload.primaryImage) {
    formData.append("primaryImage", payload.primaryImage);
  }

  if (payload.secondaryImage) {
    formData.append("secondaryImage", payload.secondaryImage);
  }

  const res = await fetch(`${API_URL}/api/product-wanted/add`, {
    method: "POST",
    headers: { token },
    body: formData,
  });

  const result = await parseApiResponse(res, "Failed to add product wanted");

  return result.data;
};

export const updateProductWanted = async (
  token: string,
  productWantedId: number,
  payload: UpdateProductWantedPayload,
) => {
  const formData = new FormData();

  if (payload.name) formData.append("name", payload.name);
  if (payload.description) formData.append("description", payload.description);
  if (payload.quantity !== undefined) {
    formData.append("quantity", String(payload.quantity));
  }
  if (payload.categoryId !== undefined) {
    formData.append("categoryId", String(payload.categoryId));
  }

  if (payload.primaryImage) {
    formData.append("primaryImage", payload.primaryImage);
  }

  if (payload.secondaryImage) {
    formData.append("secondaryImage", payload.secondaryImage);
  }

  const res = await fetch(`${API_URL}/api/product-wanted/${productWantedId}`, {
    method: "PATCH",
    headers: { token },
    body: formData,
  });

  const result = await parseApiResponse(
    res,
    "Failed to update product wanted",
  );

  return result.data;
};

export const deleteProductWanted = async (
  token: string,
  productWantedId: number,
) => {
  const res = await fetch(`${API_URL}/api/product-wanted/${productWantedId}`, {
    method: "DELETE",
    headers: {
      token,
    },
  });

  const result = await parseApiResponse(
    res,
    "Failed to delete product wanted",
  );

  return result.data;
};

export const addProductWantedResponse = async (
  token: string,
  productWantedId: string,
  response: string,
  threadUserId?: number,
): Promise<{ data: unknown; message: string }> => {
  const res = await fetch(`${API_URL}/api/response/product-wanted`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token,
    },
    body: JSON.stringify({
      productWantedId,
      response,
      ...(threadUserId ? { threadUserId } : {}),
    }),
  });

  return parseApiResponse(res, "Failed to add response");
};

export const deleteProductWantedResponse = async (
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
