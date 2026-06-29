import { describe, expect, test, vi } from "vitest";

import { HandlerRegistry } from "./registry.js";
import type { EventHandler, HandlerResult, SorobanEventInput } from "./types.js";

const baseEvent: SorobanEventInput = {
  contractId: "CABC123",
  ledger: 100,
  ledgerClosedAt: "2024-01-01T00:00:00Z",
  topic: ["stream_created"],
  data: { amount: 1000 },
  id: "event-1",
  pagingToken: "paging-1",
};

const ok: HandlerResult = { ok: true };
const makeHandler = (result: HandlerResult = ok): EventHandler => vi.fn().mockResolvedValue(result);

describe("HandlerRegistry", () => {
  describe("register and matches", () => {
    test("matches on contractId", () => {
      const registry = new HandlerRegistry();
      const handler = makeHandler();
      registry.register({ contractId: "CABC123" }, handler);

      expect(registry.matches(baseEvent)).toEqual([handler]);
    });

    test("does not match wrong contractId", () => {
      const registry = new HandlerRegistry();
      registry.register({ contractId: "COTHER" }, makeHandler());

      expect(registry.matches(baseEvent)).toHaveLength(0);
    });

    test("matches on topic", () => {
      const registry = new HandlerRegistry();
      const handler = makeHandler();
      registry.register({ topic: "stream_created" }, handler);

      expect(registry.matches(baseEvent)).toEqual([handler]);
    });

    test("does not match absent topic", () => {
      const registry = new HandlerRegistry();
      registry.register({ topic: "stream_cancelled" }, makeHandler());

      expect(registry.matches(baseEvent)).toHaveLength(0);
    });

    test("matches on eventName alias", () => {
      const registry = new HandlerRegistry();
      const handler = makeHandler();
      registry.register({ eventName: "stream_created" }, handler);

      expect(registry.matches(baseEvent)).toEqual([handler]);
    });

    test("matches combined contractId + topic filter", () => {
      const registry = new HandlerRegistry();
      const handler = makeHandler();
      registry.register({ contractId: "CABC123", topic: "stream_created" }, handler);

      expect(registry.matches(baseEvent)).toEqual([handler]);
      expect(registry.matches({ ...baseEvent, contractId: "COTHER" })).toHaveLength(0);
    });

    test("returns multiple handlers when several match", () => {
      const registry = new HandlerRegistry();
      const h1 = makeHandler();
      const h2 = makeHandler();
      registry.register({ contractId: "CABC123" }, h1);
      registry.register({ topic: "stream_created" }, h2);

      expect(registry.matches(baseEvent)).toEqual([h1, h2]);
    });

    test("empty filter matches every event", () => {
      const registry = new HandlerRegistry();
      const handler = makeHandler();
      registry.register({}, handler);

      expect(registry.matches(baseEvent)).toEqual([handler]);
    });
  });

  describe("dispatch", () => {
    test("calls all matched handlers and returns their results", async () => {
      const registry = new HandlerRegistry();
      const h1 = makeHandler({ ok: true });
      const h2 = makeHandler({ ok: false, error: "boom", retriable: true });
      registry.register({}, h1);
      registry.register({}, h2);

      const results = await registry.dispatch(baseEvent);

      expect(h1).toHaveBeenCalledWith(baseEvent);
      expect(h2).toHaveBeenCalledWith(baseEvent);
      expect(results).toEqual([{ ok: true }, { ok: false, error: "boom", retriable: true }]);
    });

    test("returns empty array when no handlers match", async () => {
      const registry = new HandlerRegistry();
      const results = await registry.dispatch(baseEvent);
      expect(results).toEqual([]);
    });
  });

  describe("fluent API", () => {
    test("register returns the registry for chaining", () => {
      const registry = new HandlerRegistry();
      const returned = registry.register({}, makeHandler());
      expect(returned).toBe(registry);
    });
  });

  describe("idempotent dispatch", () => {
    // biome-ignore lint/suspicious/noExplicitAny: mock objects
    let mockEventRepo: any;

    beforeEach(() => {
      mockEventRepo = {
        isEventProcessed: vi.fn(),
        recordEventProcessed: vi.fn(),
      };
    });

    test("should skip calling handlers and return empty if event is already processed", async () => {
      mockEventRepo.isEventProcessed.mockResolvedValue(true);
      const registry = new HandlerRegistry();
      const handler = makeHandler({ ok: true });
      registry.register({}, handler);

      const results = await registry.dispatch(baseEvent, mockEventRepo);

      expect(results).toEqual([]);
      expect(handler).not.toHaveBeenCalled();
      expect(mockEventRepo.isEventProcessed).toHaveBeenCalledWith("CABC123", 100, "event", 1);
    });

    test("should run handlers and record event as processed when all handlers succeed", async () => {
      mockEventRepo.isEventProcessed.mockResolvedValue(false);
      mockEventRepo.recordEventProcessed.mockResolvedValue(true);
      const registry = new HandlerRegistry();
      const h1 = makeHandler({ ok: true });
      const h2 = makeHandler({ ok: true });
      registry.register({}, h1);
      registry.register({}, h2);

      const results = await registry.dispatch(baseEvent, mockEventRepo);

      expect(results).toEqual([{ ok: true }, { ok: true }]);
      expect(h1).toHaveBeenCalledWith(baseEvent);
      expect(h2).toHaveBeenCalledWith(baseEvent);
      expect(mockEventRepo.recordEventProcessed).toHaveBeenCalledWith("CABC123", 100, "event", 1);
    });

    test("should not record event as processed if any handler fails", async () => {
      mockEventRepo.isEventProcessed.mockResolvedValue(false);
      const registry = new HandlerRegistry();
      const h1 = makeHandler({ ok: true });
      const h2 = makeHandler({ ok: false, error: "failed", retriable: true });
      registry.register({}, h1);
      registry.register({}, h2);

      const results = await registry.dispatch(baseEvent, mockEventRepo);

      expect(results).toEqual([{ ok: true }, { ok: false, error: "failed", retriable: true }]);
      expect(mockEventRepo.recordEventProcessed).not.toHaveBeenCalled();
    });

    test("should record event as processed if no handlers match", async () => {
      mockEventRepo.isEventProcessed.mockResolvedValue(false);
      mockEventRepo.recordEventProcessed.mockResolvedValue(true);
      const registry = new HandlerRegistry();

      const results = await registry.dispatch(baseEvent, mockEventRepo);

      expect(results).toEqual([]);
      expect(mockEventRepo.recordEventProcessed).toHaveBeenCalledWith("CABC123", 100, "event", 1);
    });
  });
});
