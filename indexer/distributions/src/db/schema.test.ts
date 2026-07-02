import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getMetadataArgsStorage } from "typeorm";
import { describe, expect, test } from "vitest";

import { ClaimAction } from "./entity/ClaimAction.js";
import { DistributionBatch } from "./entity/DistributionBatch.js";
import { DISTRIBUTION_BATCH_STATUSES, isDistributionBatchStatus } from "./status.js";

const migrationsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../common/src/db/migrations",
);
const migrationSql = readFileSync(
  join(migrationsDir, "0002_create_distributions_schema.sql"),
  "utf8",
);

describe("distribution batch status", () => {
  test("includes pause/resume lifecycle values", () => {
    expect(DISTRIBUTION_BATCH_STATUSES).toContain("active");
    expect(DISTRIBUTION_BATCH_STATUSES).toContain("paused");
    expect(DISTRIBUTION_BATCH_STATUSES).toContain("completed");
    expect(DISTRIBUTION_BATCH_STATUSES).toContain("cancelled");
  });

  test("validates known status values", () => {
    expect(isDistributionBatchStatus("paused")).toBe(true);
    expect(isDistributionBatchStatus("unknown")).toBe(false);
  });
});

describe("DistributionBatch entity", () => {
  test("maps to distribution_batch table", () => {
    const table = getMetadataArgsStorage().tables.find(
      (entry) => entry.target === DistributionBatch,
    );
    expect(table?.name).toBe("distribution_batch");
  });

  test("stores token amounts as numeric columns", () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (entry) => entry.target === DistributionBatch,
    );
    const totalAmount = columns.find((entry) => entry.propertyName === "totalAmount");
    const claimedAmount = columns.find((entry) => entry.propertyName === "claimedAmount");

    expect(totalAmount?.options.type).toBe("numeric");
    expect(totalAmount?.options.precision).toBe(78);
    expect(totalAmount?.options.scale).toBe(0);
    expect(claimedAmount?.options.type).toBe("numeric");
  });

  test("tracks pause and resume timestamps", () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (entry) => entry.target === DistributionBatch,
    );
    const pausedAt = columns.find((entry) => entry.propertyName === "pausedAt");
    const resumedAt = columns.find((entry) => entry.propertyName === "resumedAt");
    const status = columns.find((entry) => entry.propertyName === "status");

    expect(pausedAt?.options.nullable).toBe(true);
    expect(resumedAt?.options.nullable).toBe(true);
    expect(status?.options.default).toBe("active");
  });
});

describe("ClaimAction entity", () => {
  test("maps to claim_action table", () => {
    const table = getMetadataArgsStorage().tables.find((entry) => entry.target === ClaimAction);
    expect(table?.name).toBe("claim_action");
  });

  test("stores claim amount as numeric column", () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (entry) => entry.target === ClaimAction,
    );
    const amount = columns.find((entry) => entry.propertyName === "amount");

    expect(amount?.options.type).toBe("numeric");
    expect(amount?.options.precision).toBe(78);
    expect(amount?.options.scale).toBe(0);
  });

  test("relates to DistributionBatch via batchId", () => {
    const relations = getMetadataArgsStorage().relations.filter(
      (entry) => entry.target === ClaimAction,
    );
    const batchRelation = relations.find((entry) => entry.propertyName === "batch");

    expect(batchRelation?.relationType).toBeDefined();
    expect(batchRelation?.propertyName).toBe("batch");
    expect(batchRelation?.inverseSideProperty).toBeDefined();
  });
});

describe("0002_create_distributions_schema migration", () => {
  test("creates distribution_batch and claim_action tables", () => {
    expect(migrationSql).toContain("CREATE TABLE distribution_batch");
    expect(migrationSql).toContain("CREATE TABLE claim_action");
  });

  test("uses integer-safe amount columns", () => {
    expect(migrationSql).toContain("NUMERIC(78, 0)");
    expect(migrationSql).not.toMatch(/double precision|real|float/i);
  });

  test("adds pause/resume status constraint and indexes", () => {
    expect(migrationSql).toContain("'paused'");
    expect(migrationSql).toContain("paused_at");
    expect(migrationSql).toContain("resumed_at");
    expect(migrationSql).toContain("distribution_batch_status_idx");
    expect(migrationSql).toContain("claim_action_batch_id_idx");
  });
});
