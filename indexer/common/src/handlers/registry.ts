import { type EventRepository, getSorobanEventIdentity } from "../db/repository.js";
import type { EventHandler, HandlerFilter, HandlerResult, SorobanEventInput } from "./types.js";

interface RegisteredHandler {
  filter: HandlerFilter;
  handler: EventHandler;
}

export class HandlerRegistry {
  private readonly entries: RegisteredHandler[] = [];

  register(filter: HandlerFilter, handler: EventHandler): this {
    this.entries.push({ filter, handler });
    return this;
  }

  matches(event: SorobanEventInput): EventHandler[] {
    return this.entries
      .filter(({ filter }) => {
        if (filter.contractId && filter.contractId !== event.contractId) {
          return false;
        }
        if (filter.topic && !event.topic.includes(filter.topic)) {
          return false;
        }
        if (filter.eventName && !event.topic.includes(filter.eventName)) {
          return false;
        }
        return true;
      })
      .map(({ handler }) => handler);
  }

  async dispatch(event: SorobanEventInput, eventRepo?: EventRepository): Promise<HandlerResult[]> {
    let identity:
      | {
          contractId: string;
          ledgerNumber: number;
          txHash: string;
          eventIndex: number;
        }
      | undefined;

    if (eventRepo) {
      identity = getSorobanEventIdentity(event);
      const isProcessed = await eventRepo.isEventProcessed(
        identity.contractId,
        identity.ledgerNumber,
        identity.txHash,
        identity.eventIndex,
      );
      if (isProcessed) {
        return [];
      }
    }

    const handlers = this.matches(event);

    if (handlers.length === 0) {
      if (eventRepo && identity) {
        await eventRepo.recordEventProcessed(
          identity.contractId,
          identity.ledgerNumber,
          identity.txHash,
          identity.eventIndex,
        );
      }
      return [];
    }

    const results = await Promise.all(
      handlers.map((h) =>
        h(event).catch((err) => ({
          ok: false as const,
          error: err instanceof Error ? err.message : String(err),
          retriable: true,
        })),
      ),
    );

    const allSucceeded = results.every((r) => r.ok);
    if (allSucceeded && eventRepo && identity) {
      await eventRepo.recordEventProcessed(
        identity.contractId,
        identity.ledgerNumber,
        identity.txHash,
        identity.eventIndex,
      );
    }

    return results;
  }
}
