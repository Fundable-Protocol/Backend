import type { StreamCreatedEvent, StreamRecord } from "./types.js";

export const STREAM_CREATED_TOPIC = "StreamCreated";

export interface StreamCreatedPayload {
  streamId: string;
  sender: string;
  recipient: string;
  amount: string;
  startTime: string;
  endTime: string;
}

export function parseStreamCreatedPayload(event: StreamCreatedEvent): StreamCreatedPayload {
  const eventName = event.topics[0];
  if (!eventName || eventName !== STREAM_CREATED_TOPIC) {
    throw new Error(
      `Expected ${STREAM_CREATED_TOPIC} event topic, got ${eventName ?? "undefined"}`,
    );
  }

  const parsed = JSON.parse(event.data) as StreamCreatedPayload;

  return {
    streamId: parsed.streamId,
    sender: parsed.sender,
    recipient: parsed.recipient,
    amount: parsed.amount,
    startTime: parsed.startTime,
    endTime: parsed.endTime,
  };
}

export function getEventIdentity(event: StreamCreatedEvent): string {
  return `${event.contractId}:${event.ledger}:${event.txHash}:${event.eventIndex}`;
}

export function mapStreamCreatedToRecord(
  payload: StreamCreatedPayload,
  event: StreamCreatedEvent,
): StreamRecord {
  return {
    id: payload.streamId,
    sender: payload.sender,
    recipient: payload.recipient,
    amount: payload.amount,
    startTime: payload.startTime,
    endTime: payload.endTime,
    contractId: event.contractId,
    ledger: event.ledger,
    txHash: event.txHash,
    eventIndex: event.eventIndex,
  };
}

export function handleStreamCreated(event: StreamCreatedEvent): {
  stream: StreamRecord;
  identity: string;
} {
  const payload = parseStreamCreatedPayload(event);
  const stream = mapStreamCreatedToRecord(payload, event);
  const identity = getEventIdentity(event);

  return { stream, identity };
}
