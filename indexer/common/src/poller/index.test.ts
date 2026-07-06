import { describe, expect, it, vi } from "vitest";
import { SorobanPoller } from "./index.js";

describe("SorobanPoller", () => {
  it("should successfully process events and advance cursor", async () => {
    const poller = new SorobanPoller({ retryDelayMs: 1 });
    const fetchEvents = vi.fn().mockResolvedValue([{ id: 1 }]);
    const processEvent = vi.fn().mockResolvedValue(undefined);
    const updateCursor = vi.fn().mockResolvedValue(undefined);

    const result = await poller.processLedgerRange(10, 20, fetchEvents, processEvent, updateCursor);

    expect(result.success).toBe(true);
    expect(result.lastProcessedLedger).toBe(20);
    expect(fetchEvents).toHaveBeenCalledWith(10, 20);
    expect(processEvent).toHaveBeenCalledWith({ id: 1 });
    expect(updateCursor).toHaveBeenCalledWith(20);
  });

  it("should retry on transient errors when fetching events", async () => {
    const poller = new SorobanPoller({ retryDelayMs: 1, maxRetries: 2 });
    let attempts = 0;
    const fetchEvents = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts === 1) return Promise.reject(new Error("network timeout"));
      return Promise.resolve([{ id: 2 }]);
    });
    const processEvent = vi.fn().mockResolvedValue(undefined);
    const updateCursor = vi.fn().mockResolvedValue(undefined);

    const result = await poller.processLedgerRange(10, 20, fetchEvents, processEvent, updateCursor);

    expect(result.success).toBe(true);
    expect(attempts).toBe(2);
    expect(fetchEvents).toHaveBeenCalledTimes(2);
    expect(processEvent).toHaveBeenCalledWith({ id: 2 });
    expect(updateCursor).toHaveBeenCalledWith(20);
  });

  it("should not advance cursor if handler fails", async () => {
    const poller = new SorobanPoller({ retryDelayMs: 1 });
    const fetchEvents = vi.fn().mockResolvedValue([{ id: 3 }]);
    const processEvent = vi.fn().mockRejectedValue(new Error("Handler failure"));
    const updateCursor = vi.fn();

    const result = await poller.processLedgerRange(10, 20, fetchEvents, processEvent, updateCursor);

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe("Handler failure");
    expect(updateCursor).not.toHaveBeenCalled();
  });
});
