import type {
  EventHandler,
  HandlerResult,
  SorobanEventInput,
} from "@fundable-indexer/common";
import { parseStreamCancel } from "./types.js";

export const streamCancelHandler: EventHandler = async (
  event: SorobanEventInput,
): Promise<HandlerResult> => {
  try {
    const payload = parseStreamCancel(event.data);

    if (!payload.streamId) {
      return { ok: false, error: "Missing streamId in cancel event", retriable: false };
    }

    // TODO(#32): update stream status to CANCELLED via repository once DB schema is merged
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
