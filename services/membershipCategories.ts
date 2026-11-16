const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = (token: string) => ({
  token,
});

export interface MembershipCategory {
  id: number;
  name: string;
  shortName: string;
  description?: string;
  planId: number;
  createdAt: string;
  updatedAt: string;
}

export const fetchMembershipCategories = async (
  token: string,
  page?: number,
  limit?: number,
  planId?: number | ""
): Promise<{ data: MembershipCategory[]; pagination?: any }> => {
  const query = new URLSearchParams();
  if (page) query.set("page", page.toString());
  if (limit) query.set("limit", limit.toString());
  if (planId) query.set("planId", planId.toString());

  const res = await fetch(
    `${API_URL}/api/membership-category?${query.toString()}`,
    {
      headers: getAuthHeaders(token),
    }
  );

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(
      result.error?.[0]?.msg || "Failed to fetch membership categories."
    );
  }

  return {
    data: result.data || [],
    pagination: result.pagination || {},
  };
};

export const fetchAllMembershipCategories = async (
  token: string
): Promise<MembershipCategory[]> => {
  const result = await fetchMembershipCategories(token);
  return result.data;
};

export const getMembershipCategoryById = async (
  token: string,
  categoryId: number
): Promise<MembershipCategory> => {
  const res = await fetch(`${API_URL}/api/membership-category/${categoryId}`, {
    headers: getAuthHeaders(token),
  });
  const result = await res.json();
  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || "Failed to fetch category.");
  }
  return result.data;
};

export const updateMembershipCategory = async (
  token: string,
  categoryId: number,
  payload: { name: string; description?: string }
): Promise<MembershipCategory> => {
  const res = await fetch(`${API_URL}/api/membership-category/${categoryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify(payload),
  });
  const result = await res.json();
  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || "Failed to update category.");
  }
  return result.data;
};

export const updateMembershipCategoryPlan = async (
  token: string,
  categoryId: number,
  planId: number
): Promise<MembershipCategory> => {
  const res = await fetch(
    `${API_URL}/api/membership-category/plan/${categoryId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({ planId }),
    }
  );
  const result = await res.json();
  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || "Failed to update category plan.");
  }
  return result.data;
};

export const deleteMembershipCategory = async (
  token: string,
  categoryId: number,
  targetCategoryId: number
): Promise<void> => {
  const res = await fetch(`${API_URL}/api/membership-category/${categoryId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify({ targetCategoryId }),
  });
  const result = await res.json();
  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || "Failed to delete category.");
  }
};

export const createMembershipCategory = async (
  token: string,
  payload: { name: string; description?: string; planId: number }
): Promise<MembershipCategory> => {
  const res = await fetch(`${API_URL}/api/membership-category/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify(payload),
  });

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || "Failed to create category.");
  }

  return result.data;
};
