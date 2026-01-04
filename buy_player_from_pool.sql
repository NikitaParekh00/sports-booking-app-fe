-- ============================================
-- BUY PLAYER FROM PLAYER POOL
-- ============================================
-- This query buys a player directly from the player pool and assigns them to a team

DO $$
DECLAREx`
    player_pool_record RECORD;
    team_record RECORD;
    team_id_uuid UUID;
    session_uuid UUID := 'f170529f-4d02-4f5d-a441-b244f2040eb9';  -- CHANGE: Your auction session UUID
    player_name_to_buy VARCHAR(100) := 'Bhavin Tolia';  -- CHANGE: Player name to buy
    team_num INTEGER := 7;  -- CHANGE: Team number (1, 2, 3, etc.)
    bid_amount DECIMAL(12, 2) := 1350000;  -- CHANGE: Bid amount
BEGIN
    -- Step 1: Get player details from player pool
    SELECT * INTO player_pool_record
    FROM public.auction_player_pool
    WHERE session_id = session_uuid 
      AND name = player_name_to_buy
    LIMIT 1;
    
    IF player_pool_record.id IS NULL THEN
        RAISE EXCEPTION 'Player % not found in player pool for session %', player_name_to_buy, session_uuid;
    END IF;
    
    -- Step 2: Check if player has already been bought by any team
    IF EXISTS (
        SELECT 1 FROM public.auction_players ap
        JOIN public.auction_teams at ON ap.team_id = at.id
        WHERE ap.player_name = player_name_to_buy 
          AND at.session_id = session_uuid
    ) THEN
        RAISE EXCEPTION 'Player % has already been bought by another team', player_name_to_buy;
    END IF;
    
    -- Step 3: Get team details
    SELECT id, budget, name INTO team_record
    FROM public.auction_teams
    WHERE session_id = session_uuid 
      AND team_number = team_num;
    
    IF team_record.id IS NULL THEN
        RAISE EXCEPTION 'Team % not found for session %', team_num, session_uuid;
    END IF;
    
    -- Step 4: Validate budget
    IF team_record.budget < bid_amount THEN
        RAISE EXCEPTION 'Insufficient budget for Team %. Required: ₹%, Available: ₹%', 
            team_record.name, bid_amount, team_record.budget;
    END IF;
    
    -- Step 5: Insert player into auction_players table
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
    
    -- Step 6: Update team budget
    UPDATE public.auction_teams
    SET budget = budget - bid_amount
    WHERE id = team_record.id;
    
    RAISE NOTICE 'Successfully bought % for Team % (Team %) at ₹%', 
        player_name_to_buy, team_record.name, team_num, bid_amount;
    RAISE NOTICE 'Team % new budget: ₹%', team_record.name, (team_record.budget - bid_amount);
END $$;

