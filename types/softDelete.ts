export interface SoftDeleteUser {
  id: number;
  name: string;
  email: string;
}

export interface SoftDeleteRequester {
  id: number;
  name: string;
  email: string;
  Role: {
    id: number;
    name: string;
  };
}

export interface SoftDeleteVote {
  id: number;
  softDeleteRequestId: number;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
    Role: {
      id: number;
      name: string;
    };
  };
  vote: 'PENDING' | 'APPROVED' | 'REJECTED';
  description?: string;
  createdAt: string;
}

export interface SoftDeleteRequest {
  id: number;
  userId: number;
  user: SoftDeleteUser;
  requestedById: number;
  requestedBy: SoftDeleteRequester;
  finalDecision: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
  SoftDeleteVote: SoftDeleteVote[];
  hasVoted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSoftDeleteRequest {
  userId: number;
  reason?: string;
}

export interface VoteSoftDeleteRequest {
  softDeleteRequestId: number;
  vote: 'APPROVED' | 'REJECTED';
  description?: string;
}
