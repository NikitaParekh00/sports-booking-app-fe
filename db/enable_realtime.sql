-- Enable Real-time Replication for Auction Tables
-- This allows all users to see live updates without refreshing

-- Enable replication for auction_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_sessions;

-- Enable replication for auction_teams
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_teams;

-- Enable replication for auction_players
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_players;

-- Enable replication for auction_player_pool
ALTER PUBLICATION supabase_realtime ADD TABLE public.auction_player_pool;

-- Note: If the above commands fail, you may need to enable replication in Supabase Dashboard:
-- 1. Go to Database > Replication
-- 2. Enable replication for these tables:
--    - auction_sessions
--    - auction_teams
--    - auction_players
--    - auction_player_pool

