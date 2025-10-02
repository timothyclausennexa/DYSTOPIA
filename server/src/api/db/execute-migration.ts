import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const connectionString = 'postgresql://postgres.rplglfwwyavfkpvczkkj:Stl2019Stl!@aws-0-us-east-1.pooler.supabase.com:6543/postgres';

async function executeMigration() {
    console.log('🔥 DYSTOPIA: ETERNAL BATTLEGROUND - Executing Migration\n');

    const sql = postgres(connectionString, {
        ssl: 'require'
    });

    try {
        // Test connection
        console.log('✅ Testing connection...');
        const result = await sql`SELECT NOW() as time`;
        console.log('⏰ Server time:', result[0].time);

        // Read migration file
        const migrationPath = path.join(process.cwd(), 'src/api/db/migrations/001_create_dystopia_tables.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        console.log('\n📄 Loaded migration file (' + Math.round(migrationSQL.length / 1024) + 'KB)');

        // Execute migration
        console.log('\n🚀 Executing migration...\n');

        await sql.unsafe(migrationSQL);

        console.log('✅ Migration executed successfully!');

        // Verify tables
        console.log('\n🔍 Verifying tables...');

        const tables = await sql`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN (
                'players', 'clans', 'buildings', 'territories',
                'vehicles', 'chat_messages', 'world_events', 'trades', 'leaderboards'
            )
            ORDER BY table_name
        `;

        console.log('\n📊 Tables created:');
        tables.forEach(t => console.log('  ✓', t.table_name));

        // Count indexes
        const indexes = await sql`
            SELECT COUNT(*) as count
            FROM pg_indexes
            WHERE schemaname = 'public'
            AND tablename IN (
                'players', 'clans', 'buildings', 'territories',
                'vehicles', 'chat_messages', 'world_events', 'trades', 'leaderboards'
            )
        `;

        console.log(`\n📈 Total indexes: ${indexes[0].count}`);

        console.log('\n🎮 DYSTOPIA database is ready for eternal war! 🔥\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await sql.end();
    }
}

executeMigration().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
