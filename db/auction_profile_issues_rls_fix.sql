-- Run this if "Report an issue" fails after creating the table.
-- (RLS was on with no INSERT policy — anon/server inserts were blocked.)

ALTER TABLE public.auction_profile_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow submit auction profile issue" ON public.auction_profile_issues;
CREATE POLICY "Allow submit auction profile issue" ON public.auction_profile_issues
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Optional: let authenticated users read their own reports (by phone) — skip if not needed.
-- DROP POLICY IF EXISTS "Allow read own profile issues" ON public.auction_profile_issues;
-- CREATE POLICY "Allow read own profile issues" ON public.auction_profile_issues
--     FOR SELECT TO authenticated
--     USING (true);