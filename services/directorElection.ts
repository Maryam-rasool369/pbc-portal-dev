// services/directorElection.ts

import type { ElectionRule } from "@/types/election";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = (token: string) => ({
  "Content-Type": "application/json",
  token,
});

export interface CreateElectionRulePayload {
  title: string;
  content: string;
}

export interface ElectionRuleResponse {
  message: string;
  data: ElectionRule;
}

// Fetch all election rules
export const fetchAllElectionRules = async (
  token: string,
  page?: number | null,
  limit?: number | null
): Promise<any> => {
  const paginationParams = page && limit ? `?page=${page}&limit=${limit}` : "";
  const res = await fetch(`${API_URL}/api/director-elections/rules${paginationParams}`, {
    headers: getAuthHeaders(token),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch election rules.");
  }

  return data;
};

// Create a new election rule
export const createElectionRule = async (
  token: string,
  payload: CreateElectionRulePayload
): Promise<ElectionRule> => {
  const res = await fetch(`${API_URL}/api/director-elections/rules`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to create election rule.");
  }

  return data.data;
};

// Get election rule by ID
export const getElectionRuleById = async (
  token: string,
  ruleId: string
): Promise<ElectionRule> => {
  // Since there's no direct GET by ID endpoint, we'll fetch all and filter
  // Or we can use the approvals endpoint structure
  const res = await fetch(`${API_URL}/api/director-elections/rules`, {
    headers: getAuthHeaders(token),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch election rule.");
  }

  const rule = data.data.find((r: ElectionRule) => r.id === Number(ruleId));
  if (!rule) {
    throw new Error("Election rule not found.");
  }

  return rule;
};

// Get approvals for a specific rule
export const getElectionRuleApprovals = async (
  token: string,
  ruleId: string
): Promise<any[]> => {
  const res = await fetch(
    `${API_URL}/api/director-elections/rules/${ruleId}/approvals`,
    {
      headers: getAuthHeaders(token),
    }
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(
      data.error?.[0]?.msg || "Failed to fetch election rule approvals."
    );
  }

  return data.data;
};

// Approve or reject an election rule
export const approveElectionRule = async (
  token: string,
  ruleId: string,
  payload: { status: "APPROVED" | "REJECTED"; comment?: string }
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/director-elections/rules/${ruleId}/approve`,
    {
      method: "PATCH",
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(
      data.error?.[0]?.msg || "Failed to approve/reject election rule."
    );
  }

  return data.data;
};

// Fetch active (APPROVED) election rules for picklist
export const fetchActiveElectionRules = async (
  token: string
): Promise<ElectionRule[]> => {
  const res = await fetch(
    `${API_URL}/api/director-elections/rules?status=APPROVED`,
    {
      headers: getAuthHeaders(token),
    }
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch active election rules.");
  }

  return data.data || [];
};

// Create director election
export interface CreateDirectorElectionPayload {
  title: string;
  term: string;
  feeAmount: number;
  ruleId: number;
  nominationStartDate: string;
  nominationEndDate: string;
  startDate: string;
  endDate: string;
}

export const createDirectorElection = async (
  token: string,
  payload: CreateDirectorElectionPayload
): Promise<any> => {
  const res = await fetch(`${API_URL}/api/director-elections/`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to create director election.");
  }

  return data.data;
};

// Fetch all director elections
export const fetchAllDirectorElections = async (
  token: string,
  page?: number | null,
  limit?: number | null
): Promise<any> => {
  const paginationParams = page && limit ? `?page=${page}&limit=${limit}` : "";
  const res = await fetch(`${API_URL}/api/director-elections${paginationParams}`, {
    headers: getAuthHeaders(token),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch director elections.");
  }

  return data;
};

// Nominate candidate for director election
export interface NominateCandidatePayload {
  organizationId: number;
  introducer1?: number;
  introducer2?: number;
  contactAddress: string;
  poBoxNo: string;
  officeTel: string;
}

export const nominateCandidate = async (
  token: string,
  electionId: number,
  payload: NominateCandidatePayload
): Promise<any> => {
  const res = await fetch(`${API_URL}/api/director-elections/${electionId}/nominate`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to submit nomination.");
  }

  return data.data;
};

// Check if user already nominated for an election
export const checkExistingNomination = async (
  token: string,
  electionId: number
): Promise<boolean> => {
  try {
    const res = await fetch(`${API_URL}/api/director-elections/${electionId}/candidates`, {
      headers: getAuthHeaders(token),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return false;
    }

    // Get current user ID from token or store
    // We'll need to check if current user is in the candidates list
    // For now, return false and handle in component
    return false;
  } catch (error) {
    return false;
  }
};

// Get candidates for an election
export const getCandidatesByElection = async (
  token: string,
  electionId: number,
  includeAll: boolean = false
): Promise<any[]> => {
  const params = includeAll ? "?includeAll=true" : "";
  const res = await fetch(`${API_URL}/api/director-elections/${electionId}/candidates${params}`, {
    headers: getAuthHeaders(token),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch candidates.");
  }

  return data.data || [];
};

// Approve or reject candidate nomination
export interface ApproveCandidatePayload {
  status: "APPROVED" | "REJECTED";
  remarks?: string;
}

export const approveCandidate = async (
  token: string,
  candidateId: number,
  payload: ApproveCandidatePayload
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/director-elections/candidates/${candidateId}/approve`,
    {
      method: "PATCH",
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to update candidate status.");
  }

  return data.data;
};

// Start election voting
export const startElection = async (
  token: string,
  electionId: number
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/director-elections/${electionId}/start`,
    {
      method: "PATCH",
      headers: getAuthHeaders(token),
    }
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to start election.");
  }

  return data.data;
};

// End election voting
export const endElection = async (
  token: string,
  electionId: number,
  status: "COMPLETED" | "CANCELLED" = "COMPLETED"
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/director-elections/${electionId}/end`,
    {
      method: "PATCH",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ status }),
    }
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to end election.");
  }

  return data.data;
};

// Generate OTP for voting
export const generateVotingOTP = async (
  token: string,
  electionId: number
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/director-elections/${electionId}/vote/otp`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
    }
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to generate OTP.");
  }

  return data;
};

// Cast vote in election
export interface CastVotePayload {
  otp: string;
  candidateIds: number[];
}

export const castVote = async (
  token: string,
  electionId: number,
  payload: CastVotePayload
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/director-elections/${electionId}/vote`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to cast vote.");
  }

  return data.data;
};

// Cast vote in runoff election
export const castRunoffVote = async (
  token: string,
  electionId: number,
  payload: CastVotePayload
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/director-elections/${electionId}/vote/runoff`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to cast runoff vote.");
  }

  return data.data;
};

// Get election results
export const getElectionResults = async (
  token: string,
  electionId: number
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/director-elections/${electionId}/results`,
    {
      headers: getAuthHeaders(token),
    }
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch election results.");
  }

  return data.data;
};

export interface UpdateElectionDatesPayload {
  nominationEndDate?: string;
  startDate?: string;
  endDate?: string;
}

export const updateElectionDates = async (
  token: string,
  electionId: number,
  payload: UpdateElectionDatesPayload
): Promise<any> => {
  const res = await fetch(
    `${API_URL}/api/director-elections/${electionId}/dates`,
    {
      method: "PATCH",
      headers: getAuthHeaders(token),
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to update election dates.");
  }

  return data.data;
};

