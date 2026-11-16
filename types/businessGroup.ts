export interface BusinessGroup {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}
