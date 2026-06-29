import EnhancedRouter from '../../utils/enhancedRouter';

import distributionRoutes from './distribution/distrubtion.routes';
import walletRoutes from './wallet/wallet.routes';

const routerV1 = new EnhancedRouter();

routerV1.use('/distributions', distributionRoutes);
routerV1.use('/wallets', walletRoutes);

export default routerV1.getRouter();
