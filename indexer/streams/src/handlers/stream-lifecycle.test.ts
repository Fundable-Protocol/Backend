import { describe, expect, test } from "vitest";

import {
  STREAM_FUNDED_TOPIC,
  handleStreamFunded,
  mapStreamFundedToRecord,
  parseStreamFundedPayload,
} from "./streamFunded.js";
import {
  STREAM_WITHDRAWAL_TOPIC,
  handleStreamWithdrawal,
  mapStreamWithdrawalToRecord,
  parseStreamWithdrawalPayload,
} from "./streamWithdrawal.js";
import {
  STREAM_CANCEL_TOPIC,
  handleStreamCancel,
  mapStreamCancelToRecord,
  parseStreamCancelPayload,
} from "./streamCancel.js";
import type { StreamEvent } from "./types.js";

function makeEvent(
  topic: string,
  data: Record<string, unknown>,
  overrides?: Partial<StreamEvent>,
): StreamEvent {
  return {
    contractId: "CONTRACT_STREAM",
    ledger: 5000,
    txHash: "TX_HASH_STREAM",
    eventIndex: 0,
    topics: [topic],
    data: JSON.stringify(data),
    ...overrides,
  };
}

// ── StreamFunded ──────────────────────────────────────────────────────────────

const FUNDED_DATA = { streamId: "s-1", amount: "500000000" };

describe("StreamFunded handler (issue #35)", () => {
  test("parses a valid StreamFunded event", () => {
    const event = makeEvent(STREAM_FUNDED_TOPIC, FUNDED_DATA);
    expect(parseStreamFundedPayload(event)).toEqual(FUNDED_DATA);
  });

  test("throws on wrong topic", () => {
    const event = makeEvent("WrongTopic", FUNDED_DATA);
    expect(() => parseStreamFundedPayload(event)).toThrow(
      "Expected StreamFunded event topic, got WrongTopic",
    );
  });

  test("throws on invalid JSON data", () => {
    const event = makeEvent(STREAM_FUNDED_TOPIC, {});
    event.data = "not-json";
    expect(() => parseStreamFundedPayload(event)).toThrow(
      "Failed to parse event data: invalid JSON",
    );
  });

  test("throws when streamId is missing", () => {
    const event = makeEvent(STREAM_FUNDED_TOPIC, { amount: "100" });
    expect(() => parseStreamFundedPayload(event)).toThrow('"streamId" must be a non-empty string');
  });

  test("throws when amount is empty string", () => {
    const event = makeEvent(STREAM_FUNDED_TOPIC, { streamId: "s-1", amount: "" });
    expect(() => parseStreamFundedPayload(event)).toThrow('"amount" must be a non-empty string');
  });

  test("maps payload + event to FundedRecord", () => {
    const event = makeEvent(STREAM_FUNDED_TOPIC, FUNDED_DATA);
    const payload = parseStreamFundedPayload(event);
    const record = mapStreamFundedToRecord(payload, event);

    expect(record).toEqual({
      streamId: "s-1",
      amount: "500000000",
      contractId: "CONTRACT_STREAM",
      ledger: 5000,
      txHash: "TX_HASH_STREAM",
      eventIndex: 0,
    });
  });

  test("handleStreamFunded returns funded record and deterministic identity", () => {
    const event = makeEvent(STREAM_FUNDED_TOPIC, FUNDED_DATA);
    const { funded, identity } = handleStreamFunded(event);

    expect(funded.streamId).toBe("s-1");
    expect(funded.amount).toBe("500000000");
    expect(identity).toBe("CONTRACT_STREAM:5000:TX_HASH_STREAM:0");
  });

  test("handleStreamFunded is idempotent", () => {
    const event = makeEvent(STREAM_FUNDED_TOPIC, FUNDED_DATA);
    expect(handleStreamFunded(event)).toEqual(handleStreamFunded(event));
  });
});

// ── StreamWithdrawal ──────────────────────────────────────────────────────────

const WITHDRAWAL_DATA = {
  streamId: "s-2",
  recipient: "GXRECIPIENT000000000000000000000000000000000000000000000000",
  amount: "100000000",
};

describe("StreamWithdrawal handler (issue #35)", () => {
  test("parses a valid StreamWithdrawal event", () => {
    const event = makeEvent(STREAM_WITHDRAWAL_TOPIC, WITHDRAWAL_DATA);
    expect(parseStreamWithdrawalPayload(event)).toEqual(WITHDRAWAL_DATA);
  });

  test("throws on wrong topic", () => {
    const event = makeEvent("BadTopic", WITHDRAWAL_DATA);
    expect(() => parseStreamWithdrawalPayload(event)).toThrow(
      "Expected StreamWithdrawal event topic, got BadTopic",
    );
  });

  test("throws when recipient is missing", () => {
    const { recipient: _, ...partial } = WITHDRAWAL_DATA;
    const event = makeEvent(STREAM_WITHDRAWAL_TOPIC, partial);
    expect(() => parseStreamWithdrawalPayload(event)).toThrow(
      '"recipient" must be a non-empty string',
    );
  });

  test("throws when amount is a number not a string", () => {
    const event = makeEvent(STREAM_WITHDRAWAL_TOPIC, { ...WITHDRAWAL_DATA, amount: 100 });
    expect(() => parseStreamWithdrawalPayload(event)).toThrow(
      '"amount" must be a non-empty string',
    );
  });

  test("maps payload + event to WithdrawalRecord", () => {
    const event = makeEvent(STREAM_WITHDRAWAL_TOPIC, WITHDRAWAL_DATA);
    const payload = parseStreamWithdrawalPayload(event);
    const record = mapStreamWithdrawalToRecord(payload, event);

    expect(record).toEqual({
      streamId: "s-2",
      recipient: WITHDRAWAL_DATA.recipient,
      amount: "100000000",
      contractId: "CONTRACT_STREAM",
      ledger: 5000,
      txHash: "TX_HASH_STREAM",
      eventIndex: 0,
    });
  });

  test("handleStreamWithdrawal returns withdrawal record and identity", () => {
    const event = makeEvent(STREAM_WITHDRAWAL_TOPIC, WITHDRAWAL_DATA);
    const { withdrawal, identity } = handleStreamWithdrawal(event);

    expect(withdrawal.streamId).toBe("s-2");
    expect(withdrawal.recipient).toBe(WITHDRAWAL_DATA.recipient);
    expect(identity).toBe("CONTRACT_STREAM:5000:TX_HASH_STREAM:0");
  });

  test("identity changes when eventIndex changes", () => {
    const e1 = makeEvent(STREAM_WITHDRAWAL_TOPIC, WITHDRAWAL_DATA, { eventIndex: 0 });
    const e2 = makeEvent(STREAM_WITHDRAWAL_TOPIC, WITHDRAWAL_DATA, { eventIndex: 1 });

    expect(handleStreamWithdrawal(e1).identity).not.toBe(handleStreamWithdrawal(e2).identity);
  });
});

// ── StreamCancelled ───────────────────────────────────────────────────────────

const CANCEL_DATA = {
  streamId: "s-3",
  cancelledBy: "GXSENDER0000000000000000000000000000000000000000000000000000",
  refundedAmount: "400000000",
};

describe("StreamCancelled handler (issue #35)", () => {
  test("parses a valid StreamCancelled event", () => {
    const event = makeEvent(STREAM_CANCEL_TOPIC, CANCEL_DATA);
    expect(parseStreamCancelPayload(event)).toEqual(CANCEL_DATA);
  });

  test("throws on wrong topic", () => {
    const event = makeEvent("StreamCreated", CANCEL_DATA);
    expect(() => parseStreamCancelPayload(event)).toThrow(
      "Expected StreamCancelled event topic, got StreamCreated",
    );
  });

  test("throws when cancelledBy is missing", () => {
    const { cancelledBy: _, ...partial } = CANCEL_DATA;
    const event = makeEvent(STREAM_CANCEL_TOPIC, partial);
    expect(() => parseStreamCancelPayload(event)).toThrow(
      '"cancelledBy" must be a non-empty string',
    );
  });

  test("throws when refundedAmount is missing", () => {
    const { refundedAmount: _, ...partial } = CANCEL_DATA;
    const event = makeEvent(STREAM_CANCEL_TOPIC, partial);
    expect(() => parseStreamCancelPayload(event)).toThrow(
      '"refundedAmount" must be a non-empty string',
    );
  });

  test("maps payload + event to CancelRecord", () => {
    const event = makeEvent(STREAM_CANCEL_TOPIC, CANCEL_DATA);
    const payload = parseStreamCancelPayload(event);
    const record = mapStreamCancelToRecord(payload, event);

    expect(record).toEqual({
      streamId: "s-3",
      cancelledBy: CANCEL_DATA.cancelledBy,
      refundedAmount: "400000000",
      contractId: "CONTRACT_STREAM",
      ledger: 5000,
      txHash: "TX_HASH_STREAM",
      eventIndex: 0,
    });
  });

  test("handleStreamCancel returns cancel record and identity", () => {
    const event = makeEvent(STREAM_CANCEL_TOPIC, CANCEL_DATA);
    const { cancel, identity } = handleStreamCancel(event);

    expect(cancel.streamId).toBe("s-3");
    expect(cancel.cancelledBy).toBe(CANCEL_DATA.cancelledBy);
    expect(cancel.refundedAmount).toBe("400000000");
    expect(identity).toBe("CONTRACT_STREAM:5000:TX_HASH_STREAM:0");
  });

  test("handleStreamCancel is idempotent", () => {
    const event = makeEvent(STREAM_CANCEL_TOPIC, CANCEL_DATA);
    expect(handleStreamCancel(event)).toEqual(handleStreamCancel(event));
  });
});
