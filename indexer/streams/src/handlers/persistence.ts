import type { SorobanEventInput } from "@fundable-indexer/common";
import type { StreamPersistence } from "../db/repository.js";

export interface EventIdentityStore {
  isEventProcessed(
    contractId: string,
    ledgerNumber: number,
    txHash: string,
    eventIndex: number,
  ): Promise<boolean>;
  recordEventProcessed(
    contractId: string,
    ledgerNumber: number,
    txHash: string,
    eventIndex: number,
  ): Promise<boolean>;
}

export interface StreamHandlerDeps {
  streams: StreamPersistence;
  events: EventIdentityStore;
}

export function deriveEventIndex(event: SorobanEventInput): number {
  const segments = event.id.split("-");
  const last = segments[segments.length - 1];
  const parsed = Number.parseInt(last ?? "", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
