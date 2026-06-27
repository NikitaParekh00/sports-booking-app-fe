#!/usr/bin/env node
/**
 * Generate CSC Pickleball participant CSV + SQL from the tournament xlsx.
 *
 * Timing rules (from the sheet — not invented):
 *   Mens:    Phase hour blocks (9-10, 10-11, …), 6 matches × 10 min per court
 *   Females: 1:30 PM – 3:00 PM window, 10 matches × 9 min per court (3 & 4)
 *   Mixed:   2:30 PM / 3:00 PM start, 10 matches × 10 min per court
 *
 * Usage:
 *   node scripts/generate_csc_pickleball_schedule_sql.js [path-to-xlsx]
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const XLSX_PATH =
  process.argv[2] ||
  path.join(process.env.HOME || '', 'Downloads/CSC Pickle Ball Tournament Schedule.xlsx');
const OUT_DIR = path.join(__dirname, '..', 'db');

/** Tournament day shown in app (28/06/2026). */
const EVENT_DATE = '2026-06-28';
const TZ = 'Asia/Kolkata';

const SLOT_MINUTES = {
  'Mens Doubles': 10,
  'Females Doubles': 9,
  'Mixed Doubles': 10,
};

function normName(s) {
  return String(s || '').trim().replace(/\s+/g, ' ');
}
function splitPair(teamStr) {
  if (!teamStr || typeof teamStr !== 'string') return null;
  const parts = teamStr.split(/\s*\/\s*/).map((p) => normName(p)).filter(Boolean);
  return parts.length === 2 ? parts : null;
}
function parseCourt(raw) {
  const m = String(raw || '').trim().match(/(\d+)/);
  return m ? m[1] : '1';
}
function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}
function padTime(h, m) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}
function addMinutes(h, m, delta) {
  const total = h * 60 + m + delta;
  return { h: Math.floor(total / 60) % 24, m: total % 60 };
}

/** Mens sheet: Phase + Time column → block start. */
function mensBlockStart(timeStr) {
  const t = String(timeStr || '').trim();
  if (t.includes('9-10')) return { h: 9, m: 0, label: '9-10' };
  if (t.includes('10-11')) return { h: 10, m: 0, label: '10-11' };
  if (t.includes('11-12')) return { h: 11, m: 0, label: '11-12' };
  if (t.includes('12-1') || t.includes('12–1')) return { h: 12, m: 0, label: '12-1' };
  return { h: 9, m: 0, label: t };
}

/** Females / Mixed sheet: Time column → block start. */
function windowBlockStart(timeStr) {
  const t = String(timeStr || '').trim().toLowerCase();
  if (t.includes('1:30')) return { h: 13, m: 30, label: '1:30 PM – 3:00 PM' };
  if (t.includes('2:30')) return { h: 14, m: 30, label: '2:30 PM Onwards' };
  if (t.includes('3:00')) return { h: 15, m: 0, label: '3:00 PM Onwards' };
  return { h: 13, m: 30, label: String(timeStr || '').trim() };
}

function parseMatchNumber(raw) {
  const s = String(raw || '').trim();
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 1;
}

function eventPrefix(eventCat) {
  if (eventCat === 'Mens Doubles') return 'MD';
  if (eventCat === 'Females Doubles') return 'FD';
  return 'XD';
}

function parseWorkbook() {
  if (!fs.existsSync(XLSX_PATH)) {
    console.error(`Xlsx not found: ${XLSX_PATH}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(XLSX_PATH);
  const matches = [];
  const playerEvents = new Map();

  function addPlayers(names, eventCat, group) {
    const poolKey = `${eventCat} · Group ${group}`;
    for (const n of names) {
      const k = normName(n).toLowerCase();
      if (!playerEvents.has(k)) {
        playerEvents.set(k, { display: normName(n), events: new Set(), pools: new Set() });
      }
      const row = playerEvents.get(k);
      row.events.add(eventCat);
      row.pools.add(poolKey);
    }
  }

  for (const sheetName of wb.SheetNames) {
    const eventCat = sheetName.trim();
    const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
    const isMens = eventCat === 'Mens Doubles';
    const slotMin = SLOT_MINUTES[eventCat] ?? 10;

    for (const r of data) {
      let team1Raw, team2Raw, group, courtRaw, phase, timeRaw, matchRaw;

      if (isMens) {
        if (!String(r[5] || '').includes(' / ')) continue;
        phase = String(r[0] || '').trim();
        timeRaw = r[1];
        group = String(r[2] || '').trim();
        courtRaw = r[3];
        matchRaw = r[4];
        team1Raw = r[5];
        team2Raw = r[6];
      } else {
        if (!String(r[4] || '').includes(' / ')) continue;
        courtRaw = r[0];
        timeRaw = r[1];
        group = String(r[2] || '').trim();
        matchRaw = r[3];
        team1Raw = r[4];
        team2Raw = r[5];
      }

      const p1 = splitPair(team1Raw);
      const p2 = splitPair(team2Raw);
      if (!p1 || !p2) continue;

      addPlayers([...p1, ...p2], eventCat, group);

      const court = parseCourt(courtRaw);
      const matchNum = parseMatchNumber(matchRaw);
      const slotIdx = matchNum - 1;

      const block = isMens ? mensBlockStart(timeRaw) : windowBlockStart(timeRaw);
      const start = addMinutes(block.h, block.m, slotIdx * slotMin);

      const prefix = eventPrefix(eventCat);
      const matchNo = `CSC-${prefix}-${group}-${String(matchNum).padStart(2, '0')}`;
      const categoryKey = `${eventCat} · Group ${group}`;

      matches.push({
        match_no: matchNo,
        category_key: categoryKey,
        court,
        match_date: EVENT_DATE,
        match_time: padTime(start.h, start.m),
        a1n: p1[0],
        a2n: p1[1],
        b1n: p2[0],
        b2n: p2[1],
        sheet_meta: isMens
          ? `Phase ${phase} (${block.label}), ${courtRaw}, Match ${matchNum}`
          : `${block.label}, Court ${court}, Match ${matchNum}`,
      });
    }
  }

  return { matches, playerEvents };
}

function buildMatchValuesSql(matches) {
  return matches
    .map(
      (m) =>
        `    ('${sqlEscape(m.match_no)}', '${sqlEscape(m.category_key)}', '${m.court}', '${m.match_date}', '${m.match_time}', '${sqlEscape(m.a1n)}', '${sqlEscape(m.a2n)}', '${sqlEscape(m.b1n)}', '${sqlEscape(m.b2n)}')`
    )
    .join(',\n');
}

function buildParticipantsCsv(playerEvents) {
  const lines = ['name,phone,email,category,seed,club'];
  const sorted = [...playerEvents.values()].sort((a, b) => a.display.localeCompare(b.display));
  for (const p of sorted) {
    const cats = [...p.events].sort().join(' | ');
    const pools = [...p.pools].sort();
    const club = pools.length === 1 ? pools[0] : '';
    lines.push(`"${sqlEscape(p.display)}",,,${cats},,${club ? `"${sqlEscape(club)}"` : ''}`);
  }
  return { csv: lines.join('\n') + '\n', count: sorted.length, sorted };
}

function buildParticipantsSql(sorted) {
  const valueLines = sorted.map((p) => {
    const cats = [...p.events].sort().join(' | ');
    const pools = [...p.pools].sort();
    const club = pools.length === 1 ? pools[0] : null;
    return club
      ? `    ('${sqlEscape(p.display)}', '${sqlEscape(cats)}', '${sqlEscape(club)}')`
      : `    ('${sqlEscape(p.display)}', '${sqlEscape(cats)}', NULL)`;
  });

  return `-- =============================================================================
-- CSC Pickleball — insert ${sorted.length} participants (one tournament, all categories)
-- =============================================================================
-- Run AFTER creating the tournament (individual mode, sport: pickleball).
-- Replace REPLACE_ME_TOURNAMENT_ID with your tournament UUID.
--
-- Alternative: upload db/csc_pickleball_participants.csv from the Participants tab.
-- =============================================================================

BEGIN;

WITH p AS (
  SELECT 'REPLACE_ME_TOURNAMENT_ID'::uuid AS tournament_id
),
wanted AS (
  SELECT * FROM (VALUES
${valueLines.join(',\n')}
  ) AS v(player_name, category, club)
),
ins AS (
  INSERT INTO public.tournament_participants (
    tournament_id, user_id, player_name, phone, email, category, seed_number, club, status
  )
  SELECT
    p.tournament_id,
    NULL::uuid,
    w.player_name,
    NULL,
    NULL,
    w.category,
    NULL,
    w.club,
    'registered'
  FROM p
  CROSS JOIN wanted w
  WHERE NOT EXISTS (
    SELECT 1 FROM public.tournament_participants tp
    WHERE tp.tournament_id = p.tournament_id
      AND lower(regexp_replace(btrim(tp.player_name), '[[:space:]]+', ' ', 'g'))
        = lower(regexp_replace(btrim(w.player_name), '[[:space:]]+', ' ', 'g'))
  )
  RETURNING id, player_name, category
)
SELECT count(*) AS participants_inserted FROM ins;

COMMIT;
`;
}

function buildScheduleSql(matches, playerCount) {
  const valuesSql = buildMatchValuesSql(matches);

  return `-- =============================================================================
-- CSC Pickleball — full schedule (${matches.length} matches, 4 courts, all categories)
-- Source: CSC Pickle Ball Tournament Schedule.xlsx
-- Event date: ${EVENT_DATE} · Timezone: ${TZ}
-- =============================================================================
-- Timing (from sheet):
--   Mens:    6 matches/court/hour · 10 min slots · Phases 9-10, 10-11, 11-12, 12-1
--   Females: Courts 3-4 · 1:30-3:00 PM · 10 matches · 9 min slots
--   Mixed:   Courts 1-2 from 2:30 PM · Courts 3-4 from 3:00 PM · 10 min slots
--
-- BEFORE RUNNING:
--   1. Participants already uploaded (144 players).
--   2. Replace REPLACE_ME_TOURNAMENT_ID (PREVIEW + INSERT sections).
--   3. Run PREVIEW — fix any missing player names.
--   4. Run INSERT — replaces all CSC-* matches for this tournament.
-- =============================================================================

-- ─── PREVIEW: unresolved player names ────────────────────────────────────────
WITH p AS (
  SELECT 'REPLACE_ME_TOURNAMENT_ID'::uuid AS tournament_id
),
wanted AS (
  SELECT * FROM (VALUES
${valuesSql}
  ) AS v(match_no, category_key, court, match_date, match_time, a1n, a2n, b1n, b2n)
),
resolved AS (
  SELECT
    w.*,
    pa1.id AS a1_id, pa2.id AS a2_id, pb1.id AS b1_id, pb2.id AS b2_id
  FROM p
  CROSS JOIN wanted w
  LEFT JOIN LATERAL (
    SELECT x.id FROM public.tournament_participants x
    WHERE x.tournament_id = p.tournament_id
      AND lower(regexp_replace(btrim(x.player_name), '[[:space:]]+', ' ', 'g'))
        = lower(regexp_replace(btrim(w.a1n), '[[:space:]]+', ' ', 'g'))
    LIMIT 1
  ) pa1 ON true
  LEFT JOIN LATERAL (
    SELECT x.id FROM public.tournament_participants x
    WHERE x.tournament_id = p.tournament_id
      AND lower(regexp_replace(btrim(x.player_name), '[[:space:]]+', ' ', 'g'))
        = lower(regexp_replace(btrim(w.a2n), '[[:space:]]+', ' ', 'g'))
    LIMIT 1
  ) pa2 ON true
  LEFT JOIN LATERAL (
    SELECT x.id FROM public.tournament_participants x
    WHERE x.tournament_id = p.tournament_id
      AND lower(regexp_replace(btrim(x.player_name), '[[:space:]]+', ' ', 'g'))
        = lower(regexp_replace(btrim(w.b1n), '[[:space:]]+', ' ', 'g'))
    LIMIT 1
  ) pb1 ON true
  LEFT JOIN LATERAL (
    SELECT x.id FROM public.tournament_participants x
    WHERE x.tournament_id = p.tournament_id
      AND lower(regexp_replace(btrim(x.player_name), '[[:space:]]+', ' ', 'g'))
        = lower(regexp_replace(btrim(w.b2n), '[[:space:]]+', ' ', 'g'))
    LIMIT 1
  ) pb2 ON true
)
SELECT match_no, category_key, court, match_date, match_time, a1n, a2n, b1n, b2n,
  trim(both ', ' FROM concat_ws(', ',
    CASE WHEN a1_id IS NULL THEN 'a1: ' || a1n END,
    CASE WHEN a2_id IS NULL THEN 'a2: ' || a2n END,
    CASE WHEN b1_id IS NULL THEN 'b1: ' || b1n END,
    CASE WHEN pb2_id IS NULL THEN 'b2: ' || b2n END
  )) AS missing_players
FROM resolved
WHERE a1_id IS NULL OR a2_id IS NULL OR b1_id IS NULL OR pb2_id IS NULL
ORDER BY match_no;

-- ─── INSERT (run after PREVIEW returns 0 rows) ───────────────────────────────
BEGIN;

WITH p AS (
  SELECT
    'REPLACE_ME_TOURNAMENT_ID'::uuid AS tournament_id,
    t.sport,
    NULL::uuid AS created_by
  FROM public.tournaments t
  WHERE t.id = 'REPLACE_ME_TOURNAMENT_ID'::uuid
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
      m.match_number LIKE 'CSC-%'
      OR m.match_number LIKE 'RR-%'
      OR m.match_number LIKE 'B-%'
      OR m.match_number LIKE 'JCC-%'
      OR m.match_number LIKE 'DD-%'
    )
  RETURNING 1
),
parts AS (
  SELECT
    tp.id,
    tp.player_name,
    COALESCE(NULLIF(trim(tp.category), ''), '—') AS category,
    lower(regexp_replace(btrim(tp.player_name), '[[:space:]]+', ' ', 'g')) AS name_key
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
    ((v.match_date::date + v.match_time::time) AT TIME ZONE '${TZ}'),
    v.court,
    concat(
      '__JSON__',
      jsonb_build_object(
        'type', 'doubles_line',
        'categoryKey', v.category_key,
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
${valuesSql}
  ) AS v(match_no, category_key, court, match_date, match_time, a1n, a2n, b1n, b2n)
  INNER JOIN parts pa1 ON pa1.name_key = lower(regexp_replace(btrim(v.a1n), '[[:space:]]+', ' ', 'g'))
  INNER JOIN parts pa2 ON pa2.name_key = lower(regexp_replace(btrim(v.a2n), '[[:space:]]+', ' ', 'g'))
  INNER JOIN parts pb1 ON pb1.name_key = lower(regexp_replace(btrim(v.b1n), '[[:space:]]+', ' ', 'g'))
  INNER JOIN parts pb2 ON pb2.name_key = lower(regexp_replace(btrim(v.b2n), '[[:space:]]+', ' ', 'g'))
  RETURNING id, match_number
)
SELECT count(*) AS matches_inserted FROM ins;

COMMIT;

-- Verify (expect ${matches.length}):
-- SELECT match_number, court_number, match_date, left(notes, 80)
-- FROM public.matches WHERE tournament_id = 'REPLACE_ME_TOURNAMENT_ID'::uuid
-- ORDER BY match_date, court_number, match_number;
`;
}

function main() {
  const { matches, playerEvents } = parseWorkbook();
  const { csv, count, sorted } = buildParticipantsCsv(playerEvents);

  fs.writeFileSync(path.join(OUT_DIR, 'csc_pickleball_participants.csv'), csv);
  fs.writeFileSync(
    path.join(OUT_DIR, 'insert_csc_pickleball_participants_template.sql'),
    buildParticipantsSql(sorted)
  );
  fs.writeFileSync(
    path.join(OUT_DIR, 'insert_csc_pickleball_doubles_schedule_template.sql'),
    buildScheduleSql(matches, count)
  );

  // Validation
  const byCourtTime = new Map();
  for (const m of matches) {
    const key = `${m.court}|${m.match_date}|${m.match_time}`;
    if (!byCourtTime.has(key)) byCourtTime.set(key, []);
    byCourtTime.get(key).push(m.match_no);
  }
  const dups = [...byCourtTime.entries()].filter(([, v]) => v.length > 1);

  const byEvent = {};
  for (const m of matches) {
    const cat = m.category_key.split(' · ')[0];
    byEvent[cat] = (byEvent[cat] || 0) + 1;
  }

  console.log(`Source: ${XLSX_PATH}`);
  console.log(`Event date: ${EVENT_DATE}`);
  console.log(`Players: ${count}`);
  console.log(`Matches: ${matches.length}`);
  console.log('By category:', byEvent);
  console.log('Court+time collisions:', dups.length);
  if (dups.length) {
    console.warn('Collisions:', dups.slice(0, 5));
  }
  console.log('\nSample times:');
  for (const sample of ['CSC-MD-A-01', 'CSC-MD-A-06', 'CSC-MD-E-01', 'CSC-FD-A-01', 'CSC-FD-A-10', 'CSC-XD-A-01']) {
    const m = matches.find((x) => x.match_no === sample);
    if (m) console.log(`  ${m.match_no} court ${m.court} ${m.match_date} ${m.match_time} (${m.sheet_meta})`);
  }
  console.log('\nWrote db/csc_pickleball_participants.csv');
  console.log('Wrote db/insert_csc_pickleball_participants_template.sql');
  console.log('Wrote db/insert_csc_pickleball_doubles_schedule_template.sql');
}

main();
