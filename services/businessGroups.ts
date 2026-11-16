import { BusinessGroup, PaginationMeta } from "@/types/businessGroup";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = (token: string) => ({
  "Content-Type": "application/json",
  token,
});

const handleResponse = async (res: Response) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data && data.error)) {
    throw new Error(
      data?.error?.[0]?.msg ||
        data?.message ||
        `Request failed with status ${res.status}`
    );
  }
  return data;
};

/**
 * Get all business groups (paginated)
 */
export const fetchBusinessGroups = async (
  token: string,
  page = 1,
  limit = 10,
  search = ""
): Promise<{ data: BusinessGroup[]; pagination?: PaginationMeta }> => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search.trim()) params.set("search", search.trim());

  const res = await fetch(`${API_URL}/api/business-groups?${params.toString()}`, {
    headers: getAuthHeaders(token),
  });
  const data = await handleResponse(res);
  return {
    data: data.data || data.businessGroups || [],
    pagination: data.pagination,
  };
};

/**
 * Get single business group by ID
 */
export const getBusinessGroupById = async (
  token: string,
  businessGroupId: string
): Promise<BusinessGroup> => {
  const res = await fetch(
    `${API_URL}/api/business-groups/${businessGroupId}`,
    {
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return data.data || data.businessGroup || data;
};

/**
 * Create business group
 */
export const createBusinessGroup = async (
  token: string,
  payload: {
    name: string;
    description: string;
  }
): Promise<BusinessGroup> => {
  const res = await fetch(`${API_URL}/api/business-groups`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res);
  return data.data || data;
};

/**
 * Update business group
 */
export const updateBusinessGroup = async (
  token: string,
  businessGroupId: string,
  payload: {
    name?: string;
    description?: string;
  }
): Promise<BusinessGroup> => {
  const res = await fetch(
    `${API_URL}/api/business-groups/${businessGroupId}`,
    {
      method: "PUT",
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    }
  );
  const data = await handleResponse(res);
  return data.data || data;
};

/**
 * Delete business group
 */
export const deleteBusinessGroup = async (
  token: string,
  businessGroupId: string
): Promise<void> => {
  const res = await fetch(
    `${API_URL}/api/business-groups/${businessGroupId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(token),
    }
  );
  await handleResponse(res);
};
