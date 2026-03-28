-- Delete matches for one tournament (Supabase SQL editor).
-- Replace YOUR_TOURNAMENT_ID with the uuid from the tournament URL / table.
--
-- 1) Preview what will be deleted:
-- SELECT id, match_number, match_type, status, court_number, match_date
-- FROM public.matches
-- WHERE tournament_id = 'YOUR_TOURNAMENT_ID'::uuid;

-- 2) Delete only tournament matches for that event (recommended):
DELETE FROM public.matches
WHERE tournament_id = 'YOUR_TOURNAMENT_ID'::uuid
  AND match_type = 'tournament';

-- Optional: delete every match row tied to the tournament (if you use other match_type values):
-- DELETE FROM public.matches
-- WHERE tournament_id = 'YOUR_TOURNAMENT_ID'::uuid;

-- Optional: clear times only (keep matches), then re-run "Assign times" in the app:
-- UPDATE public.matches
-- SET match_date = NULL
-- WHERE tournament_id = 'YOUR_TOURNAMENT_ID'::uuid
--   AND match_type = 'tournament';
