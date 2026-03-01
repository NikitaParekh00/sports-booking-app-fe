-- Fix: "new row violates row-level security policy for table tournament_participants"
-- Run this in Supabase SQL Editor if adding participants (on create or later) fails with 42501.
-- Your app uses localStorage auth, so auth.uid() is often null and the old policy blocks INSERT.

-- Remove any policy that restricts INSERT to auth.uid() / tournament owner only
DROP POLICY IF EXISTS "Users can manage tournament participants for their tournaments" ON public.tournament_participants;
DROP POLICY IF EXISTS "Allow tournament participant creation for authenticated users" ON public.tournament_participants;

-- Keep public read
DROP POLICY IF EXISTS "Allow public read access to tournament participants" ON public.tournament_participants;
CREATE POLICY "Allow public read access to tournament participants" ON public.tournament_participants
  FOR SELECT USING (true);

-- Allow INSERT so participants can be added when creating/editing a tournament (auth checked in app)
CREATE POLICY "Allow tournament participant creation" ON public.tournament_participants
  FOR INSERT WITH CHECK (true);

-- Allow UPDATE/DELETE only for tournaments owned by the current Supabase user (optional; keeps some RLS)
CREATE POLICY "Users can update tournament participants for their tournaments" ON public.tournament_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = tournament_participants.tournament_id
      AND tournaments.created_by = auth.uid()
    )
  );
CREATE POLICY "Users can delete tournament participants for their tournaments" ON public.tournament_participants
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tournaments
      WHERE tournaments.id = tournament_participants.tournament_id
      AND tournaments.created_by = auth.uid()
    )
  );
