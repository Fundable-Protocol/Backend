import { z } from 'zod';

const configSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  DATABASE_PORT: z.coerce.number(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  HASH_PEPPER: z.string().min(16, "HASH_PEPPER must be at least 16 chars"),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
});

const _config = configSchema.safeParse(process.env);

if (!_config.success) {
  console.error('? Invalid environment variables:', _config.error.format());
  process.exit(1);
}

export const config = _config.data;
