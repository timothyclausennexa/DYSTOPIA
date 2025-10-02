-- ============================================================================
-- DYSTOPIA: MODERATION & SESSION TABLES
-- Adds missing tables for ban system and session management
-- ============================================================================

-- ===== BANNED IPS TABLE =====
CREATE TABLE IF NOT EXISTS banned_ips (
    id SERIAL PRIMARY KEY,
    encoded_ip VARCHAR(255) UNIQUE NOT NULL,
    reason TEXT NOT NULL,
    permanent BOOLEAN DEFAULT FALSE NOT NULL,
    expires_in TIMESTAMP,
    banned_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for banned_ips
CREATE INDEX IF NOT EXISTS banned_ips_encoded_idx ON banned_ips(encoded_ip);
CREATE INDEX IF NOT EXISTS banned_ips_expires_idx ON banned_ips(expires_in);

-- ===== SESSIONS TABLE =====
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions(expires_at);

-- ===== USERS TABLE (for existing auth system, separate from players) =====
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(30) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(20) DEFAULT 'user' NOT NULL,
    banned BOOLEAN DEFAULT FALSE NOT NULL,
    loadout JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for users
CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_banned_idx ON users(banned);

-- ===== MODERATOR LOGS TABLE =====
CREATE TABLE IF NOT EXISTS moderator_logs (
    id SERIAL PRIMARY KEY,
    moderator_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for moderator_logs
CREATE INDEX IF NOT EXISTS mod_logs_moderator_idx ON moderator_logs(moderator_id);
CREATE INDEX IF NOT EXISTS mod_logs_action_idx ON moderator_logs(action);
CREATE INDEX IF NOT EXISTS mod_logs_created_idx ON moderator_logs(created_at);

-- ============================================================================
-- Setup Complete!
-- ============================================================================
-- New tables created:
-- - banned_ips (with 2 indexes)
-- - sessions (with 2 indexes)
-- - users (with 3 indexes)
-- - moderator_logs (with 3 indexes)
--
-- Total: 4 tables, 10 indexes
-- ============================================================================
