import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from "typeorm";

/**
 * Lifecycle status of a distribution batch. Mirrors the `DistributionStatus`
 * enum exposed in the GraphQL schema.
 */
export enum DistributionStatus {
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

/**
 * Durable state for a distribution created on-chain. The primary key is the
 * deterministic on-chain distribution ID so re-processing a `distribution_created`
 * event maps to the same row.
 */
@Entity("distribution_batch")
export class DistributionBatch {
  @PrimaryColumn({
    type: "varchar",
    comment: "The deterministic on-chain distribution ID",
  })
  id!: string;

  @Index()
  @Column({ type: "varchar", comment: "The distribution contract address" })
  contractId!: string;

  @Index()
  @Column({ type: "varchar", comment: "The address that created the distribution" })
  distributor!: string;

  @Column({ type: "varchar", comment: "The token asset address" })
  token!: string;

  @Column({ type: "bigint", comment: "The total amount of tokens in the distribution" })
  totalAmount!: string;

  @Column({ type: "bigint", default: "0", comment: "Total amount claimed so far" })
  claimedAmount!: string;

  @Column({ type: "int", comment: "Number of recipients in the distribution" })
  recipientCount!: number;

  @Column({
    type: "enum",
    enum: DistributionStatus,
    default: DistributionStatus.ACTIVE,
    comment: "Current lifecycle status of the distribution",
  })
  status!: DistributionStatus;

  @Column({ type: "varchar", nullable: true, comment: "Timestamp the distribution was paused" })
  pausedAt!: string | null;

  @Column({ type: "varchar", nullable: true, comment: "Timestamp the distribution was resumed" })
  resumedAt!: string | null;

  @Column({
    type: "int",
    nullable: true,
    comment: "Ledger of the last applied status change, used to reject stale pause/resume writes",
  })
  statusLedger!: number | null;

  @Column({
    type: "varchar",
    unique: true,
    comment: "Unique reference for the batch (on-chain distribution ID)",
  })
  uniqueRef!: string;

  @Column({ type: "int", comment: "Ledger number the creation event was indexed at" })
  ledgerNumber!: number;

  @Column({ type: "varchar", comment: "Transaction hash where the distribution was created" })
  txHash!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
