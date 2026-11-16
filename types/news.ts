export interface NewsItem {
  id: number;
  title: string;
  content: string;
  photoUrls: string[];
  videoUrl?: string;
  retentionPeriod?: number;
  datePlanned?: string;
  isArchived: boolean;
  authorId: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    name: string;
    email: string;
    Role: {
      id: number;
      name: string;
    };
  };
}

export interface NewsCreatePayload {
  title: string;
  content: string;
  date: string;
  videoUrl?: string;
  retentionPeriod?: number;
  images?: File[];
}

export interface NewsUpdatePayload {
  title?: string;
  content?: string;
  date?: string;
  videoUrl?: string;
  retentionPeriod?: number;
  isArchived?: boolean;
  images?: File[];
  // Individual image slots for targeted updates
  image1?: File | null;
  image2?: File | null;
  image3?: File | null;
  image4?: File | null;
  // Complete photoUrls array for desired final state
  photoUrls?: string[];
}

export interface NewsPaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface NewsResponse {
  message: string;
  data: NewsItem[];
  pagination?: NewsPaginationMeta;
}

export interface NewsDetailResponse {
  message: string;
  data: NewsItem;
}

export interface NewsCreateResponse {
  message: string;
  data: {
    id: number;
    title: string;
    photoUrls: string[];
    createdAt: string;
  };
}

export interface NewsUpdateResponse {
  message: string;
  data: {
    id: number;
    title: string;
    updatedAt: string;
  };
}

export interface NewsFilters {
  page?: number;
  limit?: number;
  isArchived?: boolean;
  searchTerm?: string;
  sort?: "newest" | "oldest";
}
