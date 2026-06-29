import type { EventHandler, HandlerResult, SorobanEventInput } from "@fundable-indexer/common";
import { parseTokensClaimed } from "./types.js";

export const tokensClaimedHandler: EventHandler = async (
  event: SorobanEventInput,
): Promise<HandlerResult> => {
  try {
    const payload = parseTokensClaimed(event.data);

    if (!payload.distributionId) {
      return {
        ok: false,
        error: "Missing distributionId in tokens_claimed event",
        retriable: false,
      };
    }

    if (!payload.claimant) {
      return {
        ok: false,
        error: "Missing claimant in tokens_claimed event",
        retriable: false,
      };
    }

    if (!payload.transactionHash) {
      return {
        ok: false,
        error: "Missing transactionHash in tokens_claimed event",
        retriable: false,
      };
    }

    if (!payload.amount || payload.amount === "0") {
      return {
        ok: false,
        error: "Missing or zero amount in tokens_claimed event",
        retriable: false,
      };
    }

    // TODO(#36): record claim action via repository once DB schema is merged
    // TODO(#27): record indexed event identity via event repository
    console.info(
      `[tokens-claimed] distributionId=${payload.distributionId} claimant=${payload.claimant} amount=${payload.amount} ledger=${event.ledger}`,
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
