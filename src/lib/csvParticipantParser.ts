/**
 * Parse CSV for tournament participants (badminton-style).
 * Expected columns: name (required), phone, email, category, seed, club
 * - club: same value for everyone on one squad → one team when you click "Create teams from club or seed".
 * - seed: if club is empty, same numeric seed for everyone on a squad → one team (use as team id instead of club).
 *   If both club and seed are set, the app groups by club first.
 * First row can be header (case-insensitive); otherwise first row is data.
 */

export interface ParsedParticipant {
  name: string;
  phone: string;
  email?: string;
  category?: string;
  seed?: number;
  club?: string;
}

const DEFAULT_HEADERS = ['name', 'phone', 'email', 'category', 'seed', 'club'];

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_');
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || (c === '\t' && !inQuotes)) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Returns parsed participants and any parse errors (e.g. missing name).
 */
export function parseParticipantCsv(csvText: string): {
  participants: ParsedParticipant[];
  errors: string[];
} {
  const errors: string[] = [];
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { participants: [], errors: ['File is empty.'] };
  }

  const firstRow = parseCsvLine(lines[0]);
  const isHeader = firstRow.some((cell) =>
    DEFAULT_HEADERS.includes(normalizeHeader(cell))
  );

  let headerIndices: Record<string, number> = {};
  let dataStart = 0;

  if (isHeader && firstRow.length > 0) {
    firstRow.forEach((cell, i) => {
      const key = normalizeHeader(cell);
      if (DEFAULT_HEADERS.includes(key)) headerIndices[key] = i;
    });
    dataStart = 1;
  } else {
    DEFAULT_HEADERS.forEach((h, i) => {
      headerIndices[h] = i;
    });
  }

  const participants: ParsedParticipant[] = [];
  for (let i = dataStart; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const name = (headerIndices['name'] !== undefined ? cells[headerIndices['name']] : cells[0])?.trim() || '';
    if (!name) {
      errors.push(`Row ${i + 1}: Missing name.`);
      continue;
    }
    const phone = (headerIndices['phone'] !== undefined ? cells[headerIndices['phone']] : cells[1])?.trim() || '';
    const email = (headerIndices['email'] !== undefined ? cells[headerIndices['email']] : cells[2])?.trim() || undefined;
    const category = (headerIndices['category'] !== undefined ? cells[headerIndices['category']] : cells[3])?.trim() || undefined;
    const seedStr = (headerIndices['seed'] !== undefined ? cells[headerIndices['seed']] : cells[4])?.trim() || '';
    const seed = seedStr ? parseInt(seedStr, 10) : undefined;
    const club = (headerIndices['club'] !== undefined ? cells[headerIndices['club']] : cells[5])?.trim() || undefined;

    participants.push({
      name,
      phone,
      email,
      category,
      seed: Number.isNaN(seed) ? undefined : seed,
      club,
    });
  }

  return { participants, errors };
}

/**
 * Example A: same club for all 6 on a squad.
 * Example B: seed-only — same seed number, leave club column empty (trailing comma).
 */
export const BADMINTON_PARTICIPANT_CSV_TEMPLATE = `name,phone,email,category,seed,club
Player One,9876543210,one@example.com,Advanced,1,Team A
Player Two,9876543211,two@example.com,Intermediate,1,Team A
Player Three,9876543212,three@example.com,Emerging,1,Team A
SeedOnly A1,9876543213,a1@example.com,Advanced,1,
SeedOnly A2,9876543214,a2@example.com,Intermediate,1,
SeedOnly A3,9876543215,a3@example.com,Emerging,1,
SeedOnly B1,9876543216,b1@example.com,Advanced,2,
SeedOnly B2,9876543217,b2@example.com,Intermediate,2,
`;
