-- Auto-detect and copy players from most recent session to current incomplete session
-- This script automatically finds the sessions and copies players

DO $$
DECLARE
    v_old_session_id UUID;
    v_new_session_id UUID;
    v_player_count INTEGER;
BEGIN
    -- Find the most recent COMPLETE session (or any session with players)
    SELECT id INTO v_old_session_id
    FROM public.auction_sessions
    WHERE id IN (
        SELECT DISTINCT session_id 
        FROM public.auction_player_pool 
        GROUP BY session_id 
        HAVING COUNT(*) > 0
    )
    ORDER BY created_at DESC
    LIMIT 1;

    -- Find the current incomplete session
    SELECT id INTO v_new_session_id
    FROM public.auction_sessions
    WHERE is_complete = false
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_old_session_id IS NULL THEN
        RAISE EXCEPTION 'No session with players found. Please add players manually first.';
    END IF;

    IF v_new_session_id IS NULL THEN
        RAISE EXCEPTION 'No incomplete session found.';
    END IF;

    IF v_old_session_id = v_new_session_id THEN
        RAISE NOTICE 'Old and new sessions are the same. No copy needed.';
        RETURN;
    END IF;

    RAISE NOTICE 'Copying players from session % to session %', v_old_session_id, v_new_session_id;

    -- Count players in old session
    SELECT COUNT(*) INTO v_player_count
    FROM public.auction_player_pool
    WHERE session_id = v_old_session_id;

    RAISE NOTICE 'Found % players in old session', v_player_count;

    -- Copy players using INSERT with ON CONFLICT to handle duplicates
    INSERT INTO public.auction_player_pool (
        session_id,
        player_order,
        name,
        payment_status,
        gender,
        category,
        runs,
        strike_rate,
        wickets,
        average,
        catch_count,
        ro,
        mvp
    )
    SELECT 
        v_new_session_id as session_id,
        player_order,
        name,
        payment_status,
        gender,
        category,
        runs,
        strike_rate,
        wickets,
        average,
        catch_count,
        ro,
        mvp
    FROM public.auction_player_pool
    WHERE session_id = v_old_session_id
    ON CONFLICT (session_id, player_order) DO NOTHING;

    -- Count how many were actually inserted
    SELECT COUNT(*) INTO v_player_count
    FROM public.auction_player_pool
    WHERE session_id = v_new_session_id;

    RAISE NOTICE 'Successfully copied players. New session now has % players', v_player_count;
END $$;

-- Verify the copy
SELECT 
    s.id as session_id,
    s.current_player_index,
    s.is_complete,
    COUNT(DISTINCT app.id) as players_in_pool
FROM public.auction_sessions s
LEFT JOIN public.auction_player_pool app ON app.session_id = s.id
WHERE s.is_complete = false
GROUP BY s.id, s.current_player_index, s.is_complete
ORDER BY s.created_at DESC
LIMIT 1;

-- Show first 10 players in the new session
SELECT 
    player_order,
    name,
    category,
    gender,
    payment_status
FROM public.auction_player_pool
WHERE session_id IN (
    SELECT id FROM public.auction_sessions 
    WHERE is_complete = false 
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY player_order
LIMIT 10;

