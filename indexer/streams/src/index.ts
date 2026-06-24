import { commonPackage } from "@fundable-indexer/common";

export const streamsPackage = {
  name: "@fundable-indexer/streams",
  role: "payment-stream-indexer",
  common: commonPackage.name,
} as const;
