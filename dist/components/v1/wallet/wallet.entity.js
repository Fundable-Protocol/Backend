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
exports.WalletEntity = void 0;
const typeorm_1 = require("typeorm");
const utils_1 = require("../../../utils");
const enums_1 = require("../../../types/enums");
let WalletEntity = class WalletEntity {
    id;
    address;
    network;
    chainId;
    chainName;
    balance;
    createdAt;
    updatedAt;
    generateId() {
        if (!this.id) {
            this.id = (0, utils_1.uuid)();
        }
    }
};
exports.WalletEntity = WalletEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)("text"),
    __metadata("design:type", String)
], WalletEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: false, unique: true }),
    __metadata("design:type", String)
], WalletEntity.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: "enum",
        enum: enums_1.Network,
        nullable: false,
    }),
    __metadata("design:type", String)
], WalletEntity.prototype, "network", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { name: "chain_id", nullable: false }),
    __metadata("design:type", String)
], WalletEntity.prototype, "chainId", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { name: "chain_name", nullable: false }),
    __metadata("design:type", String)
], WalletEntity.prototype, "chainName", void 0);
__decorate([
    (0, typeorm_1.Column)("decimal", {
        precision: 65,
        scale: 30,
        default: "0",
    }),
    __metadata("design:type", String)
], WalletEntity.prototype, "balance", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({
        name: "created_at",
        type: "timestamp",
        precision: 3,
    }),
    __metadata("design:type", Date)
], WalletEntity.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({
        name: "updated_at",
        type: "timestamp",
        precision: 3,
    }),
    __metadata("design:type", Date)
], WalletEntity.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WalletEntity.prototype, "generateId", null);
exports.WalletEntity = WalletEntity = __decorate([
    (0, typeorm_1.Entity)("wallet"),
    (0, typeorm_1.Index)("Wallet_address_idx", ["address"]),
    (0, typeorm_1.Index)("Wallet_network_idx", ["network"])
], WalletEntity);
exports.default = WalletEntity;
