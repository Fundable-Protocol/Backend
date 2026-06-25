import { describe, expect, test, beforeEach, vi } from "vitest";
import { DataSource, Repository } from "typeorm";
import { IndexedEventEntity } from "./indexed-event.entity.js";
import { IndexedEventRepository } from "./indexed-event.repository.js";

// Mock data
const mockEventData = {
  contractId: "CAFEBABE",
  ledgerNumber: BigInt(123456),
  transactionHash: "0x1234567890abcdef",
  eventIndex: 0,
  eventData: { type: "TestEvent", amount: "100" },
  eventTopics: ["topic1", "topic2"],
  processedBy: "streams",
};

describe("IndexedEventRepository", () => {
  let mockDataSource: DataSource;
  let mockRepo: Repository<IndexedEventEntity>;
  let repository: IndexedEventRepository;

  beforeEach(() => {
    mockRepo = {
      create: vi.fn(),
      save: vi.fn(),
      findOne: vi.fn(),
      count: vi.fn(),
      createQueryBuilder: vi.fn(),
    } as unknown as Repository<IndexedEventEntity>;

    mockDataSource = {
      getRepository: vi.fn(() => mockRepo),
    } as unknown as DataSource;

    repository = new IndexedEventRepository(mockDataSource);
  });

  describe("insertSafely", () => {
    test("inserts new event successfully", async () => {
      const mockEntity = new IndexedEventEntity();
      Object.assign(mockEntity, { id: "test-id", ...mockEventData });

      vi.mocked(mockRepo.create).mockReturnValue(mockEntity);
      vi.mocked(mockRepo.save).mockResolvedValue(mockEntity);

      const result = await repository.insertSafely(mockEventData);

      expect(mockRepo.create).toHaveBeenCalledWith(mockEventData);
      expect(mockRepo.save).toHaveBeenCalledWith(mockEntity);
      expect(result).toBe(mockEntity);
    });

    test("handles duplicate event by returning existing", async () => {
      const mockEntity = new IndexedEventEntity();
      Object.assign(mockEntity, { id: "existing-id", ...mockEventData });

      const duplicateError = new Error("Duplicate key");
      (duplicateError as any).code = "23505"; // PostgreSQL unique violation

      vi.mocked(mockRepo.create).mockReturnValue(mockEntity);
      vi.mocked(mockRepo.save).mockRejectedValue(duplicateError);
      vi.mocked(mockRepo.findOne).mockResolvedValue(mockEntity);

      const result = await repository.insertSafely(mockEventData);

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: {
          contractId: mockEventData.contractId,
          ledgerNumber: mockEventData.ledgerNumber,
          transactionHash: mockEventData.transactionHash,
          eventIndex: mockEventData.eventIndex,
        },
      });
      expect(result).toBe(mockEntity);
    });

    test("re-throws non-duplicate errors", async () => {
      const mockEntity = new IndexedEventEntity();
      Object.assign(mockEntity, mockEventData);

      const otherError = new Error("Database connection failed");

      vi.mocked(mockRepo.create).mockReturnValue(mockEntity);
      vi.mocked(mockRepo.save).mockRejectedValue(otherError);

      await expect(repository.insertSafely(mockEventData)).rejects.toThrow(
        "Database connection failed",
      );
    });
  });

  describe("isProcessed", () => {
    test("returns true when event exists", async () => {
      vi.mocked(mockRepo.count).mockResolvedValue(1);

      const result = await repository.isProcessed(
        "CAFEBABE",
        BigInt(123456),
        "0x1234567890abcdef",
        0,
      );

      expect(mockRepo.count).toHaveBeenCalledWith({
        where: {
          contractId: "CAFEBABE",
          ledgerNumber: BigInt(123456),
          transactionHash: "0x1234567890abcdef",
          eventIndex: 0,
        },
      });
      expect(result).toBe(true);
    });

    test("returns false when event does not exist", async () => {
      vi.mocked(mockRepo.count).mockResolvedValue(0);

      const result = await repository.isProcessed(
        "CAFEBABE",
        BigInt(123456),
        "0x1234567890abcdef",
        0,
      );

      expect(result).toBe(false);
    });
  });

  describe("getLatestLedger", () => {
    test("returns latest ledger number for domain", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({ maxLedger: "123456" }),
      };

      vi.mocked(mockRepo.createQueryBuilder).mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await repository.getLatestLedger("streams");

      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith("event");
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        "MAX(event.ledgerNumber)",
        "maxLedger",
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "event.processedBy = :domain",
        { domain: "streams" },
      );
      expect(result).toBe(BigInt(123456));
    });

    test("returns null when no events exist", async () => {
      const mockQueryBuilder = {
        select: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({}),
      };

      vi.mocked(mockRepo.createQueryBuilder).mockReturnValue(
        mockQueryBuilder as any,
      );

      const result = await repository.getLatestLedger();

      expect(result).toBeNull();
    });
  });
});