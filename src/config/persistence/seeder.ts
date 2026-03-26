import logger from '../../utils/logger';

/**
 * Seeding is intentionally disabled.
 *
 * The previous seeding implementation referenced modules/constants that are not
 * present in this repository snapshot, and blocked the server from booting.
 */
const initiateSeeding = async () => {
    logger.info('Seeding disabled (no-op).');
};

export default initiateSeeding;
