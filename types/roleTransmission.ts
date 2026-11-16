export interface RoleTransmissionRequest {
  id: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  finalDecision: 'PENDING' | 'APPROVED' | 'REJECTED';
  prevRoleId: number;
  prevRole: {
    id: number;
    name: string;
  };
  newRoleId: number;
  newRole: {
    id: number;
    name: string;
  };
  requestedById: number;
  requestedBy: {
    id: number;
    name: string;
    email: string;
    Role: {
      id: number;
      name: string;
    };
  };
  RoleTransmissionVote: RoleTransmissionVote[];
  hasVoted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleTransmissionVote {
  id: number;
  roleTransmissionId: number;
  userId: number;
  user: {
    id: number;
    name: string;
    email: string;
  };
  vote: 'PENDING' | 'APPROVED' | 'REJECTED';
  description?: string;
  createdAt: string;
}

export interface CreateRoleTransmissionRequest {
  userId: number;
  newRoleId: number;
}

export interface VoteRoleTransmissionRequest {
  roleTransmissionId: number;
  vote: 'APPROVED' | 'REJECTED';
  description?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  Role: {
    id: number;
    name: string;
  };
}

export interface Role {
  id: number;
  name: string;
}
