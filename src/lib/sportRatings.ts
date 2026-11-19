export type SportRatingsMap = Record<string, number>;

export interface TopSportRating {
    sport: string;
    rating: number;
}

const MAX_STARS = 5;
const TOP_SPORTS_LIMIT = 5;

/** Display label: "pickleball" → "Pickleball" */
export function formatSportLabel(sportKey: string): string {
    const normalized = sportKey.trim().replace(/[_-]+/g, ' ');
    if (!normalized) return sportKey;
    return normalized
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function clampRating(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(MAX_STARS, Math.max(0, Math.round(value)));
}

/**
 * Accepts JSON object, JSON string, or "cricket:4,pickleball:5" style text (from CSV).
 */
export function parseSportRatings(raw: unknown): SportRatingsMap {
    if (raw == null || raw === '') return {};

    if (typeof raw === 'object' && !Array.isArray(raw)) {
        const out: SportRatingsMap = {};
        for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
            const num = typeof val === 'number' ? val : parseFloat(String(val));
            if (key.trim() && Number.isFinite(num) && num > 0) {
                out[key.trim().toLowerCase()] = clampRating(num);
            }
        }
        return out;
    }

    const text = String(raw).trim();
    if (!text) return {};

    if (text.startsWith('{')) {
        try {
            return parseSportRatings(JSON.parse(text));
        } catch {
            return {};
        }
    }

    const out: SportRatingsMap = {};
    for (const part of text.split(/[,;|]/)) {
        const segment = part.trim();
        if (!segment) continue;
        const colon = segment.indexOf(':');
        const eq = segment.indexOf('=');
        let sep = -1;
        if (colon >= 0 && (eq < 0 || colon < eq)) sep = colon;
        else if (eq >= 0) sep = eq;

        if (sep < 0) continue;
        const sport = segment.slice(0, sep).trim().toLowerCase();
        const rating = parseFloat(segment.slice(sep + 1).trim());
        if (sport && Number.isFinite(rating) && rating > 0) {
            out[sport] = clampRating(rating);
        }
    }
    return out;
}

export function mapSportRatingsField(raw: unknown): SportRatingsMap | undefined {
    const parsed = parseSportRatings(raw);
    return Object.keys(parsed).length > 0 ? parsed : undefined;
}

/** Highest-rated sports first; ties broken alphabetically by sport name. */
export function getTopSportRatings(
    ratings: SportRatingsMap | undefined,
    limit = TOP_SPORTS_LIMIT
): TopSportRating[] {
    if (!ratings) return [];
    return Object.entries(ratings)
        .map(([sport, rating]) => ({ sport, rating: clampRating(rating) }))
        .filter((entry) => entry.rating > 0)
        .sort((a, b) => {
            if (b.rating !== a.rating) return b.rating - a.rating;
            return a.sport.localeCompare(b.sport);
        })
        .slice(0, limit);
}

/** For DB insert/update (JSONB). */
export function sportRatingsForDb(raw: unknown): SportRatingsMap | null {
    const parsed = parseSportRatings(raw);
    return Object.keys(parsed).length > 0 ? parsed : null;
}

/** Per-sport columns in player_upload_template.csv (values 1–5). */
export const PLAYER_CSV_RATING_COLUMNS = [
    'rating_chess',
    'rating_pickleball',
    'rating_badminton',
    'rating_cricket',
    'rating_carrom',
] as const;

/** Merge optional sport_ratings column with rating_* columns from a CSV row. */
export function sportRatingsFromCsvRow(row: Record<string, unknown>): SportRatingsMap {
    const out = { ...parseSportRatings(row.sport_ratings) };
    for (const col of PLAYER_CSV_RATING_COLUMNS) {
        const sport = col.replace(/^rating_/, '');
        const val = row[col];
        if (val == null || String(val).trim() === '') continue;
        const n = parseFloat(String(val));
        if (Number.isFinite(n) && n > 0) {
            out[sport] = clampRating(n);
        }
    }
    return out;
}

export function sportRatingsForDbFromCsvRow(row: Record<string, unknown>): SportRatingsMap | null {
    const parsed = sportRatingsFromCsvRow(row);
    return Object.keys(parsed).length > 0 ? parsed : null;
}