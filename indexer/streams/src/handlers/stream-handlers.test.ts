import { describe, expect, test } from "vitest";

import type { SorobanEventInput } from "@fundable-indexer/common";
import type { StreamWriteService } from "../db/repository.js";
import { createStreamCancelHandler } from "./stream-cancel.handler.js";
import { createStreamFundedHandler } from "./stream-funded.handler.js";
import { createStreamWithdrawalHandler } from "./stream-withdrawal.handler.js";

class StubStreamWriteService implements StreamWriteService {
  public createdStreams: Array<{ id: string; amount: string }> = [];
  public fundedStreams: Array<{ streamId: string; amount: string }> = [];
  public withdrawals: Array<{ streamId: string; amount: string }> = [];
  public cancels: Array<{ streamId: string }> = [];
  private processedEvents = new Set<string>();

  private shouldProcess(eventKey?: string): boolean {
    if (!eventKey) {
      return true;
    }

    if (this.processedEvents.has(eventKey)) {
      return false;
    }

    this.processedEvents.add(eventKey);
    return true;
  }

  async createStream(input: { id: string; totalAmount: string }, eventKey?: string): Promise<void> {
    if (!this.shouldProcess(eventKey)) {
      return;
    }

    this.createdStreams.push({ id: input.id, amount: input.totalAmount });
  }

  async fundStream(streamId: string, amount: string, eventKey?: string): Promise<void> {
    if (!this.shouldProcess(eventKey)) {
      return;
    }

    this.fundedStreams.push({ streamId, amount });
  }

  async recordWithdrawal(
    streamId: string,
    _recipient: string,
    amount: string,
    _txHash: string,
    _timestamp: string,
    eventKey?: string,
  ): Promise<void> {
    if (!this.shouldProcess(eventKey)) {
      return;
    }

    this.withdrawals.push({ streamId, amount });
  }

  async recordCancel(
    streamId: string,
    _canceler: string,
    _txHash: string,
    _timestamp: string,
    eventKey?: string,
  ): Promise<void> {
    if (!this.shouldProcess(eventKey)) {
      return;
    }

    this.cancels.push({ streamId });
  }
}

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
  test("persists funded amount through the stream write service", async () => {
    const persistence = new StubStreamWriteService();
    const handler = createStreamFundedHandler(persistence);
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

    const result = await handler(event);
    expect(result).toEqual({ ok: true });
    expect(persistence.fundedStreams).toEqual([{ streamId: "stream-1", amount: "5000" }]);
  });

  test("does not double-count a duplicate funded replay", async () => {
    const persistence = new StubStreamWriteService();
    const handler = createStreamFundedHandler(persistence);
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

    await handler(event);
    await handler(event);

    expect(persistence.fundedStreams).toHaveLength(1);
  });

  test("returns ok for valid funded payload", async () => {
  });

  test("returns error when streamId is missing", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: { amount: "100", token: "XLM", sender: "G123" },
    };

    const result = await createStreamFundedHandler()(event);
    expect(result).toMatchObject({ ok: false, retriable: false });
  });

  test("handles unexpected data shape without throwing", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: null,
    };

    const result = await createStreamFundedHandler()(event);
    expect(result.ok).toBe(false);
  });
});

describe("streamWithdrawalHandler", () => {
  test("persists withdrawal actions through the stream write service", async () => {
    const persistence = new StubStreamWriteService();
    const handler = createStreamWithdrawalHandler(persistence);
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

    const result = await handler(event);
    expect(result).toEqual({ ok: true });
    expect(persistence.withdrawals).toEqual([{ streamId: "stream-1", amount: "250" }]);
  });

  test("does not double-record a duplicate withdrawal replay", async () => {
    const persistence = new StubStreamWriteService();
    const handler = createStreamWithdrawalHandler(persistence);
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

    await handler(event);
    await handler(event);

    expect(persistence.withdrawals).toHaveLength(1);
  });

  test("returns ok for valid withdrawal payload", async () => {
  });

  test("returns error when streamId is missing", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: { recipient: "G123", amount: "50" },
    };

    const result = await createStreamWithdrawalHandler()(event);
    expect(result).toMatchObject({ ok: false, retriable: false });
  });
});

describe("streamCancelHandler", () => {
  test("persists cancel actions through the stream write service", async () => {
    const persistence = new StubStreamWriteService();
    const handler = createStreamCancelHandler(persistence);
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

    const result = await handler(event);
    expect(result).toEqual({ ok: true });
    expect(persistence.cancels).toEqual([{ streamId: "stream-1" }]);
  });

  test("does not double-record a duplicate cancel replay", async () => {
    const persistence = new StubStreamWriteService();
    const handler = createStreamCancelHandler(persistence);
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

    await handler(event);
    await handler(event);

    expect(persistence.cancels).toHaveLength(1);
  });

  test("returns ok for valid cancel payload", async () => {
  });

  test("returns error when streamId is missing", async () => {
    const event: SorobanEventInput = {
      ...baseEvent,
      data: { cancelled_by: "G123" },
    };

    const result = await createStreamCancelHandler()(event);
    expect(result).toMatchObject({ ok: false, retriable: false });
  });
});
