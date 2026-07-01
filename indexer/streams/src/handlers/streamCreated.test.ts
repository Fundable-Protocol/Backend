import { describe, expect, test } from "vitest";

import {
  STREAM_CREATED_TOPIC,
  getEventIdentity,
  handleStreamCreated,
  mapStreamCreatedToRecord,
  parseStreamCreatedPayload,
} from "./streamCreated.js";
import type { StreamCreatedEvent } from "./types.js";

function createMockEvent(overrides?: Partial<StreamCreatedEvent>): StreamCreatedEvent {
  return {
    contractId: "0x123",
    ledger: 12345,
    txHash: "0xabc",
    eventIndex: 0,
    topics: [STREAM_CREATED_TOPIC],
    data: JSON.stringify({
      streamId: "stream-1",
      sender: "0xsender",
      recipient: "0xrecipient",
      amount: "1000000000",
      startTime: "1000000",
      endTime: "2000000",
    }),
    ...overrides,
  };
}

const mockPayload = {
  streamId: "stream-1",
  sender: "0xsender",
  recipient: "0xrecipient",
  amount: "1000000000",
  startTime: "1000000",
  endTime: "2000000",
};

describe("parseStreamCreatedPayload", () => {
  test("parses a valid StreamCreated event", () => {
    const event = createMockEvent();
    const payload = parseStreamCreatedPayload(event);

    expect(payload).toEqual(mockPayload);
  });

  test("throws when event topic does not match", () => {
    const event = createMockEvent({ topics: ["WrongTopic"] });

    expect(() => parseStreamCreatedPayload(event)).toThrow(
      "Expected StreamCreated event topic, got WrongTopic",
    );
  });

  test("throws when topics array is empty", () => {
    const event = createMockEvent({ topics: [] });

    expect(() => parseStreamCreatedPayload(event)).toThrow(
      "Expected StreamCreated event topic, got undefined",
    );
  });

  test("throws on invalid JSON data", () => {
    const event = createMockEvent({ data: "not-json" });

    expect(() => parseStreamCreatedPayload(event)).toThrow(
      "Failed to parse event data: invalid JSON",
    );
  });

  test("throws on missing streamId field", () => {
    const { streamId: _, ...partial } = mockPayload;
    const event = createMockEvent({ data: JSON.stringify(partial) });

    expect(() => parseStreamCreatedPayload(event)).toThrow(
      'Invalid payload: "streamId" must be a non-empty string',
    );
  });

  test("throws on non-string amount field", () => {
    const event = createMockEvent({
      data: JSON.stringify({ ...mockPayload, amount: 12345 }),
    });

    expect(() => parseStreamCreatedPayload(event)).toThrow(
      'Invalid payload: "amount" must be a non-empty string',
    );
  });

  test("throws on empty string recipient", () => {
    const event = createMockEvent({
      data: JSON.stringify({ ...mockPayload, recipient: "" }),
    });

    expect(() => parseStreamCreatedPayload(event)).toThrow(
      'Invalid payload: "recipient" must be a non-empty string',
    );
  });
});

describe("getEventIdentity", () => {
  test("produces a deterministic identity string", () => {
    const event = createMockEvent();
    const identity = getEventIdentity(event);

    expect(identity).toBe("0x123:12345:0xabc:0");
  });

  test("changes when any identity field changes", () => {
    const base = createMockEvent();
    const differentContract = createMockEvent({ contractId: "0x456" });
    const differentLedger = createMockEvent({ ledger: 99999 });
    const differentTxHash = createMockEvent({ txHash: "0xdef" });
    const differentIndex = createMockEvent({ eventIndex: 1 });

    const baseId = getEventIdentity(base);
    expect(getEventIdentity(differentContract)).not.toBe(baseId);
    expect(getEventIdentity(differentLedger)).not.toBe(baseId);
    expect(getEventIdentity(differentTxHash)).not.toBe(baseId);
    expect(getEventIdentity(differentIndex)).not.toBe(baseId);
  });
});

describe("mapStreamCreatedToRecord", () => {
  test("maps payload and event to a Stream record", () => {
    const event = createMockEvent();
    const record = mapStreamCreatedToRecord(mockPayload, event);

    expect(record).toEqual({
      id: "stream-1",
      sender: "0xsender",
      recipient: "0xrecipient",
      amount: "1000000000",
      startTime: "1000000",
      endTime: "2000000",
      contractId: "0x123",
      ledger: 12345,
      txHash: "0xabc",
      eventIndex: 0,
    });
  });
});

describe("handleStreamCreated", () => {
  test("returns stream record and identity", () => {
    const event = createMockEvent();
    const result = handleStreamCreated(event);

    expect(result.stream.id).toBe("stream-1");
    expect(result.stream.contractId).toBe("0x123");
    expect(result.stream.ledger).toBe(12345);
    expect(result.identity).toBe("0x123:12345:0xabc:0");
  });

  test("is idempotent (same input produces same output)", () => {
    const event = createMockEvent();
    const result1 = handleStreamCreated(event);
    const result2 = handleStreamCreated(event);

    expect(result1).toEqual(result2);
  });

  test("handles different stream IDs correctly", () => {
    const event1 = createMockEvent({
      data: JSON.stringify({ ...mockPayload, streamId: "stream-1" }),
    });
    const event2 = createMockEvent({
      data: JSON.stringify({ ...mockPayload, streamId: "stream-2" }),
    });

    const result1 = handleStreamCreated(event1);
    const result2 = handleStreamCreated(event2);

    expect(result1.stream.id).toBe("stream-1");
    expect(result2.stream.id).toBe("stream-2");
    expect(result1.stream.id).not.toBe(result2.stream.id);
  });
});
