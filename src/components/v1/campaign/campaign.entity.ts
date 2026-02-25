import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from "typeorm"
import { uuid } from "../../../utils"

@Entity("Campaign")
export class CampaignEntity {
  @PrimaryColumn("text", { name: "id" })
  id: string

  @Column("text", { name: "campaign_id", unique: true })
  campaignId: string

  @Column("text", { name: "campaign_ref", nullable: false, unique: true })
  campaignRef: string

  @Column("text", { name: "creator_address", nullable: false })
  creatorAddress: string

  @Column("text", { name: "title", nullable: false })
  title: string

  @Column("text", { name: "description", nullable: false })
  description: string

  @Column("text", { name: "target_amount", nullable: false })
  targetAmount: string

  @Column("text", { name: "current_funding", default: "0" })
  currentFunding: string

  @Column("text", { name: "donation_token", nullable: false })
  donationToken: string

  @Column("timestamp", { name: "end_date", nullable: false })
  endDate: Date

  @Column("text", { name: "image_url", nullable: true })
  imageUrl: string

  @Column("text", { array: true, nullable: true })
  tags: string[]

  @Column("jsonb", { name: "social_links", nullable: true })
  socialLinks: Record<string, string>

  @Column("text", { name: "transaction_hash", nullable: true })
  transactionHash: string

  @Column("text", { name: "status", default: "active" })
  status: string

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  updatedAt: Date

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuid()
    }
  }
}

@Entity("CampaignAudit")
export class CampaignAuditEntity {
  @PrimaryColumn("text", { name: "id" })
  id: string

  @Column("text", { name: "campaign_id", nullable: false })
  campaignId: string

  @Column("text", { name: "updated_by", nullable: false })
  updatedBy: string

  @Column("jsonb", { name: "changed_fields", nullable: false })
  changedFields: string[]

  @Column("jsonb", { name: "old_values", nullable: false })
  oldValues: Record<string, any>

  @Column("jsonb", { name: "new_values", nullable: false })
  newValues: Record<string, any>

  @Column("text", { name: "update_source", nullable: false })
  updateSource: "blockchain" | "database"

  @Column("text", { name: "transaction_hash", nullable: true })
  transactionHash: string

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuid()
    }
  }
}
