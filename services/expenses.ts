// services/transaction.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = (token: string) => ({
  token,
});

export const fetchTransactionCategories = async (
  token: string,
  page = 1,
  limit = 12,
): Promise<any[]> => {
  const res = await fetch(
    `${API_URL}/api/transaction-category?page=${page}&limit=${limit}`,
    {
      headers: getAuthHeaders(token),
    },
  );
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(
      data.error?.[0]?.msg || "Failed to fetch transaction categories.",
    );
  }
  return data.data;
};

export const createTransaction = async (
  token: string,
  formData: FormData,
): Promise<any> => {
  const res = await fetch(`${API_URL}/api/transaction/add`, {
    method: "POST",
    headers: {
      token, // DO NOT set Content-Type for FormData
    },
    body: formData,
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to create transaction.");
  }
  return data;
};

export const fetchAllTransactions = async (
  token: string,
  page = 1,
  limit = 15,
  selectedTab?: string,
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/transaction?page=${page}&limit=${limit}&status=${selectedTab || ""}`,
    {
      headers: getAuthHeaders(token),
    },
  );
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch transactions.");
  }
  return data;
};

export const getTransactionById = async (
  token: string,
  id: string,
): Promise<any> => {
  const res = await fetch(`${API_URL}/api/transaction/${id}`, {
    headers: getAuthHeaders(token),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch transaction.");
  }
  return data.data;
};

export const editTransaction = async (
  token: string,
  transactionId: string,
  formData: FormData,
): Promise<any> => {
  const res = await fetch(`${API_URL}/api/transaction/${transactionId}`, {
    method: "PATCH",
    headers: {
      token, // Do NOT include "Content-Type" header manually — let browser set it
    },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to update transaction.");
  }
  return data;
};

export const deleteTransaction = async (
  token: string,
  transactionId: string,
): Promise<any> => {
  const res = await fetch(`${API_URL}/api/transaction/${transactionId}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to delete transaction.");
  }
  return data;
};

export const updateTransactionStatus = async (
  token: string,
  transactionId: string,
  status: string,
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/transaction/update-status/${transactionId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        token: token,
      },

      body: JSON.stringify({ status }),
    },
  );

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(
      data.error?.[0]?.msg || "Failed to update transaction status.",
    );
  }

  return data;
};

export const exportTransactionsToExcel = async (
  token: string,
  status: "PENDING" | "APPROVED" | "REJECTED" | "ALL",
): Promise<Blob> => {
  const query = status === "ALL" ? "" : `?status=${status}`;
  const res = await fetch(`${API_URL}/api/transaction/export/excel${query}`, {
    method: "GET",
    headers: {
      token,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error?.[0]?.msg || "Failed to export expenses.");
  }

  return await res.blob();
};
