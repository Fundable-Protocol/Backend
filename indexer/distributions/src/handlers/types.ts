import type { SorobanEvent } from "@fundable-indexer/common";

export interface DistributionEvent extends SorobanEvent {
  contractId: string;
  ledger: number;
  txHash: string;
  eventIndex: number;
  topics: string[];
  data: string;
}

export interface DistributionCreatedRecord {
  batchId: string;
  distributor: string;
  token: string;
  totalAmount: string;
  recipientCount: number;
  uniqueRef: string;
  contractId: string;
  ledger: number;
  txHash: string;
  eventIndex: number;
}

export interface TokensClaimedRecord {
  batchId: string;
  claimant: string;
  amount: string;
  eventTimestamp: string;
  contractId: string;
  ledger: number;
  txHash: string;
  eventIndex: number;
}

export interface BatchPauseRecord {
  batchId: string;
  pausedAt: string;
  contractId: string;
  ledger: number;
  txHash: string;
  eventIndex: number;
}

export interface BatchResumeRecord {
  batchId: string;
  resumedAt: string;
  contractId: string;
  ledger: number;
  txHash: string;
  eventIndex: number;
}
