import { Roles } from "@/enums/Roles";

export const isHigherManagement = (role: Roles): boolean => {
  return [
    Roles.CHAIRMAN,
    Roles.GENERAL_SECRETARY,
    Roles.VC_FINANCE,
    Roles.DIRECTOR,
    Roles.PBC_ADVISOR,
  ].includes(role);
};

export const canReadTasks = (role: Roles): boolean => {
    return Object.values(Roles).includes(role);
  };

export const canCreateTasks = (role: Roles): boolean => {
  return isHigherManagement(role);
};

export const canViewAllTasks = (role: Roles): boolean => {
  return isHigherManagement(role);
};

export const canUpdateTaskStatus = (role: Roles): boolean => {
  return [Roles.PBC_STAFF, Roles.ADMIN, ...Object.values(Roles)].includes(role);
};

export const getDefaultTab = (role: Roles): string => {
  if (role === Roles.DIRECTOR) return "created";
  if (isHigherManagement(role)) return "all";
  return "assigned";
};
