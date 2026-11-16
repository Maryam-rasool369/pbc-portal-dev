import { useContext } from "react";
import { AbilityContext } from "@/context/AbilityContext";
import { ReactNode } from "react";

type CanProps = {
  I: string;
  a: string;
  children: ReactNode;
  fallback?: ReactNode;
};

const Can = ({ I, a, children, fallback = null }: CanProps) => {
  const ability = useContext(AbilityContext) as {
    can: (action: string, subject: string) => boolean;
  } | null;

  const isAllowed = ability?.can(I, a) ?? false;

  return isAllowed ? <>{children}</> : <>{fallback}</>;
};

export default Can;
