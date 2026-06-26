/**
 * Lifecycle status for a distribution batch.
 * `paused` and `active` support pause/resume indexing behavior.
 */
export const DISTRIBUTION_BATCH_STATUSES = ["active", "paused", "completed", "cancelled"] as const;

export type DistributionBatchStatus = (typeof DISTRIBUTION_BATCH_STATUSES)[number];

export function isDistributionBatchStatus(value: string): value is DistributionBatchStatus {
  return (DISTRIBUTION_BATCH_STATUSES as readonly string[]).includes(value);
}
