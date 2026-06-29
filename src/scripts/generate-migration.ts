import { exec } from 'child_process';
import { promisify } from 'util';

import logger from '../utils/logger';

const execAsync = promisify(exec);

const migrationName = process.argv[2];

if (!migrationName) {
    console.error('Please provide a migration name.');
    process.exit(1);
}

const command = `pnpm typeorm migration:generate --outputJs src/migrations/${migrationName}`;

(async () => {
    try {
        logger.info(`Running command: ${command}`);
        const { stdout, stderr } = await execAsync(command);

        if (stdout.includes('No changes in database schema were found')) {
            console.warn(
                'No schema changes detected. Skipping migration generation.'
            );
            return;
        }

        logger.info('Output:', stdout);
        if (stderr) logger.error('Error:', stderr);
    } catch (error) {
        logger.error('Failed to generate migration:', error);
    }
})();
