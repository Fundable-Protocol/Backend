export interface Event {
  id: string;
  ledger: number;
  contractId: string;
  topics: string[];
  data: any;
  timestamp: Date;
}

export interface GetEventsParams {
  startLedger: number;
  limit?: number;
  contractId?: string;
  topics?: string[];
}

export interface SorobanRpc {
  getEvents(params: GetEventsParams): Promise<Event[]>;
  getLatestLedger(): Promise<number>;
}
