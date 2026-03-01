-- Prevent the same participant (same phone) being added multiple times to the same tournament.
-- Run this in Supabase SQL Editor.

-- Step 1: Delete duplicate rows (keep one per tournament_id + phone; deletes the newer duplicates)
DELETE FROM public.tournament_participants a
USING public.tournament_participants b
WHERE a.tournament_id = b.tournament_id
  AND a.phone IS NOT NULL AND a.phone != ''
  AND b.phone IS NOT NULL AND b.phone != ''
  AND a.phone = b.phone
  AND a.created_at > b.created_at;

-- Step 2: Create unique index (same phone cannot appear twice in the same tournament)
CREATE UNIQUE INDEX IF NOT EXISTS tournament_participants_tournament_phone_unique
  ON public.tournament_participants (tournament_id, phone)
  WHERE phone IS NOT NULL AND phone != '';

-- Optional: prevent duplicate (tournament_id, player_name) when phone is null
-- so the same name can't be added twice without a phone. Uncomment if you want it:
-- CREATE UNIQUE INDEX IF NOT EXISTS tournament_participants_tournament_name_phone_null_unique
--   ON public.tournament_participants (tournament_id, player_name)
--   WHERE phone IS NULL OR phone = '';
