-- Copy all players from previous session to new session
-- This updates the session_id of existing players instead of re-inserting them

-- Step 1: Check players in both sessions
SELECT 
    'Old Session Players' as source,
    COUNT(*) as player_count
FROM public.auction_player_pool
WHERE session_id = 'aa251ee5-144e-416b-b603-cd0a5e867948';  -- Replace with your OLD session_id

SELECT 
    'New Session Players' as source,
    COUNT(*) as player_count
FROM public.auction_player_pool
WHERE session_id = '6cc4e843-6761-46da-9e71-8ff0362811cf';  -- Replace with your NEW session_id

-- Step 2: Copy players by updating session_id
-- Option A: If new session has NO players, just update session_id
UPDATE public.auction_player_pool
SET session_id = '6cc4e843-6761-46da-9e71-8ff0362811cf'  -- NEW session_id
WHERE session_id = 'aa251ee5-144e-416b-b603-cd0a5e867948';  -- OLD session_id

-- Option B: If new session already has some players, use INSERT with ON CONFLICT
-- Uncomment this if Option A doesn't work due to conflicts:
/*
INSERT INTO public.auction_player_pool (
    session_id,
    player_order,
    name,
    payment_status,
    gender,
    category,
    runs,
    strike_rate,
    wickets,
    average,
    catch_count,
    ro,
    mvp
)
SELECT 
    '6cc4e843-6761-46da-9e71-8ff0362811cf' as session_id,  -- NEW session_id
    player_order,
    name,
    payment_status,
    gender,
    category,
    runs,
    strike_rate,
    wickets,
    average,
    catch_count,
    ro,
    mvp
FROM public.auction_player_pool
WHERE session_id = 'aa251ee5-144e-416b-b603-cd0a5e867948'  -- OLD session_id
ON CONFLICT (session_id, player_order) DO NOTHING;
*/

-- Step 3: Verify the copy
SELECT 
    session_id,
    COUNT(*) as player_count,
    MIN(player_order) as first_player_order,
    MAX(player_order) as last_player_order
FROM public.auction_player_pool
WHERE session_id = '6cc4e843-6761-46da-9e71-8ff0362811cf'  -- NEW session_id
GROUP BY session_id;

-- List first 10 players to verify
SELECT 
    player_order,
    name,
    category,
    gender
FROM public.auction_player_pool
WHERE session_id = '6cc4e843-6761-46da-9e71-8ff0362811cf'  -- NEW session_id
ORDER BY player_order
LIMIT 10;

