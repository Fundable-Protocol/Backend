# Bun Indexer Migration Design

## Goal

Move the Fundable indexer scaffold into the Backend repository and make Backend use Bun as the primary package manager.

## Architecture

The Backend repository becomes the open source home for both the existing Express API and the indexer workspace. The existing API remains rooted in `src/`; the indexer remains isolated under `indexer/` so its polling, cursor, schema, and GraphQL concerns do not mix into the API application.

The root package owns installation and shared package-manager policy. Bun is used for dependency installation and script execution across the repository. The indexer keeps its Turborepo package orchestration under `indexer/` and the root workspace discovers `indexer/common`, `indexer/streams`, and `indexer/distributions`.

## Package Management

Backend scripts should use `bun run` instead of `npm run` or `yarn`. Existing Node-based runtime commands can remain Node-based where that is the least risky option, but they are launched through Bun scripts.

The migration should produce one root `bun.lock` for the combined repository. Existing npm and pnpm lockfiles become obsolete after the Bun install succeeds.

## Indexer Placement

The indexer should be copied from the standalone `fundable_indexer` repository into:

```text
indexer/
  common/
  distributions/
  docs/
  scripts/
  streams/
  package.json
  turbo.json
  tsconfig.base.json
  vitest.config.ts
  biome.jsonc
```

Do not copy `.git`, `node_modules`, `.turbo`, `dist`, or other generated files.

## Verification

The migration is complete when these commands pass from the Backend repository:

```bash
bun install
bun run type-check
bun run test
bun run lint
bun run indexer:type-check
bun run indexer:test
bun run indexer:lint
```

