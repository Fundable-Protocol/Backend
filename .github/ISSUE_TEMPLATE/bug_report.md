---
name: Bug report
about: Report a reproducible problem in the Backend API or indexer
title: ""
labels: bug
assignees: ""
---

## Summary

Describe the bug clearly.

## Area

- [ ] Backend API (`src/`)
- [ ] Indexer common infrastructure (`indexer/common/`)
- [ ] Streams indexer (`indexer/streams/`)
- [ ] Distributions indexer (`indexer/distributions/`)
- [ ] Tooling, docs, CI, or Docker

## Steps to Reproduce

1. Run or configure the project this way
2. Trigger this behavior
3. Observe the failure

## Expected Behavior

Describe what should happen.

## Actual Behavior

Describe what actually happens, including logs or error messages when possible.

## Environment

- OS:
- Bun version:
- Node version, if relevant:
- Database version, if relevant:

## Verification

- [ ] `bun run type-check`
- [ ] `bun run test`
- [ ] `bun run lint`
- [ ] `bun run indexer:type-check` if indexer files are affected
- [ ] `bun run indexer:test` if indexer files are affected
- [ ] `bun run indexer:lint` if indexer files are affected

