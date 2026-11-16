// services/attendance.ts

import {
  AttendanceInput,
  TasksUpdate,
  Attendance,
  AttendanceResponse,
  SingleAttendanceResponse,
} from "@/types/attendance";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const markAttendance = async (
  token: string | null,
  attendanceData: AttendanceInput,
  action: "in" | "out" = "in",
): Promise<Attendance> => {
  try {
    if (!token) {
      throw new Error("Authentication token is required");
    }

    const res = await fetch(`${API_URL}/api/attendance/clock-${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify(attendanceData),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.[0]?.msg || `Failed to mark attendance: ${res.status}`);
    }

    return data.data;
  } catch (error) {
    console.error("Error marking attendance:", error);
    throw error;
  }
};

export const getAllAttendances = async (
  token: string,
  page = 1,
  limit = 10,
): Promise<AttendanceResponse> => {
  try {
    const res = await fetch(
      `${API_URL}/api/attendance?page=${page}&limit=${limit}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          token,
        },
      },
    );

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.[0]?.msg || `Failed to fetch attendances: ${res.status}`);
    }

    return data;
  } catch (error) {
    console.error("Error fetching attendances:", error);
    throw error;
  }
};

export const getPersonalAttendances = async (
  token: string,
): Promise<{ data: Attendance[] }> => {
  try {
    const res = await fetch(`${API_URL}/api/attendance/my`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        token,
      },
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.[0]?.msg || `Failed to fetch personal attendances: ${res.status}`);
    }

    return data;
  } catch (error) {
    console.error("Error fetching personal attendances:", error);
    throw error;
  }
};

export const getTodayAttendance = async (
  token: string,
): Promise<SingleAttendanceResponse> => {
  try {
    const res = await fetch(`${API_URL}/api/attendance/todays`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        token,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      // If no attendance for today is found, it's not necessarily an error
      if (res.status === 404) {
        return { data: null };
      }
      throw new Error(data.error?.[0]?.msg || `Failed to fetch today's attendance: ${res.status}`);
    }

    return data;
  } catch (error) {
    console.error("Error fetching today's attendance:", error);
    throw error;
  }
};

export const updateAttendanceTasks = async (
  token: string | null,
  tasksData: TasksUpdate,
): Promise<Attendance> => {
  try {
    if (!token) {
      throw new Error("Authentication token is required");
    }

    const res = await fetch(`${API_URL}/api/attendance/update-tasks`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify(tasksData),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.[0]?.msg || `Failed to update tasks: ${res.status}`);
    }

    return data.data;
  } catch (error) {
    console.error("Error updating tasks:", error);
    throw error;
  }
};

export const addAttendanceTask = async (
  token: string | null,
  task: string,
): Promise<Attendance> => {
  try {
    if (!token) {
      throw new Error("Authentication token is required");
    }

    const res = await fetch(`${API_URL}/api/attendance/add-task`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify({ task }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.[0]?.msg || `Failed to add task: ${res.status}`);
    }

    return data.data;
  } catch (error) {
    console.error("Error adding task:", error);
    throw error;
  }
};

export const updateAttendanceTask = async (
  token: string | null,
  taskIndex: number,
  task: string,
): Promise<Attendance> => {
  try {
    if (!token) {
      throw new Error("Authentication token is required");
    }

    const res = await fetch(`${API_URL}/api/attendance/update-task/${taskIndex}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify({ task }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.[0]?.msg || `Failed to update task: ${res.status}`);
    }

    return data.data;
  } catch (error) {
    console.error("Error updating task:", error);
    throw error;
  }
};

export const deleteAttendanceTask = async (
  token: string | null,
  taskIndex: number,
): Promise<Attendance> => {
  try {
    if (!token) {
      throw new Error("Authentication token is required");
    }

    const res = await fetch(`${API_URL}/api/attendance/delete-task/${taskIndex}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        token,
      },
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.[0]?.msg || `Failed to delete task: ${res.status}`);
    }

    return data.data;
  } catch (error) {
    console.error("Error deleting task:", error);
    throw error;
  }
};

export const getAttendanceById = async (
  token: string,
  id: string | number,
): Promise<SingleAttendanceResponse> => {
  try {
    const res = await fetch(`${API_URL}/api/attendance/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        token,
      },
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.[0]?.msg || `Failed to fetch attendance details: ${res.status}`);
    }

    return data;
  } catch (error) {
    console.error("Error fetching attendance details:", error);
    throw error;
  }
};

export const exportAttendanceToExcel = async (
  token: string,
  date?: string,
): Promise<void> => {
  try {
    if (!token) {
      throw new Error("Authentication token is required");
    }

    let url = `${API_URL}/api/attendance/export/excel`;
    if (date) {
      url += `?date=${date}`;
    }
    const res = await fetch(url, {
      method: "GET",
      headers: {
        token,
      },
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error?.[0]?.msg || `Failed to export attendance: ${res.status}`);
    }
    const contentDisposition = res.headers.get("Content-Disposition");
    const filename = contentDisposition
      ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
      : `attendance_${date || new Date().toISOString().split("T")[0]}.xlsx`;
    const blob = await res.blob();
    const link = document.createElement("a");
    const url_link = URL.createObjectURL(blob);
    link.setAttribute("href", url_link);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url_link);
  } catch (error) {
    console.error("Error exporting attendance:", error);
    throw error;
  }
};
