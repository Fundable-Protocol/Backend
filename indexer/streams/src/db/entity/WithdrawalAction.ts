import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Stream } from "./Stream.js";

@Entity("stream_withdrawal_action")
export class WithdrawalAction {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({
    type: "varchar",
    comment: "The ID of the stream this withdrawal belongs to",
  })
  streamId!: string;

  @ManyToOne(() => Stream, { onDelete: "CASCADE" })
  @JoinColumn({ name: "streamId" })
  stream!: Stream;

  @Column({ type: "varchar" })
  recipient!: string;

  @Column({ type: "bigint", comment: "The amount withdrawn" })
  amount!: string;

  @Column({
    type: "varchar",
    comment: "Transaction hash where withdrawal occurred",
  })
  txHash!: string;

  @Column({ type: "bigint", comment: "Timestamp of the withdrawal" })
  timestamp!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
