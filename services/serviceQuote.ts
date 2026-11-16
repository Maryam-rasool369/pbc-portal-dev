const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface ServiceQuotePayload {
  serviceRfqId: string;
  price: number;
  description: string;
  timeline: string;
  termsAndConditions: string;
  primaryImage?: File;
  secondaryImage?: File;
}

export const addServiceQuote = async (
  token: string,
  payload: ServiceQuotePayload,
) => {
  const formData = new FormData();
  formData.append("serviceRfqId", payload.serviceRfqId);
  formData.append("price", payload.price.toString());
  formData.append("description", payload.description);
  formData.append("timeline", payload.timeline);
  formData.append("termsAndConditions", payload.termsAndConditions);
  if (payload.primaryImage) formData.append("primaryImage", payload.primaryImage);
  if (payload.secondaryImage) formData.append("secondaryImage", payload.secondaryImage);

  const res = await fetch(`${API_URL}/api/service-quote/add`, {
    method: "POST",
    headers: { token },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to submit service quote");
  }
  return data;
};

export const updateServiceQuote = async (
  token: string,
  serviceQuoteId: number,
  data: { price?: number; description?: string; termsAndConditions?: string },
) => {
  const res = await fetch(`${API_URL}/api/service-quote/${serviceQuoteId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify(data),
  });

  const responseData = await res.json();
  if (!res.ok || responseData.error) {
    throw new Error(responseData.error?.[0]?.msg || "Failed to update service quote");
  }
  return responseData;
};

export const deleteServiceQuote = async (
  token: string,
  serviceQuoteId: number,
) => {
  const res = await fetch(`${API_URL}/api/service-quote/${serviceQuoteId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", token },
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to delete service quote");
  }
  return data;
};

export const addServiceQuoteResponse = async (
  token: string,
  serviceQuoteId: number,
  response: string,
) => {
  const res = await fetch(`${API_URL}/api/response/service-quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify({ serviceQuoteId, response: response.trim() }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to add response");
  }
  return data;
};

export const deleteServiceQuoteResponse = async (
  token: string,
  responseId: string,
) => {
  const res = await fetch(`${API_URL}/api/response/${responseId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", token },
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error?.[0]?.msg || "Failed to delete response");
  }
  return { message: "Response deleted successfully" };
};
