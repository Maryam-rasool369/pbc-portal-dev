export const addDiscount = async (token: string, payload: any) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/discount/add`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify(payload),
    },
  );

  const result = await res.json();
  if (!res.ok || result.error) {
    throw new Error(
      result.error?.[0]?.msg || result.message || "Failed to add discount",
    );
  }

  return result.data;
};

export const getDiscount = async (token: string, id: string | string[]) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/discount/${id}`,
    {
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch discount");
  }

  return data.data;
};

export const updateDiscount = async (
  token: string,
  id: number,
  payload: any,
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/discount/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        token,
      },
      body: JSON.stringify(payload),
    },
  );

  const result = await res.json();

  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || "Failed to update discount");
  }

  return result.data;
};

export const deleteDiscount = async (token: string, id: number) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/discount/${id}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        token,
      },
    },
  );

  const result = await res.json();
  if (!res.ok || result.error) {
    throw new Error(result.error?.[0]?.msg || "Failed to delete discount");
  }

  return result.message;
};
