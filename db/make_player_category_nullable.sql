-- Make player_category and gender nullable in auction_players table
-- This allows players to be bought without a category or gender

ALTER TABLE public.auction_players 
ALTER COLUMN player_category DROP NOT NULL;

ALTER TABLE public.auction_players 
ALTER COLUMN gender DROP NOT NULL;

