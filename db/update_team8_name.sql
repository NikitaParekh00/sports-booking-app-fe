-- Update Team 8 name to "Power Hitters"
-- Session ID: aa251ee5-144e-416b-b603-cd0a5e867948

-- Update Team 8 name for the active session
UPDATE public.auction_teams
SET name = 'Power Hitters'
WHERE session_id = 'aa251ee5-144e-416b-b603-cd0a5e867948'
    AND team_number = 8;

-- Verify the update
SELECT 
    team_number,
    name,
    budget
FROM public.auction_teams
WHERE session_id = 'aa251ee5-144e-416b-b603-cd0a5e867948'
    AND team_number = 8;

-- Alternative: Update for the most recent active session (if session ID changes)
/*
UPDATE public.auction_teams
SET name = 'Power Hitters'
WHERE session_id IN (
    SELECT id FROM public.auction_sessions 
    WHERE is_complete = false 
    ORDER BY created_at DESC 
    LIMIT 1
)
AND team_number = 8;
*/

