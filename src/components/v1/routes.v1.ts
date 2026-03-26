import EnhancedRouter from '../../utils/enhancedRouter';

import distributionRoutes from "./distribution/distrubtion.routes"


const routerV1 = new EnhancedRouter();

routerV1.use("/distributions", distributionRoutes)

export default routerV1.getRouter();
