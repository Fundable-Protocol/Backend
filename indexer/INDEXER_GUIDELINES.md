# Indexer Guidelines

These guidelines define the default engineering rules for code under
`indexer/`. They should be updated when an architecture decision changes how
contributors should build the Fundable Soroban event indexer.

## Package Boundaries

The workspace is split by responsibility:

-   `indexer/common`: shared configuration, database, Soroban RPC, logging, cursor, and
    utility code.
-   `indexer/streams`: payment stream schemas, event handlers, and domain-specific
    mapping.
-   `indexer/distributions`: distribution schemas, event handlers, and
    domain-specific mapping.
-   `indexer/api`: future Apollo GraphQL API package, if added by a scoped issue.

Domain packages may depend on `common`. They should not depend on each other.

## Event Identity

Every indexed Soroban event must have a deterministic identity. Store enough
metadata to detect duplicate processing during retries, restarts, backfills, and
replays.

Required event identity fields:

-   Contract ID
-   Ledger number
-   Transaction hash
-   Event index or another deterministic event position

Database writes that represent indexed events should use unique constraints or
equivalent conflict handling based on this identity.

## Cursor Safety

Cursors represent indexed progress and must be conservative:

-   Update the cursor only after all events for that ledger range are processed.
-   Persist cursor updates in the same transaction as related event writes when
    practical.
-   Do not skip failed events by advancing the cursor.
-   Store enough state to resume after process restarts.

If a handler fails, the indexer should retry or stop with a clear error instead
of silently advancing.

## Idempotency

Handlers must be safe to run more than once for the same event. Reprocessing a
ledger range should not create duplicate rows or double-count derived values.

Prefer:

-   Deterministic IDs
-   Database uniqueness constraints
-   Upserts where they express the domain behavior clearly
-   Transactional updates for event rows plus derived entity state

Avoid relying only on in-memory deduplication.

## Event Payloads

Do not guess final event names or payload shapes. Confirm them from the Soroban
contracts before implementing production handlers.

Handler tests should use realistic mocked event payloads that match confirmed
contract event topics and value shapes.

## Numeric Values

Token amounts, ledger numbers, and timestamps must be represented without
floating-point precision loss.

Use integer-safe types and database columns. Convert to display formats only at
API boundaries.

## GraphQL API

The GraphQL API will use Apollo Server. Keep API code separate from indexing
code so the API can query indexed data without controlling ingestion.

Expected API rules:

-   Load or compose schemas from domain packages.
-   Keep resolver database access explicit and testable.
-   Support pagination and sorting for list queries.
-   Implement Hasura-style filters only where they are documented and tested.
-   Do not expose internal cursor or replay state unless an issue explicitly
    requires it.

## Configuration

Configuration should come from environment variables and checked-in example
files. Never commit secrets.

Required runtime configuration should be validated at startup with clear error
messages. Optional configuration should have documented defaults.

## Testing Expectations

Use focused tests for:

-   Event identity derivation
-   Handler idempotency
-   Cursor update behavior
-   Config parsing
-   GraphQL filters, pagination, and sorting

Before merging, the repository checks must pass:

```bash
bun run type-check
bun run test
bun run lint
bun run indexer:type-check
bun run indexer:test
bun run indexer:lint
```
