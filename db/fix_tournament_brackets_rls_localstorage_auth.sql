-- Fix RLS on tournament_brackets when auth.uid() is null (localStorage auth).
-- Run in Supabase SQL Editor after fix_tournament_groups_rls_localstorage_auth.sql if needed.

DROP POLICY IF EXISTS "Allow public read access to tournament brackets" ON public.tournament_brackets;
DROP POLICY IF EXISTS "Users can manage tournament brackets for their tournaments" ON public.tournament_brackets;

CREATE POLICY "Allow all access to tournament_brackets" ON public.tournament_brackets
  FOR ALL
  USING (true)
  WITH CHECK (true);
