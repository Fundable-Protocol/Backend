export interface DistributionCreatedPayload {
  distributionId: string;
  creator: string;
  token: string;
  totalAmount: string;
  recipientCount: number;
  transactionHash: string;
}

export interface TokensClaimedPayload {
  distributionId: string;
  claimant: string;
  amount: string;
  transactionHash: string;
}

export interface DistributionPausedPayload {
  distributionId: string;
  pausedBy: string;
  transactionHash: string;
}

export interface DistributionResumedPayload {
  distributionId: string;
  resumedBy: string;
  transactionHash: string;
}

function str(v: unknown): string {
  return v !== undefined && v !== null ? String(v) : "";
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function parseDistributionCreated(
  data: unknown,
): DistributionCreatedPayload {
  const d = data as Record<string, unknown>;
  return {
    distributionId: str(d.distributionId ?? d.distribution_id),
    creator: str(d.creator),
    token: str(d.token),
    totalAmount: str(d.totalAmount ?? d.total_amount ?? "0"),
    recipientCount: num(d.recipientCount ?? d.recipient_count),
    transactionHash: str(d.transactionHash ?? d.tx_hash),
  };
}

export function parseTokensClaimed(data: unknown): TokensClaimedPayload {
  const d = data as Record<string, unknown>;
  return {
    distributionId: str(d.distributionId ?? d.distribution_id),
    claimant: str(d.claimant),
    amount: str(d.amount ?? "0"),
    transactionHash: str(d.transactionHash ?? d.tx_hash),
  };
}

export function parseDistributionPaused(
  data: unknown,
): DistributionPausedPayload {
  const d = data as Record<string, unknown>;
  return {
    distributionId: str(d.distributionId ?? d.distribution_id),
    pausedBy: str(d.pausedBy ?? d.paused_by),
    transactionHash: str(d.transactionHash ?? d.tx_hash),
  };
}

export function parseDistributionResumed(
  data: unknown,
): DistributionResumedPayload {
  const d = data as Record<string, unknown>;
  return {
    distributionId: str(d.distributionId ?? d.distribution_id),
    resumedBy: str(d.resumedBy ?? d.resumed_by),
    transactionHash: str(d.transactionHash ?? d.tx_hash),
  };
}
