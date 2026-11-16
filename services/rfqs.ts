import { RFQ } from "@/types/marketplace";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const fetchUserRFQs = async (
  token: string,
  page: number,
  limit: number,
): Promise<RFQ[]> => {
  const res = await fetch(
    `${API_URL}/api/rfq/my/rfqs?page=${page}&limit=${limit}`,
    {
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch RFQs");
  }

  return data.data;
};

export const addRFQ = async (token: string, formData: FormData) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/rfq/add`, {
    method: "POST",
    headers: { token },
    body: formData,
  });

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || "Failed to add RFQ");
  }

  return result.data;
};

export const updateRFQ = async (
  token: string,
  rfqId: number,
  formData: FormData,
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/rfq/${rfqId}`,
    {
      method: "PUT",
      headers: {
        token,
      },
      body: formData,
    },
  );

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(
      result.error?.[0]?.msg || result.message || "Failed to update RFQ",
    );
  }

  return result.data;
};

export const fetchRFQDetail = async (token: string, id: string | string[]) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/rfq/${id}`,
    {
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch RFQ details");
  }

  return data;
};

export const awardQuote = async (
  token: string,
  rfqId: string | string[],
  quoteId: number,
) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/rfq/award/${rfqId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify({ quoteId }),
    },
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to award quote");
  }

  return data;
};

export const deleteRFQ = async (token: string, rfqId: number) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/rfq/${rfqId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to delete RFQ");
  }

  return data;
};
