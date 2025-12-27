-- Add bid tracking columns to auction_sessions table
-- This allows real-time synchronization of bid amounts across all devices

ALTER TABLE public.auction_sessions
ADD COLUMN IF NOT EXISTS current_bid_amount DECIMAL(12, 2) DEFAULT 5000;

ALTER TABLE public.auction_sessions
ADD COLUMN IF NOT EXISTS current_bid_team_id INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN public.auction_sessions.current_bid_amount IS 'Current bid amount for the active player being auctioned';
COMMENT ON COLUMN public.auction_sessions.current_bid_team_id IS 'Team ID that has placed the current bid';

