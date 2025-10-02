-- ============================================================================
-- DYSTOPIA: LEGACY TABLES FOR BACKWARD COMPATIBILITY
-- Adds tables needed for old battle royale system endpoints
-- ============================================================================

-- ===== MATCH DATA TABLE (for battle royale mode) =====
CREATE TABLE IF NOT EXISTS match_data (
    id SERIAL PRIMARY KEY,
    user_id TEXT DEFAULT '',
    user_banned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    region TEXT NOT NULL,
    map_id INTEGER NOT NULL,
    game_id UUID NOT NULL,
    map_seed BIGINT NOT NULL,
    username TEXT NOT NULL,
    player_id INTEGER NOT NULL,
    team_mode INTEGER NOT NULL,
    team_count INTEGER NOT NULL,
    team_total INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    time_alive INTEGER NOT NULL,
    rank INTEGER NOT NULL,
    died BOOLEAN NOT NULL,
    kills INTEGER NOT NULL,
    team_kills INTEGER DEFAULT 0 NOT NULL,
    damage_dealt INTEGER NOT NULL,
    damage_taken INTEGER NOT NULL,
    killer_id INTEGER NOT NULL,
    killed_ids INTEGER[] NOT NULL
);

-- Indexes for match_data
CREATE INDEX IF NOT EXISTS idx_match_data_user_stats ON match_data(user_id, team_mode, rank, kills, damage_dealt, time_alive);
CREATE INDEX IF NOT EXISTS idx_game_id ON match_data(game_id);
CREATE INDEX IF NOT EXISTS idx_user_id_match ON match_data(user_id);
CREATE INDEX IF NOT EXISTS idx_match_data_team_query ON match_data(team_mode, map_id, created_at, game_id, team_id, region, kills);

-- ===== IP LOGS TABLE =====
CREATE TABLE IF NOT EXISTS ip_logs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    region TEXT NOT NULL,
    game_id TEXT NOT NULL,
    map_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    user_id TEXT DEFAULT '',
    player_id INTEGER NOT NULL,
    encoded_ip VARCHAR(255) NOT NULL
);

-- Indexes for ip_logs
CREATE INDEX IF NOT EXISTS ip_logs_encoded_ip_idx ON ip_logs(encoded_ip);
CREATE INDEX IF NOT EXISTS ip_logs_user_id_idx ON ip_logs(user_id);

-- ===== ITEMS TABLE (for cosmetics/rewards) =====
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    quantity INTEGER DEFAULT 1 NOT NULL,
    source VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for items
CREATE INDEX IF NOT EXISTS items_user_id_idx ON items(user_id);
CREATE INDEX IF NOT EXISTS items_type_idx ON items(type);

-- ============================================================================
-- Setup Complete!
-- ============================================================================
-- Tables created:
-- - match_data (with 4 indexes)
-- - ip_logs (with 2 indexes)
-- - items (with 2 indexes)
--
-- Total: 3 tables, 8 indexes
-- ============================================================================
