interface CategoryPermission {
  categoryId: number;
  categoryName: string;
  fieldPermissions: Record<string, boolean>;
}

interface ProfileVisibilityResponse {
  message: string;
  data: {
    permissions: CategoryPermission[];
  };
}

interface FieldVisibilityData {
  field: string;
  visibleToCategories: Array<{
    categoryId: number;
    isVisible: boolean;
  }>;
}

export const fetchProfileVisibility = async (token: string): Promise<CategoryPermission[]> => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/permissions`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        token: token,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: ProfileVisibilityResponse = await response.json();
    return data.data.permissions;
  } catch (error) {
    console.error("Error fetching profile visibility:", error);
    throw error;
  }
};

export const updateProfileVisibility = async (
  token: string,
  fieldVisibilityData: FieldVisibilityData[]
): Promise<void> => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/profile-visibility`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        token: token,
      },
      body: JSON.stringify({
        fieldVisibilityData,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.[0]?.msg || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error updating profile visibility:", error);
    throw error;
  }
};
