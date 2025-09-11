-- Scoring System Schema for Sports Booking App
-- Run this after your main schema.sql

-- Matches table - stores all matches (friendly and tournament)
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sport VARCHAR(50) NOT NULL CHECK (sport IN (
    'cricket', 'football', 'badminton', 'tennis', 'table-tennis', 
    'pickleball', 'padel', 'squash', 'billiards', 'basketball'
  )),
  match_type VARCHAR(20) NOT NULL CHECK (match_type IN ('friendly', 'tournament')),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed', 'cancelled')),
  winner_id UUID REFERENCES public.match_players(id) ON DELETE SET NULL,
  match_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  location VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Players table - stores player information for matches
CREATE TABLE IF NOT EXISTS public.match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  player_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  team VARCHAR(50), -- 'team_a' or 'team_b' for team sports, 'player_1' or 'player_2' for individual sports
  is_captain BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cricket scoring
CREATE TABLE IF NOT EXISTS public.cricket_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.match_players(id) ON DELETE CASCADE,
  innings INTEGER NOT NULL CHECK (innings IN (1, 2)),
  runs INTEGER DEFAULT 0,
  balls_faced INTEGER DEFAULT 0,
  fours INTEGER DEFAULT 0,
  sixes INTEGER DEFAULT 0,
  wickets_taken INTEGER DEFAULT 0,
  overs_bowled DECIMAL(3,1) DEFAULT 0,
  runs_conceded INTEGER DEFAULT 0,
  maidens INTEGER DEFAULT 0,
  is_out BOOLEAN DEFAULT false,
  how_out VARCHAR(50), -- 'bowled', 'caught', 'lbw', 'run out', 'stumped', etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Football scoring
CREATE TABLE IF NOT EXISTS public.football_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.match_players(id) ON DELETE CASCADE,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  position VARCHAR(50), -- 'GK', 'DEF', 'MID', 'FWD'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Badminton scoring
CREATE TABLE IF NOT EXISTS public.badminton_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.match_players(id) ON DELETE CASCADE,
  sets_won INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  points_scored INTEGER DEFAULT 0,
  service_errors INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tennis scoring
CREATE TABLE IF NOT EXISTS public.tennis_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.match_players(id) ON DELETE CASCADE,
  sets_won INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  points_scored INTEGER DEFAULT 0,
  aces INTEGER DEFAULT 0,
  double_faults INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table Tennis scoring
CREATE TABLE IF NOT EXISTS public.table_tennis_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.match_players(id) ON DELETE CASCADE,
  sets_won INTEGER DEFAULT 0,
  points_scored INTEGER DEFAULT 0,
  service_errors INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pickleball scoring
CREATE TABLE IF NOT EXISTS public.pickleball_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.match_players(id) ON DELETE CASCADE,
  sets_won INTEGER DEFAULT 0,
  points_scored INTEGER DEFAULT 0,
  service_errors INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Padel scoring
CREATE TABLE IF NOT EXISTS public.padel_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.match_players(id) ON DELETE CASCADE,
  sets_won INTEGER DEFAULT 0,
  points_scored INTEGER DEFAULT 0,
  service_errors INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Squash scoring
CREATE TABLE IF NOT EXISTS public.squash_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.match_players(id) ON DELETE CASCADE,
  sets_won INTEGER DEFAULT 0,
  points_scored INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Billiards scoring
CREATE TABLE IF NOT EXISTS public.billiards_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.match_players(id) ON DELETE CASCADE,
  frames_won INTEGER DEFAULT 0,
  points_scored INTEGER DEFAULT 0,
  breaks INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Basketball scoring
CREATE TABLE IF NOT EXISTS public.basketball_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.match_players(id) ON DELETE CASCADE,
  points INTEGER DEFAULT 0,
  rebounds INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  steals INTEGER DEFAULT 0,
  blocks INTEGER DEFAULT 0,
  turnovers INTEGER DEFAULT 0,
  fouls INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  position VARCHAR(50), -- 'PG', 'SG', 'SF', 'PF', 'C'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  sport VARCHAR(50) NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  location VARCHAR(255),
  max_participants INTEGER,
  entry_fee DECIMAL(10,2),
  prize_pool DECIMAL(10,2),
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tournament participants
CREATE TABLE IF NOT EXISTS public.tournament_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  player_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'eliminated', 'winner')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Match events (for live scoring updates)
CREATE TABLE IF NOT EXISTS public.match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.match_players(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'run', 'wicket', 'goal', 'point', etc.
  event_data JSONB, -- flexible data for different sports
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_matches_sport ON public.matches(sport);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created_by ON public.matches(created_by);
CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON public.match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_user_id ON public.match_players(user_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_sport ON public.tournaments(sport);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_match_events_match_id ON public.match_events(match_id);

-- RLS Policies
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

-- Allow users to read all matches (for public scoring)
CREATE POLICY "Allow public read access to matches" ON public.matches
  FOR SELECT USING (true);

-- Allow users to manage their own matches
CREATE POLICY "Users can manage their own matches" ON public.matches
  FOR ALL USING (auth.uid() = created_by);

-- Allow users to read match players
CREATE POLICY "Allow public read access to match players" ON public.match_players
  FOR SELECT USING (true);

-- Allow users to manage match players for their matches
CREATE POLICY "Users can manage match players for their matches" ON public.match_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = match_players.match_id 
      AND matches.created_by = auth.uid()
    )
  );

-- Allow users to read tournaments
CREATE POLICY "Allow public read access to tournaments" ON public.tournaments
  FOR SELECT USING (true);

-- Allow users to manage their own tournaments
CREATE POLICY "Users can manage their own tournaments" ON public.tournaments
  FOR ALL USING (auth.uid() = created_by);

-- Allow users to read tournament participants
CREATE POLICY "Allow public read access to tournament participants" ON public.tournament_participants
  FOR SELECT USING (true);

-- Allow users to manage tournament participants for their tournaments
CREATE POLICY "Users can manage tournament participants for their tournaments" ON public.tournament_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tournaments 
      WHERE tournaments.id = tournament_participants.tournament_id 
      AND tournaments.created_by = auth.uid()
    )
  );

-- Allow users to read match events
CREATE POLICY "Allow public read access to match events" ON public.match_events
  FOR SELECT USING (true);

-- Allow users to manage match events for their matches
CREATE POLICY "Users can manage match events for their matches" ON public.match_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = match_events.match_id 
      AND matches.created_by = auth.uid()
    )
  );

-- Enable RLS for all scoring tables
ALTER TABLE public.cricket_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.football_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badminton_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tennis_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_tennis_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pickleball_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.padel_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squash_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billiards_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.basketball_scores ENABLE ROW LEVEL SECURITY;

-- Generic policies for scoring tables (users can manage scores for their matches)
CREATE POLICY "Users can manage cricket scores for their matches" ON public.cricket_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = cricket_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage football scores for their matches" ON public.football_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = football_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage badminton scores for their matches" ON public.badminton_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = badminton_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage tennis scores for their matches" ON public.tennis_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = tennis_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage table tennis scores for their matches" ON public.table_tennis_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = table_tennis_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage pickleball scores for their matches" ON public.pickleball_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = pickleball_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage padel scores for their matches" ON public.padel_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = padel_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage squash scores for their matches" ON public.squash_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = squash_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage billiards scores for their matches" ON public.billiards_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = billiards_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can manage basketball scores for their matches" ON public.basketball_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = basketball_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );
