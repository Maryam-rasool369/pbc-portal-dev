const API = process.env.NEXT_PUBLIC_API_URL;

export interface ServiceSubCategoryInput {
  name: string;
  description?: string;
}

export interface AddServiceCategoryPayload {
  name: string;
  description: string;
  subCategories: ServiceSubCategoryInput[];
}

export interface UpdateServiceCategoryPayload {
  name: string;
  description: string;
}

export const fetchServiceCategoryById = async (token: string, id: number) => {
  const res = await fetch(`${API}/api/service-category/${id}`, {
    headers: { "Content-Type": "application/json", token },
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.[0]?.msg || "Failed to fetch service category");
  return json.data;
};

export const fetchServiceCategories = async (
  token: string,
  page?: number,
  limit?: number,
  search?: string,
) => {
  const params = new URLSearchParams();

  if (page !== undefined) {
    params.set("page", String(page));
  }

  if (limit !== undefined) {
    params.set("limit", String(limit));
  }

  if (search) {
    params.set("search", search);
  }

  const query = params.toString();

  const res = await fetch(
    `${API}/api/service-category${query ? `?${query}` : ""}`,
    {
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );

  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error(
      json.error?.[0]?.msg || "Failed to fetch service categories",
    );
  }

  return json;
};

export const addServiceCategory = async (
  token: string,
  payload: AddServiceCategoryPayload,
) => {
  const res = await fetch(`${API}/api/service-category/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.message || json.error?.[0]?.msg || "Failed to add service category");
  return json.data;
};

export const updateServiceCategory = async (
  token: string,
  id: number,
  payload: UpdateServiceCategoryPayload,
) => {
  const res = await fetch(`${API}/api/service-category/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.message || json.error?.[0]?.msg || "Failed to update service category");
  return json.data;
};

export const deleteServiceCategory = async (token: string, id: number) => {
  const res = await fetch(`${API}/api/service-category/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", token },
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.message || json.error?.[0]?.msg || "Failed to delete service category");
  return json.data;
};

export const addServiceSubCategory = async (
  token: string,
  serviceCategoryId: number,
  payload: ServiceSubCategoryInput,
) => {
  const res = await fetch(`${API}/api/service-category/${serviceCategoryId}/sub-category`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.message || json.error?.[0]?.msg || "Failed to add sub-category");
  return json.data;
};

export const updateServiceSubCategory = async (
  token: string,
  serviceCategoryId: number,
  subCategoryId: number,
  payload: ServiceSubCategoryInput,
) => {
  const res = await fetch(
    `${API}/api/service-category/${serviceCategoryId}/sub-category/${subCategoryId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify(payload),
    },
  );
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.message || json.error?.[0]?.msg || "Failed to update sub-category");
  return json.data;
};

export const deleteServiceSubCategory = async (
  token: string,
  serviceCategoryId: number,
  subCategoryId: number,
) => {
  const res = await fetch(
    `${API}/api/service-category/${serviceCategoryId}/sub-category/${subCategoryId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json", token },
    },
  );
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.message || json.error?.[0]?.msg || "Failed to delete sub-category");
  return json.data;
};
