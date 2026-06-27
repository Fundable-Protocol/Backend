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

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(event.data) as Record<string, unknown>;
  } catch {
    throw new Error("Failed to parse event data: invalid JSON");
  }

  const requiredFields = [
    "streamId",
    "sender",
    "recipient",
    "amount",
    "startTime",
    "endTime",
  ] as const;

  for (const field of requiredFields) {
    const value = parsed[field];
    if (typeof value !== "string" || value.length === 0) {
      throw new Error(
        `Invalid payload: "${field}" must be a non-empty string, got ${typeof value === "string" ? "empty string" : typeof value}`,
      );
    }
  }

  return {
    streamId: parsed.streamId as string,
    sender: parsed.sender as string,
    recipient: parsed.recipient as string,
    amount: parsed.amount as string,
    startTime: parsed.startTime as string,
    endTime: parsed.endTime as string,
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
