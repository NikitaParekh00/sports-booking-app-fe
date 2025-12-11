-- Create MBBL Season 4 - Women and Men Auctions
-- This script creates two new auction sessions with their player pools

-- ============================================
-- STEP 1: Create Auction Sessions
-- ============================================

-- Create MBBL Season 4 - Women auction session
INSERT INTO public.auction_sessions (session_name, current_player_index, is_complete)
VALUES ('MBBL Season 4 - Women', 0, false)
RETURNING id as women_session_id;

-- Create MBBL Season 4 - Men auction session
INSERT INTO public.auction_sessions (session_name, current_player_index, is_complete)
VALUES ('MBBL Season 4 - Men', 0, false)
RETURNING id as men_session_id;

-- ============================================
-- STEP 2: Get the Session IDs (run this after step 1)
-- ============================================

-- Get Women session ID
SELECT id as women_session_id 
FROM public.auction_sessions 
WHERE session_name = 'MBBL Season 4 - Women' 
ORDER BY created_at DESC 
LIMIT 1;

-- Get Men session ID
SELECT id as men_session_id 
FROM public.auction_sessions 
WHERE session_name = 'MBBL Season 4 - Men' 
ORDER BY created_at DESC 
LIMIT 1;

-- ============================================
-- STEP 3: Insert Players for Women Auction
-- ============================================
-- Replace 'WOMEN_SESSION_ID' with the actual UUID from Step 2
-- Replace the player data with your actual data

-- Example: Insert players for Women auction
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
-- Player 1
(
    'WOMEN_SESSION_ID',  -- Replace with actual session ID
    1,
    'Player Name 1',
    'https://example.com/photo1.jpg',  -- Player photo URL
    25,  -- Age
    'Batting, Fielding',  -- Skills (comma-separated or any format you prefer)
    'Y',  -- Payment status: 'Y' or 'N'
    'F',  -- Gender: 'F' for Women
    'Marquee'  -- Category: 'Marquee', 'Non Marquee', 'Kid', etc.
),
-- Player 2
(
    'WOMEN_SESSION_ID',
    2,
    'Player Name 2',
    'https://example.com/photo2.jpg',
    23,
    'Bowling, Fielding',
    'Y',
    'F',
    'Non Marquee'
),
-- Add more players here...
-- Player 3, 4, 5, etc.

-- ============================================
-- STEP 4: Insert Players for Men Auction
-- ============================================
-- Replace 'MEN_SESSION_ID' with the actual UUID from Step 2

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
-- Player 1
(
    'MEN_SESSION_ID',  -- Replace with actual session ID
    1,
    'Player Name 1',
    'https://example.com/photo1.jpg',
    28,
    'Batting, Bowling',
    'Y',
    'M',  -- Gender: 'M' for Men
    'Marquee'
),
-- Player 2
(
    'MEN_SESSION_ID',
    2,
    'Player Name 2',
    'https://example.com/photo2.jpg',
    26,
    'All-rounder',
    'Y',
    'M',
    'Non Marquee'
);
-- Add more players here...

-- ============================================
-- HELPER QUERIES
-- ============================================

-- View all auction sessions
SELECT id, session_name, current_player_index, is_complete, created_at
FROM public.auction_sessions
ORDER BY created_at DESC;

-- View all players in Women auction
SELECT 
    app.id,
    app.player_order,
    app.name,
    app.photo,
    app.age,
    app.skills,
    app.category,
    app.payment_status,
    s.session_name
FROM public.auction_player_pool app
JOIN public.auction_sessions s ON app.session_id = s.id
WHERE s.session_name = 'MBBL Season 4 - Women'
ORDER BY app.player_order;

-- View all players in Men auction
SELECT 
    app.id,
    app.player_order,
    app.name,
    app.photo,
    app.age,
    app.skills,
    app.category,
    app.payment_status,
    s.session_name
FROM public.auction_player_pool app
JOIN public.auction_sessions s ON app.session_id = s.id
WHERE s.session_name = 'MBBL Season 4 - Men'
ORDER BY app.player_order;

-- Count players per auction
SELECT 
    s.session_name,
    COUNT(app.id) as total_players
FROM public.auction_sessions s
LEFT JOIN public.auction_player_pool app ON s.id = app.session_id
WHERE s.session_name LIKE 'MBBL Season 4%'
GROUP BY s.session_name;

