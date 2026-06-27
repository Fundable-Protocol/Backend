import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "../schema.graphql");

describe("distributions GraphQL schema", () => {
  const schemaContent = readFileSync(schemaPath, "utf-8");

  test("defines DistributionStatus enum", () => {
    expect(schemaContent).toContain("enum DistributionStatus {");
    expect(schemaContent).toContain("ACTIVE");
    expect(schemaContent).toContain("PAUSED");
    expect(schemaContent).toContain("COMPLETED");
    expect(schemaContent).toContain("CANCELLED");
  });

  test("defines DistributionBatch type aligned with database schema", () => {
    expect(schemaContent).toContain("type DistributionBatch {");
    expect(schemaContent).toContain("id: ID!");
    expect(schemaContent).toContain("contractId: String!");
    expect(schemaContent).toContain("distributor: String!");
    expect(schemaContent).toContain("token: String!");
    expect(schemaContent).toContain("totalAmount: String!");
    expect(schemaContent).toContain("claimedAmount: String!");
    expect(schemaContent).toContain("recipientCount: Int!");
    expect(schemaContent).toContain("status: DistributionStatus!");
    expect(schemaContent).toContain("pausedAt: String");
    expect(schemaContent).toContain("resumedAt: String");
    expect(schemaContent).toContain("uniqueRef: String!");
    expect(schemaContent).toContain("ledgerNumber: Int!");
    expect(schemaContent).toContain("txHash: String!");
    expect(schemaContent).toContain("claims: [ClaimAction!]!");
  });

  test("defines ClaimAction type aligned with database schema", () => {
    expect(schemaContent).toContain("type ClaimAction {");
    expect(schemaContent).toContain("id: ID!");
    expect(schemaContent).toContain("batchId: ID!");
    expect(schemaContent).toContain("claimant: String!");
    expect(schemaContent).toContain("amount: String!");
    expect(schemaContent).toContain("txHash: String!");
    expect(schemaContent).toContain("ledgerNumber: Int!");
    expect(schemaContent).toContain("eventTimestamp: String!");
  });

  test("defines filter and pagination inputs", () => {
    expect(schemaContent).toContain("input DistributionFilterInput {");
    expect(schemaContent).toContain("input ClaimFilterInput {");
    expect(schemaContent).toContain("input PaginationInput {");
  });

  test("defines connection and page info types", () => {
    expect(schemaContent).toContain("type DistributionConnection {");
    expect(schemaContent).toContain("type ClaimConnection {");
    expect(schemaContent).toContain("type PageInfo {");
  });

  test("defines root Query queries", () => {
    const normalized = schemaContent.replace(/\s+/g, " ");
    expect(normalized).toContain("type Query {");
    expect(normalized).toContain("distributionBatch(id: ID!): DistributionBatch");
    expect(normalized).toContain(
      "distributionBatches( filter: DistributionFilterInput pagination: PaginationInput ): DistributionConnection!",
    );
    expect(normalized).toContain(
      "distributionBatchesByDistributor( distributor: String! pagination: PaginationInput ): DistributionConnection!",
    );
    expect(normalized).toContain("claimAction(id: ID!): ClaimAction");
    expect(normalized).toContain(
      "claims(filter: ClaimFilterInput, pagination: PaginationInput): ClaimConnection!",
    );
    expect(normalized).toContain(
      "claimsByClaimant(claimant: String!, pagination: PaginationInput): ClaimConnection!",
    );
    expect(normalized).toContain(
      "claimsByBatch(batchId: ID!, pagination: PaginationInput): ClaimConnection!",
    );
  });
});
