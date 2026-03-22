-- Assign 15-minute match_date slots per court (Supabase / PostgreSQL).
--
-- COURT-WISE (yes): ROW_NUMBER() is PARTITION BY court, so each court has its own timeline.
--   • Court 1: first match = 6:00 PM, then +15 min, +15 min, … on THAT court only.
--   • Court 2: also starts its first match at 6:00 PM the same day (parallel with Court 1).
--   • Court 3: same idea — every court’s “match 1” is 6 PM anchor day, then 15 min steps on that court.
--
-- AFTER MIDNIGHT (12 AM): The daily window is 6 PM → midnight (last start 11:45 PM for 15-min slots).
--   Match #25 on a court (if you have that many on one court) is NOT 12:05 AM — it jumps to the
--   NEXT calendar day at 6:00 PM again (same as anchor clock), then +15 min, …
--
-- Other rules (same as app "Assign times to matches"):
--   • court_number: digits only; empty / invalid → treated as court 1.
--   • Order within each court: match_number (first number in label), then id.
--
-- Replace:
--   YOUR_TOURNAMENT_ID   → uuid from tournaments / URL
--   anchor_tz            → first 6 PM in YOUR offset (example: India IST +05:30)
--
-- session_span_mins = (24 - 18) * 60 → 24 slots of 15 min per court per evening (6 PM → midnight).

WITH params AS (
  SELECT
    'YOUR_TOURNAMENT_ID'::uuid AS tournament_id,
    '2026-04-11 18:00:00+05:30'::timestamptz AS anchor_tz,
    15::int AS slot_mins,
    (24 - 18) * 60 AS session_span_mins -- 6 PM → midnight local as stored in anchor
),
ranked AS (
  SELECT
    m.id,
    COALESCE(
      NULLIF(regexp_replace(COALESCE(m.court_number, ''), '\D', '', 'g'), ''),
      '1'
    )::int AS court_num,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(
        NULLIF(regexp_replace(COALESCE(m.court_number, ''), '\D', '', 'g'), ''),
        '1'
      )::int
      ORDER BY
        (substring(COALESCE(m.match_number, '') FROM '\d+'))::bigint NULLS LAST,
        m.match_number NULLS LAST,
        m.id
    ) - 1 AS slot_idx
  FROM matches m
  CROSS JOIN params p
  WHERE m.tournament_id = p.tournament_id
    AND m.match_type = 'tournament'
),
calc AS (
  SELECT
    r.id,
    (
      p.anchor_tz
      + make_interval(
          days => (r.slot_idx / ((p.session_span_mins / p.slot_mins)))::int
        )
      + make_interval(
          mins => (r.slot_idx % ((p.session_span_mins / p.slot_mins))) * p.slot_mins
        )
    ) AS match_date
  FROM ranked r
  CROSS JOIN params p
)
UPDATE matches m
SET match_date = c.match_date
FROM calc c
WHERE m.id = c.id;

-- Verify (optional):
-- SELECT id, court_number, match_number, match_date
-- FROM matches
-- WHERE tournament_id = 'YOUR_TOURNAMENT_ID'
-- ORDER BY court_number, match_date;
