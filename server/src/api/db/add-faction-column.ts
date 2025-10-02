const SUPABASE_PROJECT_REF = 'rplglfwwyavfkpvczkkj';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_2ca1f2a407294f29509ca049b13bd6702ce2890b';

async function addFactionColumn() {
    console.log('🔥 DYSTOPIA: Adding faction column to players table\n');

    const url = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`;

    try {
        // Add faction column to players table
        console.log('🚀 Adding faction column via Supabase Management API...');

        const migrationSQL = `
            ALTER TABLE players
            ADD COLUMN IF NOT EXISTS faction VARCHAR(20);
        `;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: migrationSQL
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ API Error:', response.status, response.statusText);
            console.error('Response:', data);
            throw new Error(`API request failed: ${response.status}`);
        }

        console.log('✅ Faction column added successfully!');

        // Verify column exists
        console.log('\n🔍 Verifying column...');

        const verifyQuery = `
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'players'
            AND column_name = 'faction';
        `;

        const verifyResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: verifyQuery
            })
        });

        const verifyData = await verifyResponse.json();

        if (verifyData && verifyData.length > 0) {
            console.log('\n📊 Column created:');
            console.log('  ✓ faction:', verifyData[0].data_type, `(${verifyData[0].character_maximum_length})`);
        } else {
            console.log('\n📊 Column added (verification returned no rows)');
        }

        console.log('\n🎮 Players can now join factions! 🔥\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

addFactionColumn().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
