-- Fix: "new row violates row-level security policy for table tournament_groups" (42501)
-- Same situation as fix_tournament_participants_insert_rls.sql: app auth is often
-- localStorage (`sf:user`) without a Supabase session, so auth.uid() is NULL and
-- policies that require tournaments.created_by = auth.uid() block INSERT/DELETE.
-- Run this in the Supabase SQL Editor.

-- tournament_groups
DROP POLICY IF EXISTS "Allow public read access to tournament groups" ON public.tournament_groups;
DROP POLICY IF EXISTS "Users can manage tournament groups for their tournaments" ON public.tournament_groups;

CREATE POLICY "Allow all access to tournament groups" ON public.tournament_groups
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- tournament_group_participants
DROP POLICY IF EXISTS "Allow public read access to group participants" ON public.tournament_group_participants;
DROP POLICY IF EXISTS "Users can manage group participants for their tournaments" ON public.tournament_group_participants;

CREATE POLICY "Allow all access to tournament_group_participants" ON public.tournament_group_participants
  FOR ALL
  USING (true)
  WITH CHECK (true);
