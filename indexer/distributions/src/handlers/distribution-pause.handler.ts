import type {
  EventHandler,
  HandlerResult,
  SorobanEventInput,
} from "@fundable-indexer/common";
import { parseDistributionPaused, parseDistributionResumed } from "./types.js";

export const distributionPausedHandler: EventHandler = async (
  event: SorobanEventInput,
): Promise<HandlerResult> => {
  try {
    const payload = parseDistributionPaused(event.data);

    if (!payload.distributionId) {
      return {
        ok: false,
        error: "Missing distributionId in distribution_paused event",
        retriable: false,
      };
    }

    // TODO(#36): update distribution status to PAUSED via repository
    console.info(
      `[distribution-paused] id=${payload.distributionId} by=${payload.pausedBy} ledger=${event.ledger}`,
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

export const distributionResumedHandler: EventHandler = async (
  event: SorobanEventInput,
): Promise<HandlerResult> => {
  try {
    const payload = parseDistributionResumed(event.data);

    if (!payload.distributionId) {
      return {
        ok: false,
        error: "Missing distributionId in distribution_resumed event",
        retriable: false,
      };
    }

    // TODO(#36): update distribution status to ACTIVE via repository
    console.info(
      `[distribution-resumed] id=${payload.distributionId} by=${payload.resumedBy} ledger=${event.ledger}`,
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
