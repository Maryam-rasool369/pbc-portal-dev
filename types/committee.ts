export interface CommitteeMember {
  id: number;
  role: "HEAD" | "MEMBER" | "SECRETARY" | "TREASURER";
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CommitteeContent {
  id: number;
  title: string;
  url: string;
  type: "IMAGE" | "PDF" | "PRESENTATION" | "VIDEO" | "OTHER";
  isConfidential: boolean;
  subCommitteeId?: number | null;
  subCommittee?: { id: number; name: string } | null;
  createdAt: string;
  uploadedBy: {
    id: number;
    name: string;
    email: string;
  };
}

export interface Committee {
  id: number;
  name: string;
  details?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  members?: CommitteeMember[];
  subCommittees?: Committee[];
  content?: CommitteeContent[];
}

export interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface ActionPoint {
  description: string;
  assignedTo: number;
}

export interface CommitteePayload {
  title?: string;
  name?: string;
  details?: string;
  venue?: string;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  userIds?: number[];
  members?: Array<{
    userId: number;
    role?: "HEAD" | "MEMBER" | "SECRETARY" | "TREASURER";
  }>;
  actionPoints?: ActionPoint[];
}

// ─── Committee Meeting Types ─────────────────────────────────────────────────

export interface CommitteeMeetingActionPoint {
  id?: number;
  description: string;
  assignedTo?: number;
  status?: "PENDING" | "COMPLETED" | "TRANSFERRED";
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CommitteeMeetingAssignee {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export interface CommitteeMeetingAttendanceRecord {
  userId: number;
  status: "ATTENDED" | "NOT_ATTENDED";
  user?: { name: string; email: string };
}

export interface CommitteeMeeting {
  id: number;
  title: string;
  details?: string;
  venue?: string;
  startDate: string;
  endDate: string;
  timezone?: string;
  committeeId?: number;
  subCommitteeId?: number;
  meetingStatus: "PENDING" | "ONGOING" | "COMPLETED" | "CANCELLED";
  meetingMOM?: string;
  meetingMOMPDF?: string;
  meetingMOMStatus?: "PENDING" | "APPROVED" | "REJECTED" | "NOT_SUBMITTED";
  meetingMOMEditor?: { id: number; name: string; email: string };
  meetingMOMReviewer?: { id: number; name: string; email: string };
  userId?: number;
  userIds?: number[];
  actionPoints?: CommitteeMeetingActionPoint[];
  assignees?: CommitteeMeetingAssignee[];
  attendance?: CommitteeMeetingAttendanceRecord[];
  users?: Array<{ id: number; name: string; email: string }>;
  momApprovals?: Array<{
    id: number;
    meetingId: number;
    userId: number;
    status: "APPROVED" | "REJECTED";
    comment?: string;
    createdAt: string;
    user: {
      id: number;
      name: string;
      email: string;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}
