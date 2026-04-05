-- Swap display names: "Anaisha Mehta" <-> "Harshiv jani" everywhere they appear in tournament data.
-- You cannot swap with two plain UPDATEs (the second would overwrite the first). This uses a temporary token.
--
-- HOW TO RUN (Supabase)
--   1. Open your project → SQL Editor → New query.
--   2. Paste this whole file (or run section by section if you prefer).
--   3. Optional: uncomment the preview SELECTs below, run them, confirm row counts.
--   4. Run the UPDATE blocks in order (1a → 1b → 1c, then 2a → 2b → 2c, then 3a → 3b → 3c).
--   5. If you wrapped in BEGIN; … COMMIT;, run COMMIT when satisfied.
--
-- Covers:
--   - tournament_participants.player_name
--   - match_players.player_name
--   - matches.notes (doubles JSON + Umpire lines)
--   - profiles.full_name (only rows that match exactly these names; skip block if not needed)
--
-- If your data uses different casing (e.g. "Harshiv Jani"), change the literals in WHERE/regexp to match,
-- or rely on lower(trim(...)) on table columns (already used for participants / match_players / profiles).

-- Must not appear in real data:
-- \set swap_tmp '__SF_SWAP_TMP_ANAISHA_HARSHIV__'
-- (Supabase SQL editor has no \set; literal used below)

-- BEGIN;

-- --- Preview (optional) ---
-- SELECT id, tournament_id, player_name FROM public.tournament_participants
--   WHERE lower(trim(player_name)) IN ('anaisha mehta', 'harshiv jani');
-- SELECT mp.id, mp.match_id, mp.player_name FROM public.match_players mp
--   WHERE lower(trim(mp.player_name)) IN ('anaisha mehta', 'harshiv jani');
-- SELECT id, tournament_id, left(notes, 160) FROM public.matches
--   WHERE notes ILIKE '%anaisha mehta%' OR notes ILIKE '%harshiv jani%';
-- SELECT user_id, full_name FROM public.profiles
--   WHERE lower(trim(full_name)) IN ('anaisha mehta', 'harshiv jani');

-- ========== PASS 1: Anaisha Mehta → temp ==========

UPDATE public.tournament_participants tp
SET player_name = '__SF_SWAP_TMP_ANAISHA_HARSHIV__'
WHERE lower(trim(tp.player_name)) = 'anaisha mehta';

UPDATE public.match_players mp
SET player_name = '__SF_SWAP_TMP_ANAISHA_HARSHIV__'
WHERE lower(trim(mp.player_name)) = 'anaisha mehta';

UPDATE public.matches m
SET notes = regexp_replace(
  m.notes,
  '"name"\s*:\s*"Anaisha Mehta"',
  '"name":"__SF_SWAP_TMP_ANAISHA_HARSHIV__"',
  'gi'
)
WHERE m.notes IS NOT NULL
  AND m.notes ~* '"name"\s*:\s*"Anaisha Mehta"';

UPDATE public.matches m
SET notes = regexp_replace(
  m.notes,
  '(?i)(^|\n)(ump(ire)?\s*:\s*)Anisha Mehta([\s\n]|$)',
  '\1\2__SF_SWAP_TMP_ANAISHA_HARSHIV__\4',
  'g'
)
WHERE m.notes IS NOT NULL
  AND m.notes ~* 'ump(ire)?\s*:\s*Anisha Mehta';

UPDATE public.profiles p
SET full_name = '__SF_SWAP_TMP_ANAISHA_HARSHIV__'
WHERE lower(trim(p.full_name)) = 'anaisha mehta';

-- ========== PASS 2: Harshiv jani → Anaisha Mehta ==========

UPDATE public.tournament_participants tp
SET player_name = 'Anaisha Mehta'
WHERE lower(trim(tp.player_name)) = 'harshiv jani';

UPDATE public.match_players mp
SET player_name = 'Anaisha Mehta'
WHERE lower(trim(mp.player_name)) = 'harshiv jani';

UPDATE public.matches m
SET notes = regexp_replace(
  m.notes,
  '"name"\s*:\s*"Harshiv jani"',
  '"name":"Anaisha Mehta"',
  'gi'
)
WHERE m.notes IS NOT NULL
  AND m.notes ~* '"name"\s*:\s*"Harshiv jani"';

UPDATE public.matches m
SET notes = regexp_replace(
  m.notes,
  '(?i)(^|\n)(ump(ire)?\s*:\s*)Harshiv jani([\s\n]|$)',
  '\1\2Anaisha Mehta\4',
  'g'
)
WHERE m.notes IS NOT NULL
  AND m.notes ~* 'ump(ire)?\s*:\s*Harshiv jani';

UPDATE public.profiles p
SET full_name = 'Anaisha Mehta'
WHERE lower(trim(p.full_name)) = 'harshiv jani';

-- ========== PASS 3: temp → Harshiv jani ==========

UPDATE public.tournament_participants tp
SET player_name = 'Harshiv jani'
WHERE tp.player_name = '__SF_SWAP_TMP_ANAISHA_HARSHIV__';

UPDATE public.match_players mp
SET player_name = 'Harshiv jani'
WHERE mp.player_name = '__SF_SWAP_TMP_ANAISHA_HARSHIV__';

UPDATE public.matches m
SET notes = regexp_replace(
  m.notes,
  '"name"\s*:\s*"__SF_SWAP_TMP_ANAISHA_HARSHIV__"',
  '"name":"Harshiv jani"',
  'g'
)
WHERE m.notes IS NOT NULL
  AND m.notes LIKE '%__SF_SWAP_TMP_ANAISHA_HARSHIV__%';

UPDATE public.matches m
SET notes = regexp_replace(
  m.notes,
  '(?i)(^|\n)(ump(ire)?\s*:\s*)__SF_SWAP_TMP_ANAISHA_HARSHIV__([\s\n]|$)',
  '\1\2Harshiv jani\4',
  'g'
)
WHERE m.notes IS NOT NULL
  AND m.notes LIKE '%__SF_SWAP_TMP_ANAISHA_HARSHIV__%';

UPDATE public.profiles p
SET full_name = 'Harshiv jani'
WHERE p.full_name = '__SF_SWAP_TMP_ANAISHA_HARSHIV__';

-- COMMIT;
