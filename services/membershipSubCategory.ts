import { PaginationMeta, MembershipSubCategory } from "@/types/membershipSubCategory";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Align headers helper with membershipCategories.ts
const getAuthHeaders = (token: string, json = false): HeadersInit => {
  const headers: Record<string, string> = { token };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
};

const parseJsonSafe = async (res: Response) => {
  try {
    return await res.json();
  } catch {
    return null;
  }
};

const ensureOk = (res: Response, body: any) => {
  if (!res.ok || (body && body.error)) {
    throw new Error(
      body?.error?.[0]?.msg ||
        body?.message ||
        `Request failed with status ${res.status}`
    );
  }
};

export const fetchSubCategories = async (
  token: string,
  page = 1,
  limit = 10
): Promise<{ data: MembershipSubCategory[]; pagination?: PaginationMeta }> => {
  const res = await fetch(
    `${API_URL}/api/membership-sub-category?page=${page}&limit=${limit}`,
    { headers: getAuthHeaders(token) }
  );
  const body = await parseJsonSafe(res);
  ensureOk(res, body);

  // API may return an array or an object with data/pagination
  const data: MembershipSubCategory[] = Array.isArray(body)
    ? body
    : body?.data || body?.subCategories || [];

  const pagination: PaginationMeta | undefined = Array.isArray(body)
    ? undefined
    : body?.pagination;

  return { data, pagination };
};

export const fetchSubCategoriesByCategory = async (
  token: string,
  categoryId: number,
): Promise<MembershipSubCategory[]> => {
  const res = await fetch(
    `${API_URL}/api/membership-sub-category/category/${categoryId}`,
    { headers: getAuthHeaders(token) }
  );
  const body = await parseJsonSafe(res);
  ensureOk(res, body);
  return body?.data || body;
};

export const createSubCategory = async (
  token: string,
  payload: {
    name: string;
    description?: string;
    canVote: boolean;
    membershipCategoryId: number;
  }
): Promise<MembershipSubCategory> => {
  const res = await fetch(`${API_URL}/api/membership-sub-category/add`, {
    method: "POST",
    headers: getAuthHeaders(token, true),
    body: JSON.stringify(payload),
  });
  const body = await parseJsonSafe(res);
  ensureOk(res, body);
  return body?.data || body;
};

export const getSubCategoryById = async (
  token: string,
  subCategoryId: number
): Promise<MembershipSubCategory> => {
  const res = await fetch(
    `${API_URL}/api/membership-sub-category/${subCategoryId}`,
    { headers: getAuthHeaders(token) }
  );
  const body = await parseJsonSafe(res);
  ensureOk(res, body);
  return body?.data || body;
};

export const updateSubCategory = async (
  token: string,
  subCategoryId: number,
  payload: Partial<Pick<MembershipSubCategory, "name" | "description" | "canVote">>
): Promise<MembershipSubCategory> => {
  const res = await fetch(
    `${API_URL}/api/membership-sub-category/${subCategoryId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(token, true),
      body: JSON.stringify(payload),
    }
  );
  const body = await parseJsonSafe(res);
  ensureOk(res, body);
  return body?.data || body;
};

export const deleteSubCategory = async (
  token: string,
  subCategoryId: number,
  newSubCategoryId: number
): Promise<void> => {
  const res = await fetch(
    `${API_URL}/api/membership-sub-category/${subCategoryId}/${newSubCategoryId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(token),
    }
  );
  const body = await parseJsonSafe(res);
  ensureOk(res, body);
};