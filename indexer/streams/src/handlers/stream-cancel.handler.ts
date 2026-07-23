import type {
  EventHandler,
  HandlerResult,
  SorobanEventInput,
} from "@fundable-indexer/common";
import type { StreamWriteService } from "../db/repository.js";
import { parseStreamCancel } from "./types.js";

export function createStreamCancelHandler(persistence?: StreamWriteService): EventHandler {
  return async (event: SorobanEventInput): Promise<HandlerResult> => {
    try {
      const payload = parseStreamCancel(event.data);

      if (!payload.streamId) {
        return { ok: false, error: "Missing streamId in cancel event", retriable: false };
      }

      if (!payload.cancelledBy) {
        return { ok: false, error: "Missing cancelledBy in cancel event", retriable: false };
      }

      if (!payload.transactionHash) {
        return { ok: false, error: "Missing transactionHash in cancel event", retriable: false };
      }

      const eventKey = `${event.contractId}:${event.ledger}:${payload.transactionHash}`;
      await persistence?.recordCancel(
        payload.streamId,
        payload.cancelledBy,
        payload.transactionHash,
        new Date(event.ledger * 1000).toISOString(),
        eventKey,
      );

      console.info(
        `[stream-cancel] streamId=${payload.streamId} cancelledBy=${payload.cancelledBy} senderBalance=${payload.senderBalance} ledger=${event.ledger}`,
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

export const streamCancelHandler = createStreamCancelHandler();
