-- Simple SQL for inserting players with Google Drive image links
-- Store Google Drive share links - the app will automatically convert them to direct image URLs

-- ============================================
-- STEP 1: Get your session IDs
-- ============================================

-- Get Women session ID
SELECT id, session_name 
FROM auction_sessions 
WHERE session_name = 'MBBL Season 4 - Women'
ORDER BY created_at DESC 
LIMIT 1;

-- Get Men session ID
SELECT id, session_name 
FROM auction_sessions 
WHERE session_name = 'MBBL Season 4 - Men'
ORDER BY created_at DESC 
LIMIT 1;

-- ============================================
-- STEP 2: Insert players with image URLs
-- ============================================

-- TEMPLATE: Insert player for Women auction
INSERT INTO auction_player_pool (
    session_id,
    player_order,
    name,
    photo,           -- Google Drive share link (app converts automatically)
    age,
    skills,
    payment_status,
    gender,
    category
) VALUES (
    'WOMEN_SESSION_ID_HERE',  -- Replace with actual session ID from Step 1
    1,                         -- Player order (1, 2, 3, ...)
    'Player Name',             -- Player's full name
    'https://drive.google.com/file/d/FILE_ID/view?usp=sharing',  -- Google Drive share link
    25,                        -- Age
    'Batting, Fielding',       -- Skills (comma-separated)
    'Y',                       -- Payment status: 'Y' or 'N'
    'F',                       -- Gender: 'F' for Women
    'Marquee'                  -- Category: 'Marquee', 'Non Marquee', 'Kid', 'Super Marquee'
);

-- TEMPLATE: Insert player for Men auction
INSERT INTO auction_player_pool (
    session_id,
    player_order,
    name,
    photo,
    age,
    skills,
    payment_status,
    gender,
    category
) VALUES (
    'MEN_SESSION_ID_HERE',     -- Replace with actual session ID from Step 1
    1,
    'Player Name',
    'https://drive.google.com/file/d/FILE_ID/view?usp=sharing',  -- Google Drive share link
    28,
    'Batting, Bowling',
    'Y',
    'M',                       -- Gender: 'M' for Men
    'Marquee'
);

-- ============================================
-- STEP 3: Bulk insert example
-- ============================================

-- Insert multiple players at once
INSERT INTO auction_player_pool (
    session_id, player_order, name, photo, age, skills, payment_status, gender, category
) VALUES
('SESSION_ID', 1, 'Player 1', 'https://drive.google.com/file/d/FILE_ID_1/view?usp=sharing', 25, 'Batting', 'Y', 'F', 'Marquee'),
('SESSION_ID', 2, 'Player 2', 'https://drive.google.com/file/d/FILE_ID_2/view?usp=sharing', 23, 'Bowling', 'Y', 'F', 'Non Marquee'),
('SESSION_ID', 3, 'Player 3', 'https://drive.google.com/file/d/FILE_ID_3/view?usp=sharing', 24, 'All-rounder', 'Y', 'F', 'Marquee');
-- Add more players...

-- ============================================
-- GOOGLE DRIVE LINK FORMATS SUPPORTED
-- ============================================

-- The app automatically converts these formats to direct image URLs:
-- 1. Standard format: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
-- 2. Open format: https://drive.google.com/open?id=FILE_ID
-- 3. Short format: https://drive.google.com/d/FILE_ID

-- IMPORTANT: Make sure all Google Drive files are publicly accessible!
-- Steps:
-- 1. Right-click file in Google Drive → Share
-- 2. Click "Change" → Select "Anyone with the link"
-- 3. Set permission to "Viewer"
-- 4. Click "Done"

-- ============================================
-- HELPER QUERIES
-- ============================================

-- View all players with their photos
SELECT 
    app.name,
    app.photo,
    app.age,
    app.skills,
    app.category,
    s.session_name
FROM auction_player_pool app
JOIN auction_sessions s ON app.session_id = s.id
ORDER BY s.session_name, app.player_order;

-- Count players per session
SELECT 
    s.session_name,
    COUNT(app.id) as total_players
FROM auction_sessions s
LEFT JOIN auction_player_pool app ON s.id = app.session_id
WHERE s.session_name LIKE 'MBBL Season 4%'
GROUP BY s.session_name;

-- Check players without photos
SELECT name, session_id
FROM auction_player_pool
WHERE photo IS NULL OR photo = '';

