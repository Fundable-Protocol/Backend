# Contributing

Thank you for contributing to the Fundable Backend repository. The existing API
lives in `src/`, and the Soroban indexer workspace lives in `indexer/`.

## Workflow

External contributors should fork the repository first, then clone from their
own fork:

```bash
git clone git@github.com:<your-username>/Backend.git
cd Backend
git remote add upstream git@github.com:Fundable-Protocol/Backend.git
```

Create a feature branch from the latest upstream `dev` for every issue:

```bash
git checkout dev
git pull upstream dev
git checkout -b feat/short-issue-name
```

Keep pull requests small and tied to one issue. If an issue starts to require
unrelated database, indexer, API, or deployment changes, split the work before
opening the PR.

## Package Boundaries

- `src/`: existing Express backend API.
- `indexer/common`: shared indexer infrastructure, configuration, database, RPC,
  and utility code.
- `indexer/streams`: payment stream domain schema and event handling.
- `indexer/distributions`: distribution domain schema and event handling.
- `indexer/api`: future Apollo GraphQL API package, if added by a scoped issue.

Do not add shared behavior to a domain package if another package will need it.
Do not add a new package without a clear issue and maintainer agreement.

## Runtime and Dependencies

Use Bun for package management and scripts. Do not use npm, yarn, or pnpm in this
repository.

Allowed commands:

```bash
bun install
bun run type-check
bun run test
bun run lint
bun run indexer:type-check
bun run indexer:test
bun run indexer:lint
```

Do not commit lockfiles from other package managers, including:

- `package-lock.json`
- `yarn.lock`
- `pnpm-lock.yaml`

Dependency changes must be intentional, reviewed, and committed with the
corresponding `bun.lock` update.

## Indexer Rules

Indexer code must be replay-safe:

- Store enough event metadata to prevent duplicate writes.
- Treat ledger number, transaction hash, contract ID, and event index as core
  event identity data.
- Update cursors only after successful processing.
- Do not assume event names or payload shapes until they are confirmed from the
  contracts.
- Backfill and replay paths must be idempotent.

## Pull Requests

Every PR should include:

- Linked issue
- What changed
- Why it changed
- How it was tested
- Known follow-up work

Use the root `.github` templates. Do not include unrelated formatting,
generated files, or changes from another issue.

