-- ============================================
-- BUY PLAYER FROM SKIPPED PLAYERS
-- ============================================
-- This query buys a player that is currently in the skipped players list
-- and assigns them to a team

DO $$
DECLARE
    player_pool_record RECORD;
    team_record RECORD;
    skipped_player_record RECORD;
    team_id_uuid UUID;
    session_uuid UUID := 'YOUR_SESSION_ID_HERE';  -- CHANGE: Your auction session UUID
    player_name_to_buy VARCHAR(100) := 'Player Name';  -- CHANGE: Player name to buy
    team_num INTEGER := 1;  -- CHANGE: Team number (1, 2, 3, etc.)
    bid_amount DECIMAL(12, 2) := 500000;  -- CHANGE: Bid amount
BEGIN
    -- Step 1: Check if player exists in skipped players
    SELECT asp.*, app.* INTO skipped_player_record
    FROM public.auction_skipped_players asp
    JOIN public.auction_player_pool app ON asp.player_pool_id = app.id
    WHERE asp.session_id = session_uuid 
      AND asp.player_name = player_name_to_buy
    LIMIT 1;
    
    IF skipped_player_record.id IS NULL THEN
        RAISE EXCEPTION 'Player % not found in skipped players for session %', player_name_to_buy, session_uuid;
    END IF;
    
    -- Step 2: Get player details from player pool
    SELECT * INTO player_pool_record
    FROM public.auction_player_pool
    WHERE id = skipped_player_record.player_pool_id;
    
    IF player_pool_record.id IS NULL THEN
        RAISE EXCEPTION 'Player pool record not found for player %', player_name_to_buy;
    END IF;
    
    -- Step 3: Check if player has already been bought by any team
    IF EXISTS (
        SELECT 1 FROM public.auction_players ap
        JOIN public.auction_teams at ON ap.team_id = at.id
        WHERE ap.player_name = player_name_to_buy 
          AND at.session_id = session_uuid
    ) THEN
        RAISE EXCEPTION 'Player % has already been bought by another team', player_name_to_buy;
    END IF;
    
    -- Step 4: Get team details
    SELECT id, budget, name INTO team_record
    FROM public.auction_teams
    WHERE session_id = session_uuid 
      AND team_number = team_num;
    
    IF team_record.id IS NULL THEN
        RAISE EXCEPTION 'Team % not found for session %', team_num, session_uuid;
    END IF;
    
    -- Step 5: Validate budget
    IF team_record.budget < bid_amount THEN
        RAISE EXCEPTION 'Insufficient budget for Team %. Required: ₹%, Available: ₹%', 
            team_record.name, bid_amount, team_record.budget;
    END IF;
    
    -- Step 6: Insert player into auction_players table
    INSERT INTO public.auction_players (
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
    ) VALUES (
        session_uuid, 
        team_record.id, 
        player_pool_record.name, 
        player_pool_record.category, 
        bid_amount,
        player_pool_record.payment_status, 
        player_pool_record.gender, 
        COALESCE(player_pool_record.runs, 0),
        COALESCE(player_pool_record.strike_rate, 0),
        COALESCE(player_pool_record.wickets, 0),
        COALESCE(player_pool_record.average, 0),
        COALESCE(player_pool_record.catch_count, 0),
        COALESCE(player_pool_record.ro, 0),
        COALESCE(player_pool_record.mvp, 0)
    );
    
    -- Step 7: Update team budget
    UPDATE public.auction_teams
    SET budget = budget - bid_amount
    WHERE id = team_record.id;
    
    -- Step 8: Remove player from skipped_players table
    DELETE FROM public.auction_skipped_players
    WHERE session_id = session_uuid
      AND player_pool_id = skipped_player_record.player_pool_id;
    
    RAISE NOTICE 'Successfully bought % for Team % (Team %) at ₹%', 
        player_name_to_buy, team_record.name, team_num, bid_amount;
    RAISE NOTICE 'Removed % from skipped players list', player_name_to_buy;
    RAISE NOTICE 'Team % new budget: ₹%', team_record.name, (team_record.budget - bid_amount);
END $$;

-- ============================================
-- ALTERNATIVE: Simple version using CTEs
-- ============================================
-- If you prefer a simpler query without DO block:

/*
WITH skipped_player AS (
    SELECT asp.player_pool_id, app.*
    FROM public.auction_skipped_players asp
    JOIN public.auction_player_pool app ON asp.player_pool_id = app.id
    WHERE asp.session_id = 'YOUR_SESSION_ID_HERE'
      AND asp.player_name = 'Player Name'
    LIMIT 1
),
team_info AS (
    SELECT id, budget, name
    FROM public.auction_teams
    WHERE session_id = 'YOUR_SESSION_ID_HERE'
      AND team_number = 1
)
INSERT INTO public.auction_players (
    session_id, team_id, player_name, player_category, bid_amount,
    payment_status, gender, runs, strike_rate, wickets, average,
    catch_count, ro, mvp
)
SELECT 
    'YOUR_SESSION_ID_HERE',
    ti.id,
    sp.name,
    sp.category,
    500000,  -- bid_amount
    sp.payment_status,
    sp.gender,
    COALESCE(sp.runs, 0),
    COALESCE(sp.strike_rate, 0),
    COALESCE(sp.wickets, 0),
    COALESCE(sp.average, 0),
    COALESCE(sp.catch_count, 0),
    COALESCE(sp.ro, 0),
    COALESCE(sp.mvp, 0)
FROM skipped_player sp
CROSS JOIN team_info ti
WHERE ti.budget >= 500000  -- Validate budget
  AND NOT EXISTS (
      SELECT 1 FROM public.auction_players ap
      JOIN public.auction_teams at ON ap.team_id = at.id
      WHERE ap.player_name = sp.name AND at.session_id = 'YOUR_SESSION_ID_HERE'
  );

-- Update team budget
UPDATE public.auction_teams
SET budget = budget - 500000
WHERE session_id = 'YOUR_SESSION_ID_HERE'
  AND team_number = 1;

-- Remove from skipped players
DELETE FROM public.auction_skipped_players
WHERE session_id = 'YOUR_SESSION_ID_HERE'
  AND player_pool_id IN (
      SELECT player_pool_id
      FROM public.auction_skipped_players
      WHERE session_id = 'YOUR_SESSION_ID_HERE'
        AND player_name = 'Player Name'
  );
*/

