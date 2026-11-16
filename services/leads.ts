export const getAllLeads = async (
  token: string,
  pageNumber: number,
  limit: number,
) => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/leads/?page=${pageNumber}&limit=${limit}`,
    {
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch my leads");
  }

  return data;
};
