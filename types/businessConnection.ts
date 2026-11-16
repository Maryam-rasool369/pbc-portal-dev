export type BusinessNature = "BOUGHT" | "SOLD" | "PARTNERSHIP";

export interface BusinessConnectionUser {
  id: number;
  name: string;
  email: string;
  membership: { id: number; companyName: string } | null;
}

export interface BusinessConnectionNonMember {
  id: number;
  businessConnectionId: number;
  name: string;
  companyName: string | null;
}

export interface BusinessConnectionAttachment {
  id: number;
  businessConnectionId: number;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface BusinessConnection {
  id: number;
  userId: number;
  connectedUserId: number | null;
  date: string;
  natureOfBusiness: BusinessNature;
  description: string;
  amount: number | null;
  createdAt: string;
  updatedAt: string;
  user: BusinessConnectionUser;
  connectedUser: BusinessConnectionUser | null;
  businessConnectionNonMembers: BusinessConnectionNonMember[];
  attachments: BusinessConnectionAttachment[];
}

export interface BusinessConnectionsPagination {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface BusinessConnectionsResponse {
  message: string;
  data: BusinessConnection[];
  pagination: BusinessConnectionsPagination;
}

export interface BusinessConnectionFormValues {
  date: string;
  natureOfBusiness: BusinessNature;
  description: string;
  amount: string;
  connectionMode: "member" | "non-member";
  connectedUserId: string;
  connectedNonMemberName: string;
  companyName: string;
  attachments: Array<File | null>;
}
