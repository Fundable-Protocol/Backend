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
exports.CampaignEntity = void 0;
const typeorm_1 = require("typeorm");
const utils_1 = require("../../../utils");
let CampaignEntity = class CampaignEntity {
    campaignId;
    userId;
    campaignRef;
    targetAmount;
    donationToken;
    transactionHash;
    createdAt;
    ensureId() {
        if (!this.campaignId)
            this.campaignId = (0, utils_1.uuid)();
    }
};
exports.CampaignEntity = CampaignEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)("text", { name: "campaign_id" }),
    __metadata("design:type", String)
], CampaignEntity.prototype, "campaignId", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { name: "user_id", nullable: false }),
    __metadata("design:type", String)
], CampaignEntity.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { name: "campaign_ref", nullable: false }),
    __metadata("design:type", String)
], CampaignEntity.prototype, "campaignRef", void 0);
__decorate([
    (0, typeorm_1.Column)("numeric", { name: "target_amount", precision: 78, scale: 0, nullable: false }),
    __metadata("design:type", String)
], CampaignEntity.prototype, "targetAmount", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { name: "donation_token", nullable: false }),
    __metadata("design:type", String)
], CampaignEntity.prototype, "donationToken", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { name: "transaction_hash", nullable: false }),
    __metadata("design:type", String)
], CampaignEntity.prototype, "transactionHash", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({
        name: "created_at",
        type: "timestamp",
        precision: 3,
        default: () => "CURRENT_TIMESTAMP",
    }),
    __metadata("design:type", Date)
], CampaignEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CampaignEntity.prototype, "ensureId", null);
exports.CampaignEntity = CampaignEntity = __decorate([
    (0, typeorm_1.Entity)("campaigns"),
    (0, typeorm_1.Index)("campaigns_campaign_ref_key", ["campaignRef"], { unique: true }),
    (0, typeorm_1.Index)("campaigns_user_id_idx", ["userId"])
], CampaignEntity);
exports.default = CampaignEntity;
