export const commonPackage = {
  name: "@fundable-indexer/common",
  role: "shared-infrastructure",
} as const;

// Re-export database module
export * from "./db/index.js";
