import { DataSource } from "typeorm";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { loadIndexerConfig } from "../config/index.js";
import { HandlerRegistry } from "../handlers/registry.js";
import { createSorobanClient } from "../rpc/client.js";
import { runIndexer } from "./runner.js";

vi.mock("typeorm", async (importOriginal) => {
  // biome-ignore lint/suspicious/noExplicitAny: mock
  const actual = (await importOriginal()) as any;
  const mockDataSource = {
    initialize: vi.fn(),
    destroy: vi.fn(),
    getRepository: vi.fn().mockReturnValue({
      count: vi.fn(),
      createQueryBuilder: vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        into: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        orIgnore: vi.fn().mockReturnThis(),
        execute: vi.fn(),
      })),
    }),
  };
  return {
    ...actual,
    DataSource: vi.fn(() => mockDataSource),
  };
});

vi.mock("../config/index.js", () => ({
  loadIndexerConfig: vi.fn(),
}));

vi.mock("../rpc/client.js", () => {
  const mockClient = {
    getLatestLedger: vi.fn(),
    getEvents: vi.fn(),
  };
  return {
    createSorobanClient: vi.fn(() => mockClient),
  };
});

describe("runIndexer", () => {
  // biome-ignore lint/suspicious/noExplicitAny: mock
  let mockExit: any;
  // biome-ignore lint/suspicious/noExplicitAny: mock
  let mockRegistry: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // biome-ignore lint/suspicious/noExplicitAny: mock
    mockExit = vi.spyOn(process, "exit").mockImplementation((() => {}) as any);
    mockRegistry = new HandlerRegistry();
  });

  test("should fail fast if config validation fails", async () => {
    vi.mocked(loadIndexerConfig).mockImplementation(() => {
      throw new Error("Invalid configuration");
    });

    await runIndexer({
      name: "test-indexer",
      contractIds: [],
      registry: mockRegistry,
    });

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test("should fail fast if database connection fails", async () => {
    vi.mocked(loadIndexerConfig).mockReturnValue({
      databaseUrl: "postgres://fail",
      port: 4000,
      pollIntervalMs: 10,
      logLevel: "info",
      streamsContractIds: [],
      distributionsContractIds: [],
    });

    // biome-ignore lint/suspicious/noExplicitAny: mock
    const mockDb = new DataSource({} as any);
    vi.mocked(mockDb.initialize).mockRejectedValue(new Error("DB Connection Error"));

    await runIndexer({
      name: "test-indexer",
      contractIds: [],
      registry: mockRegistry,
    });

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  test("should start polling and run the loop, stopping gracefully on shutdown signal", async () => {
    vi.mocked(loadIndexerConfig).mockReturnValue({
      databaseUrl: "postgres://ok",
      port: 4000,
      pollIntervalMs: 5,
      logLevel: "info",
      streamsContractIds: ["C123"],
      distributionsContractIds: [],
      startLedger: 100,
    });

    // biome-ignore lint/suspicious/noExplicitAny: mock
    const mockDb = new DataSource({} as any);
    // biome-ignore lint/suspicious/noExplicitAny: mock
    vi.mocked(mockDb.initialize).mockResolvedValue({} as any);
    // biome-ignore lint/suspicious/noExplicitAny: mock
    vi.mocked(mockDb.destroy).mockResolvedValue({} as any);

    const mockClient = createSorobanClient();
    vi.mocked(mockClient.getLatestLedger).mockResolvedValue({
      sequence: 101,
      // biome-ignore lint/suspicious/noExplicitAny: mock
    } as any);
    vi.mocked(mockClient.getEvents).mockResolvedValue({
      events: [
        {
          contractId: "C123",
          ledger: 100,
          ledgerClosedAt: "2026-01-01",
          topic: [],
          value: null,
          id: "event-1",
          pagingToken: "paging-1",
        },
      ],
      // biome-ignore lint/suspicious/noExplicitAny: mock
    } as any);

    // Run the indexer in the background, then trigger SIGINT to terminate the loop
    const runnerPromise = runIndexer({
      name: "test-indexer",
      contractIds: ["C123"],
      registry: mockRegistry,
    });

    // Wait a brief moment to allow the loop to run at least once
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Emit SIGINT to stop the running loop
    // biome-ignore lint/suspicious/noExplicitAny: mock
    process.emit("SIGINT" as any);

    await runnerPromise;

    expect(mockDb.initialize).toHaveBeenCalled();
    expect(mockDb.destroy).toHaveBeenCalled();
    expect(mockExit).not.toHaveBeenCalled();
  });
});
