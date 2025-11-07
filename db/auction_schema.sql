-- Auction State Management Schema
-- This stores the live auction state so all users can see it in real-time

-- Auction Session Table
CREATE TABLE IF NOT EXISTS public.auction_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_name VARCHAR(100) DEFAULT 'Main Auction' NOT NULL,
    current_player_index INTEGER DEFAULT 0 NOT NULL,
    is_complete BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Auction Teams Table
CREATE TABLE IF NOT EXISTS public.auction_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.auction_sessions(id) ON DELETE CASCADE NOT NULL,
    team_number INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    budget DECIMAL(12, 2) NOT NULL,
    category_a_count INTEGER DEFAULT 0 NOT NULL,
    category_b_count INTEGER DEFAULT 0 NOT NULL,
    category_c_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(session_id, team_number)
);

-- Auction Players Table (players bought by teams)
CREATE TABLE IF NOT EXISTS public.auction_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.auction_sessions(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES public.auction_teams(id) ON DELETE CASCADE NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    player_category VARCHAR(10) NOT NULL,
    bid_amount DECIMAL(12, 2) NOT NULL,
    payment_status VARCHAR(1) NOT NULL,
    gender VARCHAR(1) NOT NULL,
    runs INTEGER DEFAULT 0,
    strike_rate DECIMAL(10, 2) DEFAULT 0,
    wickets INTEGER DEFAULT 0,
    average DECIMAL(10, 2) DEFAULT 0,
    catch_count INTEGER DEFAULT 0,
    ro INTEGER DEFAULT 0,
    mvp DECIMAL(10, 3) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_auction_sessions_active ON public.auction_sessions(is_complete) WHERE is_complete = false;
CREATE INDEX IF NOT EXISTS idx_auction_teams_session ON public.auction_teams(session_id);
CREATE INDEX IF NOT EXISTS idx_auction_players_session ON public.auction_players(session_id);
CREATE INDEX IF NOT EXISTS idx_auction_players_team ON public.auction_players(team_id);

-- RLS Policies (allow all authenticated users to read, only authorized users to write)
ALTER TABLE public.auction_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_players ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read auction data
CREATE POLICY "Anyone can view auction sessions" ON public.auction_sessions
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view auction teams" ON public.auction_teams
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view auction players" ON public.auction_players
    FOR SELECT USING (true);

-- Allow all authenticated users to write (you can restrict this later if needed)
-- For now, we'll handle write restrictions in the application code
CREATE POLICY "Authenticated users can update auction sessions" ON public.auction_sessions
    FOR ALL USING (true);

CREATE POLICY "Authenticated users can update auction teams" ON public.auction_teams
    FOR ALL USING (true);

CREATE POLICY "Authenticated users can insert auction players" ON public.auction_players
    FOR INSERT WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_auction_sessions_updated_at BEFORE UPDATE ON public.auction_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auction_teams_updated_at BEFORE UPDATE ON public.auction_teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

