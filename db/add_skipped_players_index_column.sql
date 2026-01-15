-- Add skipped_players_index column to auction_sessions table
-- This allows maintaining separate indexes for main players list and skipped players list

ALTER TABLE public.auction_sessions
ADD COLUMN IF NOT EXISTS skipped_players_index INTEGER DEFAULT 0;

COMMENT ON COLUMN public.auction_sessions.skipped_players_index IS 'Current player index when in skipped players mode. Allows switching between main list and skipped players while maintaining position in both.';
