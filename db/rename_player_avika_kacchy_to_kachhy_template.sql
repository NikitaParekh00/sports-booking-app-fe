-- Fix spelling: "Avika Kacchy" → "Avika Kachhy" across tournament data.
-- Run in Supabase SQL editor (preview with SELECTs first if you like).
--
-- Covers:
--   - tournament_participants.player_name
--   - match_players.player_name
--   - matches.notes (doubles JSON and Umpire text lines)
--   - profiles.full_name (app account display name, if present)
--
-- Optional: scope to ONE tournament by uncommenting the AND tournament_id filters below.

-- BEGIN;

-- --- Preview (optional) ---
-- SELECT id, tournament_id, player_name FROM public.tournament_participants WHERE lower(trim(player_name)) = 'avika kacchy';
-- SELECT mp.id, mp.match_id, mp.player_name FROM public.match_players mp WHERE lower(trim(mp.player_name)) = 'avika kacchy';
-- SELECT id, tournament_id, left(notes, 120) AS notes_preview FROM public.matches WHERE notes ILIKE '%avika kacchy%';
-- SELECT user_id, full_name, phone FROM public.profiles WHERE lower(trim(full_name)) = 'avika kacchy';

-- 1) Rosters / participants
UPDATE public.tournament_participants tp
SET player_name = 'Avika Kachhy'
WHERE lower(trim(tp.player_name)) = 'avika kacchy'
  -- AND tp.tournament_id = '00000000-0000-0000-0000-000000000000'::uuid
;

-- 2) Match draw rows
UPDATE public.match_players mp
SET player_name = 'Avika Kachhy'
WHERE lower(trim(mp.player_name)) = 'avika kacchy'
  -- AND EXISTS (
  --   SELECT 1 FROM public.matches m WHERE m.id = mp.match_id AND m.tournament_id = '00000000-0000-0000-0000-000000000000'::uuid
  -- )
;

-- 3a) Doubles lineup JSON in notes
UPDATE public.matches m
SET notes = regexp_replace(
  m.notes,
  '"name"\s*:\s*"Avika Kacchy"',
  '"name":"Avika Kachhy"',
  'gi'
)
WHERE m.notes IS NOT NULL
  AND m.notes ~* '"name"\s*:\s*"Avika Kacchy"'
  -- AND m.tournament_id = '00000000-0000-0000-0000-000000000000'::uuid
;

-- 3b) Umpire prefix lines
UPDATE public.matches m
SET notes = regexp_replace(
  m.notes,
  '(?i)(^|\n)(ump(ire)?\s*:\s*)Avika Kacchy([\s\n]|$)',
  '\1\2Avika Kachhy\4',
  'g'
)
WHERE m.notes IS NOT NULL
  AND m.notes ~* 'ump(ire)?\s*:\s*Avika Kacchy'
  -- AND m.tournament_id = '00000000-0000-0000-0000-000000000000'::uuid
;

-- 4) Profile display name (skip this block if the player has no app profile row)
UPDATE public.profiles p
SET full_name = 'Avika Kachhy'
WHERE lower(trim(p.full_name)) = 'avika kacchy'
;

-- COMMIT;
