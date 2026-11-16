// services/category.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = (token: string) => ({
  "Content-Type": "application/json",
  token,
});

export const getCategoryById = async (
  token: string,
  id: string,
): Promise<any> => {
  const res = await fetch(`${API_URL}/api/transaction-category/${id}`, {
    headers: getAuthHeaders(token),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(
      data.error?.[0]?.msg || "Failed to fetch category details.",
    );
  }
  return data.data;
};

export const updateCategory = async (
  token: string,
  id: string,
  name: string,
): Promise<any> => {
  const res = await fetch(`${API_URL}/api/transaction-category/${id}`, {
    method: "PUT",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to update category.");
  }
  return data;
};

export const deleteCategory = async (
  token: string,
  id: string,
): Promise<any> => {
  const res = await fetch(`${API_URL}/api/transaction-category/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to delete category.");
  }
  return data;
};

export const fetchAllCategories = async (
  token: string,
  page = 1,
  limit = 10,
): Promise<{ data: any[]; pagination: any }> => {
  const res = await fetch(
    `${API_URL}/api/transaction-category?page=${page}&limit=${limit}`,
    {
      headers: getAuthHeaders(token),
    },
  );

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || "Failed to fetch categories.");
  }

  return {
    data: result.data || [],
    pagination: result.pagination || {},
  };
};

export const createCategory = async (
  token: string,
  name: string,
): Promise<any> => {
  const res = await fetch(`${API_URL}/api/transaction-category/add`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ name }),
  });

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || "Failed to create category.");
  }

  return result.data;
};
