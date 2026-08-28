import type { EventHandler, HandlerResult, SorobanEventInput } from "@fundable-indexer/common";
import { type StreamHandlerDeps, deriveEventIndex } from "./persistence.js";
import { parseStreamCreated } from "./types.js";

export const createStreamCreatedHandler = (deps: StreamHandlerDeps): EventHandler => {
  return async (event: SorobanEventInput): Promise<HandlerResult> => {
    try {
      const payload = parseStreamCreated(event.data);

      if (!payload.streamId) return { ok: false, error: "Missing streamId in created event", retriable: false };
      if (!payload.sender) return { ok: false, error: "Missing sender in created event", retriable: false };
      if (!payload.recipient) return { ok: false, error: "Missing recipient in created event", retriable: false };
      if (!payload.amount) return { ok: false, error: "Missing amount in created event", retriable: false };
      if (!payload.startTime) return { ok: false, error: "Missing startTime in created event", retriable: false };
      if (!payload.endTime) return { ok: false, error: "Missing endTime in created event", retriable: false };
      if (!payload.transactionHash) return { ok: false, error: "Missing transactionHash in created event", retriable: false };

      const eventIndex = deriveEventIndex(event);
      
      const alreadyProcessed = await deps.events.isEventProcessed(
        event.contractId,
        event.ledger,
        payload.transactionHash,
        eventIndex,
      );
      if (alreadyProcessed) return { ok: true };

      await deps.streams.createStream({
        id: payload.streamId,
        sender: payload.sender,
        recipient: payload.recipient,
        token: payload.token || "", // Provide empty string if missing, though it's likely present
        totalAmount: payload.amount,
        startTime: payload.startTime,
        endTime: payload.endTime,
      });

      await deps.events.recordEventProcessed(
        event.contractId,
        event.ledger,
        payload.transactionHash,
        eventIndex,
      );

      console.info(
        `[stream-created] streamId=${payload.streamId} amount=${payload.amount} ledger=${event.ledger}`,
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
