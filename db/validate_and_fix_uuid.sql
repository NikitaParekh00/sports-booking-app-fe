-- Validate and Fix UUID Issues
-- Use this to check and fix invalid UUID errors

-- Step 1: Check if your session_id exists in auction_sessions
-- Replace 'YOUR_SESSION_ID_HERE' with the UUID you're trying to use
SELECT 
    id,
    session_name,
    is_complete,
    created_at
FROM public.auction_sessions
WHERE id = 'YOUR_SESSION_ID_HERE';  -- Replace with your UUID

-- Step 2: Get a valid session_id (run this to get a real UUID)
SELECT 
    id as valid_session_id,
    session_name,
    is_complete,
    created_at
FROM public.auction_sessions 
WHERE is_complete = false 
ORDER BY created_at DESC 
LIMIT 1;

-- Step 3: Check for invalid UUIDs in your data (if already imported)
-- This will show any rows with invalid or NULL session_ids
SELECT 
    id,
    session_id,
    name,
    player_order,
    CASE 
        WHEN session_id IS NULL THEN 'NULL'
        WHEN session_id::text = '' THEN 'EMPTY STRING'
        WHEN session_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'INVALID FORMAT'
        ELSE 'VALID'
    END as uuid_status
FROM public.auction_player_pool
WHERE session_id IS NULL 
   OR session_id::text = ''
   OR session_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
LIMIT 10;

-- Step 4: Fix invalid UUIDs (replace 'VALID_SESSION_ID_HERE' with UUID from Step 2)
-- WARNING: This will update ALL rows with invalid session_ids
/*
UPDATE public.auction_player_pool
SET session_id = 'VALID_SESSION_ID_HERE'  -- Replace with valid UUID from Step 2
WHERE session_id IS NULL 
   OR session_id::text = ''
   OR session_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
*/

-- Step 5: Common UUID format issues to check:
-- ❌ Wrong: "f9f8d300-b1ca-410a-9bbf-a3ac1d3cf2de" (with quotes - remove quotes)
-- ❌ Wrong: f9f8d300b1ca410a9bbfa3ac1d3cf2de (without hyphens)
-- ❌ Wrong: F9F8D300-B1CA-410A-9BBF-A3AC1D3CF2DE (uppercase - should be lowercase)
-- ✅ Correct: f9f8d300-b1ca-410a-9bbf-a3ac1d3cf2de (lowercase with hyphens, no quotes)

-- Step 6: Create a new session if you don't have one
INSERT INTO public.auction_sessions (session_name, current_player_index, is_complete)
VALUES ('Main Auction', 0, false)
RETURNING id as new_session_id, session_name, created_at;

