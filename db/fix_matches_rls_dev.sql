-- Fix RLS policies for development - more permissive approach
-- This allows match creation during development with localStorage auth

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow match creation" ON public.matches;
DROP POLICY IF EXISTS "Users can manage their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can manage match players for their matches" ON public.match_players;
DROP POLICY IF EXISTS "Allow match player creation" ON public.match_players;

-- Create very permissive policies for development
-- WARNING: These are for development only - make more restrictive for production

-- Allow all authenticated users to create matches
CREATE POLICY "Dev: Allow match creation" ON public.matches
  FOR INSERT TO authenticated 
  WITH CHECK (true);

-- Allow all authenticated users to read matches
CREATE POLICY "Dev: Allow match reading" ON public.matches
  FOR SELECT TO authenticated 
  USING (true);

-- Allow all authenticated users to update matches
CREATE POLICY "Dev: Allow match updates" ON public.matches
  FOR UPDATE TO authenticated 
  USING (true);

-- Allow all authenticated users to delete matches
CREATE POLICY "Dev: Allow match deletion" ON public.matches
  FOR DELETE TO authenticated 
  USING (true);

-- Allow all authenticated users to create match players
CREATE POLICY "Dev: Allow match player creation" ON public.match_players
  FOR INSERT TO authenticated 
  WITH CHECK (true);

-- Allow all authenticated users to read match players
CREATE POLICY "Dev: Allow match player reading" ON public.match_players
  FOR SELECT TO authenticated 
  USING (true);

-- Allow all authenticated users to update match players
CREATE POLICY "Dev: Allow match player updates" ON public.match_players
  FOR UPDATE TO authenticated 
  USING (true);

-- Allow all authenticated users to delete match players
CREATE POLICY "Dev: Allow match player deletion" ON public.match_players
  FOR DELETE TO authenticated 
  USING (true);

-- Verify the policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('matches', 'match_players')
ORDER BY tablename, policyname;
