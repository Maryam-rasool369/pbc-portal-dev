import { Order, PaginatedOrderResponse } from "@/types/order";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Fetch user's own orders
export const fetchMyOrders = async (
  token: string,
  page: number = 1,
  limit: number = 10,
  filters: Record<string, string> = {}
): Promise<PaginatedOrderResponse> => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...filters
  });



  const res = await fetch(
    `${API_URL}/api/order/my/orders?${queryParams.toString()}`,
    {
      headers: {
        "Content-Type": "application/json",
        token,
      },
    }
  );

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch my orders");
  }

  return data;
};

// Fetch all orders (admin only)
export const fetchAllOrders = async (
  token: string,
  page: number = 1,
  limit: number = 10,
  filters: Record<string, string> = {}
): Promise<PaginatedOrderResponse> => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...filters
  });

 

  const res = await fetch(
    `${API_URL}/api/order?${queryParams.toString()}`,
    {
      headers: {
        "Content-Type": "application/json",
        token,
      },
    }
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch all orders");
  }
  return data;
};

export const fetchSellerOrders = async (
  token: string,
  page: number = 1,
  limit: number = 10,
  filters: Record<string, string> = {}
): Promise<PaginatedOrderResponse> => {
  // Build query string properly
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...filters
  });

  const res = await fetch(
    `${API_URL}/api/order/seller/orders?${queryParams.toString()}`,
    {
      headers: {
        "Content-Type": "application/json",
        token,
      },
    }
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch seller orders");
  }

  return data;
};

// Get order details by ID
export const fetchOrderById = async (
  token: string,
  orderId: number
): Promise<Order> => {
  const res = await fetch(
    `${API_URL}/api/order/${orderId}`,
    {
      headers: {
        "Content-Type": "application/json",
        token,
      },
    }
  );

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch order details");
  }

  return data.data;
}; 