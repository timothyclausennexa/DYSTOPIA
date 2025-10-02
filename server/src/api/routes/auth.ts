import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import crypto from 'crypto';

const SUPABASE_PROJECT_REF = 'rplglfwwyavfkpvczkkj';
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || 'sbp_2ca1f2a407294f29509ca049b13bd6702ce2890b';
const SUPABASE_API_URL = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`;

async function executeSupabaseQuery(query: string) {
    const response = await fetch(SUPABASE_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    });

    if (!response.ok) {
        throw new Error(`Supabase API error: ${response.status}`);
    }

    return await response.json();
}

const authRouter = new Hono();

// Hash password using SHA-256
function hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Signup schema
const signupSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters").max(30, "Username too long").regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: z.string().min(6, "Password must be at least 6 characters").max(100, "Password too long"),
    displayName: z.string().min(1, "Display name required").max(50, "Display name too long"),
});

// Login schema
const loginSchema = z.object({
    username: z.string(),
    password: z.string(),
});

// Faction selection schema
const factionSchema = z.object({
    faction: z.enum(['red', 'blue', 'green', 'yellow', 'purple']),
});

// Signup endpoint
authRouter.post('/signup', zValidator('json', signupSchema, (result, c) => {
    if (!result.success) {
        console.log('[AUTH] Validation failed:', result.error.issues);
        const firstError = result.error.issues[0];
        return c.json({
            success: false,
            error: firstError.message
        }, 400);
    }
}), async (c) => {
    const { username, password, displayName } = c.req.valid('json');

    console.log(`[AUTH] Signup attempt for username: ${username}`);

    try {
        // Check if username already exists
        const checkQuery = `SELECT id FROM players WHERE username = '${username.replace(/'/g, "''")}' LIMIT 1`;
        const existing = await executeSupabaseQuery(checkQuery);

        if (existing && existing.length > 0) {
            return c.json({ error: 'Username already taken' }, 400);
        }

        // Hash password
        const passwordHash = hashPassword(password);

        // Create new player
        const insertQuery = `
            INSERT INTO players (username, display_name, password_hash, created_at, updated_at)
            VALUES ('${username.replace(/'/g, "''")}', '${displayName.replace(/'/g, "''")}', '${passwordHash}', NOW(), NOW())
            RETURNING id, username, display_name, faction, faction_selected_at
        `;
        const result = await executeSupabaseQuery(insertQuery);

        if (!result || result.length === 0) {
            throw new Error('Failed to create player');
        }

        const newPlayer = result[0];
        console.log(`[AUTH] New player registered: ${username}`);

        return c.json({
            success: true,
            player: {
                id: newPlayer.id,
                username: newPlayer.username,
                displayName: newPlayer.display_name,
                faction: newPlayer.faction,
                factionSelectedAt: newPlayer.faction_selected_at,
            }
        });
    } catch (error) {
        console.error('[AUTH] Signup error:', error);
        return c.json({ error: 'Signup failed' }, 500);
    }
});

// Login endpoint
authRouter.post('/login', zValidator('json', loginSchema), async (c) => {
    const { username, password } = c.req.valid('json');

    try {
        // Find player by username
        const query = `SELECT id, username, display_name, password_hash, faction, faction_selected_at FROM players WHERE username = '${username.replace(/'/g, "''")}' LIMIT 1`;
        const result = await executeSupabaseQuery(query);

        if (!result || result.length === 0) {
            return c.json({ error: 'Invalid username or password' }, 401);
        }

        const player = result[0];

        // Check password
        const passwordHash = hashPassword(password);
        if (player.password_hash !== passwordHash) {
            return c.json({ error: 'Invalid username or password' }, 401);
        }

        console.log(`[AUTH] Player logged in: ${username}`);

        return c.json({
            success: true,
            player: {
                id: player.id,
                username: player.username,
                displayName: player.display_name,
                faction: player.faction,
                factionSelectedAt: player.faction_selected_at,
            }
        });
    } catch (error) {
        console.error('[AUTH] Login error:', error);
        return c.json({ error: 'Login failed' }, 500);
    }
});

// Select faction endpoint (with 3-month cooldown check)
authRouter.post('/select-faction', zValidator('json', factionSchema), async (c) => {
    const { faction } = c.req.valid('json');
    const username = c.req.header('X-Username'); // Simple auth - in production use proper tokens

    if (!username) {
        return c.json({ error: 'Not authenticated' }, 401);
    }

    try {
        // Find player using Supabase
        const query = `
            SELECT id, username, faction, faction_selected_at
            FROM players
            WHERE username = '${username.replace(/'/g, "''")}'
            LIMIT 1
        `;
        const players = await executeSupabaseQuery(query);

        if (!players || players.length === 0) {
            return c.json({ error: 'Player not found' }, 404);
        }

        const player = players[0];

        // Check if faction can be changed (3-month cooldown)
        if (player.faction_selected_at) {
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

            if (new Date(player.faction_selected_at) > threeMonthsAgo) {
                const nextChangeDate = new Date(player.faction_selected_at);
                nextChangeDate.setMonth(nextChangeDate.getMonth() + 3);

                return c.json({
                    error: 'Faction can only be changed once every 3 months',
                    nextChangeDate: nextChangeDate.toISOString(),
                    currentFaction: player.faction,
                }, 400);
            }
        }

        // Update faction using Supabase
        const updateQuery = `
            UPDATE players
            SET faction = '${faction}',
                faction_selected_at = NOW(),
                updated_at = NOW()
            WHERE username = '${username.replace(/'/g, "''")}'
            RETURNING id, username, faction, faction_selected_at
        `;
        const updated = await executeSupabaseQuery(updateQuery);

        if (!updated || updated.length === 0) {
            throw new Error('Failed to update faction');
        }

        const updatedPlayer = updated[0];

        console.log(`[AUTH] Player ${username} selected faction: ${faction}`);

        return c.json({
            success: true,
            faction: updatedPlayer.faction,
            factionSelectedAt: updatedPlayer.faction_selected_at,
        });
    } catch (error) {
        console.error('[AUTH] Faction selection error:', error);
        return c.json({ error: 'Faction selection failed' }, 500);
    }
});

// Get player info endpoint
authRouter.get('/me', async (c) => {
    const username = c.req.header('X-Username');

    if (!username) {
        return c.json({ error: 'Not authenticated' }, 401);
    }

    try {
        const query = `
            SELECT id, username, display_name, faction, faction_selected_at, level, experience
            FROM players
            WHERE username = '${username.replace(/'/g, "''")}'
            LIMIT 1
        `;
        const players = await executeSupabaseQuery(query);

        if (!players || players.length === 0) {
            return c.json({ error: 'Player not found' }, 404);
        }

        const player = players[0];

        return c.json({
            player: {
                id: player.id,
                username: player.username,
                displayName: player.display_name,
                faction: player.faction,
                factionSelectedAt: player.faction_selected_at,
                level: player.level,
                experience: player.experience,
            }
        });
    } catch (error) {
        console.error('[AUTH] Get player error:', error);
        return c.json({ error: 'Failed to get player info' }, 500);
    }
});

export default authRouter;
