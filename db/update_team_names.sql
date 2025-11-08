-- Update Team Names in auction_teams table
-- Run this script in Supabase SQL Editor

-- Step 1: Check current team names (optional - to see what's there)
SELECT 
    team_number,
    name,
    session_id,
    budget
FROM public.auction_teams
WHERE session_id IN (
    SELECT id FROM public.auction_sessions WHERE is_complete = false ORDER BY created_at DESC LIMIT 1
)
ORDER BY team_number;

-- Step 2: Update team names for the active (incomplete) auction session
-- This updates all teams in the most recent incomplete session
UPDATE public.auction_teams
SET name = CASE team_number
    WHEN 1 THEN 'Super Strikers'
    WHEN 2 THEN 'Sunrisers'
    WHEN 3 THEN 'Tirthankar Eleven Stars'
    WHEN 4 THEN 'Sunil ke Gladiators'
    WHEN 5 THEN 'Rising Royals'
    WHEN 6 THEN 'Super Kings'
    WHEN 7 THEN 'Power Paltan'
    WHEN 8 THEN 'Team 8'  -- Update this when you have a name for Team 8
    ELSE name  -- Keep existing name if team_number doesn't match
END
WHERE session_id IN (
    SELECT id FROM public.auction_sessions WHERE is_complete = false ORDER BY created_at DESC LIMIT 1
);

-- Step 3: Verify the update (optional - to confirm changes)
SELECT 
    team_number,
    name,
    budget
FROM public.auction_teams
WHERE session_id IN (
    SELECT id FROM public.auction_sessions WHERE is_complete = false ORDER BY created_at DESC LIMIT 1
)
ORDER BY team_number;

-- Alternative: Update for a specific session_id (if you know the exact session ID)
-- Replace 'YOUR_SESSION_ID_HERE' with the actual UUID
/*
UPDATE public.auction_teams
SET name = CASE team_number
    WHEN 1 THEN 'Super Strikers'
    WHEN 2 THEN 'Sunrisers'
    WHEN 3 THEN 'Tirthankar Eleven Stars'
    WHEN 4 THEN 'Sunil ke Gladiators'
    WHEN 5 THEN 'Rising Royals'
    WHEN 6 THEN 'Super Kings'
    WHEN 7 THEN 'Power Paltan'
    WHEN 8 THEN 'Team 8'
    ELSE name
END
WHERE session_id = 'YOUR_SESSION_ID_HERE';
*/

