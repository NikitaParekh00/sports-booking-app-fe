-- Allow 1 game per match (was 3 or 5 only). Run if you already have tournament_schema applied.
ALTER TABLE public.tournaments
  DROP CONSTRAINT IF EXISTS tournaments_sets_per_match_check;

ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_sets_per_match_check
  CHECK (sets_per_match IN (1, 3, 5));
