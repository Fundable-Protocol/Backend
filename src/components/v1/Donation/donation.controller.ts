import type { Request, Response } from 'express';
import type { IRequest } from '../../../types/global';
import { sendSuccess, sendError } from '../../../utils/apiResponse';
import AppDataSource from '../../../config/persistence/data-source';
import DonationEntity from './donation.entity';
import { DonationService } from './donation.service';
import type {
    CreateDonationInput,
    ListDonationsQuery,
} from './donation.validation';

const getService = () => {
    if (!AppDataSource.isInitialized) {
        throw new Error('Database not initialized');
    }
    return new DonationService(AppDataSource.getRepository(DonationEntity));
};

const handleError = (
    res: Response,
    error: unknown,
    defaultMessage = 'Internal server error'
) => {
    const message = error instanceof Error ? error.message : defaultMessage;
    return sendError(res, 500, { code: 'INTERNAL_ERROR', message });
};

export const createDonation = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const service = getService();
        const data = req.body as CreateDonationInput;
        const donation = await service.createDonation(data);
        sendSuccess(res, donation, 201);
    } catch (error) {
        handleError(res, error, 'Failed to create donation');
    }
};

export const listDonations = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const service = getService();
        const query = req.query as unknown as ListDonationsQuery;
        const result = await service.listDonations(query);
        sendSuccess(res, result);
    } catch (error) {
        handleError(res, error, 'Failed to list donations');
    }
};

export const getDonationById = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const service = getService();
        const { id } = req.params;
        const donation = await service.getDonationById(id);

        if (!donation) {
            sendError(res, 404, {
                code: 'NOT_FOUND',
                message: 'Donation not found',
            });
            return;
        }

        sendSuccess(res, donation);
    } catch (error) {
        handleError(res, error, 'Failed to get donation');
    }
};

export const getCampaignDonations = async (
    req: IRequest,
    res: Response
): Promise<void> => {
    try {
        const service = getService();
        const { campaignId } = req.params;
        const query = req.query as unknown as ListDonationsQuery;
        const result = await service.getDonationsByCampaign(campaignId, query);
        sendSuccess(res, result);
    } catch (error) {
        handleError(res, error, 'Failed to get campaign donations');
    }
};

export const getUserDonations = async (
    req: IRequest,
    res: Response
): Promise<void> => {
    try {
        const service = getService();
        const { userId } = req.params;
        const query = req.query as unknown as ListDonationsQuery;
        const result = await service.getDonationsByDonor(userId, query);
        sendSuccess(res, result);
    } catch (error) {
        handleError(res, error, 'Failed to get user donations');
    }
};

export const getMyDonations = async (
    req: IRequest,
    res: Response
): Promise<void> => {
    try {
        if (!req.auth?.userId) {
            sendError(res, 401, {
                code: 'AUTH_REQUIRED',
                message: 'Authentication required',
            });
            return;
        }

        const service = getService();
        const query = req.query as unknown as ListDonationsQuery;
        const result = await service.getDonationsByDonor(
            req.auth.userId,
            query
        );
        sendSuccess(res, result);
    } catch (error) {
        handleError(res, error, 'Failed to get your donations');
    }
};

export const getDonationStats = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const service = getService();
        const campaignId = req.query.campaign_id as string | undefined;
        const stats = await service.getDonationStats(campaignId);
        sendSuccess(res, stats);
    } catch (error) {
        handleError(res, error, 'Failed to get donation stats');
    }
};
