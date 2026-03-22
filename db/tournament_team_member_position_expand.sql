-- Allow more than 2 players per tournament team (e.g. 6-player squads with rotating doubles).
-- Run in Supabase SQL editor if you still have CHECK (position IN (1, 2)).

ALTER TABLE public.tournament_team_members
  DROP CONSTRAINT IF EXISTS tournament_team_members_position_check;

ALTER TABLE public.tournament_team_members
  ADD CONSTRAINT tournament_team_members_position_check
  CHECK (position >= 1 AND position <= 30);
