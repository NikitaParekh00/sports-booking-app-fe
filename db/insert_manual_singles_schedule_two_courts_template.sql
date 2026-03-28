-- =============================================================================
-- Manual singles schedule — Court 1 = Singles A + C, Court 2 = Singles B + D
-- =============================================================================
-- Supabase-safe (no psql \set). Edit the p CTE below once, then run the script.
--
-- Clears winner_id, deletes tournament_brackets, deletes all matches for the
-- tournament (cascade removes match_players / scores). Inserts 24 matches +
-- 48 match_players rows.
-- =============================================================================

BEGIN;

WITH p AS (
    SELECT
        'REPLACE_ME_TOURNAMENT_ID'::uuid AS tournament_id,
        'REPLACE_ME_SPORT'::varchar AS sport,
        -- 8:30 first slot in your zone, e.g. IST:
        timestamptz 'REPLACE_ME_FIRST_SLOT_830' AS t830,
        NULL::uuid AS created_by
),
_w1 AS (
    UPDATE public.matches m
    SET winner_id = NULL
    FROM p
    WHERE m.tournament_id = p.tournament_id
    RETURNING 1
),
_w2 AS (
    DELETE FROM public.tournament_brackets tb
    USING p
    WHERE tb.tournament_id = p.tournament_id
    RETURNING 1
),
_w3 AS (
    DELETE FROM public.matches m
    USING p
    WHERE m.tournament_id = p.tournament_id
    RETURNING 1
),
ins AS (
    INSERT INTO public.matches (
        id,
        tournament_id,
        sport,
        match_type,
        status,
        match_number,
        match_date,
        court_number,
        notes,
        created_by
    )
    SELECT
        gen_random_uuid(),
        p.tournament_id,
        p.sport,
        'tournament',
        'upcoming',
        v.match_number,
        p.t830 + (v.slot_idx * interval '20 minutes'),
        v.court_number,
        v.notes,
        p.created_by
    FROM p
    CROSS JOIN (
        SELECT
            (SELECT count(*)::bigint FROM _w1)
            + (SELECT count(*)::bigint FROM _w2)
            + (SELECT count(*)::bigint FROM _w3) AS _ensure_dml_ran
    ) z
    CROSS JOIN (
        VALUES
            ('SCH-C1-01', '1', 'Singles A', 0),
            ('SCH-C1-02', '1', 'Singles A', 1),
            ('SCH-C1-03', '1', 'Singles C', 2),
            ('SCH-C1-04', '1', 'Singles C', 3),
            ('SCH-C1-05', '1', 'Singles A', 4),
            ('SCH-C1-06', '1', 'Singles C', 5),
            ('SCH-C1-07', '1', 'Singles C', 6),
            ('SCH-C1-08', '1', 'Singles A', 7),
            ('SCH-C1-09', '1', 'Singles C', 8),
            ('SCH-C1-10', '1', 'Singles A', 9),
            ('SCH-C1-11', '1', 'Singles A', 10),
            ('SCH-C1-12', '1', 'Singles C', 11),
            ('SCH-C2-01', '2', 'Singles B', 0),
            ('SCH-C2-02', '2', 'Singles B', 1),
            ('SCH-C2-03', '2', 'Singles B', 2),
            ('SCH-C2-04', '2', 'Singles D', 3),
            ('SCH-C2-05', '2', 'Singles B', 4),
            ('SCH-C2-06', '2', 'Singles D', 5),
            ('SCH-C2-07', '2', 'Singles B', 6),
            ('SCH-C2-08', '2', 'Singles D', 7),
            ('SCH-C2-09', '2', 'Singles B', 8),
            ('SCH-C2-10', '2', 'Singles D', 9),
            ('SCH-C2-11', '2', 'Singles D', 10),
            ('SCH-C2-12', '2', 'Singles D', 11)
    ) AS v(match_number, court_number, notes, slot_idx)
    RETURNING id, match_number
)
INSERT INTO public.match_players (match_id, user_id, player_name, phone, team, is_captain)
SELECT ins.id, NULL::uuid, x.player_name, NULL::varchar, x.team, false
FROM ins
JOIN (
    VALUES
        ('SCH-C1-01', 'Harsh Shah', 'player_1'),
        ('SCH-C1-01', 'Meet Parikh', 'player_2'),
        ('SCH-C1-02', 'Om Patil', 'player_1'),
        ('SCH-C1-02', 'Uday Pannu', 'player_2'),
        ('SCH-C1-03', 'Harsh Bhatia', 'player_1'),
        ('SCH-C1-03', 'Mitesh Kanojiya', 'player_2'),
        ('SCH-C1-04', 'Shriraj Kulkarni', 'player_1'),
        ('SCH-C1-04', 'Mitesh Kanojiya', 'player_2'),
        ('SCH-C1-05', 'Harsh Shah', 'player_1'),
        ('SCH-C1-05', 'Uday Pannu', 'player_2'),
        ('SCH-C1-06', 'Kavish Sanghavi', 'player_1'),
        ('SCH-C1-06', 'Mitesh Kanojiya', 'player_2'),
        ('SCH-C1-07', 'Kavish Sanghavi', 'player_1'),
        ('SCH-C1-07', 'Shriraj Kulkarni', 'player_2'),
        ('SCH-C1-08', 'Meet Parikh', 'player_1'),
        ('SCH-C1-08', 'Om Patil', 'player_2'),
        ('SCH-C1-09', 'Kavish Sanghavi', 'player_1'),
        ('SCH-C1-09', 'Harsh Bhatia', 'player_2'),
        ('SCH-C1-10', 'Meet Parikh', 'player_1'),
        ('SCH-C1-10', 'Uday Pannu', 'player_2'),
        ('SCH-C1-11', 'Harsh Shah', 'player_1'),
        ('SCH-C1-11', 'Om Patil', 'player_2'),
        ('SCH-C1-12', 'Harsh Bhatia', 'player_1'),
        ('SCH-C1-12', 'Shriraj Kulkarni', 'player_2'),
        ('SCH-C2-01', 'Heet Jain', 'player_1'),
        ('SCH-C2-01', 'Ram Agrawal', 'player_2'),
        ('SCH-C2-02', 'Shresth Toshniwal', 'player_1'),
        ('SCH-C2-02', 'Raghav', 'player_2'),
        ('SCH-C2-03', 'Raghav', 'player_1'),
        ('SCH-C2-03', 'Heet Jain', 'player_2'),
        ('SCH-C2-04', 'Adityaraj Dhoot', 'player_1'),
        ('SCH-C2-04', 'Vatsal Nagodra', 'player_2'),
        ('SCH-C2-05', 'Raghav', 'player_1'),
        ('SCH-C2-05', 'Ram Agrawal', 'player_2'),
        ('SCH-C2-06', 'Priyam Jain', 'player_1'),
        ('SCH-C2-06', 'Vatsal Nagodra', 'player_2'),
        ('SCH-C2-07', 'Shresth Toshniwal', 'player_1'),
        ('SCH-C2-07', 'Heet Jain', 'player_2'),
        ('SCH-C2-08', 'Vaibhav', 'player_1'),
        ('SCH-C2-08', 'Vatsal Nagodra', 'player_2'),
        ('SCH-C2-09', 'Shresth Toshniwal', 'player_1'),
        ('SCH-C2-09', 'Ram Agrawal', 'player_2'),
        ('SCH-C2-10', 'Priyam Jain', 'player_1'),
        ('SCH-C2-10', 'Adityaraj Dhoot', 'player_2'),
        ('SCH-C2-11', 'Priyam Jain', 'player_1'),
        ('SCH-C2-11', 'Vaibhav', 'player_2'),
        ('SCH-C2-12', 'Adityaraj Dhoot', 'player_1'),
        ('SCH-C2-12', 'Vaibhav', 'player_2')
) AS x(match_number, player_name, team) USING (match_number);

COMMIT;

-- -----------------------------------------------------------------------------
-- In CTE p, replace:
--   REPLACE_ME_TOURNAMENT_ID   → tournament UUID (keep ::uuid)
--   REPLACE_ME_SPORT           → table-tennis | pickleball | badminton | …
--   REPLACE_ME_FIRST_SLOT_830  → inside the quotes only, e.g. 2026-04-11 08:30:00+05:30
--   created_by                 → NULL or 'your-auth-user-uuid'::uuid
-- -----------------------------------------------------------------------------
