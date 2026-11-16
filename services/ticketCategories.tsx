const getAuthHeaders = (token: string) => ({
  "Content-Type": "application/json",
  token,
});

export const getTicketCategoryById = async (
  token: string,
  id: string
): Promise<any> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/tickets-category/${id}`,
    {
      headers: getAuthHeaders(token),
    }
  );
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(
      data.error?.[0]?.msg || "Failed to fetch tickets' category details."
    );
  }
  return data.data;
};

export const updateTicketCategory = async (
  token: string,
  id: string,
  name: string
): Promise<any> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/tickets-category/${id}`,
    {
      method: "PUT",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ name }),
    }
  );
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(
      data.error?.[0]?.msg || "Failed to update tickets' category."
    );
  }
  return data;
};

export const deleteTicketCategory = async (
  token: string,
  id: string
): Promise<any> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/tickets-category/${id}`,
    {
      method: "DELETE",
      headers: getAuthHeaders(token),
    }
  );
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(
      data.error?.[0]?.msg || "Failed to delete tickets' category."
    );
  }
  return data;
};

export const fetchAllTicketCategories = async (
  token: string,
  page = 1,
  limit = 10
): Promise<{ data: any[]; pagination: any }> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/tickets-category?page=${page}&limit=${limit}`,
    {
      headers: getAuthHeaders(token),
    }
  );

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(
      result.error?.[0]?.msg || "Failed to fetch ticket categories."
    );
  }

  return {
    data: result.data || [],
    pagination: result.pagination || {},
  };
};

export const createTicketCategory = async (
  token: string,
  name: string
): Promise<any> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/tickets-category`,
    {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ name }),
    }
  );

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(
      result.error?.[0]?.msg || "Failed to create tickets' category."
    );
  }

  return result.data;
};
