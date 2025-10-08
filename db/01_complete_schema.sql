-- Complete Database Schema for Sports Booking App
-- This file contains all table definitions and basic structure

-- ==============================================
-- CORE TABLES
-- ==============================================

-- Profiles table (users)
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('owner', 'admin', 'player')),
    referral_code TEXT UNIQUE,
    points INTEGER DEFAULT 0 NOT NULL,
    points_earned INTEGER DEFAULT 0 NOT NULL,
    points_spent INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Facilities table (turfs/venues)
CREATE TABLE IF NOT EXISTS public.facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    sport TEXT NOT NULL,
    price_per_hour DECIMAL(10, 2) NOT NULL,
    description TEXT,
    images TEXT[],
    phone TEXT,
    email TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Courts table (individual courts within facilities)
CREATE TABLE IF NOT EXISTS public.courts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    amenities TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Availability rules for courts
CREATE TABLE IF NOT EXISTS public.availability_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id UUID REFERENCES public.courts(id) ON DELETE CASCADE,
    weekday INTEGER NOT NULL CHECK (weekday >= 0 AND weekday <= 6), -- 0=Sunday, 1=Monday, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    interval_minutes INTEGER NOT NULL DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- SCORING SYSTEM TABLES
-- ==============================================

-- Matches table
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Match players
CREATE TABLE IF NOT EXISTS public.match_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    player_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    team VARCHAR(50), -- 'team_a' or 'team_b' for team sports, 'player_1' or 'player_2' for individual sports
    is_captain BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tournament participants
CREATE TABLE IF NOT EXISTS public.tournament_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    player_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'eliminated', 'winner')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Match events (for live scoring updates)
CREATE TABLE IF NOT EXISTS public.match_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.match_players(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'run', 'wicket', 'goal', 'point', etc.
    event_data JSONB, -- flexible data for different sports
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- SPORT-SPECIFIC SCORING TABLES
-- ==============================================

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
    created_at TIMESTAMPTZ DEFAULT NOW()
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
    created_at TIMESTAMPTZ DEFAULT NOW()
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
    created_at TIMESTAMPTZ DEFAULT NOW()
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table Tennis scoring
CREATE TABLE IF NOT EXISTS public.table_tennis_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.match_players(id) ON DELETE CASCADE,
    sets_won INTEGER DEFAULT 0,
    points_scored INTEGER DEFAULT 0,
    service_errors INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pickleball scoring
CREATE TABLE IF NOT EXISTS public.pickleball_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.match_players(id) ON DELETE CASCADE,
    sets_won INTEGER DEFAULT 0,
    points_scored INTEGER DEFAULT 0,
    service_errors INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Padel scoring
CREATE TABLE IF NOT EXISTS public.padel_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.match_players(id) ON DELETE CASCADE,
    sets_won INTEGER DEFAULT 0,
    points_scored INTEGER DEFAULT 0,
    service_errors INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Squash scoring
CREATE TABLE IF NOT EXISTS public.squash_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.match_players(id) ON DELETE CASCADE,
    sets_won INTEGER DEFAULT 0,
    points_scored INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Billiards scoring
CREATE TABLE IF NOT EXISTS public.billiards_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.match_players(id) ON DELETE CASCADE,
    frames_won INTEGER DEFAULT 0,
    points_scored INTEGER DEFAULT 0,
    breaks INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- POINTS SYSTEM
-- ==============================================

-- Points transactions table
CREATE TABLE IF NOT EXISTS public.points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    points INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'bonus', 'penalty')),
    description TEXT NOT NULL,
    reference_id UUID, -- Can reference matches, bookings, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_role ON public.profiles(phone, role);
CREATE INDEX IF NOT EXISTS idx_profiles_points ON public.profiles(points);

-- Facilities indexes
CREATE INDEX IF NOT EXISTS idx_facilities_owner_id ON public.facilities(owner_id);
CREATE INDEX IF NOT EXISTS idx_facilities_sport ON public.facilities(sport);
CREATE INDEX IF NOT EXISTS idx_facilities_status ON public.facilities(status);
CREATE INDEX IF NOT EXISTS idx_facilities_city ON public.facilities(city);

-- Courts indexes
CREATE INDEX IF NOT EXISTS idx_courts_facility_id ON public.courts(facility_id);

-- Matches indexes
CREATE INDEX IF NOT EXISTS idx_matches_sport ON public.matches(sport);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created_by ON public.matches(created_by);

-- Match players indexes
CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON public.match_players(match_id);
CREATE INDEX IF NOT EXISTS idx_match_players_user_id ON public.match_players(user_id);

-- Tournaments indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_sport ON public.tournaments(sport);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);

-- Match events indexes
CREATE INDEX IF NOT EXISTS idx_match_events_match_id ON public.match_events(match_id);

-- Points transactions indexes
CREATE INDEX IF NOT EXISTS idx_points_transactions_user_id ON public.points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_type ON public.points_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created_at ON public.points_transactions(created_at);

-- ==============================================
-- CONSTRAINTS
-- ==============================================

-- Unique constraints
ALTER TABLE public.profiles ADD CONSTRAINT unique_phone_role UNIQUE (phone, role);

-- ==============================================
-- FUNCTIONS
-- ==============================================

-- Function to add points to user
CREATE OR REPLACE FUNCTION add_points_to_user(
    p_user_id UUID,
    p_points INTEGER,
    p_transaction_type TEXT,
    p_description TEXT,
    p_reference_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    -- Insert transaction record
    INSERT INTO public.points_transactions (
        user_id, points, transaction_type, description, reference_id
    ) VALUES (
        p_user_id, p_points, p_transaction_type, p_description, p_reference_id
    );
    
    -- Update user's points
    UPDATE public.profiles 
    SET 
        points = points + p_points,
        points_earned = CASE 
            WHEN p_points > 0 THEN points_earned + p_points 
            ELSE points_earned 
        END,
        points_spent = CASE 
            WHEN p_points < 0 THEN points_spent + ABS(p_points) 
            ELSE points_spent 
        END,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
