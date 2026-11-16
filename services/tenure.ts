import type { Tenure, TenureContent } from "../types/tenure";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
export const getAllTenures = async (token: string): Promise<Tenure[]> => {
  const response = await fetch(`${API_URL}/api/tenure/getAllTenures`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token: token,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch tenures");
  }
  const data = await response.json();
  return data.data;
};

export const addMembersToTenure = async (tenureId:  number, members: string[], token: string) => {
  const response = await fetch(`${API_URL}/api/tenure/add-members/${tenureId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token: token,
    },
    body: JSON.stringify({ validUsers: members }),
  });

  if (!response.ok) {
    throw new Error("Failed to add selected users to tenure");
  }
  const data = await response.json();
  return data.data;
};

export const removeMembersFromTenure = async (tenureId: number, userIds: number[], token: string) => {
  const response = await fetch(`${API_URL}/api/tenure/remove-members/${tenureId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      token: token,
    },
    body: JSON.stringify({ userIds }),
  });

  if (!response.ok) {
    throw new Error("Failed to remove selected users from tenure");
  }
  const data = await response.json();
  return data.data;
};

export const deleteTenure = async (tenureId:  number, token: string): Promise<string> => {
  const response = await fetch(`${API_URL}/api/tenure/delete/${tenureId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      token: token,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete selected tenure");
  }

  const data = await response.json();
  return data.message;
};

export const deleteTenureContent = async (
  tenureId: number,
  contentId: number,
  token: string
): Promise<string> => {
  const response = await fetch(`${API_URL}/api/tenure/${tenureId}/content/${contentId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      token: token,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete selected content");
  }

  const data = await response.json().catch(() => ({}));
  return data.message || "Content deleted successfully";
};

export const getTenureById = async (tenureId:  number, token: string): Promise<Tenure> => {
  const response = await fetch(`${API_URL}/api/tenure/getTenure/${tenureId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token: token,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch selected tenure details");
  }

  const data = await response.json();
  return data.data;
};

export const updateTenure = async (
  tenureId: number,
  tenureData: {
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    userId: number;
  },
  token: string
): Promise<Tenure> => {
  const response = await fetch(`${API_URL}/api/tenure/update/${tenureId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      token: token,
    },
    body: JSON.stringify(tenureData),
  });

  if (!response.ok) {
    throw new Error("Failed to update tenure");
  }

  const data = await response.json();
  return data.data;
};

export const addNonMembersToTenure = async (
  tenureId: number,
  nonMembers: { name: string; roleId: number }[],
  token: string
) => {
  const response = await fetch(`${API_URL}/api/tenure/add-non-members/${tenureId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify({ nonMembers }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.[0]?.msg || data?.message || "Failed to add non-members");
  }
  return data.data;
};

export const removeNonMembersFromTenure = async (
  tenureId: number,
  nonMemberIds: number[],
  token: string
) => {
  const response = await fetch(`${API_URL}/api/tenure/remove-non-members/${tenureId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify({ nonMemberIds }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.[0]?.msg || data?.message || "Failed to remove non-members");
  }
  return data.data;
};

export const uploadTenureContent = async (
  tenureId:  number,
  file: File,
  title: string,
  isConfidential: boolean,
  token: string
): Promise<TenureContent> => {
  const formData = new FormData();
  formData.append("tenureId", tenureId.toString());
  formData.append("file", file);
  formData.append("title", title);
  formData.append("isConfidential", isConfidential.toString());

  const response = await fetch(`${API_URL}/api/tenure/upload-content`, {
    method: "POST",
    headers: {
      token: token,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload selected content");
  }

  const data = await response.json();
  return data.data;
};
