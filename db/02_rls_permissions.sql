-- RLS (Row Level Security) Permissions for Sports Booking App
-- This file contains all RLS policies and permissions

-- ==============================================
-- ENABLE RLS ON ALL TABLES
-- ==============================================

-- Core tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_rules ENABLE ROW LEVEL SECURITY;

-- Scoring system tables
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

-- Sport-specific scoring tables
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

-- Points system
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- PROFILES TABLE POLICIES
-- ==============================================

-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow profile creation (for signup)
CREATE POLICY "Allow profile creation" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- ==============================================
-- FACILITIES TABLE POLICIES
-- ==============================================

-- Public read access to approved facilities
CREATE POLICY "Public can view approved facilities" ON public.facilities
  FOR SELECT USING (status = 'approved');

-- Owners can view their own facilities
CREATE POLICY "Owners can view their own facilities" ON public.facilities
  FOR SELECT USING (auth.uid() = owner_id);

-- Owners can manage their own facilities
CREATE POLICY "Owners can manage their own facilities" ON public.facilities
  FOR ALL USING (auth.uid() = owner_id);

-- Allow facility creation
CREATE POLICY "Allow facility creation" ON public.facilities
  FOR INSERT WITH CHECK (true);

-- ==============================================
-- COURTS TABLE POLICIES
-- ==============================================

-- Public read access to courts
CREATE POLICY "Public can view courts" ON public.courts
  FOR SELECT USING (true);

-- Facility owners can manage courts for their facilities
CREATE POLICY "Owners can manage courts for their facilities" ON public.courts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.facilities 
      WHERE facilities.id = courts.facility_id 
      AND facilities.owner_id = auth.uid()
    )
  );

-- ==============================================
-- AVAILABILITY RULES TABLE POLICIES
-- ==============================================

-- Public read access to availability rules
CREATE POLICY "Public can view availability rules" ON public.availability_rules
  FOR SELECT USING (true);

-- Facility owners can manage availability for their courts
CREATE POLICY "Owners can manage availability for their courts" ON public.availability_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.courts 
      JOIN public.facilities ON facilities.id = courts.facility_id
      WHERE courts.id = availability_rules.court_id 
      AND facilities.owner_id = auth.uid()
    )
  );

-- ==============================================
-- MATCHES TABLE POLICIES
-- ==============================================

-- Public read access to matches (for scoring)
CREATE POLICY "Public can view matches" ON public.matches
  FOR SELECT USING (true);

-- Users can create matches
CREATE POLICY "Allow match creation for authenticated users" ON public.matches
  FOR INSERT TO authenticated WITH CHECK (true);

-- Users can update their own matches
CREATE POLICY "Users can update their own matches" ON public.matches
  FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete their own matches
CREATE POLICY "Users can delete their own matches" ON public.matches
  FOR DELETE USING (auth.uid() = created_by);

-- ==============================================
-- MATCH PLAYERS TABLE POLICIES
-- ==============================================

-- Public read access to match players
CREATE POLICY "Public can view match players" ON public.match_players
  FOR SELECT USING (true);

-- Users can create match players
CREATE POLICY "Allow match player creation for authenticated users" ON public.match_players
  FOR INSERT TO authenticated WITH CHECK (true);

-- Users can manage match players for their matches
CREATE POLICY "Users can manage match players for their matches" ON public.match_players
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = match_players.match_id 
      AND matches.created_by = auth.uid()
    )
  );

-- ==============================================
-- TOURNAMENTS TABLE POLICIES
-- ==============================================

-- Public read access to tournaments
CREATE POLICY "Public can view tournaments" ON public.tournaments
  FOR SELECT USING (true);

-- Users can create tournaments
CREATE POLICY "Allow tournament creation for authenticated users" ON public.tournaments
  FOR INSERT TO authenticated WITH CHECK (true);

-- Users can manage their own tournaments
CREATE POLICY "Users can manage their own tournaments" ON public.tournaments
  FOR ALL USING (auth.uid() = created_by);

-- ==============================================
-- TOURNAMENT PARTICIPANTS TABLE POLICIES
-- ==============================================

-- Public read access to tournament participants
CREATE POLICY "Public can view tournament participants" ON public.tournament_participants
  FOR SELECT USING (true);

-- Users can create tournament participants
CREATE POLICY "Allow tournament participant creation for authenticated users" ON public.tournament_participants
  FOR INSERT TO authenticated WITH CHECK (true);

-- Users can manage tournament participants for their tournaments
CREATE POLICY "Users can manage tournament participants for their tournaments" ON public.tournament_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tournaments 
      WHERE tournaments.id = tournament_participants.tournament_id 
      AND tournaments.created_by = auth.uid()
    )
  );

-- ==============================================
-- MATCH EVENTS TABLE POLICIES
-- ==============================================

-- Public read access to match events
CREATE POLICY "Public can view match events" ON public.match_events
  FOR SELECT USING (true);

-- Users can create match events
CREATE POLICY "Allow match event creation for authenticated users" ON public.match_events
  FOR INSERT TO authenticated WITH CHECK (true);

-- Users can manage match events for their matches
CREATE POLICY "Users can manage match events for their matches" ON public.match_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = match_events.match_id 
      AND matches.created_by = auth.uid()
    )
  );

-- ==============================================
-- SPORT-SPECIFIC SCORING TABLE POLICIES
-- ==============================================

-- Generic policy for all scoring tables
-- Users can manage scores for their matches

-- Cricket scores
CREATE POLICY "Users can manage cricket scores for their matches" ON public.cricket_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = cricket_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );

-- Football scores
CREATE POLICY "Users can manage football scores for their matches" ON public.football_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = football_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );

-- Badminton scores
CREATE POLICY "Users can manage badminton scores for their matches" ON public.badminton_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = badminton_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );

-- Tennis scores
CREATE POLICY "Users can manage tennis scores for their matches" ON public.tennis_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = tennis_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );

-- Table Tennis scores
CREATE POLICY "Users can manage table tennis scores for their matches" ON public.table_tennis_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = table_tennis_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );

-- Pickleball scores
CREATE POLICY "Users can manage pickleball scores for their matches" ON public.pickleball_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = pickleball_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );

-- Padel scores
CREATE POLICY "Users can manage padel scores for their matches" ON public.padel_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = padel_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );

-- Squash scores
CREATE POLICY "Users can manage squash scores for their matches" ON public.squash_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = squash_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );

-- Billiards scores
CREATE POLICY "Users can manage billiards scores for their matches" ON public.billiards_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = billiards_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );

-- Basketball scores
CREATE POLICY "Users can manage basketball scores for their matches" ON public.basketball_scores
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = basketball_scores.match_id 
      AND matches.created_by = auth.uid()
    )
  );

-- ==============================================
-- POINTS SYSTEM POLICIES
-- ==============================================

-- Users can view their own points transactions
CREATE POLICY "Users can view their own points transactions" ON public.points_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- System can insert points transactions
CREATE POLICY "System can insert points transactions" ON public.points_transactions
  FOR INSERT WITH CHECK (true);

-- ==============================================
-- DEVELOPMENT-ONLY POLICIES (MORE PERMISSIVE)
-- ==============================================

-- Uncomment these for development if you need more permissive access:

-- Allow all authenticated users to create/update/delete matches
-- CREATE POLICY "Allow all match operations for authenticated users" ON public.matches
--   FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow all authenticated users to create/update/delete match players
-- CREATE POLICY "Allow all match player operations for authenticated users" ON public.match_players
--   FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ==============================================
-- VERIFY POLICIES
-- ==============================================

-- Show all policies for verification
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
