import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index, BeforeInsert } from "typeorm"
import { uuid } from "../../../utils"

@Entity("User")
@Index("User_email_key", ["email"], { unique: true })
export class UserEntity {
  @PrimaryColumn("text")
  id: string

  @Column("text", { nullable: false })
  username: string

  @Column("text", { nullable: false, unique: true })
  email: string

  @Column("integer", { name: "campaign_count", default: 0 })
  campaignCount: number

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

export default UserEntity
