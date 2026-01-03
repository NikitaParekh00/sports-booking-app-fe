-- Add team configuration settings to auction_settings table
ALTER TABLE public.auction_settings
ADD COLUMN IF NOT EXISTS default_team_budget NUMERIC(12, 2);

-- If column already exists with NOT NULL, make it nullable
ALTER TABLE public.auction_settings
ALTER COLUMN default_team_budget DROP NOT NULL;

ALTER TABLE public.auction_settings
ADD COLUMN IF NOT EXISTS allow_multiple_player_assignment BOOLEAN DEFAULT TRUE NOT NULL;

-- Add comments to columns
COMMENT ON COLUMN public.auction_settings.default_team_budget IS 'Default budget amount for all teams. Can be used to set all teams to the same budget.';
COMMENT ON COLUMN public.auction_settings.allow_multiple_player_assignment IS 'Whether multiple players can be assigned to a team at once (for admin bulk operations).';

