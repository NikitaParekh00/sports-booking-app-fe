-- Add owner_name column to auction_teams table

ALTER TABLE public.auction_teams
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(100);

