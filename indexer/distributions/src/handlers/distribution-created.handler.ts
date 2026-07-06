import type { EventHandler, HandlerResult, SorobanEventInput } from "@fundable-indexer/common";
import { type DistributionHandlerDeps, deriveEventIndex } from "./persistence.js";
import { parseDistributionCreated } from "./types.js";

/**
 * Builds a `distribution_created` handler that persists a distribution batch.
 *
 * Required payload fields are validated before any write. The event identity is
 * checked against the shared event store so a replayed event is a no-op.
 */
export const createDistributionCreatedHandler = (deps: DistributionHandlerDeps): EventHandler => {
  return async (event: SorobanEventInput): Promise<HandlerResult> => {
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

      await deps.distributions.createBatch({
        distributionId: payload.distributionId,
        contractId: event.contractId,
        distributor: payload.creator,
        token: payload.token,
        totalAmount: payload.totalAmount,
        recipientCount: payload.recipientCount,
        ledgerNumber: event.ledger,
        txHash: payload.transactionHash,
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
