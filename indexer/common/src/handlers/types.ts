/**
 * Core handler input/result types and registry interface for the Fundable
 * Soroban event indexer (issue #30).
 *
 * Domain packages import these shared types so they can register event handlers
 * without coupling to the poller internals.
 */

/** Identity fields that uniquely identify any Soroban event. */
export interface SorobanEventIdentity {
  contractId: string;
  ledger: number;
  txHash: string;
  eventIndex: number;
}

/** Minimal shape of a Soroban event delivered to handlers. */
export interface SorobanEvent extends SorobanEventIdentity {
  /** Array of XDR-encoded topics. The first element is conventionally the event name. */
  topics: string[];
  /** JSON-encoded event data. */
  data: string;
}

/** What every handler must return. */
export interface HandlerResult {
  /** Whether the handler processed the event without error. */
  success: boolean;
  /** Human-readable summary (logged at debug level). */
  summary?: string;
}

/** The function signature every event handler must conform to. */
export type EventHandler<TEvent extends SorobanEvent = SorobanEvent> = (
  event: TEvent,
) => Promise<HandlerResult>;

/** Criteria used to match events to registered handlers. */
export interface HandlerFilter {
  /** Match only events emitted by this contract address. Omit to match all. */
  contractId?: string;
  /** Match only events whose first topic equals this value (the event name). */
  eventName?: string;
}

/** A handler entry stored in the registry. */
export interface HandlerEntry<TEvent extends SorobanEvent = SorobanEvent> {
  filter: HandlerFilter;
  handler: EventHandler<TEvent>;
}

/** Public API of the handler registry. */
export interface HandlerRegistry {
  /**
   * Register a handler that will be called for events matching `filter`.
   * Multiple handlers may match the same event; all are called in
   * registration order.
   */
  register<TEvent extends SorobanEvent>(
    filter: HandlerFilter,
    handler: EventHandler<TEvent>,
  ): void;

  /**
   * Return all handlers whose filter matches the given event.
   * Matching rules:
   * - If `filter.contractId` is set, the event's `contractId` must equal it.
   * - If `filter.eventName` is set, the event's first topic must equal it.
   * - A filter with no fields matches every event.
   */
  match(event: SorobanEvent): ReadonlyArray<EventHandler>;

  /**
   * Dispatch an event to every matching handler sequentially.
   * Returns the array of results in the order handlers were called.
   * A handler that throws is caught; `success: false` is recorded for it.
   */
  dispatch(event: SorobanEvent): Promise<HandlerResult[]>;
}
