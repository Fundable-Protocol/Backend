import { describe, expect, test } from "vitest";

import type { SorobanEventInput } from "@fundable-indexer/common";
import { streamCancelHandler } from "./stream-cancel.handler.js";
import { streamFundedHandler } from "./stream-funded.handler.js";
import { streamWithdrawalHandler } from "./stream-withdrawal.handler.js";

const baseEvent: SorobanEventInput = {
  contractId: "CSTREAM123",
  ledger: 200,
  ledgerClosedAt: "2024-06-01T00:00:00Z",
  topic: ["stream_funded"],
  data: {},
  id: "event-2",
  pagingToken: "paging-2",
};

describe("streamFundedHandler", () => {
  test("returns ok for valid funded payload", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      topic: ["stream_funded"],
      data: {
        stream_id: "stream-1",
        sender: "GSENDER",
        amount: "5000",
        token: "USDC",
        tx_hash: "abc123",
      },
    };

    const result = await streamFundedHandler(event);
    expect(result).toEqual({ ok: true });
  });

  test("returns error when streamId is missing", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: { amount: "100", token: "XLM", sender: "G123" },
    };

    const result = await streamFundedHandler(event);
    expect(result).toMatchObject({ ok: false, retriable: false });
  });

  test("handles unexpected data shape without throwing", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: null,
    };

    const result = await streamFundedHandler(event);
    expect(result.ok).toBe(false);
  });
});

describe("streamWithdrawalHandler", () => {
  test("returns ok for valid withdrawal payload", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      topic: ["stream_withdrawal"],
      data: {
        stream_id: "stream-1",
        recipient: "GRECIPIENT",
        amount: "250",
        tx_hash: "def456",
      },
    };

    const result = await streamWithdrawalHandler(event);
    expect(result).toEqual({ ok: true });
  });

  test("returns error when streamId is missing", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: { recipient: "G123", amount: "50" },
    };

    const result = await streamWithdrawalHandler(event);
    expect(result).toMatchObject({ ok: false, retriable: false });
  });
});

describe("streamCancelHandler", () => {
  test("returns ok for valid cancel payload", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      topic: ["stream_cancel"],
      data: {
        stream_id: "stream-1",
        cancelled_by: "GSENDER",
        sender_balance: "4750",
        recipient_balance: "250",
        tx_hash: "ghi789",
      },
    };

    const result = await streamCancelHandler(event);
    expect(result).toEqual({ ok: true });
  });

  test("returns error when streamId is missing", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: { cancelled_by: "G123" },
    };

    const result = await streamCancelHandler(event);
    expect(result).toMatchObject({ ok: false, retriable: false });
  });
});
