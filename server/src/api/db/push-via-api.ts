import fs from 'fs';
import path from 'path';

const SUPABASE_PROJECT_REF = 'rplglfwwyavfkpvczkkj';
const SUPABASE_ACCESS_TOKEN = 'sbp_2ca1f2a407294f29509ca049b13bd6702ce2890b';

async function pushMigration() {
    console.log('🔥 DYSTOPIA: ETERNAL BATTLEGROUND - Pushing Migration via API\n');

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'src/api/db/migrations/003_add_legacy_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Loaded migration (' + Math.round(migrationSQL.length / 1024) + 'KB)');

    // Use Supabase Management API to execute SQL
    const url = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`;

    console.log('\n🚀 Executing via Supabase Management API...');
    console.log('📍 Endpoint:', url);

    try {
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

        console.log('✅ Migration executed successfully!');
        console.log('📊 Response:', JSON.stringify(data, null, 2));

        console.log('\n🎮 DYSTOPIA database is ready! 🔥\n');

    } catch (error) {
        console.error('❌ Failed:', error);

        console.log('\n📝 ALTERNATIVE APPROACH:');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('Use Supabase CLI to execute the migration:');
        console.log('');
        console.log('1. Install Supabase CLI:');
        console.log('   npm install -g supabase');
        console.log('');
        console.log('2. Login:');
        console.log('   supabase login');
        console.log('');
        console.log('3. Link project:');
        console.log(`   supabase link --project-ref ${SUPABASE_PROJECT_REF}`);
        console.log('');
        console.log('4. Run migration:');
        console.log('   supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.rplglfwwyavfkpvczkkj.supabase.co:5432/postgres"');
        console.log('');
        console.log('OR manually in SQL Editor:');
        console.log('   https://supabase.com/dashboard/project/rplglfwwyavfkpvczkkj/sql');
        console.log('═══════════════════════════════════════════════════════════\n');
    }
}

pushMigration();
