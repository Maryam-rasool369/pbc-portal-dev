import { toast } from "react-toastify";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Organization {
  id: string;
  name: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Pagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

const getAuthHeaders = (token: string) => ({
  "Content-Type": "application/json",
  token,
});

const handleResponse = async (res: Response, showToast = false) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data && data.error)) {
    throw new Error(
      data?.error?.[0]?.msg ||
        data?.message ||
        `Request failed with status ${res.status}`
    );
  } else {
    showToast && toast.success(data?.message || "Operation successful");
  }
  return data;
};

/**
 * Get all organizations (paginated)
 */
export const fetchOrganizations = async (
  token: string,
  page = 1,
  limit = 10
): Promise<{ data: Organization[]; pagination?: Pagination }> => {
  const res = await fetch(
    `${API_URL}/api/organization?page=${page}&limit=${limit}`,
    {
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return {
    data: data.data || data.organizations || [],
    pagination: data.pagination,
  };
};

/**
 * Get single organization by ID
 */
export const getOrganizationById = async (
  token: string,
  organizationId: string
): Promise<Organization> => {
  const res = await fetch(
    `${API_URL}/api/organization/${organizationId}`,
    {
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return data.data || data.organization;
};

/**
 * Create organization
 */
export const createOrganization = async (
  token: string,
  payload: { name: string; description: string }
): Promise<Organization> => {
  const res = await fetch(`${API_URL}/api/organization`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res, true);
  return data.data;
};

/**
 * Update organization
 */
export const updateOrganization = async (
  token: string,
  organizationId: string,
  payload: { name: string; description: string }
): Promise<Organization> => {
  const res = await fetch(
    `${API_URL}/api/organization/${organizationId}`,
    {
      method: "PUT",
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    }
  );
  const data = await handleResponse(res, true);
  return data.data;
};

/**
 * Delete organization
 */
export const deleteOrganization = async (
  token: string,
  organizationId: string
): Promise<void> => {
  const res = await fetch(
    `${API_URL}/api/organization/${organizationId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(token),
    }
  );
  await handleResponse(res, true);
};