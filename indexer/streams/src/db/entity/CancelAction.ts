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

@Entity("stream_cancel_action")
export class CancelAction {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({
    type: "varchar",
    comment: "The ID of the stream this cancel action belongs to",
  })
  streamId!: string;

  @ManyToOne(() => Stream, { onDelete: "CASCADE" })
  @JoinColumn({ name: "streamId" })
  stream!: Stream;

  @Column({
    type: "varchar",
    comment: "The address that triggered the cancellation",
  })
  canceler!: string;

  @Column({
    type: "varchar",
    comment: "Transaction hash where cancellation occurred",
  })
  txHash!: string;

  @Column({ type: "bigint", comment: "Timestamp of the cancellation" })
  timestamp!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
