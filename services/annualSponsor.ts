import { toast } from "react-toastify";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface AnnualSponsor {
  id: number;
  brandName: string;
  brandDescription?: string;
  brandWebsite?: string;
  brandLogo?: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED";
  paymentReference?: string;
  expiresAt?: string;
  vatPercentage?: number | null;
  vatAmount?: number | null;
  totalAmount?: number | null;
  userId: number;
  packageId: number;
  package: {
    id: number;
    name: string;
    description?: string;
    price: number;
    benefits: string[];
    stripePriceId: string;
    stripeProductId: string;
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

export interface ApprovalHistory {
  id: number;
  sponsorId: number;
  userId: number;
  status: "APPROVED" | "REJECTED";
  comment?: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    Role: {
      id: number;
      name: string;
    }
  };
}

export interface AnnualSponsorshipPackage {
  id: number;
  name: string;
  description?: string;
  price: number;
  benefits: string[];
  stripePriceId: string;
  stripeProductId: string;
  isActive: boolean;
  userId: number;
  createdAt: string;
  updatedAt: string;
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
 * Get all annual sponsors (paginated)
 */
export const fetchAnnualSponsors = async (
  token: string,
  page = 1,
  limit = 10,
  status?: string,
  approvalStatus?: string
): Promise<{ data: AnnualSponsor[]; pagination?: Pagination }> => {
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
    `${API_URL}/api/annual-sponsors?${queryParams.toString()}`,
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
 * Get single annual sponsor by ID
 */
export const getAnnualSponsorById = async (
  token: string,
  sponsorId: number
): Promise<AnnualSponsor> => {
  const res = await fetch(
    `${API_URL}/api/annual-sponsors/${sponsorId}`,
    {
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return data.data;
};

/**
 * Get user's annual sponsor (if exists)
 */
export const getUserAnnualSponsor = async (
  token: string
): Promise<AnnualSponsor | null> => {
  try {
    const res = await fetch(
      `${API_URL}/api/annual-sponsors?page=1&limit=1`,
      {
        headers: getAuthHeaders(token),
      }
    );
    const data = await handleResponse(res);
    // Filter to find current user's sponsorship
    // Note: This assumes the API returns all sponsors and we filter client-side
    // If API supports filtering by userId, use that instead
    return data.data?.[0] || null;
  } catch (error) {
    return null;
  }
};

/**
 * Create annual sponsor
 */
export const createAnnualSponsor = async (
  token: string,
  payload: {
    name: string;
    description?: string;
    website?: string;
    logo?: string;
    packageId: number;
  }
): Promise<AnnualSponsor> => {
  const formData = new FormData();
  formData.append("name", payload.name);
  if (payload.description) formData.append("description", payload.description);
  if (payload.website) formData.append("website", payload.website);
  if (payload.logo) formData.append("logo", payload.logo);
  formData.append("packageId", payload.packageId.toString());

  const res = await fetch(`${API_URL}/api/annual-sponsors/add`, {
    method: "POST",
    headers: {
      token,
    },
    body: formData,
  });
  const data = await handleResponse(res, true);
  return data.data;
};

/**
 * Create payment session for annual sponsor
 */
export const createAnnualSponsorPayment = async (
  token: string,
  sponsorId: number
): Promise<{ data: AnnualSponsor }> => {
  const res = await fetch(
    `${API_URL}/api/annual-sponsors/payment/${sponsorId}`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  return data;
};

/**
 * Update annual sponsor
 */
export const updateAnnualSponsor = async (
  token: string,
  sponsorId: number,
  payload: {
    name?: string;
    description?: string;
    website?: string;
    logo?: string;
    packageId?: number;
  }
): Promise<AnnualSponsor> => {
  const formData = new FormData();
  if (payload.name) formData.append("name", payload.name);
  if (payload.description) formData.append("description", payload.description);
  if (payload.website) formData.append("website", payload.website);
  if (payload.logo) formData.append("logo", payload.logo);
  if (payload.packageId) formData.append("packageId", payload.packageId.toString());

  const res = await fetch(`${API_URL}/api/annual-sponsors/${sponsorId}`, {
    method: "PATCH",
    headers: {
      token,
    },
    body: formData,
  });
  const data = await handleResponse(res, true);
  return data.data;
};

/**
 * Get active annual sponsorship package (legacy – returns the first active one)
 */
export const getActiveAnnualSponsorshipPackage = async (
  token: string
): Promise<AnnualSponsorshipPackage | null> => {
  try {
    const res = await fetch(
      `${API_URL}/api/annual-sponsors/package/active`,
      {
        headers: getAuthHeaders(token),
      }
    );
    const data = await handleResponse(res);
    return data.data || null;
  } catch (error) {
    console.error("Error fetching active package:", error);
    return null;
  }
};

/**
 * Get all active annual sponsorship packages (paginated)
 */
export const fetchAllActiveAnnualSponsorshipPackages = async (
  token: string,
  page = 1,
  limit = 100
): Promise<AnnualSponsorshipPackage[]> => {
  try {
    const queryParams = new URLSearchParams({
      status: "active",
      page: page.toString(),
      limit: limit.toString(),
    });
    const res = await fetch(
      `${API_URL}/api/annual-sponsorship-packages/?${queryParams.toString()}`,
      {
        headers: getAuthHeaders(token),
      }
    );
    const data = await handleResponse(res);
    return data.data || [];
  } catch (error) {
    console.error("Error fetching active packages:", error);
    return [];
  }
};

export const updateAnnualSponsorshipPackage = async (
  token: string,
  packageId: number,
  payload: {
    name?: string;
    description?: string;
    price?: number;
    benifits?: string[];
  }
): Promise<AnnualSponsorshipPackage> => {
  const res = await fetch(`${API_URL}/api/annual-sponsors/package/${packageId}`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res, true);
  return data.data;
};

/**
 * Approve or reject an annual sponsor
 */
export const approveRejectAnnualSponsor = async (
  token: string,
  sponsorId: number,
  approvalStatus: "APPROVED" | "REJECTED",
  comment?: string
): Promise<{ data: AnnualSponsor }> => {
  const res = await fetch(
    `${API_URL}/api/annual-sponsor-approval/add`,
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
 * Get approval history for a sponsor
 */
export const getApprovalHistory = async (
  token: string,
  sponsorId: number
): Promise<ApprovalHistory[]> => {
  const res = await fetch(
    `${API_URL}/api/annual-sponsors/${sponsorId}`,
    {
      headers: getAuthHeaders(token),
    }
  );
  const data = await handleResponse(res);
  // Assuming the approval history is part of the sponsor details response
  return data.data?.approvalHistory || [];
};


