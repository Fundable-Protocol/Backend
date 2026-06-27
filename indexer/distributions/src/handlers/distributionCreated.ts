import type { DistributionCreatedRecord, DistributionEvent } from "./types.js";
import {
  getEventIdentity,
  parseEventData,
  requireIntField,
  requireStringField,
  requireTopic,
} from "./utils.js";

export const DISTRIBUTION_CREATED_TOPIC = "DistributionCreated";

export interface DistributionCreatedPayload {
  batchId: string;
  distributor: string;
  token: string;
  totalAmount: string;
  recipientCount: number;
  uniqueRef: string;
}

export function parseDistributionCreatedPayload(
  event: DistributionEvent,
): DistributionCreatedPayload {
  requireTopic(event, DISTRIBUTION_CREATED_TOPIC);
  const parsed = parseEventData(event);

  return {
    batchId: requireStringField(parsed, "batchId"),
    distributor: requireStringField(parsed, "distributor"),
    token: requireStringField(parsed, "token"),
    totalAmount: requireStringField(parsed, "totalAmount"),
    recipientCount: requireIntField(parsed, "recipientCount"),
    uniqueRef: requireStringField(parsed, "uniqueRef"),
  };
}

export function mapDistributionCreatedToRecord(
  payload: DistributionCreatedPayload,
  event: DistributionEvent,
): DistributionCreatedRecord {
  return {
    batchId: payload.batchId,
    distributor: payload.distributor,
    token: payload.token,
    totalAmount: payload.totalAmount,
    recipientCount: payload.recipientCount,
    uniqueRef: payload.uniqueRef,
    contractId: event.contractId,
    ledger: event.ledger,
    txHash: event.txHash,
    eventIndex: event.eventIndex,
  };
}

export function handleDistributionCreated(event: DistributionEvent): {
  distribution: DistributionCreatedRecord;
  identity: string;
} {
  const payload = parseDistributionCreatedPayload(event);
  const distribution = mapDistributionCreatedToRecord(payload, event);
  const identity = getEventIdentity(event);
  return { distribution, identity };
}
