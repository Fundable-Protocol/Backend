import EnhancedRouter from '../../../utils/enhancedRouter';
import policyMiddleware from '../../../appMiddlewares/policy.middleware';
import {
    requireJwtAuthApi,
    requireAdminApi,
} from '../../../appMiddlewares/jwtAuth.api';
import {
    createDonationSchema,
    listDonationsQuerySchema,
    listCampaignDonationsQuerySchema,
    listUserDonationsQuerySchema,
    donationParamsSchema,
} from './donation.validation';
import {
    createDonation,
    listDonations,
    getDonationById,
    getCampaignDonations,
    getUserDonations,
    getMyDonations,
    getDonationStats,
} from './donation.controller';

const router = new EnhancedRouter();

router.post(
    '/',
    requireJwtAuthApi,
    policyMiddleware(createDonationSchema),
    createDonation
);

router.get('/stats', requireJwtAuthApi, requireAdminApi, getDonationStats);
router.get(
    '/campaigns/:campaignId',
    policyMiddleware(listCampaignDonationsQuerySchema, 'query'),
    getCampaignDonations
);
router.get(
    '/users/me',
    requireJwtAuthApi,
    policyMiddleware(listUserDonationsQuerySchema, 'query'),
    getMyDonations
);
router.get(
    '/users/:userId',
    requireJwtAuthApi,
    policyMiddleware(listUserDonationsQuerySchema, 'query'),
    getUserDonations
);
router.get(
    '/',
    requireJwtAuthApi,
    requireAdminApi,
    policyMiddleware(listDonationsQuerySchema, 'query'),
    listDonations
);
router.get(
    '/:id',
    requireJwtAuthApi,
    policyMiddleware(donationParamsSchema, 'params'),
    getDonationById
);

export default router.getRouter();
