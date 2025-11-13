-- ============================================
-- AUCTION UTILITIES
-- Consolidated queries for managing auction data
-- ============================================

-- ============================================
-- 1. SESSION MANAGEMENT
-- ============================================

-- Get or Create Session ID
-- Option 1: Find the current active (incomplete) session ID
SELECT 
    id as session_id,
    session_name,
    current_player_index,
    is_complete,
    created_at
FROM public.auction_sessions 
WHERE is_complete = false 
ORDER BY created_at DESC 
LIMIT 1;

-- Option 2: See ALL sessions (active and completed)
SELECT 
    id as session_id,
    session_name,
    current_player_index,
    is_complete,
    created_at
FROM public.auction_sessions 
ORDER BY created_at DESC;

-- Option 3: Create a NEW session
INSERT INTO public.auction_sessions (session_name, current_player_index, is_complete)
VALUES ('Main Auction', 0, false)
RETURNING id as session_id, session_name, created_at;

-- Restart Auction Session (Auto-detect most recent incomplete session)
DO $$
DECLARE
    v_session_id UUID;
BEGIN
    SELECT id INTO v_session_id
    FROM public.auction_sessions
    WHERE is_complete = false
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_session_id IS NULL THEN
        RAISE EXCEPTION 'No incomplete session found. Please create a new session.';
    END IF;

    RAISE NOTICE 'Restarting session: %', v_session_id;

    UPDATE public.auction_sessions
    SET current_player_index = 0, is_complete = false
    WHERE id = v_session_id;

    DELETE FROM public.auction_players WHERE session_id = v_session_id;

    UPDATE public.auction_teams
    SET budget = 111000, category_a_count = 0, category_b_count = 0, category_c_count = 0
    WHERE session_id = v_session_id;

    RAISE NOTICE 'Session restarted successfully!';
END $$;

-- ============================================
-- 2. PLAYER POOL MANAGEMENT
-- ============================================

-- Get next available player_order
SELECT COALESCE(MAX(player_order), -1) + 1 as next_player_order
FROM public.auction_player_pool
WHERE session_id = 'aa251ee5-144e-416b-b603-cd0a5e867948';  -- CHANGE SESSION ID

-- Add a player to auction_player_pool
INSERT INTO public.auction_player_pool (
    session_id, player_order, name, payment_status, gender, category,
    runs, strike_rate, wickets, average, catch_count, ro, mvp
) VALUES (
    'aa251ee5-144e-416b-b603-cd0a5e867948',  -- CHANGE SESSION ID
    0,  -- CHANGE: Use next available player_order
    'Player Name',  -- CHANGE
    'Y',  -- CHANGE: 'Y' or 'N'
    'M',  -- CHANGE: 'M' or 'F'
    'Non Marquee',  -- CHANGE: e.g., 'Super Marquee', 'Marquee', 'Non Marquee', 'Kid'
    0, 0, 0, 0, 0, 0, 0  -- CHANGE: runs, strike_rate, wickets, average, catch_count, ro, mvp
)
ON CONFLICT (session_id, player_order) 
DO UPDATE SET
    name = EXCLUDED.name,
    payment_status = EXCLUDED.payment_status,
    gender = EXCLUDED.gender,
    category = EXCLUDED.category,
    runs = EXCLUDED.runs,
    strike_rate = EXCLUDED.strike_rate,
    wickets = EXCLUDED.wickets,
    average = EXCLUDED.average,
    catch_count = EXCLUDED.catch_count,
    ro = EXCLUDED.ro,
    mvp = EXCLUDED.mvp;

-- Fetch all unbought players (available for auction)
SELECT 
    app.player_order, app.name, app.category, app.gender,
    app.runs, app.wickets, app.mvp
FROM public.auction_player_pool app
LEFT JOIN public.auction_players ap ON ap.session_id = app.session_id AND ap.player_name = app.name
WHERE app.session_id = 'aa251ee5-144e-416b-b603-cd0a5e867948'  -- CHANGE SESSION ID
  AND ap.id IS NULL
ORDER BY app.player_order ASC;

-- Count unbought players
SELECT 
    COUNT(*) as total_unbought_players,
    COUNT(CASE WHEN gender = 'M' THEN 1 END) as male_count,
    COUNT(CASE WHEN gender = 'F' THEN 1 END) as female_count,
    COUNT(CASE WHEN category ILIKE '%Super Marquee%' THEN 1 END) as super_marquee_count,
    COUNT(CASE WHEN category ILIKE '%Marquee%' AND category NOT ILIKE '%Super%' AND category NOT ILIKE '%Non%' THEN 1 END) as marquee_count,
    COUNT(CASE WHEN category ILIKE '%Non Marquee%' THEN 1 END) as non_marquee_count,
    COUNT(CASE WHEN category ILIKE '%Kid%' THEN 1 END) as kid_count
FROM public.auction_player_pool app
LEFT JOIN public.auction_players ap ON ap.session_id = app.session_id AND ap.player_name = app.name
WHERE app.session_id = 'aa251ee5-144e-416b-b603-cd0a5e867948'  -- CHANGE SESSION ID
  AND ap.id IS NULL;

-- Keep only unbought players in pool (delete bought players and reorder)
DO $$
DECLARE
    v_session_id UUID := 'aa251ee5-144e-416b-b603-cd0a5e867948';  -- CHANGE SESSION ID
BEGIN
    -- Delete players that have been bought
    DELETE FROM public.auction_player_pool
    WHERE session_id = v_session_id
      AND id IN (
          SELECT app.id
          FROM public.auction_player_pool app
          INNER JOIN public.auction_players ap ON ap.session_id = app.session_id AND ap.player_name = app.name
          WHERE app.session_id = v_session_id
      );

    -- Reorder remaining players
    WITH reordered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY player_order) - 1 as new_order
        FROM public.auction_player_pool
        WHERE session_id = v_session_id
    )
    UPDATE public.auction_player_pool app
    SET player_order = reordered.new_order
    FROM reordered
    WHERE app.id = reordered.id;

    -- Reset current_player_index
    UPDATE public.auction_sessions
    SET current_player_index = 0
    WHERE id = v_session_id;

    RAISE NOTICE 'Pool cleaned and reordered successfully!';
END $$;

-- ============================================
-- 3. TEAM MANAGEMENT
-- ============================================

-- Add a player to a team
DO $$
DECLARE
    player_pool_record RECORD;
    team_record RECORD;
    team_id_uuid UUID;
    session_uuid UUID := 'aa251ee5-144e-416b-b603-cd0a5e867948';  -- CHANGE SESSION ID
    player_name_to_add VARCHAR(100) := 'Player Name';  -- CHANGE
    team_num INTEGER := 1;  -- CHANGE: Team number
    bid_amount DECIMAL(12, 2) := 10000;  -- CHANGE: Bid amount
BEGIN
    SELECT * INTO player_pool_record
    FROM public.auction_player_pool
    WHERE session_id = session_uuid AND name = player_name_to_add LIMIT 1;
    
    IF player_pool_record.id IS NULL THEN
        RAISE EXCEPTION 'Player % not found in pool', player_name_to_add;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM public.auction_players ap
        JOIN public.auction_teams at ON ap.team_id = at.id
        WHERE ap.player_name = player_name_to_add AND at.session_id = session_uuid
    ) THEN
        RAISE EXCEPTION 'Player % already bought', player_name_to_add;
    END IF;
    
    SELECT id, budget INTO team_record
    FROM public.auction_teams
    WHERE session_id = session_uuid AND team_number = team_num;
    
    IF team_record.id IS NULL THEN
        RAISE EXCEPTION 'Team % not found', team_num;
    END IF;
    
    IF team_record.budget < bid_amount THEN
        RAISE EXCEPTION 'Insufficient budget. Required: ₹%, Available: ₹%', bid_amount, team_record.budget;
    END IF;
    
    INSERT INTO public.auction_players (
        session_id, team_id, player_name, player_category, bid_amount,
        payment_status, gender, runs, strike_rate, wickets, average,
        catch_count, ro, mvp
    ) VALUES (
        session_uuid, team_record.id, player_pool_record.name, player_pool_record.category, bid_amount,
        player_pool_record.payment_status, player_pool_record.gender, player_pool_record.runs,
        player_pool_record.strike_rate, player_pool_record.wickets, player_pool_record.average,
        player_pool_record.catch_count, player_pool_record.ro, player_pool_record.mvp
    );
    
    UPDATE public.auction_teams
    SET budget = budget - bid_amount
    WHERE id = team_record.id;
    
    RAISE NOTICE 'Added % to Team % for ₹%', player_name_to_add, team_num, bid_amount;
END $$;

-- Move a player from one team to another
DO $$
DECLARE
    player_record RECORD;
    from_team_id UUID;
    to_team_id UUID;
    session_uuid UUID := 'aa251ee5-144e-416b-b603-cd0a5e867948';  -- CHANGE SESSION ID
    player_name_to_move VARCHAR(100) := 'Player Name';  -- CHANGE
    from_team_num INTEGER := 1;  -- CHANGE: Source team
    to_team_num INTEGER := 6;   -- CHANGE: Destination team
    to_team_budget DECIMAL(12, 2);
BEGIN
    SELECT ap.id, ap.team_id, ap.bid_amount, ap.player_category, ap.payment_status,
           ap.gender, ap.runs, ap.strike_rate, ap.wickets, ap.average,
           ap.catch_count, ap.ro, ap.mvp, ap.session_id
    INTO player_record
    FROM public.auction_players ap
    JOIN public.auction_teams at ON ap.team_id = at.id
    WHERE ap.player_name = player_name_to_move
      AND at.team_number = from_team_num
      AND at.session_id = session_uuid
    LIMIT 1;
    
    IF player_record.id IS NULL THEN
        RAISE EXCEPTION 'Player % not found in team %', player_name_to_move, from_team_num;
    END IF;
    
    SELECT id INTO from_team_id FROM public.auction_teams WHERE session_id = session_uuid AND team_number = from_team_num;
    SELECT id, budget INTO to_team_id, to_team_budget FROM public.auction_teams WHERE session_id = session_uuid AND team_number = to_team_num;
    
    IF from_team_id IS NULL THEN RAISE EXCEPTION 'Source team % not found', from_team_num; END IF;
    IF to_team_id IS NULL THEN RAISE EXCEPTION 'Destination team % not found', to_team_num; END IF;
    IF to_team_budget < player_record.bid_amount THEN
        RAISE EXCEPTION 'Destination team insufficient budget. Required: ₹%, Available: ₹%', player_record.bid_amount, to_team_budget;
    END IF;
    
    UPDATE public.auction_teams SET budget = budget + player_record.bid_amount WHERE id = from_team_id;
    DELETE FROM public.auction_players WHERE id = player_record.id;
    
    INSERT INTO public.auction_players (
        session_id, team_id, player_name, player_category, bid_amount,
        payment_status, gender, runs, strike_rate, wickets, average,
        catch_count, ro, mvp
    ) VALUES (
        player_record.session_id, to_team_id, player_name_to_move, player_record.player_category, player_record.bid_amount,
        player_record.payment_status, player_record.gender, player_record.runs,
        player_record.strike_rate, player_record.wickets, player_record.average,
        player_record.catch_count, player_record.ro, player_record.mvp
    );
    
    UPDATE public.auction_teams SET budget = budget - player_record.bid_amount WHERE id = to_team_id;
    
    RAISE NOTICE 'Moved % from Team % to Team %', player_name_to_move, from_team_num, to_team_num;
END $$;

-- View team details
SELECT 
    at.team_number, at.name, at.budget as remaining_budget,
    (111000 - at.budget) as total_spent, COUNT(ap.id) as players_count
FROM public.auction_teams at
LEFT JOIN public.auction_players ap ON ap.team_id = at.id
WHERE at.session_id = 'aa251ee5-144e-416b-b603-cd0a5e867948'  -- CHANGE SESSION ID
GROUP BY at.id, at.team_number, at.name, at.budget
ORDER BY at.team_number;

-- View players in a specific team
SELECT 
    ap.player_name, ap.player_category, ap.bid_amount
FROM public.auction_players ap
JOIN public.auction_teams at ON ap.team_id = at.id
WHERE at.session_id = 'aa251ee5-144e-416b-b603-cd0a5e867948'  -- CHANGE SESSION ID
  AND at.team_number = 1  -- CHANGE: Team number
ORDER BY ap.bid_amount DESC;

