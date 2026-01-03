-- Add tournament_logo column to auction_sessions table
ALTER TABLE public.auction_sessions
ADD COLUMN IF NOT EXISTS tournament_logo TEXT;

-- Add comment to column
COMMENT ON COLUMN public.auction_sessions.tournament_logo IS 'Tournament logo URL. Can be a Google Drive share link or direct image URL. Must be publicly accessible.';

