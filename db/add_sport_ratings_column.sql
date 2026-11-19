-- Per-sport star ratings (1–5) for auction players, e.g. {"cricket":4,"pickleball":5}

ALTER TABLE public.auction_player_pool
ADD COLUMN IF NOT EXISTS sport_ratings JSONB;

ALTER TABLE public.auction_players
ADD COLUMN IF NOT EXISTS sport_ratings JSONB;