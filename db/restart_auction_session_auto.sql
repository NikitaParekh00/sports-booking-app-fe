-- Restart Auction Session (Auto-detect most recent incomplete session)
-- This script automatically finds and restarts the most recent incomplete session
-- No need to manually enter session_id

-- Step 1: Get the most recent incomplete session
DO $$
DECLARE
    v_session_id UUID;
BEGIN
    -- Find the most recent incomplete session
    SELECT id INTO v_session_id
    FROM public.auction_sessions
    WHERE is_complete = false
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_session_id IS NULL THEN
        RAISE EXCEPTION 'No incomplete session found. Please create a new session or specify a session_id.';
    END IF;

    RAISE NOTICE 'Restarting session: %', v_session_id;

    -- Reset the session to start from the first player
    UPDATE public.auction_sessions
    SET 
        current_player_index = 0,
        is_complete = false
    WHERE id = v_session_id;

    -- Delete all bought players (clear all purchases)
    DELETE FROM public.auction_players
    WHERE session_id = v_session_id;

    -- Reset all team budgets and category counts
    UPDATE public.auction_teams
    SET 
        budget = 111000,  -- Reset to initial budget per team
        category_a_count = 0,
        category_b_count = 0,
        category_c_count = 0
    WHERE session_id = v_session_id;

    RAISE NOTICE 'Session restarted successfully!';
END $$;

-- Verify the reset
SELECT 
    s.id as session_id,
    s.current_player_index,
    s.is_complete,
    COUNT(DISTINCT ap.id) as bought_players_count,
    COUNT(DISTINCT at.id) as teams_count
FROM public.auction_sessions s
LEFT JOIN public.auction_players ap ON ap.session_id = s.id
LEFT JOIN public.auction_teams at ON at.session_id = s.id
WHERE s.is_complete = false
GROUP BY s.id, s.current_player_index, s.is_complete
ORDER BY s.created_at DESC
LIMIT 1;

-- Show team status
SELECT 
    at.team_number,
    at.name,
    at.budget,
    at.category_a_count,
    at.category_b_count,
    at.category_c_count
FROM public.auction_teams at
INNER JOIN public.auction_sessions s ON s.id = at.session_id
WHERE s.is_complete = false
ORDER BY s.created_at DESC, at.team_number
LIMIT 8;

