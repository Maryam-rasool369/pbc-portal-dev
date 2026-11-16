import { createContext } from "react";
import { createMongoAbility, MongoAbility } from "@casl/ability";

export const AbilityContext = createContext<MongoAbility | null>(null);
