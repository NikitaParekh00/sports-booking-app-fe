-- =============================================================================
-- Diagnose why replace_mens_doubles_schedule_from_screenshots_template.sql inserts 0 rows.
-- Run this in Supabase SQL editor (safe: SELECTs only). Tournament: 00f09cd7-30ce-451f-afc9-b1b3878a5bbb
-- Regenerate: python3 scripts/generate_mens_doubles_schedule_sql.py
-- =============================================================================

-- 0) First row only: NULL = that join failed (same rules as import)
WITH p AS (
  SELECT '00f09cd7-30ce-451f-afc9-b1b3878a5bbb'::uuid AS tournament_id
),
team_code_map(letter, team_name) AS (
  VALUES
    ('A', 'Power Drive'),
    ('B', 'Net Force'),
    ('C', 'Smash Unit'),
    ('D', 'Shot Makers'),
    ('E', 'Rally Crew'),
    ('F', 'Ace Strike')
),
v AS (
  SELECT * FROM (VALUES
    ('DD-001', '1', '2026-04-11', '18:00', 'B', 'C', 'Mayur Lad', 'Advanced', 'Daivik Mehta', 'Advanced', 'Nihar Kachhy', 'Advanced', 'JK', 'Advanced')
  ) AS t(match_no, court, d, t, tla, tlb, a1n, a1c, a2n, a2c, b1n, b1c, b2n, b2c)
)
SELECT
  v.match_no,
  ta.id AS team_a_id,
  tb.id AS team_b_id,
  pa1.id AS side_a_p1_id,
  pa2.id AS side_a_p2_id,
  pb1.id AS side_b_p1_id,
  pb2.id AS side_b_p2_id
FROM p
CROSS JOIN v
LEFT JOIN LATERAL (
  SELECT t.id
  FROM team_code_map m
  INNER JOIN public.tournament_teams t
    ON t.tournament_id = p.tournament_id
   AND upper(m.letter) = upper(v.tla)
   AND (
                upper(btrim(t.short_name)) = upper(v.tla)
                OR lower(btrim(t.name)) = lower('Team ' || v.tla)
                OR upper(
                  regexp_replace(btrim(COALESCE(t.short_name, '')), '^[[:space:]]*TEAM[[:space:]]*', '', 'i')
                ) = upper(v.tla)
                OR lower(btrim(t.name)) = lower(m.team_name)
                OR lower(regexp_replace(btrim(t.name), '^team[[:space:]]+[0-9]+\.[[:space:]]*', '', 'i')) = lower(m.team_name)
                OR lower(regexp_replace(btrim(t.name), '^[0-9]+\.[[:space:]]*', '', '')) = lower(m.team_name)
              )
  LIMIT 1
) ta ON true
LEFT JOIN LATERAL (
  SELECT t.id
  FROM team_code_map m
  INNER JOIN public.tournament_teams t
    ON t.tournament_id = p.tournament_id
   AND upper(m.letter) = upper(v.tlb)
   AND (
                upper(btrim(t.short_name)) = upper(v.tlb)
                OR lower(btrim(t.name)) = lower('Team ' || v.tlb)
                OR upper(
                  regexp_replace(btrim(COALESCE(t.short_name, '')), '^[[:space:]]*TEAM[[:space:]]*', '', 'i')
                ) = upper(v.tlb)
                OR lower(btrim(t.name)) = lower(m.team_name)
                OR lower(regexp_replace(btrim(t.name), '^team[[:space:]]+[0-9]+\.[[:space:]]*', '', 'i')) = lower(m.team_name)
                OR lower(regexp_replace(btrim(t.name), '^[0-9]+\.[[:space:]]*', '', '')) = lower(m.team_name)
              )
  LIMIT 1
) tb ON true
LEFT JOIN LATERAL (
  SELECT x.id FROM public.tournament_participants x
  WHERE x.tournament_id = p.tournament_id AND lower(regexp_replace(btrim(x.player_name), '[[:space:]]+', ' ', 'g')) = lower(regexp_replace(btrim(v.a1n), '[[:space:]]+', ' ', 'g'))
  LIMIT 1
) pa1 ON true
LEFT JOIN LATERAL (
  SELECT x.id FROM public.tournament_participants x
  WHERE x.tournament_id = p.tournament_id AND lower(regexp_replace(btrim(x.player_name), '[[:space:]]+', ' ', 'g')) = lower(regexp_replace(btrim(v.a2n), '[[:space:]]+', ' ', 'g'))
  LIMIT 1
) pa2 ON true
LEFT JOIN LATERAL (
  SELECT x.id FROM public.tournament_participants x
  WHERE x.tournament_id = p.tournament_id AND lower(regexp_replace(btrim(x.player_name), '[[:space:]]+', ' ', 'g')) = lower(regexp_replace(btrim(v.b1n), '[[:space:]]+', ' ', 'g'))
  LIMIT 1
) pb1 ON true
LEFT JOIN LATERAL (
  SELECT x.id FROM public.tournament_participants x
  WHERE x.tournament_id = p.tournament_id AND lower(regexp_replace(btrim(x.player_name), '[[:space:]]+', ' ', 'g')) = lower(regexp_replace(btrim(v.b2n), '[[:space:]]+', ' ', 'g'))
  LIMIT 1
) pb2 ON true;

-- 1) Letter teams A–F: each row must be TRUE (same rules as the import script)
WITH team_code_map(letter, team_name) AS (
  VALUES
    ('A', 'Power Drive'),
    ('B', 'Net Force'),
    ('C', 'Smash Unit'),
    ('D', 'Shot Makers'),
    ('E', 'Rally Crew'),
    ('F', 'Ace Strike')
),
letters(letter text) AS (
  VALUES ('A'), ('B'), ('C'), ('D'), ('E'), ('F')
)
SELECT
  l.letter AS need_letter,
  m.team_name AS script_maps_to_name,
  EXISTS (
    SELECT 1
    FROM team_code_map mm
    INNER JOIN public.tournament_teams t
      ON t.tournament_id = '00f09cd7-30ce-451f-afc9-b1b3878a5bbb'::uuid
     AND upper(mm.letter) = upper(l.letter)
     AND (
                upper(btrim(t.short_name)) = upper(l.letter)
                OR lower(btrim(t.name)) = lower('Team ' || l.letter)
                OR upper(
                  regexp_replace(btrim(COALESCE(t.short_name, '')), '^[[:space:]]*TEAM[[:space:]]*', '', 'i')
                ) = upper(l.letter)
                OR lower(btrim(t.name)) = lower(mm.team_name)
                OR lower(regexp_replace(btrim(t.name), '^team[[:space:]]+[0-9]+\.[[:space:]]*', '', 'i')) = lower(mm.team_name)
                OR lower(regexp_replace(btrim(t.name), '^[0-9]+\.[[:space:]]*', '', '')) = lower(mm.team_name)
              )
  ) AS found_in_db
FROM letters l
JOIN team_code_map m ON upper(m.letter) = upper(l.letter)
ORDER BY 1;

-- 2) What teams the DB actually has (compare short_name / name to above)
SELECT short_name, name
FROM public.tournament_teams
WHERE tournament_id = '00f09cd7-30ce-451f-afc9-b1b3878a5bbb'::uuid
ORDER BY short_name NULLS LAST, name;

-- 3) Script player names with no matching participant (empty result = all names OK)
WITH needed(name text) AS (
VALUES
  ('Akshay L Solanki'),
  ('Akshay Naidu'),
  ('Ankur Jain'),
  ('Apurva Mehta'),
  ('Arvind'),
  ('Aryan Mehta'),
  ('Ashok Nayak'),
  ('Chetan R'),
  ('Daivik Mehta'),
  ('Hardik Parekh'),
  ('Jeeth Ashar'),
  ('Jigar'),
  ('Jignesh'),
  ('JK'),
  ('Karan Shah'),
  ('Krishna Ravariya'),
  ('Kushal Darbari'),
  ('Mayank Padhariya'),
  ('Mayur Lad'),
  ('Meet Bare'),
  ('Mounish Ambaiya'),
  ('Naitik'),
  ('Nihar Kachhy'),
  ('Om Chatbar'),
  ('Pallash Desai'),
  ('Parth Gandhi'),
  ('Pranav Ved'),
  ('Rishi Doshi'),
  ('Ritesh R Raul'),
  ('Rohan'),
  ('Rudra'),
  ('Vijay G'),
  ('Vikrant Kachhy'),
  ('Viral Desai'),
  ('Viral Desai 501'),
  ('Vivek')
)
SELECT n.name AS missing_script_name
FROM needed n
LEFT JOIN public.tournament_participants p
  ON p.tournament_id = '00f09cd7-30ce-451f-afc9-b1b3878a5bbb'::uuid
 AND lower(regexp_replace(btrim(p.player_name), '[[:space:]]+', ' ', 'g'))
   = lower(regexp_replace(btrim(n.name), '[[:space:]]+', ' ', 'g'))
WHERE p.id IS NULL
ORDER BY 1;
