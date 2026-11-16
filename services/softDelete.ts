import {
  CreateSoftDeleteRequest,
  SoftDeleteRequest,
  SoftDeleteVote,
  VoteSoftDeleteRequest,
} from '@/types/softDelete';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Fetch all soft delete requests (paginated)
export const fetchAllSoftDeleteRequests = async (
  token: string,
  page?: number,
  limit?: number,
): Promise<{ data: SoftDeleteRequest[]; pagination?: any }> => {
  const queryParams = new URLSearchParams();
  if (page !== undefined) queryParams.append('page', page.toString());
  if (limit !== undefined) queryParams.append('limit', limit.toString());

  const url = `${API_URL}/api/user/soft-delete-request/all${
    queryParams.toString() ? `?${queryParams.toString()}` : ''
  }`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      token,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.[0]?.msg || 'Error fetching soft delete requests');
  }

  return {
    data: data.data,
    pagination: data.pagination,
  };
};

// Fetch a single soft delete request by ID
export const fetchSoftDeleteRequestById = async (
  token: string,
  softDeleteRequestId: number,
): Promise<SoftDeleteRequest> => {
  const response = await fetch(
    `${API_URL}/api/user/soft-delete-request/${softDeleteRequestId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        token,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.[0]?.msg || 'Error fetching soft delete request details');
  }

  return data.data;
};

// Create a new soft delete request
export const createSoftDeleteRequest = async (
  token: string,
  requestData: CreateSoftDeleteRequest,
): Promise<SoftDeleteRequest> => {
  const response = await fetch(
    `${API_URL}/api/user/create-soft-delete-request`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        token,
      },
      body: JSON.stringify(requestData),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.[0]?.msg || 'Error creating soft delete request');
  }

  return data.data;
};

// Vote on a soft delete request
export const voteSoftDeleteRequest = async (
  token: string,
  voteData: VoteSoftDeleteRequest,
): Promise<SoftDeleteVote> => {
  const response = await fetch(
    `${API_URL}/api/user/vote-soft-delete-request`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        token,
      },
      body: JSON.stringify(voteData),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.[0]?.msg || 'Error voting on soft delete request');
  }

  return data.data;
};
