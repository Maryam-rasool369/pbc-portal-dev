import {
  BusinessConnection,
  BusinessConnectionFormValues,
  BusinessConnectionsResponse,
} from "@/types/businessConnection";
import { UserProfile } from "@/types/user";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const handleResponse = async (res: Response) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    throw new Error(
      data?.error?.[0]?.msg || data?.message || `Request failed with status ${res.status}`,
    );
  }
  return data;
};

const buildFormData = (values: BusinessConnectionFormValues) => {
  const formData = new FormData();
  formData.append("date", new Date(values.date).toISOString());
  formData.append("natureOfBusiness", values.natureOfBusiness);
  formData.append("description", values.description.trim());

  if (values.amount.trim()) {
    formData.append("amount", values.amount.trim());
  }

  if (values.connectionMode === "member") {
    formData.append("connectedUserId", values.connectedUserId);
  } else {
    formData.append("connectedNonMemberName", values.connectedNonMemberName.trim());
    if (values.companyName.trim()) {
      formData.append("companyName", values.companyName.trim());
    }
  }

  values.attachments.forEach((file, index) => {
    if (file) {
      formData.append(`attachment${index + 1}`, file);
    }
  });

  return formData;
};

export const fetchBusinessConnections = async (
  token: string,
  page = 1,
  limit = 10,
  search?: string,
): Promise<BusinessConnectionsResponse> => {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search?.trim()) {
    query.set("search", search.trim());
  }

  const res = await fetch(`${API_URL}/api/business-connections?${query.toString()}`, {
    headers: { token },
  });
  return handleResponse(res);
};

export const fetchAllBusinessConnections = async (
  token: string,
  page = 1,
  limit = 10,
  search?: string,
): Promise<BusinessConnectionsResponse> => {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search?.trim()) {
    query.set("search", search.trim());
  }

  const res = await fetch(`${API_URL}/api/business-connections/all?${query.toString()}`, {
    headers: { token },
  });
  return handleResponse(res);
};

export const fetchBusinessConnectionById = async (
  token: string,
  businessConnectionId: string | number,
): Promise<BusinessConnection> => {
  const res = await fetch(`${API_URL}/api/business-connections/${businessConnectionId}`, {
    headers: { token },
  });
  const data = await handleResponse(res);
  return data.data;
};

export const createBusinessConnection = async (
  token: string,
  values: BusinessConnectionFormValues,
): Promise<BusinessConnection> => {
  const res = await fetch(`${API_URL}/api/business-connections`, {
    method: "POST",
    headers: { token },
    body: buildFormData(values),
  });
  const data = await handleResponse(res);
  return data.data;
};

export const updateBusinessConnection = async (
  token: string,
  businessConnectionId: string | number,
  values: BusinessConnectionFormValues,
): Promise<BusinessConnection> => {
  const res = await fetch(`${API_URL}/api/business-connections/${businessConnectionId}`, {
    method: "PATCH",
    headers: { token },
    body: buildFormData(values),
  });
  const data = await handleResponse(res);
  return data.data;
};

export const deleteBusinessConnectionAttachment = async (
  token: string,
  businessConnectionId: string | number,
  attachmentId: string | number,
) => {
  const res = await fetch(
    `${API_URL}/api/business-connections/${businessConnectionId}/attachments/${attachmentId}`,
    {
      method: "DELETE",
      headers: { token },
    },
  );
  return handleResponse(res);
};

export const deleteBusinessConnection = async (
  token: string,
  businessConnectionId: string | number,
) => {
  const res = await fetch(`${API_URL}/api/business-connections/${businessConnectionId}`, {
    method: "DELETE",
    headers: { token },
  });
  return handleResponse(res);
};

export const fetchBusinessConnectionMembers = async (
  token: string,
): Promise<UserProfile[]> => {
  const res = await fetch(`${API_URL}/api/user/all/users?status=active&membership=verified`, {
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });
  const data = await handleResponse(res);
  return data.data || [];
};
