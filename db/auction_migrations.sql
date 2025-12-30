-- ============================================================================
-- AUCTION SYSTEM MIGRATIONS
-- Consolidated migration file for all auction-related schema changes
-- ============================================================================

-- ============================================================================
-- 1. AUCTION SETTINGS TABLE
-- ============================================================================
-- Create auction_settings table to store configurable auction parameters per session
-- This allows each auction session to have its own rules (min bid, players per team, etc.)

CREATE TABLE IF NOT EXISTS public.auction_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.auction_sessions(id) ON DELETE CASCADE NOT NULL UNIQUE,
    minimum_bid DECIMAL(12, 2) DEFAULT 5000 NOT NULL,
    players_per_team INTEGER DEFAULT 11 NOT NULL,
    bid_increment_1_threshold DECIMAL(12, 2) DEFAULT 100000 NOT NULL,
    bid_increment_1_amount DECIMAL(12, 2) DEFAULT 10000 NOT NULL,
    bid_increment_2_threshold DECIMAL(12, 2) DEFAULT 200000 NOT NULL,
    bid_increment_2_amount DECIMAL(12, 2) DEFAULT 20000 NOT NULL,
    bid_increment_3_threshold DECIMAL(12, 2) DEFAULT 400000 NOT NULL,
    bid_increment_3_amount DECIMAL(12, 2) DEFAULT 30000 NOT NULL,
    bid_increment_4_threshold DECIMAL(12, 2) DEFAULT 700000 NOT NULL,
    bid_increment_4_amount DECIMAL(12, 2) DEFAULT 50000 NOT NULL,
    default_bid_increment DECIMAL(12, 2) DEFAULT 5000 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auction_settings_session ON public.auction_settings(session_id);
ALTER TABLE public.auction_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view auction settings" ON public.auction_settings
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage auction settings" ON public.auction_settings
    FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE public.auction_settings IS 'Stores configurable auction parameters for each session (min bid, players per team, bid increments)';

-- ============================================================================
-- 2. SKIPPED PLAYERS TABLE
-- ============================================================================
-- Create auction_skipped_players table to store players that were skipped during the auction

CREATE TABLE IF NOT EXISTS public.auction_skipped_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.auction_sessions(id) ON DELETE CASCADE NOT NULL,
    player_pool_id UUID REFERENCES public.auction_player_pool(id) ON DELETE CASCADE NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    skipped_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    player_order INTEGER NOT NULL,
    UNIQUE(session_id, player_pool_id)
);

CREATE INDEX IF NOT EXISTS idx_auction_skipped_players_session ON public.auction_skipped_players(session_id);
CREATE INDEX IF NOT EXISTS idx_auction_skipped_players_order ON public.auction_skipped_players(session_id, player_order);
ALTER TABLE public.auction_skipped_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view skipped players" ON public.auction_skipped_players
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage skipped players" ON public.auction_skipped_players
    FOR ALL USING (true);

-- ============================================================================
-- 3. BID TRACKING COLUMNS (auction_sessions)
-- ============================================================================
-- Add bid tracking columns to auction_sessions table for real-time synchronization

ALTER TABLE public.auction_sessions
ADD COLUMN IF NOT EXISTS current_bid_amount DECIMAL(12, 2) DEFAULT 5000;

ALTER TABLE public.auction_sessions
ADD COLUMN IF NOT EXISTS current_bid_team_id INTEGER;

COMMENT ON COLUMN public.auction_sessions.current_bid_amount IS 'Current bid amount for the active player being auctioned';
COMMENT ON COLUMN public.auction_sessions.current_bid_team_id IS 'Team ID that has placed the current bid';

-- ============================================================================
-- 4. TEAM LOGO URL (auction_teams)
-- ============================================================================
-- Add logo_url column to auction_teams table for custom team logos

ALTER TABLE public.auction_teams
ADD COLUMN IF NOT EXISTS logo_url TEXT;

COMMENT ON COLUMN public.auction_teams.logo_url IS 'Custom logo URL for the team. Can be a Google Drive share link or direct image URL. Must be publicly accessible.';

-- ============================================================================
-- 5. PLAYER INFO COLUMNS (auction_player_pool)
-- ============================================================================
-- Add additional player information columns

ALTER TABLE public.auction_player_pool
ADD COLUMN IF NOT EXISTS bowling_hand VARCHAR(10) CHECK (bowling_hand IN ('Right', 'Left')) DEFAULT NULL;

ALTER TABLE public.auction_player_pool
ADD COLUMN IF NOT EXISTS wing VARCHAR(50) DEFAULT NULL;

ALTER TABLE public.auction_player_pool
ADD COLUMN IF NOT EXISTS flat_no VARCHAR(50) DEFAULT NULL;

ALTER TABLE public.auction_player_pool
ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL;

ALTER TABLE public.auction_player_pool
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT NULL;

COMMENT ON COLUMN public.auction_player_pool.bowling_hand IS 'Bowling hand preference: Right or Left';
COMMENT ON COLUMN public.auction_player_pool.wing IS 'Player wing/position';
COMMENT ON COLUMN public.auction_player_pool.flat_no IS 'Flat number (apartment/flat number)';
COMMENT ON COLUMN public.auction_player_pool.phone IS 'Player phone number';
COMMENT ON COLUMN public.auction_player_pool.category IS 'Player category';

-- ============================================================================
-- 6. MAKE COLUMNS NULLABLE (auction_player_pool)
-- ============================================================================
-- Make payment_status and category nullable to allow flexible player creation

ALTER TABLE public.auction_player_pool
ALTER COLUMN payment_status DROP NOT NULL;

COMMENT ON COLUMN public.auction_player_pool.payment_status IS 'Payment status of the player. Can be NULL if not specified.';

