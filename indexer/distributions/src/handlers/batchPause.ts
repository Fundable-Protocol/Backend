import type { BatchPauseRecord, BatchResumeRecord, DistributionEvent } from "./types.js";
import {
  getEventIdentity,
  parseEventData,
  requireStringField,
  requireTopic,
} from "./utils.js";

export const BATCH_PAUSED_TOPIC = "BatchPaused";
export const BATCH_RESUMED_TOPIC = "BatchResumed";

export interface BatchPausedPayload {
  batchId: string;
  pausedAt: string;
}

export interface BatchResumedPayload {
  batchId: string;
  resumedAt: string;
}

export function parseBatchPausedPayload(event: DistributionEvent): BatchPausedPayload {
  requireTopic(event, BATCH_PAUSED_TOPIC);
  const parsed = parseEventData(event);

  return {
    batchId: requireStringField(parsed, "batchId"),
    pausedAt: requireStringField(parsed, "pausedAt"),
  };
}

export function parseBatchResumedPayload(event: DistributionEvent): BatchResumedPayload {
  requireTopic(event, BATCH_RESUMED_TOPIC);
  const parsed = parseEventData(event);

  return {
    batchId: requireStringField(parsed, "batchId"),
    resumedAt: requireStringField(parsed, "resumedAt"),
  };
}

export function mapBatchPausedToRecord(
  payload: BatchPausedPayload,
  event: DistributionEvent,
): BatchPauseRecord {
  return {
    batchId: payload.batchId,
    pausedAt: payload.pausedAt,
    contractId: event.contractId,
    ledger: event.ledger,
    txHash: event.txHash,
    eventIndex: event.eventIndex,
  };
}

export function mapBatchResumedToRecord(
  payload: BatchResumedPayload,
  event: DistributionEvent,
): BatchResumeRecord {
  return {
    batchId: payload.batchId,
    resumedAt: payload.resumedAt,
    contractId: event.contractId,
    ledger: event.ledger,
    txHash: event.txHash,
    eventIndex: event.eventIndex,
  };
}

export function handleBatchPaused(event: DistributionEvent): {
  pause: BatchPauseRecord;
  identity: string;
} {
  const payload = parseBatchPausedPayload(event);
  const pause = mapBatchPausedToRecord(payload, event);
  const identity = getEventIdentity(event);
  return { pause, identity };
}

export function handleBatchResumed(event: DistributionEvent): {
  resume: BatchResumeRecord;
  identity: string;
} {
  const payload = parseBatchResumedPayload(event);
  const resume = mapBatchResumedToRecord(payload, event);
  const identity = getEventIdentity(event);
  return { resume, identity };
}
