import { JobCategory } from "@/types/jobCategory";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const fetchJobCategories = async (token: string) => {
  const res = await fetch(`${API_URL}/api/job-category`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to fetch categories");
  }

  return data.data as JobCategory[];
};

export const addJobCategory = async (token: string, name: string) => {
  const res = await fetch(`${API_URL}/api/job-category/add`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token,
    },
    body: JSON.stringify({ name }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to create category");
  }

  return data.data;
};

export const getJobCategoryById = async (
  token: string,
  jobCategoryId: number,
) => {
  const res = await fetch(`${API_URL}/api/job-category/${jobCategoryId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Category not found");
  }

  return data.data;
};

export const updateJobCategory = async (
  token: string,
  jobCategoryId: number,
  name: string,
) => {
  const res = await fetch(`${API_URL}/api/job-category/${jobCategoryId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      token,
    },
    body: JSON.stringify({ name }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to update category");
  }

  return data.data;
};

export const deleteJobCategory = async (
  token: string,
  jobCategoryId: number,
) => {
  const res = await fetch(`${API_URL}/api/job-category/${jobCategoryId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      token,
    },
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.[0]?.msg || "Failed to delete category");
  }

  return data.data;
};
