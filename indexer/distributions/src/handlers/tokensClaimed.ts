import type { DistributionEvent, TokensClaimedRecord } from "./types.js";
import {
  getEventIdentity,
  parseEventData,
  requireStringField,
  requireTopic,
} from "./utils.js";

export const TOKENS_CLAIMED_TOPIC = "TokensClaimed";

export interface TokensClaimedPayload {
  batchId: string;
  claimant: string;
  amount: string;
  eventTimestamp: string;
}

export function parseTokensClaimedPayload(event: DistributionEvent): TokensClaimedPayload {
  requireTopic(event, TOKENS_CLAIMED_TOPIC);
  const parsed = parseEventData(event);

  return {
    batchId: requireStringField(parsed, "batchId"),
    claimant: requireStringField(parsed, "claimant"),
    amount: requireStringField(parsed, "amount"),
    eventTimestamp: requireStringField(parsed, "eventTimestamp"),
  };
}

export function mapTokensClaimedToRecord(
  payload: TokensClaimedPayload,
  event: DistributionEvent,
): TokensClaimedRecord {
  return {
    batchId: payload.batchId,
    claimant: payload.claimant,
    amount: payload.amount,
    eventTimestamp: payload.eventTimestamp,
    contractId: event.contractId,
    ledger: event.ledger,
    txHash: event.txHash,
    eventIndex: event.eventIndex,
  };
}

export function handleTokensClaimed(event: DistributionEvent): {
  claim: TokensClaimedRecord;
  identity: string;
} {
  const payload = parseTokensClaimedPayload(event);
  const claim = mapTokensClaimedToRecord(payload, event);
  const identity = getEventIdentity(event);
  return { claim, identity };
}
