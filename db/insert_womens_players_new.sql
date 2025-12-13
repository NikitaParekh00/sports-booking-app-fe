-- Insert Women's Players for MBBL Season 4 - Women
-- Session ID: d4dbe601-381a-4dcf-b131-8919cbbc9f17
-- 
-- Note: Age "-" is set to NULL.
-- "Both" for batting_hand is converted to "Right" (database constraint only allows Right/Left).
-- Player names include status markers (Retained), (Draft Pick), (Owner) as requested.

INSERT INTO auction_player_pool (
    session_id,
    player_order,
    name,
    photo,
    age,
    experience,
    active_sport,
    skill,
    batting_hand,
    payment_status,
    gender,
    category
) VALUES
-- Player 1
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 1, 'Rashmita Dcosta (Retained)', 'https://drive.google.com/open?id=1JG7F-63xeFCINZQUjSJgkbt-HkHQEWPW', 37, 'Not applicable', 'NA', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 2
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 2, 'Neha Thavre (Retained)', 'https://drive.google.com/open?id=1OI_fDzIRkGazYC4EqK8TOz-O69HDvoME', 38, 'Yes underarm', 'i actively practice Underarm cricket and I workout daily in Gym.', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 3
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 3, 'Anjani Vishwakarma (Retained)', 'https://drive.google.com/open?id=1N9cffaqa831V0Hvpf7rAkq1_EkGLQfTq', 49, 'Yes underarm', 'No', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 4
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 4, 'Shrisha Shetty (Retained)', 'https://drive.google.com/open?id=1lY5kF9T80d29dqS4b3Lj5qZQc8Nw41oP', 38, 'Not applicable', 'Cricket', 'Batsman', 'Right', 'Y', 'F', NULL),
-- Player 5
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 5, 'Tanishqa Shringarpure (Retained)', 'https://drive.google.com/open?id=11EPFi6w810qzGlWPfI37jdciHX1lbQ_R', 26, 'Not applicable', 'NA', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 6
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 6, 'Karishma Suratwala (Retained)', 'https://drive.google.com/open?id=1K64NgKjJz2dZy2xgl4TG69JwUnZogvkm', 33, 'Yes underarm', 'Lawn tennis', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 7
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 7, 'Hunar Hali (Owner)', 'https://drive.google.com/open?id=1TC_BaEv24B3-ozpV7oiSw6UXz4qVuNMk', 31, 'Not applicable', 'I play Cricket Underarm', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 8
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 8, 'Soumya Mandal (Draft Pick)', 'https://drive.google.com/open?id=1uhCKFaskY4GnJiNazsz8lF6Iujcc5BCx', 35, 'Not applicable', 'yes', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 9
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 9, 'Bhawna Nitin Rana (Owner)', 'https://drive.google.com/open?id=16SwgWJM84tW4So31jd2KbrTEhgH_0ED_', 35, 'Yes underarm', 'Nil', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 10
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 10, 'Rupal Asrani (Draft Pick)', 'https://drive.google.com/open?id=1nGC7P_vBN0AgJMnNckKviFeZpClV0Tpb', 39, 'Not applicable', 'Badminton', 'Fielder', 'Right', 'Y', 'F', NULL),
-- Player 11
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 11, 'Charusheela Sawant', 'https://drive.google.com/open?id=1YOC04cjSOebbUKaVU2zKmh09qSli-afE', 42, 'Yes underarm', 'Played WPL season 2', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 12
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 12, 'Jalpa Puri', 'https://drive.google.com/open?id=1oQfd0aRrVSJh9HJ2jgO9cmu17QWP0YRz', 41, 'Not applicable', 'NA', 'Bowler', 'Right', 'Y', 'F', NULL),
-- Player 13
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 13, 'Monika Amar Singh Choudhary', 'https://drive.google.com/open?id=1_Rb5-EocMpHCTD18gxsOhmThalgjOQjP', 39, 'Yes underarm', 'I am a cricket player and have played tournaments for my local society team', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 14
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 14, 'Shilpa Naikdesai', 'https://drive.google.com/open?id=12zwrWUawDuvuMu9rQ31OqGfbMeaHZ54Q', 44, 'Yes underarm', 'NA', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 15
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 15, 'Shwetal Abhishek Kadam', 'https://drive.google.com/open?id=1T8WvX0G7xK_nUvVV1mSX5eRENyNVFTBt', 42, 'Yes underarm', 'NA', 'Bowler', 'Right', 'Y', 'F', NULL),
-- Player 16
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 16, 'Mugdha Patkar', 'https://drive.google.com/open?id=1T3o3CTZNjwQttAH9rr7pa2T3ycNjuy8u', 37, 'Yes underarm', 'Cricket, Badminton, Pickle Ball', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 17
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 17, 'Jyoti Rajeev Gite', 'https://drive.google.com/open?id=1fTbP5KU2vqOx0MgYs0l3OV2r2nhFtXPv', 37, 'Yes underarm', 'Have Played in Marina Premier League Cricket', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 18
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 18, 'Yogita Thorat', 'https://drive.google.com/open?id=1gopqrjVUysv4RZ5hSPt-FrephxLajvCC', 42, 'Yes underarm', 'Cricket', 'Batsman', 'Right', 'Y', 'F', NULL),
-- Player 19
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 19, 'Pranaliben shah', 'https://drive.google.com/open?id=1AbBBtNpDJ8-v2RlV4mWnFldpc32mW8Ql', 35, 'Yes underarm', 'Only go for walks,yoga', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 20
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 20, 'Sapna Nitin Shetty', 'https://drive.google.com/open?id=116GaQYJjFFq7Av1mH7cwiDi57JxR6vV4', 48, 'Not applicable', 'Play tournaments as and when I get time', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 21
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 21, 'Riya Vinayak Khapare', 'https://drive.google.com/open?id=110fnNq7GaWneOnzykY9ZuSAP-0GH_aGv', 44, 'Yes underarm', 'Cricket', 'Fielder', 'Right', 'Y', 'F', NULL),
-- Player 22
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 22, 'Khushboo K. Chowhan', 'https://drive.google.com/open?id=1U1hL8Ts1OwuT1TZ5xxBmd1sDxGNdUcbJ', 44, 'Yes underarm', 'Badminton / T T', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 23
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 23, 'Sera Riya Dsouza', 'https://drive.google.com/file/d/1IQr6axmuz7S2TjO_0ESitI_9mDlvAOdq/view?usp=drive_link', 20, 'Not applicable', 'NA', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 24
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 24, 'Neha Gupta', 'https://drive.google.com/open?id=1Rj78_WkLUGRD4ngB65if0B0Dl0_C6C6U', 41, 'Not applicable', 'NA', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 25
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 25, 'Unnati Vaishnno Jetley', 'https://drive.google.com/open?id=1GKpahuMMem5hfdnHHTzNjDHyXif66hEB', 56, 'Yes underarm', 'I play badminton for liesure', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 26
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 26, 'Tanuja Sehadev', 'https://drive.google.com/open?id=1MvNS7q4DKXAlgUS-jbc4QVNq4G8U1VSl', 36, 'Not applicable', 'NA', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 27
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 27, 'Dhyana Vyas', 'https://drive.google.com/open?id=1Z5ctC0AhXBTrVbGFoJhtkzsKbto_aOHm', 11, 'Yes both', 'Cricket and swimming', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 28
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 28, 'Snehal Kothari', 'https://drive.google.com/open?id=1134ehS8eQNhSYmosfOabKk9QKa30zrc4', 29, 'Yes underarm', 'Played underarm', 'Batsman', 'Right', 'Y', 'F', NULL),
-- Player 29
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 29, 'Tejal Ritesh soni', 'https://drive.google.com/open?id=1ku-XzElXgEcMq7NRn88iBa3i7-aLc5G7', 38, 'Not applicable', 'Cricket', 'Bowler', 'Right', 'Y', 'F', NULL),
-- Player 30
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 30, 'Sandra', 'https://drive.google.com/file/d/1bnXG3tsy8962Cv73cNSoOPmCvlMn3bp1/view?usp=drive_link', NULL, 'Not applicable', 'NA', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 31
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 31, 'Harsha Jhunjhunwala', 'https://drive.google.com/open?id=14Jf29u9sJ0JTdjsfYQlb0VGY2BA9ueRL', 39, 'Yes underarm', 'NA', 'Bowler', 'Right', 'Y', 'F', NULL),
-- Player 32
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 32, 'Greta Floyd Pinto', 'https://drive.google.com/open?id=1xwEpP7KjzuVy2DLSJbMRKkd48Yw2Pnnx', 57, 'Not applicable', 'NA', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 33
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 33, 'Anjali sawant', 'https://drive.google.com/open?id=1Vg4ODmJax-6Eke97Fv2JuREGmPW8zcRD', 49, 'Yes underarm', 'I participated in running competitions and also i played cricket, kabaddi , badminton and kho kho tooo', 'Bowler', 'Right', 'Y', 'F', NULL),
-- Player 34
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 34, 'Bhavini Thakkar', 'https://drive.google.com/open?id=1miZCIxecHG21sRADireysLPANKuXO4dy', 49, 'Yes underarm', 'Cricket for leisure.', 'Yet to be discovered', 'Right', 'Y', 'F', NULL),
-- Player 35
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 35, 'Deepti Chandra Mehra', 'https://drive.google.com/open?id=1geUo6rIBEkXc3ETNfcsLHSfpmBiN5Pwo', 44, 'Not applicable', 'NA', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 36
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 36, 'Vidhi Mestry', 'https://drive.google.com/open?id=1quGWoGY3mJgCI-MjRF3f9Ajhvhdsdhmi', 42, 'Yes underarm', 'Badminton', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 37
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 37, 'Divya Naresh Malukani', 'https://drive.google.com/open?id=1ODczsrwdtFGI269RL50FmOwabxewzzKJ', 39, 'No', 'I have played Badminton and Basketball during my school days', 'Yet to be discovered', 'Right', 'Y', 'F', NULL),
-- Player 38
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 38, 'Aarti Desai', 'https://drive.google.com/open?id=13J-8QyLebxChu_Mxdv91nKef0SdmKHfP', 40, 'Yes underarm', 'I am a National Level Pistol Shooter', 'Fielder', 'Right', 'Y', 'F', NULL),
-- Player 39
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 39, 'Gautami Naikdesai', 'https://drive.google.com/open?id=1gWF01Bmcc-p1dGLp9hqDSQdmo9IrhXcN', 14, 'Yes underarm', 'Football', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 40
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 40, 'Henna SamantSalvi', 'https://drive.google.com/open?id=1r4t3iSZ3vVBn7I4Lc9xXzbsIlkJ0xpMK', 34, 'Yes underarm', 'NA', 'Yet to be discovered', 'Right', 'Y', 'F', NULL),
-- Player 41
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 41, 'Vinita Rane', 'https://drive.google.com/open?id=1kyLYt6UUoQLyY0FQTMPvvAZmEdJSziyD', 31, 'Yes underarm', 'Pickleball, badminton only for leisure', 'All Rounder', 'Right', 'Y', 'F', NULL),
-- Player 42
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 42, 'Anushka Amit Arolkar', 'https://drive.google.com/open?id=14YCp2ppXX3UhlxsA_30SmSNyAZP9jhY4', 42, 'Yes underarm', 'Table Tennis n played many Tournaments', 'Batsman', 'Right', 'Y', 'F', NULL),
-- Player 43
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 43, 'Rachna Veerender Singh Thakur', 'https://drive.google.com/file/d/16HHyLmKphPO8e-yT8m3tAyw4oTIR_e7o/view?usp=drive_link', 41, 'Not applicable', 'NA', 'Batsman', 'Right', 'Y', 'F', NULL),
-- Player 44
('d4dbe601-381a-4dcf-b131-8919cbbc9f17', 44, 'Hridaya Vishal Mestry', 'https://drive.google.com/open?id=1qIwIVEDfdN25uqetP4SySWvfmefoY5r5', 16, 'Yes both', 'I play cricket', 'All Rounder', 'Right', 'Y', 'F', NULL);
