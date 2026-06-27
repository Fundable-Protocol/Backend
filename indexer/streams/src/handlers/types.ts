import type { SorobanEvent } from "@fundable-indexer/common";

export interface StreamEvent extends SorobanEvent {
  contractId: string;
  ledger: number;
  txHash: string;
  eventIndex: number;
  topics: string[];
  data: string;
}

export interface FundedRecord {
  streamId: string;
  amount: string;
  contractId: string;
  ledger: number;
  txHash: string;
  eventIndex: number;
}

export interface WithdrawalRecord {
  streamId: string;
  recipient: string;
  amount: string;
  contractId: string;
  ledger: number;
  txHash: string;
  eventIndex: number;
}

export interface CancelRecord {
  streamId: string;
  cancelledBy: string;
  refundedAmount: string;
  contractId: string;
  ledger: number;
  txHash: string;
  eventIndex: number;
}
