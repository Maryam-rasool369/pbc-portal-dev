const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = (token: string) => ({
  token,
});

export interface DirectorCategoryAnalytics {
  id: number;
  name: string;
  slug: string;
  description?: string;
  totalDirectors: number;
}

export interface DirectorSubCategoryAnalytics {
  id: number;
  name: string;
  slug: string;
  description?: string;
  directorCount: number;
}

export interface DirectorAnalytics {
  id: number;
  userId: number;
  name: string;
  email: string;
  category: string;
  subCategory: string;
  designation: string;
  role: string;
  country: string;
  status: string;
  tenureMemberId: number;
}

export interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}

export interface DirectorsAnalyticsResponse {
  message: string;
  data: DirectorAnalytics[];
  pagination?: PaginationMeta;
}

export const fetchDirectorsCategoriesAnalytics = async (
  token: string
): Promise<DirectorCategoryAnalytics[]> => {
  const res = await fetch(`${API_URL}/api/user/analytics/directors/categories`, {
    headers: getAuthHeaders(token),
  });

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(
      result.error?.[0]?.msg || "Failed to fetch directors categories analytics."
    );
  }

  return result.data || [];
};

export const fetchDirectorsSubCategoriesAnalytics = async (
  token: string,
  categoryId: number
): Promise<DirectorSubCategoryAnalytics[]> => {
  const res = await fetch(
    `${API_URL}/api/user/analytics/directors/categories/${categoryId}/subcategories`,
    {
      headers: getAuthHeaders(token),
    }
  );

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(
      result.error?.[0]?.msg || "Failed to fetch directors sub-categories analytics."
    );
  }

  return result.data || [];
};

export const fetchDirectorsAnalytics = async (
  token: string,
  subCategoryId: number,
  page?: number,
  limit?: number
): Promise<DirectorsAnalyticsResponse> => {
  const query = new URLSearchParams();
  if (page) query.set("page", page.toString());
  if (limit) query.set("limit", limit.toString());

  const res = await fetch(
    `${API_URL}/api/user/analytics/directors/subcategories/${subCategoryId}/directors?${query.toString()}`,
    {
      headers: getAuthHeaders(token),
    }
  );

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(
      result.error?.[0]?.msg || "Failed to fetch board members analytics."
    );
  }

  return result;
};

export const exportDirectorsAnalytics = async (
  token: string,
  subCategoryId: number,
  format: "excel" | "pdf" = "excel"
): Promise<Blob> => {
  const res = await fetch(
    `${API_URL}/api/user/analytics/directors/subcategories/${subCategoryId}/directors/export?format=${format}`,
    {
      headers: getAuthHeaders(token),
    }
  );

  if (!res.ok) {
    const result = await res.json();
    throw new Error(
      result.error?.[0]?.msg || "Failed to export board members analytics."
    );
  }

  return await res.blob();
};

