import type {
  EventHandler,
  HandlerResult,
  SorobanEventInput,
} from "@fundable-indexer/common";
import { parseStreamFunded } from "./types.js";

export const streamFundedHandler: EventHandler = async (
  event: SorobanEventInput,
): Promise<HandlerResult> => {
  try {
    const payload = parseStreamFunded(event.data);

    if (!payload.streamId) {
      return { ok: false, error: "Missing streamId in funded event", retriable: false };
    }

    // TODO(#32): persist deposit via stream repository once DB schema is merged
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
