export const commonPackage = {
  name: "@fundable-indexer/common",
  role: "shared-infrastructure",
} as const;

export { ConfigValidationError, loadConfig, type IndexerConfig } from "./config/index.js";
export {
  checkDbHealth,
  createDbClient,
  schema,
  type CreateDbClientOptions,
  type DbClient,
  type DbHealth,
} from "./db/index.js";
