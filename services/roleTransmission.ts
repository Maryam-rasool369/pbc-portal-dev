const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

// Fetch all role transmission requests
export const fetchAllRoleTransmissions = async (
  token: string, 
  page?: number, 
  limit?: number
): Promise<{ data: RoleTransmissionRequest[]; pagination?: any }> => {
  const queryParams = new URLSearchParams();
  if (page !== undefined) queryParams.append('page', page.toString());
  if (limit !== undefined) queryParams.append('limit', limit.toString());
  
  const url = `${API_URL}/api/user/role-transmission${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.[0]?.msg || "Error fetching role transition requests");
  }

  return {
    data: data.data,
    pagination: data.pagination,
  };
};

// Create a new role transmission request
export const createRoleTransmissionRequest = async (
  token: string,
  requestData: CreateRoleTransmissionRequest
): Promise<RoleTransmissionRequest> => {
  const response = await fetch(`${API_URL}/api/user/create-role-transmission-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token,
    },
    body: JSON.stringify(requestData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.[0]?.msg || "Error creating role transition request");
  }

  return data.data;
};

// Vote on a role transmission request
export const voteRoleTransmission = async (
  token: string,
  voteData: VoteRoleTransmissionRequest
): Promise<RoleTransmissionRequest> => {
  const response = await fetch(`${API_URL}/api/user/vote-role-transmission`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token,
    },
    body: JSON.stringify(voteData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.[0]?.msg || "Error voting on role transition request");
  }

  return data.data;
};

// Fetch a single role transmission by ID
export const fetchRoleTransmissionById = async (
  token: string,
  roleTransmissionId: number
): Promise<RoleTransmissionRequest> => {
  const response = await fetch(`${API_URL}/api/user/role-transmission/${roleTransmissionId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.[0]?.msg || "Error fetching role transition details");
  }

  return data.data;
};

export const exportRoleTransmissionsToExcel = async (
  token: string,
  finalDecision: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL',
): Promise<Blob> => {
  const query = finalDecision === 'ALL' ? '' : `?finalDecision=${finalDecision}`;
  const response = await fetch(
    `${API_URL}/api/user/role-transmission/export/excel${query}`,
    {
      method: 'GET',
      headers: {
        token,
      },
    },
  );

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error?.[0]?.msg || 'Error exporting role transitions');
  }

  return await response.blob();
};
