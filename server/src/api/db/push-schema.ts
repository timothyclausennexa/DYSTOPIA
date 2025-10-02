import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
import { Config } from '../../config';

async function main() {
    const connectionString = `postgresql://${Config.database.user}:${Config.database.password}@${Config.database.host}:${Config.database.port}/${Config.database.database}`;

    console.log('🔗 Connecting to Supabase database...');
    console.log('📍 Host:', Config.database.host);
    console.log('💾 Database:', Config.database.database);

    const client = postgres(connectionString);
    const db = drizzle(client, { schema });

    console.log('\n⚡ Testing connection...');

    try {
        const result = await db.execute(sql`SELECT NOW()`);
        console.log('✅ Connection successful!');
        console.log('⏰ Server time:', result[0]);
    } catch (error) {
        console.error('❌ Connection failed:', error);
        process.exit(1);
    }

    console.log('\n📊 Schema is defined. Use Drizzle Studio or manual migration to create tables.');
    console.log('\nNext steps:');
    console.log('1. Install postgres: pnpm add postgres');
    console.log('2. Run: pnpx drizzle-kit push');
    console.log('3. Or use Supabase SQL Editor to create tables manually');

    await client.end();
    console.log('\n✅ Done!');
}

main().catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
});
