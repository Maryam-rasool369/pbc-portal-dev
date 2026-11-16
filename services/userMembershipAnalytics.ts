const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = (token: string) => ({
  token,
});

export interface BusinessGroupAnalytics {
  id: number;
  name: string;
  description?: string;
  totalMembers: number;
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
  category: string;
  subCategory: string;
  businessGroup: string;
  membershipId: number;
}

export interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}

export interface BusinessGroupsAnalyticsResponse {
  message: string;
  data: BusinessGroupAnalytics[];
  pagination?: PaginationMeta;
}

export interface MembersAnalyticsResponse {
  message: string;
  data: MemberAnalytics[];
  pagination?: PaginationMeta;
}

export const fetchBusinessGroupsAnalytics = async (
  token: string,
  page?: number,
  limit?: number
): Promise<BusinessGroupsAnalyticsResponse> => {
  const query = new URLSearchParams();
  if (page) query.set("page", page.toString());
  if (limit) query.set("limit", limit.toString());

  const res = await fetch(
    `${API_URL}/api/user/analytics/business-groups?${query.toString()}`,
    {
      headers: getAuthHeaders(token),
    }
  );

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(
      result.error?.[0]?.msg || "Failed to fetch business groups analytics."
    );
  }

  return result;
};

export const fetchMembersByBusinessGroupAnalytics = async (
  token: string,
  businessGroupId: number,
  page?: number,
  limit?: number
): Promise<MembersAnalyticsResponse> => {
  const query = new URLSearchParams();
  if (page) query.set("page", page.toString());
  if (limit) query.set("limit", limit.toString());

  const res = await fetch(
    `${API_URL}/api/user/analytics/business-groups/${businessGroupId}/members?${query.toString()}`,
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

export const exportMembersByBusinessGroupAnalytics = async (
  token: string,
  businessGroupId: number,
  format: "excel" | "pdf" = "excel"
): Promise<Blob> => {
  const res = await fetch(
    `${API_URL}/api/user/analytics/business-groups/${businessGroupId}/members/export?format=${format}`,
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

