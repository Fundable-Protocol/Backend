# Fundable Indexer Workspace

The Fundable Soroban indexer now lives inside the Backend repository under
`indexer/`. It remains a separate workspace so event ingestion, cursor handling,
domain schemas, and future GraphQL API code stay isolated from the Express API
in `src/`.

Use the repository root for dependency installation:

```bash
bun install
```

## Packages

- `common`: shared indexer infrastructure.
- `streams`: payment stream indexer domain.
- `distributions`: token distribution indexer domain.

Domain packages may depend on `common`. They should not depend on each other.

## Root Commands

```bash
bun run indexer:type-check
bun run indexer:test
bun run indexer:lint
```

The nested `justfile` remains available for contributors who work from this
directory:

```bash
just type-check
just test
just lint
```

## Configuration

Indexer environment variables are documented in the repository root
`.env.example` under "Soroban indexer".

The `common` package exposes a validated config loader (`loadConfig`) that reads
these variables, parses numeric values (`INDEXER_PORT`, `POLL_INTERVAL_MS`,
`START_LEDGER`), and fails fast with a clear error when required values are
missing or malformed.

## Database & Migrations

Persistence uses PostgreSQL with [Drizzle ORM](https://orm.drizzle.team) and
Drizzle Kit for migrations. The schema entrypoint and connection factory live in
`common/src/db/`, and migration SQL is generated into `common/migrations/`.

```bash
# Generate migration SQL from common/src/db/schema.ts
bun run indexer:db:generate

# Apply pending migrations to INDEXER_DATABASE_URL
bun run indexer:db:migrate
```

Both commands read `INDEXER_DATABASE_URL` from the environment (see
`.env.example`). Domain tables (cursors, indexed events, streams, distributions)
are added by later scoped issues; until then `db:generate` reports no changes.

From within `common`, the same steps are available as `bun run db:generate` and
`bun run db:migrate`.

## Status

This workspace provides the database tooling foundation — validated config, a
PostgreSQL connection factory, a health check, and Drizzle migration tooling.
The poller, domain tables, cursor persistence, event handlers, and GraphQL API
are planned but not yet implemented.
