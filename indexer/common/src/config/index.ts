import { z } from "zod";

// Runtime/database configuration loader (validated, fail-fast). Exposed as
// `loadIndexerConfig` to avoid colliding with the RPC `loadConfig` below.
export {
  ConfigValidationError,
  loadConfig as loadIndexerConfig,
  type IndexerConfig,
} from "./env.js";

export const ConfigSchema = z.object({
  RPC_URL: z.string().url().default("https://soroban-testnet.stellar.org"),
  NETWORK_PASSPHRASE: z.string().default("Test SDF Network ; September 2015"),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = ConfigSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid configuration: ${result.error.message}`);
  }
  return result.data;
}

export const config = loadConfig();
