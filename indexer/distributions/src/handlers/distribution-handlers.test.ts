import { beforeEach, describe, expect, test } from "vitest";

import type { SorobanEventInput } from "@fundable-indexer/common";
import type { CreateBatchInput, RecordClaimInput, SetStatusInput } from "../db/repository.js";
import { createDistributionCreatedHandler } from "./distribution-created.handler.js";
import {
  createDistributionPausedHandler,
  createDistributionResumedHandler,
} from "./distribution-pause.handler.js";
import type { DistributionHandlerDeps } from "./persistence.js";
import { createTokensClaimedHandler } from "./tokens-claimed.handler.js";

interface RecordedCalls {
  createBatch: CreateBatchInput[];
  recordClaim: RecordClaimInput[];
  setStatus: SetStatusInput[];
  recordedEvents: string[];
}

function identityKey(
  contractId: string,
  ledger: number,
  txHash: string,
  eventIndex: number,
): string {
  return `${contractId}|${ledger}|${txHash}|${eventIndex}`;
}

function makeDeps(): { deps: DistributionHandlerDeps; calls: RecordedCalls } {
  const processed = new Set<string>();
  const calls: RecordedCalls = {
    createBatch: [],
    recordClaim: [],
    setStatus: [],
    recordedEvents: [],
  };

  const deps: DistributionHandlerDeps = {
    events: {
      async isEventProcessed(contractId, ledger, txHash, eventIndex) {
        return processed.has(identityKey(contractId, ledger, txHash, eventIndex));
      },
      async recordEventProcessed(contractId, ledger, txHash, eventIndex) {
        const key = identityKey(contractId, ledger, txHash, eventIndex);
        const isNew = !processed.has(key);
        processed.add(key);
        calls.recordedEvents.push(key);
        return isNew;
      },
    },
    distributions: {
      async createBatch(input) {
        calls.createBatch.push(input);
      },
      async recordClaim(input) {
        calls.recordClaim.push(input);
      },
      async setStatus(input) {
        calls.setStatus.push(input);
      },
    },
  };

  return { deps, calls };
}

// Realistic Soroban event envelope. Event IDs encode the ledger sequence and
// the trailing event position used to derive a deterministic event index.
const baseEvent: SorobanEventInput = {
  contractId: "CDIST456",
  ledger: 300,
  ledgerClosedAt: "2024-06-15T00:00:00Z",
  topic: ["distribution_created"],
  data: {},
  id: "0000000523986165760-0000000007",
  pagingToken: "0000000523986165760-0000000007",
};

describe("distributionCreatedHandler", () => {
  let deps: DistributionHandlerDeps;
  let calls: RecordedCalls;

  beforeEach(() => {
    ({ deps, calls } = makeDeps());
  });

  test("persists a batch for a valid created payload", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: {
        distribution_id: "dist-1",
        creator: "GCREATOR",
        token: "USDC",
        total_amount: "100000",
        recipient_count: 50,
        tx_hash: "txabc",
      },
    };

    const result = await createDistributionCreatedHandler(deps)(event);

    expect(result).toEqual({ ok: true });
    expect(calls.createBatch).toHaveLength(1);
    expect(calls.createBatch[0]).toMatchObject({
      distributionId: "dist-1",
      contractId: "CDIST456",
      distributor: "GCREATOR",
      token: "USDC",
      totalAmount: "100000",
      recipientCount: 50,
      ledgerNumber: 300,
      txHash: "txabc",
    });
    expect(calls.recordedEvents).toHaveLength(1);
  });

  test("returns error and does not persist when distributionId is missing", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: { creator: "GCREATOR", token: "USDC" },
    };

    const result = await createDistributionCreatedHandler(deps)(event);

    expect(result).toMatchObject({ ok: false, retriable: false });
    expect(calls.createBatch).toHaveLength(0);
  });

  test("returns error and does not persist when total_amount is missing", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: {
        distribution_id: "dist-1",
        creator: "GCREATOR",
        token: "USDC",
        recipient_count: 50,
        tx_hash: "txabc",
      },
    };

    const result = await createDistributionCreatedHandler(deps)(event);
    expect(result).toMatchObject({ ok: false, retriable: false });
    expect(calls.createBatch).toHaveLength(0);
  });

  test("returns error when recipientCount is not positive", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: {
        distribution_id: "dist-1",
        creator: "GCREATOR",
        token: "USDC",
        total_amount: "100000",
        recipient_count: 0,
        tx_hash: "txabc",
      },
    };

    const result = await createDistributionCreatedHandler(deps)(event);
    expect(result).toMatchObject({ ok: false, retriable: false });
    expect(calls.createBatch).toHaveLength(0);
  });

  test("is idempotent — replaying the same event persists the batch once", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: {
        distribution_id: "dist-idempotent",
        creator: "G123",
        token: "XLM",
        total_amount: "500",
        recipient_count: 5,
        tx_hash: "txidem",
      },
    };

    const handler = createDistributionCreatedHandler(deps);
    const first = await handler(event);
    const second = await handler(event);

    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(calls.createBatch).toHaveLength(1);
    expect(calls.recordedEvents).toHaveLength(1);
  });

  test("surfaces repository failures as retriable", async () => {
    deps.distributions.createBatch = async () => {
      throw new Error("connection reset");
    };
    const event: SorobanEventInput = {
      ...baseEvent,
      data: {
        distribution_id: "dist-1",
        creator: "GCREATOR",
        token: "USDC",
        total_amount: "100000",
        recipient_count: 50,
        tx_hash: "txabc",
      },
    };

    const result = await createDistributionCreatedHandler(deps)(event);
    expect(result).toMatchObject({ ok: false, retriable: true });
  });
});

describe("tokensClaimedHandler", () => {
  let deps: DistributionHandlerDeps;
  let calls: RecordedCalls;

  beforeEach(() => {
    ({ deps, calls } = makeDeps());
  });

  test("records a claim for a valid payload", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      topic: ["tokens_claimed"],
      data: {
        distribution_id: "dist-1",
        claimant: "GCLAIMANT",
        amount: "2000",
        tx_hash: "txclaim",
      },
    };

    const result = await createTokensClaimedHandler(deps)(event);

    expect(result).toEqual({ ok: true });
    expect(calls.recordClaim).toHaveLength(1);
    expect(calls.recordClaim[0]).toMatchObject({
      distributionId: "dist-1",
      claimant: "GCLAIMANT",
      amount: "2000",
      txHash: "txclaim",
      ledgerNumber: 300,
      eventIndex: 7,
      eventTimestamp: "2024-06-15T00:00:00Z",
    });
  });

  test("returns error and does not record when distributionId is missing", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: { claimant: "GCLAIM", amount: "10" },
    };

    const result = await createTokensClaimedHandler(deps)(event);
    expect(result).toMatchObject({ ok: false, retriable: false });
    expect(calls.recordClaim).toHaveLength(0);
  });

  test("returns error when amount is zero", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: {
        distribution_id: "dist-1",
        claimant: "GCLAIMANT",
        amount: "0",
        tx_hash: "txclaim",
      },
    };

    const result = await createTokensClaimedHandler(deps)(event);
    expect(result).toMatchObject({ ok: false, retriable: false });
    expect(calls.recordClaim).toHaveLength(0);
  });

  test("does not double-count a replayed claim event", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      topic: ["tokens_claimed"],
      data: {
        distribution_id: "dist-1",
        claimant: "GCLAIMANT",
        amount: "2000",
        tx_hash: "txclaim",
      },
    };

    const handler = createTokensClaimedHandler(deps);
    await handler(event);
    await handler(event);

    expect(calls.recordClaim).toHaveLength(1);
    expect(calls.recordedEvents).toHaveLength(1);
  });
});

describe("distributionPausedHandler", () => {
  let deps: DistributionHandlerDeps;
  let calls: RecordedCalls;

  beforeEach(() => {
    ({ deps, calls } = makeDeps());
  });

  test("sets status to PAUSED for a valid payload", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      topic: ["distribution_paused"],
      data: {
        distribution_id: "dist-1",
        paused_by: "GADMIN",
        tx_hash: "txpause",
      },
    };

    const result = await createDistributionPausedHandler(deps)(event);

    expect(result).toEqual({ ok: true });
    expect(calls.setStatus).toHaveLength(1);
    expect(calls.setStatus[0]).toMatchObject({
      distributionId: "dist-1",
      status: "PAUSED",
      ledgerNumber: 300,
      changedAt: "2024-06-15T00:00:00Z",
    });
  });

  test("returns error and does not update when distributionId is missing", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: { paused_by: "GADMIN" },
    };

    const result = await createDistributionPausedHandler(deps)(event);
    expect(result).toMatchObject({ ok: false, retriable: false });
    expect(calls.setStatus).toHaveLength(0);
  });

  test("is idempotent on replay", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      topic: ["distribution_paused"],
      data: {
        distribution_id: "dist-1",
        paused_by: "GADMIN",
        tx_hash: "txpause",
      },
    };

    const handler = createDistributionPausedHandler(deps);
    await handler(event);
    await handler(event);

    expect(calls.setStatus).toHaveLength(1);
  });
});

describe("distributionResumedHandler", () => {
  let deps: DistributionHandlerDeps;
  let calls: RecordedCalls;

  beforeEach(() => {
    ({ deps, calls } = makeDeps());
  });

  test("sets status to ACTIVE for a valid payload", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      topic: ["distribution_resumed"],
      data: {
        distribution_id: "dist-1",
        resumed_by: "GADMIN",
        tx_hash: "txresume",
      },
    };

    const result = await createDistributionResumedHandler(deps)(event);

    expect(result).toEqual({ ok: true });
    expect(calls.setStatus).toHaveLength(1);
    expect(calls.setStatus[0]).toMatchObject({
      distributionId: "dist-1",
      status: "ACTIVE",
      ledgerNumber: 300,
      changedAt: "2024-06-15T00:00:00Z",
    });
  });

  test("returns error and does not update when resumedBy is missing", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: { distribution_id: "dist-1", tx_hash: "txresume" },
    };

    const result = await createDistributionResumedHandler(deps)(event);
    expect(result).toMatchObject({ ok: false, retriable: false });
    expect(calls.setStatus).toHaveLength(0);
  });

  test("is idempotent on replay", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      topic: ["distribution_resumed"],
      data: {
        distribution_id: "dist-1",
        resumed_by: "GADMIN",
        tx_hash: "txresume",
      },
    };

    const handler = createDistributionResumedHandler(deps);
    await handler(event);
    await handler(event);

    expect(calls.setStatus).toHaveLength(1);
  });
});
