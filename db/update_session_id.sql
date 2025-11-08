-- Update all session_id values to the new session ID
-- New Session ID: aa251ee5-144e-416b-b603-cd0a5e867948

-- Step 1: Check current session_ids (optional - to see what will be updated)
SELECT 
    session_id,
    COUNT(*) as player_count
FROM public.auction_player_pool
GROUP BY session_id
ORDER BY player_count DESC;

-- Step 2: Update all session_ids to the new one
UPDATE public.auction_player_pool
SET session_id = 'aa251ee5-144e-416b-b603-cd0a5e867948'
WHERE session_id != 'aa251ee5-144e-416b-b603-cd0a5e867948';

-- Step 3: Verify the update
SELECT 
    session_id,
    COUNT(*) as total_players,
    MIN(player_order) as min_order,
    MAX(player_order) as max_order
FROM public.auction_player_pool
GROUP BY session_id;

-- Also update other tables that reference session_id:

-- Update auction_teams
UPDATE public.auction_teams
SET session_id = 'aa251ee5-144e-416b-b603-cd0a5e867948'
WHERE session_id != 'aa251ee5-144e-416b-b603-cd0a5e867948';

-- Update auction_players (players bought by teams)
UPDATE public.auction_players
SET session_id = 'aa251ee5-144e-416b-b603-cd0a5e867948'
WHERE session_id != 'aa251ee5-144e-416b-b603-cd0a5e867948';

-- Verify all updates
SELECT 
    'auction_player_pool' as table_name,
    COUNT(*) as row_count
FROM public.auction_player_pool
WHERE session_id = 'aa251ee5-144e-416b-b603-cd0a5e867948'
UNION ALL
SELECT 
    'auction_teams' as table_name,
    COUNT(*) as row_count
FROM public.auction_teams
WHERE session_id = 'aa251ee5-144e-416b-b603-cd0a5e867948'
UNION ALL
SELECT 
    'auction_players' as table_name,
    COUNT(*) as row_count
FROM public.auction_players
WHERE session_id = 'aa251ee5-144e-416b-b603-cd0a5e867948';

