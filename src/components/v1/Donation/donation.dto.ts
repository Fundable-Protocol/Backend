import type { DonationStatus, Network } from '../../../types/enums';

export interface DonationResponseDto {
    id: string;
    campaignId: string;
    campaignRef: string | null;
    campaignTitle: string | null;
    donorId: string | null;
    donorAddress: string;
    donorName: string | null;
    transactionHash: string | null;
    blockNumber: number | null;
    blockTimestamp: Date | null;
    gasFee: string;
    amount: string;
    usdAmount: string;
    tokenAddress: string;
    tokenSymbol: string;
    tokenDecimals: number;
    status: DonationStatus;
    confirmedAt: Date | null;
    isAnonymous: boolean;
    message: string | null;
    network: Network;
    createdAt: Date;
    updatedAt: Date;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        page: number;
        limit: number;
        totalRows: number;
        totalPages: number;
    };
}

export interface DonationStatsDto {
    totalAmount: string;
    totalUsdAmount: string;
    totalDonations: number;
    uniqueDonors: number;
    averageAmount: string;
    averageUsdAmount: string;
}

export interface ApiResponse<T> {
    data: T | null;
    success: boolean;
    message?: string;
}
