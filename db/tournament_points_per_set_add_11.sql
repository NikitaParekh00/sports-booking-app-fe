-- Pickleball uses 11 points per game; create form sent 11 and violated CHECK (15, 21).
-- Run once on existing databases.

ALTER TABLE public.tournaments DROP CONSTRAINT IF EXISTS tournaments_points_per_set_check;

ALTER TABLE public.tournaments
  ADD CONSTRAINT tournaments_points_per_set_check
  CHECK (points_per_set IN (11, 15, 21));
