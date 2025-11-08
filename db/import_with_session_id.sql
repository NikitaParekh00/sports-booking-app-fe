-- Import Data with Session ID
-- This script shows how to import data when session_id is missing or empty

-- Step 1: Get your session ID first (run this and copy the UUID)
SELECT id as session_id
FROM public.auction_sessions 
WHERE is_complete = false 
ORDER BY created_at DESC 
LIMIT 1;

-- Step 2: Use one of these methods to import:

-- Method 1: Import with explicit session_id (replace YOUR_SESSION_ID_HERE with actual UUID)
-- If your CSV has empty session_id, you can update it like this:
/*
UPDATE public.auction_player_pool
SET session_id = 'YOUR_SESSION_ID_HERE'
WHERE session_id IS NULL OR session_id = '';
*/

-- Method 2: Insert directly with session_id (if importing via SQL)
-- Replace 'YOUR_SESSION_ID_HERE' with the UUID from Step 1
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
) VALUES
('YOUR_SESSION_ID_HERE', 0, 'Player Name', 'Y', 'M', 'A', 0, 0, 0, 0, 0, 0, 0);
*/

-- Method 3: Auto-assign to most recent active session (if session_id is NULL/empty)
-- This will automatically use the most recent incomplete session
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
    (SELECT id FROM public.auction_sessions WHERE is_complete = false ORDER BY created_at DESC LIMIT 1) as session_id,
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
FROM (
    -- Your data here - replace with actual values or use a temporary table
    VALUES 
    (0, 'Player 1', 'Y', 'M', 'A', 0, 0, 0, 0, 0, 0, 0),
    (1, 'Player 2', 'N', 'M', 'B', 0, 0, 0, 0, 0, 0, 0)
    -- Add more rows as needed
) AS data(player_order, name, payment_status, gender, category, runs, strike_rate, wickets, average, catch_count, ro, mvp)
ON CONFLICT (session_id, player_order) DO UPDATE SET
    name = EXCLUDED.name,
    payment_status = EXCLUDED.payment_status,
    gender = EXCLUDED.gender,
    category = EXCLUDED.category,
    runs = EXCLUDED.runs,
    strike_rate = EXCLUDED.strike_rate,
    wickets = EXCLUDED.wickets,
    average = EXCLUDED.average,
    catch_count = EXCLUDED.catch_count,
    ro = EXCLUDED.ro,
    mvp = EXCLUDED.mvp;

