-- =============================================================================
-- Men's doubles schedule from screenshots / PDF (108 DD matches).
-- Replaces ALL matches for one tournament with these rows (times in Asia/Kolkata).
--
-- Tournament: 00f09cd7-30ce-451f-afc9-b1b3878a5bbb
-- created_by: 2bb35937-b0a1-47cf-8f74-8d8d20c51412
-- sport: badminton
--
-- To change targets, edit DEFAULT_* in scripts/generate_mens_doubles_schedule_sql.py
-- then: python3 scripts/generate_mens_doubles_schedule_sql.py
--
-- If insert returns 0 rows, run: db/diagnose_mens_doubles_schedule_from_screenshots_template.sql
-- Teams: letters A–F map to names in TEAM_LETTER_TO_DISPLAY_NAME (Power Drive, Net Force, …);
--   also matches short_name, Team A, "Team 1. Power Drive", "1. Power Drive", etc.
-- Participants: names must match (trim / collapse spaces / lower).
-- =============================================================================

BEGIN;

WITH p AS (
  SELECT
    '00f09cd7-30ce-451f-afc9-b1b3878a5bbb'::uuid AS tournament_id,
    'badminton'::varchar AS sport,
    '2bb35937-b0a1-47cf-8f74-8d8d20c51412'::uuid AS created_by
)
DELETE FROM public.matches m
USING p
WHERE m.tournament_id = p.tournament_id;
WITH p AS (
  SELECT
    '00f09cd7-30ce-451f-afc9-b1b3878a5bbb'::uuid AS tournament_id,
    'badminton'::varchar AS sport,
    '2bb35937-b0a1-47cf-8f74-8d8d20c51412'::uuid AS created_by
),
team_code_map(letter, team_name) AS (
  VALUES
    ('A', 'Power Drive'),
    ('B', 'Net Force'),
    ('C', 'Smash Unit'),
    ('D', 'Shot Makers'),
    ('E', 'Rally Crew'),
    ('F', 'Ace Strike')
)
INSERT INTO public.matches (
  id, tournament_id, sport, match_type, status,
  match_number, match_date, court_number, notes, team_a_id, team_b_id, created_by, winner_team_id
)
SELECT
  gen_random_uuid(),
  p.tournament_id,
  p.sport,
  'tournament',
  'upcoming',
  v.match_no,
  ((v.d::date + v.t::time) AT TIME ZONE 'Asia/Kolkata'),
  v.court,
  '__JSON__' || jsonb_build_object(
    'type', 'doubles_line',
    'categoryKey', '_',
    'teamAId', ta.id::text,
    'teamBId', tb.id::text,
    'sideA', jsonb_build_array(
      jsonb_build_object('id', pa1.id::text, 'name', v.a1n, 'category', v.a1c),
      jsonb_build_object('id', pa2.id::text, 'name', v.a2n, 'category', v.a2c)
    ),
    'sideB', jsonb_build_array(
      jsonb_build_object('id', pb1.id::text, 'name', v.b1n, 'category', v.b1c),
      jsonb_build_object('id', pb2.id::text, 'name', v.b2n, 'category', v.b2c)
    )
  )::text,
  ta.id,
  tb.id,
  p.created_by,
  NULL::uuid
FROM p
CROSS JOIN (VALUES
    ('DD-001', '1', '2026-04-11', '18:00', 'B', 'C', 'Mayur Lad', 'Advanced', 'Daivik Mehta', 'Advanced', 'Nihar Kachhy', 'Advanced', 'JK', 'Advanced'),
    ('DD-004', '1', '2026-04-11', '18:15', 'B', 'E', 'Mayur Lad', 'Advanced', 'Daivik Mehta', 'Advanced', 'Kushal Darbari', 'Advanced', 'Ankur Jain', 'Advanced'),
    ('DD-013', '1', '2026-04-11', '18:30', 'D', 'F', 'Vikrant Kachhy', 'Advanced', 'Karan Shah', 'Advanced', 'Meet Bare', 'Advanced', 'Chetan R', 'Advanced'),
    ('DD-011', '2', '2026-04-11', '18:00', 'A', 'F', 'Aryan Mehta', 'Advanced', 'Apurva Mehta', 'Advanced', 'Meet Bare', 'Advanced', 'Chetan R', 'Advanced'),
    ('DD-002', '2', '2026-04-11', '18:15', 'A', 'C', 'Aryan Mehta', 'Advanced', 'Apurva Mehta', 'Advanced', 'Nihar Kachhy', 'Advanced', 'JK', 'Advanced'),
    ('DD-020', '2', '2026-04-11', '18:30', 'A', 'E', 'Rudra', 'Intermediate', 'Akshay Naidu', 'Intermediate', 'Viral Desai 501', 'Intermediate', 'Jeeth Ashar', 'Intermediate'),
    ('DD-003', '3', '2026-04-11', '18:00', 'D', 'E', 'Vikrant Kachhy', 'Advanced', 'Karan Shah', 'Advanced', 'Kushal Darbari', 'Advanced', 'Ankur Jain', 'Advanced'),
    ('DD-018', '3', '2026-04-11', '18:15', 'B', 'C', 'Mayank Padhariya', 'Intermediate', 'Hardik Parekh', 'Emerging', 'Pranav Ved', 'Intermediate', 'Mounish Ambaiya', 'Emerging'),
    ('DD-027', '3', '2026-04-11', '18:30', 'A', 'F', 'Parth Gandhi', 'Emerging', 'Naitik', 'Emerging', 'Om Chatbar', 'Emerging', 'Arvind', 'Emerging'),
    ('DD-007', '1', '2026-04-11', '18:45', 'E', 'F', 'Kushal Darbari', 'Advanced', 'Ankur Jain', 'Advanced', 'Meet Bare', 'Advanced', 'Chetan R', 'Advanced'),
    ('DD-019', '1', '2026-04-11', '19:00', 'C', 'D', 'Ritesh R Raul', 'Emerging', 'Rishi Doshi', 'Intermediate', 'Pallash Desai', 'Intermediate', 'Jignesh', 'Emerging'),
    ('DD-010', '1', '2026-04-11', '19:15', 'A', 'D', 'Aryan Mehta', 'Advanced', 'Apurva Mehta', 'Advanced', 'Vikrant Kachhy', 'Advanced', 'Karan Shah', 'Advanced'),
    ('DD-005', '2', '2026-04-11', '18:45', 'B', 'D', 'Mayur Lad', 'Advanced', 'Daivik Mehta', 'Advanced', 'Vikrant Kachhy', 'Advanced', 'Karan Shah', 'Advanced'),
    ('DD-014', '2', '2026-04-11', '19:00', 'C', 'E', 'Nihar Kachhy', 'Advanced', 'JK', 'Advanced', 'Kushal Darbari', 'Advanced', 'Ankur Jain', 'Advanced'),
    ('DD-008', '2', '2026-04-11', '19:15', 'C', 'F', 'Nihar Kachhy', 'Advanced', 'JK', 'Advanced', 'Meet Bare', 'Advanced', 'Chetan R', 'Advanced'),
    ('DD-021', '3', '2026-04-11', '18:45', 'A', 'C', 'Parth Gandhi', 'Emerging', 'Akshay Naidu', 'Intermediate', 'Mounish Ambaiya', 'Emerging', 'Rishi Doshi', 'Intermediate'),
    ('DD-006', '3', '2026-04-11', '19:00', 'A', 'B', 'Aryan Mehta', 'Advanced', 'Apurva Mehta', 'Advanced', 'Mayur Lad', 'Advanced', 'Daivik Mehta', 'Advanced'),
    ('DD-030', '3', '2026-04-11', '19:15', 'B', 'C', 'Vivek', 'Emerging', 'Hardik Parekh', 'Emerging', 'Ritesh R Raul', 'Emerging', 'Mounish Ambaiya', 'Emerging'),
    ('DD-022', '1', '2026-04-11', '19:30', 'D', 'E', 'Viral Desai', 'Emerging', 'Vijay G', 'Intermediate', 'Viral Desai 501', 'Intermediate', 'Rohan', 'Emerging'),
    ('DD-016', '1', '2026-04-11', '19:45', 'B', 'D', 'Akshay L Solanki', 'Intermediate', 'Daivik Mehta', 'Advanced', 'Pallash Desai', 'Intermediate', 'Karan Shah', 'Advanced'),
    ('DD-025', '1', '2026-04-11', '20:00', 'A', 'F', 'Aryan Mehta', 'Advanced', 'Akshay Naidu', 'Intermediate', 'Jigar', 'Intermediate', 'Chetan R', 'Advanced'),
    ('DD-023', '2', '2026-04-11', '19:30', 'A', 'B', 'Akshay Naidu', 'Intermediate', 'Naitik', 'Emerging', 'Hardik Parekh', 'Emerging', 'Akshay L Solanki', 'Intermediate'),
    ('DD-047', '2', '2026-04-11', '19:45', 'E', 'F', 'Viral Desai 501', 'Intermediate', 'Ashok Nayak', 'Emerging', 'Om Chatbar', 'Emerging', 'Jigar', 'Intermediate'),
    ('DD-056', '2', '2026-04-11', '20:00', 'D', 'E', 'Viral Desai', 'Emerging', 'Jignesh', 'Emerging', 'Ashok Nayak', 'Emerging', 'Rohan', 'Emerging'),
    ('DD-015', '3', '2026-04-11', '19:30', 'B', 'F', 'Mayur Lad', 'Advanced', 'Daivik Mehta', 'Advanced', 'Meet Bare', 'Advanced', 'Chetan R', 'Advanced'),
    ('DD-009', '3', '2026-04-11', '19:45', 'A', 'E', 'Aryan Mehta', 'Advanced', 'Apurva Mehta', 'Advanced', 'Kushal Darbari', 'Advanced', 'Ankur Jain', 'Advanced'),
    ('DD-012', '3', '2026-04-11', '20:00', 'C', 'D', 'Nihar Kachhy', 'Advanced', 'JK', 'Advanced', 'Vikrant Kachhy', 'Advanced', 'Karan Shah', 'Advanced'),
    ('DD-028', '1', '2026-04-11', '20:15', 'A', 'F', 'Apurva Mehta', 'Advanced', 'Rudra', 'Intermediate', 'Krishna Ravariya', 'Intermediate', 'Chetan R', 'Advanced'),
    ('DD-043', '1', '2026-04-11', '20:30', 'A', 'F', 'Rudra', 'Intermediate', 'Naitik', 'Emerging', 'Om Chatbar', 'Emerging', 'Krishna Ravariya', 'Intermediate'),
    ('DD-052', '1', '2026-04-11', '20:45', 'D', 'F', 'Vijay G', 'Intermediate', 'Jignesh', 'Emerging', 'Jigar', 'Intermediate', 'Arvind', 'Emerging'),
    ('DD-017', '2', '2026-04-11', '20:15', 'C', 'E', 'Nihar Kachhy', 'Advanced', 'Pranav Ved', 'Intermediate', 'Ankur Jain', 'Advanced', 'Viral Desai 501', 'Intermediate'),
    ('DD-026', '2', '2026-04-11', '20:30', 'A', 'B', 'Aryan Mehta', 'Advanced', 'Parth Gandhi', 'Emerging', 'Vivek', 'Emerging', 'Mayur Lad', 'Advanced'),
    ('DD-029', '2', '2026-04-11', '20:45', 'D', 'F', 'Viral Desai', 'Emerging', 'Karan Shah', 'Advanced', 'Meet Bare', 'Advanced', 'Om Chatbar', 'Emerging'),
    ('DD-066', '3', '2026-04-11', '20:15', 'A', 'B', 'Akshay Naidu', 'Intermediate', 'Naitik', 'Emerging', 'Vivek', 'Emerging', 'Akshay L Solanki', 'Intermediate'),
    ('DD-024', '3', '2026-04-11', '20:30', 'B', 'E', 'Hardik Parekh', 'Emerging', 'Daivik Mehta', 'Advanced', 'Kushal Darbari', 'Advanced', 'Ashok Nayak', 'Emerging'),
    ('DD-042', '3', '2026-04-11', '20:45', 'C', 'E', 'Nihar Kachhy', 'Advanced', 'Rishi Doshi', 'Intermediate', 'Kushal Darbari', 'Advanced', 'Jeeth Ashar', 'Intermediate'),
    ('DD-031', '1', '2026-04-11', '21:00', 'B', 'E', 'Mayank Padhariya', 'Intermediate', 'Vivek', 'Emerging', 'Jeeth Ashar', 'Intermediate', 'Ashok Nayak', 'Emerging'),
    ('DD-034', '1', '2026-04-11', '21:15', 'B', 'F', 'Vivek', 'Emerging', 'Daivik Mehta', 'Advanced', 'Meet Bare', 'Advanced', 'Arvind', 'Emerging'),
    ('DD-037', '1', '2026-04-11', '21:30', 'A', 'D', 'Apurva Mehta', 'Advanced', 'Akshay Naidu', 'Intermediate', 'Vijay G', 'Intermediate', 'Karan Shah', 'Advanced'),
    ('DD-038', '2', '2026-04-11', '21:00', 'C', 'D', 'Pranav Ved', 'Intermediate', 'JK', 'Advanced', 'Vikrant Kachhy', 'Advanced', 'Pallash Desai', 'Intermediate'),
    ('DD-035', '2', '2026-04-11', '21:15', 'C', 'E', 'Mounish Ambaiya', 'Emerging', 'JK', 'Advanced', 'Kushal Darbari', 'Advanced', 'Rohan', 'Emerging'),
    ('DD-032', '2', '2026-04-11', '21:30', 'E', 'F', 'Ankur Jain', 'Advanced', 'Jeeth Ashar', 'Intermediate', 'Meet Bare', 'Advanced', 'Jigar', 'Intermediate'),
    ('DD-033', '3', '2026-04-11', '21:00', 'A', 'D', 'Apurva Mehta', 'Advanced', 'Parth Gandhi', 'Emerging', 'Jignesh', 'Emerging', 'Karan Shah', 'Advanced'),
    ('DD-039', '3', '2026-04-11', '21:15', 'A', 'D', 'Aryan Mehta', 'Advanced', 'Naitik', 'Emerging', 'Vikrant Kachhy', 'Advanced', 'Viral Desai', 'Emerging'),
    ('DD-045', '3', '2026-04-11', '21:30', 'B', 'C', 'Mayur Lad', 'Advanced', 'Hardik Parekh', 'Emerging', 'Nihar Kachhy', 'Advanced', 'Ritesh R Raul', 'Emerging'),
    ('DD-040', '1', '2026-04-11', '21:45', 'A', 'B', 'Rudra', 'Intermediate', 'Parth Gandhi', 'Emerging', 'Vivek', 'Emerging', 'Akshay L Solanki', 'Intermediate'),
    ('DD-049', '1', '2026-04-11', '22:00', 'A', 'B', 'Aryan Mehta', 'Advanced', 'Rudra', 'Intermediate', 'Mayank Padhariya', 'Intermediate', 'Daivik Mehta', 'Advanced'),
    ('DD-046', '1', '2026-04-11', '22:15', 'C', 'E', 'Ritesh R Raul', 'Emerging', 'Pranav Ved', 'Intermediate', 'Jeeth Ashar', 'Intermediate', 'Rohan', 'Emerging'),
    ('DD-044', '2', '2026-04-11', '21:45', 'A', 'D', 'Apurva Mehta', 'Advanced', 'Naitik', 'Emerging', 'Vikrant Kachhy', 'Advanced', 'Jignesh', 'Emerging'),
    ('DD-053', '2', '2026-04-11', '22:00', 'E', 'F', 'Ankur Jain', 'Advanced', 'Rohan', 'Emerging', 'Om Chatbar', 'Emerging', 'Chetan R', 'Advanced'),
    ('DD-050', '2', '2026-04-11', '22:15', 'B', 'C', 'Mayank Padhariya', 'Intermediate', 'Mayur Lad', 'Advanced', 'JK', 'Advanced', 'Rishi Doshi', 'Intermediate'),
    ('DD-048', '3', '2026-04-11', '21:45', 'C', 'F', 'Ritesh R Raul', 'Emerging', 'JK', 'Advanced', 'Arvind', 'Emerging', 'Chetan R', 'Advanced'),
    ('DD-036', '3', '2026-04-11', '22:00', 'B', 'F', 'Mayur Lad', 'Advanced', 'Akshay L Solanki', 'Intermediate', 'Meet Bare', 'Advanced', 'Krishna Ravariya', 'Intermediate'),
    ('DD-051', '3', '2026-04-11', '22:15', 'C', 'E', 'Nihar Kachhy', 'Advanced', 'Mounish Ambaiya', 'Emerging', 'Ankur Jain', 'Advanced', 'Ashok Nayak', 'Emerging'),
    ('DD-055', '1', '2026-04-11', '22:30', 'D', 'E', 'Vikrant Kachhy', 'Advanced', 'Vijay G', 'Intermediate', 'Kushal Darbari', 'Advanced', 'Viral Desai 501', 'Intermediate'),
    ('DD-106', '1', '2026-04-11', '22:45', 'A', 'B', 'Parth Gandhi', 'Emerging', 'Naitik', 'Emerging', 'Vivek', 'Emerging', 'Hardik Parekh', 'Emerging'),
    ('DD-058', '1', '2026-04-11', '23:15', 'D', 'F', 'Vijay G', 'Intermediate', 'Jignesh', 'Emerging', 'Om Chatbar', 'Emerging', 'Krishna Ravariya', 'Intermediate'),
    ('DD-062', '2', '2026-04-11', '22:30', 'A', 'E', 'Akshay Naidu', 'Intermediate', 'Naitik', 'Emerging', 'Jeeth Ashar', 'Intermediate', 'Ashok Nayak', 'Emerging'),
    ('DD-041', '2', '2026-04-11', '22:45', 'B', 'D', 'Mayank Padhariya', 'Intermediate', 'Akshay L Solanki', 'Intermediate', 'Pallash Desai', 'Intermediate', 'Vijay G', 'Intermediate'),
    ('DD-059', '2', '2026-04-11', '23:00', 'C', 'E', 'Ritesh R Raul', 'Emerging', 'Rishi Doshi', 'Intermediate', 'Viral Desai 501', 'Intermediate', 'Ashok Nayak', 'Emerging'),
    ('DD-054', '3', '2026-04-11', '22:30', 'D', 'F', 'Pallash Desai', 'Intermediate', 'Viral Desai', 'Emerging', 'Krishna Ravariya', 'Intermediate', 'Arvind', 'Emerging'),
    ('DD-057', '3', '2026-04-11', '22:45', 'C', 'F', 'Pranav Ved', 'Intermediate', 'Rishi Doshi', 'Intermediate', 'Jigar', 'Intermediate', 'Krishna Ravariya', 'Intermediate'),
    ('DD-072', '3', '2026-04-11', '23:00', 'B', 'F', 'Vivek', 'Emerging', 'Hardik Parekh', 'Emerging', 'Om Chatbar', 'Emerging', 'Arvind', 'Emerging'),
    ('DD-064', '1', '2026-04-11', '23:30', 'C', 'E', 'Ritesh R Raul', 'Emerging', 'Pranav Ved', 'Intermediate', 'Viral Desai 501', 'Intermediate', 'Rohan', 'Emerging'),
    ('DD-073', '1', '2026-04-11', '23:45', 'C', 'D', 'Ritesh R Raul', 'Emerging', 'Rishi Doshi', 'Intermediate', 'Viral Desai', 'Emerging', 'Vijay G', 'Intermediate'),
    ('DD-061', '1', '2026-04-12', '18:00', 'D', 'F', 'Pallash Desai', 'Intermediate', 'Karan Shah', 'Advanced', 'Meet Bare', 'Advanced', 'Jigar', 'Intermediate'),
    ('DD-065', '2', '2026-04-11', '23:15', 'D', 'F', 'Pallash Desai', 'Intermediate', 'Viral Desai', 'Emerging', 'Jigar', 'Intermediate', 'Arvind', 'Emerging'),
    ('DD-080', '2', '2026-04-11', '23:30', 'A', 'E', 'Parth Gandhi', 'Emerging', 'Akshay Naidu', 'Intermediate', 'Jeeth Ashar', 'Intermediate', 'Ashok Nayak', 'Emerging'),
    ('DD-068', '2', '2026-04-11', '23:45', 'B', 'F', 'Mayank Padhariya', 'Intermediate', 'Hardik Parekh', 'Emerging', 'Om Chatbar', 'Emerging', 'Krishna Ravariya', 'Intermediate'),
    ('DD-096', '3', '2026-04-11', '23:15', 'A', 'B', 'Rudra', 'Intermediate', 'Akshay Naidu', 'Intermediate', 'Mayank Padhariya', 'Intermediate', 'Akshay L Solanki', 'Intermediate'),
    ('DD-060', '3', '2026-04-12', '18:00', 'A', 'B', 'Apurva Mehta', 'Advanced', 'Parth Gandhi', 'Emerging', 'Hardik Parekh', 'Emerging', 'Daivik Mehta', 'Advanced'),
    ('DD-063', '3', '2026-04-12', '18:15', 'D', 'E', 'Vikrant Kachhy', 'Advanced', 'Jignesh', 'Emerging', 'Ankur Jain', 'Advanced', 'Rohan', 'Emerging'),
    ('DD-070', '1', '2026-04-12', '18:15', 'A', 'E', 'Parth Gandhi', 'Emerging', 'Akshay Naidu', 'Intermediate', 'Viral Desai 501', 'Intermediate', 'Ashok Nayak', 'Emerging'),
    ('DD-067', '1', '2026-04-12', '18:30', 'C', 'D', 'Nihar Kachhy', 'Advanced', 'Mounish Ambaiya', 'Emerging', 'Vikrant Kachhy', 'Advanced', 'Jignesh', 'Emerging'),
    ('DD-076', '1', '2026-04-12', '18:45', 'E', 'F', 'Jeeth Ashar', 'Intermediate', 'Rohan', 'Emerging', 'Jigar', 'Intermediate', 'Arvind', 'Emerging'),
    ('DD-077', '2', '2026-04-12', '18:00', 'B', 'C', 'Mayank Padhariya', 'Intermediate', 'Vivek', 'Emerging', 'Ritesh R Raul', 'Emerging', 'Pranav Ved', 'Intermediate'),
    ('DD-074', '2', '2026-04-12', '18:15', 'B', 'F', 'Hardik Parekh', 'Emerging', 'Akshay L Solanki', 'Intermediate', 'Krishna Ravariya', 'Intermediate', 'Arvind', 'Emerging'),
    ('DD-083', '2', '2026-04-12', '18:30', 'B', 'D', 'Mayank Padhariya', 'Intermediate', 'Daivik Mehta', 'Advanced', 'Pallash Desai', 'Intermediate', 'Karan Shah', 'Advanced'),
    ('DD-069', '3', '2026-04-12', '18:30', 'A', 'C', 'Aryan Mehta', 'Advanced', 'Rudra', 'Intermediate', 'JK', 'Advanced', 'Rishi Doshi', 'Intermediate'),
    ('DD-075', '3', '2026-04-12', '18:45', 'B', 'C', 'Vivek', 'Emerging', 'Daivik Mehta', 'Advanced', 'Nihar Kachhy', 'Advanced', 'Mounish Ambaiya', 'Emerging'),
    ('DD-078', '3', '2026-04-12', '19:00', 'E', 'F', 'Jeeth Ashar', 'Intermediate', 'Rohan', 'Emerging', 'Om Chatbar', 'Emerging', 'Krishna Ravariya', 'Intermediate'),
    ('DD-088', '1', '2026-04-12', '19:00', 'A', 'D', 'Akshay Naidu', 'Intermediate', 'Naitik', 'Emerging', 'Pallash Desai', 'Intermediate', 'Viral Desai', 'Emerging'),
    ('DD-097', '1', '2026-04-12', '19:15', 'A', 'B', 'Parth Gandhi', 'Emerging', 'Akshay Naidu', 'Intermediate', 'Mayank Padhariya', 'Intermediate', 'Vivek', 'Emerging'),
    ('DD-079', '1', '2026-04-12', '19:30', 'C', 'E', 'Pranav Ved', 'Intermediate', 'Mounish Ambaiya', 'Emerging', 'Jeeth Ashar', 'Intermediate', 'Ashok Nayak', 'Emerging'),
    ('DD-071', '2', '2026-04-12', '18:45', 'A', 'E', 'Apurva Mehta', 'Advanced', 'Rudra', 'Intermediate', 'Kushal Darbari', 'Advanced', 'Viral Desai 501', 'Intermediate'),
    ('DD-089', '2', '2026-04-12', '19:15', 'C', 'F', 'JK', 'Advanced', 'Rishi Doshi', 'Intermediate', 'Krishna Ravariya', 'Intermediate', 'Chetan R', 'Advanced'),
    ('DD-086', '2', '2026-04-12', '19:30', 'C', 'D', 'Nihar Kachhy', 'Advanced', 'Ritesh R Raul', 'Emerging', 'Viral Desai', 'Emerging', 'Karan Shah', 'Advanced'),
    ('DD-081', '3', '2026-04-12', '19:15', 'C', 'D', 'Ritesh R Raul', 'Emerging', 'Pranav Ved', 'Intermediate', 'Vijay G', 'Intermediate', 'Jignesh', 'Emerging'),
    ('DD-087', '3', '2026-04-12', '19:30', 'A', 'E', 'Apurva Mehta', 'Advanced', 'Naitik', 'Emerging', 'Ankur Jain', 'Advanced', 'Rohan', 'Emerging'),
    ('DD-090', '3', '2026-04-12', '19:45', 'A', 'B', 'Aryan Mehta', 'Advanced', 'Rudra', 'Intermediate', 'Mayur Lad', 'Advanced', 'Akshay L Solanki', 'Intermediate'),
    ('DD-082', '1', '2026-04-12', '19:45', 'D', 'F', 'Pallash Desai', 'Intermediate', 'Vijay G', 'Intermediate', 'Jigar', 'Intermediate', 'Krishna Ravariya', 'Intermediate'),
    ('DD-091', '1', '2026-04-12', '20:00', 'B', 'D', 'Mayank Padhariya', 'Intermediate', 'Hardik Parekh', 'Emerging', 'Vijay G', 'Intermediate', 'Jignesh', 'Emerging'),
    ('DD-085', '1', '2026-04-12', '20:15', 'A', 'C', 'Rudra', 'Intermediate', 'Parth Gandhi', 'Emerging', 'Ritesh R Raul', 'Emerging', 'Pranav Ved', 'Intermediate'),
    ('DD-095', '2', '2026-04-12', '20:00', 'A', 'F', 'Aryan Mehta', 'Advanced', 'Naitik', 'Emerging', 'Meet Bare', 'Advanced', 'Arvind', 'Emerging'),
    ('DD-104', '2', '2026-04-12', '20:15', 'B', 'D', 'Mayank Padhariya', 'Intermediate', 'Vivek', 'Emerging', 'Pallash Desai', 'Intermediate', 'Jignesh', 'Emerging'),
    ('DD-098', '2', '2026-04-12', '20:30', 'D', 'F', 'Viral Desai', 'Emerging', 'Vijay G', 'Intermediate', 'Jigar', 'Intermediate', 'Arvind', 'Emerging'),
    ('DD-084', '3', '2026-04-12', '20:00', 'B', 'C', 'Mayur Lad', 'Advanced', 'Akshay L Solanki', 'Intermediate', 'Pranav Ved', 'Intermediate', 'JK', 'Advanced'),
    ('DD-099', '3', '2026-04-12', '20:15', 'C', 'E', 'Mounish Ambaiya', 'Emerging', 'Rishi Doshi', 'Intermediate', 'Viral Desai 501', 'Intermediate', 'Rohan', 'Emerging'),
    ('DD-093', '3', '2026-04-12', '20:30', 'B', 'E', 'Mayur Lad', 'Advanced', 'Akshay L Solanki', 'Intermediate', 'Kushal Darbari', 'Advanced', 'Viral Desai 501', 'Intermediate'),
    ('DD-094', '1', '2026-04-12', '20:30', 'A', 'F', 'Rudra', 'Intermediate', 'Parth Gandhi', 'Emerging', 'Om Chatbar', 'Emerging', 'Krishna Ravariya', 'Intermediate'),
    ('DD-100', '1', '2026-04-12', '21:00', 'C', 'E', 'Mounish Ambaiya', 'Emerging', 'Rishi Doshi', 'Intermediate', 'Jeeth Ashar', 'Intermediate', 'Rohan', 'Emerging'),
    ('DD-103', '1', '2026-04-12', '21:15', 'D', 'F', 'Vikrant Kachhy', 'Advanced', 'Viral Desai', 'Emerging', 'Om Chatbar', 'Emerging', 'Chetan R', 'Advanced'),
    ('DD-092', '2', '2026-04-12', '20:45', 'C', 'D', 'Pranav Ved', 'Intermediate', 'Mounish Ambaiya', 'Emerging', 'Pallash Desai', 'Intermediate', 'Viral Desai', 'Emerging'),
    ('DD-101', '2', '2026-04-12', '21:00', 'A', 'F', 'Rudra', 'Intermediate', 'Naitik', 'Emerging', 'Om Chatbar', 'Emerging', 'Jigar', 'Intermediate'),
    ('DD-107', '2', '2026-04-12', '21:30', 'C', 'D', 'Mounish Ambaiya', 'Emerging', 'Rishi Doshi', 'Intermediate', 'Vijay G', 'Intermediate', 'Jignesh', 'Emerging'),
    ('DD-102', '3', '2026-04-12', '20:45', 'B', 'E', 'Hardik Parekh', 'Emerging', 'Akshay L Solanki', 'Intermediate', 'Jeeth Ashar', 'Intermediate', 'Ashok Nayak', 'Emerging'),
    ('DD-105', '3', '2026-04-12', '21:00', 'E', 'F', 'Ankur Jain', 'Advanced', 'Ashok Nayak', 'Emerging', 'Meet Bare', 'Advanced', 'Arvind', 'Emerging'),
    ('DD-108', '3', '2026-04-12', '21:30', 'E', 'F', 'Kushal Darbari', 'Advanced', 'Viral Desai 501', 'Intermediate', 'Jigar', 'Intermediate', 'Chetan R', 'Advanced')
) AS v(match_no, court, d, t, tla, tlb, a1n, a1c, a2n, a2c, b1n, b1c, b2n, b2c)
JOIN LATERAL (
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
JOIN LATERAL (
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
JOIN LATERAL (
  SELECT x.id FROM public.tournament_participants x
  WHERE x.tournament_id = p.tournament_id AND lower(regexp_replace(btrim(x.player_name), '[[:space:]]+', ' ', 'g')) = lower(regexp_replace(btrim(v.a1n), '[[:space:]]+', ' ', 'g'))
  LIMIT 1
) pa1 ON true
JOIN LATERAL (
  SELECT x.id FROM public.tournament_participants x
  WHERE x.tournament_id = p.tournament_id AND lower(regexp_replace(btrim(x.player_name), '[[:space:]]+', ' ', 'g')) = lower(regexp_replace(btrim(v.a2n), '[[:space:]]+', ' ', 'g'))
  LIMIT 1
) pa2 ON true
JOIN LATERAL (
  SELECT x.id FROM public.tournament_participants x
  WHERE x.tournament_id = p.tournament_id AND lower(regexp_replace(btrim(x.player_name), '[[:space:]]+', ' ', 'g')) = lower(regexp_replace(btrim(v.b1n), '[[:space:]]+', ' ', 'g'))
  LIMIT 1
) pb1 ON true
JOIN LATERAL (
  SELECT x.id FROM public.tournament_participants x
  WHERE x.tournament_id = p.tournament_id AND lower(regexp_replace(btrim(x.player_name), '[[:space:]]+', ' ', 'g')) = lower(regexp_replace(btrim(v.b2n), '[[:space:]]+', ' ', 'g'))
  LIMIT 1
) pb2 ON true;

-- Fail the transaction unless exactly 108 rows were inserted (otherwise DELETE would commit and leave an empty schedule).
DO $$
DECLARE
  c int;
  tid uuid := '00f09cd7-30ce-451f-afc9-b1b3878a5bbb'::uuid;
BEGIN
  SELECT count(*)::int INTO c FROM public.matches WHERE tournament_id = tid;
  IF c IS DISTINCT FROM 108 THEN
    RAISE EXCEPTION 'replace_mens_doubles_schedule: expected 108 matches for tournament %, got %. Some LATERAL join found no tournament_team or tournament_participant. Run db/diagnose_mens_doubles_schedule_from_screenshots_template.sql (regenerate via python3 scripts/generate_mens_doubles_schedule_sql.py).', tid, c;
  END IF;
END $$;

-- Diagnostics (run separately if the block above fails):
-- SELECT short_name, name FROM public.tournament_teams WHERE tournament_id = '00f09cd7-30ce-451f-afc9-b1b3878a5bbb'::uuid ORDER BY short_name, name;
-- SELECT lower(trim(player_name)) FROM public.tournament_participants WHERE tournament_id = '00f09cd7-30ce-451f-afc9-b1b3878a5bbb'::uuid ORDER BY 1;

COMMIT;
