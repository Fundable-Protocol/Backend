## Summary

Describe what changed and why.

## Area

- [ ] Backend API (`src/`)
- [ ] Indexer common infrastructure (`indexer/common/`)
- [ ] Streams indexer (`indexer/streams/`)
- [ ] Distributions indexer (`indexer/distributions/`)
- [ ] Tooling, docs, CI, or Docker

## Scope

- [ ] This PR addresses one scoped issue or task
- [ ] Unrelated formatting, generated files, and follow-up work were left out
- [ ] Backend and indexer package boundaries were respected

## Verification

- [ ] `bun run type-check`
- [ ] `bun run test`
- [ ] `bun run lint`
- [ ] `bun run indexer:type-check` if indexer files changed
- [ ] `bun run indexer:test` if indexer files changed
- [ ] `bun run indexer:lint` if indexer files changed

## Indexer Safety

- [ ] Event processing changes are idempotent or do not affect event processing
- [ ] Cursor changes advance only after successful processing
- [ ] Event names and payload shapes were confirmed from contracts, if relevant
- [ ] Backfill and replay behavior was considered, if relevant

## Notes

Closes #

