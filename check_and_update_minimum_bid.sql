-- ============================================
-- CHECK AND UPDATE MINIMUM BID IN DATABASE
-- ============================================

-- Step 1: Check current minimum_bid values for all sessions
SELECT 
    s.id AS session_id,
    s.session_name,
    COALESCE(ast.minimum_bid, 'NOT SET') AS minimum_bid,
    ast.updated_at
FROM public.auction_sessions s
LEFT JOIN public.auction_settings ast ON s.id = ast.session_id
ORDER BY s.created_at DESC;

-- Step 2: Update minimum_bid for a specific session
-- Replace 'YOUR_SESSION_ID_HERE' with your actual session UUID
UPDATE public.auction_settings
SET minimum_bid = 2000,
    updated_at = NOW()
WHERE session_id = 'YOUR_SESSION_ID_HERE';

-- Step 3: If settings don't exist for a session, create them
-- Replace 'YOUR_SESSION_ID_HERE' with your actual session UUID
INSERT INTO public.auction_settings (
    session_id,
    minimum_bid,
    players_per_team,
    default_bid_increment,
    bid_increment_1_threshold,
    bid_increment_1_amount,
    bid_increment_2_threshold,
    bid_increment_2_amount,
    bid_increment_3_threshold,
    bid_increment_3_amount,
    bid_increment_4_threshold,
    bid_increment_4_amount
)
SELECT 
    'YOUR_SESSION_ID_HERE',
    2000,  -- minimum_bid
    8,     -- players_per_team (adjust as needed)
    1000,  -- default_bid_increment (adjust as needed)
    100000,
    10000,
    200000,
    20000,
    400000,
    30000,
    700000,
    50000
WHERE NOT EXISTS (
    SELECT 1 FROM public.auction_settings 
    WHERE session_id = 'YOUR_SESSION_ID_HERE'
);

-- Step 4: Update all sessions to have minimum_bid = 2000 (if you want to update all at once)
-- WARNING: This will update ALL sessions. Use with caution!
/*
UPDATE public.auction_settings
SET minimum_bid = 2000,
    updated_at = NOW()
WHERE minimum_bid != 2000 OR minimum_bid IS NULL;
*/

