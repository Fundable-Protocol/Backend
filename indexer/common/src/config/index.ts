import { z } from "zod";

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
