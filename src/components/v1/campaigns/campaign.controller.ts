import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

import { ConflictError } from '../../../utils/errorHandler';
import { createCampaignOnChain } from '../../../utils/starknetService';
import {
    getUserWalletBalance,
    verifyTokenContract,
} from '../../../utils/blockchainUtils';
import { u256FromString, isValidContractAddress } from '../../../utils/helper';
import { isCampaignRefUnique, saveCampaign } from './campaign.service';
import logger from '../../../utils/logger';
import { StarknetError } from '../../../types/campaign';

const POSTGRES_UNIQUE_VIOLATION = '23505';

function isUniqueConstraintError(err: unknown): boolean {
    if (err instanceof QueryFailedError) {
        const code = (err as { driverError?: { code?: string } }).driverError?.code;
        return code === POSTGRES_UNIQUE_VIOLATION;
    }
    const msg = (err as Error)?.message?.toLowerCase() ?? '';
    return (
        msg.includes('unique constraint') ||
        msg.includes('duplicate key') ||
        msg.includes('already exists')
    );
}

export const createCampaign = async (req: Request, res: Response) => {
    try {
        const { campaign_ref, target_amount, donation_token } = req.body;

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

        if (!req.user?.walletAddress) {
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
                    message: 'Insufficient donation token balance',
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
                    message:
                        'Donation token contract does not exist or is not verified',
                    details: {},
                },
            });
        }

        let campaign_id: string;
        let transaction_hash: string;

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
            const error = err as StarknetError & { code?: string };
            const status =
                error.code === 'CAMPAIGN_REF_EMPTY' ? 400
                : error.code === 'CAMPAIGN_REF_EXISTS' ? 409
                : error.code === 'ZERO_TARGET_AMOUNT' ||
                    error.code === 'INVALID_CONTRACT_ADDRESS'
                    ? 400
                    : 500;
            const code = error.code || 'CONTRACT_ERROR';
            const message =
                (error.message as string) || 'Contract interaction failed';
            return res.status(status).json({
                success: false,
                error: { code, message, details: error.details || {} },
            });
        }

        let campaign;
        try {
            campaign = await saveCampaign({
                campaign_id,
                campaign_ref,
                target_amount,
                donation_token,
                transaction_hash,
                user_id: req.user.id,
            });
        } catch (saveErr) {
            if (saveErr instanceof ConflictError) {
                return res.status(409).json({
                    success: false,
                    error: {
                        code: 'DUPLICATE_CAMPAIGN',
                        message:
                            'Campaign already exists. Manual recovery may be required. Support has been notified.',
                        details: { campaign_id, transaction_hash },
                    },
                });
            }

            const recoveryMetadata = {
                event: 'CAMPAIGN_SAVE_FAILED_AFTER_ONCHAIN',
                campaign_id,
                transaction_hash,
                user_id: req.user.id,
                campaign_ref,
                target_amount,
                donation_token,
                error_message: (saveErr as Error).message,
                error_name: (saveErr as Error).name,
            };
            logger.error('Campaign DB save failed after on-chain creation', recoveryMetadata);

            if (isUniqueConstraintError(saveErr)) {
                return res.status(409).json({
                    success: false,
                    error: {
                        code: 'DUPLICATE_CAMPAIGN',
                        message:
                            'Campaign already exists. Manual recovery may be required. Support has been notified.',
                        details: { campaign_id, transaction_hash },
                    },
                });
            }

            return res.status(500).json({
                success: false,
                error: {
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'Failed to persist campaign after on-chain creation',
                    details: {},
                },
            });
        }

        logger.info('CAMPAIGN_CREATED', {
            user_id: req.user.id,
            campaign_id,
            campaign_ref,
            transaction_hash,
        });

        return res.status(201).json({
            success: true,
            data: {
                campaign_id,
                campaign_ref,
                target_amount,
                donation_token,
                transaction_hash,
                created_at: campaign.created_at.toISOString(),
            },
        });
    } catch (err) {
        const error = err as Error;
        logger.error('createCampaign error', { message: error.message });
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Internal server error',
                details: {},
            },
        });
    }
};
