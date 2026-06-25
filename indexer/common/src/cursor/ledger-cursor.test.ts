import { describe, expect, it } from "vitest";

import { type LedgerCursor, type SqlClient, findCursor, upsertCursor } from "./ledger-cursor.js";

// ---------------------------------------------------------------------------
// In-memory SQL mock
// ---------------------------------------------------------------------------

/**
 * Creates a lightweight in-memory store that mimics the ledger_cursor table
 * and returns a mock SqlClient backed by it.
 */
function makeStore(): {
  sql: SqlClient;
  rows: Map<string, LedgerCursor>;
} {
  let nextId = 1n;
  const rows = new Map<string, LedgerCursor>();

  const storeKey = (source: string, domain: string) => `${source}|${domain}`;

  const sql: SqlClient = (template: TemplateStringsArray, ...values: unknown[]) => {
    // Reconstruct a rough SQL string so we can branch on the operation type.
    const query = template.reduce(
      (acc, part, i) => acc + part + (values[i] !== undefined ? String(values[i]) : ""),
      "",
    );

    const normalised = query.replace(/\s+/g, " ").trim().toUpperCase();

    // ---- SELECT (findCursor) ----
    if (normalised.startsWith("SELECT")) {
      // Extract the two positional values: source and domain.
      const [source, domain] = values as [string, string];
      const row = rows.get(storeKey(source, domain));
      return Promise.resolve(row ? [row] : []) as Promise<LedgerCursor[]>;
    }

    // ---- INSERT … ON CONFLICT … RETURNING (upsertCursor) ----
    if (normalised.startsWith("INSERT")) {
      const [source, domain, lastLedgerSeq] = values as [string, string, bigint];
      const key = storeKey(source, domain);
      const existing = rows.get(key);
      const now = new Date();

      if (!existing) {
        const newRow: LedgerCursor = {
          id: nextId++,
          source,
          domain,
          last_ledger_seq: lastLedgerSeq,
          created_at: now,
          updated_at: now,
        };
        rows.set(key, newRow);
        return Promise.resolve([newRow]) as Promise<LedgerCursor[]>;
      }

      // Simulate the WHERE clause: only advance if the new seq is greater.
      const existingSeq = existing.last_ledger_seq;
      if (existingSeq === null || existingSeq < lastLedgerSeq) {
        const updated: LedgerCursor = {
          ...existing,
          last_ledger_seq: lastLedgerSeq,
          updated_at: now,
        };
        rows.set(key, updated);
        return Promise.resolve([updated]) as Promise<LedgerCursor[]>;
      }

      // Update suppressed by WHERE — return empty to trigger the fallback path.
      return Promise.resolve([]) as Promise<LedgerCursor[]>;
    }

    return Promise.resolve([]) as Promise<LedgerCursor[]>;
  };

  return { sql, rows };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("findCursor", () => {
  it("returns null when no cursor exists for the given source/domain", async () => {
    const { sql } = makeStore();
    const result = await findCursor(sql, "testnet", "streams");
    expect(result).toBeNull();
  });

  it("returns the cursor row after it has been created", async () => {
    const { sql } = makeStore();
    await upsertCursor(sql, "testnet", "streams", 100n);

    const cursor = await findCursor(sql, "testnet", "streams");
    expect(cursor).not.toBeNull();
    expect(cursor?.source).toBe("testnet");
    expect(cursor?.domain).toBe("streams");
    expect(cursor?.last_ledger_seq).toBe(100n);
  });

  it("returns null for an unrelated domain on the same source", async () => {
    const { sql } = makeStore();
    await upsertCursor(sql, "testnet", "streams", 50n);

    const result = await findCursor(sql, "testnet", "distributions");
    expect(result).toBeNull();
  });

  it("throws when source is empty", async () => {
    const { sql } = makeStore();
    await expect(findCursor(sql, "", "streams")).rejects.toThrow("source must not be empty");
  });

  it("throws when domain is empty", async () => {
    const { sql } = makeStore();
    await expect(findCursor(sql, "testnet", "")).rejects.toThrow("domain must not be empty");
  });
});

describe("upsertCursor", () => {
  it("inserts a new row when none exists", async () => {
    const { sql, rows } = makeStore();
    const cursor = await upsertCursor(sql, "testnet", "streams", 42n);

    expect(cursor.source).toBe("testnet");
    expect(cursor.domain).toBe("streams");
    expect(cursor.last_ledger_seq).toBe(42n);
    expect(rows.size).toBe(1);
  });

  it("advances the cursor when the new ledger seq is greater", async () => {
    const { sql } = makeStore();
    await upsertCursor(sql, "testnet", "streams", 100n);
    const cursor = await upsertCursor(sql, "testnet", "streams", 200n);

    expect(cursor.last_ledger_seq).toBe(200n);
  });

  it("does not roll back the cursor when a stale (lower) seq is given", async () => {
    const { sql } = makeStore();
    await upsertCursor(sql, "testnet", "streams", 200n);
    const cursor = await upsertCursor(sql, "testnet", "streams", 100n);

    // The stored value must remain 200 (the higher seq).
    expect(cursor.last_ledger_seq).toBe(200n);
  });

  it("does not roll back the cursor when the same seq is given again (idempotent)", async () => {
    const { sql } = makeStore();
    await upsertCursor(sql, "testnet", "streams", 150n);
    const cursor = await upsertCursor(sql, "testnet", "streams", 150n);

    expect(cursor.last_ledger_seq).toBe(150n);
  });

  it("keeps separate cursors per domain on the same source", async () => {
    const { sql } = makeStore();
    await upsertCursor(sql, "testnet", "streams", 10n);
    await upsertCursor(sql, "testnet", "distributions", 20n);

    const streamsCursor = await findCursor(sql, "testnet", "streams");
    const distCursor = await findCursor(sql, "testnet", "distributions");

    expect(streamsCursor?.last_ledger_seq).toBe(10n);
    expect(distCursor?.last_ledger_seq).toBe(20n);
  });

  it("keeps separate cursors per source on the same domain", async () => {
    const { sql } = makeStore();
    await upsertCursor(sql, "testnet", "streams", 10n);
    await upsertCursor(sql, "mainnet", "streams", 99n);

    const testnetCursor = await findCursor(sql, "testnet", "streams");
    const mainnetCursor = await findCursor(sql, "mainnet", "streams");

    expect(testnetCursor?.last_ledger_seq).toBe(10n);
    expect(mainnetCursor?.last_ledger_seq).toBe(99n);
  });

  it("throws when source is empty", async () => {
    const { sql } = makeStore();
    await expect(upsertCursor(sql, "", "streams", 1n)).rejects.toThrow("source must not be empty");
  });

  it("throws when domain is empty", async () => {
    const { sql } = makeStore();
    await expect(upsertCursor(sql, "testnet", "", 1n)).rejects.toThrow("domain must not be empty");
  });

  it("throws when lastLedgerSeq is negative", async () => {
    const { sql } = makeStore();
    await expect(upsertCursor(sql, "testnet", "streams", -1n)).rejects.toThrow(
      "lastLedgerSeq must be >= 0",
    );
  });

  it("stores timestamps on the returned cursor", async () => {
    const { sql } = makeStore();
    const cursor = await upsertCursor(sql, "testnet", "streams", 1n);

    expect(cursor.created_at).toBeInstanceOf(Date);
    expect(cursor.updated_at).toBeInstanceOf(Date);
  });
});
