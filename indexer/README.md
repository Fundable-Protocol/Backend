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

## Status

This workspace is currently a scaffold. The poller, database repositories,
cursor persistence, event handlers, and GraphQL API are planned but not yet
implemented.
