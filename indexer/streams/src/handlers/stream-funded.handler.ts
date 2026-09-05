import type { EventHandler, HandlerResult, SorobanEventInput } from "@fundable-indexer/common";
import { type StreamHandlerDeps, deriveEventIndex } from "./persistence.js";
import { parseStreamFunded } from "./types.js";

export const createStreamFundedHandler = (deps: StreamHandlerDeps): EventHandler => {
  return async (event: SorobanEventInput): Promise<HandlerResult> => {
    try {
      const payload = parseStreamFunded(event.data);

      if (!payload.streamId) return { ok: false, error: "Missing streamId in funded event", retriable: false };
      if (!payload.sender) return { ok: false, error: "Missing sender in funded event", retriable: false };
      if (!payload.token) return { ok: false, error: "Missing token in funded event", retriable: false };
      if (!payload.amount) return { ok: false, error: "Missing amount in funded event", retriable: false };
      if (!payload.transactionHash) return { ok: false, error: "Missing transactionHash in funded event", retriable: false };

      const eventIndex = deriveEventIndex(event);
      const alreadyProcessed = await deps.events.isEventProcessed(
        event.contractId,
        event.ledger,
        payload.transactionHash,
        eventIndex,
      );
      if (alreadyProcessed) return { ok: true };

      await deps.streams.fundStream({
        streamId: payload.streamId,
        amount: payload.amount,
      });

      await deps.events.recordEventProcessed(
        event.contractId,
        event.ledger,
        payload.transactionHash,
        eventIndex,
      );

      console.info(
        `[stream-funded] streamId=${payload.streamId} amount=${payload.amount} token=${payload.token} ledger=${event.ledger}`,
      );

      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        retriable: true,
      };
    }
  };
};
