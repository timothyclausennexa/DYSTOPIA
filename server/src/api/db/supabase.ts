/**
 * DYSTOPIA ETERNAL - Centralized Supabase Helper
 *
 * This module provides a clean interface for all database operations using
 * the Supabase Management API. Replaces Drizzle ORM completely.
 */

const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_PROJECT_REF || !SUPABASE_ACCESS_TOKEN) {
  console.warn('[SUPABASE] Warning: SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN environment variables not set. Database operations will fail.');
}

const SUPABASE_API_URL = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`;

/**
 * Execute a SQL query via Supabase Management API
 */
export async function executeQuery<T = any>(query: string): Promise<T[]> {
    const response = await fetch(SUPABASE_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Supabase API error: ${response.status} - ${error}`);
    }

    return await response.json();
}

/**
 * Comprehensive SQL escaping for injection prevention
 * WARNING: Prefer parameterized queries when possible. This is a last resort.
 */
export function escapeSql(value: string): string {
    if (typeof value !== 'string') {
        throw new Error(`escapeSql expects string, got ${typeof value}`);
    }

    // Replace single quotes with doubled single quotes (SQL standard)
    let escaped = value.replace(/'/g, "''");

    // Remove null bytes (can cause issues)
    escaped = escaped.replace(/\0/g, '');

    // Remove backslashes (prevent escape sequence attacks)
    escaped = escaped.replace(/\\/g, '');

    // Limit length to prevent DoS
    if (escaped.length > 10000) {
        throw new Error('SQL value too long (max 10000 characters)');
    }

    return escaped;
}

/**
 * Escape integer values (validate they are actually numbers)
 */
export function escapeInt(value: number): number {
    if (!Number.isInteger(value)) {
        throw new Error(`escapeInt expects integer, got ${value}`);
    }
    return value;
}

/**
 * Escape float values (validate they are actually numbers)
 */
export function escapeFloat(value: number): number {
    if (typeof value !== 'number' || !isFinite(value)) {
        throw new Error(`escapeFloat expects finite number, got ${value}`);
    }
    return value;
}

/**
 * Player-related database operations
 */
export const Players = {
    /**
     * Find player by username
     */
    async findByUsername(username: string) {
        const query = `
            SELECT id, username, display_name, password_hash, faction, faction_selected_at,
                   level, experience, wood, stone, metal, uranium, food, water, fuel, dystopia_tokens,
                   kills, deaths, buildings_destroyed, play_time_seconds,
                   current_x, current_y, current_zone, current_health, current_armor,
                   clan_id, clan_role, clan_joined_at, is_online, is_banned, ban_reason,
                   last_seen, last_ip, created_at, updated_at
            FROM players
            WHERE username = '${escapeSql(username)}'
            LIMIT 1
        `;
        const result = await executeQuery(query);
        return result.length > 0 ? result[0] : null;
    },

    /**
     * Find player by user_id (from auth system)
     */
    async findByUserId(userId: string) {
        const query = `
            SELECT id, username, display_name, password_hash, faction, faction_selected_at,
                   level, experience, wood, stone, metal, uranium, food, water, fuel, dystopia_tokens,
                   kills, deaths, buildings_destroyed, play_time_seconds,
                   current_x, current_y, current_zone, current_health, current_armor,
                   clan_id, clan_role, clan_joined_at, is_online, is_banned, ban_reason,
                   last_seen, last_ip, created_at, updated_at, user_id
            FROM players
            WHERE user_id = '${escapeSql(userId)}'
            LIMIT 1
        `;
        const result = await executeQuery(query);
        return result.length > 0 ? result[0] : null;
    },

    /**
     * Find player by ID
     */
    async findById(id: number) {
        const query = `
            SELECT id, username, display_name, password_hash, faction, faction_selected_at,
                   level, experience, wood, stone, metal, uranium, food, water, fuel, dystopia_tokens,
                   kills, deaths, buildings_destroyed, play_time_seconds,
                   current_x, current_y, current_zone, current_health, current_armor,
                   clan_id, clan_role, clan_joined_at, is_online, is_banned, ban_reason,
                   last_seen, last_ip, created_at, updated_at
            FROM players
            WHERE id = ${id}
            LIMIT 1
        `;
        const result = await executeQuery(query);
        return result.length > 0 ? result[0] : null;
    },

    /**
     * Create new player
     */
    async create(data: {
        username: string;
        displayName: string;
        passwordHash: string;
        walletAddress?: string;
    }) {
        const { username, displayName, passwordHash, walletAddress } = data;
        const walletPart = walletAddress
            ? `, wallet_address = '${escapeSql(walletAddress)}'`
            : '';

        const query = `
            INSERT INTO players (username, display_name, password_hash${walletAddress ? ', wallet_address' : ''}, created_at, updated_at)
            VALUES ('${escapeSql(username)}', '${escapeSql(displayName)}', '${passwordHash}'${walletAddress ? `, '${escapeSql(walletAddress)}'` : ''}, NOW(), NOW())
            RETURNING id, username, display_name, faction, faction_selected_at, level, experience
        `;
        const result = await executeQuery(query);
        return result[0];
    },

    /**
     * Update player faction
     */
    async updateFaction(username: string, faction: string | null) {
        const factionValue = faction ? `'${escapeSql(faction)}'` : 'NULL';
        const query = `
            UPDATE players
            SET faction = ${factionValue},
                faction_selected_at = NOW(),
                updated_at = NOW()
            WHERE username = '${escapeSql(username)}'
            RETURNING id, username, display_name, faction, faction_selected_at
        `;
        const result = await executeQuery(query);
        return result.length > 0 ? result[0] : null;
    },

    /**
     * Update player position and stats
     */
    async updatePosition(id: number, x: number, y: number, zone: number, health: number, armor: number) {
        const query = `
            UPDATE players
            SET current_x = ${escapeFloat(x)},
                current_y = ${escapeFloat(y)},
                current_zone = ${escapeInt(zone)},
                current_health = ${escapeFloat(health)},
                current_armor = ${escapeFloat(armor)},
                updated_at = NOW()
            WHERE id = ${escapeInt(id)}
        `;
        await executeQuery(query);
    },

    /**
     * Update player resources
     */
    async updateResources(id: number, resources: {
        wood?: number;
        stone?: number;
        metal?: number;
        uranium?: number;
        food?: number;
        water?: number;
        fuel?: number;
        dystopia_tokens?: number;
    }) {
        const updates = Object.entries(resources)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => `${key} = ${value}`)
            .join(', ');

        if (!updates) return;

        const query = `
            UPDATE players
            SET ${updates}, updated_at = NOW()
            WHERE id = ${id}
        `;
        await executeQuery(query);
    },

    /**
     * Update online status
     */
    async setOnline(id: number, isOnline: boolean, ip?: string) {
        const ipPart = ip ? `, last_ip = '${escapeSql(ip)}'` : '';
        const query = `
            UPDATE players
            SET is_online = ${isOnline},
                last_seen = NOW()${ipPart},
                updated_at = NOW()
            WHERE id = ${id}
        `;
        await executeQuery(query);
    },

    /**
     * Check if username exists
     */
    async usernameExists(username: string): Promise<boolean> {
        const query = `
            SELECT id FROM players
            WHERE username = '${escapeSql(username)}'
            LIMIT 1
        `;
        const result = await executeQuery(query);
        return result.length > 0;
    }
};

/**
 * Building-related database operations
 */
export const Buildings = {
    /**
     * Get all buildings in a zone
     */
    async getByZone(zone: number) {
        const query = `
            SELECT * FROM buildings
            WHERE zone = ${zone} AND is_destroyed = FALSE
            ORDER BY created_at DESC
        `;
        return await executeQuery(query);
    },

    /**
     * Create new building
     */
    async create(data: {
        buildingType: string;
        tier: number;
        x: number;
        y: number;
        zone: number;
        rotation: number;
        ownerId: number;
        clanId?: number;
        isPublic?: boolean;
    }) {
        const { buildingType, tier, x, y, zone, rotation, ownerId, clanId, isPublic } = data;
        const clanPart = clanId ? `, clan_id = ${clanId}` : '';
        const publicPart = isPublic !== undefined ? `, is_public = ${isPublic}` : '';

        const query = `
            INSERT INTO buildings (building_type, tier, x, y, zone, rotation, owner_id${clanId ? ', clan_id' : ''}${isPublic !== undefined ? ', is_public' : ''}, created_at, updated_at)
            VALUES ('${escapeSql(buildingType)}', ${tier}, ${x}, ${y}, ${zone}, ${rotation}, ${ownerId}${clanId ? `, ${clanId}` : ''}${isPublic !== undefined ? `, ${isPublic}` : ''}, NOW(), NOW())
            RETURNING *
        `;
        const result = await executeQuery(query);
        return result[0];
    },

    /**
     * Update building health
     */
    async updateHealth(id: number, health: number, isDestroyed: boolean = false) {
        const query = `
            UPDATE buildings
            SET health = ${health},
                is_destroyed = ${isDestroyed},
                updated_at = NOW()
            WHERE id = ${id}
        `;
        await executeQuery(query);
    },

    /**
     * Delete building
     */
    async delete(id: number) {
        const query = `DELETE FROM buildings WHERE id = ${id}`;
        await executeQuery(query);
    }
};

/**
 * Chat-related database operations
 */
export const Chat = {
    /**
     * Save chat message
     */
    async create(data: {
        senderId: number;
        senderName: string;
        channel: string;
        message: string;
        zone?: number;
        clanId?: number;
        recipientId?: number;
    }) {
        const { senderId, senderName, channel, message, zone, clanId, recipientId } = data;

        const optionalFields: string[] = [];
        const optionalValues: string[] = [];

        if (zone !== undefined) {
            optionalFields.push('zone');
            optionalValues.push(`${zone}`);
        }
        if (clanId !== undefined) {
            optionalFields.push('clan_id');
            optionalValues.push(`${clanId}`);
        }
        if (recipientId !== undefined) {
            optionalFields.push('recipient_id');
            optionalValues.push(`${recipientId}`);
        }

        const optionalPart = optionalFields.length > 0
            ? `, ${optionalFields.join(', ')}`
            : '';
        const optionalValuesPart = optionalValues.length > 0
            ? `, ${optionalValues.join(', ')}`
            : '';

        const query = `
            INSERT INTO chat_messages (sender_id, sender_name, channel, message${optionalPart}, created_at)
            VALUES (${senderId}, '${escapeSql(senderName)}', '${escapeSql(channel)}', '${escapeSql(message)}'${optionalValuesPart}, NOW())
            RETURNING *
        `;
        const result = await executeQuery(query);
        return result[0];
    },

    /**
     * Get recent chat messages for a channel
     */
    async getRecent(channel: string, limit: number = 50, zone?: number) {
        const zonePart = zone !== undefined ? ` AND zone = ${zone}` : '';
        const query = `
            SELECT * FROM chat_messages
            WHERE channel = '${escapeSql(channel)}'${zonePart} AND is_deleted = FALSE
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
        return await executeQuery(query);
    }
};

/**
 * Territory-related database operations
 */
export const Territories = {
    /**
     * Get all territories
     */
    async getAll() {
        const query = `SELECT * FROM territories ORDER BY created_at DESC`;
        return await executeQuery(query);
    },

    /**
     * Get territories by zone
     */
    async getByZone(zone: number) {
        const query = `
            SELECT * FROM territories
            WHERE zone = ${zone}
            ORDER BY created_at DESC
        `;
        return await executeQuery(query);
    },

    /**
     * Update territory control
     */
    async updateControl(id: number, data: {
        controlledBy?: string;
        ownerId?: number;
        clanId?: number;
        captureProgress?: number;
        underAttack?: boolean;
    }) {
        const updates: string[] = [];

        if (data.controlledBy !== undefined) updates.push(`controlled_by = '${escapeSql(data.controlledBy)}'`);
        if (data.ownerId !== undefined) updates.push(`owner_id = ${data.ownerId}`);
        if (data.clanId !== undefined) updates.push(`clan_id = ${data.clanId}`);
        if (data.captureProgress !== undefined) updates.push(`capture_progress = ${data.captureProgress}`);
        if (data.underAttack !== undefined) updates.push(`under_attack = ${data.underAttack}`);

        if (updates.length === 0) return;

        const query = `
            UPDATE territories
            SET ${updates.join(', ')}
            WHERE id = ${id}
        `;
        await executeQuery(query);
    }
};

/**
 * Clan-related database operations
 */
export const Clans = {
    /**
     * Find clan by ID
     */
    async findById(id: number) {
        const query = `SELECT * FROM clans WHERE id = ${id} LIMIT 1`;
        const result = await executeQuery(query);
        return result.length > 0 ? result[0] : null;
    },

    /**
     * Get all active clans
     */
    async getActive() {
        const query = `
            SELECT * FROM clans
            WHERE is_active = TRUE
            ORDER BY level DESC, experience DESC
        `;
        return await executeQuery(query);
    }
};

/**
 * Ban-related database operations
 */
export const Bans = {
    /**
     * Check if IP is banned
     */
    async isBanned(encodedIp: string) {
        const query = `
            SELECT permanent, expires_in, reason
            FROM banned_ips
            WHERE encoded_ip = '${escapeSql(encodedIp)}'
            LIMIT 1
        `;
        const result = await executeQuery(query);
        return result.length > 0 ? result[0] : null;
    },

    /**
     * Ban an IP address
     */
    async banIp(data: {
        encodedIp: string;
        reason: string;
        permanent: boolean;
        expiresIn?: Date;
        bannedBy?: string;
    }) {
        const { encodedIp, reason, permanent, expiresIn, bannedBy } = data;
        const expiresInPart = expiresIn ? `'${expiresIn.toISOString()}'` : 'NULL';
        const bannedByPart = bannedBy ? `'${escapeSql(bannedBy)}'` : 'NULL';

        const query = `
            INSERT INTO banned_ips (encoded_ip, reason, permanent, expires_in, banned_by, created_at)
            VALUES ('${escapeSql(encodedIp)}', '${escapeSql(reason)}', ${permanent}, ${expiresInPart}, ${bannedByPart}, NOW())
            ON CONFLICT (encoded_ip)
            DO UPDATE SET
                reason = EXCLUDED.reason,
                permanent = EXCLUDED.permanent,
                expires_in = EXCLUDED.expires_in,
                banned_by = EXCLUDED.banned_by
            RETURNING *
        `;
        const result = await executeQuery(query);
        return result[0];
    },

    /**
     * Unban an IP address
     */
    async unbanIp(encodedIp: string) {
        const query = `DELETE FROM banned_ips WHERE encoded_ip = '${escapeSql(encodedIp)}'`;
        await executeQuery(query);
    },

    /**
     * Get all banned IPs
     */
    async getAllBanned() {
        const query = `SELECT * FROM banned_ips ORDER BY created_at DESC`;
        return await executeQuery(query);
    }
};

/**
 * Session-related database operations
 */
export const Sessions = {
    /**
     * Create new session
     */
    async create(sessionId: string, userId: number, expiresAt: Date) {
        const query = `
            INSERT INTO sessions (id, user_id, expires_at, created_at)
            VALUES ('${escapeSql(sessionId)}', ${userId}, '${expiresAt.toISOString()}', NOW())
            RETURNING *
        `;
        const result = await executeQuery(query);
        return result[0];
    },

    /**
     * Find session by ID
     */
    async findById(sessionId: string) {
        const query = `
            SELECT * FROM sessions
            WHERE id = '${escapeSql(sessionId)}'
            LIMIT 1
        `;
        const result = await executeQuery(query);
        return result.length > 0 ? result[0] : null;
    },

    /**
     * Delete session
     */
    async delete(sessionId: string) {
        const query = `DELETE FROM sessions WHERE id = '${escapeSql(sessionId)}'`;
        await executeQuery(query);
    },

    /**
     * Delete expired sessions
     */
    async deleteExpired() {
        const query = `DELETE FROM sessions WHERE expires_at < NOW()`;
        const result = await executeQuery(query);
        return result;
    }
};

/**
 * User-related database operations (for existing auth system)
 */
export const Users = {
    /**
     * Find user by ID
     */
    async findById(id: number) {
        const query = `SELECT * FROM users WHERE id = ${id} LIMIT 1`;
        const result = await executeQuery(query);
        return result.length > 0 ? result[0] : null;
    },

    /**
     * Find user by username
     */
    async findByUsername(username: string) {
        const query = `
            SELECT * FROM users
            WHERE username = '${escapeSql(username)}'
            LIMIT 1
        `;
        const result = await executeQuery(query);
        return result.length > 0 ? result[0] : null;
    }
};

/**
 * Match data operations (for legacy battle royale system)
 */
export const MatchData = {
    /**
     * Insert match data
     */
    async insertBatch(matchData: any[]) {
        if (matchData.length === 0) return;

        const values = matchData.map(m => {
            const killedIds = Array.isArray(m.killedIds) ? `ARRAY[${m.killedIds.join(',')}]` : 'ARRAY[]::INTEGER[]';
            return `(
                '${escapeSql(m.userId || '')}',
                ${m.userBanned || false},
                '${escapeSql(m.region)}',
                ${m.mapId},
                '${m.gameId}',
                ${m.mapSeed},
                '${escapeSql(m.username)}',
                ${m.playerId},
                ${m.teamMode},
                ${m.teamCount},
                ${m.teamTotal},
                ${m.teamId},
                ${m.timeAlive},
                ${m.rank},
                ${m.died},
                ${m.kills},
                ${m.teamKills || 0},
                ${m.damageDealt},
                ${m.damageTaken},
                ${m.killerId},
                ${killedIds}
            )`;
        }).join(',');

        const query = `
            INSERT INTO match_data (
                user_id, user_banned, region, map_id, game_id, map_seed,
                username, player_id, team_mode, team_count, team_total,
                team_id, time_alive, rank, died, kills, team_kills,
                damage_dealt, damage_taken, killer_id, killed_ids
            )
            VALUES ${values}
        `;

        await executeQuery(query);
    }
};

/**
 * IP logs operations
 */
export const IpLogs = {
    /**
     * Insert IP logs batch
     */
    async insertBatch(logs: any[]) {
        if (logs.length === 0) return;

        const values = logs.map(log => `(
            '${escapeSql(log.region)}',
            '${escapeSql(log.gameId)}',
            ${log.mapId},
            '${escapeSql(log.username)}',
            '${escapeSql(log.userId || '')}',
            ${log.playerId},
            '${escapeSql(log.encodedIp)}'
        )`).join(',');

        const query = `
            INSERT INTO ip_logs (region, game_id, map_id, username, user_id, player_id, encoded_ip)
            VALUES ${values}
        `;

        await executeQuery(query);
    }
};
