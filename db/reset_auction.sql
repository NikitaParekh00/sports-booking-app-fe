-- Reset Auction Script
-- This script will reset the auction to start fresh
-- It removes all bought players and resets the session state

-- Step 1: Find your auction session ID
-- Run this first to see your sessions:
-- SELECT id, session_name, current_player_index, is_complete FROM auction_sessions;

-- Step 2: Replace 'YOUR_SESSION_ID_HERE' with your actual session ID from Step 1
-- Then run the commands below:

-- ==============================================
-- OPTION 1: Reset a specific session
-- ==============================================
-- Replace 'YOUR_SESSION_ID_HERE' with your session ID
DO $$
DECLARE
    v_session_id UUID := 'YOUR_SESSION_ID_HERE'; -- Replace with your session ID
BEGIN
    -- Delete all bought players for this session
    DELETE FROM auction_players WHERE session_id = v_session_id;
    
    -- Reset session state
    UPDATE auction_sessions 
    SET 
        current_player_index = 0,
        is_complete = false,
        updated_at = NOW()
    WHERE id = v_session_id;
    
    -- Reset team budgets and player counts
    UPDATE auction_teams
    SET 
        budget = 1000000.00, -- Reset to initial budget (adjust if different)
        category_a_count = 0,
        category_b_count = 0,
        category_c_count = 0,
        updated_at = NOW()
    WHERE session_id = v_session_id;
    
    RAISE NOTICE 'Auction session % has been reset successfully!', v_session_id;
END $$;

-- ==============================================
-- OPTION 2: Reset ALL auction sessions (use with caution!)
-- ==============================================
-- Uncomment the lines below if you want to reset ALL sessions:

-- DELETE FROM auction_players;
-- UPDATE auction_sessions SET current_player_index = 0, is_complete = false, updated_at = NOW();
-- UPDATE auction_teams SET budget = 1000000.00, category_a_count = 0, category_b_count = 0, category_c_count = 0, updated_at = NOW();

-- ==============================================
-- OPTION 3: Quick reset for a specific session (single command)
-- ==============================================
-- Replace 'YOUR_SESSION_ID_HERE' with your session ID and run:

/*
DELETE FROM auction_players WHERE session_id = 'YOUR_SESSION_ID_HERE';
UPDATE auction_sessions SET current_player_index = 0, is_complete = false WHERE id = 'YOUR_SESSION_ID_HERE';
UPDATE auction_teams SET budget = 1000000.00, category_a_count = 0, category_b_count = 0, category_c_count = 0 WHERE session_id = 'YOUR_SESSION_ID_HERE';
*/

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================
-- After running the reset, verify with these queries:

-- Check session state:
-- SELECT id, session_name, current_player_index, is_complete FROM auction_sessions;

-- Check if any players are still bought:
-- SELECT COUNT(*) as bought_players_count FROM auction_players WHERE session_id = 'YOUR_SESSION_ID_HERE';

-- Check team states:
-- SELECT name, budget, category_a_count, category_b_count, category_c_count FROM auction_teams WHERE session_id = 'YOUR_SESSION_ID_HERE';

-- Check total players in pool:
-- SELECT COUNT(*) as total_players FROM auction_player_pool WHERE session_id = 'YOUR_SESSION_ID_HERE';

