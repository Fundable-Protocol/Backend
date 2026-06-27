import type { FundedRecord, StreamEvent } from "./types.js";
import {
  getEventIdentity,
  parseEventData,
  requireStringField,
  requireTopic,
} from "./utils.js";

export const STREAM_FUNDED_TOPIC = "StreamFunded";

export interface StreamFundedPayload {
  streamId: string;
  amount: string;
}

export function parseStreamFundedPayload(event: StreamEvent): StreamFundedPayload {
  requireTopic(event, STREAM_FUNDED_TOPIC);
  const parsed = parseEventData(event);

  return {
    streamId: requireStringField(parsed, "streamId"),
    amount: requireStringField(parsed, "amount"),
  };
}

export function mapStreamFundedToRecord(
  payload: StreamFundedPayload,
  event: StreamEvent,
): FundedRecord {
  return {
    streamId: payload.streamId,
    amount: payload.amount,
    contractId: event.contractId,
    ledger: event.ledger,
    txHash: event.txHash,
    eventIndex: event.eventIndex,
  };
}

export function handleStreamFunded(event: StreamEvent): {
  funded: FundedRecord;
  identity: string;
} {
  const payload = parseStreamFundedPayload(event);
  const funded = mapStreamFundedToRecord(payload, event);
  const identity = getEventIdentity(event);
  return { funded, identity };
}
