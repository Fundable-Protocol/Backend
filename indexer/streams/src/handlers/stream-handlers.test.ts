import { beforeEach, describe, expect, test, vi } from "vitest";

import type { SorobanEventInput } from "@fundable-indexer/common";
import { createStreamCancelHandler } from "./stream-cancel.handler.js";
import { createStreamFundedHandler } from "./stream-funded.handler.js";
import { createStreamWithdrawalHandler } from "./stream-withdrawal.handler.js";
import { createStreamCreatedHandler } from "./stream-created.handler.js";
import type { StreamHandlerDeps, EventIdentityStore } from "./persistence.js";
import type { StreamPersistence } from "../db/repository.js";

const baseEvent: SorobanEventInput = {
  contractId: "CSTREAM123",
  ledger: 200,
  ledgerClosedAt: "2024-06-01T00:00:00Z",
  topic: ["stream_funded"],
  data: {},
  id: "event-2",
  pagingToken: "paging-2",
};

describe("Stream Handlers", () => {
  let mockStreams: import("vitest").Mocked<StreamPersistence>;
  let mockEvents: import("vitest").Mocked<EventIdentityStore>;
  let deps: StreamHandlerDeps;

  beforeEach(() => {
    mockStreams = {
      createStream: vi.fn(),
      fundStream: vi.fn(),
      recordWithdrawal: vi.fn(),
      recordCancel: vi.fn(),
    } as any;

    mockEvents = {
      isEventProcessed: vi.fn().mockResolvedValue(false),
      recordEventProcessed: vi.fn().mockResolvedValue(true),
    } as any;

    deps = {
      streams: mockStreams,
      events: mockEvents,
    };
  });

  describe("streamCreatedHandler", () => {
    test("returns ok for valid created payload", async () => {
      const handler = createStreamCreatedHandler(deps);
      const event: SorobanEventInput = {
        ...baseEvent,
        topic: ["stream_created"],
        data: {
          stream_id: "stream-1",
          sender: "GSENDER",
          recipient: "GRECIPIENT",
          amount: "1000",
          start_time: "10000",
          end_time: "20000",
          tx_hash: "tx123",
        },
      };

      const result = await handler(event);
      expect(result).toEqual({ ok: true });
      expect(mockStreams.createStream).toHaveBeenCalledWith({
        id: "stream-1",
        sender: "GSENDER",
        recipient: "GRECIPIENT",
        token: "N/A",
        totalAmount: "1000",
        startTime: "10000",
        endTime: "20000",
      });
      expect(mockEvents.recordEventProcessed).toHaveBeenCalled();
    });

    test("skips processing if event is already processed", async () => {
      mockEvents.isEventProcessed.mockResolvedValueOnce(true);
      const handler = createStreamCreatedHandler(deps);
      const event: SorobanEventInput = {
        ...baseEvent,
        data: {
          stream_id: "stream-1",
          sender: "GSENDER",
          recipient: "GRECIPIENT",
          amount: "1000",
          start_time: "10000",
          end_time: "20000",
          tx_hash: "tx123",
        },
      };

      const result = await handler(event);
      expect(result).toEqual({ ok: true });
      expect(mockStreams.createStream).not.toHaveBeenCalled();
    });
  });

  describe("streamFundedHandler", () => {
    test("returns ok for valid funded payload", async () => {
      const handler = createStreamFundedHandler(deps);
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
      expect(mockStreams.fundStream).toHaveBeenCalledWith({
        streamId: "stream-1",
        amount: "5000",
      });
      expect(mockEvents.recordEventProcessed).toHaveBeenCalled();
    });

    test("skips processing if event is already processed", async () => {
      mockEvents.isEventProcessed.mockResolvedValueOnce(true);
      const handler = createStreamFundedHandler(deps);
      const event: SorobanEventInput = {
        ...baseEvent,
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
      expect(mockStreams.fundStream).not.toHaveBeenCalled();
    });
  });

  describe("streamWithdrawalHandler", () => {
    test("returns ok for valid withdrawal payload", async () => {
      const handler = createStreamWithdrawalHandler(deps);
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
      expect(mockStreams.recordWithdrawal).toHaveBeenCalledWith({
        streamId: "stream-1",
        recipient: "GRECIPIENT",
        amount: "250",
        txHash: "def456",
        timestamp: "1717200000",
      });
      expect(mockEvents.recordEventProcessed).toHaveBeenCalled();
    });

    test("skips processing if event is already processed", async () => {
      mockEvents.isEventProcessed.mockResolvedValueOnce(true);
      const handler = createStreamWithdrawalHandler(deps);
      const event: SorobanEventInput = {
        ...baseEvent,
        data: {
          stream_id: "stream-1",
          recipient: "GRECIPIENT",
          amount: "250",
          tx_hash: "def456",
        },
      };

      const result = await handler(event);
      expect(result).toEqual({ ok: true });
      expect(mockStreams.recordWithdrawal).not.toHaveBeenCalled();
    });
  });

  describe("streamCancelHandler", () => {
    test("returns ok for valid cancel payload", async () => {
      const handler = createStreamCancelHandler(deps);
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
      expect(mockStreams.recordCancel).toHaveBeenCalledWith({
        streamId: "stream-1",
        canceler: "GSENDER",
        txHash: "ghi789",
        timestamp: "1717200000",
      });
      expect(mockEvents.recordEventProcessed).toHaveBeenCalled();
    });

    test("skips processing if event is already processed", async () => {
      mockEvents.isEventProcessed.mockResolvedValueOnce(true);
      const handler = createStreamCancelHandler(deps);
      const event: SorobanEventInput = {
        ...baseEvent,
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
      expect(mockStreams.recordCancel).not.toHaveBeenCalled();
    });
  });
});
