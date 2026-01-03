-- Add sold_player_info column to auction_sessions table
ALTER TABLE public.auction_sessions
ADD COLUMN IF NOT EXISTS sold_player_info JSONB;

-- Add comment to column
COMMENT ON COLUMN public.auction_sessions.sold_player_info IS 'Stores information about the last sold player: {playerName, teamName, amount}. Used to show congratulations popup to all users.';

