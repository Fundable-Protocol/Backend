# Fundable Backend API

This server is built on **TypeScript**, **Node.js**, **Express**, **PostgreSQL**, and **TypeORM**. It contains a clean, organized structure, while incorporating best practices such as type safety, database integration, and robust configurations.

## Technologies Used

-   Built with **TypeScript** for type safety and better developer experience.
-   **Express** as the web framework.
-   **PostgreSQL** database integration via **TypeORM**.
-   Environment-based configurations.
-   Scalable folder structure.
-   Middleware for request validation and error handling.
-   Support for database migrations.
-   Lightweight and ready for production deployment.

---

## Before You Begin

Ensure you have the following installed on your system:

-   **Node.js** (v20.x or above)
-   **pnpm** (for dependency management)
-   **PostgreSQL** (v14.x or above)
-   **Git** (optional, for version control)
-   **ESLint**: Linting for maintaining code quality.
-   **Jest**: Unit testing framework.

---

## Development Setup

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- Node.js 20+

### First-time setup
```bash
# 1. Copy environment config
cp .env.example .env

# 2. Start database + run migrations in one command
make setup
# or without Make:
npm run setup

# 3. Start the dev server
npm run dev
```

### Daily workflow
```bash
make db          # start database
npm run dev      # start API

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

```bash
cp .env.example .env
```

Run this command to copy .env `cp .env.example .env` file in the project root and populate it with your environment-specific variables. Use the example below as a reference:

# Server

PORT=8002
NODE_ENV=one of these: local_dev | dev | staging | prod
Database=check credentials in env, and setup local db accordingly

> Ensure sensitive keys are not committed to version control.

---

## Running the Application

1. Start the development server:

    ```bash
    pnpm dev (This will start the API server with hot reloading enabled.)
    ```

2. To build and run for production: pnpm build && pnpm start

---

## Folder Structure

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
    pnpm run-migration
    ```

3. If you need to create a new migration:

    ```bash
    pnpm generate-migration <MigrationName>
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
    pnpm generate-migration <MigrationName>
    pnpm run-migration
    ```

---

## Testing

To run tests, use the following command:

```bash
pnpm test
```

Tests are located in the `__tests__` folder and use a library like **Jest** for unit and integration tests.

---


### Any challenges? Reach out!
