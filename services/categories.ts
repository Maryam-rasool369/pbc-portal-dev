export const fetchCategories = async (token?: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { token } : {}),
    },
  });

  const json = await res.json();

  if (!res.ok || json.error) {
    throw new Error("Failed to fetch categories");
  }

  return json.data;
};

export const addCategory = async (token: string, data: { name: string; description: string }) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.[0]?.msg || "Failed to add category");
  return json.data;
};

export const updateCategory = async (token: string, categoryId: number, data: { name: string; description: string }) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category/${categoryId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.[0]?.msg || "Failed to update category");
  return json.data;
};

export const deleteCategory = async (token: string, categoryId: number) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/category/${categoryId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", token },
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.[0]?.msg || "Failed to delete category");
  return json.data;
};
