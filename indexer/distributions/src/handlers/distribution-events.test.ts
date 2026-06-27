import { describe, expect, test } from "vitest";

import {
  DISTRIBUTION_CREATED_TOPIC,
  handleDistributionCreated,
  mapDistributionCreatedToRecord,
  parseDistributionCreatedPayload,
} from "./distributionCreated.js";
import {
  TOKENS_CLAIMED_TOPIC,
  handleTokensClaimed,
  mapTokensClaimedToRecord,
  parseTokensClaimedPayload,
} from "./tokensClaimed.js";
import {
  BATCH_PAUSED_TOPIC,
  BATCH_RESUMED_TOPIC,
  handleBatchPaused,
  handleBatchResumed,
  mapBatchPausedToRecord,
  mapBatchResumedToRecord,
  parseBatchPausedPayload,
  parseBatchResumedPayload,
} from "./batchPause.js";
import type { DistributionEvent } from "./types.js";

function makeEvent(
  topic: string,
  data: Record<string, unknown>,
  overrides?: Partial<DistributionEvent>,
): DistributionEvent {
  return {
    contractId: "CONTRACT_DIST",
    ledger: 8000,
    txHash: "TX_DIST_HASH",
    eventIndex: 0,
    topics: [topic],
    data: JSON.stringify(data),
    ...overrides,
  };
}

// ── DistributionCreated ───────────────────────────────────────────────────────

const CREATED_DATA = {
  batchId: "batch-1",
  distributor: "GDIST0000000000000000000000000000000000000000000000000000",
  token: "GTOKEN000000000000000000000000000000000000000000000000000",
  totalAmount: "1000000000",
  recipientCount: 50,
  uniqueRef: "ref-q1-payroll",
};

describe("DistributionCreated handler (issue #38)", () => {
  test("parses a valid DistributionCreated event", () => {
    const event = makeEvent(DISTRIBUTION_CREATED_TOPIC, CREATED_DATA);
    expect(parseDistributionCreatedPayload(event)).toEqual(CREATED_DATA);
  });

  test("throws on wrong topic", () => {
    const event = makeEvent("WrongTopic", CREATED_DATA);
    expect(() => parseDistributionCreatedPayload(event)).toThrow(
      "Expected DistributionCreated event topic, got WrongTopic",
    );
  });

  test("throws when batchId is missing", () => {
    const { batchId: _, ...partial } = CREATED_DATA;
    expect(() =>
      parseDistributionCreatedPayload(makeEvent(DISTRIBUTION_CREATED_TOPIC, partial)),
    ).toThrow('"batchId" must be a non-empty string');
  });

  test("throws when recipientCount is not an integer", () => {
    const event = makeEvent(DISTRIBUTION_CREATED_TOPIC, {
      ...CREATED_DATA,
      recipientCount: "50",
    });
    expect(() => parseDistributionCreatedPayload(event)).toThrow(
      '"recipientCount" must be an integer',
    );
  });

  test("throws when totalAmount is empty string", () => {
    const event = makeEvent(DISTRIBUTION_CREATED_TOPIC, { ...CREATED_DATA, totalAmount: "" });
    expect(() => parseDistributionCreatedPayload(event)).toThrow(
      '"totalAmount" must be a non-empty string',
    );
  });

  test("maps payload to DistributionCreatedRecord", () => {
    const event = makeEvent(DISTRIBUTION_CREATED_TOPIC, CREATED_DATA);
    const payload = parseDistributionCreatedPayload(event);
    const record = mapDistributionCreatedToRecord(payload, event);

    expect(record).toEqual({
      ...CREATED_DATA,
      contractId: "CONTRACT_DIST",
      ledger: 8000,
      txHash: "TX_DIST_HASH",
      eventIndex: 0,
    });
  });

  test("handleDistributionCreated returns record and deterministic identity", () => {
    const event = makeEvent(DISTRIBUTION_CREATED_TOPIC, CREATED_DATA);
    const { distribution, identity } = handleDistributionCreated(event);

    expect(distribution.batchId).toBe("batch-1");
    expect(distribution.recipientCount).toBe(50);
    expect(identity).toBe("CONTRACT_DIST:8000:TX_DIST_HASH:0");
  });

  test("handleDistributionCreated is idempotent", () => {
    const event = makeEvent(DISTRIBUTION_CREATED_TOPIC, CREATED_DATA);
    expect(handleDistributionCreated(event)).toEqual(handleDistributionCreated(event));
  });
});

// ── TokensClaimed ─────────────────────────────────────────────────────────────

const CLAIMED_DATA = {
  batchId: "batch-1",
  claimant: "GCLAIMANT000000000000000000000000000000000000000000000000",
  amount: "20000000",
  eventTimestamp: "1700000000",
};

describe("TokensClaimed handler (issue #38)", () => {
  test("parses a valid TokensClaimed event", () => {
    const event = makeEvent(TOKENS_CLAIMED_TOPIC, CLAIMED_DATA);
    expect(parseTokensClaimedPayload(event)).toEqual(CLAIMED_DATA);
  });

  test("throws on wrong topic", () => {
    const event = makeEvent("DistributionCreated", CLAIMED_DATA);
    expect(() => parseTokensClaimedPayload(event)).toThrow(
      "Expected TokensClaimed event topic, got DistributionCreated",
    );
  });

  test("throws when claimant is missing", () => {
    const { claimant: _, ...partial } = CLAIMED_DATA;
    expect(() =>
      parseTokensClaimedPayload(makeEvent(TOKENS_CLAIMED_TOPIC, partial)),
    ).toThrow('"claimant" must be a non-empty string');
  });

  test("throws when eventTimestamp is missing", () => {
    const { eventTimestamp: _, ...partial } = CLAIMED_DATA;
    expect(() =>
      parseTokensClaimedPayload(makeEvent(TOKENS_CLAIMED_TOPIC, partial)),
    ).toThrow('"eventTimestamp" must be a non-empty string');
  });

  test("maps payload to TokensClaimedRecord", () => {
    const event = makeEvent(TOKENS_CLAIMED_TOPIC, CLAIMED_DATA);
    const payload = parseTokensClaimedPayload(event);
    const record = mapTokensClaimedToRecord(payload, event);

    expect(record).toEqual({
      ...CLAIMED_DATA,
      contractId: "CONTRACT_DIST",
      ledger: 8000,
      txHash: "TX_DIST_HASH",
      eventIndex: 0,
    });
  });

  test("handleTokensClaimed returns claim record and identity", () => {
    const event = makeEvent(TOKENS_CLAIMED_TOPIC, CLAIMED_DATA);
    const { claim, identity } = handleTokensClaimed(event);

    expect(claim.batchId).toBe("batch-1");
    expect(claim.amount).toBe("20000000");
    expect(identity).toBe("CONTRACT_DIST:8000:TX_DIST_HASH:0");
  });

  test("two claims with different txHash have different identities", () => {
    const e1 = makeEvent(TOKENS_CLAIMED_TOPIC, CLAIMED_DATA, { txHash: "TX_A" });
    const e2 = makeEvent(TOKENS_CLAIMED_TOPIC, CLAIMED_DATA, { txHash: "TX_B" });

    expect(handleTokensClaimed(e1).identity).not.toBe(handleTokensClaimed(e2).identity);
  });
});

// ── BatchPaused ───────────────────────────────────────────────────────────────

const PAUSED_DATA = { batchId: "batch-2", pausedAt: "1700001000" };

describe("BatchPaused handler (issue #38)", () => {
  test("parses a valid BatchPaused event", () => {
    const event = makeEvent(BATCH_PAUSED_TOPIC, PAUSED_DATA);
    expect(parseBatchPausedPayload(event)).toEqual(PAUSED_DATA);
  });

  test("throws on wrong topic", () => {
    const event = makeEvent("BatchResumed", PAUSED_DATA);
    expect(() => parseBatchPausedPayload(event)).toThrow(
      "Expected BatchPaused event topic, got BatchResumed",
    );
  });

  test("throws when pausedAt is missing", () => {
    const event = makeEvent(BATCH_PAUSED_TOPIC, { batchId: "b-1" });
    expect(() => parseBatchPausedPayload(event)).toThrow('"pausedAt" must be a non-empty string');
  });

  test("maps payload to BatchPauseRecord", () => {
    const event = makeEvent(BATCH_PAUSED_TOPIC, PAUSED_DATA);
    const payload = parseBatchPausedPayload(event);
    const record = mapBatchPausedToRecord(payload, event);

    expect(record).toEqual({
      batchId: "batch-2",
      pausedAt: "1700001000",
      contractId: "CONTRACT_DIST",
      ledger: 8000,
      txHash: "TX_DIST_HASH",
      eventIndex: 0,
    });
  });

  test("handleBatchPaused returns pause record and identity", () => {
    const event = makeEvent(BATCH_PAUSED_TOPIC, PAUSED_DATA);
    const { pause, identity } = handleBatchPaused(event);

    expect(pause.batchId).toBe("batch-2");
    expect(pause.pausedAt).toBe("1700001000");
    expect(identity).toBe("CONTRACT_DIST:8000:TX_DIST_HASH:0");
  });
});

// ── BatchResumed ──────────────────────────────────────────────────────────────

const RESUMED_DATA = { batchId: "batch-2", resumedAt: "1700002000" };

describe("BatchResumed handler (issue #38)", () => {
  test("parses a valid BatchResumed event", () => {
    const event = makeEvent(BATCH_RESUMED_TOPIC, RESUMED_DATA);
    expect(parseBatchResumedPayload(event)).toEqual(RESUMED_DATA);
  });

  test("throws on wrong topic", () => {
    const event = makeEvent("BatchPaused", RESUMED_DATA);
    expect(() => parseBatchResumedPayload(event)).toThrow(
      "Expected BatchResumed event topic, got BatchPaused",
    );
  });

  test("throws when resumedAt is missing", () => {
    const event = makeEvent(BATCH_RESUMED_TOPIC, { batchId: "b-1" });
    expect(() => parseBatchResumedPayload(event)).toThrow('"resumedAt" must be a non-empty string');
  });

  test("maps payload to BatchResumeRecord", () => {
    const event = makeEvent(BATCH_RESUMED_TOPIC, RESUMED_DATA);
    const payload = parseBatchResumedPayload(event);
    const record = mapBatchResumedToRecord(payload, event);

    expect(record).toEqual({
      batchId: "batch-2",
      resumedAt: "1700002000",
      contractId: "CONTRACT_DIST",
      ledger: 8000,
      txHash: "TX_DIST_HASH",
      eventIndex: 0,
    });
  });

  test("handleBatchResumed returns resume record and identity", () => {
    const event = makeEvent(BATCH_RESUMED_TOPIC, RESUMED_DATA);
    const { resume, identity } = handleBatchResumed(event);

    expect(resume.batchId).toBe("batch-2");
    expect(resume.resumedAt).toBe("1700002000");
    expect(identity).toBe("CONTRACT_DIST:8000:TX_DIST_HASH:0");
  });

  test("handleBatchResumed is idempotent", () => {
    const event = makeEvent(BATCH_RESUMED_TOPIC, RESUMED_DATA);
    expect(handleBatchResumed(event)).toEqual(handleBatchResumed(event));
  });
});
