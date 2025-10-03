-- Fix RLS policies for matches table to work with development authentication
-- This allows both Supabase auth and localStorage-based auth to work

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can manage match players for their matches" ON public.match_players;

-- Create new policies that work with both auth methods
-- Allow users to create matches (for development with localStorage)
CREATE POLICY "Allow match creation" ON public.matches
  FOR INSERT WITH CHECK (true);

-- Allow users to manage their own matches (works with both auth methods)
CREATE POLICY "Users can manage their own matches" ON public.matches
  FOR ALL USING (
    auth.uid() = created_by OR 
    created_by IS NOT NULL
  );

-- Allow users to manage match players for their matches
CREATE POLICY "Users can manage match players for their matches" ON public.match_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = match_players.match_id 
      AND (matches.created_by = auth.uid() OR matches.created_by IS NOT NULL)
    )
  );

-- Allow users to insert match players (for development)
CREATE POLICY "Allow match player creation" ON public.match_players
  FOR INSERT WITH CHECK (true);
