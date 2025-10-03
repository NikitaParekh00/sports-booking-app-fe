-- Create matches table if it doesn't exist or fix structure
-- This ensures the table has the correct columns for match creation

-- 1. Create matches table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sport TEXT NOT NULL,
    match_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming',
    match_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create match_players table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.match_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    phone TEXT,
    team TEXT NOT NULL,
    is_captain BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

-- 4. Create basic RLS policies
DROP POLICY IF EXISTS "Users can manage their own matches" ON public.matches;
DROP POLICY IF EXISTS "Users can manage match players" ON public.match_players;

CREATE POLICY "Users can manage their own matches" ON public.matches
  FOR ALL USING (auth.uid() = created_by);

CREATE POLICY "Users can manage match players" ON public.match_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = match_players.match_id 
      AND matches.created_by = auth.uid()
    )
  );

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_matches_created_by ON public.matches(created_by);
CREATE INDEX IF NOT EXISTS idx_matches_sport ON public.matches(sport);
CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON public.match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_user_id ON public.match_players(user_id);

-- 6. Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'matches' 
AND table_schema = 'public'
ORDER BY ordinal_position;
