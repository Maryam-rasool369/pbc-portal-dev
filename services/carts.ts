import { Cart } from "@/types/marketplace";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const fetchUserCarts = async (token: string): Promise<Cart[]> => {
  const res = await fetch(`${API_URL}/api/cart`, {
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  const data = await res.json();

  return data;
};

export const addToCart = async (token: string, productId: number) => {
  if (!token) throw new Error("Authentication required");
  const res = await fetch(`${API_URL}/api/cart/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token,
    },
    body: JSON.stringify({ productId }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to add to cart");
  }

  return data.data;
};

export const removeFromCart = async (token: string, productId: number) => {
  const parsedId = Number(productId);
  if (!token) throw new Error("Missing token");
  if (isNaN(parsedId)) throw new Error("Invalid productId. Must be a number");

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/cart/${parsedId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || "Failed to remove from cart");
  }

  return result.data;
};

export const addAddress = async (
  token: string,
  payload: Record<string, any>,
) => {
  if (!token) throw new Error("Authentication required");

  const res = await fetch(`${API_URL}/api/address/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to add address");
  }

  return data.data;
};

export const verifyDiscount = async (token: string, discountCode: string) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/cart/apply-discount`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          token,
        },
        body: JSON.stringify({ discountCode }),
      },
    );

    if (!response.ok) throw new Error("Discount verification failed");

    return await response.json();
  } catch (err: any) {
    throw new Error(err.message || "Something went wrong");
  }
};
