import type { Sql } from "postgres";
import { describe, expect, test, vi } from "vitest";

import { checkDbHealth } from "./health.js";

/** Build a minimal tagged-template stand-in for the postgres.js `sql` client. */
function mockSql(behavior: () => Promise<unknown>): Sql {
  return vi.fn(behavior) as unknown as Sql;
}

describe("checkDbHealth", () => {
  test("reports healthy when the probe query succeeds", async () => {
    const sql = mockSql(() => Promise.resolve([{ "?column?": 1 }]));

    const result = await checkDbHealth(sql);

    expect(result.healthy).toBe(true);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(sql).toHaveBeenCalledTimes(1);
  });

  test("reports unhealthy with the error message when the probe fails", async () => {
    const sql = mockSql(() => Promise.reject(new Error("connection refused")));

    const result = await checkDbHealth(sql);

    expect(result.healthy).toBe(false);
    if (!result.healthy) {
      expect(result.error).toBe("connection refused");
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    }
  });

  test("stringifies non-Error rejections", async () => {
    const sql = mockSql(() => Promise.reject("boom"));

    const result = await checkDbHealth(sql);

    expect(result.healthy).toBe(false);
    if (!result.healthy) {
      expect(result.error).toBe("boom");
    }
  });
});
