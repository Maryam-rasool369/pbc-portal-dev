import { GeneralResponse } from "@/types/global";

interface Wishlist {
  id: number;
  userId: number;
  title: string;
  suggestions: string;
  status: "PENDING" | "RESOLVED_AND_CLOSED" | "UNRESOLVED_AND_CLOSED";
  comment?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string;
    Role?: {
      id: number;
      name: string;
    };
  };
  responses: GeneralResponse[];
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = (token: string) => ({
  "Content-Type": "application/json",
  token,
});

/**
 * Fetch all wishlists with optional filtering
 */
export const fetchWishlists = async (
  token: string,
  page = 1,
  limit = 10,
  status = "",
  myWishlists = false,
): Promise<PaginatedResponse<Wishlist>> => {
  const myWishlistUrl = myWishlists ? "/my" : "";
  let url = `${API_URL}/api/wishlist${myWishlistUrl}?page=${page}&limit=${limit}`;

  if (status) {
    url += `&status=${status}`;
  }

  const res = await fetch(url, {
    headers: getAuthHeaders(token),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch wishlists");
  }

  return data;
};

/**
 * Fetch a single wishlist by ID
 */
export const fetchWishlistById = async (
  token: string,
  wishlistId: string | string[],
): Promise<Wishlist> => {
  const res = await fetch(`${API_URL}/api/wishlist/${wishlistId}`, {
    headers: getAuthHeaders(token),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch wishlist");
  }

  return data.data;
};

/**
 * Create a new wishlist
 */
export const createWishlist = async (
  token: string,
  payload: { title: string; suggestions: string },
): Promise<{ data: Wishlist; message: string }> => {
  const res = await fetch(`${API_URL}/api/wishlist`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to create wishlist");
  }

  return data;
};

/**
 * Update wishlist details
 */
export const updateWishlist = async (
  token: string,
  wishlistId: string | string[],
  payload: { title: string; suggestions: string },
): Promise<{ data: Wishlist; message: string }> => {
  const res = await fetch(`${API_URL}/api/wishlist/${wishlistId}`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to update wishlist");
  }

  return data.data;
};

/**
 * Delete a wishlist
 */
export const deleteWishlist = async (
  token: string,
  wishlistId: string | string[],
): Promise<{ data: Wishlist; message: string }> => {
  const res = await fetch(`${API_URL}/api/wishlist/${wishlistId}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to delete wishlist");
  }

  return data;
};

/**
 * Update wishlist status (approve/reject)
 */
export const updateWishlistStatus = async (
  token: string,
  wishlistId: string | string[],
  status: "RESOLVED_AND_CLOSED" | "UNRESOLVED_AND_CLOSED",
  comment: string,
): Promise<{ data: Wishlist; message: string }> => {
  const res = await fetch(`${API_URL}/api/wishlist/status/${wishlistId}`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ status, comment }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to update wishlist status");
  }

  return data;
};

/**
 * Add response to a wishlist
 */
export const addWishlistResponse = async (
  token: string,
  wishlistId: string | string[],
  response: string,
  threadUserId?: number,
): Promise<{ data: any; message: string }> => {
  const res = await fetch(`${API_URL}/api/response/wishlist`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({
      wishlistId,
      response,
      ...(threadUserId ? { threadUserId } : {}),
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to add response");
  }

  return data;
};

/**
 * Delete a response
 */
export const deleteResponse = async (
  token: string,
  responseId: string,
): Promise<{ data: Wishlist; message: string }> => {
  const res = await fetch(`${API_URL}/api/response/${responseId}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to delete response");
  }

  return data;
};

export const exportWishlistsToExcel = async (
  token: string,
  status: "PENDING" | "RESOLVED_AND_CLOSED" | "UNRESOLVED_AND_CLOSED" | "ALL",
): Promise<Blob> => {
  const query = status === "ALL" ? "" : `?status=${status}`;
  const res = await fetch(`${API_URL}/api/wishlist/export/excel${query}`, {
    method: "GET",
    headers: {
      token,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error?.[0]?.msg || "Failed to export wishlists");
  }

  return await res.blob();
};
