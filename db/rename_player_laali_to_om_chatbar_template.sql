-- Rename player display name "Laali" → "Om Chatbar" across tournament data.
-- Run in Supabase SQL editor (review counts, then uncomment COMMIT or run without a transaction wrapper).
--
-- Covers:
--   - tournament_participants.player_name (rosters, team membership, stats linkage)
--   - match_players.player_name (singles / bracket draw rows)
--   - matches.notes doubles JSON (__JSON__{... "name":"Laali" ...}) and common Umpire text lines
--
-- Optional: scope to ONE tournament by uncommenting the AND tournament_id filters below.

-- BEGIN;

-- --- Preview (optional): see what will change ---
-- SELECT id, tournament_id, player_name FROM public.tournament_participants WHERE lower(trim(player_name)) = 'laali';
-- SELECT mp.id, mp.match_id, mp.player_name FROM public.match_players mp WHERE lower(trim(mp.player_name)) = 'laali';
-- SELECT id, tournament_id, left(notes, 120) AS notes_preview FROM public.matches WHERE notes ILIKE '%laali%';

-- 1) Rosters / participants
UPDATE public.tournament_participants tp
SET player_name = 'Om Chatbar'
WHERE lower(trim(tp.player_name)) = 'laali'
  -- AND tp.tournament_id = '00000000-0000-0000-0000-000000000000'::uuid
;

-- 2) Match draw rows (individual / bracket matches)
UPDATE public.match_players mp
SET player_name = 'Om Chatbar'
WHERE lower(trim(mp.player_name)) = 'laali'
  -- AND EXISTS (
  --   SELECT 1 FROM public.matches m WHERE m.id = mp.match_id AND m.tournament_id = '00000000-0000-0000-0000-000000000000'::uuid
  -- )
;

-- 3a) Doubles lineup JSON in notes (names are copied at schedule generation time)
UPDATE public.matches m
SET notes = regexp_replace(
  m.notes,
  '"name"\s*:\s*"Laali"',
  '"name":"Om Chatbar"',
  'g'
)
WHERE m.notes IS NOT NULL
  AND m.notes ~ '"name"\s*:\s*"Laali"'
  -- AND m.tournament_id = '00000000-0000-0000-0000-000000000000'::uuid
;

-- 3b) Umpire prefix lines (text before __JSON__ block)
UPDATE public.matches m
SET notes = regexp_replace(
  m.notes,
  '(?i)(^|\n)(ump(ire)?\s*:\s*)Laali([\s\n]|$)',
  '\1\2Om Chatbar\4',
  'g'
)
WHERE m.notes IS NOT NULL
  AND m.notes ~* 'ump(ire)?\s*:\s*Laali'
  -- AND m.tournament_id = '00000000-0000-0000-0000-000000000000'::uuid
;

-- COMMIT;
