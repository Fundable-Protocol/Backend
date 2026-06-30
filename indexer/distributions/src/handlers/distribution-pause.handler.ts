import type { EventHandler, HandlerResult, SorobanEventInput } from "@fundable-indexer/common";
import { DistributionStatus } from "../db/entity/DistributionBatch.js";
import { type DistributionHandlerDeps, deriveEventIndex } from "./persistence.js";
import { parseDistributionPaused, parseDistributionResumed } from "./types.js";

/**
 * Builds a `distribution_paused` handler that flips a batch to PAUSED and
 * records when it happened. Replayed events are ignored via the event store.
 */
export const createDistributionPausedHandler = (deps: DistributionHandlerDeps): EventHandler => {
  return async (event: SorobanEventInput): Promise<HandlerResult> => {
    try {
      const payload = parseDistributionPaused(event.data);

      if (!payload.distributionId) {
        return {
          ok: false,
          error: "Missing distributionId in distribution_paused event",
          retriable: false,
        };
      }

      if (!payload.pausedBy) {
        return {
          ok: false,
          error: "Missing pausedBy in distribution_paused event",
          retriable: false,
        };
      }

      if (!payload.transactionHash) {
        return {
          ok: false,
          error: "Missing transactionHash in distribution_paused event",
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

      await deps.distributions.setStatus({
        distributionId: payload.distributionId,
        status: DistributionStatus.PAUSED,
        ledgerNumber: event.ledger,
        changedAt: event.ledgerClosedAt,
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

/**
 * Builds a `distribution_resumed` handler that flips a batch back to ACTIVE and
 * records when it happened. Replayed events are ignored via the event store.
 */
export const createDistributionResumedHandler = (deps: DistributionHandlerDeps): EventHandler => {
  return async (event: SorobanEventInput): Promise<HandlerResult> => {
    try {
      const payload = parseDistributionResumed(event.data);

      if (!payload.distributionId) {
        return {
          ok: false,
          error: "Missing distributionId in distribution_resumed event",
          retriable: false,
        };
      }

      if (!payload.resumedBy) {
        return {
          ok: false,
          error: "Missing resumedBy in distribution_resumed event",
          retriable: false,
        };
      }

      if (!payload.transactionHash) {
        return {
          ok: false,
          error: "Missing transactionHash in distribution_resumed event",
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

      await deps.distributions.setStatus({
        distributionId: payload.distributionId,
        status: DistributionStatus.ACTIVE,
        ledgerNumber: event.ledger,
        changedAt: event.ledgerClosedAt,
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
