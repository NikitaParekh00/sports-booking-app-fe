-- Add owner_name column to auction_teams table
-- This allows each team to have an owner name displayed in the auction complete screen

-- Step 1: Add the owner_name column
ALTER TABLE public.auction_teams
ADD COLUMN IF NOT EXISTS owner_name VARCHAR(100);

-- Step 2: Update existing teams with owner names (optional - you can set these manually)
-- Replace the session_id and owner names as needed
UPDATE public.auction_teams
SET owner_name = CASE team_number
    WHEN 1 THEN 'Rinku Doshi'  -- Replace with actual owner name
    WHEN 2 THEN 'Sanjay Paharia'  -- Replace with actual owner name
    WHEN 3 THEN 'Rekha Mahendraji Jain (Gadiya)'  -- Replace with actual owner name
    WHEN 4 THEN 'Sunil Gangwal'  -- Replace with actual owner name
    WHEN 5 THEN 'Punita Kala'  -- Replace with actual owner name
    WHEN 6 THEN 'Rohan Jain'  -- Replace with actual owner name
    WHEN 7 THEN 'Aarjav Shah'  -- Replace with actual owner name
    WHEN 8 THEN 'Shikha Kasliwal'  -- Replace with actual owner name
    ELSE NULL
END
WHERE session_id IN (
    SELECT id FROM public.auction_sessions ORDER BY created_at DESC LIMIT 1
);

-- Step 3: Verify the column was added
SELECT 
    team_number,
    name,
    owner_name,
    budget
FROM public.auction_teams
WHERE session_id IN (
    SELECT id FROM public.auction_sessions ORDER BY created_at DESC LIMIT 1
)
ORDER BY team_number;

