const SUPABASE_PROJECT_REF = 'rplglfwwyavfkpvczkkj';
const SUPABASE_ACCESS_TOKEN = 'sbp_2ca1f2a407294f29509ca049b13bd6702ce2890b';

async function verifyTables() {
    console.log('🔍 DYSTOPIA: ETERNAL BATTLEGROUND - Verifying Database\n');

    const url = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`;

    // Check tables
    const tablesQuery = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN (
            'players', 'clans', 'buildings', 'territories',
            'vehicles', 'chat_messages', 'world_events', 'trades', 'leaderboards'
        )
        ORDER BY table_name;
    `;

    const tablesResponse = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: tablesQuery })
    });

    const tablesData = await tablesResponse.json();

    console.log('📊 Tables Created:');
    tablesData.forEach((row: any) => console.log('  ✓', row.table_name));

    // Count indexes
    const indexQuery = `
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename IN (
            'players', 'clans', 'buildings', 'territories',
            'vehicles', 'chat_messages', 'world_events', 'trades', 'leaderboards'
        );
    `;

    const indexResponse = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: indexQuery })
    });

    const indexData = await indexResponse.json();

    console.log(`\n📈 Total Indexes: ${indexData[0].count}`);

    // Get sample row counts
    const countQuery = `
        SELECT
            (SELECT COUNT(*) FROM players) as players_count,
            (SELECT COUNT(*) FROM clans) as clans_count,
            (SELECT COUNT(*) FROM buildings) as buildings_count;
    `;

    const countResponse = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: countQuery })
    });

    const countData = await countResponse.json();

    console.log('\n📝 Current Data:');
    console.log(`  Players: ${countData[0].players_count}`);
    console.log(`  Clans: ${countData[0].clans_count}`);
    console.log(`  Buildings: ${countData[0].buildings_count}`);

    console.log('\n🔥 DYSTOPIA: ETERNAL BATTLEGROUND DATABASE IS LIVE! 🔥');
    console.log('\n⚔️  The persistent world awaits... ⚔️\n');
}

verifyTables().catch(console.error);
