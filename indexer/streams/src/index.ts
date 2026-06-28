import { commonPackage } from "@fundable-indexer/common";

export const streamsPackage = {
  name: "@fundable-indexer/streams",
  role: "payment-stream-indexer",
  common: commonPackage.name,
} as const;

export { Stream } from "./db/entity/Stream.js";
export { WithdrawalAction } from "./db/entity/WithdrawalAction.js";
export { CancelAction } from "./db/entity/CancelAction.js";
