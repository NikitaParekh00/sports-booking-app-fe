-- Insert Men's Teams for MBBL Season 4 - Men
-- Session ID: ebd10b54-366d-4986-bdea-fa4cd35fe000

-- ============================================
-- STEP 1: Insert Teams
-- ============================================

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
-- Team 1: Hacckers
('ebd10b54-366d-4986-bdea-fa4cd35fe000', 1, 'Hacckers', 'Sunil Yadav', 111000.00, 0, 0, 0),
-- Team 2: Marina Vikings
('ebd10b54-366d-4986-bdea-fa4cd35fe000', 2, 'Marina Vikings', 'Rajat Nair', 111000.00, 0, 0, 0),
-- Team 3: Kings of Marina
('ebd10b54-366d-4986-bdea-fa4cd35fe000', 3, 'Kings of Marina', 'Sunny Singh', 111000.00, 0, 0, 0),
-- Team 4: Dream 11
('ebd10b54-366d-4986-bdea-fa4cd35fe000', 4, 'Dream 11', NULL, 111000.00, 0, 0, 0),
-- Team 5: Marina Legends
('ebd10b54-366d-4986-bdea-fa4cd35fe000', 5, 'Marina Legends', 'Naman Kumar', 111000.00, 0, 0, 0),
-- Team 6: Marina United
('ebd10b54-366d-4986-bdea-fa4cd35fe000', 6, 'Marina United', 'Janish Sancheti', 111000.00, 0, 0, 0),
-- Team 7: Marina SuperKings
('ebd10b54-366d-4986-bdea-fa4cd35fe000', 7, 'Marina SuperKings', 'Dinesh Tadi', 111000.00, 0, 0, 0),
-- Team 8: Marina Blackhawks
('ebd10b54-366d-4986-bdea-fa4cd35fe000', 8, 'Marina Blackhawks', 'Sachin Chindarkar', 111000.00, 0, 0, 0),
-- Team 9: MARINA DESTROYERS
('ebd10b54-366d-4986-bdea-fa4cd35fe000', 9, 'MARINA DESTROYERS', 'Shailendra Kumar', 111000.00, 0, 0, 0),
-- Team 10: MARINA AVENGERS
('ebd10b54-366d-4986-bdea-fa4cd35fe000', 10, 'MARINA AVENGERS', 'Anish Shetty', 111000.00, 0, 0, 0);

-- ============================================
-- STEP 2: Get Team IDs (run this after Step 1)
-- ============================================
-- Get team IDs for inserting retained players
-- Team 1: Hacckers
-- Team 2: Marina Vikings
-- Team 3: Kings of Marina
-- Team 4: Dream 11
-- Team 5: Marina Legends
-- Team 6: Marina United
-- Team 7: Marina SuperKings
-- Team 8: Marina Blackhawks
-- Team 9: MARINA DESTROYERS
-- Team 10: MARINA AVENGERS

-- ============================================
-- STEP 3: Insert Retained Players
-- ============================================
-- Note: You'll need to get the team IDs from Step 2 and player names must match exactly
-- Retention amounts: 175000, 125000, 100000

-- First, get team IDs (replace these with actual IDs from database)
-- SELECT id, team_number, name FROM auction_teams WHERE session_id = 'ebd10b54-366d-4986-bdea-fa4cd35fe000' ORDER BY team_number;

-- Then insert retained players with their retention amounts
-- Format: INSERT INTO auction_players (session_id, team_id, player_name, bid_amount, ...) VALUES (...);

-- Example for Team 1 (Hacckers) - Regular players (not retained, so they'll be bought during auction)
-- Navish Shetty - will be bought during auction
-- Sapnit Nitin shetty - will be bought during auction  
-- Raj Desai - will be bought during auction

-- Example for Team 2 (Marina Vikings) - Regular players
-- Dharmik sheth - will be bought during auction
-- Mukul Tyagi - will be bought during auction
-- Swapnil Bhatt - will be bought during auction

-- Team 3 (Kings of Marina) - Retained players
-- Nikunj Bharat Jani - Retention amount: 175000 (highest)
-- Darsh V - Retention amount: 125000 (middle)
-- Amit Yadav - Retention amount: 100000 (lowest)

-- Team 4 (Dream 11) - Retained players
-- Smatish Shetty - will be bought during auction
-- Girish Hemrajani - Retention amount: 175000 (highest)
-- Kiran Waghmare - Retention amount: 125000 (middle)
-- Gaurav Jadhav - Retention amount: 100000 (lowest)

-- Team 5 (Marina Legends) - Retained players
-- Rohan Pacharne - Retention amount: 175000 (highest)
-- Manoj kheradia - Retention amount: 125000 (middle)
-- Akash shetty - Retention amount: 100000 (lowest)

-- Team 6 (Marina United) - Retained players
-- Vinay - Retention amount: 175000 (highest)
-- Dheeraj Juneja - Retention amount: 125000 (middle)
-- Abhijit R Hemdev - Retention amount: 100000 (lowest)

-- Team 7 (Marina SuperKings) - Retained players
-- Rohan Salvi - Retention amount: 175000 (highest)
-- Rohit Rai - Retention amount: 125000 (middle)
-- Pratik Trivedi - Retention amount: 100000 (lowest)

-- ============================================
-- HELPER QUERY: Get team IDs and player IDs for retained players
-- ============================================
/*
-- Get team IDs
SELECT id, team_number, name, owner_name 
FROM auction_teams 
WHERE session_id = 'ebd10b54-366d-4986-bdea-fa4cd35fe000' 
ORDER BY team_number;

-- Get player IDs for retained players
SELECT id, player_order, name 
FROM auction_player_pool 
WHERE session_id = 'ebd10b54-366d-4986-bdea-fa4cd35fe000' 
AND name IN (
    'Nikunj Bharat Jani', 'Darsh V', 'Amit Yadav',
    'Girish Hemrajani', 'Kiran Waghmare', 'Gaurav Jadhav',
    'Rohan Pacharne', 'Manoj kheradia', 'Akash shetty',
    'Vinay', 'Dheeraj Juneja', 'Abhijit R Hemdev',
    'Rohan Salvi', 'Rohit Rai', 'Pratik Trivedi'
)
ORDER BY name;
*/

-- ============================================
-- STEP 4: Insert Retained Players (Run after getting team IDs and player data)
-- ============================================
-- Replace TEAM_ID_X with actual team IDs from Step 3
-- Replace player names with exact matches from player_pool

-- Team 3: Kings of Marina (Retained players)
/*
INSERT INTO auction_players (
    session_id,
    team_id,
    player_name,
    player_category,
    bid_amount,
    payment_status,
    gender,
    runs,
    strike_rate,
    wickets,
    average,
    catch_count,
    ro,
    mvp
) VALUES
-- Get player data from auction_player_pool and team_id from auction_teams
-- Nikunj Bharat Jani - 175000
-- Darsh V - 125000
-- Amit Yadav - 100000
*/

-- Team 4: Dream 11 (Retained players)
/*
INSERT INTO auction_players (
    session_id,
    team_id,
    player_name,
    player_category,
    bid_amount,
    payment_status,
    gender,
    runs,
    strike_rate,
    wickets,
    average,
    catch_count,
    ro,
    mvp
) VALUES
-- Girish Hemrajani - 175000
-- Kiran Waghmare - 125000
-- Gaurav Jadhav - 100000
*/

-- Team 5: Marina Legends (Retained players)
/*
INSERT INTO auction_players (
    session_id,
    team_id,
    player_name,
    player_category,
    bid_amount,
    payment_status,
    gender,
    runs,
    strike_rate,
    wickets,
    average,
    catch_count,
    ro,
    mvp
) VALUES
-- Rohan Pacharne - 175000
-- Manoj kheradia - 125000
-- Akash shetty - 100000
*/

-- Team 6: Marina United (Retained players)
/*
INSERT INTO auction_players (
    session_id,
    team_id,
    player_name,
    player_category,
    bid_amount,
    payment_status,
    gender,
    runs,
    strike_rate,
    wickets,
    average,
    catch_count,
    ro,
    mvp
) VALUES
-- Vinay - 175000
-- Dheeraj Juneja - 125000
-- Abhijit R Hemdev - 100000
*/

-- Team 7: Marina SuperKings (Retained players)
/*
INSERT INTO auction_players (
    session_id,
    team_id,
    player_name,
    player_category,
    bid_amount,
    payment_status,
    gender,
    runs,
    strike_rate,
    wickets,
    average,
    catch_count,
    ro,
    mvp
) VALUES
-- Rohan Salvi - 175000
-- Rohit Rai - 125000
-- Pratik Trivedi - 100000
*/

-- ============================================
-- STEP 5: Update Team Budgets (After inserting retained players)
-- ============================================
-- Update budgets after retained players are added
-- Team 3: 111000 - 400000 = -289000 (need to adjust if budget allows)
-- Team 4: 111000 - 400000 = -289000
-- Team 5: 111000 - 400000 = -289000
-- Team 6: 111000 - 400000 = -289000
-- Team 7: 111000 - 400000 = -289000

-- Note: If total budget is 111000, retention amounts exceed budget
-- You may need to adjust retention amounts or increase initial budget

