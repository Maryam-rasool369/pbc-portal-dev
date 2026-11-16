// types/attendance.ts

export interface Attendance {
  id: number;
  locationIn: string;
  clockIn: string;
  locationOut: string;
  clockOut: string;
  tasks: string;
  userId: number;
  user?: {
    id: number;
    name: string;
  };
}

export interface AttendanceInput {
  location: string;
}

export interface TasksUpdate {
  tasks: string;
}

export interface PaginationInfo {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface AttendanceResponse {
  data: Attendance[];
  pagination: PaginationInfo;
}

export interface SingleAttendanceResponse {
  data: Attendance | null;
}
