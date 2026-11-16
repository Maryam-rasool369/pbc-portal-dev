import { GetPermissionsResponse, GetAllRolesResponse, RoleStatsResponse } from "@/types/superUser";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const getAllProfiles = async (token: string, roleId: string): Promise<GetPermissionsResponse> => {
    const res = await fetch(
        `${API_URL}/api/user/all-roles-permissions/${roleId}`,
        {
            headers: {
                "Content-Type": "application/json",
                token,
            },
        }
    )
    const data = await res.json();
    if (!res.ok || data.error) {
        throw new Error(data.error?.[0]?.msg || "Failed to fetch profiles");
    }
    return data;
}
export const updateRolePermission = async (
    token: string,
    roleId: string,
    action: string,
    subject: string,
    permission: string
) => {
    const body = {
        roleId,
        action,
        subject,
        permission,
    }
    const res = await fetch(
        `${API_URL}/api/user/update-role-permission`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                token,
            },
            body: JSON.stringify(body),
        }
    )
    const data = await res.json();
    if (!res.ok || data.error) {
        throw new Error(data.error?.[0]?.msg || "Failed to update role permission");
    }
    return data;
}

export const getAllActions = async (token: string): Promise<GetAllRolesResponse>=> {
    const res = await fetch(
        `${API_URL}/api/user/roles`,
        {
            headers: {
                "Content-Type": "application/json",
                token,
            },
        }
    )
    const data = await res.json();
    if (!res.ok || data.error) {
        throw new Error(data.error?.[0]?.msg || "Failed to fetch actions");
    }
    return data;
}

export const getRoleStats = async (token: string): Promise<RoleStatsResponse> => {
    const res = await fetch(
        `${API_URL}/api/user/role-stats`,
        {
            headers: {
                "Content-Type": "application/json",
                token,
            },
        }
    )
    const data = await res.json();
    if (!res.ok || data.error) {
        throw new Error(data.error?.[0]?.msg || "Failed to fetch role stats");
    }
    return data;
}