-- Player confirmations on /auction/confirm (run in Supabase SQL editor)

CREATE TABLE IF NOT EXISTS public.auction_profile_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.auction_sessions(id) ON DELETE CASCADE,
    player_pool_id UUID NOT NULL,
    player_name TEXT,
    approver_phone TEXT NOT NULL,
    approver_user_id TEXT,
    approver_name TEXT,
    approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, player_pool_id)
);

CREATE INDEX IF NOT EXISTS idx_auction_profile_approvals_session ON public.auction_profile_approvals(session_id);

ALTER TABLE public.auction_profile_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow submit auction profile approval" ON public.auction_profile_approvals;
CREATE POLICY "Allow submit auction profile approval" ON public.auction_profile_approvals
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update own profile approval" ON public.auction_profile_approvals;
CREATE POLICY "Allow update own profile approval" ON public.auction_profile_approvals
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- anon needs SELECT too: PostgREST upsert checks existing rows under RLS
DROP POLICY IF EXISTS "Authenticated read profile approvals" ON public.auction_profile_approvals;
DROP POLICY IF EXISTS "Allow read auction profile approvals" ON public.auction_profile_approvals;
CREATE POLICY "Allow read auction profile approvals" ON public.auction_profile_approvals
    FOR SELECT
    TO anon, authenticated
    USING (true);

GRANT SELECT, INSERT, UPDATE ON public.auction_profile_approvals TO anon, authenticated;