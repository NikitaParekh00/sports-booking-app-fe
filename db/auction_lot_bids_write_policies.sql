-- Bids are written from Next.js API routes using SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
-- If you only see "Could not save bid", confirm:
--   1) auction_timed_owner_mode.sql was run (table auction_lot_bids exists)
--   2) .env.local has SUPABASE_SERVICE_ROLE_KEY (secret key, not sb_publishable_)

-- Optional: allow authenticated users to read their session's bids (already have SELECT for authenticated)
-- No anon INSERT — bids must go through the API with service role.