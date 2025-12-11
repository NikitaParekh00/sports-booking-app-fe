-- Template for inserting MBBL Season 4 players
-- Copy this template and fill in your player data

-- ============================================
-- FIRST: Run this to get your session IDs
-- ============================================

-- Get Women session ID (copy this UUID)
SELECT id as women_session_id 
FROM public.auction_sessions 
WHERE session_name = 'MBBL Season 4 - Women' 
ORDER BY created_at DESC 
LIMIT 1;

-- Get Men session ID (copy this UUID)
SELECT id as men_session_id 
FROM public.auction_sessions 
WHERE session_name = 'MBBL Season 4 - Men' 
ORDER BY created_at DESC 
LIMIT 1;

-- ============================================
-- THEN: Use the template below to insert players
-- ============================================

-- TEMPLATE FOR WOMEN AUCTION
-- Replace 'WOMEN_SESSION_ID_HERE' with the UUID from above
-- Replace all placeholder values with actual data

INSERT INTO public.auction_player_pool (
    session_id,
    player_order,
    name,
    photo,
    age,
    skills,
    payment_status,
    gender,
    category
) VALUES
-- Copy this block for each player and update the values
(
    'WOMEN_SESSION_ID_HERE',  -- Paste the Women session UUID here
    1,  -- Player order (1, 2, 3, 4, ...)
    'Player Full Name',  -- Player's name
    'https://example.com/player-photo.jpg',  -- Photo URL (or NULL if no photo)
    25,  -- Age (integer)
    'Batting, Fielding, Bowling',  -- Skills (comma-separated or any format)
    'Y',  -- Payment status: 'Y' (Yes) or 'N' (No)
    'F',  -- Gender: 'F' for Women
    'Marquee'  -- Category: 'Marquee', 'Non Marquee', 'Kid', 'Super Marquee', etc.
),
(
    'WOMEN_SESSION_ID_HERE',
    2,
    'Another Player Name',
    'https://example.com/player-photo2.jpg',
    23,
    'All-rounder',
    'Y',
    'F',
    'Non Marquee'
);
-- Add more players by copying the block above and incrementing player_order

-- ============================================
-- TEMPLATE FOR MEN AUCTION
-- ============================================

INSERT INTO public.auction_player_pool (
    session_id,
    player_order,
    name,
    photo,
    age,
    skills,
    payment_status,
    gender,
    category
) VALUES
(
    'MEN_SESSION_ID_HERE',  -- Paste the Men session UUID here
    1,
    'Player Full Name',
    'https://example.com/player-photo.jpg',
    28,
    'Batting, Bowling',
    'Y',
    'M',  -- Gender: 'M' for Men
    'Marquee'
),
(
    'MEN_SESSION_ID_HERE',
    2,
    'Another Player Name',
    'https://example.com/player-photo2.jpg',
    26,
    'Fielding, Batting',
    'Y',
    'M',
    'Non Marquee'
);
-- Add more players by copying the block above

-- ============================================
-- EXAMPLE: Bulk insert using a DO block
-- ============================================
-- This is useful if you have many players

DO $$
DECLARE
    women_session_uuid UUID;
    men_session_uuid UUID;
BEGIN
    -- Get session IDs
    SELECT id INTO women_session_uuid 
    FROM public.auction_sessions 
    WHERE session_name = 'MBBL Season 4 - Women' 
    ORDER BY created_at DESC 
    LIMIT 1;

    SELECT id INTO men_session_uuid 
    FROM public.auction_sessions 
    WHERE session_name = 'MBBL Season 4 - Men' 
    ORDER BY created_at DESC 
    LIMIT 1;

    -- Insert Women players
    INSERT INTO public.auction_player_pool (session_id, player_order, name, photo, age, skills, payment_status, gender, category) VALUES
    (women_session_uuid, 1, 'Player 1', 'https://example.com/photo1.jpg', 25, 'Batting', 'Y', 'F', 'Marquee'),
    (women_session_uuid, 2, 'Player 2', 'https://example.com/photo2.jpg', 23, 'Bowling', 'Y', 'F', 'Non Marquee'),
    (women_session_uuid, 3, 'Player 3', 'https://example.com/photo3.jpg', 24, 'All-rounder', 'Y', 'F', 'Marquee');
    -- Add more players here...

    -- Insert Men players
    INSERT INTO public.auction_player_pool (session_id, player_order, name, photo, age, skills, payment_status, gender, category) VALUES
    (men_session_uuid, 1, 'Player 1', 'https://example.com/photo1.jpg', 28, 'Batting', 'Y', 'M', 'Marquee'),
    (men_session_uuid, 2, 'Player 2', 'https://example.com/photo2.jpg', 26, 'Bowling', 'Y', 'M', 'Non Marquee'),
    (men_session_uuid, 3, 'Player 3', 'https://example.com/photo3.jpg', 27, 'All-rounder', 'Y', 'M', 'Marquee');
    -- Add more players here...
END $$;

