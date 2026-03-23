import { Entity, Column, PrimaryColumn, CreateDateColumn, Index, BeforeInsert } from "typeorm"
import { uuid } from "../../../utils"

@Entity("audit_logs")
@Index("audit_logs_user_id_idx", ["userId"])
@Index("audit_logs_entity_idx", ["entity", "entityId"])
export class AuditLogEntity {
  @PrimaryColumn("text", { name: "audit_id" })
  auditId: string

  @Column("text", { name: "user_id", nullable: false })
  userId: string

  @Column("text", { nullable: false })
  action: string

  @Column("text", { nullable: false })
  entity: string

  @Column("text", { name: "entity_id", nullable: false })
  entityId: string

  @Column("jsonb", { nullable: true })
  details: Record<string, any> | null

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp",
    precision: 3,
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date

  @BeforeInsert()
  ensureId() {
    if (!this.auditId) this.auditId = uuid()
  }
}

export default AuditLogEntity

