-- Timed owner bidding: one player at a time, owners submit bids until lot_ends_at

ALTER TABLE public.auction_sessions
ADD COLUMN IF NOT EXISTS auction_mode TEXT NOT NULL DEFAULT 'live_admin';

ALTER TABLE public.auction_sessions
DROP CONSTRAINT IF EXISTS auction_sessions_auction_mode_check;

ALTER TABLE public.auction_sessions
ADD CONSTRAINT auction_sessions_auction_mode_check
CHECK (auction_mode IN ('live_admin', 'timed_owner'));

ALTER TABLE public.auction_sessions
ADD COLUMN IF NOT EXISTS lot_ends_at TIMESTAMPTZ;

ALTER TABLE public.auction_sessions
ADD COLUMN IF NOT EXISTS lot_duration_seconds INTEGER NOT NULL DEFAULT 180;

ALTER TABLE public.auction_sessions
ADD COLUMN IF NOT EXISTS timed_lot_player_pool_id UUID;

ALTER TABLE public.auction_teams
ADD COLUMN IF NOT EXISTS owner_phone TEXT;

CREATE TABLE IF NOT EXISTS public.auction_lot_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.auction_sessions(id) ON DELETE CASCADE,
    player_pool_id UUID NOT NULL,
    team_id UUID NOT NULL REFERENCES public.auction_teams(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    bidder_phone TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, player_pool_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_auction_lot_bids_session_player ON public.auction_lot_bids(session_id, player_pool_id);

ALTER TABLE public.auction_lot_bids ENABLE ROW LEVEL SECURITY;

-- API uses service role; optional read for authenticated admins
DROP POLICY IF EXISTS "Service manages lot bids" ON public.auction_lot_bids;
CREATE POLICY "Authenticated read lot bids" ON public.auction_lot_bids
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anon cannot read lot bids" ON public.auction_lot_bids;