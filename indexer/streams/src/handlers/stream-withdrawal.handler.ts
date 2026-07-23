import type {
  EventHandler,
  HandlerResult,
  SorobanEventInput,
} from "@fundable-indexer/common";
import type { StreamWriteService } from "../db/repository.js";
import type { EventHandler, HandlerResult, SorobanEventInput } from "@fundable-indexer/common";
import { parseStreamWithdrawal } from "./types.js";

export function createStreamWithdrawalHandler(persistence?: StreamWriteService): EventHandler {
  return async (event: SorobanEventInput): Promise<HandlerResult> => {
    try {
      const payload = parseStreamWithdrawal(event.data);

      if (!payload.streamId) {
        return { ok: false, error: "Missing streamId in withdrawal event", retriable: false };
      }

      if (!payload.recipient) {
        return { ok: false, error: "Missing recipient in withdrawal event", retriable: false };
      }

      if (!payload.amount) {
        return { ok: false, error: "Missing amount in withdrawal event", retriable: false };
      }

      if (!payload.transactionHash) {
        return { ok: false, error: "Missing transactionHash in withdrawal event", retriable: false };
      }

      const eventKey = `${event.contractId}:${event.ledger}:${payload.transactionHash}`;
      await persistence?.recordWithdrawal(
        payload.streamId,
        payload.recipient,
        payload.amount,
        payload.transactionHash,
        new Date(event.ledger * 1000).toISOString(),
        eventKey,
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
}

export const streamWithdrawalHandler = createStreamWithdrawalHandler();
