# Codebase Findings + Setup Notes (Fundable Backend API)

Date: 2026-03-23

This repo is a TypeScript/Node/Express API backed by PostgreSQL via TypeORM. The main entrypoint is `src/index.ts` and the compiled output is `dist/`.

## Quick Local Setup

1) Install deps:

- `npm ci`

2) Create `.env`:

- `Copy-Item .env.example .env`

Minimal `.env` to boot locally:

```env
NODE_ENV=local_dev
PORT=8002

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=fundable_db

# Cairo/StarkNet integration (local mock)
CAIRO_MOCK=true
```

3) Ensure DB exists + migrate:

- `npm run ensure-db`
- `npm run typeorm -- migration:run`

4) Build + start:

- `npm run build`
- `node --env-file=.env dist/index.js`

## Startup Notes

- Seeding is disabled (no-op) to avoid missing-module startup blockers: `src/config/persistence/seeder.ts`.
- DB config is validated early and fails fast if required env vars are missing: `src/config/persistence/data-source.ts`.

## Current Routes

- Health: `GET /` → `{ success: false, message: ... }`
- V1 (existing): `/v1/*`
  - Distributions: `GET /v1/distributions`, `POST /v1/distributions`
- API V1 (new): `/api/v1/*`
  - Campaigns (new): `POST /api/v1/campaigns` (JWT required, 5/hour per user)

## Campaign Creation (Cairo)

Endpoint:

- `POST /api/v1/campaigns`

Body:

```json
{
  "campaign_ref": "ABCDE",
  "target_amount": "1000",
  "donation_token": "0x1"
}
```

Behavior:

- Validates input (5-char ref, positive u256 string, StarkNet address format).
- Enforces uniqueness on `campaign_ref` (DB + unique index).
- Requires JWT with `sub` and a `walletAddress` (or `address`) claim.
- Rate limited: max 5 campaign creates per user per hour.
- Persists to DB (`campaigns` table) and writes an audit entry (`audit_logs`).
- On-chain integration:
  - Local dev: `CAIRO_MOCK=true` returns mock tx hash + campaign id.
  - Real chain: set `CAIRO_MOCK=false` and provide `CAIRO_RPC_URL`, `CAIRO_ACCOUNT_ADDRESS`, `CAIRO_PRIVATE_KEY`, `CAIRO_FACTORY_CONTRACT_ADDRESS`.

## Tests

- `npm test` runs `node --test` with `c8` coverage checks (scoped to the new feature modules via `package.json`).

