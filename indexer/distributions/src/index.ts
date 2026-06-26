import { commonPackage } from "@fundable-indexer/common";

import { ClaimAction } from "./db/entity/ClaimAction.js";
import { DistributionBatch } from "./db/entity/DistributionBatch.js";

export { ClaimAction } from "./db/entity/ClaimAction.js";
export { DistributionBatch } from "./db/entity/DistributionBatch.js";
export {
  DISTRIBUTION_BATCH_STATUSES,
  type DistributionBatchStatus,
  isDistributionBatchStatus,
} from "./db/status.js";

export const distributionsPackage = {
  name: "@fundable-indexer/distributions",
  role: "distribution-indexer",
  common: commonPackage.name,
} as const;

export const distributionsEntities = [DistributionBatch, ClaimAction] as const;
