const API_URL = process.env.NEXT_PUBLIC_API_URL;

const handleResponse = async (res: Response) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    throw new Error(
      data?.error?.[0]?.msg || data?.message || `Request failed with status ${res.status}`,
    );
  }
  return data;
};

export const deleteMembershipAttachment = async (
  token: string,
  membershipId: string | number,
  attachmentId: string | number,
) => {
  const res = await fetch(
    `${API_URL}/api/membership/${membershipId}/attachments/${attachmentId}`,
    {
      method: "DELETE",
      headers: { token },
    },
  );

  return handleResponse(res);
};
