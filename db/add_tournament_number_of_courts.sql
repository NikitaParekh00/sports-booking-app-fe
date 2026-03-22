-- Configurable court count for team tournament schedules (run in Supabase SQL editor)
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS number_of_courts INTEGER DEFAULT 3
  CHECK (number_of_courts >= 1 AND number_of_courts <= 16);

COMMENT ON COLUMN public.tournaments.number_of_courts IS 'How many parallel courts to show/use for schedule generation (1–16).';
