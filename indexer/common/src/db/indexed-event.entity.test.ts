import { describe, expect, test, beforeEach } from "vitest";
import { IndexedEventEntity } from "./indexed-event.entity.js";

describe("IndexedEventEntity", () => {
  let entity: IndexedEventEntity;

  beforeEach(() => {
    entity = new IndexedEventEntity();
    entity.contractId = "CAFEBABE";
    entity.ledgerNumber = BigInt(123456);
    entity.transactionHash = "0x1234567890abcdef";
    entity.eventIndex = 0;
    entity.eventData = { type: "TestEvent", amount: "100" };
    entity.eventTopics = ["topic1", "topic2"];
    entity.processedBy = "streams";
  });

  test("generates ULID when id is not provided", () => {
    entity.generateId();
    expect(entity.id).toBeDefined();
    expect(entity.id.length).toBe(26); // ULID length
    expect(entity.id).toMatch(/^[0-9A-Z]{26}$/);
  });

  test("preserves existing id", () => {
    const existingId = "01J0XYZABCDEFGHIJKLMNOPQR";
    entity.id = existingId;
    entity.generateId();
    expect(entity.id).toBe(existingId);
  });

  test("has required fields for deterministic identity", () => {
    expect(entity.contractId).toBe("CAFEBABE");
    expect(entity.ledgerNumber).toBe(BigInt(123456));
    expect(entity.transactionHash).toBe("0x1234567890abcdef");
    expect(entity.eventIndex).toBe(0);
  });

  test("has JSON data fields", () => {
    expect(entity.eventData).toEqual({ type: "TestEvent", amount: "100" });
    expect(entity.eventTopics).toEqual(["topic1", "topic2"]);
  });

  test("has metadata fields", () => {
    expect(entity.processedBy).toBe("streams");
    expect(entity.createdAt).toBeUndefined(); // Will be set by DB
  });
});