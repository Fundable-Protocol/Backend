import { commonPackage } from "@fundable-indexer/common";

export const distributionsPackage = {
  name: "@fundable-indexer/distributions",
  role: "distribution-indexer",
  common: commonPackage.name,
} as const;

export * from "./handlers/index.js";
