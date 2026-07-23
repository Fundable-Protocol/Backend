import { DataSource } from 'typeorm';
import { config } from '../../../../src/config'; // Adjust path based on your structure

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: config.INDEXER_DATABASE_URL,
  synchronize: false,
  logging: true,
  entities: [__dirname + '/../entities/*.ts'],
  migrations: [__dirname + '/../migrations/*.ts'],
});
