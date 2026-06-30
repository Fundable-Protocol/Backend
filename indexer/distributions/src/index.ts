import { commonPackage } from "@fundable-indexer/common";

export const distributionsPackage = {
  name: "@fundable-indexer/distributions",
  role: "distribution-indexer",
  common: commonPackage.name,
} as const;

export { ClaimAction } from "./db/entity/ClaimAction.js";
export { DistributionBatch, DistributionStatus } from "./db/entity/DistributionBatch.js";
export {
  type CreateBatchInput,
  type DistributionPersistence,
  DistributionRepository,
  type RecordClaimInput,
  type SetStatusInput,
} from "./db/repository.js";
export * from "./handlers/index.js";
