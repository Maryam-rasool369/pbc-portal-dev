export type NewsletterStatus = "PENDING" | "PUBLISHED";

export interface NewsletterAuthor {
  id: number;
  name: string;
  email: string;
  Role?: {
    id: number;
    name: string;
  };
}

export interface NewsletterItem {
  id: number;
  title: string;
  content: string;
  photoUrls: string[];
  videoUrls: string[];
  articleUrls: string[];
  authorId: number;
  recipients: number[];
  status: NewsletterStatus;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  author: NewsletterAuthor;
}

export interface NewsletterRecipientUser {
  id: number;
  name: string;
  email: string;
}

export interface NewsletterCreatePayload {
  title: string;
  content: string;
  videoUrls?: string[];
  articleUrls?: string[];
  publishedAt?: string;
  recipients?: number[];
  images?: File[];
}

export interface NewsletterUpdatePayload {
  title: string;
  content: string;
  videoUrls?: string[];
  articleUrls?: string[];
  publishedAt?: string;
  recipients?: number[];
  images?: File[];
  existingPhotoUrls?: string[];
}

export interface NewsletterFilters {
  page?: number;
  limit?: number;
  searchTerm?: string;
}

export interface NewsletterPaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface NewsletterResponse {
  message: string;
  data: NewsletterItem[];
  pagination?: NewsletterPaginationMeta;
}

export interface NewsletterDetailResponse {
  message: string;
  data: NewsletterItem;
}

export interface NewsletterCreateResponse {
  message: string;
  data: NewsletterItem;
}

export interface NewsletterUpdateResponse {
  message: string;
  data: NewsletterItem;
}
