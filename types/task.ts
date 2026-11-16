// types/task.ts

import { GeneralResponse } from "./global";

export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

export interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  datePlanned?: string;
  assignees: {
    id: number;
    name: string;
    email: string;
  }[];
  assigner: {
    id: number;
    name: string;
    email: string;
  };
  responses: GeneralResponse[];
  assignerId: number;
  createdAt: string;
  updatedAt: string;
  photoUrls?: string[];
}

export interface TaskInput {
  title: string;
  description: string;
  date?: string;
  assignees: number[];
  images?: File[];
}

export interface TaskStatusUpdate {
  status: TaskStatus;
}

export interface TaskDetailsUpdate {
  title?: string;
  description?: string;
  date?: string;
  assigneeIds?: number[];
  images?: File[];
  existingPhotoUrls?: string[];
}

export interface PaginationInfo {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}

export interface TasksResponse {
  data: Task[];
  pagination: PaginationInfo;
}
