import type { Response } from "express"
import { ZodError } from "zod"

import type { IRequest } from "../../../types/global"
import { sendError, sendSuccess } from "../../../utils/apiResponse"
import { createCampaignSchema } from "./campaign.validation"
import AppDataSource from "../../../config/persistence/data-source"
import CampaignEntity from "./campaign.entity"
import AuditLogEntity from "../audit/auditLog.entity"
import { CampaignService } from "./campaign.service"
import { createCairoCampaignClient } from "../../../services/cairo/campaignFactory.client"
import logger from "../../../utils/logger"
import WalletEntity from "../wallet/wallet.entity"
import UserEntity from "../user/user.entity"

const mapCreateCampaignError = (error: unknown) => {
  const code = typeof (error as any)?.code === "string" ? (error as any).code : "INTERNAL_ERROR"

  switch (code) {
    case "DUPLICATE_CAMPAIGN_REF":
      return { status: 409, code, message: "campaign_ref already exists" }
    case "INSUFFICIENT_BALANCE":
      return { status: 400, code, message: "Insufficient wallet balance for transaction fees" }
    case "WALLET_NOT_FOUND":
      return { status: 400, code, message: "Wallet not found" }
    case "MISSING_WALLET_ADDRESS":
      return { status: 400, code, message: "Token does not include a wallet address claim" }
    default:
      return {
        status: 500,
        code,
        message: error instanceof Error ? error.message : "Internal server error",
      }
  }
}

export const createCampaign = async (req: IRequest, res: Response) => {
  if (!req.auth?.userId) {
    return sendError(res, 401, { code: "AUTH_REQUIRED", message: "Authentication required" })
  }

  try {
    const parsed = createCampaignSchema.parse(req.body)

    if (!AppDataSource.isInitialized) {
      return sendError(res, 500, { code: "DB_NOT_READY", message: "Database not initialized" })
    }

    const service = new CampaignService(
      AppDataSource.getRepository(CampaignEntity),
      AppDataSource.getRepository(AuditLogEntity),
      AppDataSource.getRepository(WalletEntity),
      AppDataSource.getRepository(UserEntity),
      createCairoCampaignClient()
    )

    const saved = await service.createCampaign({
      userId: req.auth.userId,
      walletAddress: req.auth.walletAddress,
      campaignRef: parsed.campaign_ref,
      targetAmount: parsed.target_amount,
      donationToken: parsed.donation_token,
    })

    return sendSuccess(
      res,
      {
        campaign_id: saved.campaignId,
        campaign_ref: saved.campaignRef,
        target_amount: saved.targetAmount,
        donation_token: saved.donationToken,
        transaction_hash: saved.transactionHash,
        created_at: saved.createdAt.toISOString(),
      },
      201
    )
  } catch (error) {
    if (error instanceof ZodError) {
      const issue = error.issues?.[0]
      return sendError(res, 400, {
        code: "VALIDATION_ERROR",
        message: issue ? `${issue.path.join(".")} ${issue.message}` : "Invalid request",
        details: { issues: error.issues },
      })
    }

    const mapped = mapCreateCampaignError(error)
    logger.error(
      JSON.stringify({
        name: (error as any)?.name,
        code: mapped.code,
        message: mapped.message,
      })
    )
    return sendError(res, mapped.status, { code: mapped.code, message: mapped.message })
  }
}
