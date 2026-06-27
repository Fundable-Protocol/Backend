import type { CancelRecord, StreamEvent } from "./types.js";
import {
  getEventIdentity,
  parseEventData,
  requireStringField,
  requireTopic,
} from "./utils.js";

export const STREAM_CANCEL_TOPIC = "StreamCancelled";

export interface StreamCancelPayload {
  streamId: string;
  cancelledBy: string;
  refundedAmount: string;
}

export function parseStreamCancelPayload(event: StreamEvent): StreamCancelPayload {
  requireTopic(event, STREAM_CANCEL_TOPIC);
  const parsed = parseEventData(event);

  return {
    streamId: requireStringField(parsed, "streamId"),
    cancelledBy: requireStringField(parsed, "cancelledBy"),
    refundedAmount: requireStringField(parsed, "refundedAmount"),
  };
}

export function mapStreamCancelToRecord(
  payload: StreamCancelPayload,
  event: StreamEvent,
): CancelRecord {
  return {
    streamId: payload.streamId,
    cancelledBy: payload.cancelledBy,
    refundedAmount: payload.refundedAmount,
    contractId: event.contractId,
    ledger: event.ledger,
    txHash: event.txHash,
    eventIndex: event.eventIndex,
  };
}

export function handleStreamCancel(event: StreamEvent): {
  cancel: CancelRecord;
  identity: string;
} {
  const payload = parseStreamCancelPayload(event);
  const cancel = mapStreamCancelToRecord(payload, event);
  const identity = getEventIdentity(event);
  return { cancel, identity };
}
