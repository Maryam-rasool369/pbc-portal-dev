import { CommitteeMeeting } from "@/types/committee";

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


export const getCommitteeMeetings = async (
  token: string,
  page: number = 1,
  limit: number = 10,
  filters?: {
    committeeId?: number;
    subCommitteeId?: number;
    sort?: "oldest" | "newest";
    status?: "PENDING" | "ONGOING" | "COMPLETED" | "CANCELLED";
  }
): Promise<{ data: CommitteeMeeting[]; meta: any }> => {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (filters?.committeeId) {
    query.set("committeeId", String(filters.committeeId));
  }
  if (filters?.subCommitteeId) {
    query.set("subCommitteeId", String(filters.subCommitteeId));
  }
  if (filters?.sort) {
    query.set("sort", filters.sort);
  }
  if (filters?.status) {
    query.set("status", filters.status);
  }

  const res = await fetch(
    `${API_URL}/api/committee-meeting?${query.toString()}`,
    {
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return data;
};


export const getCommitteeMeetingById = async (
  token: string,
  meetingId: number
): Promise<CommitteeMeeting> => {
  const res = await fetch(
    `${API_URL}/api/committee-meeting/${meetingId}`,
    {
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return data.data || data;
};


export const createCommitteeMeeting = async (
  token: string,
  payload: {
    title: string;
    details: string;
    venue: string;
    startDate: string;
    endDate: string;
    timezone?: string;
    committeeId?: number;
    subCommitteeId?: number;
    userIds: number[];
    actionPoints?: Array<{
      description: string;
      assignedTo?: number;
    }>;
  }
): Promise<CommitteeMeeting> => {
  const res = await fetch(`${API_URL}/api/committee-meeting`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res);
  return data.data || data;
};

/**
 * Update committee meeting
 */
export const updateCommitteeMeeting = async (
  token: string,
  meetingId: number,
  payload: Partial<{
    title: string;
    details: string;
    venue: string;
    startDate: string;
    endDate: string;
    timezone?: string;
    meetingStatus?: "PENDING" | "ONGOING" | "COMPLETED" | "CANCELLED";
  }>
): Promise<CommitteeMeeting> => {
  const res = await fetch(
    `${API_URL}/api/committee-meeting/${meetingId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    }
  );
  const data = await handleResponse(res);
  return data.data || data;
};

/**
 * Delete committee meeting
 */
export const deleteCommitteeMeeting = async (
  token: string,
  meetingId: number
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/committee-meeting/${meetingId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return data;
};

/**
 * Mark attendance for specific users in a meeting (admin/organizer action)
 */
export const addMeetingAttendance = async (
  token: string,
  meetingId: number,
  userIds: number[]
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/committee-meeting/${meetingId}/attendance`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ userIds }),
    }
  );
  const data = await handleResponse(res);
  return data;
};

/**
 * Get attendance records for a meeting
 */
export const getMeetingAttendance = async (
  token: string,
  meetingId: number
): Promise<any[]> => {
  const res = await fetch(
    `${API_URL}/api/committee-meeting/${meetingId}/attendance`,
    {
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return data.data || [];
};

/**
 * Self mark attendance for the currently authenticated user (for assigned meeting members)
 */
export const markMyMeetingAttendance = async (
  token: string,
  meetingId: number
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/committee-meeting/${meetingId}/mark-my-attendance`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return data;
};

/**
 * Update the status of a committee meeting action point
 */
export const updateMeetingActionPointStatus = async (
  token: string,
  actionPointId: number,
  status: "PENDING" | "COMPLETED" | "TRANSFERRED"
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/committee-meeting/action-points/${actionPointId}/status`,
    {
      method: "PATCH",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ status }),
    }
  );
  const data = await handleResponse(res);
  return data;
};

/**
 * Edit a committee meeting action point (description and/or assignee)
 */
export const editMeetingActionPoint = async (
  token: string,
  actionPointId: number,
  payload: { description?: string; assignedTo?: number | null }
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/committee-meeting/action-points/${actionPointId}`,
    {
      method: "PATCH",
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    }
  );
  const data = await handleResponse(res);
  return data;
};

/**
 * Create a new action point for an existing meeting
 */
export const createMeetingActionPoint = async (
  token: string,
  meetingId: number,
  payload: { description: string; assignedTo?: number }
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/committee-meeting/${meetingId}/action-points`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    }
  );
  const data = await handleResponse(res);
  return data;
};

/**
 * Assign a committee meeting action point to a user
 */
export const assignMeetingActionPoint = async (
  token: string,
  actionPointId: number,
  assignedTo: number
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/committee-meeting/action-points/${actionPointId}/assign`,
    {
      method: "PATCH",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ assignedTo }),
    }
  );
  const data = await handleResponse(res);
  return data;
};

/**
 * Delete a committee meeting action point
 */
export const deleteMeetingActionPoint = async (
  token: string,
  actionPointId: number
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/committee-meeting/action-points/${actionPointId}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return data;
};

/**
 * Get pending action points for a committee or sub-committee
 */
export const getPendingActionPoints = async (
  token: string,
  committeeId?: number,
  subCommitteeId?: number
): Promise<any[]> => {
  let url = `${API_URL}/api/committee-meeting/action-points/pending`;
  const params = new URLSearchParams();
  if (committeeId) params.append("committeeId", String(committeeId));
  if (subCommitteeId) params.append("subCommitteeId", String(subCommitteeId));
  if (params.toString()) url += `?${params.toString()}`;

  const res = await fetch(url, { headers: getAuthHeaders(token) });
  const data = await handleResponse(res);
  return data.data || [];
};


export const exportMeetingAttendanceToCSV = async (
  token: string,
  meetingId: number
): Promise<void> => {
  const res = await fetch(
    `${API_URL}/api/committee-meeting/${meetingId}/attendance/export`,
    {
      headers: { token },
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.[0]?.msg || "Failed to export attendance"
    );
  }

  const blob = await res.blob();
  const timestamp = new Date()
    .toLocaleString("en-US", { hour12: false })
    .replace(/[/:, ]/g, "-");
  const filename = `meeting-${meetingId}-attendance-${timestamp}.csv`;
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => window.URL.revokeObjectURL(url), 500);
};


export const approveMeetingMOM = async (
  token: string,
  meetingId: number,
  payload: {
    status: "APPROVED" | "REJECTED";
    comment?: string;
    meetingMOM?: string;
  }
): Promise<any> => {
  if (!token || token.trim() === "") {
    throw new Error("Authentication token is missing or invalid. Please login again.");
  }
  const res = await fetch(
    `${API_URL}/api/committee-meeting/${meetingId}/mom-approval`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    }
  );
  const data = await handleResponse(res);
  return data;
};


export const getMeetingMOMApprovals = async (
  token: string,
  meetingId: number
): Promise<any[]> => {
  const res = await fetch(
    `${API_URL}/api/committee-meeting/${meetingId}/approvals`,
    {
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return data.data || [];
};

export const updateMeetingRSVP = async (
  token: string,
  meetingId: number,
  rsvpStatus: "PENDING" | "ACCEPTED" | "DECLINED" | "MAYBE"
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/committee-meeting/${meetingId}/rsvp`,
    {
      method: "PATCH",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ rsvpStatus }),
    }
  );
  const data = await handleResponse(res);
  return data;
};

export const getMeetingRSVP = async (
  token: string,
  meetingId: number
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/committee-meeting/${meetingId}/rsvp`,
    {
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return data.data || null;
};

export const deleteMeetingMedia = async (
  token: string,
  meetingId: number,
  mediaId: number
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/committee-meeting/${meetingId}/media/${mediaId}`,
    { method: "DELETE", headers: getAuthHeaders(token) }
  );
  return handleResponse(res);
};

export const deleteMeetingMOMPdf = async (
  token: string,
  meetingId: number
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/committee-meeting/mom/${meetingId}/pdf`,
    { method: "DELETE", headers: getAuthHeaders(token) }
  );
  return handleResponse(res);
};
