import type { EventHandler, HandlerResult, SorobanEventInput } from "@fundable-indexer/common";
import { type StreamHandlerDeps, deriveEventIndex } from "./persistence.js";
import { parseStreamCancel } from "./types.js";

export const createStreamCancelHandler = (deps: StreamHandlerDeps): EventHandler => {
  return async (event: SorobanEventInput): Promise<HandlerResult> => {
    try {
      const payload = parseStreamCancel(event.data);

      if (!payload.streamId) return { ok: false, error: "Missing streamId in cancel event", retriable: false };
      if (!payload.cancelledBy) return { ok: false, error: "Missing cancelledBy in cancel event", retriable: false };
      if (!payload.transactionHash) return { ok: false, error: "Missing transactionHash in cancel event", retriable: false };

      const eventIndex = deriveEventIndex(event);
      const alreadyProcessed = await deps.events.isEventProcessed(
        event.contractId,
        event.ledger,
        payload.transactionHash,
        eventIndex,
      );
      if (alreadyProcessed) return { ok: true };

      // Convert ISO string to unix timestamp in seconds for the bigint column
      const timestamp = String(Math.floor(Date.parse(event.ledgerClosedAt) / 1000) || 0);

      await deps.streams.recordCancel({
        streamId: payload.streamId,
        canceler: payload.cancelledBy,
        txHash: payload.transactionHash,
        timestamp,
      });

      await deps.events.recordEventProcessed(
        event.contractId,
        event.ledger,
        payload.transactionHash,
        eventIndex,
      );

      console.info(
        `[stream-cancel] streamId=${payload.streamId} cancelledBy=${payload.cancelledBy} ledger=${event.ledger}`,
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
