-- Test match creation to verify the constraints are working
-- This will help identify what's still causing the 400 error

-- 1. Test inserting a match with minimal required fields
INSERT INTO public.matches (
    created_by,
    sport,
    match_type,
    status,
    match_date
) VALUES (
    NULL,  -- Allow NULL for development
    'badminton',
    'friendly',
    'upcoming',
    NOW()
) RETURNING id, created_by, sport, match_type, status;

-- 2. If the above works, test with a real user_id
-- Replace 'your-user-id-here' with an actual user_id from your profiles table
-- INSERT INTO public.matches (
--     created_by,
--     sport,
--     match_type,
--     status,
--     match_date
-- ) VALUES (
--     'your-user-id-here',
--     'badminton',
--     'friendly',
--     'upcoming',
--     NOW()
-- ) RETURNING id, created_by, sport, match_type, status;

-- 3. Test match_players insertion
-- First get a match_id from the above insert
-- INSERT INTO public.match_players (
--     match_id,
--     user_id,
--     player_name,
--     team
-- ) VALUES (
--     'match-id-from-above',
--     'user-id-from-profiles',
--     'Test Player',
--     'player_1'
-- ) RETURNING id, match_id, user_id, player_name, team;
