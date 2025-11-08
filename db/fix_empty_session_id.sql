-- Fix Empty Session IDs After Import
-- If you've already imported data with empty session_ids, run this to fix them

-- Step 1: Check if there are any rows with NULL or empty session_id
SELECT COUNT(*) as rows_with_empty_session_id
FROM public.auction_player_pool
WHERE session_id IS NULL OR session_id::text = '';

-- Step 2: Update empty session_ids to use the most recent active session
UPDATE public.auction_player_pool
SET session_id = (
    SELECT id 
    FROM public.auction_sessions 
    WHERE is_complete = false 
    ORDER BY created_at DESC 
    LIMIT 1
)
WHERE session_id IS NULL OR session_id::text = '';

-- Step 3: Verify the fix
SELECT 
    COUNT(*) as total_rows,
    COUNT(DISTINCT session_id) as unique_sessions
FROM public.auction_player_pool;

-- Alternative: If you want to use a specific session_id, replace the subquery above with:
-- UPDATE public.auction_player_pool
-- SET session_id = 'YOUR_SESSION_ID_HERE'  -- Replace with actual UUID
-- WHERE session_id IS NULL OR session_id::text = '';

