-- Add owner_photo column to auction_teams table
ALTER TABLE public.auction_teams
ADD COLUMN IF NOT EXISTS owner_photo TEXT;

-- Add comment to column
COMMENT ON COLUMN public.auction_teams.owner_photo IS 'Owner photo URL. Can be a Google Drive share link or direct image URL. Must be publicly accessible.';

