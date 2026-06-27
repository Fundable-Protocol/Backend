import { describe, expect, test, vi } from "vitest";

import { EventHandlerRegistry, createHandlerRegistry } from "./registry.js";
import type { HandlerResult, SorobanEvent } from "./types.js";

function makeEvent(overrides?: Partial<SorobanEvent>): SorobanEvent {
  return {
    contractId: "CONTRACT_A",
    ledger: 1000,
    txHash: "TX_HASH_1",
    eventIndex: 0,
    topics: ["StreamCreated"],
    data: JSON.stringify({ streamId: "s-1" }),
    ...overrides,
  };
}

const OK: HandlerResult = { success: true, summary: "ok" };

describe("EventHandlerRegistry (issue #30)", () => {
  describe("registration and matching", () => {
    test("a handler with no filter fields matches every event", async () => {
      const registry = createHandlerRegistry();
      const handler = vi.fn().mockResolvedValue(OK);

      registry.register({}, handler);

      const eventA = makeEvent({ contractId: "A" });
      const eventB = makeEvent({ contractId: "B", topics: ["Transfer"] });

      expect(registry.match(eventA)).toHaveLength(1);
      expect(registry.match(eventB)).toHaveLength(1);
    });

    test("contractId filter only matches events from that contract", () => {
      const registry = createHandlerRegistry();
      registry.register({ contractId: "CONTRACT_A" }, vi.fn().mockResolvedValue(OK));

      expect(registry.match(makeEvent({ contractId: "CONTRACT_A" }))).toHaveLength(1);
      expect(registry.match(makeEvent({ contractId: "CONTRACT_B" }))).toHaveLength(0);
    });

    test("eventName filter only matches events whose first topic equals it", () => {
      const registry = createHandlerRegistry();
      registry.register({ eventName: "StreamCreated" }, vi.fn().mockResolvedValue(OK));

      expect(registry.match(makeEvent({ topics: ["StreamCreated"] }))).toHaveLength(1);
      expect(registry.match(makeEvent({ topics: ["StreamCancelled"] }))).toHaveLength(0);
    });

    test("both contractId and eventName must match", () => {
      const registry = createHandlerRegistry();
      registry.register(
        { contractId: "CONTRACT_A", eventName: "StreamCreated" },
        vi.fn().mockResolvedValue(OK),
      );

      expect(
        registry.match(makeEvent({ contractId: "CONTRACT_A", topics: ["StreamCreated"] })),
      ).toHaveLength(1);

      // contract matches but event name does not
      expect(
        registry.match(makeEvent({ contractId: "CONTRACT_A", topics: ["Transfer"] })),
      ).toHaveLength(0);

      // event name matches but contract does not
      expect(
        registry.match(makeEvent({ contractId: "CONTRACT_B", topics: ["StreamCreated"] })),
      ).toHaveLength(0);
    });

    test("multiple handlers can match the same event", () => {
      const registry = createHandlerRegistry();
      registry.register({ eventName: "StreamCreated" }, vi.fn().mockResolvedValue(OK));
      registry.register({ contractId: "CONTRACT_A" }, vi.fn().mockResolvedValue(OK));
      registry.register({}, vi.fn().mockResolvedValue(OK));

      expect(registry.match(makeEvent())).toHaveLength(3);
    });

    test("returns handlers in registration order", async () => {
      const registry = createHandlerRegistry();
      const order: number[] = [];

      registry.register({}, async () => { order.push(1); return OK; });
      registry.register({}, async () => { order.push(2); return OK; });
      registry.register({}, async () => { order.push(3); return OK; });

      await registry.dispatch(makeEvent());

      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe("dispatch", () => {
    test("calls all matching handlers and collects results", async () => {
      const registry = createHandlerRegistry();
      const h1 = vi.fn().mockResolvedValue({ success: true, summary: "h1" });
      const h2 = vi.fn().mockResolvedValue({ success: true, summary: "h2" });

      registry.register({ eventName: "StreamCreated" }, h1);
      registry.register({ eventName: "StreamCreated" }, h2);

      const results = await registry.dispatch(makeEvent());

      expect(results).toEqual([
        { success: true, summary: "h1" },
        { success: true, summary: "h2" },
      ]);
      expect(h1).toHaveBeenCalledOnce();
      expect(h2).toHaveBeenCalledOnce();
    });

    test("catches a throwing handler and records success:false without stopping others", async () => {
      const registry = createHandlerRegistry();
      const failing = vi.fn().mockRejectedValue(new Error("db connection lost"));
      const succeeding = vi.fn().mockResolvedValue({ success: true });

      registry.register({}, failing);
      registry.register({}, succeeding);

      const results = await registry.dispatch(makeEvent());

      expect(results[0]).toEqual({ success: false, summary: "db connection lost" });
      expect(results[1]).toEqual({ success: true });
      expect(succeeding).toHaveBeenCalledOnce();
    });

    test("returns empty array when no handlers match", async () => {
      const registry = createHandlerRegistry();
      registry.register({ eventName: "StreamCreated" }, vi.fn().mockResolvedValue(OK));

      const results = await registry.dispatch(makeEvent({ topics: ["Transfer"] }));

      expect(results).toEqual([]);
    });

    test("passes the full event to each handler", async () => {
      const registry = createHandlerRegistry();
      const handler = vi.fn().mockResolvedValue(OK);

      registry.register({}, handler);

      const event = makeEvent({ contractId: "SPECIFIC", ledger: 9999, txHash: "TX_XYZ" });
      await registry.dispatch(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    test("is idempotent — dispatching the same event twice calls handlers twice", async () => {
      const registry = createHandlerRegistry();
      const handler = vi.fn().mockResolvedValue(OK);
      registry.register({}, handler);

      const event = makeEvent();
      await registry.dispatch(event);
      await registry.dispatch(event);

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe("createHandlerRegistry factory", () => {
    test("returns a fresh registry with no handlers", async () => {
      const registry = createHandlerRegistry();
      expect(registry.match(makeEvent())).toHaveLength(0);
    });

    test("two registries are independent", () => {
      const r1 = createHandlerRegistry();
      const r2 = createHandlerRegistry();

      r1.register({}, vi.fn().mockResolvedValue(OK));

      expect(r1.match(makeEvent())).toHaveLength(1);
      expect(r2.match(makeEvent())).toHaveLength(0);
    });
  });
});
