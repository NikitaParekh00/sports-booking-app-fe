-- Tournament Management Schema for Badminton Singles Tournaments
-- Run this after scoring_schema.sql

-- Tournament settings and format
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS format VARCHAR(50) DEFAULT 'single_elimination' 
  CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin', 'round_robin_knockout', 'swiss')),
ADD COLUMN IF NOT EXISTS sets_per_match INTEGER DEFAULT 3 CHECK (sets_per_match IN (1, 3, 5)),
ADD COLUMN IF NOT EXISTS points_per_set INTEGER DEFAULT 21 CHECK (points_per_set IN (15, 21)),
ADD COLUMN IF NOT EXISTS win_by_two BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS max_points INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS seeding_method VARCHAR(50) DEFAULT 'random' 
  CHECK (seeding_method IN ('random', 'manual', 'ranking', 'registration_order')),
ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_rounds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS brackets_generated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS groups_generated BOOLEAN DEFAULT false;

-- Tournament groups (for round-robin stages)
CREATE TABLE IF NOT EXISTS public.tournament_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  group_name VARCHAR(50) NOT NULL, -- 'A', 'B', 'C' or custom names
  group_order INTEGER DEFAULT 0, -- Order of groups
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, group_name)
);

-- Group participants (many-to-many relationship)
CREATE TABLE IF NOT EXISTS public.tournament_group_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.tournament_groups(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.tournament_participants(id) ON DELETE CASCADE,
  position INTEGER, -- Position in group (for manual assignment)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, participant_id)
);

-- Tournament brackets (for elimination stages)
CREATE TABLE IF NOT EXISTS public.tournament_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  bracket_type VARCHAR(50) NOT NULL DEFAULT 'main' 
    CHECK (bracket_type IN ('main', 'consolation', 'winners', 'losers')),
  round_number INTEGER NOT NULL, -- 1 = first round, 2 = second round, etc.
  match_position INTEGER NOT NULL, -- Position in the round (1, 2, 3, etc.)
  match_id UUID REFERENCES public.matches(id) ON DELETE SET NULL,
  parent_bracket_id UUID REFERENCES public.tournament_brackets(id) ON DELETE SET NULL, -- For linking rounds
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, bracket_type, round_number, match_position)
);

-- Tournament match details (extends matches table with tournament-specific info)
CREATE TABLE IF NOT EXISTS public.tournament_match_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  round_name VARCHAR(100), -- 'Round of 16', 'Quarterfinal', 'Semifinal', 'Final', etc.
  bracket_type VARCHAR(50) DEFAULT 'main',
  match_number INTEGER, -- Match number in the round
  court_number VARCHAR(50), -- Court assignment
  scheduled_time TIMESTAMPTZ,
  estimated_duration INTEGER, -- Estimated duration in minutes
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(match_id)
);

-- Group standings (calculated/updated after each match)
CREATE TABLE IF NOT EXISTS public.tournament_group_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.tournament_groups(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.tournament_participants(id) ON DELETE CASCADE,
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  matches_lost INTEGER DEFAULT 0,
  sets_won INTEGER DEFAULT 0,
  sets_lost INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  points_for INTEGER DEFAULT 0,
  points_against INTEGER DEFAULT 0,
  points_difference INTEGER DEFAULT 0, -- points_for - points_against
  head_to_head_wins INTEGER DEFAULT 0, -- Wins against other participants in group
  position INTEGER, -- Current position in group
  qualified BOOLEAN DEFAULT false, -- Qualified for next stage
  eliminated BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, participant_id)
);

-- Tournament seeding (for manual seeding)
CREATE TABLE IF NOT EXISTS public.tournament_seeding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.tournament_participants(id) ON DELETE CASCADE,
  seed_number INTEGER NOT NULL, -- 1 = top seed, 2 = second seed, etc.
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, participant_id),
  UNIQUE(tournament_id, seed_number)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tournament_groups_tournament_id ON public.tournament_groups(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_group_participants_group_id ON public.tournament_group_participants(group_id);
CREATE INDEX IF NOT EXISTS idx_tournament_group_participants_participant_id ON public.tournament_group_participants(participant_id);
CREATE INDEX IF NOT EXISTS idx_tournament_brackets_tournament_id ON public.tournament_brackets(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_brackets_round ON public.tournament_brackets(tournament_id, round_number);
CREATE INDEX IF NOT EXISTS idx_tournament_match_details_tournament_id ON public.tournament_match_details(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_match_details_match_id ON public.tournament_match_details(match_id);
CREATE INDEX IF NOT EXISTS idx_tournament_match_details_round ON public.tournament_match_details(tournament_id, round_number);
CREATE INDEX IF NOT EXISTS idx_tournament_group_standings_group_id ON public.tournament_group_standings(group_id);
CREATE INDEX IF NOT EXISTS idx_tournament_seeding_tournament_id ON public.tournament_seeding(tournament_id);

-- Enable RLS
ALTER TABLE public.tournament_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_group_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_match_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_group_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_seeding ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tournament groups
CREATE POLICY "Allow public read access to tournament groups" ON public.tournament_groups
  FOR SELECT USING (true);

CREATE POLICY "Users can manage tournament groups for their tournaments" ON public.tournament_groups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tournaments 
      WHERE tournaments.id = tournament_groups.tournament_id 
      AND tournaments.created_by = auth.uid()
    )
  );

-- RLS Policies for group participants
CREATE POLICY "Allow public read access to group participants" ON public.tournament_group_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can manage group participants for their tournaments" ON public.tournament_group_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tournament_groups tg
      JOIN public.tournaments t ON t.id = tg.tournament_id
      WHERE tg.id = tournament_group_participants.group_id 
      AND t.created_by = auth.uid()
    )
  );

-- RLS Policies for tournament brackets
CREATE POLICY "Allow public read access to tournament brackets" ON public.tournament_brackets
  FOR SELECT USING (true);

CREATE POLICY "Users can manage tournament brackets for their tournaments" ON public.tournament_brackets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tournaments 
      WHERE tournaments.id = tournament_brackets.tournament_id 
      AND tournaments.created_by = auth.uid()
    )
  );

-- RLS Policies for tournament match details
CREATE POLICY "Allow public read access to tournament match details" ON public.tournament_match_details
  FOR SELECT USING (true);

CREATE POLICY "Users can manage tournament match details for their tournaments" ON public.tournament_match_details
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tournaments 
      WHERE tournaments.id = tournament_match_details.tournament_id 
      AND tournaments.created_by = auth.uid()
    )
  );

-- RLS Policies for group standings
CREATE POLICY "Allow public read access to group standings" ON public.tournament_group_standings
  FOR SELECT USING (true);

CREATE POLICY "Users can manage group standings for their tournaments" ON public.tournament_group_standings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tournament_groups tg
      JOIN public.tournaments t ON t.id = tg.tournament_id
      WHERE tg.id = tournament_group_standings.group_id 
      AND t.created_by = auth.uid()
    )
  );

-- RLS Policies for tournament seeding
CREATE POLICY "Allow public read access to tournament seeding" ON public.tournament_seeding
  FOR SELECT USING (true);

CREATE POLICY "Users can manage tournament seeding for their tournaments" ON public.tournament_seeding
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tournaments 
      WHERE tournaments.id = tournament_seeding.tournament_id 
      AND tournaments.created_by = auth.uid()
    )
  );

