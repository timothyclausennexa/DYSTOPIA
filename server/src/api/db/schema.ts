import {
    bigint,
    boolean,
    index,
    integer,
    json,
    pgTable,
    real,
    serial,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from "drizzle-orm/pg-core";
import { TeamMode } from "../../../../shared/gameConfig";
import { ItemStatus, type Loadout, loadout } from "../../../../shared/utils/loadout";

// ==================== LEGACY AUTH TABLES (Keep for compatibility) ====================
export const sessionTable = pgTable("session", {
    id: text("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => usersTable.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        }),
    expiresAt: timestamp("expires_at").notNull(),
});

export type SessionTableSelect = typeof sessionTable.$inferSelect;

export const usersTable = pgTable("users", {
    id: text("id").notNull().primaryKey(),
    authId: text("auth_id").notNull(),
    slug: text("slug").notNull().unique(),
    banned: boolean("banned").notNull().default(false),
    banReason: text("ban_reason").notNull().default(""),
    bannedBy: text("banned_by").notNull().default(""),
    username: text("username").notNull().default(""),
    usernameSet: boolean("username_set").notNull().default(false),
    userCreated: timestamp("user_created", { withTimezone: true }).notNull().defaultNow(),
    lastUsernameChangeTime: timestamp("last_username_change_time"),
    linked: boolean("linked").notNull().default(false),
    linkedGoogle: boolean("linked_google").notNull().default(false),
    linkedDiscord: boolean("linked_discord").notNull().default(false),
    loadout: json("loadout")
        .notNull()
        .default(loadout.validate({} as Loadout))
        .$type<Loadout>(),
});

export type UsersTableInsert = typeof usersTable.$inferInsert;
export type UsersTableSelect = typeof usersTable.$inferSelect;

export const itemsTable = pgTable("items", {
    userId: text("user_id")
        .notNull()
        .references(() => usersTable.id, {
            onDelete: "cascade",
            onUpdate: "cascade",
        }),
    type: text("type").notNull(),
    timeAcquired: bigint("time_acquired", { mode: "number" }).notNull(),
    source: text("source").notNull().default("unlock_new_account"),
    status: integer("status").notNull().default(ItemStatus.New),
});

export const matchDataTable = pgTable(
    "match_data",
    {
        userId: text("user_id").default(""),
        userBanned: boolean("user_banned").default(false),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        region: text("region").notNull(),
        mapId: integer("map_id").notNull(),
        gameId: uuid("game_id").notNull(),
        mapSeed: bigint("map_seed", { mode: "number" }).notNull(),
        username: text("username").notNull(),
        playerId: integer("player_id").notNull(),
        teamMode: integer("team_mode").$type<TeamMode>().notNull(),
        teamCount: integer("team_count").notNull(),
        teamTotal: integer("team_total").notNull(),
        teamId: integer("team_id").notNull(),
        timeAlive: integer("time_alive").notNull(),
        rank: integer("rank").notNull(),
        died: boolean("died").notNull(),
        kills: integer("kills").notNull(),
        teamKills: integer("team_kills").notNull().default(0),
        damageDealt: integer("damage_dealt").notNull(),
        damageTaken: integer("damage_taken").notNull(),
        killerId: integer("killer_id").notNull(),
        killedIds: integer("killed_ids").array().notNull(),
    },
    (table) => [
        index("idx_match_data_user_stats").on(
            table.userId,
            table.teamMode,
            table.rank,
            table.kills,
            table.damageDealt,
            table.timeAlive,
        ),
        index("idx_game_id").on(table.gameId),
        index("idx_user_id").on(table.userId),
        index("idx_match_data_team_query").on(
            table.teamMode,
            table.mapId,
            table.createdAt,
            table.gameId,
            table.teamId,
            table.region,
            table.kills,
        ),
    ],
);

export type MatchDataTable = typeof matchDataTable.$inferInsert;

export const ipLogsTable = pgTable(
    "ip_logs",
    {
        id: serial().primaryKey(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        region: text("region").notNull(),
        gameId: text("game_id").notNull(),
        mapId: integer("map_id").notNull(),
        username: text("username").notNull(),
        userId: text("user_id").default(""),
        encodedIp: text("encoded_ip").notNull(),
        teamMode: integer("team_mode").$type<TeamMode>().notNull().default(TeamMode.Solo),
        ip: text("ip").notNull(),
        findGameIp: text("find_game_ip").notNull(),
        findGameEncodedIp: text("find_game_encoded_ip").notNull(),
    },
    (table) => [index("name_created_at_idx").on(table.username, table.createdAt)],
);

export type IpLogsTable = typeof ipLogsTable.$inferSelect;

export const bannedIpsTable = pgTable("banned_ips", {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresIn: timestamp("expries_in").notNull(),
    encodedIp: text("encoded_ip").notNull().primaryKey(),
    permanent: boolean("permanent").notNull().default(false),
    reason: text("reason").notNull().default(""),
    bannedBy: text("banned_by").notNull().default("admin"),
});

// ==================== DYSTOPIA ETERNAL PERSISTENCE TABLES ====================

// ===== PLAYERS TABLE =====
export const players = pgTable('players', {
    id: serial('id').primaryKey(),
    username: varchar('username', { length: 30 }).unique().notNull(),
    displayName: varchar('display_name', { length: 50 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }),
    walletAddress: varchar('wallet_address', { length: 42 }).unique(),

    // === STATS ===
    level: integer('level').default(1).notNull(),
    experience: integer('experience').default(0).notNull(),
    kills: integer('kills').default(0).notNull(),
    deaths: integer('deaths').default(0).notNull(),
    buildingsDestroyed: integer('buildings_destroyed').default(0).notNull(),
    playTimeSeconds: integer('play_time_seconds').default(0).notNull(),

    // === RESOURCES ===
    wood: integer('wood').default(100).notNull(),
    stone: integer('stone').default(100).notNull(),
    metal: integer('metal').default(50).notNull(),
    uranium: integer('uranium').default(0).notNull(),
    food: integer('food').default(100).notNull(),
    water: integer('water').default(100).notNull(),
    fuel: integer('fuel').default(0).notNull(),
    dystopiaTokens: integer('dystopia_tokens').default(0).notNull(),

    // === POSITION (for reconnect) ===
    currentX: real('current_x').default(25000),
    currentY: real('current_y').default(25000),
    currentZone: integer('current_zone').default(50),
    currentHealth: integer('current_health').default(100),
    currentArmor: integer('current_armor').default(0),

    // === STATUS ===
    isOnline: boolean('is_online').default(false).notNull(),
    isBanned: boolean('is_banned').default(false).notNull(),
    banReason: text('ban_reason'),
    lastSeen: timestamp('last_seen').defaultNow().notNull(),
    lastIp: varchar('last_ip', { length: 45 }),

    // === FACTION ===
    faction: varchar('faction', { length: 20 }), // 'red', 'blue', 'green', 'yellow', 'purple'
    factionSelectedAt: timestamp('faction_selected_at'), // Last time faction was changed (3-month cooldown)

    // === CLAN ===
    clanId: integer('clan_id').references(() => clans.id, { onDelete: 'set null' }),
    clanRole: varchar('clan_role', { length: 20 }),
    clanJoinedAt: timestamp('clan_joined_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
    usernameIdx: uniqueIndex('username_idx').on(table.username),
    walletIdx: index('wallet_idx').on(table.walletAddress),
    onlineIdx: index('online_idx').on(table.isOnline),
    zoneIdx: index('player_zone_idx').on(table.currentZone),
    clanIdx: index('player_clan_idx').on(table.clanId),
    levelIdx: index('level_idx').on(table.level)
}));

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;

// ===== BUILDINGS TABLE WITH VALIDATION =====
export const buildings = pgTable('buildings', {
    id: serial('id').primaryKey(),
    buildingType: varchar('building_type', { length: 50 }).notNull(),
    tier: integer('tier').default(1).notNull(),

    // === POSITION ===
    x: real('x').notNull(),
    y: real('y').notNull(),
    zone: integer('zone').notNull(),
    rotation: real('rotation').default(0).notNull(),

    // === OWNERSHIP ===
    ownerId: integer('owner_id').references(() => players.id, { onDelete: 'cascade' }).notNull(),
    clanId: integer('clan_id').references(() => clans.id, { onDelete: 'set null' }),
    isPublic: boolean('is_public').default(false),

    // === HEALTH ===
    health: integer('health').default(100).notNull(),
    maxHealth: integer('max_health').default(100).notNull(),
    armor: integer('armor').default(0).notNull(),
    isDestroyed: boolean('is_destroyed').default(false).notNull(),
    isDecaying: boolean('is_decaying').default(false).notNull(),

    // === FUNCTIONALITY ===
    isActive: boolean('is_active').default(true).notNull(),
    lastUsed: timestamp('last_used').defaultNow(),

    // === BUILDING DATA ===
    data: json('data').$type<{
        inventory?: Array<{itemId: string, quantity: number}>,
        maxStorage?: number,
        turretTarget?: number,
        turretKills?: number,
        ammo?: number,
        craftingQueue?: Array<{recipe: string, startTime: number, endTime: number}>,
        craftingSpeed?: number,
        generationType?: string,
        generationRate?: number,
        lastHarvest?: number,
        vehicleQueue?: Array<{type: string, completionTime: number}>,
        nukesReady?: number,
        nukeCooldown?: number,
        gateOpen?: boolean,
        allowedPlayers?: number[],
        spawnCooldown?: number,
        respawnCount?: number
    }>().default({}).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    decayAt: timestamp('decay_at')
}, (table) => ({
    zoneIdx: index('building_zone_idx').on(table.zone),
    ownerIdx: index('building_owner_idx').on(table.ownerId),
    typeIdx: index('building_type_idx').on(table.buildingType),
    positionIdx: index('building_position_idx').on(table.x, table.y),
    destroyedIdx: index('building_destroyed_idx').on(table.isDestroyed),
    decayIdx: index('building_decay_idx').on(table.decayAt)
}));

export type Building = typeof buildings.$inferSelect;
export type NewBuilding = typeof buildings.$inferInsert;

// ===== TERRITORIES WITH BORDERS =====
export const territories = pgTable('territories', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    zone: integer('zone').notNull(),

    // === BOUNDARIES ===
    boundaries: json('boundaries').$type<Array<{x: number, y: number}>>().notNull(),
    centerX: real('center_x').notNull(),
    centerY: real('center_y').notNull(),
    radius: real('radius').notNull(),

    // === OWNERSHIP ===
    controlledBy: varchar('controlled_by', { length: 20 }),
    ownerId: integer('owner_id').references(() => players.id, { onDelete: 'set null' }),
    clanId: integer('clan_id').references(() => clans.id, { onDelete: 'set null' }),

    // === ECONOMICS ===
    taxRate: integer('tax_rate').default(10).notNull(),
    treasury: integer('treasury').default(0).notNull(),
    resourceBonus: integer('resource_bonus').default(10).notNull(),

    // === DEFENSE ===
    defenseLevel: integer('defense_level').default(0).notNull(),
    walls: integer('walls').default(0).notNull(),
    turrets: integer('turrets').default(0).notNull(),
    shields: boolean('shields').default(false).notNull(),

    // === CAPTURE ===
    captureProgress: integer('capture_progress').default(0).notNull(),
    capturedBy: integer('captured_by').references(() => players.id),
    underAttack: boolean('under_attack').default(false).notNull(),

    capturedAt: timestamp('captured_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
    territoryZoneIdx: index('territory_zone_idx').on(table.zone),
    territoryOwnerIdx: index('territory_owner_idx').on(table.ownerId),
    territoryClanIdx: index('territory_clan_idx').on(table.clanId)
}));

export type Territory = typeof territories.$inferSelect;
export type NewTerritory = typeof territories.$inferInsert;

// ===== VEHICLES =====
export const vehicles = pgTable('vehicles', {
    id: serial('id').primaryKey(),
    vehicleType: varchar('vehicle_type', { length: 50 }).notNull(),

    // === POSITION ===
    x: real('x').notNull(),
    y: real('y').notNull(),
    zone: integer('zone').notNull(),
    rotation: real('rotation').default(0).notNull(),
    velocity: json('velocity').$type<{x: number, y: number}>().default({x: 0, y: 0}),

    // === STATS ===
    health: integer('health').default(100).notNull(),
    maxHealth: integer('max_health').default(100).notNull(),
    armor: integer('armor').default(0).notNull(),
    fuel: integer('fuel').default(100).notNull(),
    maxFuel: integer('max_fuel').default(100).notNull(),
    speed: real('speed').default(1).notNull(),

    // === OWNERSHIP ===
    ownerId: integer('owner_id').references(() => players.id, { onDelete: 'set null' }),
    driverId: integer('driver_id').references(() => players.id, { onDelete: 'set null' }),
    passengers: json('passengers').$type<number[]>().default([]).notNull(),
    isLocked: boolean('is_locked').default(false).notNull(),

    // === STATUS ===
    isDestroyed: boolean('is_destroyed').default(false).notNull(),
    isAbandoned: boolean('is_abandoned').default(false).notNull(),

    lastUsed: timestamp('last_used').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    destroyAt: timestamp('destroy_at')
}, (table) => ({
    vehicleZoneIdx: index('vehicle_zone_idx').on(table.zone),
    vehicleOwnerIdx: index('vehicle_owner_idx').on(table.ownerId),
    vehicleDestroyIdx: index('vehicle_destroy_idx').on(table.destroyAt)
}));

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;

// ===== CLANS/EMPIRES =====
export const clans = pgTable('clans', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 50 }).unique().notNull(),
    tag: varchar('tag', { length: 8 }).unique().notNull(),
    motto: varchar('motto', { length: 200 }),
    banner: varchar('banner', { length: 500 }),

    // === LEADERSHIP ===
    founderId: integer('founder_id').references(() => players.id).notNull(),
    leaderId: integer('leader_id').references(() => players.id).notNull(),
    officers: json('officers').$type<number[]>().default([]).notNull(),

    // === PROGRESSION ===
    level: integer('level').default(1).notNull(),
    experience: integer('experience').default(0).notNull(),
    memberCount: integer('member_count').default(1).notNull(),
    maxMembers: integer('max_members').default(10).notNull(),

    // === GOVERNMENT ===
    governmentType: varchar('government_type', { length: 30 }).default('democracy').notNull(),

    // === RESOURCES ===
    treasury: integer('treasury').default(0).notNull(),
    taxRate: integer('tax_rate').default(10).notNull(),

    // === STATS ===
    kills: integer('kills').default(0).notNull(),
    deaths: integer('deaths').default(0).notNull(),
    territoriesCaptured: integer('territories_captured').default(0).notNull(),
    warsWon: integer('wars_won').default(0).notNull(),
    warsLost: integer('wars_lost').default(0).notNull(),

    // === DIPLOMACY ===
    allies: json('allies').$type<number[]>().default([]).notNull(),
    enemies: json('enemies').$type<number[]>().default([]).notNull(),
    warStatus: json('war_status').$type<Array<{
        clanId: number,
        startedAt: string,
        reason: string
    }>>().default([]).notNull(),

    isRecruiting: boolean('is_recruiting').default(true).notNull(),
    isActive: boolean('is_active').default(true).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    disbandedAt: timestamp('disbanded_at')
}, (table) => ({
    clanNameIdx: uniqueIndex('clan_name_idx').on(table.name),
    clanTagIdx: uniqueIndex('clan_tag_idx').on(table.tag),
    clanLevelIdx: index('clan_level_idx').on(table.level)
}));

export type Clan = typeof clans.$inferSelect;
export type NewClan = typeof clans.$inferInsert;

// ===== CHAT SYSTEM =====
export const chatMessages = pgTable('chat_messages', {
    id: serial('id').primaryKey(),

    // === SENDER ===
    senderId: integer('sender_id').references(() => players.id, { onDelete: 'cascade' }).notNull(),
    senderName: varchar('sender_name', { length: 50 }).notNull(),

    // === MESSAGE ===
    channel: varchar('channel', { length: 20 }).notNull(),
    message: text('message').notNull(),

    // === TARGETING ===
    zone: integer('zone'),
    clanId: integer('clan_id').references(() => clans.id, { onDelete: 'cascade' }),
    recipientId: integer('recipient_id').references(() => players.id, { onDelete: 'cascade' }),

    // === MODERATION ===
    isDeleted: boolean('is_deleted').default(false).notNull(),
    deletedBy: integer('deleted_by').references(() => players.id),
    reportCount: integer('report_count').default(0).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
    channelIdx: index('chat_channel_idx').on(table.channel),
    zoneIdx: index('chat_zone_idx').on(table.zone),
    senderIdx: index('chat_sender_idx').on(table.senderId),
    createdIdx: index('chat_created_idx').on(table.createdAt)
}));

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

// ===== WORLD EVENTS =====
export const worldEvents = pgTable('world_events', {
    id: serial('id').primaryKey(),
    eventType: varchar('event_type', { length: 50 }).notNull(),

    // === LOCATION ===
    x: real('x').notNull(),
    y: real('y').notNull(),
    zone: integer('zone').notNull(),
    radius: real('radius').notNull(),

    // === DETAILS ===
    severity: integer('severity').default(1).notNull(),
    damage: integer('damage').default(0).notNull(),

    data: json('data').$type<{
        nukeType?: string,
        radiationLevel?: number,
        lootTable?: string[],
        bossHealth?: number,
        warningTime?: number,
        blastRadius?: number,
        affectedBuildings?: number[],
        casualties?: number
    }>().default({}).notNull(),

    // === TIMING ===
    triggeredBy: integer('triggered_by').references(() => players.id),
    startAt: timestamp('start_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
    eventZoneIdx: index('event_zone_idx').on(table.zone),
    eventTypeIdx: index('event_type_idx').on(table.eventType),
    expiresIdx: index('event_expires_idx').on(table.expiresAt)
}));

export type WorldEvent = typeof worldEvents.$inferSelect;
export type NewWorldEvent = typeof worldEvents.$inferInsert;

// ===== TRADING =====
export const trades = pgTable('trades', {
    id: serial('id').primaryKey(),

    sellerId: integer('seller_id').references(() => players.id).notNull(),
    buyerId: integer('buyer_id').references(() => players.id),

    // === OFFER ===
    offerType: varchar('offer_type', { length: 50 }).notNull(),
    offerAmount: integer('offer_amount').notNull(),

    // === REQUEST ===
    requestType: varchar('request_type', { length: 50 }).notNull(),
    requestAmount: integer('request_amount').notNull(),

    // === STATUS ===
    status: varchar('status', { length: 20 }).default('pending').notNull(),

    expiresAt: timestamp('expires_at').notNull(),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;

// ===== LEADERBOARDS =====
export const leaderboards = pgTable('leaderboards', {
    id: serial('id').primaryKey(),
    category: varchar('category', { length: 50 }).notNull(),
    period: varchar('period', { length: 20 }).notNull(),

    data: json('data').$type<Array<{
        rank: number,
        playerId?: number,
        clanId?: number,
        name: string,
        score: number,
        details: any
    }>>().notNull(),

    updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
    categoryPeriodIdx: uniqueIndex('leaderboard_idx').on(table.category, table.period)
}));

export type Leaderboard = typeof leaderboards.$inferSelect;
export type NewLeaderboard = typeof leaderboards.$inferInsert;
