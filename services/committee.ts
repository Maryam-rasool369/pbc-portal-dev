import { Committee, CommitteeContent, PaginationMeta, CommitteePayload } from "@/types/committee";
import { UserProfile } from "@/types/user";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = (token: string) => ({
  "Content-Type": "application/json",
  token,
});

const handleResponse = async (res: Response) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data && data.error)) {
    throw new Error(
      data?.error?.[0]?.msg ||
        data?.message ||
        `Request failed with status ${res.status}`
    );
  }
  return data;
};


export const fetchAllUsers = async (
  token: string
): Promise<UserProfile[]> => {
  const res = await fetch(
    `${API_URL}/api/user/all/users?status=active&membership=verified`,
    {
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return data.data || [];
};


export const fetchCommittees = async (
  token: string,
  page?: number,
  limit?: number
): Promise<{ committees: Committee[]; pagination: PaginationMeta | null }> => {
  const params = new URLSearchParams();
  if (page !== undefined) params.set("page", String(page));
  if (limit !== undefined) params.set("limit", String(limit));

  const res = await fetch(
    `${API_URL}/api/committee${params.toString() ? `?${params}` : ""}`,
    { headers: getAuthHeaders(token) }
  );
  const data = await handleResponse(res);
  return {
    committees: data.data || [],
    pagination: data.pagination || null,
  };
};


export const getCommitteeById = async (
  token: string,
  committeeId: string | number
): Promise<Committee> => {
  const res = await fetch(
    `${API_URL}/api/committee/${committeeId}`,
    {
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return data.data || data.committee || data;
};


export const createCommittee = async (
  token: string,
  payload: CommitteePayload
): Promise<Committee> => {
  const res = await fetch(`${API_URL}/api/committee`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res);
  return data.data || data;
};


export const updateCommittee = async (
  token: string,
  committeeId: string | number,
  payload: Partial<CommitteePayload>
): Promise<Committee> => {
  const res = await fetch(
    `${API_URL}/api/committee/${committeeId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    }
  );
  const data = await handleResponse(res);
  return data.data || data;
};


export const deleteCommittee = async (
  token: string,
  committeeId: string | number
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/committee/${committeeId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return data;
};


export const removeMemberFromCommittee = async (
  token: string,
  committeeId: string | number,
  userId: number
): Promise<Committee> => {
  const res = await fetch(
    `${API_URL}/api/committee/${committeeId}/members/${userId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return data.data || data;
};


export const getSubCommitteeById = async (
  token: string,
  committeeId: string | number,
  subCommitteeId: string | number
): Promise<any> => {
  try {
    // Try the direct endpoint first
    const res = await fetch(
      `${API_URL}/api/committee/${committeeId}/sub-committee/${subCommitteeId}`,
      {
        headers: getAuthHeaders(token),
      }
    );
    
    if (res.ok) {
      const data = await handleResponse(res);
      return data.data || data;
    }
    
    // Fallback: fetch parent committee and find sub-committee
    const committeeRes = await fetch(
      `${API_URL}/api/committee/${committeeId}`,
      {
        headers: getAuthHeaders(token),
      }
    );
    const committeeData = await handleResponse(committeeRes);
    const committee = committeeData.data || committeeData;
    
    if (committee.subCommittees) {
      const subId = Array.isArray(subCommitteeId)
        ? parseInt(subCommitteeId[0])
        : subCommitteeId;
      const subCommittee = committee.subCommittees.find(
        (sc: any) => sc.id == subId
      );
      if (subCommittee) return subCommittee;
    }
    
    throw new Error("Sub-committee not found");
  } catch (error: any) {
    throw error;
  }
};

/**
 * Create sub-committee
 */
export const createSubCommittee = async (
  token: string,
  committeeId: string | number,
  payload: CommitteePayload
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/committee/${committeeId}/sub-committee`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    }
  );
  const data = await handleResponse(res);
  return data.data || data;
};

/**
 * Update sub-committee
 */
export const updateSubCommittee = async (
  token: string,
  committeeId: string | number,
  subCommitteeId: string | number,
  payload: Partial<CommitteePayload>
): Promise<any> => {
  const url = `${API_URL}/api/committee/${committeeId}/sub-committee/${subCommitteeId}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Sub-committee update endpoint is not available in the current API version. This feature requires backend implementation.");
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data?.error?.[0]?.msg ||
      data?.message ||
      `Failed to update sub-committee (HTTP ${res.status})`
    );
  }
  
  const data = await handleResponse(res);
  return data.data || data;
};

/**
 * Delete sub-committee
 */
export const deleteSubCommittee = async (
  token: string,
  committeeId: string | number,
  subCommitteeId: string | number
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/committee/${committeeId}/sub-committee/${subCommitteeId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return data.data || data;
};

/**
 * Add members to sub-committee
 */
export const addMembersToSubCommittee = async (
  token: string,
  committeeId: string | number,
  subCommitteeId: string | number,
  members: Array<{ userId: number; role?: string }>
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/committee/${committeeId}/sub-committee/${subCommitteeId}/members`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ members }),
    }
  );
  const data = await handleResponse(res);
  return data.data || data;
};

/**
 * Remove member from sub-committee
 */
export const removeMemberFromSubCommittee = async (
  token: string,
  committeeId: string | number,
  subCommitteeId: string | number,
  userId: number
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/committee/${committeeId}/sub-committee/${subCommitteeId}/members/${userId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(token),
    }
  );
  
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Remove member endpoint is not available in the current API version. This feature requires backend implementation.");
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(
      data?.error?.[0]?.msg ||
      data?.message ||
      `Failed to remove member (HTTP ${res.status})`
    );
  }

  const data = await handleResponse(res);
  return data.data || data;
};

export const uploadCommitteeContent = async (
  token: string,
  committeeId: number,
  file: File,
  title: string,
  isConfidential: boolean,
  subCommitteeId?: number
): Promise<CommitteeContent> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  formData.append("isConfidential", isConfidential.toString());
  if (subCommitteeId) {
    formData.append("subCommitteeId", subCommitteeId.toString());
  }

  const res = await fetch(
    `${API_URL}/api/committee/${committeeId}/upload-content`,
    {
      method: "POST",
      headers: { token },
      body: formData,
    }
  );
  const data = await handleResponse(res);
  return data.data;
};

export const deleteCommitteeContent = async (
  token: string,
  committeeId: number,
  contentId: number
): Promise<void> => {
  const res = await fetch(
    `${API_URL}/api/committee/${committeeId}/content/${contentId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(token),
    }
  );
  await handleResponse(res);
};

