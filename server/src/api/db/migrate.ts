import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { Config } from '../../config';

async function main() {
    const connectionString = `postgresql://${Config.database.user}:${Config.database.password}@${Config.database.host}:${Config.database.port}/${Config.database.database}`;

    console.log('Connecting to database...');
    console.log('Host:', Config.database.host);
    console.log('Database:', Config.database.database);

    const client = postgres(connectionString, { max: 1 });
    const db = drizzle(client);

    console.log('Running migrations...');

    await migrate(db, { migrationsFolder: './src/api/db/drizzle' });

    console.log('Migrations complete!');

    await client.end();
}

main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
