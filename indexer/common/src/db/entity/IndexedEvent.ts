import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("indexed_event")
@Unique("uq_indexed_event_identity", ["contractId", "ledgerNumber", "txHash", "eventIndex"])
export class IndexedEvent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar" })
  contractId!: string;

  @Column({ type: "int" })
  ledgerNumber!: number;

  @Column({ type: "varchar" })
  txHash!: string;

  @Column({ type: "int" })
  eventIndex!: number;

  @CreateDateColumn()
  processedAt!: Date;
}
