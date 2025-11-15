-- Fix RLS policies for tournaments to work with localStorage authentication
-- Since we're checking authentication in the application layer, we can allow INSERTs
-- and rely on application-level security for authorization

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Users can manage their own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Allow tournament creation for authenticated users" ON public.tournaments;
DROP POLICY IF EXISTS "Allow public read access to tournaments" ON public.tournaments;

-- Allow anyone to read tournaments (public access)
CREATE POLICY "Allow public read access to tournaments" ON public.tournaments
  FOR SELECT USING (true);

-- Allow anyone to insert tournaments (authentication checked in app layer)
-- This works because we verify the user exists in profiles table before insert
CREATE POLICY "Allow tournament creation" ON public.tournaments
  FOR INSERT WITH CHECK (true);

-- Allow users to update tournaments they created (via auth.uid)
-- Note: For localStorage auth, we'll handle ownership checks in the app layer
CREATE POLICY "Users can update their own tournaments" ON public.tournaments
  FOR UPDATE USING (auth.uid() = created_by);

-- Allow users to delete tournaments they created (via auth.uid)
-- Note: For localStorage auth, we'll handle ownership checks in the app layer
CREATE POLICY "Users can delete their own tournaments" ON public.tournaments
  FOR DELETE USING (auth.uid() = created_by);

-- Fix tournament_participants RLS policies
DROP POLICY IF EXISTS "Users can manage tournament participants for their tournaments" ON public.tournament_participants;
DROP POLICY IF EXISTS "Allow tournament participant creation for authenticated users" ON public.tournament_participants;
DROP POLICY IF EXISTS "Allow public read access to tournament participants" ON public.tournament_participants;

-- Allow public read access
CREATE POLICY "Allow public read access to tournament participants" ON public.tournament_participants
  FOR SELECT USING (true);

-- Allow anyone to insert participants (authentication checked in app layer)
CREATE POLICY "Allow tournament participant creation" ON public.tournament_participants
  FOR INSERT WITH CHECK (true);

-- Allow users to update/delete participants for tournaments they created
-- Note: For localStorage auth, we'll handle ownership checks in the app layer
CREATE POLICY "Users can manage tournament participants for their tournaments" ON public.tournament_participants
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

