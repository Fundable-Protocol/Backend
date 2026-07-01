import type { EventHandler, HandlerResult, SorobanEventInput } from "@fundable-indexer/common";
import { type DistributionHandlerDeps, deriveEventIndex } from "./persistence.js";
import { parseTokensClaimed } from "./types.js";

/**
 * Builds a `tokens_claimed` handler that records a claim against a batch.
 *
 * The event identity gate plus the unique claim identity in the repository keep
 * repeated events from creating duplicate claim rows or double-counting the
 * batch's claimed total.
 */
export const createTokensClaimedHandler = (deps: DistributionHandlerDeps): EventHandler => {
  return async (event: SorobanEventInput): Promise<HandlerResult> => {
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

      const eventIndex = deriveEventIndex(event);
      const alreadyProcessed = await deps.events.isEventProcessed(
        event.contractId,
        event.ledger,
        payload.transactionHash,
        eventIndex,
      );
      if (alreadyProcessed) {
        return { ok: true };
      }

      await deps.distributions.recordClaim({
        distributionId: payload.distributionId,
        claimant: payload.claimant,
        amount: payload.amount,
        txHash: payload.transactionHash,
        ledgerNumber: event.ledger,
        eventIndex,
        eventTimestamp: event.ledgerClosedAt,
      });

      await deps.events.recordEventProcessed(
        event.contractId,
        event.ledger,
        payload.transactionHash,
        eventIndex,
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
