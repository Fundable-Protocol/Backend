import type { DataSource } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DistributionRepository } from "./repository.js";

// biome-ignore lint/suspicious/noExplicitAny: chainable query-builder mock
function makeQueryBuilder(executeResult: any) {
  // biome-ignore lint/suspicious/noExplicitAny: chainable query-builder mock
  const qb: any = {
    insert: vi.fn(() => qb),
    into: vi.fn(() => qb),
    values: vi.fn(() => qb),
    orIgnore: vi.fn(() => qb),
    update: vi.fn(() => qb),
    set: vi.fn(() => qb),
    where: vi.fn(() => qb),
    setParameter: vi.fn(() => qb),
    execute: vi.fn(async () => executeResult),
  };
  return qb;
}

describe("DistributionRepository", () => {
  // biome-ignore lint/suspicious/noExplicitAny: mock objects
  let mockDataSource: any;
  // biome-ignore lint/suspicious/noExplicitAny: mock objects
  let mockBatchRepo: any;
  // biome-ignore lint/suspicious/noExplicitAny: mock objects
  let createQb: any;

  beforeEach(() => {
    createQb = makeQueryBuilder({ identifiers: [] });
    mockBatchRepo = {
      createQueryBuilder: vi.fn(() => createQb),
      update: vi.fn(async () => ({ affected: 1 })),
    };
    mockDataSource = {
      getRepository: vi.fn(() => mockBatchRepo),
      transaction: vi.fn(),
    };
  });

  it("inserts a batch ignoring conflicts", async () => {
    const repo = new DistributionRepository(mockDataSource as unknown as DataSource);
    await repo.createBatch({
      distributionId: "dist-1",
      contractId: "CDIST",
      distributor: "GCREATOR",
      token: "USDC",
      totalAmount: "1000",
      recipientCount: 10,
      ledgerNumber: 42,
      txHash: "txabc",
    });

    expect(createQb.orIgnore).toHaveBeenCalled();
    expect(createQb.values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "dist-1",
        uniqueRef: "dist-1",
        claimedAmount: "0",
        recipientCount: 10,
      }),
    );
    expect(createQb.execute).toHaveBeenCalled();
  });

  it("records a claim and increments the batch when a row is inserted", async () => {
    const insertQb = makeQueryBuilder({ identifiers: [{ id: "claim-uuid" }] });
    const updateQb = makeQueryBuilder({ affected: 1 });
    const manager = {
      createQueryBuilder: vi.fn().mockReturnValueOnce(insertQb).mockReturnValueOnce(updateQb),
    };
    mockDataSource.transaction = vi.fn(async (cb: (m: unknown) => Promise<void>) => cb(manager));

    const repo = new DistributionRepository(mockDataSource as unknown as DataSource);
    await repo.recordClaim({
      distributionId: "dist-1",
      claimant: "GCLAIMANT",
      amount: "500",
      txHash: "txclaim",
      ledgerNumber: 42,
      eventIndex: 3,
      eventTimestamp: "2024-06-15T00:00:00Z",
    });

    expect(insertQb.orIgnore).toHaveBeenCalled();
    expect(updateQb.update).toHaveBeenCalled();
    expect(updateQb.setParameter).toHaveBeenCalledWith("claimAmount", "500");
    expect(updateQb.execute).toHaveBeenCalled();
  });

  it("does not increment the batch when the claim was a duplicate", async () => {
    const insertQb = makeQueryBuilder({ identifiers: [] });
    const updateQb = makeQueryBuilder({ affected: 1 });
    const manager = {
      createQueryBuilder: vi.fn().mockReturnValueOnce(insertQb).mockReturnValueOnce(updateQb),
    };
    mockDataSource.transaction = vi.fn(async (cb: (m: unknown) => Promise<void>) => cb(manager));

    const repo = new DistributionRepository(mockDataSource as unknown as DataSource);
    await repo.recordClaim({
      distributionId: "dist-1",
      claimant: "GCLAIMANT",
      amount: "500",
      txHash: "txclaim",
      ledgerNumber: 42,
      eventIndex: 3,
      eventTimestamp: "2024-06-15T00:00:00Z",
    });

    expect(insertQb.execute).toHaveBeenCalled();
    expect(updateQb.update).not.toHaveBeenCalled();
  });

  it("applies a paused status with pausedAt", async () => {
    const repo = new DistributionRepository(mockDataSource as unknown as DataSource);
    await repo.setStatus({
      distributionId: "dist-1",
      // biome-ignore lint/suspicious/noExplicitAny: enum imported indirectly
      status: "PAUSED" as any,
      changedAt: "2024-06-15T00:00:00Z",
    });

    expect(mockBatchRepo.update).toHaveBeenCalledWith(
      { id: "dist-1" },
      { status: "PAUSED", pausedAt: "2024-06-15T00:00:00Z" },
    );
  });

  it("applies a resumed status with resumedAt", async () => {
    const repo = new DistributionRepository(mockDataSource as unknown as DataSource);
    await repo.setStatus({
      distributionId: "dist-1",
      // biome-ignore lint/suspicious/noExplicitAny: enum imported indirectly
      status: "ACTIVE" as any,
      changedAt: "2024-06-15T01:00:00Z",
    });

    expect(mockBatchRepo.update).toHaveBeenCalledWith(
      { id: "dist-1" },
      { status: "ACTIVE", resumedAt: "2024-06-15T01:00:00Z" },
    );
  });
});
