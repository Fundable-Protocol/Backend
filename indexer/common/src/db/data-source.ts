import "reflect-metadata";
import { DataSource } from "typeorm";
import { IndexedEventEntity } from "./indexed-event.entity.js";

/**
 * Environment variables required for indexer database connection
 */
export interface IndexerDatabaseConfig {
  INDEXER_DATABASE_HOST: string;
  INDEXER_DATABASE_PORT: string;
  INDEXER_DATABASE_USERNAME: string;
  INDEXER_DATABASE_PASSWORD: string;
  INDEXER_DATABASE_NAME: string;
  INDEXER_DATABASE_SSL?: string;
}

/**
 * Validate required database configuration
 */
export function validateIndexerDatabaseConfig(
  config: Partial<IndexerDatabaseConfig>,
): asserts config is IndexerDatabaseConfig {
  const missingKeys = [
    ["INDEXER_DATABASE_HOST", config.INDEXER_DATABASE_HOST],
    ["INDEXER_DATABASE_PORT", config.INDEXER_DATABASE_PORT],
    ["INDEXER_DATABASE_USERNAME", config.INDEXER_DATABASE_USERNAME],
    ["INDEXER_DATABASE_PASSWORD", config.INDEXER_DATABASE_PASSWORD],
    ["INDEXER_DATABASE_NAME", config.INDEXER_DATABASE_NAME],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required indexer database env vars: ${missingKeys.join(", ")}`,
    );
  }
}

/**
 * Create indexer data source
 */
export function createIndexerDataSource(
  config: IndexerDatabaseConfig,
): DataSource {
  const port = Number(config.INDEXER_DATABASE_PORT);
  const useSsl = config.INDEXER_DATABASE_SSL === "true";

  return new DataSource({
    host: config.INDEXER_DATABASE_HOST,
    port: Number.isNaN(port) ? 5432 : port,
    username: config.INDEXER_DATABASE_USERNAME,
    password: config.INDEXER_DATABASE_PASSWORD,
    database: config.INDEXER_DATABASE_NAME,
    type: "postgres",
    connectTimeoutMS: 5000,
    synchronize: false,
    logging: process.env.NODE_ENV === "development",
    entities: [IndexedEventEntity],
    migrations: ["src/migrations/*.js"],
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });
}

/**
 * Singleton instance of indexer data source
 */
let indexerDataSource: DataSource | null = null;

/**
 * Get or initialize the indexer data source
 */
export function getIndexerDataSource(): DataSource {
  if (!indexerDataSource) {
    throw new Error(
      "Indexer data source not initialized. Call initializeIndexerDataSource first.",
    );
  }
  return indexerDataSource;
}

/**
 * Initialize indexer data source with environment configuration
 */
export async function initializeIndexerDataSource(
  config: IndexerDatabaseConfig,
): Promise<DataSource> {
  validateIndexerDatabaseConfig(config);
  
  if (indexerDataSource?.isInitialized) {
    return indexerDataSource;
  }

  indexerDataSource = createIndexerDataSource(config);
  await indexerDataSource.initialize();
  
  return indexerDataSource;
}

/**
 * Close indexer data source connection
 */
export async function closeIndexerDataSource(): Promise<void> {
  if (indexerDataSource?.isInitialized) {
    await indexerDataSource.destroy();
    indexerDataSource = null;
  }
}