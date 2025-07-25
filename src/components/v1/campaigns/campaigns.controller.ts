import { Request, Response } from 'express';
import { validateCampaignInput } from './campaigns.validation';
import { createCampaignOnChain } from '../../../utils/starknetService';
import { saveCampaignToDb, isCampaignRefUnique } from './campaigns.db';
import logAudit from '../../../utils/logger';
import { getUserWalletBalance, verifyTokenContract } from '../../../utils/blockchainUtils';
import { u256FromString, isValidContractAddress } from '../../../utils/helper';
import dayjs from 'dayjs';

export const createCampaignController = async (req: Request, res: Response) => {
  try {
    // Input validation
    const { error, value } = validateCampaignInput(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: error.message,
          details: error.details || {},
        },
      });
    }
    const { campaign_ref, target_amount, donation_token } = value;

    // Check campaign_ref uniqueness
    const isUnique = await isCampaignRefUnique(campaign_ref);
    if (!isUnique) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_CAMPAIGN_REF',
          message: 'Campaign reference already exists',
          details: {},
        },
      });
    }

    // Business logic validation
    if (!req.user || !req.user.walletAddress) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          details: {},
        },
      });
    }
    const userWallet = req.user.walletAddress;
    const balance = await getUserWalletBalance(userWallet, donation_token);
    if (!balance || balance.lte(0n)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_BALANCE',
          message: 'Insufficient wallet balance for transaction fees',
          details: {},
        },
      });
    }
    if (!isValidContractAddress(donation_token)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CONTRACT_ADDRESS',
          message: 'Donation token contract address is invalid',
          details: {},
        },
      });
    }
    const tokenVerified = await verifyTokenContract(donation_token);
    if (!tokenVerified) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'TOKEN_NOT_VERIFIED',
          message: 'Donation token contract does not exist or is not verified',
          details: {},
        },
      });
    }

    // Interact with Cairo contract
    let campaign_id, transaction_hash;
    try {
      const result = await createCampaignOnChain({
        campaign_ref,
        target_amount: u256FromString(target_amount),
        donation_token,
        userWallet,
      });
      if (!result.campaign_id) {
        throw new Error('Failed to retrieve campaign_id from transaction');
      }
      campaign_id = result.campaign_id;
      transaction_hash = result.transaction_hash;
    } catch (err) {
      const error = err as { code?: string; message?: string; details?: any };
      // Map contract errors to HTTP status
      let status = 500, code = 'CONTRACT_ERROR', message = 'Contract interaction failed';
      if (error.code === 'CAMPAIGN_REF_EMPTY') {
        status = 400; code = 'EMPTY_CAMPAIGN_REF'; message = 'Campaign reference is empty';
      } else if (error.code === 'CAMPAIGN_REF_EXISTS') {
        status = 409; code = 'DUPLICATE_CAMPAIGN_REF'; message = 'Campaign reference already exists';
      } else if (error.code === 'ZERO_TARGET_AMOUNT') {
        status = 400; code = 'ZERO_TARGET_AMOUNT'; message = 'Target amount must be greater than zero';
      } else if (error.code === 'INVALID_CONTRACT_ADDRESS') {
        status = 400; code = 'INVALID_CONTRACT_ADDRESS'; message = 'Donation token contract address is invalid';
      }
      return res.status(status).json({
        success: false,
        error: {
          code,
          message,
          details: error.details || {},
        },
      });
    }

    // Store campaign metadata in DB
    const campaign = await saveCampaignToDb({
      campaign_id,
      campaign_ref,
      target_amount,
      donation_token,
      transaction_hash,
      user_id: req.user.id,
      created_at: dayjs().toISOString(),
    });

    // Audit log
    logAudit.info('CAMPAIGN_CREATED', {
      user_id: req.user.id,
      campaign_id,
      campaign_ref,
      transaction_hash,
    });

    // Response
    return res.status(201).json({
      success: true,
      data: {
        campaign_id,
        campaign_ref,
        target_amount,
        donation_token,
        transaction_hash,
        created_at: campaign.created_at,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: err.message || 'Internal server error',
        details: err.details || {},
      },
    });
  }
};
