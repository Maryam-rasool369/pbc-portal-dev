// types/voting.ts

export enum ElectionState {
  ACTIVE = "ACTIVE",
  SUCCESSFUL = "SUCCESSFUL",
  UNSUCCESSFUL = "UNSUCCESSFUL",
}

export enum ElectionType {
  POLICY_ELECTION = "POLICY_ELECTION",
  CANDIDATE_ELECTION = "CANDIDATE_ELECTION",
  POLLING_ELECTION = "POLLING_ELECTION",
}

export enum PolicyType {
  CONSTITUTION = "CONSTITUTION",
  POLICY = "POLICY",
}

export interface Election {
  id: number;
  title: string;
  description: string;
  type: ElectionType;
  startDate: string;
  endDate: string;
  candidateIds?: number[];
  policyId?: number;
  [key: string]: any;
  hasVoted?: boolean;
  outcome?: string;
  state: ElectionState;
  pollOptions?: string[];
}

export interface Policy {
  id: number;
  userId: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface VotePayload {
  electionId: string;
  vote: string | number;
}

export interface ElectionRule {
  id: number;
  title: string;
  content: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdBy: number;
  createdAt: string;
  creator?: {
    id: number;
    name: string;
    email: string;
  };
  approvals?: ElectionRuleApproval[];
}

export interface ElectionRuleApproval {
  id: number;
  userId: number;
  status: "APPROVED" | "REJECTED";
  comment?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    Role?: {
      id: number;
      name: string;
    };
  };
}
