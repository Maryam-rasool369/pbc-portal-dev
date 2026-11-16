import { MembershipPlan, CreateMembershipPlanRequest, MembershipPlanResponse } from "@/types/membershipPlan";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const fetchMembershipPlans = async (
  token: string,
  page: number = 1,
  limit: number = 10,
  status?: string
): Promise<MembershipPlanResponse> => {
  const url = `${API_URL}/api/membership-plan?page=${page}&limit=${limit}${status ? `&status=${status}` : ''}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Error fetching membership plans");
  }

  if (!data.pagination && data.data) {
    return {
      message: data.message,
      data: data.data,
      pagination: {
        totalItems: data.data.length,
        totalPages: 1,
        currentPage: 1,
        pageSize: data.data.length
      }
    };
  }

  return data;
};

export const createMembershipPlan = async (
  token: string,
  planData: CreateMembershipPlanRequest
): Promise<{ message: string; data: MembershipPlan }> => {
  const response = await fetch(`${API_URL}/api/membership-plan/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token,
    },
    body: JSON.stringify(planData),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Error creating membership plan");
  }

  return data;
};

export const getMembershipPlanById = async (
  token: string,
  planId: number
): Promise<{ message: string; data: MembershipPlan }> => {
  const response = await fetch(`${API_URL}/api/membership-plan/${planId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Error fetching membership plan");
  }

  return data;
};

export const updateMembershipPlan = async (
  token: string,
  planId: number,
  planData: Partial<CreateMembershipPlanRequest>
): Promise<{ message: string; data: MembershipPlan }> => {
  const response = await fetch(`${API_URL}/api/membership-plan/${planId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      token,
    },
    body: JSON.stringify(planData),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Error updating membership plan");
  }

  return data;
};

export const deleteMembershipPlan = async (
  token: string,
  planId: number
): Promise<{ message: string }> => {
  const response = await fetch(`${API_URL}/api/membership-plan/${planId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Error deleting membership plan");
  }

  return data;
}; 