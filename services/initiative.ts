import { GeneralResponse } from "@/types/global";

interface Initiative {
  id: number;
  title: string;
  description: string;
  status: "PLANNED" | "ON_GOING" | "FINISHED" | "ABORTED";
  datePlanned?: string;
  createdAt: string;
  updatedAt: string;
  userId: number;
  user: {
    id: number;
    name: string;
    Role?: {
      id: number;
      name: string;
    };
  };
  responses: GeneralResponse[];
  assignees?: {
    id: number;
    name: string;
    Role?: {
      id: number;
      name: string;
    };
  }[];
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = (token: string) => ({
  "Content-Type": "application/json",
  token,
});

export const fetchAllInitiatives = async (
  token: string,
  status: string,
  page = 1,
  limit = 5,
): Promise<PaginatedResponse<Initiative>> => {
  const res = await fetch(
    `${API_URL}/api/initiative?status=${status}&page=${page}&limit=${limit}`,
    {
      headers: getAuthHeaders(token),
    },
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch initiatives");
  }

  return data;
};

export const fetchInitiativeById = async (
  token: string,
  initiativeId: string | string[],
): Promise<Initiative> => {
  const res = await fetch(`${API_URL}/api/initiative/${initiativeId}`, {
    headers: getAuthHeaders(token),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch initiative");
  }

  return data.data;
};

export const fetchAllUsers = async (
  token: string,
): Promise<{ id: number; name: string }[]> => {
  const res = await fetch(
    `${API_URL}/api/user/all/users?status=active&membership=verified`,
    {
      headers: getAuthHeaders(token),
    },
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch users");
  }

  return data.data;
};

export const createInitiative = async (
  token: string,
  payload: {
    title: string;
    description: string;
    date?: string;
    assignees?: number[];
  },
): Promise<{ data: Initiative; message: string }> => {
  const res = await fetch(`${API_URL}/api/initiative`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to create initiative");
  }

  return data.data;
};

export const updateInitiative = async (
  token: string,
  initiativeId: string | string[],
  payload: { title: string; description: string; date?: string },
): Promise<{ data: Initiative; message: string }> => {
  const res = await fetch(`${API_URL}/api/initiative/${initiativeId}`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to update initiative");
  }

  return data.data;
};

export const updateInitiativeStatus = async (
  token: string,
  initiativeId: string | string[],
  status: "PLANNED" | "ON_GOING" | "FINISHED" | "ABORTED",
): Promise<{ data: Initiative; message: string }> => {
  const res = await fetch(`${API_URL}/api/initiative/status/${initiativeId}`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ status }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(
      data.error?.[0]?.msg || "Failed to update initiative status",
    );
  }

  return data;
};

export const updateInitiativeAssignees = async (
  token: string,
  initiativeId: string | string[],
  assignees: number[],
): Promise<{ data: Initiative; message: string }> => {
  const res = await fetch(`${API_URL}/api/initiative/assignees/${initiativeId}`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ assignees }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(
      data.error?.[0]?.msg || "Failed to update initiative assignees",
    );
  }

  return data;
};

export const addInitiativeResponse = async (
  token: string,
  initiativeId: string | string[],
  response: string,
  threadUserId?: number,
): Promise<{ data: Initiative; message: string }> => {
  const res = await fetch(`${API_URL}/api/response/initiative`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify({
      initiativeId,
      response,
      ...(threadUserId ? { threadUserId } : {}),
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to add response");
  }

  return data;
};

export const deleteInitiative = async (
  token: string,
  initiativeId: string | string[],
): Promise<{ data: Initiative; message: string }> => {
  const res = await fetch(`${API_URL}/api/initiative/${initiativeId}`, {
    method: "DELETE",
    headers: {
      ...getAuthHeaders(token),
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to delete initiative");
  }

  return data;
};

export const deleteInitiativeResponse = async (
  token: string,
  initiativeId: string | string[],
  responseId: number,
): Promise<{ data: Initiative; message: string }> => {
  const res = await fetch(
    `${API_URL}/api/initiative/${initiativeId}/responses/${responseId}`,
    {
      method: "DELETE",
      headers: {
        ...getAuthHeaders(token),
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to delete response");
  }

  return data;
};

export const exportInitiativesToExcel = async (
  token: string,
  status: "PLANNED" | "ON_GOING" | "FINISHED" | "ABORTED" | "ALL",
): Promise<Blob> => {
  const query = status === "ALL" ? "" : `?status=${status}`;
  const res = await fetch(`${API_URL}/api/initiative/export/excel${query}`, {
    method: "GET",
    headers: {
      token,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error?.[0]?.msg || "Failed to export initiatives");
  }

  return await res.blob();
};
