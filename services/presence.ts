// services/presence.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface OnlineCount {
  web: number;
  mobile: number;
  total: number;
}

export interface OnlineUser {
  id: number;
  name: string;
  email: string;
  platform: "web" | "mobile";
}

export const fetchOnlineCount = async (token: string): Promise<OnlineCount> => {
  try {
    const res = await fetch(`${API_URL}/api/presence/online-count`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        token,
      },

    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.[0]?.msg || `Failed to fetch online count: ${res.status}`);
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching online count:", error);
    throw error;
  }
};

export const fetchOnlineUsers = async (token: string): Promise<OnlineUser[]> => {
  try {
    const res = await fetch(`${API_URL}/api/presence/online-users`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        token,
      },
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.[0]?.msg || `Failed to fetch online users: ${res.status}`);
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching online users:", error);
    throw error;
  }
};
