-- Restart Auction Session
-- This script resets the auction session to the beginning without deleting players
-- Replace 'YOUR_SESSION_ID' with your actual session_id

-- Step 1: Reset the session to start from the first player
UPDATE public.auction_sessions
SET 
    current_player_index = 0,
    is_complete = false
WHERE id = 'YOUR_SESSION_ID';  -- Replace with your session_id

-- Step 2: Delete all bought players (clear all purchases)
DELETE FROM public.auction_players
WHERE session_id = 'YOUR_SESSION_ID';  -- Replace with your session_id

-- Step 3: Reset all team budgets and category counts
UPDATE public.auction_teams
SET 
    budget = 111000,  -- Reset to initial budget per team
    category_a_count = 0,
    category_b_count = 0,
    category_c_count = 0
WHERE session_id = 'YOUR_SESSION_ID';  -- Replace with your session_id

-- Verify the reset
SELECT 
    'Session Status' as check_type,
    current_player_index,
    is_complete
FROM public.auction_sessions
WHERE id = 'YOUR_SESSION_ID';

SELECT 
    'Bought Players Count' as check_type,
    COUNT(*) as count
FROM public.auction_players
WHERE session_id = 'YOUR_SESSION_ID';

SELECT 
    'Team Budgets' as check_type,
    team_number,
    name,
    budget,
    category_a_count,
    category_b_count,
    category_c_count
FROM public.auction_teams
WHERE session_id = 'YOUR_SESSION_ID'
ORDER BY team_number;

-- Note: Players in auction_player_pool are NOT deleted
-- They remain in the pool and will be available for bidding again

