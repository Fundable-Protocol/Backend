import type { EventHandler, HandlerResult, SorobanEventInput } from "@fundable-indexer/common";
import { type StreamHandlerDeps, deriveEventIndex } from "./persistence.js";
import { parseStreamWithdrawal } from "./types.js";

export const createStreamWithdrawalHandler = (deps: StreamHandlerDeps): EventHandler => {
  return async (event: SorobanEventInput): Promise<HandlerResult> => {
    try {
      const payload = parseStreamWithdrawal(event.data);

      if (!payload.streamId) return { ok: false, error: "Missing streamId in withdrawal event", retriable: false };
      if (!payload.recipient) return { ok: false, error: "Missing recipient in withdrawal event", retriable: false };
      if (!payload.amount) return { ok: false, error: "Missing amount in withdrawal event", retriable: false };
      if (!payload.transactionHash) return { ok: false, error: "Missing transactionHash in withdrawal event", retriable: false };

      const eventIndex = deriveEventIndex(event);
      const alreadyProcessed = await deps.events.isEventProcessed(
        event.contractId,
        event.ledger,
        payload.transactionHash,
        eventIndex,
      );
      if (alreadyProcessed) return { ok: true };

      await deps.streams.recordWithdrawal({
        streamId: payload.streamId,
        recipient: payload.recipient,
        amount: payload.amount,
        txHash: payload.transactionHash,
        timestamp: String(Math.floor(Date.parse(event.ledgerClosedAt) / 1000) || 0),
      });

      await deps.events.recordEventProcessed(
        event.contractId,
        event.ledger,
        payload.transactionHash,
        eventIndex,
      );

      console.info(
        `[stream-withdrawal] streamId=${payload.streamId} recipient=${payload.recipient} amount=${payload.amount} ledger=${event.ledger}`,
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
