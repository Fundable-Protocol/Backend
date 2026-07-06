import { Decimal } from 'decimal.js';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import type { DonationEntity } from './donation.entity';
import type {
    CreateDonationInput,
    ListDonationsQuery,
} from './donation.validation';
import type {
    DonationResponseDto,
    PaginatedResponse,
    DonationStatsDto,
} from './donation.dto';
import { DonationStatus } from '../../../types/enums';

const SORT_FIELD_MAP: Record<string, string> = {
    created_at: 'donation.createdAt',
    amount: 'donation.amount',
    status: 'donation.status',
    confirmed_at: 'donation.confirmedAt',
    campaign_ref: 'donation.campaignRef',
    campaign_title: 'donation.campaignTitle',
    donor_address: 'donation.donorAddress',
};

export class DonationService {
    constructor(
        private readonly donationRepository: Repository<DonationEntity>
    ) {}

    async createDonation(
        dto: CreateDonationInput
    ): Promise<DonationResponseDto> {
        const data: Partial<DonationEntity> = {
            campaignId: dto.campaignId,
            campaignRef: dto.campaignRef ?? null,
            campaignTitle: dto.campaignTitle ?? null,
            donorId: dto.donorId ?? null,
            donorAddress: dto.donorAddress.toLowerCase(),
            donorName: dto.donorName ?? null,
            tokenAddress: dto.tokenAddress.toLowerCase(),
            tokenSymbol: dto.tokenSymbol.toUpperCase(),
            tokenDecimals: dto.tokenDecimals,
            amount: dto.amount,
            usdAmount: dto.usdAmount ?? '0',
            gasFee: dto.gasFee ?? '0',
            transactionHash: dto.transactionHash ?? null,
            blockNumber: dto.blockNumber ?? null,
            blockTimestamp: dto.blockTimestamp
                ? new Date(dto.blockTimestamp)
                : null,
            network: dto.network ?? ('mainnet' as any),
            isAnonymous: dto.isAnonymous ?? false,
            message: dto.message ?? null,
            status: DonationStatus.PENDING,
        };

        const entity = this.donationRepository.create(data);
        const saved = await this.donationRepository.save(entity);
        return this.formatResponse(saved);
    }

    async listDonations(
        query: ListDonationsQuery
    ): Promise<PaginatedResponse<DonationResponseDto>> {
        const qb = this.buildBaseQuery(query);

        const totalRows = await qb.getCount();
        const totalPages = Math.ceil(totalRows / query.limit);

        const sortColumn =
            SORT_FIELD_MAP[query.sort_by] ?? 'donation.createdAt';
        qb.orderBy(sortColumn, query.sort_order === 'asc' ? 'ASC' : 'DESC');
        qb.skip((query.page - 1) * query.limit).take(query.limit);

        const entities = await qb.getMany();
        const data = entities.map((e) => this.formatResponse(e, true));

        return {
            data,
            meta: {
                page: query.page,
                limit: query.limit,
                totalRows,
                totalPages,
            },
        };
    }

    async getDonationById(id: string): Promise<DonationResponseDto | null> {
        const entity = await this.donationRepository.findOne({ where: { id } });
        return entity ? this.formatResponse(entity) : null;
    }

    async getDonationsByCampaign(
        campaignId: string,
        query: Omit<ListDonationsQuery, 'campaign_id'>
    ): Promise<PaginatedResponse<DonationResponseDto>> {
        const qb = this.buildBaseQuery({ ...query, campaign_id: campaignId });

        const totalRows = await qb.getCount();
        const totalPages = Math.ceil(totalRows / query.limit);

        const sortColumn =
            SORT_FIELD_MAP[query.sort_by] ?? 'donation.createdAt';
        qb.orderBy(sortColumn, query.sort_order === 'asc' ? 'ASC' : 'DESC');
        qb.skip((query.page - 1) * query.limit).take(query.limit);

        const entities = await qb.getMany();
        const data = entities.map((e) => this.formatResponse(e));

        return {
            data,
            meta: {
                page: query.page,
                limit: query.limit,
                totalRows,
                totalPages,
            },
        };
    }

    async getDonationsByDonor(
        donorId: string,
        query: Omit<ListDonationsQuery, 'donor_id'>
    ): Promise<PaginatedResponse<DonationResponseDto>> {
        const qb = this.buildBaseQuery({ ...query, donor_id: donorId });

        const totalRows = await qb.getCount();
        const totalPages = Math.ceil(totalRows / query.limit);

        const sortColumn =
            SORT_FIELD_MAP[query.sort_by] ?? 'donation.createdAt';
        qb.orderBy(sortColumn, query.sort_order === 'asc' ? 'ASC' : 'DESC');
        qb.skip((query.page - 1) * query.limit).take(query.limit);

        const entities = await qb.getMany();
        const data = entities.map((e) => this.formatResponse(e));

        return {
            data,
            meta: {
                page: query.page,
                limit: query.limit,
                totalRows,
                totalPages,
            },
        };
    }

    async getDonationStats(campaignId?: string): Promise<DonationStatsDto> {
        const qb = this.donationRepository
            .createQueryBuilder('donation')
            .select('COUNT(donation.id)', 'totalDonations')
            .addSelect(
                'COALESCE(SUM(CAST(donation.amount AS numeric)), 0)',
                'totalAmount'
            )
            .addSelect(
                'COALESCE(SUM(CAST(donation.usdAmount AS numeric)), 0)',
                'totalUsdAmount'
            )
            .addSelect('COUNT(DISTINCT donation.donorAddress)', 'uniqueDonors');

        if (campaignId) {
            qb.where('donation.campaignId = :campaignId', { campaignId });
        }

        const result = await qb.getRawOne<{
            totalDonations: string;
            totalAmount: string;
            totalUsdAmount: string;
            uniqueDonors: string;
        }>();

        const totalDonations = Number(result?.totalDonations ?? 0);
        const totalAmount = result?.totalAmount ?? '0';
        const totalUsdAmount = result?.totalUsdAmount ?? '0';

        const avgAmount =
            totalDonations > 0
                ? new Decimal(totalAmount).div(totalDonations).toString()
                : '0';
        const avgUsdAmount =
            totalDonations > 0
                ? new Decimal(totalUsdAmount).div(totalDonations).toString()
                : '0';

        return {
            totalAmount,
            totalUsdAmount,
            totalDonations,
            uniqueDonors: Number(result?.uniqueDonors ?? 0),
            averageAmount: avgAmount,
            averageUsdAmount: avgUsdAmount,
        };
    }

    private buildBaseQuery(
        query: Partial<ListDonationsQuery>
    ): SelectQueryBuilder<DonationEntity> {
        const qb = this.donationRepository.createQueryBuilder('donation');

        if (query.campaign_id) {
            qb.andWhere('donation.campaignId = :campaignId', {
                campaignId: query.campaign_id,
            });
        }

        if (query.donor_id) {
            qb.andWhere('donation.donorId = :donorId', {
                donorId: query.donor_id,
            });
        }

        if (query.donation_token) {
            qb.andWhere('donation.tokenAddress = :tokenAddress', {
                tokenAddress: query.donation_token.toLowerCase(),
            });
        }

        if (query.status) {
            qb.andWhere('donation.status = :status', { status: query.status });
        }

        if (query.confirmed === true) {
            qb.andWhere('donation.status = :confirmedStatus', {
                confirmedStatus: DonationStatus.CONFIRMED,
            });
        } else if (query.confirmed === false) {
            qb.andWhere('donation.status != :confirmedStatus', {
                confirmedStatus: DonationStatus.CONFIRMED,
            });
        }

        if (query.from_date) {
            qb.andWhere('donation.createdAt >= :fromDate', {
                fromDate: new Date(query.from_date),
            });
        }

        if (query.to_date) {
            qb.andWhere('donation.createdAt <= :toDate', {
                toDate: new Date(query.to_date),
            });
        }

        if (query.min_amount) {
            qb.andWhere('CAST(donation.amount AS numeric) >= :minAmount', {
                minAmount: query.min_amount,
            });
        }

        if (query.max_amount) {
            qb.andWhere('CAST(donation.amount AS numeric) <= :maxAmount', {
                maxAmount: query.max_amount,
            });
        }

        if (query.search) {
            qb.andWhere(
                '(donation.donorAddress ILIKE :search OR donation.donorName ILIKE :search OR donation.campaignRef ILIKE :search OR donation.campaignTitle ILIKE :search)',
                { search: `%${query.search}%` }
            );
        }

        return qb;
    }

    private formatResponse(
        entity: DonationEntity,
        isAdmin = false
    ): DonationResponseDto {
        const showIdentity = !entity.isAnonymous || isAdmin;
        return {
            id: entity.id,
            campaignId: entity.campaignId,
            campaignRef: entity.campaignRef,
            campaignTitle: entity.campaignTitle,
            donorId: showIdentity ? entity.donorId : null,
            donorAddress: showIdentity ? entity.donorAddress : '',
            donorName: showIdentity ? entity.donorName : null,
            transactionHash: entity.transactionHash,
            blockNumber: entity.blockNumber,
            blockTimestamp: entity.blockTimestamp,
            gasFee: entity.gasFee,
            amount: entity.amount,
            usdAmount: entity.usdAmount,
            tokenAddress: entity.tokenAddress,
            tokenSymbol: entity.tokenSymbol,
            tokenDecimals: entity.tokenDecimals,
            status: entity.status,
            confirmedAt: entity.confirmedAt,
            isAnonymous: entity.isAnonymous,
            message: showIdentity ? entity.message : null,
            network: entity.network,
            createdAt: entity.createdAt,
            updatedAt: entity.updatedAt,
        };
    }
}
