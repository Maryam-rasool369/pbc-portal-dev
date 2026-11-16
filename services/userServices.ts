import { Service } from "@/types/marketplace";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface AddServicePayload {
  name: string;
  brand: string;
  description: string;
  serviceCategoryId: number;
  subCategoryId?: number;
  primaryImage?: File | null;
}

export interface UpdateServicePayload {
  name?: string;
  brand?: string;
  description?: string;
  serviceCategoryId?: number;
  subCategoryId?: number;
  primaryImage?: File | null;
}

const parseApiResponse = async (res: Response, fallbackMessage: string) => {
  const result = await res.json();
  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || fallbackMessage);
  }
  return result;
};

export const addService = async (token: string, payload: AddServicePayload) => {
  const formData = new FormData();
  formData.append("name", payload.name);
  formData.append("brand", payload.brand);
  formData.append("description", payload.description);
  formData.append("serviceCategoryId", String(payload.serviceCategoryId));
  if (payload.subCategoryId) {
    formData.append("subCategoryId", String(payload.subCategoryId));
  }
  if (payload.primaryImage) {
    formData.append("primaryImage", payload.primaryImage);
  }

  const res = await fetch(`${API_URL}/api/service/add`, {
    method: "POST",
    headers: { token },
    body: formData,
  });

  const result = await parseApiResponse(res, "Failed to add service");
  return result.data;
};

export const fetchUserServices = async (
  token: string,
  page: number,
  limit: number,
): Promise<Service[]> => {
  const res = await fetch(
    `${API_URL}/api/service/my/services?page=${page}&limit=${limit}`,
    { headers: { "Content-Type": "application/json", token } },
  );
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.[0]?.msg || "Failed to fetch services");
  return data.data;
};

export const fetchAllServices = async (token: string): Promise<Service[]> => {
  const res = await fetch(`${API_URL}/api/service`, {
    headers: { "Content-Type": "application/json", token },
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.[0]?.msg || "Failed to fetch services");
  return data.data;
};

export const getService = async (token: string, id: string): Promise<Service> => {
  const res = await fetch(`${API_URL}/api/service/${id}`, {
    headers: { "Content-Type": "application/json", token },
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.[0]?.msg || "Failed to fetch service");
  return data.data;
};

export const updateService = async (
  token: string,
  serviceId: number,
  payload: UpdateServicePayload,
) => {
  const formData = new FormData();
  if (payload.name) formData.append("name", payload.name);
  if (payload.brand) formData.append("brand", payload.brand);
  if (payload.description) formData.append("description", payload.description);
  if (payload.serviceCategoryId !== undefined)
    formData.append("serviceCategoryId", String(payload.serviceCategoryId));
  if (payload.subCategoryId !== undefined)
    formData.append("subCategoryId", String(payload.subCategoryId));
  if (payload.primaryImage) formData.append("primaryImage", payload.primaryImage);

  const res = await fetch(`${API_URL}/api/service/${serviceId}`, {
    method: "PATCH",
    headers: { token },
    body: formData,
  });

  const result = await parseApiResponse(res, "Failed to update service");
  return result.data;
};

export const deleteService = async (token: string, serviceId: number) => {
  const res = await fetch(`${API_URL}/api/service/${serviceId}`, {
    method: "DELETE",
    headers: { token },
  });
  const result = await parseApiResponse(res, "Failed to delete service");
  return result.data;
};

export const addServiceResponse = async (
  token: string,
  serviceId: string,
  response: string,
  threadUserId?: number,
): Promise<{ data: unknown; message: string }> => {
  const res = await fetch(`${API_URL}/api/response/service`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify({
      serviceId,
      response,
      ...(threadUserId ? { threadUserId } : {}),
    }),
  });
  return parseApiResponse(res, "Failed to add response");
};

export const deleteServiceResponse = async (
  token: string,
  responseId: string,
): Promise<{ data: unknown; message: string }> => {
  const res = await fetch(`${API_URL}/api/response/${responseId}`, {
    method: "DELETE",
    headers: { token },
  });
  return parseApiResponse(res, "Failed to delete response");
};
