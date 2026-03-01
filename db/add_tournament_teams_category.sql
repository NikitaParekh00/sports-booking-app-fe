-- Add category to tournament_teams for category-based round-robin (e.g. Category A vs A, B vs B).
ALTER TABLE public.tournament_teams
ADD COLUMN IF NOT EXISTS category VARCHAR(50);

COMMENT ON COLUMN public.tournament_teams.category IS 'Category for round-robin grouping (e.g. A, B, C). Matches are generated within same category.';
