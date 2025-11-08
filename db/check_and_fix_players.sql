-- Check if players exist in auction_player_pool for your session
-- Replace '6cc4e843-6761-46da-9e71-8ff0362811cf' with your session_id

-- Check current session and player count
SELECT 
    s.id as session_id,
    s.current_player_index,
    s.is_complete,
    COUNT(DISTINCT app.id) as players_in_pool,
    COUNT(DISTINCT ap.id) as bought_players,
    COUNT(DISTINCT at.id) as teams_count
FROM public.auction_sessions s
LEFT JOIN public.auction_player_pool app ON app.session_id = s.id
LEFT JOIN public.auction_players ap ON ap.session_id = s.id
LEFT JOIN public.auction_teams at ON at.session_id = s.id
WHERE s.id = '6cc4e843-6761-46da-9e71-8ff0362811cf'  -- Replace with your session_id
GROUP BY s.id, s.current_player_index, s.is_complete;

-- List all players in the pool for this session
SELECT 
    player_order,
    name,
    category,
    gender,
    payment_status
FROM public.auction_player_pool
WHERE session_id = '6cc4e843-6761-46da-9e71-8ff0362811cf'  -- Replace with your session_id
ORDER BY player_order
LIMIT 20;

-- If the count is 0, you need to add players
-- Use the insert_all_players.sql script with your session_id

