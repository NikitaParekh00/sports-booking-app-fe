-- Per-sport star ratings (1–5) for auction players, e.g. {"pickle":4,"padel":5,"table_tennis":3,"badminton":4,"carrom":2,"chess":5}

ALTER TABLE public.auction_player_pool
ADD COLUMN IF NOT EXISTS sport_ratings JSONB;

ALTER TABLE public.auction_players
ADD COLUMN IF NOT EXISTS sport_ratings JSONB;