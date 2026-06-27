import type { DistributionEvent } from "./types.js";

export function getEventIdentity(event: DistributionEvent): string {
  return `${event.contractId}:${event.ledger}:${event.txHash}:${event.eventIndex}`;
}

export function parseEventData(event: DistributionEvent): Record<string, unknown> {
  try {
    return JSON.parse(event.data) as Record<string, unknown>;
  } catch {
    throw new Error("Failed to parse event data: invalid JSON");
  }
}

export function requireStringField(
  parsed: Record<string, unknown>,
  field: string,
): string {
  const value = parsed[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `Invalid payload: "${field}" must be a non-empty string, got ${
        typeof value === "string" ? "empty string" : typeof value
      }`,
    );
  }
  return value;
}

export function requireIntField(
  parsed: Record<string, unknown>,
  field: string,
): number {
  const value = parsed[field];
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error(
      `Invalid payload: "${field}" must be an integer, got ${typeof value}`,
    );
  }
  return value;
}

export function requireTopic(event: DistributionEvent, expected: string): void {
  const actual = event.topics[0];
  if (!actual || actual !== expected) {
    throw new Error(
      `Expected ${expected} event topic, got ${actual ?? "undefined"}`,
    );
  }
}
