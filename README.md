# Fundable Backend

This repository contains the Fundable Backend API and the Fundable Soroban
indexer scaffold. The API lives in `src/`; the indexer workspace lives in
`indexer/`. The repository uses **Bun** for package management and script
execution.

## Technologies Used

- TypeScript
- Bun
- Express
- PostgreSQL and TypeORM
- Node's built-in test runner with `c8` coverage
- Turborepo, Vitest, and Biome for the indexer workspace

---

## Before You Begin

Ensure you have the following installed on your system:

- Node.js 22.x
- Bun 1.3.8
- PostgreSQL 14+
- Docker and Docker Compose for local database workflows

---

## Development Setup

### First-time setup

```bash
# 1. Copy environment config
cp .env.example .env

# 2. Start database + run migrations in one command
make setup
# or without Make:
bun run setup

# 3. Start the dev server
bun run dev
```

### Daily workflow

```bash
make db          # start database
bun run dev      # start API

make db-stop     # stop database when done
make db-reset    # wipe all data and start fresh
```

### Migrations

```bash
# Run pending migrations
make migrate

# Revert last migration
make migrate-revert

# Generate a new migration
make migration-new name=AddWalletTable

# Run migrations without local Node (uses Docker)
make migrate-docker
```

## Configuration

Copy `.env.example` to `.env` and edit values for your local environment.

The same root `.env.example` contains Backend API settings, Cairo/StarkNet
settings, and Soroban indexer settings.

> Ensure sensitive keys are not committed to version control.

---

## Running the Application

1. Start the development server:

    ```bash
    bun run dev (This will start the API server with hot reloading enabled.)
    ```

2. To build and run for production: `bun run build && bun run start`

---

## Folder Structure

```plaintext
.
├── src/                                # Express Backend API
├── indexer/                            # Soroban indexer workspace
│   ├── common/                         # Shared indexer infrastructure
│   ├── streams/                        # Payment stream indexer domain
│   └── distributions/                  # Distribution indexer domain
├── .github/                            # PR and issue templates
├── docs/plans/                         # Design and implementation plans
├── docker-compose.yml
├── package.json
└── bun.lock
```

API source layout:

```plaintext
src/
├── __tests__/                         # Test files
├── appMiddlewares/                    # Main app files
├── components/                        # Folder containing version folder
    ├── v1/                            # Version 1
        ├── features/                  # Feature files
            ├── featureMiddleware/     # middlewares pertaining to feature
            ├── featureController/     # controllers pertaining to feature
            ├── featureRoutes/         # routes pertaining to feature
            ├── featureServices/       # Business logic and services pertaining to feature
            ├── featureValidation/     # Validation pertaining to feature
        └── routes.v1.ts               # V1 routes file

├── config/                            # Configuration files
├── migrations/                        # Database migration files
├── scripts/                           # App Scripts files
├── services/                          # App Services files
├── types/                             # Configuration files
├── utils/                             # Utility functions
├── .env.example                       # environment file to duplicate
└── index.ts                           # Application entry point

```

---

## TypeORM and Database Setup

1. Update the database configuration in `.env`.

2. Run migrations to set up the database schema:

    ```bash
    bun run run-migration
    ```

3. If you need to create a new migration:

    ```bash
    bun run generate-migration <MigrationName>
    ```

---

## Adding a New Entity and Controller

1. Create a new entity in `src/components/v1/feature/feature.entities.ts`:

    ```typescript
    // src/components/v1/feature/feature.entities.ts
    import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

    @Entity('feature')
    export class (FeatureName) {
        @PrimaryGeneratedColumn()
        id: number;

        @Column()
        name: string;

        @Column()
        email: string;
    }
    ```

2. Generate and run the migration for the new entity:

    ```bash
    bun run generate-migration <MigrationName>
    bun run run-migration
    ```

---

## Testing

To run tests, use the following command:

```bash
bun run test
```

Tests are located in `src/__tests__` and run with Node's test runner (`node --test`) + coverage (`c8`).

## Indexer

The Fundable Soroban indexer lives in `indexer/`. It is a Bun/Turborepo
workspace with:

- `indexer/common`: shared indexer infrastructure.
- `indexer/streams`: payment stream indexer domain.
- `indexer/distributions`: token distribution indexer domain.

Useful commands from the repository root:

```bash
bun run indexer:type-check
bun run indexer:test
bun run indexer:lint
```

Read `indexer/README.md` and `indexer/INDEXER_GUIDELINES.md` before working on
indexer issues.

## Contributing

Read `CONTRIBUTING.md` and use the root `.github` issue and PR templates. They
cover both Backend API and indexer work. Keep PRs scoped to one issue, avoid
generated files, and run the verification commands listed in the PR template.

---

## API: Create Campaign (Cairo)

**POST** `/api/v1/campaigns` (JWT required)

Request body:

```json
{
    "campaign_ref": "ABCDE",
    "target_amount": "1000",
    "donation_token": "0x1"
}
```

Notes:

- Rate limit: max **5** campaign creations per user per hour.
- Auth: send `Authorization: Bearer <JWT>` and include a `walletAddress` (or `address`) claim in the token.

### Cairo/StarkNet config (non-mock)

Set these env vars to enable real on-chain calls:

- `CAIRO_RPC_URL`
- `CAIRO_ACCOUNT_ADDRESS`
- `CAIRO_PRIVATE_KEY`
- `CAIRO_FACTORY_CONTRACT_ADDRESS`

Optional:

- `CAMPAIGN_CREATED_EVENT_KEY` (event key to extract `campaign_id` from the tx receipt; otherwise falls back to tx hash)

### Mock mode (local)

For local development without a chain connection:

- `CAIRO_MOCK=true`

---

## API: List Wallets

**GET** `/v1/wallets` (JWT required)

Returns a list of all wallets in the system.

Request:

```bash
curl -H "Authorization: Bearer <JWT_TOKEN>" http://localhost:3000/v1/wallets
```

Response (Success - 200):

```json
{
    "success": true,
    "data": [
        {
            "id": "wallet-uuid",
            "address": "0x123abc...",
            "network": "ETHEREUM",
            "chainId": "1",
            "chainName": "Ethereum",
            "balance": "100.50",
            "createdAt": "2026-06-29T10:00:00.000Z",
            "updatedAt": "2026-06-29T10:00:00.000Z"
        }
    ]
}
```

Response (Error - 401 Unauthorized):

```json
{
    "success": false,
    "error": {
        "code": "AUTH_MISSING_TOKEN",
        "message": "Missing authentication token",
        "details": {}
    }
}
```

Response (Error - 500 Internal Server Error):

```json
{
    "success": false,
    "error": {
        "code": "WALLET_LIST_FAILED",
        "message": "Failed to retrieve wallets",
        "details": { "reason": "..." }
    }
}
```

Notes:

- Requires valid JWT token in `Authorization: Bearer <token>` header
- Returns empty array if no wallets exist
- Includes wallet address, network, chain info, and balance

---

### Any challenges? Reach out!
