import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

import { DistributionBatch } from "./DistributionBatch.js";

@Entity("claim_action")
@Index("claim_action_batch_id_idx", ["batchId"])
@Index("claim_action_claimant_idx", ["claimant"])
@Index("claim_action_tx_hash_idx", ["txHash"])
@Index("claim_action_batch_claimant_idx", ["batchId", "claimant"])
export class ClaimAction {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", comment: "Distribution batch this claim belongs to" })
  batchId!: string;

  @ManyToOne(
    () => DistributionBatch,
    (batch) => batch.claims,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "batchId" })
  batch!: DistributionBatch;

  @Column({ type: "varchar", comment: "Address that claimed tokens" })
  claimant!: string;

  @Column({
    type: "numeric",
    precision: 78,
    scale: 0,
    comment: "Claimed amount in the token's smallest unit",
  })
  amount!: string;

  @Column({ type: "varchar", comment: "Transaction hash where the claim occurred" })
  txHash!: string;

  @Column({ type: "bigint", comment: "Ledger where the claim was recorded" })
  ledgerNumber!: string;

  @Column({ type: "bigint", comment: "On-chain timestamp of the claim" })
  eventTimestamp!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
