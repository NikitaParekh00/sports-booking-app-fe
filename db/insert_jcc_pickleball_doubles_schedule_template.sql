-- =============================================================================
-- JCC Pickleball — 6-player pool doubles schedule (36 matches, 2 courts)
-- =============================================================================
-- Run in Supabase SQL Editor after uploading participants CSV.
--
-- BEFORE RUNNING:
--   1. Replace REPLACE_ME_TOURNAMENT_ID with your tournament UUID (JCC Pickleball).
--   2. Replace REPLACE_ME_SPORT with pickleball (or your sport slug).
--   3. Confirm player names in tournament_participants match exactly (case-insensitive).
--   4. Adjust ROUND_START times below if your Round 1 start differs from 9:00 PM IST.
--
-- Deletes existing tournament matches (RR-/B-/JCC-/DD- prefixes) then inserts 36 doubles
-- rows with __JSON__ lineup notes (individual tournament — no team_a_id / team_b_id).
-- =============================================================================

BEGIN;

WITH p AS (
  SELECT
    'REPLACE_ME_TOURNAMENT_ID'::uuid AS tournament_id,
    'REPLACE_ME_SPORT'::varchar AS sport,
    NULL::uuid AS created_by
),
_w1 AS (
  UPDATE public.matches m SET winner_id = NULL, winner_team_id = NULL
  FROM p WHERE m.tournament_id = p.tournament_id
  RETURNING 1
),
_w2 AS (
  DELETE FROM public.tournament_brackets tb
  USING p WHERE tb.tournament_id = p.tournament_id
  RETURNING 1
),
_w3 AS (
  DELETE FROM public.matches m
  USING p
  WHERE m.tournament_id = p.tournament_id
    AND (
      m.match_number LIKE 'RR-%'
      OR m.match_number LIKE 'B-%'
      OR m.match_number LIKE 'JCC-%'
      OR m.match_number LIKE 'DD-%'
      OR m.match_number LIKE 'SCH-%'
    )
  RETURNING 1
),
parts AS (
  SELECT
    tp.id,
    tp.player_name,
    COALESCE(NULLIF(trim(tp.category), ''), '—') AS category,
    lower(regexp_replace(trim(tp.player_name), '\s+', ' ', 'g')) AS name_key
  FROM public.tournament_participants tp
  INNER JOIN p ON tp.tournament_id = p.tournament_id
),
ins AS (
  INSERT INTO public.matches (
    id, tournament_id, sport, match_type, status,
    match_number, match_date, court_number, notes, created_by
  )
  SELECT
    gen_random_uuid(),
    p.tournament_id,
    p.sport,
    'tournament',
    'upcoming',
    v.match_no,
    ((v.match_date::date + v.match_time::time) AT TIME ZONE 'Asia/Kolkata')
      + (v.slot_idx * interval '10 minutes'),
    v.court,
    concat(
      'Resting: ', v.resting, E'\n',
      '__JSON__',
      jsonb_build_object(
        'type', 'doubles_line',
        'categoryKey', v.pool,
        'teamAId', 'side_a',
        'teamBId', 'side_b',
        'sideA', jsonb_build_array(
          jsonb_build_object('id', pa1.id::text, 'name', pa1.player_name, 'category', pa1.category),
          jsonb_build_object('id', pa2.id::text, 'name', pa2.player_name, 'category', pa2.category)
        ),
        'sideB', jsonb_build_array(
          jsonb_build_object('id', pb1.id::text, 'name', pb1.player_name, 'category', pb1.category),
          jsonb_build_object('id', pb2.id::text, 'name', pb2.player_name, 'category', pb2.category)
        )
      )::text
    ),
    p.created_by
  FROM p
  CROSS JOIN (
    VALUES
    ('JCC-R1B-01', 'R1 Boys', '1', '2026-06-15', '21:00:00', 0, 'Neel, Raj Shah', 'Nisarg Shah', 'Keval Gandhi', 'Vatsal Kothari', 'Karan Shah'),
    ('JCC-R1B-02', 'R1 Boys', '1', '2026-06-15', '21:00:00', 1, 'Nisarg Shah, Raj Shah', 'Neel', 'Karan Shah', 'Keval Gandhi', 'Vatsal Kothari'),
    ('JCC-R1B-03', 'R1 Boys', '1', '2026-06-15', '21:00:00', 2, 'Neel, Keval Gandhi', 'Vatsal Kothari', 'Raj Shah', 'Nisarg Shah', 'Karan Shah'),
    ('JCC-R1B-04', 'R1 Boys', '1', '2026-06-15', '21:00:00', 3, 'Keval Gandhi, Nisarg Shah', 'Raj Shah', 'Karan Shah', 'Vatsal Kothari', 'Neel'),
    ('JCC-R1B-05', 'R1 Boys', '1', '2026-06-15', '21:00:00', 4, 'Karan Shah, Vatsal Kothari', 'Neel', 'Nisarg Shah', 'Raj Shah', 'Keval Gandhi'),
    ('JCC-R1B-06', 'R1 Boys', '1', '2026-06-15', '21:00:00', 5, 'Vatsal Kothari, Karan Shah', 'Nisarg Shah', 'Raj Shah', 'Keval Gandhi', 'Neel'),
    ('JCC-R1G-01', 'R1 Girls', '2', '2026-06-15', '21:00:00', 0, 'Prapti Shah, Sneha Shah', 'Jinali Shah', 'Shaily Doshi', 'Diva Gala', 'Tejal Shah'),
    ('JCC-R1G-02', 'R1 Girls', '2', '2026-06-15', '21:00:00', 1, 'Jinali Shah, Sneha Shah', 'Prapti Shah', 'Tejal Shah', 'Shaily Doshi', 'Diva Gala'),
    ('JCC-R1G-03', 'R1 Girls', '2', '2026-06-15', '21:00:00', 2, 'Prapti Shah, Shaily Doshi', 'Diva Gala', 'Sneha Shah', 'Jinali Shah', 'Tejal Shah'),
    ('JCC-R1G-04', 'R1 Girls', '2', '2026-06-15', '21:00:00', 3, 'Shaily Doshi, Jinali Shah', 'Sneha Shah', 'Tejal Shah', 'Diva Gala', 'Prapti Shah'),
    ('JCC-R1G-05', 'R1 Girls', '2', '2026-06-15', '21:00:00', 4, 'Tejal Shah, Diva Gala', 'Prapti Shah', 'Jinali Shah', 'Sneha Shah', 'Shaily Doshi'),
    ('JCC-R1G-06', 'R1 Girls', '2', '2026-06-15', '21:00:00', 5, 'Diva Gala, Tejal Shah', 'Jinali Shah', 'Sneha Shah', 'Shaily Doshi', 'Prapti Shah'),
    ('JCC-R2B-01', 'R2 Boys', '1', '2026-06-15', '22:00:00', 0, 'Bhavin Shah, Jash Vira', 'Dhruvin Mehta', 'Amarkant Jain', 'Prabhav Shah', 'Neev Gala'),
    ('JCC-R2B-02', 'R2 Boys', '1', '2026-06-15', '22:00:00', 1, 'Dhruvin Mehta, Jash Vira', 'Bhavin Shah', 'Neev Gala', 'Amarkant Jain', 'Prabhav Shah'),
    ('JCC-R2B-03', 'R2 Boys', '1', '2026-06-15', '22:00:00', 2, 'Bhavin Shah, Amarkant Jain', 'Prabhav Shah', 'Jash Vira', 'Dhruvin Mehta', 'Neev Gala'),
    ('JCC-R2B-04', 'R2 Boys', '1', '2026-06-15', '22:00:00', 3, 'Amarkant Jain, Dhruvin Mehta', 'Jash Vira', 'Neev Gala', 'Prabhav Shah', 'Bhavin Shah'),
    ('JCC-R2B-05', 'R2 Boys', '1', '2026-06-15', '22:00:00', 4, 'Neev Gala, Prabhav Shah', 'Bhavin Shah', 'Dhruvin Mehta', 'Jash Vira', 'Amarkant Jain'),
    ('JCC-R2B-06', 'R2 Boys', '1', '2026-06-15', '22:00:00', 5, 'Prabhav Shah, Neev Gala', 'Dhruvin Mehta', 'Jash Vira', 'Amarkant Jain', 'Bhavin Shah'),
    ('JCC-R2G-01', 'R2 Girls', '2', '2026-06-15', '22:00:00', 0, 'Chirangi, Nirvi Vora', 'Krisha Mehta', 'Vini Doshi', 'Urvi Vora', 'Tanishka Jain'),
    ('JCC-R2G-02', 'R2 Girls', '2', '2026-06-15', '22:00:00', 1, 'Krisha Mehta, Nirvi Vora', 'Chirangi', 'Tanishka Jain', 'Vini Doshi', 'Urvi Vora'),
    ('JCC-R2G-03', 'R2 Girls', '2', '2026-06-15', '22:00:00', 2, 'Chirangi, Vini Doshi', 'Urvi Vora', 'Nirvi Vora', 'Krisha Mehta', 'Tanishka Jain'),
    ('JCC-R2G-04', 'R2 Girls', '2', '2026-06-15', '22:00:00', 3, 'Vini Doshi, Krisha Mehta', 'Nirvi Vora', 'Tanishka Jain', 'Urvi Vora', 'Chirangi'),
    ('JCC-R2G-05', 'R2 Girls', '2', '2026-06-15', '22:00:00', 4, 'Tanishka Jain, Urvi Vora', 'Chirangi', 'Krisha Mehta', 'Nirvi Vora', 'Vini Doshi'),
    ('JCC-R2G-06', 'R2 Girls', '2', '2026-06-15', '22:00:00', 5, 'Urvi Vora, Tanishka Jain', 'Krisha Mehta', 'Nirvi Vora', 'Vini Doshi', 'Chirangi'),
    ('JCC-R3B-01', 'R3 Boys', '1', '2026-06-15', '23:00:00', 0, 'Tirth Rita, Jash Shah', 'Umang Shah', 'Tosh Shah', 'Vihaan Morvadiya', 'Naman Jain'),
    ('JCC-R3B-02', 'R3 Boys', '1', '2026-06-15', '23:00:00', 1, 'Umang Shah, Jash Shah', 'Tirth Rita', 'Naman Jain', 'Tosh Shah', 'Vihaan Morvadiya'),
    ('JCC-R3B-03', 'R3 Boys', '1', '2026-06-15', '23:00:00', 2, 'Tirth Rita, Tosh Shah', 'Vihaan Morvadiya', 'Jash Shah', 'Umang Shah', 'Naman Jain'),
    ('JCC-R3B-04', 'R3 Boys', '1', '2026-06-15', '23:00:00', 3, 'Tosh Shah, Umang Shah', 'Jash Shah', 'Naman Jain', 'Vihaan Morvadiya', 'Tirth Rita'),
    ('JCC-R3B-05', 'R3 Boys', '1', '2026-06-15', '23:00:00', 4, 'Naman Jain, Vihaan Morvadiya', 'Tirth Rita', 'Umang Shah', 'Jash Shah', 'Tosh Shah'),
    ('JCC-R3B-06', 'R3 Boys', '1', '2026-06-15', '23:00:00', 5, 'Vihaan Morvadiya, Naman Jain', 'Umang Shah', 'Jash Shah', 'Tosh Shah', 'Tirth Rita'),
    ('JCC-R3G-01', 'R3 Girls', '2', '2026-06-15', '23:00:00', 0, 'Zalak Shah, Nishi Jain', 'Mayura Amarkant', 'Julie Jain', 'Kejal Mehta', 'Jinal Shah'),
    ('JCC-R3G-02', 'R3 Girls', '2', '2026-06-15', '23:00:00', 1, 'Mayura Amarkant, Nishi Jain', 'Zalak Shah', 'Jinal Shah', 'Julie Jain', 'Kejal Mehta'),
    ('JCC-R3G-03', 'R3 Girls', '2', '2026-06-15', '23:00:00', 2, 'Zalak Shah, Julie Jain', 'Kejal Mehta', 'Nishi Jain', 'Mayura Amarkant', 'Jinal Shah'),
    ('JCC-R3G-04', 'R3 Girls', '2', '2026-06-15', '23:00:00', 3, 'Julie Jain, Mayura Amarkant', 'Nishi Jain', 'Jinal Shah', 'Kejal Mehta', 'Zalak Shah'),
    ('JCC-R3G-05', 'R3 Girls', '2', '2026-06-15', '23:00:00', 4, 'Jinal Shah, Kejal Mehta', 'Zalak Shah', 'Mayura Amarkant', 'Nishi Jain', 'Julie Jain'),
    ('JCC-R3G-06', 'R3 Girls', '2', '2026-06-15', '23:00:00', 5, 'Kejal Mehta, Jinal Shah', 'Mayura Amarkant', 'Nishi Jain', 'Julie Jain', 'Zalak Shah')
  ) AS v(match_no, pool, court, match_date, match_time, slot_idx, resting, a1n, a2n, b1n, b2n)
  INNER JOIN parts pa1 ON pa1.name_key = lower(regexp_replace(trim(v.a1n), '\s+', ' ', 'g'))
  INNER JOIN parts pa2 ON pa2.name_key = lower(regexp_replace(trim(v.a2n), '\s+', ' ', 'g'))
  INNER JOIN parts pb1 ON pb1.name_key = lower(regexp_replace(trim(v.b1n), '\s+', ' ', 'g'))
  INNER JOIN parts pb2 ON pb2.name_key = lower(regexp_replace(trim(v.b2n), '\s+', ' ', 'g'))
  RETURNING id, match_number
)
SELECT count(*) AS matches_inserted FROM ins;

COMMIT;

-- Verify (expect 36):
-- SELECT match_number, court_number, match_date, left(notes, 80) FROM matches
-- WHERE tournament_id = 'REPLACE_ME_TOURNAMENT_ID'::uuid
-- ORDER BY match_date, court_number, match_number;
