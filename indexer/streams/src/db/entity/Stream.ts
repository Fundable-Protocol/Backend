import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity("stream")
export class Stream {
  @PrimaryColumn({
    type: "varchar",
    comment: "The unique ID of the stream (usually contract ID or deterministic stream ID)",
  })
  id!: string;

  @Column({ type: "varchar", comment: "The address of the sender" })
  sender!: string;

  @Column({ type: "varchar", comment: "The address of the recipient" })
  recipient!: string;

  @Column({ type: "varchar", comment: "The token asset address" })
  token!: string;

  @Column({ type: "bigint", comment: "The total amount of tokens in the stream" })
  totalAmount!: string;

  @Column({ type: "bigint", comment: "The start time of the stream as unix timestamp" })
  startTime!: string;

  @Column({ type: "bigint", comment: "The end time of the stream as unix timestamp" })
  endTime!: string;

  @Column({ type: "bigint", default: "0", comment: "Total amount withdrawn so far" })
  amountWithdrawn!: string;

  @Column({ type: "boolean", default: false, comment: "Whether the stream was canceled" })
  canceled!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
