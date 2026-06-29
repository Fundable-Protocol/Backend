import type { EventHandler, HandlerResult, SorobanEventInput } from "@fundable-indexer/common";
import { parseDistributionCreated } from "./types.js";

export const distributionCreatedHandler: EventHandler = async (
  event: SorobanEventInput,
): Promise<HandlerResult> => {
  try {
    const payload = parseDistributionCreated(event.data);

    if (!payload.distributionId) {
      return {
        ok: false,
        error: "Missing distributionId in distribution_created event",
        retriable: false,
      };
    }

    if (!payload.creator) {
      return {
        ok: false,
        error: "Missing creator in distribution_created event",
        retriable: false,
      };
    }

    if (!payload.token) {
      return {
        ok: false,
        error: "Missing token in distribution_created event",
        retriable: false,
      };
    }

    if (!payload.totalAmount) {
      return {
        ok: false,
        error: "Missing totalAmount in distribution_created event",
        retriable: false,
      };
    }

    if (!payload.transactionHash) {
      return {
        ok: false,
        error: "Missing transactionHash in distribution_created event",
        retriable: false,
      };
    }

    if (payload.recipientCount <= 0) {
      return {
        ok: false,
        error: "Invalid recipientCount in distribution_created event",
        retriable: false,
      };
    }

    // TODO(#36): persist distribution batch via repository once DB schema is merged
    // TODO(#27): record indexed event identity via event repository
    console.info(
      `[distribution-created] id=${payload.distributionId} creator=${payload.creator} token=${payload.token} total=${payload.totalAmount} ledger=${event.ledger}`,
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
