import { useEffect } from "react";
import { AbilityContext } from "@/context/AbilityContext";
import { defineAbilitiesFrom } from "@/utils/ability";

import { ReactNode } from "react";

export const PermissionProvider = ({
  children,
  permissions,
}: {
  children: ReactNode;
  permissions: any;
}) => {
  const ability = defineAbilitiesFrom(permissions);

  useEffect(() => {
    ability.update(defineAbilitiesFrom(permissions).rules);
  }, [permissions]);

  return (
    <AbilityContext.Provider value={ability}>
      {children}
    </AbilityContext.Provider>
  );
};
