const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = (token: string) => ({
  token,
});

export interface CategoryAnalytics {
  id: number;
  name: string;
  slug: string;
  description?: string;
  totalMembers: number;
  totalSubCategories: number;
}

export interface SubCategoryAnalytics {
  id: number;
  name: string;
  slug: string;
  description?: string;
  memberCount: number;
}

export interface MemberAnalytics {
  id: number;
  name: string;
  cnic: string;
  email: string;
  phoneNumber: string;
  country: string;
  city: string;
  companyName: string;
  website: string;
  businessGroup: string;
  membershipId: number;
}

export interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}

export interface MembersAnalyticsResponse {
  message: string;
  data: MemberAnalytics[];
  pagination?: PaginationMeta;
}

export const fetchCategoriesAnalytics = async (
  token: string
): Promise<CategoryAnalytics[]> => {
  const res = await fetch(`${API_URL}/api/membership/analytics/categories`, {
    headers: getAuthHeaders(token),
  });

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(
      result.error?.[0]?.msg || "Failed to fetch categories analytics."
    );
  }

  return result.data || [];
};

export const fetchSubCategoriesAnalytics = async (
  token: string,
  categoryId: number
): Promise<SubCategoryAnalytics[]> => {
  const res = await fetch(
    `${API_URL}/api/membership/analytics/categories/${categoryId}/subcategories`,
    {
      headers: getAuthHeaders(token),
    }
  );

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(
      result.error?.[0]?.msg || "Failed to fetch sub-categories analytics."
    );
  }

  return result.data || [];
};

export const fetchMembersAnalytics = async (
  token: string,
  subCategoryId: number,
  page?: number,
  limit?: number
): Promise<MembersAnalyticsResponse> => {
  const query = new URLSearchParams();
  if (page) query.set("page", page.toString());
  if (limit) query.set("limit", limit.toString());

  const res = await fetch(
    `${API_URL}/api/membership/analytics/subcategories/${subCategoryId}/members?${query.toString()}`,
    {
      headers: getAuthHeaders(token),
    }
  );

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(
      result.error?.[0]?.msg || "Failed to fetch members analytics."
    );
  }

  return result;
};

export const exportMembersAnalytics = async (
  token: string,
  subCategoryId: number,
  format: "excel" = "excel"
): Promise<Blob> => {
  const res = await fetch(
    `${API_URL}/api/membership/analytics/subcategories/${subCategoryId}/members/export?format=${format}`,
    {
      headers: getAuthHeaders(token),
    }
  );

  if (!res.ok) {
    const result = await res.json();
    throw new Error(
      result.error?.[0]?.msg || "Failed to export members analytics."
    );
  }

  return await res.blob();
};

export interface MembershipStats {
  totalUsers: number;
  activeMembers: number;
  inactiveMembers: number;
}

export const fetchMembershipStats = async (
  token: string
): Promise<MembershipStats> => {
  const res = await fetch(`${API_URL}/api/membership/stats`, {
    headers: getAuthHeaders(token),
  });

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(
      result.error?.[0]?.msg || "Failed to fetch membership stats."
    );
  }

  return result.data;
};

