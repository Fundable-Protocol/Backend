import { type Contract, scValToNative, type xdr } from "@stellar/stellar-sdk";
import { DataSource } from "typeorm";
import { type IndexerConfig, loadIndexerConfig } from "../config/index.js";
import { IndexedEvent } from "../db/entity/IndexedEvent.js";
import { EventRepository } from "../db/repository.js";
import type { HandlerRegistry } from "../handlers/registry.js";
import type { SorobanEventInput } from "../handlers/types.js";
import { createSorobanClient } from "../rpc/client.js";
import { SorobanPoller } from "./index.js";

export interface RunnerOptions {
  name: string;
  contractIds: string[];
  registry: HandlerRegistry;
  // biome-ignore lint/complexity/noBannedTypes: TypeORM entity constructors are plain Functions
  entities?: Function[];
}

export async function runIndexer(options: RunnerOptions): Promise<void> {
  const { name, contractIds, registry, entities = [] } = options;
  console.info(`[${name}] Initializing indexer...`);

  // 1. Load validated config
  let config: IndexerConfig;
  try {
    config = loadIndexerConfig();
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error("Unknown configuration validation error", err);
    }
    process.exit(1);
    return;
  }

  if (contractIds.length === 0) {
    console.warn(
      `[${name}] No contract IDs configured. Indexer will start but won't poll any contract events.`,
    );
  } else {
    console.info(`[${name}] Configured contract IDs: ${contractIds.join(", ")}`);
  }

  // 2. Initialize database
  const dataSource = new DataSource({
    type: "postgres",
    url: config.databaseUrl,
    entities: [IndexedEvent, ...entities],
    synchronize: false,
    logging: config.logLevel === "debug",
  });

  try {
    await dataSource.initialize();
    console.info(`[${name}] Database connection established.`);
  } catch (err) {
    console.error(`[${name}] Failed to connect to database at ${config.databaseUrl}:`, err);
    process.exit(1);
    return;
  }

  const eventRepo = new EventRepository(dataSource);
  const sorobanClient = createSorobanClient();
  const poller = new SorobanPoller({
    maxRetries: 3,
    retryDelayMs: 1000,
  });

  // Determine starting ledger
  let currentLedger = config.startLedger;
  if (currentLedger === undefined) {
    try {
      const latestLedger = await sorobanClient.getLatestLedger();
      currentLedger = latestLedger.sequence;
      console.info(
        `[${name}] No START_LEDGER configured. Starting from latest ledger: ${currentLedger}`,
      );
    } catch (err) {
      console.error(`[${name}] Failed to fetch latest ledger from RPC:`, err);
      await dataSource.destroy();
      process.exit(1);
      return;
    }
  } else {
    console.info(`[${name}] Starting from configured ledger: ${currentLedger}`);
  }

  let isRunning = true;

  const shutdown = async (signal: string) => {
    console.info(`[${name}] Received ${signal}. Shutting down gracefully...`);
    isRunning = false;
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  console.info(`[${name}] Indexer loop started. Interval: ${config.pollIntervalMs}ms`);

  while (isRunning) {
    try {
      const latestLedgerInfo = await sorobanClient.getLatestLedger();
      const latestLedger = latestLedgerInfo.sequence;

      if (currentLedger > latestLedger) {
        // We are caught up, wait
        await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
        continue;
      }

      // Process up to 10 ledgers at a time
      const endLedger = Math.min(currentLedger + 10, latestLedger);

      const fetchEvents = async (start: number, end: number) => {
        if (contractIds.length === 0) {
          return [];
        }

        const filters = contractIds.map((id) => ({
          type: "contract" as const,
          contractIds: [id],
        }));

        const rpcResponse = await sorobanClient.getEvents({
          startLedger: start,
          filters,
        });

        const allEvents = rpcResponse.events || [];
        const rangeEvents = allEvents.filter(
          (event) => event.ledger >= start && event.ledger <= end,
        );

        return rangeEvents.map((event) => {
          const topic = event.topic.map((t: xdr.ScVal) => {
            try {
              const native = scValToNative(t);
              return typeof native === "string" ? native : String(native);
            } catch {
              return String(t);
            }
          });

          let data: unknown;
          if (event.value) {
            try {
              data = scValToNative(event.value);
            } catch {
              data = event.value;
            }
          }

          const contractId = event.contractId
            ? typeof event.contractId === "string"
              ? event.contractId
              : (event.contractId as Contract).contractId()
            : "";

          return {
            contractId,
            ledger: event.ledger,
            ledgerClosedAt: event.ledgerClosedAt,
            topic,
            data,
            id: event.id,
            pagingToken: event.pagingToken,
          } as SorobanEventInput;
        });
      };

      const processEvent = async (event: SorobanEventInput) => {
        // Dispatch to handlers with idempotency tracking
        await registry.dispatch(event, eventRepo);
      };

      const updateCursor = async (ledger: number) => {
        console.info(`[${name}] Processed up to ledger ${ledger}`);
        currentLedger = ledger + 1;
      };

      const result = await poller.processLedgerRange(
        currentLedger,
        endLedger,
        fetchEvents,
        processEvent,
        updateCursor,
      );

      if (!result.success) {
        console.error(`[${name}] Error during polling:`, result.error);
        await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
      } else {
        await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
      }
    } catch (err) {
      console.error(`[${name}] Unexpected error in polling loop:`, err);
      await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
    }
  }

  // Graceful cleanup
  try {
    await dataSource.destroy();
    console.info(`[${name}] Database connection closed.`);
  } catch (err) {
    console.error(`[${name}] Error closing database connection:`, err);
  }
  console.info(`[${name}] Shutdown complete.`);
}
