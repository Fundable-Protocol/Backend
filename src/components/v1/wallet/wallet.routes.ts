import { Router } from 'express';

import {
    requireAdminApi,
    requireJwtAuthApi,
} from '../../../appMiddlewares/jwtAuth.api';
import { listWallets } from './wallet.controller';

const router = Router();

// List all wallets (JWT + admin required)
router.get('/', requireJwtAuthApi, requireAdminApi, listWallets);

export default router;
