import { AbilityBuilder, createMongoAbility } from "@casl/ability";

interface Permission {
  action: {
    name: string;
  };
  subject: string;
  permission: "can" | "cannot";
}

export const defineAbilitiesFrom = (permissions: Permission[]) => {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

  const canPermissions: Permission[] = [];
  const cannotPermissions: Permission[] = [];
  permissions?.forEach((perm) => {
    if (perm.permission === "can") {
      canPermissions.push(perm);
    } else if (perm.permission === "cannot") {
      cannotPermissions.push(perm);
    }
  });
  canPermissions.forEach(({ action, subject }) => {
    can(action.name, subject);
  });
  cannotPermissions.forEach((perm) => {
    const hasManagePermission = canPermissions.some(
      (canPerm) =>
        canPerm.subject === perm.subject &&
        canPerm.action.name.toLowerCase() === "manage",
    );
    if (hasManagePermission) {
      return; 
    }
    if (perm.action.name.toLowerCase() === "manage") {
      const hasSpecificCanActions = canPermissions.some(
        (canPerm) =>
          canPerm.subject === perm.subject &&
          canPerm.action.name.toLowerCase() !== "manage",
      );
      if (!hasSpecificCanActions) {
        cannot(perm.action.name, perm.subject);
      }
    } else {
      cannot(perm.action.name, perm.subject);
    }
  });

  return build();
};
