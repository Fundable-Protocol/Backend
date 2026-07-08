import EnhancedRouter from '../../utils/enhancedRouter';
import policyMiddleware from '../../appMiddlewares/policy.middleware';
import {
    requireJwtAuthApi,
    requireSelfOrAdmin,
} from '../../appMiddlewares/jwtAuth.api';

import campaignRoutes from './campaign/campaign.routes';
import donationRoutes from './Donation/donation.routes';
import walletRoutes from './wallet/wallet.routes';
import {
    listCampaignDonationsQuerySchema,
    listUserDonationsQuerySchema,
} from './Donation/donation.validation';
import {
    getCampaignDonations,
    getUserDonations,
    getMyDonations,
} from './Donation/donation.controller';

const router = new EnhancedRouter();

router.use('/campaigns', campaignRoutes);
router.use('/donations', donationRoutes);
router.use('/wallets', walletRoutes);

router.get(
    '/campaigns/:campaignId/donations',
    policyMiddleware(listCampaignDonationsQuerySchema, 'query'),
    getCampaignDonations
);
router.get(
    '/users/me/donations',
    requireJwtAuthApi,
    policyMiddleware(listUserDonationsQuerySchema, 'query'),
    getMyDonations
);
router.get(
    '/users/:userId/donations',
    requireJwtAuthApi,
    requireSelfOrAdmin,
    policyMiddleware(listUserDonationsQuerySchema, 'query'),
    getUserDonations
);

export default router.getRouter();
