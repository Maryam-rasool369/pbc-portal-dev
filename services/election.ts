// services/voting.ts

import { Policy } from "@/types/election";
import { VotePayload } from "@/types/election";
import { Election } from "@/types/election";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = (token: string) => ({
  "Content-Type": "application/json",
  token,
});

export const fetchAllElections = async (
  token: string,
  page = 1,
  limit = 10
): Promise<Election[]> => {
  const res = await fetch(
    `${API_URL}/api/election?page=${page}&limit=${limit}`,
    {
      headers: getAuthHeaders(token),
    }
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch elections.");
  }

  return data.data;
};

export const fetchElectionById = async (
  token: string,
  electionID: string | string[]
): Promise<Election> => {
  const res = await fetch(`${API_URL}/api/election/${electionID}`, {
    headers: getAuthHeaders(token),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch election.");
  }

  return data.data;
};

export const castVote = async (
  token: string,
  payload: VotePayload
): Promise<any> => {
  const res = await fetch(`${API_URL}/api/election/vote`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to cast vote.");
  }

  return data;
};

export const fetchElectionResult = async (
  token: string,
  electionId: string | string[]
): Promise<any> => {
  const res = await fetch(`${API_URL}/api/election/results/${electionId}`, {
    headers: getAuthHeaders(token),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(
      data.error?.[0]?.msg || data.message || "Failed to fetch results."
    );
  }
  return data;
};

export const createElection = async (
  token: string,
  payload: any
): Promise<Election> => {
  const res = await fetch(`${API_URL}/api/election`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to create election.");
  }

  return data.data;
};

// ---- Policies ----

export const fetchAllPolicies = async (
  token: string,
  page?: number | null,
  limit?: number | null
): Promise<any> => {
  const paginationParams = page && limit ? `?page=${page}&limit=${limit}` : "";
  const res = await fetch(`${API_URL}/api/policy${paginationParams}`, {
    headers: getAuthHeaders(token),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch policies.");
  }

  return data;
};

export const createPolicy = async (
  token: string,
  payload: { title: string; description: string }
): Promise<Policy> => {
  const res = await fetch(`${API_URL}/api/policy/add`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to create policy.");
  }

  return data.data;
};

export const getPolicyById = async (
  token: string,
  policyId: string
): Promise<Policy> => {
  const res = await fetch(`${API_URL}/api/policy/${policyId}`, {
    headers: getAuthHeaders(token),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch policy.");
  }

  return data.data;
};

export const editPolicy = async (
  token: string,
  policyId: string,
  payload: Partial<Policy>
): Promise<Policy> => {
  const res = await fetch(`${API_URL}/api/policy/${policyId}`, {
    method: "PATCH",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to update policy.");
  }

  return data.data;
};

export const deletePolicy = async (
  token: string,
  policyId: string
): Promise<void> => {
  const res = await fetch(`${API_URL}/api/policy/${policyId}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to delete policy.");
  }
};
