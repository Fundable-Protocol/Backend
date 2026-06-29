import { describe, expect, test } from "vitest";

import { ConfigValidationError, loadConfig } from "./env.js";

const validEnv = {
  INDEXER_DATABASE_URL: "postgres://postgres:postgres@localhost:5432/fundable_indexer",
  INDEXER_PORT: "4000",
  POLL_INTERVAL_MS: "5000",
  START_LEDGER: "1000",
  INDEXER_LOG_LEVEL: "debug",
} satisfies NodeJS.ProcessEnv;

describe("loadConfig", () => {
  test("returns typed values for a valid environment", () => {
    const config = loadConfig({
      ...validEnv,
      STREAMS_CONTRACT_IDS: "C123,C456",
      DISTRIBUTIONS_CONTRACT_IDS: "C789",
    });

    expect(config).toEqual({
      databaseUrl: "postgres://postgres:postgres@localhost:5432/fundable_indexer",
      port: 4000,
      pollIntervalMs: 5000,
      startLedger: 1000,
      logLevel: "debug",
      streamsContractIds: ["C123", "C456"],
      distributionsContractIds: ["C789"],
    });
  });

  test("defaults the log level and treats blank START_LEDGER as unset, defaulting contract IDs to empty arrays", () => {
    const config = loadConfig({
      INDEXER_DATABASE_URL: validEnv.INDEXER_DATABASE_URL,
      INDEXER_PORT: "4000",
      POLL_INTERVAL_MS: "5000",
      START_LEDGER: "",
    });

    expect(config.logLevel).toBe("info");
    expect(config.startLedger).toBeUndefined();
    expect("startLedger" in config).toBe(false);
    expect(config.streamsContractIds).toEqual([]);
    expect(config.distributionsContractIds).toEqual([]);
  });

  test("fails with a clear error when a required value is missing", () => {
    const { INDEXER_DATABASE_URL: _omitted, ...withoutUrl } = validEnv;

    expect(() => loadConfig(withoutUrl)).toThrow(ConfigValidationError);
    expect(() => loadConfig(withoutUrl)).toThrow(/INDEXER_DATABASE_URL is required/);
  });

  test("fails with a clear error for a non-numeric port", () => {
    expect(() => loadConfig({ ...validEnv, INDEXER_PORT: "not-a-number" })).toThrow(
      /INDEXER_PORT must be a positive integer/,
    );
  });

  test("fails with a clear error for an invalid database URL", () => {
    expect(() => loadConfig({ ...validEnv, INDEXER_DATABASE_URL: "not-a-url" })).toThrow(
      /INDEXER_DATABASE_URL must be a valid connection URL/,
    );
  });

  test("aggregates multiple problems into one error", () => {
    try {
      loadConfig({ INDEXER_PORT: "abc", POLL_INTERVAL_MS: "xyz" });
      throw new Error("expected loadConfig to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigValidationError);
      const issues = (error as ConfigValidationError).issues;
      expect(issues).toContain("INDEXER_DATABASE_URL is required");
      expect(issues).toContain("INDEXER_PORT must be a positive integer");
      expect(issues).toContain("POLL_INTERVAL_MS must be a positive integer");
    }
  });
});
