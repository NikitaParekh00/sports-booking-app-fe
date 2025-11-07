-- Insert players into auction_player_pool table
-- Step 1: Get your session ID first:
-- SELECT id FROM public.auction_sessions WHERE is_complete = false ORDER BY created_at DESC LIMIT 1;

-- Step 2: Replace 'YOUR_SESSION_ID_HERE' below with the actual session ID from Step 1
-- Step 3: Run this query

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
) VALUES
('f9f8d300-b1ca-410a-9bbf-a3ac1d3cf2de', 0, 'Tushar Bohra', 'N', 'M', 'A', 45, 150, 2, 11, 0, 1, 8.186),
('f9f8d300-b1ca-410a-9bbf-a3ac1d3cf2de', 1, 'Amit Kasliwal', 'Y', 'M', 'A', 9, 90, 4, 6, 0, 0, 5.768),
('f9f8d300-b1ca-410a-9bbf-a3ac1d3cf2de', 2, 'Parv Kasliwal', 'Y', 'M', 'A', 122, 321.05, 0, 0, 3, 0, 13.442),
('f9f8d300-b1ca-410a-9bbf-a3ac1d3cf2de', 3, 'Vihaan Kasliwal', 'Y', 'M', 'A', 42, 247.06, 3, 7.67, 2, 0, 8.466),
('f9f8d300-b1ca-410a-9bbf-a3ac1d3cf2de', 4, 'Alok Kasliwal', 'Y', 'M', 'A', 25, 131.58, 2, 9.5, 0, 1, 6.304),
('f9f8d300-b1ca-410a-9bbf-a3ac1d3cf2de', 5, 'Ashish Gangwal', 'N', 'M', 'A', 9, 60, 1, 25, 1, 0, 2.22)
ON CONFLICT (session_id, player_order) DO UPDATE SET
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

-- Alternative: If you want to insert for the most recent active session automatically:
-- INSERT INTO public.auction_player_pool (
--     session_id,
--     player_order,
--     name,
--     payment_status,
--     gender,
--     category,
--     runs,
--     strike_rate,
--     wickets,
--     average,
--     catch_count,
--     ro,
--     mvp
-- )
-- SELECT 
--     s.id as session_id,
--     unnest(ARRAY[0, 1, 2, 3, 4, 5]) as player_order,
--     unnest(ARRAY['Tushar Bohra', 'Amit Kasliwal', 'Parv Kasliwal', 'Vihaan Kasliwal', 'Alok Kasliwal', 'Ashish Gangwal']) as name,
--     unnest(ARRAY['N', 'Y', 'Y', 'Y', 'Y', 'N']) as payment_status,
--     unnest(ARRAY['M', 'M', 'M', 'M', 'M', 'M']) as gender,
--     unnest(ARRAY['A', 'A', 'A', 'A', 'A', 'A']) as category,
--     unnest(ARRAY[45, 9, 122, 42, 25, 9]) as runs,
--     unnest(ARRAY[150, 90, 321.05, 247.06, 131.58, 60]) as strike_rate,
--     unnest(ARRAY[2, 4, 0, 3, 2, 1]) as wickets,
--     unnest(ARRAY[11, 6, 0, 7.67, 9.5, 25]) as average,
--     unnest(ARRAY[0, 0, 3, 2, 0, 1]) as catch_count,
--     unnest(ARRAY[1, 0, 0, 0, 1, 0]) as ro,
--     unnest(ARRAY[8.186, 5.768, 13.442, 8.466, 6.304, 2.22]) as mvp
-- FROM public.auction_sessions s
-- WHERE s.is_complete = false
-- ORDER BY s.created_at DESC
-- LIMIT 1
-- ON CONFLICT (session_id, player_order) DO UPDATE SET
--     name = EXCLUDED.name,
--     payment_status = EXCLUDED.payment_status,
--     gender = EXCLUDED.gender,
--     category = EXCLUDED.category,
--     runs = EXCLUDED.runs,
--     strike_rate = EXCLUDED.strike_rate,
--     wickets = EXCLUDED.wickets,
--     average = EXCLUDED.average,
--     catch_count = EXCLUDED.catch_count,
--     ro = EXCLUDED.ro,
--     mvp = EXCLUDED.mvp;
