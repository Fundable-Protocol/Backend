import type {
  EventHandler,
  HandlerEntry,
  HandlerFilter,
  HandlerRegistry,
  HandlerResult,
  SorobanEvent,
} from "./types.js";

function matchesFilter(filter: HandlerFilter, event: SorobanEvent): boolean {
  if (filter.contractId !== undefined && filter.contractId !== event.contractId) {
    return false;
  }
  if (filter.eventName !== undefined && filter.eventName !== event.topics[0]) {
    return false;
  }
  return true;
}

export class EventHandlerRegistry implements HandlerRegistry {
  private readonly entries: HandlerEntry[] = [];

  register<TEvent extends SorobanEvent>(
    filter: HandlerFilter,
    handler: EventHandler<TEvent>,
  ): void {
    this.entries.push({ filter, handler: handler as EventHandler });
  }

  match(event: SorobanEvent): ReadonlyArray<EventHandler> {
    return this.entries
      .filter((e) => matchesFilter(e.filter, event))
      .map((e) => e.handler);
  }

  async dispatch(event: SorobanEvent): Promise<HandlerResult[]> {
    const handlers = this.match(event);
    const results: HandlerResult[] = [];

    for (const handler of handlers) {
      try {
        const result = await handler(event);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          summary: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }
}

export function createHandlerRegistry(): HandlerRegistry {
  return new EventHandlerRegistry();
}
