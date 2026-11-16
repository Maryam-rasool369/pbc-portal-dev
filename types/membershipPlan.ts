export interface MembershipPlan {
  id: number;
  name: string;
  price: number;
  description: string;
  currency: string;
  interval: number;
  categories: MembershipCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface MembershipCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  planId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMembershipPlanRequest {
  name: string;
  price: number;
  description: string;
  currency: string;
  interval: number;
}

export interface PaginationResponse {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface MembershipPlanResponse {
  message: string;
  data: MembershipPlan[];
  pagination?: PaginationResponse;
} 