import type { SorobanEventInput } from "@fundable-indexer/common";
import type { DistributionPersistence } from "../db/repository.js";

/**
 * Subset of the shared `EventRepository` the distribution handlers depend on to
 * coordinate indexed event identity. Declared as an interface so handlers can be
 * tested with lightweight mocks.
 */
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

/** Dependencies injected into each distribution event handler. */
export interface DistributionHandlerDeps {
  distributions: DistributionPersistence;
  events: EventIdentityStore;
}

/**
 * Derives a deterministic event position from a Soroban event.
 *
 * Soroban event IDs encode the ledger sequence and the event's position within
 * that ledger, separated by a dash (e.g. `0000000523986165760-0000000001`). We
 * use the trailing segment as the event index; if the ID is not in that form we
 * fall back to `0`, which is still deterministic for a single event per tx.
 */
export function deriveEventIndex(event: SorobanEventInput): number {
  const segments = event.id.split("-");
  const last = segments[segments.length - 1];
  const parsed = Number.parseInt(last ?? "", 10);
  return Number.isFinite(parsed) ? parsed : 0;
}
