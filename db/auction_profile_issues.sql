-- Player-reported issues on /auction/confirm (run in Supabase SQL editor)

CREATE TABLE IF NOT EXISTS public.auction_profile_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.auction_sessions(id) ON DELETE SET NULL,
    player_pool_id UUID,
    player_name TEXT,
    reporter_phone TEXT NOT NULL,
    reporter_user_id TEXT,
    reporter_name TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auction_profile_issues_session ON public.auction_profile_issues(session_id);
CREATE INDEX IF NOT EXISTS idx_auction_profile_issues_status ON public.auction_profile_issues(status);

ALTER TABLE public.auction_profile_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow submit auction profile issue" ON public.auction_profile_issues;
CREATE POLICY "Allow submit auction profile issue" ON public.auction_profile_issues
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);