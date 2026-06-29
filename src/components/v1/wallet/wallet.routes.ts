import { Router } from 'express';

import { requireJwtAuthApi } from '../../../appMiddlewares/jwtAuth.api';
import { listWallets } from './wallet.controller';

const router = Router();

// List all wallets (JWT required)
router.get('/', requireJwtAuthApi, listWallets);

export default router;
