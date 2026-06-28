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

The `common` package exposes a validated config loader (`loadIndexerConfig`)
that reads these variables, parses numeric values (`INDEXER_PORT`,
`POLL_INTERVAL_MS`, `START_LEDGER`), and fails fast with a clear error when
required values are missing or malformed.

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
client, a TypeORM persistence layer (entities and repository), a poller, and an
event-handler registry, plus the streams and distributions handlers. The GraphQL
API is planned but not yet implemented.
