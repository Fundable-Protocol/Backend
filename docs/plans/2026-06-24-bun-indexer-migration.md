# Bun Indexer Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert Backend to a Bun-first repository and move the standalone Fundable indexer scaffold under `indexer/`.

**Architecture:** Backend remains the API app at `src/`, while the indexer remains a nested standalone workspace at `indexer/`. The root package owns Bun installation and top-level convenience scripts; the indexer keeps Turborepo orchestration for its domain packages.

**Tech Stack:** Bun, TypeScript, Express, TypeORM, Turborepo, Vitest, Biome, ESLint.

---

### Task 1: Repository Ignore Rules and Design Docs

**Files:**
- Modify: `.gitignore`
- Create: `docs/plans/2026-06-24-bun-indexer-migration-design.md`
- Create: `docs/plans/2026-06-24-bun-indexer-migration.md`

**Steps:**
1. Allow `docs/plans/**` to be tracked.
2. Allow `indexer/docs/**` and `indexer/scripts/**` to be tracked.
3. Add the approved design doc.
4. Add this implementation plan.

### Task 2: Copy the Indexer Scaffold

**Files:**
- Create: `indexer/**`

**Steps:**
1. Copy the standalone indexer source, docs, config, and package files into `indexer/`.
2. Exclude `.git`, `node_modules`, `.turbo`, `dist`, and package build artifacts.
3. Verify the copied tree contains `common`, `streams`, `distributions`, `docs`, `scripts`, and root indexer config files.

### Task 3: Convert Backend Root Scripts to Bun

**Files:**
- Modify: `package.json`
- Modify: `docker-compose.yml`
- Modify: `README.md`

**Steps:**
1. Add `packageManager: bun@1.3.8` and Bun/Node engine metadata.
2. Add root workspaces for indexer packages.
3. Replace internal `npm run` and `yarn` script usage with `bun run`.
4. Add `indexer:*` scripts that run checks from `indexer/`.
5. Update Docker migration service to install and run with Bun.
6. Update README setup commands from npm/pnpm to Bun.

### Task 4: Install and Verify

**Files:**
- Create: `bun.lock`
- Remove when obsolete: `package-lock.json`
- Remove when obsolete: `pnpm-lock.yaml`

**Steps:**
1. Run `bun install` at the Backend root.
2. Remove obsolete npm/pnpm lockfiles only after `bun install` succeeds.
3. Run Backend checks: `bun run type-check`, `bun run test`, `bun run lint`.
4. Run indexer checks: `bun run indexer:type-check`, `bun run indexer:test`, `bun run indexer:lint`.
5. Review `git status` and ensure generated build/cache folders are not staged.

