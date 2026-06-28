export const commonPackage = {
  name: "@fundable-indexer/common",
  role: "shared-infrastructure",
} as const;

export { config, loadConfig } from "./config/index.js";
export { createSorobanClient, sorobanClient } from "./rpc/client.js";
export { IndexedEvent } from "./db/entity/IndexedEvent.js";
export { EventRepository } from "./db/repository.js";
export { SorobanPoller, type PollerOptions, type PollResult } from "./poller/index.js";
