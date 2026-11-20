-- Tournament schedule text on player profile confirm (multi-line OK)

ALTER TABLE public.auction_sessions
ADD COLUMN IF NOT EXISTS tournament_dates TEXT;

COMMENT ON COLUMN public.auction_sessions.tournament_dates IS 'Optional schedule on /auction/confirm, e.g. "9/1/27, 10/1/27 indoor\\n16/1/27, 17/1/27 outdoor\\nJan 2027".';

-- Example (JPL 2027):
-- UPDATE public.auction_sessions
-- SET tournament_dates = E'9/1/27, 10/1/27 indoor\n16/1/27, 17/1/27 outdoor\nJan 2027'
-- WHERE session_name = 'JPL 2027';