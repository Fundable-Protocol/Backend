import { type DataSource, InsertQueryBuilder, Repository } from "typeorm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IndexedEvent } from "./entity/IndexedEvent.js";
import { EventRepository } from "./repository.js";

describe("EventRepository", () => {
  // biome-ignore lint/suspicious/noExplicitAny: mock objects
  let mockDataSource: any;
  // biome-ignore lint/suspicious/noExplicitAny: mock objects
  let mockRepo: any;
  // biome-ignore lint/suspicious/noExplicitAny: mock objects
  let mockQueryBuilder: any;

  beforeEach(() => {
    mockQueryBuilder = {
      insert: vi.fn().mockReturnThis(),
      into: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      orIgnore: vi.fn().mockReturnThis(),
      execute: vi.fn(),
    };

    mockRepo = {
      count: vi.fn(),
      createQueryBuilder: vi.fn(() => mockQueryBuilder),
    };

    mockDataSource = {
      getRepository: vi.fn(() => mockRepo),
    };
  });

  it("should return true if event is processed", async () => {
    mockRepo.count.mockResolvedValue(1);
    const repo = new EventRepository(mockDataSource as unknown as DataSource);
    const isProcessed = await repo.isEventProcessed("contract1", 100, "txHash1", 0);

    expect(isProcessed).toBe(true);
    expect(mockRepo.count).toHaveBeenCalledWith({
      where: {
        contractId: "contract1",
        ledgerNumber: 100,
        txHash: "txHash1",
        eventIndex: 0,
      },
    });
  });

  it("should record event successfully", async () => {
    const repo = new EventRepository(mockDataSource as unknown as DataSource);
    mockQueryBuilder.execute.mockResolvedValue({});

    const result = await repo.recordEventProcessed("contract1", 100, "txHash1", 0);

    expect(result).toBe(true);
    expect(mockQueryBuilder.values).toHaveBeenCalledWith({
      contractId: "contract1",
      ledgerNumber: 100,
      txHash: "txHash1",
      eventIndex: 0,
    });
    expect(mockQueryBuilder.orIgnore).toHaveBeenCalledWith("uq_indexed_event_identity");
  });

  it("should catch unique constraint errors and return false", async () => {
    const repo = new EventRepository(mockDataSource as unknown as DataSource);
    mockQueryBuilder.execute.mockRejectedValue(new Error("unique constraint violation"));

    const result = await repo.recordEventProcessed("contract1", 100, "txHash1", 0);
    expect(result).toBe(false);
  });
});
