export interface TenureMember {
  id: number;
  userId: number;
  roleId: number;
  user?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface TenureContent {
  id: number;
  title: string;
  url: string;
  type: string;
  isConfidential: boolean;
  tenureId: number;
  uploadedById: number;
  createdAt: string;
  updatedAt: string;
}

export interface TenureNonMember {
  id: number;
  name: string;
  roleId: number;
}

export interface Tenure {
  id: number;
  name: string;
  description?: string;
  duration: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  members?: TenureMember[];
  nonMembers?: TenureNonMember[];
  content?: TenureContent[];
}

export interface TenureData {
  data: Tenure[];
  message: string;
  total: number;
}
