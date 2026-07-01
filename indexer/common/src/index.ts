export const commonPackage = {
  name: "@fundable-indexer/common",
  role: "shared-infrastructure",
} as const;

export {
  ConfigValidationError,
  config,
  loadConfig,
  loadIndexerConfig,
  type IndexerConfig,
} from "./config/index.js";
export { createSorobanClient, sorobanClient } from "./rpc/client.js";
export { IndexedEvent } from "./db/entity/IndexedEvent.js";
export { EventRepository } from "./db/repository.js";
export { SorobanPoller, type PollerOptions, type PollResult } from "./poller/index.js";
export * from "./handlers/index.js";
