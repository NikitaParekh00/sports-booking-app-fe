-- ============================================
-- GET ALL ACTIVE SESSIONS (Run this first to get session ID)
-- ============================================
SELECT 
    id AS session_id,
    session_name,
    current_player_index,
    is_complete,
    created_at
FROM public.auction_sessions
WHERE is_complete = false  -- Only active sessions
ORDER BY created_at DESC;

-- ============================================
-- GET TEAM NUMBERS FOR A SESSION
-- ============================================
-- This query retrieves all team numbers, names, and budgets for a given session
-- Replace 'YOUR_SESSION_ID_HERE' with your actual session UUID from above
SELECT 
    team_number,
    name AS team_name,
    budget,
    (SELECT COUNT(*) FROM public.auction_players ap WHERE ap.team_id = at.id) AS players_count,
    created_at
FROM public.auction_teams at
WHERE session_id = 'YOUR_SESSION_ID_HERE'
ORDER BY team_number;

-- ============================================
-- ALTERNATIVE: Get all sessions and their teams
-- ============================================
/*
SELECT 
    s.id AS session_id,
    s.session_name,
    at.team_number,
    at.name AS team_name,
    at.budget,
    (SELECT COUNT(*) FROM public.auction_players ap WHERE ap.team_id = at.id) AS players_count
FROM public.auction_sessions s
LEFT JOIN public.auction_teams at ON s.id = at.session_id
WHERE s.is_complete = false  -- Only active sessions
ORDER BY s.session_name, at.team_number;
*/

-- ============================================
-- Get teams with player details
-- ============================================
/*
SELECT 
    at.team_number,
    at.name AS team_name,
    at.budget,
    COUNT(ap.id) AS players_count,
    STRING_AGG(ap.player_name, ', ' ORDER BY ap.player_name) AS player_names,
    SUM(ap.bid_amount) AS total_spent
FROM public.auction_teams at
LEFT JOIN public.auction_players ap ON at.id = ap.team_id
WHERE at.session_id = 'YOUR_SESSION_ID_HERE'
GROUP BY at.team_number, at.name, at.budget
ORDER BY at.team_number;
*/

