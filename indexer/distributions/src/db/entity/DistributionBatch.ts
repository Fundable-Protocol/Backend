import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

import type { DistributionBatchStatus } from "../status.js";
import { ClaimAction } from "./ClaimAction.js";

@Entity("distribution_batch")
@Index("distribution_batch_contract_id_idx", ["contractId"])
@Index("distribution_batch_distributor_idx", ["distributor"])
@Index("distribution_batch_status_idx", ["status"])
@Index("distribution_batch_created_at_idx", ["createdAt"])
@Index("distribution_batch_contract_status_idx", ["contractId", "status"])
export class DistributionBatch {
  @PrimaryColumn({
    type: "varchar",
    comment: "Deterministic batch ID from the Soroban contract",
  })
  id!: string;

  @Column({ type: "varchar", comment: "Soroban contract that emitted the batch" })
  contractId!: string;

  @Column({ type: "varchar", comment: "Address that created the distribution batch" })
  distributor!: string;

  @Column({ type: "varchar", comment: "Token asset contract address" })
  token!: string;

  @Column({
    type: "numeric",
    precision: 78,
    scale: 0,
    comment: "Total allocated amount in the token's smallest unit",
  })
  totalAmount!: string;

  @Column({
    type: "numeric",
    precision: 78,
    scale: 0,
    default: "0",
    comment: "Total amount claimed so far in the token's smallest unit",
  })
  claimedAmount!: string;

  @Column({ type: "integer", default: 0, comment: "Number of intended recipients" })
  recipientCount!: number;

  @Column({
    type: "varchar",
    default: "active",
    comment: "Batch lifecycle status for pause/resume behavior",
  })
  status!: DistributionBatchStatus;

  @Column({
    type: "bigint",
    nullable: true,
    comment: "Unix timestamp when the batch was paused",
  })
  pausedAt!: string | null;

  @Column({
    type: "bigint",
    nullable: true,
    comment: "Unix timestamp when the batch was last resumed",
  })
  resumedAt!: string | null;

  @Column({ type: "varchar", comment: "Contract-unique reference for the batch" })
  uniqueRef!: string;

  @Column({ type: "bigint", comment: "Ledger where the batch was created" })
  ledgerNumber!: string;

  @Column({ type: "varchar", comment: "Transaction hash that created the batch" })
  txHash!: string;

  @OneToMany(
    () => ClaimAction,
    (claim) => claim.batch,
  )
  claims!: ClaimAction[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
