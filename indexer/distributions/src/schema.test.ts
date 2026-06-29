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

  const definitionBody = (kind: "type" | "input" | "enum", name: string) => {
    const match = schemaContent.match(new RegExp(`${kind}\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`));
    expect(match).not.toBeNull();
    return match?.[1] ?? "";
  };

  test("defines DistributionBatch type aligned with database schema", () => {
    const body = definitionBody("type", "DistributionBatch");
    expect(body).toContain("id: ID!");
    expect(body).toContain("contractId: String!");
    expect(body).toContain("distributor: String!");
    expect(body).toContain("token: String!");
    expect(body).toContain("totalAmount: String!");
    expect(body).toContain("claimedAmount: String!");
    expect(body).toContain("recipientCount: Int!");
    expect(body).toContain("status: DistributionStatus!");
    expect(body).toContain("pausedAt: String");
    expect(body).toContain("resumedAt: String");
    expect(body).toContain("uniqueRef: String!");
    expect(body).toContain("ledgerNumber: Int!");
    expect(body).toContain("txHash: String!");
    expect(body).toContain("claims(pagination: PaginationInput): ClaimConnection!");
    expect(body).toContain("createdAt: String!");
    expect(body).toContain("updatedAt: String!");
  });

  test("defines ClaimAction type aligned with database schema", () => {
    const body = definitionBody("type", "ClaimAction");
    expect(body).toContain("id: ID!");
    expect(body).toContain("batchId: ID!");
    expect(body).toContain("claimant: String!");
    expect(body).toContain("amount: String!");
    expect(body).toContain("txHash: String!");
    expect(body).toContain("ledgerNumber: Int!");
    expect(body).toContain("eventTimestamp: String!");
    expect(body).toContain("createdAt: String!");
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
