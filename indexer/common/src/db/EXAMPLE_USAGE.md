# Indexed Event System - Example Usage

## Overview

The indexed event system provides deterministic identity storage for Soroban events
to prevent duplicates during retries, restarts, and replays.

## Basic Usage

### 1. Initialize Database Connection

```typescript
import { initializeIndexerDataSource } from "@fundable-indexer/common/db";

const config = {
  INDEXER_DATABASE_HOST: process.env.INDEXER_DATABASE_HOST,
  INDEXER_DATABASE_PORT: process.env.INDEXER_DATABASE_PORT,
  INDEXER_DATABASE_USERNAME: process.env.INDEXER_DATABASE_USERNAME,
  INDEXER_DATABASE_PASSWORD: process.env.INDEXER_DATABASE_PASSWORD,
  INDEXER_DATABASE_NAME: process.env.INDEXER_DATABASE_NAME,
  INDEXER_DATABASE_SSL: process.env.INDEXER_DATABASE_SSL,
};

const dataSource = await initializeIndexerDataSource(config);
```

### 2. Store Events with Deduplication

```typescript
import { IndexedEventRepository } from "@fundable-indexer/common/db";

const repository = new IndexedEventRepository(dataSource);

const eventData = {
  contractId: "CAFEBABE",
  ledgerNumber: BigInt(123456),
  transactionHash: "0x1234567890abcdef",
  eventIndex: 0,
  eventData: {
    type: "PaymentStreamCreated",
    streamId: "stream-123",
    amount: "1000000",
  },
  eventTopics: ["PaymentStreamCreated", "CAFEBABE"],
  processedBy: "streams",
};

// Safe insert - won't create duplicates
const storedEvent = await repository.insertSafely(eventData);
console.log(`Event stored with ID: ${storedEvent.id}`);
```

### 3. Check if Event is Already Processed

```typescript
const isProcessed = await repository.isProcessed(
  "CAFEBABE",
  BigInt(123456),
  "0x1234567890abcdef",
  0,
);

if (isProcessed) {
  console.log("Event already processed, skipping...");
} else {
  console.log("Event not yet processed, handling...");
}
```

### 4. Query Events for Replay/Debug

```typescript
// Get events for a ledger range
const events = await repository.getByLedgerRange(
  BigInt(123000),
  BigInt(124000),
  "streams",
);

// Get latest processed ledger
const latestLedger = await repository.getLatestLedger("streams");
console.log(`Latest processed ledger: ${latestLedger}`);

// Get events for a specific contract
const contractEvents = await repository.getByContract("CAFEBABE", 10);
```

## Migration

The `CreateIndexedEventTable1704000000001` migration creates the table with:

1. Unique constraint on `(contract_id, ledger_number, transaction_hash, event_index)`
2. Indexes for efficient queries by contract, ledger, transaction hash, and domain
3. Composite indexes for common query patterns

Run the migration:
```bash
bun run migration:run
```

## Testing

Run the tests:
```bash
bun run indexer:test
```

## Environment Variables

Add to your `.env` file:
```env
# Indexer Database Configuration
INDEXER_DATABASE_HOST=localhost
INDEXER_DATABASE_PORT=5432
INDEXER_DATABASE_USERNAME=postgres
INDEXER_DATABASE_PASSWORD=postgres
INDEXER_DATABASE_NAME=fundable_indexer
INDEXER_DATABASE_SSL=false
```