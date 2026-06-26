export interface StreamCreatedEvent {
  contractId: string;
  ledger: number;
  txHash: string;
  eventIndex: number;
  topics: string[];
  data: string;
}

export interface StreamRecord {
  id: string;
  sender: string;
  recipient: string;
  amount: string;
  startTime: string;
  endTime: string;
  contractId: string;
  ledger: number;
  txHash: string;
  eventIndex: number;
}
