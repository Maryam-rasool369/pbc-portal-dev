import { ServiceRFQ } from "@/types/marketplace";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const fetchUserServiceRFQs = async (
  token: string,
  page: number,
  limit: number,
): Promise<ServiceRFQ[]> => {
  const res = await fetch(
    `${API_URL}/api/service-rfq/my/service-rfqs?page=${page}&limit=${limit}`,
    {
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch Service RFQs");
  }

  return data.data;
};

export const addServiceRFQ = async (token: string, formData: FormData) => {
  const res = await fetch(`${API_URL}/api/service-rfq/add`, {
    method: "POST",
    headers: { token },
    body: formData,
  });

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || "Failed to add Service RFQ");
  }

  return result.data;
};

export const updateServiceRFQ = async (
  token: string,
  serviceRfqId: number,
  formData: FormData,
) => {
  const res = await fetch(`${API_URL}/api/service-rfq/${serviceRfqId}`, {
    method: "PUT",
    headers: { token },
    body: formData,
  });

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || result.message || "Failed to update Service RFQ");
  }

  return result.data;
};

export const fetchServiceRFQDetail = async (token: string, id: string | string[]) => {
  const response = await fetch(`${API_URL}/api/service-rfq/${id}`, {
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch Service RFQ details");
  }

  return data;
};

export const deleteServiceRFQ = async (token: string, serviceRfqId: number) => {
  const response = await fetch(`${API_URL}/api/service-rfq/${serviceRfqId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to delete Service RFQ");
  }

  return data;
};

export const awardServiceQuote = async (
  token: string,
  serviceRfqId: string | string[],
  serviceQuoteId: number,
) => {
  const response = await fetch(
    `${API_URL}/api/service-rfq/award/${serviceRfqId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify({ serviceQuoteId }),
    },
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to award service quote");
  }

  return data;
};
