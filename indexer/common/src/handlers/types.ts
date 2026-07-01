export interface SorobanEventInput {
  contractId: string;
  ledger: number;
  ledgerClosedAt: string;
  topic: string[];
  data: unknown;
  id: string;
  pagingToken: string;
}

export type HandlerResult = { ok: true } | { ok: false; error: string; retriable: boolean };

export type EventHandler = (event: SorobanEventInput) => Promise<HandlerResult>;

export interface HandlerFilter {
  contractId?: string;
  topic?: string;
  eventName?: string;
}
