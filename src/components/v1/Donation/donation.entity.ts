import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  BeforeInsert,
} from "typeorm"
import { uuid } from "../../../utils"

@Entity("Campaign")
export class CampaignEntity {
  @PrimaryColumn("text", { name: "campaign_id" })
  campaignId: string

  @Column("text", { name: "campaign_ref", nullable: false })
  campaignRef: string

  @Column("text", { name: "target_amount", nullable: false })
  targetAmount: string

  @Column("text", { name: "donation_token", nullable: false })
  donationToken: string

  @Column("text", { name: "transaction_hash", nullable: false })
  transactionHash: string

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date

  @BeforeInsert()
  generateId() {
    if (!this.campaignId) {
      this.campaignId = uuid()
    }
  }
}

export default CampaignEntity
