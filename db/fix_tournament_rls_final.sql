-- Fix RLS policies for tournaments to allow inserts
-- This ensures tournament creation works with localStorage authentication

-- Enable RLS if not already enabled
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Allow tournament creation for authenticated users" ON public.tournaments;
DROP POLICY IF EXISTS "Allow public read access to tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Allow tournament creation" ON public.tournaments;
DROP POLICY IF EXISTS "Users can update their own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can delete their own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Public can view tournaments" ON public.tournaments;

-- Allow anyone to read tournaments (public access)
CREATE POLICY "Allow public read access to tournaments" ON public.tournaments
  FOR SELECT USING (true);

-- Allow anyone to insert tournaments (authentication checked in app layer)
-- The app verifies user exists in profiles table before insert
CREATE POLICY "Allow tournament creation" ON public.tournaments
  FOR INSERT WITH CHECK (true);

-- Allow users to update tournaments they created
-- Note: For localStorage auth, ownership checks are handled in app layer
CREATE POLICY "Users can update their own tournaments" ON public.tournaments
  FOR UPDATE USING (true);

-- Allow users to delete tournaments they created
-- Note: For localStorage auth, ownership checks are handled in app layer
CREATE POLICY "Users can delete their own tournaments" ON public.tournaments
  FOR DELETE USING (true);
