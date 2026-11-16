// services/quotes.ts

export interface QuotePayload {
  rfqId: string;
  price: number;
  description: string;
  timeline: string;
  termsAndConditions: string;
  primaryImage?: File;
  secondaryImage?: File;
}

export const addQuote = async (token: string, payload: QuotePayload) => {
  const formData = new FormData();

  formData.append("rfqId", payload.rfqId);
  formData.append("price", payload.price.toString());
  formData.append("description", payload.description);
  formData.append("timeline", payload.timeline);
  formData.append("termsAndConditions", payload.termsAndConditions);

  if (payload.primaryImage) {
    formData.append("primaryImage", payload.primaryImage);
  }

  if (payload.secondaryImage) {
    formData.append("secondaryImage", payload.secondaryImage);
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/quote/add`,
    {
      method: "POST",
      headers: {
        token,
      },
      body: formData,
    },
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to submit quote");
  }

  return data;
};

export const updateQuote = async (
  token: string,
  quoteId: number,
  data: Partial<QuotePayload>,
): Promise<any> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/quote/${quoteId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify({
        price: data.price,
        description: data.description,
        termsAndConditions: data.termsAndConditions,
      }),
    },
  );

  const responseData = await res.json();

  if (!res.ok) {
    throw new Error(responseData.error?.[0]?.msg || "Failed to update quote");
  }

  return responseData;
};

export const deleteQuote = async (token: string, quoteId: number) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/quote/${quoteId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to delete quote");
  }

  return data;
};

export const deleteQuoteResponse = async (
  token: string,
  responseId: string,
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/response/${responseId}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error?.[0]?.msg || "Failed to delete response");
  }

  return { message: "Response deleted successfully" };
};

export const addQuoteResponse = async (
  token: string,
  quoteId: number,
  response: string,
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/response/quote`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify({
        quoteId,
        response: response.trim(),
      }),
    },
  );

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to add response");
  }

  return data;
};

export const getAllQuotes = async (
  token: string,
  page: number,
  limit: number,
) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/quote?page=${page}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch quotes");
  }

  return data;
};
