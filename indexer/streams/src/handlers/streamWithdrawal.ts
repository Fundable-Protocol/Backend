import type { StreamEvent, WithdrawalRecord } from "./types.js";
import {
  getEventIdentity,
  parseEventData,
  requireStringField,
  requireTopic,
} from "./utils.js";

export const STREAM_WITHDRAWAL_TOPIC = "StreamWithdrawal";

export interface StreamWithdrawalPayload {
  streamId: string;
  recipient: string;
  amount: string;
}

export function parseStreamWithdrawalPayload(event: StreamEvent): StreamWithdrawalPayload {
  requireTopic(event, STREAM_WITHDRAWAL_TOPIC);
  const parsed = parseEventData(event);

  return {
    streamId: requireStringField(parsed, "streamId"),
    recipient: requireStringField(parsed, "recipient"),
    amount: requireStringField(parsed, "amount"),
  };
}

export function mapStreamWithdrawalToRecord(
  payload: StreamWithdrawalPayload,
  event: StreamEvent,
): WithdrawalRecord {
  return {
    streamId: payload.streamId,
    recipient: payload.recipient,
    amount: payload.amount,
    contractId: event.contractId,
    ledger: event.ledger,
    txHash: event.txHash,
    eventIndex: event.eventIndex,
  };
}

export function handleStreamWithdrawal(event: StreamEvent): {
  withdrawal: WithdrawalRecord;
  identity: string;
} {
  const payload = parseStreamWithdrawalPayload(event);
  const withdrawal = mapStreamWithdrawalToRecord(payload, event);
  const identity = getEventIdentity(event);
  return { withdrawal, identity };
}
