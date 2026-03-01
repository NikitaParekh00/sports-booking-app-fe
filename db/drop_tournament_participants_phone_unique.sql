-- Allow same phone to be added multiple times to the same tournament.
-- Run this in Supabase SQL Editor (or your migration runner).

DROP INDEX IF EXISTS public.tournament_participants_tournament_phone_unique;
