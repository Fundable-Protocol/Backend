import EnhancedRouter from '../../utils/enhancedRouter';

import platformRoutes from './platform/platform.routes';
import walletRoutes from './wallet/wallet.routes';
import distributionRoutes from "./distribution/distrubtion.routes"
import campaignRoutes from "./campaign/campaign.routes"


const routerV1 = new EnhancedRouter();

routerV1.use('/platform', platformRoutes);
routerV1.use('/wallets', walletRoutes);
routerV1.use("/distributions", distributionRoutes)
routerV1.use("/campaigns", campaignRoutes)

export default routerV1.getRouter();
