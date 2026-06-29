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

### Runnable Indexers

Each domain indexer has a standalone entrypoint (`src/main.ts`) that can be
launched from the repository root:

```bash
# Start the payment streams indexer
bun run indexer:streams

# Start the token distributions indexer
bun run indexer:distributions
```

Or directly from each domain package:

```bash
cd indexer/streams && bun start
cd indexer/distributions && bun start
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

The `common` package exposes a validated config loader (`loadIndexerConfig`)
that reads these variables, parses numeric values (`INDEXER_PORT`,
`POLL_INTERVAL_MS`, `START_LEDGER`), and fails fast with a clear error when
required values are missing or malformed.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SOROBAN_RPC_URL` | ✅ | Soroban RPC endpoint |
| `STREAMS_CONTRACT_IDS` | ✅ (streams) | Comma-separated stream contract IDs |
| `DISTRIBUTIONS_CONTRACT_IDS` | ✅ (distributions) | Comma-separated distribution contract IDs |
| `START_LEDGER` | ☐ | Ledger sequence to start from (defaults to latest) |
| `POLL_INTERVAL_MS` | ☐ | Polling interval in ms (default: 5000) |
| `LOG_LEVEL` | ☐ | Log verbosity: `debug`, `info`, `warn`, `error` |

## Idempotency

The `HandlerRegistry.dispatch()` method integrates with `EventRepository` to
guarantee at-most-once processing per Soroban event:

1. Before dispatching, it checks whether the event's (`contractId`, `ledger`,
   `txHash`, `eventIndex`) tuple has already been recorded in the database.
2. If the event was previously processed, dispatch is skipped (returns `[]`).
3. If all matched handlers succeed (or no handlers match), the event is recorded
   as processed.
4. If any handler fails, the event is **not** recorded — allowing it to be
   retried on the next polling cycle.

Event identity is extracted deterministically from the event's `pagingToken`
or `id` fields by `getSorobanEventIdentity()` in `common/src/db/repository.ts`.

## Database & Migrations

Persistence uses PostgreSQL with [TypeORM](https://typeorm.io). Entities live
under each workspace's `src/db/entity/` (e.g. `common/src/db/entity/`,
`streams/src/db/entity/`), with the shared `EventRepository` in
`common/src/db/repository.ts`. Migrations are kept per workspace under
`src/db/migrations/`.

TypeORM relies on decorator metadata, which is enabled in `tsconfig.base.json`
via `experimentalDecorators` and `emitDecoratorMetadata`.

## Status

This workspace provides the indexer foundation — validated config, a Soroban RPC
client, a TypeORM persistence layer (entities and repository), a poller, an
event-handler registry with idempotency guarantees, runnable entrypoints for the
streams and distributions indexers, and all matching handlers. The GraphQL API
is planned but not yet implemented.
