import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

export const databaseConfig: Partial<PostgresConnectionOptions> = {
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    password: '123',
    username: 'postgres',
    database: 'postgres',
    synchronize: true,
    logging: true,
};