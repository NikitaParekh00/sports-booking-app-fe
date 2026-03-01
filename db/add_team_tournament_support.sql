-- Team-wise tournament support
-- Run after add_tournament_participant_fields.sql if you use those columns.

-- 1. Tournament mode: individual (default) or team
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS tournament_mode VARCHAR(20) DEFAULT 'individual'
CHECK (tournament_mode IN ('individual', 'team'));

COMMENT ON COLUMN public.tournaments.tournament_mode IS 'individual = player vs player; team = team vs team (e.g. league).';

-- 2. Tournament teams (for team mode only)
CREATE TABLE IF NOT EXISTS public.tournament_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  short_name VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tournament_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament_id ON public.tournament_teams(tournament_id);

ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read tournament teams" ON public.tournament_teams FOR SELECT USING (true);
CREATE POLICY "Allow insert tournament teams" ON public.tournament_teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update tournament teams" ON public.tournament_teams FOR UPDATE USING (true);
CREATE POLICY "Allow delete tournament teams" ON public.tournament_teams FOR DELETE USING (true);

-- 3. Team members (which participants belong to which team)
CREATE TABLE IF NOT EXISTS public.tournament_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.tournament_teams(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.tournament_participants(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 1 CHECK (position IN (1, 2)),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_tournament_team_members_team_id ON public.tournament_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_team_members_participant_id ON public.tournament_team_members(participant_id);

ALTER TABLE public.tournament_team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read tournament team members" ON public.tournament_team_members FOR SELECT USING (true);
CREATE POLICY "Allow insert tournament team members" ON public.tournament_team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update tournament team members" ON public.tournament_team_members FOR UPDATE USING (true);
CREATE POLICY "Allow delete tournament team members" ON public.tournament_team_members FOR DELETE USING (true);

-- 4. Extend matches for team vs team (optional columns; null for individual matches)
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS team_a_id UUID REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS team_b_id UUID REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS winner_team_id UUID REFERENCES public.tournament_teams(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS court_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS final_score VARCHAR(20),
ADD COLUMN IF NOT EXISTS match_number VARCHAR(20);

COMMENT ON COLUMN public.matches.team_a_id IS 'For team tournaments: first team';
COMMENT ON COLUMN public.matches.team_b_id IS 'For team tournaments: second team';
COMMENT ON COLUMN public.matches.winner_team_id IS 'For team tournaments: winning team';
COMMENT ON COLUMN public.matches.final_score IS 'e.g. 21-10 or 21-19, 21-14';
COMMENT ON COLUMN public.matches.match_number IS 'e.g. W01, SF1, Final';
