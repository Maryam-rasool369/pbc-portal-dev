// services/timeTracking.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface DailyTimeSpent {
  userId: number;
  name: string;
  email: string;
  platform: "web" | "mobile";
  secondsSpent: number;
  interactions: number;
  interactionTimestamps: string[];
}

export const fetchDailyTimeSpent = async (
  token: string,
  date?: string,
): Promise<DailyTimeSpent[]> => {
  try {
    const url = date
      ? `${API_URL}/api/time-tracking/daily?date=${date}`
      : `${API_URL}/api/time-tracking/daily`;

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        token,
      },
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.[0]?.msg || `Failed to fetch daily time spent: ${res.status}`);
    }

    return data.data;
  } catch (error) {
    console.error("Error fetching daily time spent:", error);
    throw error;
  }
};
