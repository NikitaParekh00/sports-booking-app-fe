-- Fix: Remove participant not working on tournament detail page (RLS blocks DELETE when auth.uid() is null).
-- Run this in Supabase SQL Editor.

DROP POLICY IF EXISTS "Users can delete tournament participants for their tournaments" ON public.tournament_participants;
DROP POLICY IF EXISTS "Users can update tournament participants for their tournaments" ON public.tournament_participants;

-- Allow UPDATE and DELETE (auth checked in app layer; same as INSERT fix)
CREATE POLICY "Allow tournament participant updates" ON public.tournament_participants
  FOR UPDATE USING (true);

CREATE POLICY "Allow tournament participant deletes" ON public.tournament_participants
  FOR DELETE USING (true);
