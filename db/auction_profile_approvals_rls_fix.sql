-- Run if approve fails with "row-level security policy" (API uses anon key + upsert needs SELECT)

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

-- Upsert + .select() from the API role need SELECT, not only authenticated admins
DROP POLICY IF EXISTS "Authenticated read profile approvals" ON public.auction_profile_approvals;
DROP POLICY IF EXISTS "Allow read auction profile approvals" ON public.auction_profile_approvals;
CREATE POLICY "Allow read auction profile approvals" ON public.auction_profile_approvals
    FOR SELECT
    TO anon, authenticated
    USING (true);

GRANT SELECT, INSERT, UPDATE ON public.auction_profile_approvals TO anon, authenticated;