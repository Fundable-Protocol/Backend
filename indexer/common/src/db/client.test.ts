import type { Sql } from "postgres";
import { describe, expect, test, vi } from "vitest";

import { createDbClient } from "./client.js";

/** Minimal postgres.js stand-in sufficient for Drizzle construction + close. */
function mockSql(): Sql {
  const sql = vi.fn(() => Promise.resolve([]));
  Object.assign(sql, {
    end: vi.fn(() => Promise.resolve()),
    options: { parsers: {}, serializers: {} },
  });
  return sql as unknown as Sql;
}

describe("createDbClient", () => {
  test("builds a client from the configured database URL", () => {
    const sql = mockSql();
    const createSql = vi.fn(() => sql);

    const client = createDbClient({ databaseUrl: "postgres://localhost:5432/test" }, { createSql });

    expect(createSql).toHaveBeenCalledWith("postgres://localhost:5432/test");
    expect(client.sql).toBe(sql);
    expect(client.db).toBeDefined();
  });

  test("close() ends the underlying connection pool", async () => {
    const sql = mockSql();

    const client = createDbClient(
      { databaseUrl: "postgres://localhost:5432/test" },
      { createSql: () => sql },
    );
    await client.close();

    expect((sql as unknown as { end: ReturnType<typeof vi.fn> }).end).toHaveBeenCalledTimes(1);
  });
});
