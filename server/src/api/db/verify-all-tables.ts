const SUPABASE_PROJECT_REF = 'rplglfwwyavfkpvczkkj';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_2ca1f2a407294f29509ca049b13bd6702ce2890b';

async function verifyAllTables() {
    console.log('🔥 DYSTOPIA: Verifying All Persistent World Tables\n');

    const url = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`;

    try {
        // Check which tables exist
        console.log('📊 Checking existing tables...\n');

        const tablesQuery = `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: tablesQuery
            })
        });

        const tables = await response.json();

        console.log('Existing tables:');
        tables.forEach((t: any) => console.log('  ✓', t.table_name));

        // Required tables for DYSTOPIA Eternal
        const requiredTables = [
            'players',
            'buildings',
            'clans',
            'territories',
            'vehicles',
            'chat_messages',
            'world_events',
            'trades',
            'leaderboards'
        ];

        console.log('\n🔍 Required tables status:\n');
        const existingTableNames = tables.map((t: any) => t.table_name);

        for (const table of requiredTables) {
            if (existingTableNames.includes(table)) {
                console.log(`  ✅ ${table} - EXISTS`);
            } else {
                console.log(`  ❌ ${table} - MISSING`);
            }
        }

        // Check players table columns
        console.log('\n📋 Players table columns:\n');

        const columnsQuery = `
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_name = 'players'
            ORDER BY ordinal_position;
        `;

        const colResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: columnsQuery
            })
        });

        const columns = await colResponse.json();

        if (columns && columns.length > 0) {
            columns.forEach((col: any) => {
                console.log(`  - ${col.column_name}: ${col.data_type}`);
            });
        } else {
            console.log('  ⚠️  Players table not found or has no columns');
        }

        // Check for critical features
        console.log('\n🎮 Critical Features Check:\n');

        const criticalColumns = [
            'faction',
            'faction_selected_at',
            'wood',
            'stone',
            'metal',
            'current_x',
            'current_y',
            'password_hash'
        ];

        const columnNames = columns ? columns.map((c: any) => c.column_name) : [];

        for (const col of criticalColumns) {
            if (columnNames.includes(col)) {
                console.log(`  ✅ ${col} - Ready`);
            } else {
                console.log(`  ❌ ${col} - Missing`);
            }
        }

        console.log('\n🔥 DYSTOPIA ETERNAL DATABASE STATUS 🔥\n');

    } catch (error) {
        console.error('❌ Verification failed:', error);
        throw error;
    }
}

verifyAllTables().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
