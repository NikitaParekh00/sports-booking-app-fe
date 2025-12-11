-- Add Women's teams for MBBL Season 4 - Women auction

-- ============================================
-- STEP 1: Get the Women's session ID
-- ============================================

-- First, get the session ID for "MBBL Season 4 - Women"
SELECT id, session_name 
FROM auction_sessions 
WHERE session_name = 'MBBL Season 4 - Women'
ORDER BY created_at DESC 
LIMIT 1;

-- ============================================
-- STEP 2: Insert Women's teams
-- ============================================
-- Replace 'WOMEN_SESSION_ID_HERE' with the actual UUID from Step 1

-- Team 1: Marina Mavericks
INSERT INTO auction_teams (
    session_id,
    team_number,
    name,
    owner_name,
    budget,
    category_a_count,
    category_b_count,
    category_c_count
) VALUES (
    'WOMEN_SESSION_ID_HERE',  -- Replace with actual session ID
    1,
    'Marina Mavericks',
    'Sheetal Sheth (not playing)',
    100000.00,  -- Adjust budget as needed
    0,
    0,
    0
);

-- Team 2: Marina Royal Strikers
INSERT INTO auction_teams (
    session_id,
    team_number,
    name,
    owner_name,
    budget,
    category_a_count,
    category_b_count,
    category_c_count
) VALUES (
    'WOMEN_SESSION_ID_HERE',  -- Replace with actual session ID
    2,
    'Marina Royal Strikers',
    'Utkarsh Suratwala',
    100000.00,  -- Adjust budget as needed
    0,
    0,
    0
);

-- Team 3: Marina Daredivas
INSERT INTO auction_teams (
    session_id,
    team_number,
    name,
    owner_name,
    budget,
    category_a_count,
    category_b_count,
    category_c_count
) VALUES (
    'WOMEN_SESSION_ID_HERE',  -- Replace with actual session ID
    3,
    'Marina Daredivas',
    'Hunar Hale',
    100000.00,  -- Adjust budget as needed
    0,
    0,
    0
);

-- Team 4: Queens of Marina
INSERT INTO auction_teams (
    session_id,
    team_number,
    name,
    owner_name,
    budget,
    category_a_count,
    category_b_count,
    category_c_count
) VALUES (
    'WOMEN_SESSION_ID_HERE',  -- Replace with actual session ID
    4,
    'Queens of Marina',
    'Bhaawna Arora',
    100000.00,  -- Adjust budget as needed
    0,
    0,
    0
);

-- ============================================
-- OPTION: Insert all teams in one query
-- ============================================

-- Insert all teams at once (replace WOMEN_SESSION_ID_HERE with actual session ID)
INSERT INTO auction_teams (
    session_id,
    team_number,
    name,
    owner_name,
    budget,
    category_a_count,
    category_b_count,
    category_c_count
) VALUES
('WOMEN_SESSION_ID_HERE', 1, 'Marina Mavericks', 'Sheetal Sheth (not playing)', 100000.00, 0, 0, 0),
('WOMEN_SESSION_ID_HERE', 2, 'Marina Royal Strikers', 'Utkarsh Suratwala', 100000.00, 0, 0, 0),
('WOMEN_SESSION_ID_HERE', 3, 'Marina Daredivas', 'Hunar Hale', 100000.00, 0, 0, 0),
('WOMEN_SESSION_ID_HERE', 4, 'Queens of Marina', 'Bhaawna Arora', 100000.00, 0, 0, 0);

-- ============================================
-- HELPER QUERIES
-- ============================================

-- View all teams for Women's auction
SELECT 
    at.team_number,
    at.name,
    at.owner_name,
    at.budget,
    s.session_name
FROM auction_teams at
JOIN auction_sessions s ON at.session_id = s.id
WHERE s.session_name = 'MBBL Season 4 - Women'
ORDER BY at.team_number;

-- Check if teams already exist
SELECT 
    at.name,
    at.team_number,
    s.session_name
FROM auction_teams at
JOIN auction_sessions s ON at.session_id = s.id
WHERE s.session_name = 'MBBL Season 4 - Women'
  AND at.name IN ('Marina Mavericks', 'Marina Royal Strikers', 'Marina Daredivas', 'Queens of Marina');

-- ============================================
-- COMPLETE SETUP STEPS
-- ============================================
-- 1. First, run: db/add_owner_name_to_teams.sql (to add owner_name column)
-- 2. Get the Women's session ID using the query in STEP 1
-- 3. Replace 'WOMEN_SESSION_ID_HERE' with the actual UUID
-- 4. Run the INSERT statements to add all 4 teams

