import type { Response } from 'express';

import AppDataSource from '../../../config/persistence/data-source';
import { sendError, sendSuccess } from '../../../utils/apiResponse';
import type { IRequest } from '../../../types/global';
import walletRepository from './wallet.services';

export const listWallets = async (_req: IRequest, res: Response) => {
    try {
        if (!AppDataSource.isInitialized) {
            return sendError(res, 500, {
                code: 'DB_NOT_READY',
                message: 'Database not initialized',
            });
        }

        const wallets = await walletRepository.find();
        return sendSuccess(res, wallets);
    } catch (error) {
        const err = error as Error;
        return sendError(res, 500, {
            code: 'WALLET_LIST_FAILED',
            message: 'Failed to retrieve wallets',
            details: { reason: err.message },
        });
    }
};
