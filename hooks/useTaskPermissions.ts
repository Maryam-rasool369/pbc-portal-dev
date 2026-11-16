import { useAbility } from "./useAbility";
import useAuthStore from "@/store/authStore";
import { Roles } from "@/enums/Roles";
import {
  canReadTasks,
  canCreateTasks,
  canViewAllTasks,
  canUpdateTaskStatus,
  getDefaultTab,
  isHigherManagement,
} from "@/utils/permissions";

export const useTaskPermissions = () => {
  const ability = useAbility();
  const user = useAuthStore((state) => state.user);
  const userRole: Roles = (user?.Role?.name as Roles) || "";

  const canAccessPage = ability?.can("read", "Task") && canReadTasks(userRole);
  const canCreate = ability?.can("create", "Task") && canCreateTasks(userRole);
  const canViewAll = canViewAllTasks(userRole);
  const canUpdateTask = canUpdateTaskStatus(userRole);
  const isHigherManagementRole = isHigherManagement(userRole);
  const defaultTab = getDefaultTab(userRole);

  return {
    canAccessPage,
    canCreate,
    canViewAll,
    canUpdateTask,
    isHigherManagementRole,
    defaultTab,
    userRole,
  };
}; 