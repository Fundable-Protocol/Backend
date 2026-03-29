import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index, BeforeInsert } from "typeorm"
import { uuid } from "../../../utils"
import { Network } from "../../../types/enums"

@Entity("wallet")
@Index("Wallet_address_idx", ["address"])
@Index("Wallet_network_idx", ["network"])
export class WalletEntity {
  @PrimaryColumn("text")
  id: string

  @Column("text", { nullable: false, unique: true })
  address: string

  @Column({
    type: "enum",
    enum: Network,
    nullable: false,
  })
  network: Network

  @Column("text", { name: "chain_id", nullable: false })
  chainId: string

  @Column("text", { name: "chain_name", nullable: false })
  chainName: string

  @Column("decimal", {
    precision: 65,
    scale: 30,
    default: "0",
  })
  balance: string

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp",
    precision: 3,
  })
  createdAt: Date

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamp",
    precision: 3,
  })
  updatedAt: Date

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuid()
    }
  }
}

export default WalletEntity
