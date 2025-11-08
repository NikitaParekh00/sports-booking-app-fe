-- Get or Create Session ID for Auction
-- Use this to find your session ID or create a new one

-- Option 1: Find the current active (incomplete) session ID
-- Run this query to get the most recent active session:
SELECT 
    id as session_id,
    session_name,
    current_player_index,
    is_complete,
    created_at
FROM public.auction_sessions 
WHERE is_complete = false 
ORDER BY created_at DESC 
LIMIT 1;

-- Option 2: See ALL sessions (active and completed)
SELECT 
    id as session_id,
    session_name,
    current_player_index,
    is_complete,
    created_at
FROM public.auction_sessions 
ORDER BY created_at DESC;

-- Option 3: Create a NEW session if you don't have one
-- Run this to create a new session and get its ID:
INSERT INTO public.auction_sessions (session_name, current_player_index, is_complete)
VALUES ('Main Auction', 0, false)
RETURNING id as session_id, session_name, created_at;

-- After getting your session_id, use it in your import queries
-- Example: 'f9f8d300-b1ca-410a-9bbf-a3ac1d3cf2de'

