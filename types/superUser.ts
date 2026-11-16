type PermissionType = "can" | "cannot";

 
 export interface PermissionsBySubject {
    [subject: string]: {
      create: PermissionType;
      read: PermissionType;
      update: PermissionType;
      delete: PermissionType;
      manage: PermissionType;
      approve: PermissionType;
    };
  }
  
  export interface GetPermissionsResponse {
    data: {
      roleId: number;
      roleName: string;
      permissionsBySubject: PermissionsBySubject;
    };
  }
  
  export interface Role {
    id: number;
    name: string;
  }
  
  export interface GetAllRolesResponse {
    data: {
      roles: Role[];
    };
  }

  export interface RoleWithCount {
    id: number;
    name: string;
    userCount: number;
  }

  export interface RoleStatsResponse {
    data: {
      totalUsers: number;
      totalRoles: number;
      roleCounts: RoleWithCount[];
    };
  }

