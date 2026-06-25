import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  Index,
  BeforeInsert,
} from "typeorm";
import { ulid } from "ulidx";

/**
 * Entity representing a Soroban event that has been indexed.
 * Provides deterministic identity for deduplication and replay safety.
 *
 * Required fields for event identity (per INDEXER_GUIDELINES.md):
 * - Contract ID
 * - Ledger number
 * - Transaction hash
 * - Event index or another deterministic event position
 */
@Entity("indexed_event")
@Index("indexed_event_contract_id_idx", ["contractId"])
@Index("indexed_event_ledger_idx", ["ledgerNumber"])
@Index("indexed_event_tx_hash_idx", ["transactionHash"])
@Index("indexed_event_created_at_idx", ["createdAt"])
@Index("indexed_event_dedupe_idx", ["contractId", "ledgerNumber", "transactionHash", "eventIndex"], {
  unique: true,
})
export class IndexedEventEntity {
  @PrimaryColumn("text")
  id: string;

  /**
   * Soroban contract ID that emitted the event
   */
  @Column("text", { name: "contract_id", nullable: false })
  contractId: string;

  /**
   * Stellar ledger number when the event occurred
   */
  @Column("bigint", { name: "ledger_number", nullable: false })
  ledgerNumber: bigint;

  /**
   * Transaction hash that contains the event
   */
  @Column("text", { name: "transaction_hash", nullable: false })
  transactionHash: string;

  /**
   * Position of the event within the transaction (0-indexed)
   */
  @Column("integer", { name: "event_index", nullable: false })
  eventIndex: number;

  /**
   * Raw event data as JSON
   */
  @Column("jsonb", { name: "event_data", nullable: false })
  eventData: Record<string, unknown>;

  /**
   * Event topics as JSON array
   */
  @Column("jsonb", { name: "event_topics", nullable: false })
  eventTopics: string[];

  /**
   * Domain that processed this event (e.g., 'streams', 'distributions')
   */
  @Column("text", { name: "processed_by", nullable: false })
  processedBy: string;

  /**
   * When the indexer processed this event
   */
  @CreateDateColumn({
    type: "timestamp",
    name: "created_at",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = ulid();
    }
  }
}