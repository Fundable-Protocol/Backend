import type {
  EventHandler,
  HandlerFilter,
  HandlerResult,
  SorobanEventInput,
} from "./types.js";

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

  async dispatch(event: SorobanEventInput): Promise<HandlerResult[]> {
    const handlers = this.matches(event);
    return Promise.all(handlers.map((h) => h(event)));
  }
}
