import { Response } from 'express';

import walletRepository from './wallet.services';
import { sendSuccess, sendError } from '../../../utils/apiResponse';
import { IRequest } from '../../../types/global';

export const listWallets = async (req: IRequest, res: Response) => {
    try {
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
