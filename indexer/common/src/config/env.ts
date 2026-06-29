import { z } from "zod";

/**
 * Runtime configuration for the indexer.
 *
 * Values originate from environment variables (see `.env.example` under
 * "Soroban indexer") and are validated once at startup. Downstream code —
 * database, poller, and the future API — should depend on this typed shape
 * rather than reading `process.env` directly.
 */
export interface IndexerConfig {
  /** Postgres connection string, e.g. `postgres://user:pass@host:5432/db`. */
  readonly databaseUrl: string;
  /** HTTP port the indexer/API listens on. */
  readonly port: number;
  /** Delay between ledger polls, in milliseconds. */
  readonly pollIntervalMs: number;
  /** Optional ledger to start indexing from; omit to resume from the cursor. */
  readonly startLedger?: number;
  /** Logging verbosity. */
  readonly logLevel: "error" | "warn" | "info" | "debug";
  /** Configured Stellar contract IDs for streams indexer. */
  readonly streamsContractIds: string[];
  /** Configured Stellar contract IDs for distributions indexer. */
  readonly distributionsContractIds: string[];
}

/** A positive integer parsed from an environment string. */
const positiveIntFromString = z
  .string()
  .trim()
  .min(1, "must not be empty")
  .regex(/^\d+$/, "must be a positive integer")
  .transform((value) => Number.parseInt(value, 10))
  .refine((value) => Number.isSafeInteger(value), "must be a safe integer");

const configSchema = z.object({
  INDEXER_DATABASE_URL: z
    .string({ required_error: "is required" })
    .trim()
    .min(1, "is required")
    .url("must be a valid connection URL"),
  INDEXER_PORT: positiveIntFromString,
  POLL_INTERVAL_MS: positiveIntFromString,
  START_LEDGER: positiveIntFromString.optional(),
  INDEXER_LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).optional().default("info"),
  STREAMS_CONTRACT_IDS: z
    .string()
    .optional()
    .default("")
    .transform((val) =>
      val
        ? val
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    ),
  DISTRIBUTIONS_CONTRACT_IDS: z
    .string()
    .optional()
    .default("")
    .transform((val) =>
      val
        ? val
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    ),
});

/**
 * Raised when one or more environment variables are missing or invalid.
 * The message lists every problem so misconfiguration can be fixed in one pass.
 */
export class ConfigValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid indexer configuration:\n${issues.map((i) => `  - ${i}`).join("\n")}`);
    this.name = "ConfigValidationError";
  }
}

/**
 * Validate environment variables and return a typed {@link IndexerConfig}.
 *
 * Treats empty strings as absent so that a blank `START_LEDGER=` in an env file
 * is interpreted as "unset" rather than an invalid number.
 *
 * @throws {ConfigValidationError} if required values are missing or malformed.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): IndexerConfig {
  const normalized: Record<string, string | undefined> = {};
  for (const key of [
    "INDEXER_DATABASE_URL",
    "INDEXER_PORT",
    "POLL_INTERVAL_MS",
    "START_LEDGER",
    "INDEXER_LOG_LEVEL",
    "STREAMS_CONTRACT_IDS",
    "DISTRIBUTIONS_CONTRACT_IDS",
  ]) {
    const value = env[key];
    normalized[key] = value === undefined || value.trim() === "" ? undefined : value;
  }

  const result = configSchema.safeParse(normalized);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => {
      const key = issue.path.join(".") || "config";
      return `${key} ${issue.message}`;
    });
    throw new ConfigValidationError(issues);
  }

  const parsed = result.data;
  const config: IndexerConfig = {
    databaseUrl: parsed.INDEXER_DATABASE_URL,
    port: parsed.INDEXER_PORT,
    pollIntervalMs: parsed.POLL_INTERVAL_MS,
    logLevel: parsed.INDEXER_LOG_LEVEL,
    streamsContractIds: parsed.STREAMS_CONTRACT_IDS,
    distributionsContractIds: parsed.DISTRIBUTIONS_CONTRACT_IDS,
    ...(parsed.START_LEDGER !== undefined ? { startLedger: parsed.START_LEDGER } : {}),
  };

  return config;
}
