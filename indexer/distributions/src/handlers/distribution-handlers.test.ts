import { describe, expect, test } from "vitest";

import type { SorobanEventInput } from "@fundable-indexer/common";
import { distributionCreatedHandler } from "./distribution-created.handler.js";
import {
  distributionPausedHandler,
  distributionResumedHandler,
} from "./distribution-pause.handler.js";
import { tokensClaimedHandler } from "./tokens-claimed.handler.js";

const baseEvent: SorobanEventInput = {
  contractId: "CDIST456",
  ledger: 300,
  ledgerClosedAt: "2024-06-15T00:00:00Z",
  topic: ["distribution_created"],
  data: {},
  id: "event-3",
  pagingToken: "paging-3",
};

describe("distributionCreatedHandler", () => {
  test("returns ok for valid created payload", async () => {
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

    const result = await distributionCreatedHandler(event);
    expect(result).toEqual({ ok: true });
  });

  test("returns error when distributionId is missing", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: { creator: "GCREATOR", token: "USDC" },
    };

    const result = await distributionCreatedHandler(event);
    expect(result).toMatchObject({ ok: false, retriable: false });
  });

  test("is idempotent — processes same payload without throwing", async () => {
    const payload = {
      distribution_id: "dist-idempotent",
      creator: "G123",
      token: "XLM",
      total_amount: "500",
      recipient_count: 5,
      tx_hash: "txidem",
    };

    const results = await Promise.all([
      distributionCreatedHandler({ ...baseEvent, data: payload }),
      distributionCreatedHandler({ ...baseEvent, data: payload }),
    ]);

    expect(results.every((r) => r.ok)).toBe(true);
  });
});

describe("tokensClaimedHandler", () => {
  test("returns ok for valid claim payload", async () => {
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

    const result = await tokensClaimedHandler(event);
    expect(result).toEqual({ ok: true });
  });

  test("returns error when distributionId is missing", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: { claimant: "GCLAIM", amount: "10" },
    };

    const result = await tokensClaimedHandler(event);
    expect(result).toMatchObject({ ok: false, retriable: false });
  });
});

describe("distributionPausedHandler", () => {
  test("returns ok for valid paused payload", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      topic: ["distribution_paused"],
      data: {
        distribution_id: "dist-1",
        paused_by: "GADMIN",
        tx_hash: "txpause",
      },
    };

    const result = await distributionPausedHandler(event);
    expect(result).toEqual({ ok: true });
  });

  test("returns error when distributionId is missing", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: { paused_by: "GADMIN" },
    };

    const result = await distributionPausedHandler(event);
    expect(result).toMatchObject({ ok: false, retriable: false });
  });
});

describe("distributionResumedHandler", () => {
  test("returns ok for valid resumed payload", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      topic: ["distribution_resumed"],
      data: {
        distribution_id: "dist-1",
        resumed_by: "GADMIN",
        tx_hash: "txresume",
      },
    };

    const result = await distributionResumedHandler(event);
    expect(result).toEqual({ ok: true });
  });

  test("returns error when distributionId is missing", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: { resumed_by: "GADMIN" },
    };

    const result = await distributionResumedHandler(event);
    expect(result).toMatchObject({ ok: false, retriable: false });
  });
});
