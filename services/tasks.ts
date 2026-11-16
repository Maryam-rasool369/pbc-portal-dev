// services/tasks.ts

import {
  Task,
  TaskInput,
  TaskStatusUpdate,
  TaskDetailsUpdate,
  TasksResponse,
} from "@/types/task";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = (token: string) => ({
  "Content-Type": "application/json",
  token,
});

/**
 * Fetch all tasks (admin only)
 */
export const fetchAllTasks = async (
  token: string,
  page = 1,
  limit = 10,
  status?: string,
): Promise<TasksResponse> => {
  let url = `${API_URL}/api/task?page=${page}&limit=${limit}`;

  // Add status filter if provided
  if (status) {
    url += `&status=${status}`;
  }

  try {
    const res = await fetch(url, {
      headers: getAuthHeaders(token),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(data.error?.[0]?.msg || "Failed to fetch tasks.");
    }

    // Validate the response data structure
    if (!data.data || !Array.isArray(data.data)) {
      console.error("Invalid all tasks response format:", data);
      return {
        data: [],
        pagination: {
          totalItems: 0,
          totalPages: 0,
          currentPage: 1,
          itemsPerPage: limit,
        },
      };
    }

    // Ensure each task has the required properties
    const validatedTasks = data.data.map((task: any) => {
      return {
        ...task,
        assignee: task.assignee || { id: 0, name: "Unknown" },
        assigner: task.assigner || { id: 0, name: "Unknown" },
      };
    });

    return {
      ...data,
      data: validatedTasks,
    };
  } catch (error) {
    console.error("Error fetching all tasks:", error);
    throw error;
  }
};

/**
 * Fetch tasks assigned to the current user
 */
export const fetchAssignedTasks = async (
  token: string,
  page = 1,
  limit = 10,
  status?: string,
): Promise<TasksResponse> => {
  let url = `${API_URL}/api/task/assigned?page=${page}&limit=${limit}`;

  // Add status filter if provided
  if (status) {
    url += `&status=${status}`;
  }

  try {
    const res = await fetch(url, {
      headers: getAuthHeaders(token),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      throw new Error(
        data.error?.[0]?.msg || "Failed to fetch assigned tasks.",
      );
    }

    // Validate the response data
    if (!data.data || !Array.isArray(data.data)) {
      console.error("Invalid assigned tasks response format:", data);
      return {
        data: [],
        pagination: {
          totalItems: 0,
          totalPages: 0,
          currentPage: 1,
          itemsPerPage: limit,
        },
      };
    }

    // Ensure each task has the required properties
    const validatedTasks = data.data.map((task: Partial<Task>) => ({
      id: task.id || 0,
      title: task.title || "Untitled Task",
      description: task.description || "",
      status: task.status || "PENDING",
      assignees: task.assignees || [{ id: 0, name: "Unknown" }],
      assigner: task.assigner || { id: 0, name: "Unknown" },
      createdAt: task.createdAt || new Date().toISOString(),
      updatedAt: task.updatedAt || new Date().toISOString(),
    }));

    return {
      ...data,
      data: validatedTasks as Task[],
    };
  } catch (error) {
    console.error("Error fetching assigned tasks:", error);
    throw error;
  }
};

/**
 * Fetch tasks created by the current user
 */
export const fetchCreatedTasks = async (
  token: string,
  page = 1,
  limit = 10,
  status?: string,
): Promise<TasksResponse> => {
  let url = `${API_URL}/api/task/assigner?page=${page}&limit=${limit}`;

  // Add status filter if provided
  if (status) {
    url += `&status=${status}`;
  }

  try {
    const res = await fetch(url, {
      headers: getAuthHeaders(token),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      throw new Error(data.error?.[0]?.msg || "Failed to fetch created tasks.");
    }

    // Validate the response data structure
    if (!data.data || !Array.isArray(data.data)) {
      console.error("Invalid created tasks response format:", data);
      return {
        data: [],
        pagination: {
          totalItems: 0,
          totalPages: 0,
          currentPage: 1,
          itemsPerPage: limit,
        },
      };
    }

    // Ensure each task has the required properties with proper null checking
    const validatedTasks = data.data.map((task: any) => {
      return {
        ...task,
        assignee: task.assignee || { id: 0, name: "Unknown" },
        assigner: task.assigner || { id: 0, name: "Unknown" },
      };
    });

    return {
      ...data,
      data: validatedTasks,
    };
  } catch (error) {
    console.error("Error fetching created tasks:", error);
    throw error;
  }
};

/**
 * Get task by ID
 */
export const getTaskById = async (
  token: string,
  taskId: string | number,
): Promise<Task> => {
  const res = await fetch(`${API_URL}/api/task/${taskId}`, {
    headers: getAuthHeaders(token),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch task details.");
  }

  return data.data;
};

/**
 * Create a new task
 */
export const createTask = async (
  token: string,
  taskData: TaskInput,
): Promise<{
  data: Task;
  message: string;
}> => {
  const formData = new FormData();
  formData.append("title", taskData.title);
  formData.append("description", taskData.description);
  
  if (taskData.date) {
    formData.append("date", taskData.date);
  }
  
  if (taskData.assignees && taskData.assignees.length > 0) {
    formData.append("assignees", JSON.stringify(taskData.assignees));
  }

  if (taskData.images && taskData.images.length > 0) {
    taskData.images.slice(0, 10).forEach((image, index) => {
      formData.append(`image${index + 1}`, image);
    });
  }

  const res = await fetch(`${API_URL}/api/task`, {
    method: "POST",
    headers: { token },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to create task.");
  }

  return data;
};

/**
 * Update task status (assigned user only)
 */
export const updateTaskStatus = async (
  token: string,
  taskId: string | number,
  statusData: TaskStatusUpdate,
): Promise<Task> => {
  const res = await fetch(`${API_URL}/api/task/status/${taskId}`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify(statusData),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to update task status.");
  }

  return data.data;
};

/**
 * Update task details (assigner only, and only when task is PENDING)
 */
export const updateTaskDetails = async (
  token: string,
  taskId: string | number,
  detailsData: TaskDetailsUpdate,
): Promise<Task> => {
  const formData = new FormData();
  
  if (detailsData.title !== undefined) {
    formData.append("title", detailsData.title);
  }
  if (detailsData.description !== undefined) {
    formData.append("description", detailsData.description);
  }
  if (detailsData.date !== undefined) {
    formData.append("date", detailsData.date);
  }
  if (detailsData.assigneeIds && detailsData.assigneeIds.length > 0) {
    formData.append("assigneeIds", JSON.stringify(detailsData.assigneeIds));
  }
  if (detailsData.existingPhotoUrls !== undefined) {
    formData.append("existingPhotoUrls", JSON.stringify(detailsData.existingPhotoUrls));
  }
  if (detailsData.images && detailsData.images.length > 0) {
    detailsData.images.slice(0, 10).forEach((image, index) => {
      formData.append(`image${index + 1}`, image);
    });
  }

  const res = await fetch(`${API_URL}/api/task/details/${taskId}`, {
    method: "PATCH",
    headers: { token },
    body: formData,
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to update task details.");
  }

  return data.data;
};

export const deleteTaskImage = async (
  token: string,
  taskId: string | number,
  imageUrl: string,
): Promise<{ message: string; data: Task }> => {
  const res = await fetch(`${API_URL}/api/task/${taskId}/image`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
    body: JSON.stringify({ imageUrl }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to delete task image.");
  }

  return data;
};

export const exportTasksToExcel = async (
  token: string,
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "ALL",
  scope: "all" | "assigned" | "created",
): Promise<Blob> => {
  const statusQuery = status === "ALL" ? "" : `status=${status}`;
  const scopeQuery = `scope=${scope}`;
  const query = [statusQuery, scopeQuery].filter(Boolean).join("&");

  const res = await fetch(`${API_URL}/api/task/export/excel?${query}`, {
    method: "GET",
    headers: {
      token,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error?.[0]?.msg || "Failed to export tasks.");
  }

  return await res.blob();
};
