export interface MembershipSubCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  canVote: boolean;
  membershipCategoryId: number;
  createdAt: string;
  updatedAt: string;
  membershipCategory?: {
    id: number;
    name: string;
    slug: string;
    planId: number;
    plan?: {
      id: number;
      name: string;
      slug: string;
      price: number;
      description: string;
      currency: string;
      interval: string;
      createdAt: string;
      updatedAt: string;
    };
  };
}

export interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}