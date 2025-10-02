import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://rplglfwwyavfkpvczkkj.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwbGdsZnd3eWF2ZmtwdmN6a2tqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMxMjAzNSwiZXhwIjoyMDc0ODg4MDM1fQ.ovJ3ANtq_ZnjjvG3Q-6GZ2JzOChTuR5S2o25RRdh0hQ';

async function setupDatabase() {
    console.log('🔥 DYSTOPIA: ETERNAL BATTLEGROUND - Database Setup\n');

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    console.log('✅ Supabase client created');
    console.log('📍 Project URL:', SUPABASE_URL);

    // Read SQL migration file
    const sqlPath = path.join(process.cwd(), 'src/api/db/migrations/001_create_dystopia_tables.sql');

    if (!fs.existsSync(sqlPath)) {
        console.error('❌ Migration file not found:', sqlPath);
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf-8');
    console.log('\n📄 Loaded migration SQL (' + Math.round(sql.length / 1024) + 'KB)');

    console.log('\n🚀 Executing migration...\n');

    try {
        // Execute SQL using Supabase
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

        if (error) {
            console.error('❌ Migration failed:', error);

            // Try alternative: split and execute statements
            console.log('\n🔄 Trying alternative approach...');

            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'));

            let successCount = 0;
            let failCount = 0;

            for (const statement of statements) {
                if (statement.length < 10) continue;

                try {
                    const { error: stmtError } = await supabase.rpc('exec_sql', {
                        sql_query: statement + ';'
                    });

                    if (stmtError) {
                        console.log('⚠️  Statement failed:', stmtError.message);
                        failCount++;
                    } else {
                        successCount++;
                        process.stdout.write('.');
                    }
                } catch (err) {
                    failCount++;
                    process.stdout.write('x');
                }
            }

            console.log(`\n\n📊 Results: ${successCount} succeeded, ${failCount} failed`);
        } else {
            console.log('✅ Migration executed successfully!');
            console.log('📊 Data:', data);
        }

    } catch (err) {
        console.error('❌ Unexpected error:', err);

        console.log('\n\n📝 MANUAL SETUP INSTRUCTIONS:');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('1. Go to: https://supabase.com/dashboard/project/rplglfwwyavfkpvczkkj/sql');
        console.log('2. Click "New Query"');
        console.log('3. Copy/paste the SQL from:');
        console.log('   server/src/api/db/migrations/001_create_dystopia_tables.sql');
        console.log('4. Click "Run"');
        console.log('═══════════════════════════════════════════════════════════\n');
    }

    // Test connection by checking if we can query
    console.log('\n🔍 Testing database connection...');

    try {
        const { data: tables, error: testError } = await supabase
            .from('players')
            .select('id')
            .limit(1);

        if (testError) {
            if (testError.message.includes('does not exist')) {
                console.log('⚠️  Tables not created yet. Run the manual setup above.');
            } else {
                console.log('❌ Connection test failed:', testError.message);
            }
        } else {
            console.log('✅ Database connection successful!');
            console.log('🎮 Tables are ready for DYSTOPIA: ETERNAL BATTLEGROUND!');
        }
    } catch (err) {
        console.log('⚠️  Could not test connection:', err);
    }

    console.log('\n🔥 Setup script complete!\n');
}

setupDatabase().catch(console.error);
