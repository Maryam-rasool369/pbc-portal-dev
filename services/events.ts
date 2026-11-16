// services/events.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Event {
  id: number;
  title: string;
  description: string;
  details?: string;
  startDate?: string;
  endDate?: string;
  date: string;
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
}

export interface EventApprovalHistory {
  id: number;
  eventId: number;
  userId: number;
  status: "APPROVED" | "REJECTED";
  comment?: string;
  createdAt: string;
  user?: {
    id: number;
    name: string;
    email: string;
    Role?: {
      name: string;
    };
  };
}

const getAuthHeaders = (token: string) => ({
  "Content-Type": "application/json",
  token,
});

const handleResponse = async (res: Response, showToast = false) => {
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

export const exportEventAttendanceToCSV = async (
  token: string,
  eventId: string,
  format: "csv" | "pdf" = "csv",
): Promise<void> => {
  try {
    if (!token) {
      throw new Error("Authentication token is required");
    }

    const res = await fetch(
      `${API_URL}/api/event-attendance/export/${eventId}?format=${format}`,
      {
        method: "GET",
        headers: {
          token,
        },
      }
    );

    if (!res.ok) {
      if (res.status === 404) {
        try {
          const errorData = await res.json();
          const errorMsg = errorData?.error?.[0]?.msg || "No attendance records found for this event.";
          throw new Error(errorMsg);
        } catch (e) {
          if (e instanceof Error) throw e;
          throw new Error("No attendance records found for this event.");
        }
      }
      throw new Error("Failed to download file");
    }

    const blob = await res.blob();
    const timestamp = new Date()
      .toLocaleString("en-US", { hour12: false })
      .replace(/[/:, ]/g, "-");
    const extension = format === "pdf" ? "pdf" : "csv";
    const filename = `event-attendees-${eventId}-${timestamp}.${extension}`;

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => window.URL.revokeObjectURL(url), 500);
  } catch (error) {
    console.error("Error exporting event attendance:", error);
    throw error;
  }
};

export const exportEventAssigneesToCSV = async (
  token: string,
  eventId: string,
  format: "csv" | "pdf" = "csv",
): Promise<void> => {
  try {
    if (!token) {
      throw new Error("Authentication token is required");
    }

    const res = await fetch(
      `${API_URL}/api/event/${eventId}/assignee-users/export?format=${format}`,
      {
        method: "GET",
        headers: {
          token,
        },
      }
    );

    if (!res.ok) {
      if (res.status === 404) {
        try {
          const errorData = await res.json();
          const errorMsg = errorData?.error?.[0]?.msg || "No assignees found for this event.";
          throw new Error(errorMsg);
        } catch (e) {
          if (e instanceof Error) throw e;
          throw new Error("No assignees found for this event.");
        }
      }
      throw new Error("Failed to download file");
    }

    const blob = await res.blob();
    const timestamp = new Date()
      .toLocaleString("en-US", { hour12: false })
      .replace(/[/:, ]/g, "-");
    const extension = format === "pdf" ? "pdf" : "csv";
    const filename = `event-assignees-${eventId}-${timestamp}.${extension}`;

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => window.URL.revokeObjectURL(url), 500);
  } catch (error) {
    console.error("Error exporting event assignees:", error);
    throw error;
  }
};

/**
 * Approve or reject an event
 */
export const approveRejectEvent = async (
  token: string,
  eventId: number,
  approvalStatus: "APPROVED" | "REJECTED",
  comment?: string
): Promise<{ data: Event }> => {
  const res = await fetch(
    `${API_URL}/api/event-creation-approval/add`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({
        eventId,
        status: approvalStatus,
        comment,
      }),
    }
  );
  const data = await handleResponse(res, true);
  return data;
};
