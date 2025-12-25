-- Create auction_skipped_players table
-- This table stores players that were skipped during the auction
-- This provides a single source of truth instead of calculating skipped players dynamically

CREATE TABLE IF NOT EXISTS public.auction_skipped_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.auction_sessions(id) ON DELETE CASCADE NOT NULL,
    player_pool_id UUID REFERENCES public.auction_player_pool(id) ON DELETE CASCADE NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    skipped_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    player_order INTEGER NOT NULL, -- Order in which player was skipped (for maintaining order)
    UNIQUE(session_id, player_pool_id) -- Prevent duplicate entries
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_auction_skipped_players_session ON public.auction_skipped_players(session_id);
CREATE INDEX IF NOT EXISTS idx_auction_skipped_players_order ON public.auction_skipped_players(session_id, player_order);

-- Enable RLS
ALTER TABLE public.auction_skipped_players ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read skipped players
CREATE POLICY "Anyone can view skipped players" ON public.auction_skipped_players
    FOR SELECT USING (true);

-- Allow authenticated users to insert/update skipped players
CREATE POLICY "Authenticated users can manage skipped players" ON public.auction_skipped_players
    FOR ALL USING (true);

