import { Order } from "@/types/marketplace";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const fetchUserOrders = async (
  token: string,
  page: number,
  limit: number,
): Promise<Order[]> => {
  const res = await fetch(
    `${API_URL}/api/order/my/orders?page=${page}&limit=${limit}`,
    {
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch orders");
  }

  return data.data;
};

export const addOrder = async (token: string, formData: FormData) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/order/add`, {
    method: "POST",
    headers: { token },
    body: formData,
  });

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || "Failed to add order");
  }

  return result.data;
};

export const confirmOrder = async (
  token: string,
  addressId: number,
  transactionId: string,
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/cart/checkout`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify({
        addressId,
        transactionId,
      }),
    },
  );

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || "Failed to confirm order");
  }

  return result.data;
};

export const confirmPayment = async (
  token: string,
  addressId: number,
  transactionId: string,
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/cart/confirm-payment`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify({
        addressId,
        transactionId,
      }),
    },
  );

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || "Failed to confirm payment");
  }

  return result.data;
};
