-- Add is_skipped_players_mode column to auction_sessions table
ALTER TABLE public.auction_sessions
ADD COLUMN IF NOT EXISTS is_skipped_players_mode BOOLEAN DEFAULT false;

-- Add comment to column
COMMENT ON COLUMN public.auction_sessions.is_skipped_players_mode IS 'Indicates if the auction is currently viewing skipped players only. Used to sync the mode across all connected clients.';

