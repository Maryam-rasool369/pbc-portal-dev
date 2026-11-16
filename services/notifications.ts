// services/notifications.ts

/**
 * User Notifications API Service
 * 
 * Manages user notifications with full CRUD operations including:
 * - Fetching paginated notifications
 * - Getting unread notifications and counts
 * - Marking notifications as read (single or all)
 * - Deleting notifications (single or all)
 * 
 * All endpoints require authentication via token header.
 * Base URL: /api/user-notifications
 */

export interface Notification {
  id: number;
  title: string | null;
  message: string;
  link: string | null;
  refId: string | null;
  status: 'UNREAD' | 'READ';
  createdAt: string; // ISO Date
}

export interface PaginatedResponse {
  data: Notification[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface UnreadCountResponse {
  data: {
    unreadCount: number;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = (token: string) => ({
  "Content-Type": "application/json",
  token,
});

/**
 * Fetch all notifications (paginated)
 * @param token - Authentication token
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @returns Paginated notifications response
 */
export const fetchAllNotifications = async (
  token: string,
  page = 1,
  limit = 10
): Promise<PaginatedResponse> => {
  try {
    const res = await fetch(
      `${API_URL}/api/user-notifications?page=${page}&limit=${limit}`,
      {
        method: "GET",
        headers: getAuthHeaders(token),
      }
    );

    const data = await res.json();

    if (!res.ok || data.error) {
      if (res.status === 401) {
        throw new Error("Unauthorized. Please log in again.");
      }
      if (res.status === 403) {
        throw new Error("Forbidden. You don't have permission to view notifications.");
      }
      throw new Error(data.error?.[0]?.msg || "Failed to fetch notifications");
    }

    return data;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
};

/**
 * Fetch all unread notifications
 * @param token - Authentication token
 * @returns List of unread notifications
 */
export const fetchUnreadNotifications = async (
  token: string
): Promise<Notification[]> => {
  try {
    const res = await fetch(`${API_URL}/api/user-notifications/unread`, {
      method: "GET",
      headers: getAuthHeaders(token),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      if (res.status === 401) {
        throw new Error("Unauthorized. Please log in again.");
      }
      if (res.status === 403) {
        throw new Error("Forbidden. You don't have permission to view notifications.");
      }
      throw new Error(data.error?.[0]?.msg || "Failed to fetch unread notifications");
    }

    return data.data || [];
  } catch (error) {
    console.error("Error fetching unread notifications:", error);
    throw error;
  }
};

/**
 * Get count of unread notifications
 * @param token - Authentication token
 * @returns Unread count
 */
export const fetchUnreadCount = async (
  token: string
): Promise<number> => {
  try {
    const res = await fetch(`${API_URL}/api/user-notifications/unread/count`, {
      method: "GET",
      headers: getAuthHeaders(token),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      if (res.status === 401) {
        throw new Error("Unauthorized. Please log in again.");
      }
      if (res.status === 403) {
        throw new Error("Forbidden. You don't have permission to view notifications.");
      }
      throw new Error(data.error?.[0]?.msg || "Failed to fetch unread count");
    }

    return data.data?.unreadCount || 0;
  } catch (error) {
    console.error("Error fetching unread count:", error);
    throw error;
  }
};

/**
 * Mark a specific notification as read
 * @param token - Authentication token
 * @param notificationId - ID of the notification to mark as read
 */
export const markNotificationAsRead = async (
  token: string,
  notificationId: number
): Promise<void> => {
  try {
    const res = await fetch(
      `${API_URL}/api/user-notifications/${notificationId}/read`,
      {
        method: "PATCH",
        headers: getAuthHeaders(token),
      }
    );

    const data = await res.json();

    if (!res.ok || data.error) {
      if (res.status === 401) {
        throw new Error("Unauthorized. Please log in again.");
      }
      if (res.status === 403) {
        throw new Error("Forbidden. You don't have permission to update this notification.");
      }
      if (res.status === 404) {
        throw new Error("Notification not found.");
      }
      throw new Error(data.error?.[0]?.msg || "Failed to mark notification as read");
    }
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};

/**
 * Mark all notifications as read
 * @param token - Authentication token
 */
export const markAllNotificationsAsRead = async (
  token: string
): Promise<void> => {
  try {
    const res = await fetch(`${API_URL}/api/user-notifications/mark-all-read`, {
      method: "PATCH",
      headers: getAuthHeaders(token),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      if (res.status === 401) {
        throw new Error("Unauthorized. Please log in again.");
      }
      if (res.status === 403) {
        throw new Error("Forbidden. You don't have permission to update notifications.");
      }
      throw new Error(data.error?.[0]?.msg || "Failed to mark all notifications as read");
    }
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    throw error;
  }
};

/**
 * Delete a specific notification
 * @param token - Authentication token
 * @param notificationId - ID of the notification to delete
 */
export const deleteNotification = async (
  token: string,
  notificationId: number
): Promise<void> => {
  try {
    const res = await fetch(
      `${API_URL}/api/user-notifications/${notificationId}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(token),
      }
    );

    const data = await res.json();

    if (!res.ok || data.error) {
      if (res.status === 401) {
        throw new Error("Unauthorized. Please log in again.");
      }
      if (res.status === 403) {
        throw new Error("Forbidden. You don't have permission to delete this notification.");
      }
      if (res.status === 404) {
        throw new Error("Notification not found.");
      }
      throw new Error(data.error?.[0]?.msg || "Failed to delete notification");
    }
  } catch (error) {
    console.error("Error deleting notification:", error);
    throw error;
  }
};

/**
 * Clear all notifications
 * @param token - Authentication token
 */
export const clearAllNotifications = async (
  token: string
): Promise<void> => {
  try {
    const res = await fetch(`${API_URL}/api/user-notifications/clear-all`, {
      method: "DELETE",
      headers: getAuthHeaders(token),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      if (res.status === 401) {
        throw new Error("Unauthorized. Please log in again.");
      }
      if (res.status === 403) {
        throw new Error("Forbidden. You don't have permission to clear notifications.");
      }
      throw new Error(data.error?.[0]?.msg || "Failed to clear all notifications");
    }
  } catch (error) {
    console.error("Error clearing all notifications:", error);
    throw error;
  }
};
