import type { Repository } from "typeorm"

import CampaignEntity from "./campaign.entity"
import type AuditLogEntity from "../audit/auditLog.entity"

import WalletEntity from "../wallet/wallet.entity"
import UserEntity from "../user/user.entity"
import logger from "../../../utils/logger"
import type { CairoCampaignClient } from "../../../services/cairo/campaignFactory.client"

export class CampaignService {
  constructor(
    private readonly campaignRepository: Repository<CampaignEntity>,
    private readonly auditRepository: Repository<AuditLogEntity>,
    private readonly walletRepository: Repository<WalletEntity>,
    private readonly userRepository: Repository<UserEntity>,
    private readonly cairoClient: CairoCampaignClient
  ) {}

  async createCampaign(args: {
    userId: string
    walletAddress?: string
    campaignRef: string
    targetAmount: string
    donationToken: string
  }) {
    const { userId, walletAddress, campaignRef, targetAmount, donationToken } = args

    const existing = await this.campaignRepository.findOne({ where: { campaignRef } })
    if (existing) {
      const error = new Error("Duplicate campaign_ref")
      ;(error as any).code = "DUPLICATE_CAMPAIGN_REF"
      throw error
    }

    if (!walletAddress) {
      const error = new Error("Missing wallet address in token claims")
      ;(error as any).code = "MISSING_WALLET_ADDRESS"
      throw error
    }

    const wallet = await this.walletRepository.findOne({ where: { address: walletAddress } })

    if (!wallet) {
      const error = new Error("Wallet not found")
      ;(error as any).code = "WALLET_NOT_FOUND"
      throw error
    }

    const walletBalance = Number.parseFloat(wallet.balance ?? "0")
    if (!Number.isFinite(walletBalance) || walletBalance <= 0) {
      const error = new Error("Insufficient wallet balance for fees")
      ;(error as any).code = "INSUFFICIENT_BALANCE"
      throw error
    }

    const { transactionHash, campaignId } = await this.cairoClient.createCampaign({
      campaignRef,
      targetAmount,
      donationToken,
    })

    const saved = await this.campaignRepository.save(
      this.campaignRepository.create({
        campaignId,
        userId,
        campaignRef,
        targetAmount,
        donationToken,
        transactionHash,
      })
    )

    await this.auditRepository.save(
      this.auditRepository.create({
        userId,
        action: "campaign.create",
        entity: "campaign",
        entityId: saved.campaignId,
        details: {
          campaignRef,
          donationToken,
          transactionHash,
        },
      } as any)
    )

    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (user) {
      const nextCount = (user.campaignCount ?? 0) + 1
      await this.userRepository.update({ id: userId }, { campaignCount: nextCount })
    } else {
      logger.info(`User ${userId} not found; skipped campaignCount update`)
    }

    return saved
  }
}
