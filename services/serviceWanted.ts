import { ServiceWanted } from "@/types/marketplace";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface AddServiceWantedPayload {
  name: string;
  description: string;
  serviceCategoryId: number;
  subCategoryId: number;
  image?: File | null;
}

export interface UpdateServiceWantedPayload {
  name?: string;
  description?: string;
  serviceCategoryId?: number;
  subCategoryId?: number;
  image?: File | null;
}

const parseApiResponse = async (res: Response, fallbackMessage: string) => {
  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || fallbackMessage);
  }

  return result;
};

export const fetchUserServicesWanted = async (
  token: string,
  page: number,
  limit: number,
): Promise<ServiceWanted[]> => {
  const res = await fetch(
    `${API_URL}/api/service-wanted/my/services-wanted?page=${page}&limit=${limit}`,
    {
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );
  const result = await parseApiResponse(res, "Failed to fetch services wanted");
  return result.data;
};

export const fetchAllServicesWanted = async (
  token: string,
): Promise<ServiceWanted[]> => {
  const res = await fetch(`${API_URL}/api/service-wanted`, {
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  const result = await parseApiResponse(res, "Failed to fetch services wanted");

  return result.data;
};

export const getServiceWanted = async (
  token: string,
  id: string,
): Promise<ServiceWanted> => {
  const res = await fetch(`${API_URL}/api/service-wanted/${id}`, {
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  const result = await parseApiResponse(res, "Failed to fetch service wanted");
  return result.data;
};

export const addServiceWanted = async (
  token: string,
  payload: AddServiceWantedPayload,
) => {
  const formData = new FormData();

  formData.append("name", payload.name);
  formData.append("description", payload.description);
  formData.append("serviceCategoryId", String(payload.serviceCategoryId));
  formData.append("subCategoryId", String(payload.subCategoryId));

  if (payload.image) {
    formData.append("image", payload.image);
  }

  const res = await fetch(`${API_URL}/api/service-wanted/add`, {
    method: "POST",
    headers: { token },
    body: formData,
  });

  const result = await parseApiResponse(res, "Failed to add service wanted");

  return result.data;
};

export const updateServiceWanted = async (
  token: string,
  serviceWantedId: number,
  payload: UpdateServiceWantedPayload,
) => {
  const formData = new FormData();

  if (payload.name) formData.append("name", payload.name);
  if (payload.description) formData.append("description", payload.description);
  if (payload.serviceCategoryId !== undefined) {
    formData.append("serviceCategoryId", String(payload.serviceCategoryId));
  }
  if (payload.subCategoryId !== undefined) {
    formData.append("subCategoryId", String(payload.subCategoryId));
  }

  if (payload.image) {
    formData.append("image", payload.image);
  }

  const res = await fetch(`${API_URL}/api/service-wanted/${serviceWantedId}`, {
    method: "PATCH",
    headers: { token },
    body: formData,
  });

  const result = await parseApiResponse(
    res,
    "Failed to update service wanted",
  );

  return result.data;
};

export const deleteServiceWanted = async (
  token: string,
  serviceWantedId: number,
) => {
  const res = await fetch(`${API_URL}/api/service-wanted/${serviceWantedId}`, {
    method: "DELETE",
    headers: {
      token,
    },
  });

  const result = await parseApiResponse(
    res,
    "Failed to delete service wanted",
  );

  return result.data;
};

export const addServiceWantedResponse = async (
  token: string,
  serviceWantedId: string,
  response: string,
  threadUserId?: number,
): Promise<{ data: unknown; message: string }> => {
  const res = await fetch(`${API_URL}/api/response/service-wanted`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token,
    },
    body: JSON.stringify({
      serviceWantedId,
      response,
      ...(threadUserId ? { threadUserId } : {}),
    }),
  });

  return parseApiResponse(res, "Failed to add response");
};

export const deleteServiceWantedResponse = async (
  token: string,
  responseId: string,
): Promise<{ data: unknown; message: string }> => {
  const res = await fetch(`${API_URL}/api/response/${responseId}`, {
    method: "DELETE",
    headers: {
      token,
    },
  });

  return parseApiResponse(res, "Failed to delete response");
};
