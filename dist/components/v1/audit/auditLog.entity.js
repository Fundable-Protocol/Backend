"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogEntity = void 0;
const typeorm_1 = require("typeorm");
const utils_1 = require("../../../utils");
let AuditLogEntity = class AuditLogEntity {
    auditId;
    userId;
    action;
    entity;
    entityId;
    details;
    createdAt;
    ensureId() {
        if (!this.auditId)
            this.auditId = (0, utils_1.uuid)();
    }
};
exports.AuditLogEntity = AuditLogEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)("text", { name: "audit_id" }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "auditId", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { name: "user_id", nullable: false }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: false }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: false }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "entity", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { name: "entity_id", nullable: false }),
    __metadata("design:type", String)
], AuditLogEntity.prototype, "entityId", void 0);
__decorate([
    (0, typeorm_1.Column)("jsonb", { nullable: true }),
    __metadata("design:type", Object)
], AuditLogEntity.prototype, "details", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({
        name: "created_at",
        type: "timestamp",
        precision: 3,
        default: () => "CURRENT_TIMESTAMP",
    }),
    __metadata("design:type", Date)
], AuditLogEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AuditLogEntity.prototype, "ensureId", null);
exports.AuditLogEntity = AuditLogEntity = __decorate([
    (0, typeorm_1.Entity)("audit_logs"),
    (0, typeorm_1.Index)("audit_logs_user_id_idx", ["userId"]),
    (0, typeorm_1.Index)("audit_logs_entity_idx", ["entity", "entityId"])
], AuditLogEntity);
exports.default = AuditLogEntity;
