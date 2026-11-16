import type {
  NewsletterCreatePayload,
  NewsletterCreateResponse,
  NewsletterDetailResponse,
  NewsletterFilters,
  NewsletterRecipientUser,
  NewsletterResponse,
  NewsletterUpdatePayload,
  NewsletterUpdateResponse,
} from "@/types/newsletter";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not defined");
}

const getAuthHeaders = (token: string) => ({
  token,
});

const getMultipartHeaders = (token: string) => ({
  token,
});

const getErrorMessage = (data: any, fallback: string) => {
  return data?.error?.[0]?.msg || data?.error?.[0]?.message || data?.message || fallback;
};

export const getAllPublishedNewsletters = async (
  token: string,
  filters: NewsletterFilters = {},
): Promise<NewsletterResponse> => {
  const queryParams = new URLSearchParams();

  if (filters.page) queryParams.append("page", filters.page.toString());
  if (filters.limit) queryParams.append("limit", filters.limit.toString());
  if (filters.searchTerm) queryParams.append("searchTerm", filters.searchTerm);

  const response = await fetch(
    `${API_URL}/api/newsletter/published?${queryParams.toString()}`,
    {
      method: "GET",
      headers: getAuthHeaders(token),
    },
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(getErrorMessage(data, "Failed to fetch newsletters"));
  }

  return data;
};

export const getMyAllNewsletters = async (
  token: string,
  filters: NewsletterFilters = {},
): Promise<NewsletterResponse> => {
  const queryParams = new URLSearchParams();

  if (filters.page) queryParams.append("page", filters.page.toString());
  if (filters.limit) queryParams.append("limit", filters.limit.toString());
  if (filters.searchTerm) queryParams.append("searchTerm", filters.searchTerm);

  const response = await fetch(
    `${API_URL}/api/newsletter/myallnewsletter?${queryParams.toString()}`,
    {
      method: "GET",
      headers: getAuthHeaders(token),
    },
  );

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(getErrorMessage(data, "Failed to fetch your newsletters"));
  }

  return data;
};

export const getNewsletterById = async (
  token: string,
  id: number,
): Promise<NewsletterDetailResponse> => {
  const response = await fetch(`${API_URL}/api/newsletter/${id}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(getErrorMessage(data, "Failed to fetch newsletter"));
  }

  return data;
};

export const createNewsletter = async (
  token: string,
  payload: NewsletterCreatePayload,
): Promise<NewsletterCreateResponse> => {
  const formData = new FormData();

  formData.append("title", payload.title);
  formData.append("content", payload.content);

  const videoUrls = (payload.videoUrls || []).slice(0, 3);
  videoUrls.forEach((url, index) => {
    const trimmed = url?.trim();
    if (trimmed) {
      formData.append(`videoUrl${index + 1}`, trimmed);
    }
  });

  const articleUrls = (payload.articleUrls || []).slice(0, 3);
  articleUrls.forEach((url, index) => {
    const trimmed = url?.trim();
    if (trimmed) {
      formData.append(`articleUrl${index + 1}`, trimmed);
    }
  });

  if (payload.publishedAt) {
    formData.append("publishedAt", payload.publishedAt);
  }

  if (payload.recipients && payload.recipients.length > 0) {
    formData.append("recipients", JSON.stringify(payload.recipients));
  }

  if (payload.images && payload.images.length > 0) {
    payload.images.slice(0, 4).forEach((image, index) => {
      formData.append(`image${index + 1}`, image);
    });
  }

  const response = await fetch(`${API_URL}/api/newsletter`, {
    method: "POST",
    headers: getMultipartHeaders(token),
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(getErrorMessage(data, "Failed to create newsletter"));
  }

  return data;
};

export const deleteNewsletter = async (
  token: string,
  id: number,
): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/api/newsletter/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(getErrorMessage(data, "Failed to delete newsletter"));
  }

  return data;
};

export const updateNewsletter = async (
  token: string,
  id: number,
  payload: NewsletterUpdatePayload,
): Promise<NewsletterUpdateResponse> => {
  const formData = new FormData();

  formData.append("title", payload.title);
  formData.append("content", payload.content);

  const videoUrls = (payload.videoUrls || []).slice(0, 3);
  for (let index = 0; index < 3; index += 1) {
    formData.append(`videoUrl${index + 1}`, videoUrls[index]?.trim() || "");
  }

  const articleUrls = (payload.articleUrls || []).slice(0, 3);
  for (let index = 0; index < 3; index += 1) {
    formData.append(`articleUrl${index + 1}`, articleUrls[index]?.trim() || "");
  }

  formData.append("publishedAt", payload.publishedAt || "");

  if (payload.recipients !== undefined) {
    formData.append("recipients", JSON.stringify(payload.recipients));
  }

  if (payload.existingPhotoUrls !== undefined) {
    formData.append("existingPhotoUrls", JSON.stringify(payload.existingPhotoUrls));
  }

  if (payload.images && payload.images.length > 0) {
    payload.images.slice(0, 4).forEach((image, index) => {
      formData.append(`image${index + 1}`, image);
    });
  }

  const response = await fetch(`${API_URL}/api/newsletter/${id}`, {
    method: "PUT",
    headers: getMultipartHeaders(token),
    body: formData,
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(getErrorMessage(data, "Failed to update newsletter"));
  }

  return data;
};

export const fetchNewsletterRecipientUsers = async (
  token: string,
): Promise<NewsletterRecipientUser[]> => {
  const limit = 200;
  let page = 1;
  let totalPages = 1;
  const users: NewsletterRecipientUser[] = [];

  do {
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      status: "active",
      membership: "verified",
      selfIncluded: "false",
    });

    const response = await fetch(`${API_URL}/api/user/all/users?${query.toString()}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        token,
      },
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(getErrorMessage(data, "Failed to fetch recipient users"));
    }

    const pageUsers = (data.data || []).map((user: any) => ({
      id: Number(user.id),
      name: user.name || "Unknown",
      email: user.email || "",
    }));

    users.push(...pageUsers);
    totalPages = Number(data?.pagination?.totalPages || 1);
    page += 1;
  } while (page <= totalPages);

  const uniqueUsers = Array.from(
    new Map(users.map((user) => [user.id, user])).values(),
  );

  return uniqueUsers;
};
