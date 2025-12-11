-- Add photo, age, and skills columns to auction_player_pool table

-- Add photo column (URL to player photo)
ALTER TABLE public.auction_player_pool
ADD COLUMN IF NOT EXISTS photo TEXT;

-- Add age column
ALTER TABLE public.auction_player_pool
ADD COLUMN IF NOT EXISTS age INTEGER;

-- Add skills column (can store multiple skills as text or JSON)
ALTER TABLE public.auction_player_pool
ADD COLUMN IF NOT EXISTS skills TEXT;

-- Also add these columns to auction_players table (for players that have been bought)
ALTER TABLE public.auction_players
ADD COLUMN IF NOT EXISTS photo TEXT;

ALTER TABLE public.auction_players
ADD COLUMN IF NOT EXISTS age INTEGER;

ALTER TABLE public.auction_players
ADD COLUMN IF NOT EXISTS skills TEXT;

