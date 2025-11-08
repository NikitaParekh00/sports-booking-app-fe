-- Add players to your session
-- Replace '6cc4e843-6761-46da-9e71-8ff0362811cf' with your actual session_id

-- First, check if you already have players
SELECT COUNT(*) as existing_players_count
FROM public.auction_player_pool
WHERE session_id = '6cc4e843-6761-46da-9e71-8ff0362811cf';

-- If count is 0, run the INSERT below
-- If you already have players, you don't need to run this

-- IMPORTANT: Make sure you have run insert_all_players.sql with your session_id first
-- OR use the query below to add a few sample players for testing

-- Sample: Add 6 test players (replace session_id)
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
('6cc4e843-6761-46da-9e71-8ff0362811cf', 0, 'Tushar Bohra', 'N', 'M', 'A', 45, 150, 2, 11, 0, 1, 8.186),
('6cc4e843-6761-46da-9e71-8ff0362811cf', 1, 'Amit Kasliwal', 'Y', 'M', 'A', 9, 90, 4, 6, 0, 0, 5.768),
('6cc4e843-6761-46da-9e71-8ff0362811cf', 2, 'Parv Kasliwal', 'Y', 'M', 'A', 122, 321.05, 0, 0, 3, 0, 13.442),
('6cc4e843-6761-46da-9e71-8ff0362811cf', 3, 'Vihaan Kasliwal', 'Y', 'M', 'A', 42, 247.06, 3, 7.67, 2, 0, 8.466),
('6cc4e843-6761-46da-9e71-8ff0362811cf', 4, 'Alok Kasliwal', 'Y', 'M', 'A', 25, 131.58, 2, 9.5, 0, 1, 6.304),
('6cc4e843-6761-46da-9e71-8ff0362811cf', 5, 'Ashish Gangwal', 'N', 'M', 'A', 9, 60, 1, 25, 1, 0, 2.22)
ON CONFLICT (session_id, player_order) DO NOTHING;

-- Verify players were added
SELECT COUNT(*) as total_players
FROM public.auction_player_pool
WHERE session_id = '6cc4e843-6761-46da-9e71-8ff0362811cf';

