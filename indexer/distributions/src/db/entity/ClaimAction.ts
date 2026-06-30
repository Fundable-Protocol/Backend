import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { DistributionBatch } from "./DistributionBatch.js";

/**
 * A single token claim against a distribution batch.
 *
 * The `(txHash, ledgerNumber, eventIndex)` triple is unique so a replayed
 * `tokens_claimed` event cannot create a duplicate claim row, which keeps the
 * batch's `claimedAmount` from being double-counted.
 */
@Entity("distribution_claim_action")
@Unique("uq_claim_event_identity", ["txHash", "ledgerNumber", "eventIndex"])
export class ClaimAction {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "varchar", comment: "The ID of the distribution batch this claim belongs to" })
  batchId!: string;

  @ManyToOne(() => DistributionBatch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "batchId" })
  batch!: DistributionBatch;

  @Index()
  @Column({ type: "varchar", comment: "The address that claimed tokens" })
  claimant!: string;

  @Column({ type: "bigint", comment: "The amount claimed" })
  amount!: string;

  @Column({ type: "varchar", comment: "Transaction hash where the claim occurred" })
  txHash!: string;

  @Column({ type: "int", comment: "Ledger number the claim event was indexed at" })
  ledgerNumber!: number;

  @Column({ type: "int", comment: "Deterministic event position within the ledger" })
  eventIndex!: number;

  @Column({ type: "varchar", comment: "Timestamp the claim event closed at" })
  eventTimestamp!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
