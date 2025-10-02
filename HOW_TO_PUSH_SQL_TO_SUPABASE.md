# 🔥 How to Push SQL Migrations to Supabase

## ✅ Successful Method Used for DYSTOPIA Database

This document explains how we successfully pushed SQL migrations to Supabase when direct PostgreSQL connections failed.

---

## 🎯 **The Working Solution: Supabase Management API**

### Prerequisites:
1. **Supabase Access Token** (from Supabase Dashboard → Account → Access Tokens)
2. **Project Reference ID** (from your project URL: `https://[PROJECT_REF].supabase.co`)
3. **SQL Migration File**

### Step 1: Create the Push Script

Create `server/src/api/db/push-via-api.ts`:

```typescript
import fs from 'fs';
import path from 'path';

const SUPABASE_PROJECT_REF = 'rplglfwwyavfkpvczkkj';  // Your project ID
const SUPABASE_ACCESS_TOKEN = 'sbp_xxx...';  // Your access token

async function pushMigration() {
    console.log('🔥 Pushing Migration via Supabase API\n');

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'src/api/db/migrations/001_create_dystopia_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Loaded migration (' + Math.round(migrationSQL.length / 1024) + 'KB)');

    // Use Supabase Management API
    const url = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`;

    console.log('\n🚀 Executing via Supabase Management API...');

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
}

pushMigration().catch(console.error);
```

### Step 2: Fix Foreign Key Dependencies

**IMPORTANT:** Tables must be created in the correct order to avoid foreign key errors.

❌ **Wrong Order (Fails):**
```sql
-- Players references clans, but clans doesn't exist yet
CREATE TABLE players (
    clan_id INTEGER REFERENCES clans(id)  -- ERROR!
);

CREATE TABLE clans (...);
```

✅ **Correct Order (Works):**
```sql
-- Create clans first WITHOUT foreign keys to players
CREATE TABLE clans (
    id SERIAL PRIMARY KEY,
    founder_id INTEGER,  -- No FK constraint yet
    leader_id INTEGER
);

-- Then create players that references clans
CREATE TABLE players (
    clan_id INTEGER REFERENCES clans(id)  -- Works!
);

-- Finally add foreign key constraints back to clans
ALTER TABLE clans
ADD CONSTRAINT clans_founder_fkey FOREIGN KEY (founder_id) REFERENCES players(id);

ALTER TABLE clans
ADD CONSTRAINT clans_leader_fkey FOREIGN KEY (leader_id) REFERENCES players(id);
```

### Step 3: Run the Migration

```bash
cd server
tsx src/api/db/push-via-api.ts
```

### Step 4: Verify Tables

Create `server/src/api/db/verify-tables.ts`:

```typescript
const SUPABASE_PROJECT_REF = 'rplglfwwyavfkpvczkkj';
const SUPABASE_ACCESS_TOKEN = 'sbp_xxx...';

async function verifyTables() {
    const url = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`;

    // Check tables exist
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
        body: JSON.stringify({ query: tablesQuery })
    });

    const data = await response.json();

    console.log('📊 Tables Created:');
    data.forEach((row: any) => console.log('  ✓', row.table_name));

    // Count indexes
    const indexQuery = `
        SELECT COUNT(*) as count
        FROM pg_indexes
        WHERE schemaname = 'public';
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
}

verifyTables().catch(console.error);
```

Run verification:
```bash
tsx src/api/db/verify-tables.ts
```

---

## 🚫 **Methods That Failed (For Reference)**

### 1. Direct PostgreSQL Connection ❌
```typescript
import postgres from 'postgres';

// This FAILED - hostname resolution issues
const sql = postgres('postgresql://postgres:password@db.project.supabase.co:5432/postgres');
// Error: ENOTFOUND db.project.supabase.co
```

### 2. Pooler Connection ❌
```typescript
// This FAILED - tenant not found error
const sql = postgres('postgresql://postgres.project:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres');
// Error: Tenant or user not found
```

### 3. Supabase Client RPC ❌
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, serviceKey);

// This FAILED - exec_sql function doesn't exist
await supabase.rpc('exec_sql', { sql_query: sql });
// Error: Could not find the function public.exec_sql
```

---

## 📋 **Quick Reference: Working API Method**

### Endpoint:
```
POST https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query
```

### Headers:
```json
{
  "Authorization": "Bearer {ACCESS_TOKEN}",
  "Content-Type": "application/json"
}
```

### Body:
```json
{
  "query": "YOUR SQL QUERY HERE"
}
```

### Example with curl:
```bash
curl -X POST \
  https://api.supabase.com/v1/projects/rplglfwwyavfkpvczkkj/database/query \
  -H "Authorization: Bearer sbp_xxx..." \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT NOW();"}'
```

---

## 🔑 **Key Lessons Learned**

1. **Use Supabase Management API** - Most reliable method for executing SQL
2. **Fix Foreign Key Order** - Create referenced tables first
3. **Use ALTER TABLE** - Add circular foreign keys after both tables exist
4. **Always Verify** - Query information_schema to confirm tables/indexes
5. **Check Response** - API returns empty array `[]` on success for DDL

---

## 📦 **Required Packages**

```json
{
  "dependencies": {
    "postgres": "^3.4.7",
    "@supabase/supabase-js": "^2.58.0"
  }
}
```

---

## 🎯 **For Future Migrations**

1. Create new migration file: `server/src/api/db/migrations/002_your_migration.sql`
2. Update PROJECT_REF and ACCESS_TOKEN in push script
3. Check for foreign key dependencies
4. Run: `tsx src/api/db/push-via-api.ts`
5. Verify: `tsx src/api/db/verify-tables.ts`

---

## 🔥 **Success Metrics (DYSTOPIA Database)**

```
✅ 9 Tables Created
✅ 42 Indexes Built
✅ All Foreign Keys Configured
✅ Zero Errors
✅ Production Ready
```

**Method Used:** Supabase Management API
**Date:** 2025-10-01
**Result:** Complete Success 🎉

---

## 📚 **Additional Resources**

- [Supabase Management API Docs](https://supabase.com/docs/reference/api/introduction)
- [Supabase Access Tokens](https://supabase.com/dashboard/account/tokens)
- [PostgreSQL Foreign Keys](https://www.postgresql.org/docs/current/ddl-constraints.html)

---

**Remember:** When direct PostgreSQL connections fail, the Supabase Management API is your best friend! 🚀
