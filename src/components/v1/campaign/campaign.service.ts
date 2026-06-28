import type { Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';

import CampaignEntity from './campaign.entity';
import type AuditLogEntity from '../audit/auditLog.entity';

import WalletEntity from '../wallet/wallet.entity';
import UserEntity from '../user/user.entity';
import type { CairoCampaignClient } from '../../../services/cairo/campaignFactory.client';
import { uuid } from '../../../utils';

export class CampaignService {
    constructor(
        private readonly campaignRepository: Repository<CampaignEntity>,
        private readonly auditRepository: Repository<AuditLogEntity>,
        private readonly walletRepository: Repository<WalletEntity>,
        private readonly userRepository: Repository<UserEntity>,
        private readonly cairoClient: CairoCampaignClient
    ) {}

    async createCampaign(args: {
        userId: string;
        walletAddress?: string;
        campaignRef: string;
        targetAmount: string;
        donationToken: string;
        title?: string | null;
    }) {
        const {
            userId,
            walletAddress,
            campaignRef,
            targetAmount,
            donationToken,
            title,
        } = args;

        if (!walletAddress) {
            const error = new Error('Missing wallet address in token claims');
            (error as any).code = 'MISSING_WALLET_ADDRESS';
            throw error;
        }

        const wallet = await this.walletRepository.findOne({
            where: { address: walletAddress },
        });

        if (!wallet) {
            const error = new Error('Wallet not found');
            (error as any).code = 'WALLET_NOT_FOUND';
            throw error;
        }

        const walletBalance = Number.parseFloat(wallet.balance ?? '0');
        if (!Number.isFinite(walletBalance) || walletBalance <= 0) {
            const error = new Error('Insufficient wallet balance for fees');
            (error as any).code = 'INSUFFICIENT_BALANCE';
            throw error;
        }

        // Reserve campaign_ref in DB first (unique constraint guards against duplicates)
        const localCampaignId = uuid();
        let campaign: CampaignEntity;
        try {
            campaign = await this.campaignRepository.save(
                this.campaignRepository.create({
                    campaignId: localCampaignId,
                    userId,
                    campaignRef,
                    targetAmount,
                    donationToken,
                    title: title ?? null,
                })
            );
        } catch (error: unknown) {
            if (
                (error instanceof QueryFailedError ||
                    (error as any)?.name === 'QueryFailedError') &&
                (error as any).code === '23505'
            ) {
                const dupError = new Error('Duplicate campaign_ref');
                (dupError as any).code = 'DUPLICATE_CAMPAIGN_REF';
                throw dupError;
            }
            throw error;
        }

        const { transactionHash, campaignId: chainCampaignId } =
            await this.cairoClient.createCampaign({
                campaignRef,
                targetAmount,
                donationToken,
            });

        await this.campaignRepository
            .createQueryBuilder()
            .update(CampaignEntity)
            .set({ campaignId: chainCampaignId, transactionHash })
            .where('campaign_id = :id', { id: localCampaignId })
            .execute();

        await this.auditRepository.save(
            this.auditRepository.create({
                userId,
                action: 'campaign.create',
                entity: 'campaign',
                entityId: chainCampaignId,
                details: {
                    campaignRef,
                    donationToken,
                    transactionHash,
                },
            } as any)
        );

        await this.userRepository
            .createQueryBuilder()
            .update()
            .set({ campaignCount: () => 'COALESCE(campaign_count, 0) + 1' })
            .where('id = :id', { id: userId })
            .execute();

        return { ...campaign, campaignId: chainCampaignId, transactionHash };
    }
}
