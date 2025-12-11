-- Insert Women's players for MBBL Season 4 - Women auction
-- Replace 'WOMEN_SESSION_ID_HERE' with the actual session ID from auction_sessions table

-- ============================================
-- STEP 1: Get the Women's session ID
-- ============================================

SELECT id, session_name 
FROM auction_sessions 
WHERE session_name = 'MBBL Season 4 - Women'
ORDER BY created_at DESC 
LIMIT 1;

-- ============================================
-- STEP 2: Insert all players
-- ============================================
-- Replace 'WOMEN_SESSION_ID_HERE' with the UUID from Step 1

INSERT INTO auction_player_pool (
    session_id,
    player_order,
    name,
    photo,
    age,
    played_s1,
    experience,
    active_sport,
    skill,
    batting_hand,
    s1_ranking,
    s2_ranking,
    s3_ranking,
    payment_status,
    gender,
    category
) VALUES
-- Player 1: Aarti Desai
('WOMEN_SESSION_ID_HERE', 1, 'Aarti Desai', 'https://drive.google.com/open?id=13J-8QyLebxChu_Mxdv91nKef0SdmKHfP', 40, 'No', 'Yes underarm', 'I am a National Level Pistol Shooter', 'Fielder', 'Right', '1/45', '5/50', '7/50', 'Y', 'F', 'Non Marquee'),
-- Player 2: Anjali sawant
('WOMEN_SESSION_ID_HERE', 2, 'Anjali sawant', 'https://drive.google.com/open?id=1Vg4ODmJax-6Eke97Fv2JuREGmPW8zcRD', 49, 'Yes', 'Yes underarm', 'I participated in running competitions and also i played cricket, kabaddi , badminton and kho kho tooo', 'Bowler', 'Right', '1/45', '5/50', '7/50', 'Y', 'F', 'Non Marquee'),
-- Player 3: Anjani Vishwakarma
('WOMEN_SESSION_ID_HERE', 3, 'Anjani Vishwakarma', 'https://drive.google.com/open?id=1N9cffaqa831V0Hvpf7rAkq1_EkGLQfTq', 49, 'Yes', 'Yes underarm', 'No', 'All Rounder', 'Right', '1/45', '5/50', '7/50', 'Y', 'F', 'Non Marquee'),
-- Player 4: Anushka Amit Arolkar
('WOMEN_SESSION_ID_HERE', 4, 'Anushka Amit Arolkar', 'https://drive.google.com/open?id=14YCp2ppXX3UhlxsA_30SmSNyAZP9jhY4', 42, 'No', 'Yes underarm', 'Table Tennis n played many Tournaments', 'Batsman', 'Right', '1/45', '5/50', '7/50', 'Y', 'F', 'Non Marquee'),
-- Player 5: Bhavini Thakkar
('WOMEN_SESSION_ID_HERE', 5, 'Bhavini Thakkar', 'https://drive.google.com/open?id=1miZCIxecHG21sRADireysLPANKuXO4dy', 49, 'No', 'Yes underarm', 'Cricket for leisure.', 'Yet to be discovered', 'Right', '1/45', '5/50', '7/50', 'Y', 'F', 'Non Marquee'),
-- Player 6: Bhawna Nitin Rana
('WOMEN_SESSION_ID_HERE', 6, 'Bhawna Nitin Rana', 'https://drive.google.com/open?id=16SwgWJM84tW4So31jd2KbrTEhgH_0ED_', 35, 'Yes', 'Yes underarm', 'Nil', 'All Rounder', 'Right', '1/45', '5/50', '7/50', 'Y', 'F', 'Non Marquee'),
-- Player 7: Charusheela Sawant
('WOMEN_SESSION_ID_HERE', 7, 'Charusheela Sawant', 'https://drive.google.com/open?id=1YOC04cjSOebbUKaVU2zKmh09qSli-afE', 42, 'No', 'Yes underarm', 'Played WPL season 2', 'All Rounder', 'Right', '1/45', '5/50', '7/50', 'Y', 'F', 'Non Marquee'),
-- Player 8: Deepti Chandra Mehra
('WOMEN_SESSION_ID_HERE', 8, 'Deepti Chandra Mehra', 'https://drive.google.com/open?id=1geUo6rIBEkXc3ETNfcsLHSfpmBiN5Pwo', 44, 'Yes', 'Not applicable', 'NA', 'All Rounder', 'Right', '1/45', '5/50', '7/50', 'Y', 'F', 'Non Marquee'),
-- Player 9: Dhyana Vyas
('WOMEN_SESSION_ID_HERE', 9, 'Dhyana Vyas', 'https://drive.google.com/open?id=1Z5ctC0AhXBTrVbGFoJhtkzsKbto_aOHm', 11, 'No', 'Yes both', 'Cricket and swimming', 'All Rounder', 'Right', '1/45', '5/50', '7/50', 'Y', 'F', 'Kid'),
-- Player 10: Divya Naresh Malukani
('WOMEN_SESSION_ID_HERE', 10, 'Divya Naresh Malukani', 'https://drive.google.com/open?id=1ODczsrwdtFGI269RL50FmOwabxewzzKJ', 39, 'No', 'No', 'I have played Badminton and Basketball during my school days', 'Yet to be discovered', 'Right', '1/45', '5/50', '7/50', 'Y', 'F', 'Non Marquee'),
-- Player 11: Gautami Naikdesai
('WOMEN_SESSION_ID_HERE', 11, 'Gautami Naikdesai', 'https://drive.google.com/open?id=1gWF01Bmcc-p1dGLp9hqDSQdmo9IrhXcN', 14, 'No', 'Yes underarm', 'Football', 'All Rounder', 'Right', '1/45', '5/50', '7/50', 'Y', 'F', 'Kid');

-- ============================================
-- VERIFY INSERTED PLAYERS
-- ============================================

-- View all inserted players
SELECT 
    app.player_order,
    app.name,
    app.age,
    app.photo,
    app.played_s1,
    app.experience,
    app.active_sport,
    app.skill,
    app.batting_hand,
    app.s1_ranking,
    app.s2_ranking,
    app.s3_ranking,
    s.session_name
FROM auction_player_pool app
JOIN auction_sessions s ON app.session_id = s.id
WHERE s.session_name = 'MBBL Season 4 - Women'
ORDER BY app.player_order;

