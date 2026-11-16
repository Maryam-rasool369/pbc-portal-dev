import { toast } from "react-toastify";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface EventSponsor {
  id: number;
  brandName: string;
  brandDescription?: string;
  brandWebsite?: string;
  brandLogo?: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  paymentReference?: string;
  vatPercentage?: number | null;
  vatAmount?: number | null;
  totalAmount?: number | null;
  userId: number;
  eventId: number;
  packageId: number;
  package: {
    id: number;
    name: string;
    description?: string;
    price: number;
    benefits: string[];
    isActive: boolean;
  };
  user: {
    id: number;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EventSponsorApprovalHistory {
  id: number;
  sponsorId: number;
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

interface Pagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
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
  } else {
    showToast && toast.success(data?.message || "Operation successful");
  }
  return data;
};

/**
 * Get all event sponsors (paginated)
 */
export const fetchEventSponsors = async (
  token: string,
  eventId: number,
  page = 1,
  limit = 10,
  status?: string,
  approvalStatus?: string
): Promise<{ data: EventSponsor[]; pagination?: Pagination }> => {
  const queryParams = new URLSearchParams();
  queryParams.append("page", page.toString());
  queryParams.append("limit", limit.toString());
  if (status) {
    queryParams.append("status", status);
  }
  if (approvalStatus) {
    queryParams.append("approvalStatus", approvalStatus);
  }

  const res = await fetch(
    `${API_URL}/api/event-sponsors/event/${eventId}?${queryParams.toString()}`,
    {
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return {
    data: data.data || [],
    pagination: data.pagination,
  };
};

/**
 * Get single event sponsor by ID
 */
export const getEventSponsorById = async (
  token: string,
  sponsorId: number
): Promise<EventSponsor> => {
  const res = await fetch(
    `${API_URL}/api/event-sponsors/${sponsorId}`,
    {
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return data.data;
};

/**
 * Approve or reject an event sponsor
 */
export const approveRejectEventSponsor = async (
  token: string,
  sponsorId: number,
  approvalStatus: "APPROVED" | "REJECTED",
  comment?: string
): Promise<{ data: EventSponsor }> => {
  const res = await fetch(
    `${API_URL}/api/event-sponsor-approval/add`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({
        sponsorId,
        status: approvalStatus,
        comment,
      }),
    }
  );
  const data = await handleResponse(res, true);
  return data;
};

/**
 * Get approval history for an event sponsor
 */
export const getEventSponsorApprovalHistory = async (
  token: string,
  sponsorId: number
): Promise<EventSponsorApprovalHistory[]> => {
  const res = await fetch(
    `${API_URL}/api/event-sponsors/${sponsorId}`,
    {
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return data.data?.EventSponsorshipApproval || [];
};
