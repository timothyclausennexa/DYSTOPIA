-- ============================================================================
-- DYSTOPIA: ETERNAL BATTLEGROUND - Database Schema
-- Run this SQL in Supabase SQL Editor to create all tables
-- ============================================================================

-- ===== CLANS TABLE (Create first for foreign key references) =====
CREATE TABLE IF NOT EXISTS clans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    tag VARCHAR(8) UNIQUE NOT NULL,
    motto VARCHAR(200),
    banner VARCHAR(500),

    -- Leadership (will add constraints after players table exists)
    founder_id INTEGER,
    leader_id INTEGER,
    officers JSONB DEFAULT '[]'::jsonb NOT NULL,

    -- Progression
    level INTEGER DEFAULT 1 NOT NULL,
    experience INTEGER DEFAULT 0 NOT NULL,
    member_count INTEGER DEFAULT 1 NOT NULL,
    max_members INTEGER DEFAULT 10 NOT NULL,

    -- Government
    government_type VARCHAR(30) DEFAULT 'democracy' NOT NULL,

    -- Resources
    treasury INTEGER DEFAULT 0 NOT NULL,
    tax_rate INTEGER DEFAULT 10 NOT NULL,

    -- Stats
    kills INTEGER DEFAULT 0 NOT NULL,
    deaths INTEGER DEFAULT 0 NOT NULL,
    territories_captured INTEGER DEFAULT 0 NOT NULL,
    wars_won INTEGER DEFAULT 0 NOT NULL,
    wars_lost INTEGER DEFAULT 0 NOT NULL,

    -- Diplomacy
    allies JSONB DEFAULT '[]'::jsonb NOT NULL,
    enemies JSONB DEFAULT '[]'::jsonb NOT NULL,
    war_status JSONB DEFAULT '[]'::jsonb NOT NULL,

    is_recruiting BOOLEAN DEFAULT TRUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,

    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    disbanded_at TIMESTAMP
);

-- ===== PLAYERS TABLE (Main persistence) =====
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    username VARCHAR(30) UNIQUE NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255),
    wallet_address VARCHAR(42) UNIQUE,

    -- Stats
    level INTEGER DEFAULT 1 NOT NULL,
    experience INTEGER DEFAULT 0 NOT NULL,
    kills INTEGER DEFAULT 0 NOT NULL,
    deaths INTEGER DEFAULT 0 NOT NULL,
    buildings_destroyed INTEGER DEFAULT 0 NOT NULL,
    play_time_seconds INTEGER DEFAULT 0 NOT NULL,

    -- Resources
    wood INTEGER DEFAULT 100 NOT NULL,
    stone INTEGER DEFAULT 100 NOT NULL,
    metal INTEGER DEFAULT 50 NOT NULL,
    uranium INTEGER DEFAULT 0 NOT NULL,
    food INTEGER DEFAULT 100 NOT NULL,
    water INTEGER DEFAULT 100 NOT NULL,
    fuel INTEGER DEFAULT 0 NOT NULL,
    dystopia_tokens INTEGER DEFAULT 0 NOT NULL,

    -- Position (for reconnect)
    current_x REAL DEFAULT 25000,
    current_y REAL DEFAULT 25000,
    current_zone INTEGER DEFAULT 50,
    current_health INTEGER DEFAULT 100,
    current_armor INTEGER DEFAULT 0,

    -- Status
    is_online BOOLEAN DEFAULT FALSE NOT NULL,
    is_banned BOOLEAN DEFAULT FALSE NOT NULL,
    ban_reason TEXT,
    last_seen TIMESTAMP DEFAULT NOW() NOT NULL,
    last_ip VARCHAR(45),

    -- Clan
    clan_id INTEGER REFERENCES clans(id) ON DELETE SET NULL,
    clan_role VARCHAR(20),
    clan_joined_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for players
CREATE UNIQUE INDEX IF NOT EXISTS username_idx ON players(username);
CREATE INDEX IF NOT EXISTS wallet_idx ON players(wallet_address);
CREATE INDEX IF NOT EXISTS online_idx ON players(is_online);
CREATE INDEX IF NOT EXISTS player_zone_idx ON players(current_zone);
CREATE INDEX IF NOT EXISTS player_clan_idx ON players(clan_id);
CREATE INDEX IF NOT EXISTS level_idx ON players(level);

-- Indexes for clans
CREATE UNIQUE INDEX IF NOT EXISTS clan_name_idx ON clans(name);
CREATE UNIQUE INDEX IF NOT EXISTS clan_tag_idx ON clans(tag);
CREATE INDEX IF NOT EXISTS clan_level_idx ON clans(level);

-- Add foreign key constraints to clans after players table exists
ALTER TABLE clans
ADD CONSTRAINT clans_founder_fkey FOREIGN KEY (founder_id) REFERENCES players(id);

ALTER TABLE clans
ADD CONSTRAINT clans_leader_fkey FOREIGN KEY (leader_id) REFERENCES players(id);

-- ===== BUILDINGS TABLE =====
CREATE TABLE IF NOT EXISTS buildings (
    id SERIAL PRIMARY KEY,
    building_type VARCHAR(50) NOT NULL,
    tier INTEGER DEFAULT 1 NOT NULL,

    -- Position
    x REAL NOT NULL,
    y REAL NOT NULL,
    zone INTEGER NOT NULL,
    rotation REAL DEFAULT 0 NOT NULL,

    -- Ownership
    owner_id INTEGER REFERENCES players(id) ON DELETE CASCADE NOT NULL,
    clan_id INTEGER REFERENCES clans(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT FALSE,

    -- Health
    health INTEGER DEFAULT 100 NOT NULL,
    max_health INTEGER DEFAULT 100 NOT NULL,
    armor INTEGER DEFAULT 0 NOT NULL,
    is_destroyed BOOLEAN DEFAULT FALSE NOT NULL,
    is_decaying BOOLEAN DEFAULT FALSE NOT NULL,

    -- Functionality
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    last_used TIMESTAMP DEFAULT NOW(),

    -- Building-specific data
    data JSONB DEFAULT '{}'::jsonb NOT NULL,

    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    decay_at TIMESTAMP
);

-- Indexes for buildings
CREATE INDEX IF NOT EXISTS building_zone_idx ON buildings(zone);
CREATE INDEX IF NOT EXISTS building_owner_idx ON buildings(owner_id);
CREATE INDEX IF NOT EXISTS building_type_idx ON buildings(building_type);
CREATE INDEX IF NOT EXISTS building_position_idx ON buildings(x, y);
CREATE INDEX IF NOT EXISTS building_destroyed_idx ON buildings(is_destroyed);
CREATE INDEX IF NOT EXISTS building_decay_idx ON buildings(decay_at);

-- ===== TERRITORIES TABLE =====
CREATE TABLE IF NOT EXISTS territories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    zone INTEGER NOT NULL,

    -- Boundaries
    boundaries JSONB NOT NULL,
    center_x REAL NOT NULL,
    center_y REAL NOT NULL,
    radius REAL NOT NULL,

    -- Ownership
    controlled_by VARCHAR(20),
    owner_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    clan_id INTEGER REFERENCES clans(id) ON DELETE SET NULL,

    -- Economics
    tax_rate INTEGER DEFAULT 10 NOT NULL,
    treasury INTEGER DEFAULT 0 NOT NULL,
    resource_bonus INTEGER DEFAULT 10 NOT NULL,

    -- Defense
    defense_level INTEGER DEFAULT 0 NOT NULL,
    walls INTEGER DEFAULT 0 NOT NULL,
    turrets INTEGER DEFAULT 0 NOT NULL,
    shields BOOLEAN DEFAULT FALSE NOT NULL,

    -- Capture
    capture_progress INTEGER DEFAULT 0 NOT NULL,
    captured_by INTEGER REFERENCES players(id),
    under_attack BOOLEAN DEFAULT FALSE NOT NULL,

    captured_at TIMESTAMP DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for territories
CREATE INDEX IF NOT EXISTS territory_zone_idx ON territories(zone);
CREATE INDEX IF NOT EXISTS territory_owner_idx ON territories(owner_id);
CREATE INDEX IF NOT EXISTS territory_clan_idx ON territories(clan_id);

-- ===== VEHICLES TABLE =====
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    vehicle_type VARCHAR(50) NOT NULL,

    -- Position
    x REAL NOT NULL,
    y REAL NOT NULL,
    zone INTEGER NOT NULL,
    rotation REAL DEFAULT 0 NOT NULL,
    velocity JSONB DEFAULT '{"x":0,"y":0}'::jsonb,

    -- Stats
    health INTEGER DEFAULT 100 NOT NULL,
    max_health INTEGER DEFAULT 100 NOT NULL,
    armor INTEGER DEFAULT 0 NOT NULL,
    fuel INTEGER DEFAULT 100 NOT NULL,
    max_fuel INTEGER DEFAULT 100 NOT NULL,
    speed REAL DEFAULT 1 NOT NULL,

    -- Ownership
    owner_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    driver_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    passengers JSONB DEFAULT '[]'::jsonb NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE NOT NULL,

    -- Status
    is_destroyed BOOLEAN DEFAULT FALSE NOT NULL,
    is_abandoned BOOLEAN DEFAULT FALSE NOT NULL,

    last_used TIMESTAMP DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    destroy_at TIMESTAMP
);

-- Indexes for vehicles
CREATE INDEX IF NOT EXISTS vehicle_zone_idx ON vehicles(zone);
CREATE INDEX IF NOT EXISTS vehicle_owner_idx ON vehicles(owner_id);
CREATE INDEX IF NOT EXISTS vehicle_destroy_idx ON vehicles(destroy_at);

-- ===== CHAT MESSAGES TABLE =====
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,

    -- Sender
    sender_id INTEGER REFERENCES players(id) ON DELETE CASCADE NOT NULL,
    sender_name VARCHAR(50) NOT NULL,

    -- Message
    channel VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,

    -- Targeting
    zone INTEGER,
    clan_id INTEGER REFERENCES clans(id) ON DELETE CASCADE,
    recipient_id INTEGER REFERENCES players(id) ON DELETE CASCADE,

    -- Moderation
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,
    deleted_by INTEGER REFERENCES players(id),
    report_count INTEGER DEFAULT 0 NOT NULL,

    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for chat
CREATE INDEX IF NOT EXISTS chat_channel_idx ON chat_messages(channel);
CREATE INDEX IF NOT EXISTS chat_zone_idx ON chat_messages(zone);
CREATE INDEX IF NOT EXISTS chat_sender_idx ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS chat_created_idx ON chat_messages(created_at);

-- ===== WORLD EVENTS TABLE =====
CREATE TABLE IF NOT EXISTS world_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,

    -- Location
    x REAL NOT NULL,
    y REAL NOT NULL,
    zone INTEGER NOT NULL,
    radius REAL NOT NULL,

    -- Details
    severity INTEGER DEFAULT 1 NOT NULL,
    damage INTEGER DEFAULT 0 NOT NULL,
    data JSONB DEFAULT '{}'::jsonb NOT NULL,

    -- Timing
    triggered_by INTEGER REFERENCES players(id),
    start_at TIMESTAMP DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP NOT NULL,

    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for world events
CREATE INDEX IF NOT EXISTS event_zone_idx ON world_events(zone);
CREATE INDEX IF NOT EXISTS event_type_idx ON world_events(event_type);
CREATE INDEX IF NOT EXISTS event_expires_idx ON world_events(expires_at);

-- ===== TRADES TABLE =====
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,

    seller_id INTEGER REFERENCES players(id) NOT NULL,
    buyer_id INTEGER REFERENCES players(id),

    -- Offer
    offer_type VARCHAR(50) NOT NULL,
    offer_amount INTEGER NOT NULL,

    -- Request
    request_type VARCHAR(50) NOT NULL,
    request_amount INTEGER NOT NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,

    expires_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ===== LEADERBOARDS TABLE =====
CREATE TABLE IF NOT EXISTS leaderboards (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    period VARCHAR(20) NOT NULL,

    data JSONB NOT NULL,

    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for leaderboards
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_idx ON leaderboards(category, period);

-- ============================================================================
-- Setup Complete!
-- ============================================================================
-- Tables created:
-- - players (with 6 indexes)
-- - clans (with 3 indexes)
-- - buildings (with 6 indexes)
-- - territories (with 3 indexes)
-- - vehicles (with 3 indexes)
-- - chat_messages (with 4 indexes)
-- - world_events (with 3 indexes)
-- - trades
-- - leaderboards (with 1 index)
--
-- Total: 9 tables, 29 indexes
-- ============================================================================
