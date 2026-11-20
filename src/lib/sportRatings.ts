export type SportRatingsMap = Record<string, number>;

export interface TopSportRating {
    sport: string;
    rating: number;
}

const MAX_STARS = 5;

/** Canonical keys stored in sport_ratings JSONB */
export const AUCTION_RATED_SPORT_KEYS = [
    'pickle',
    'padel',
    'table_tennis',
    'badminton',
    'carrom',
    'chess',
] as const;

export type AuctionRatedSportKey = (typeof AUCTION_RATED_SPORT_KEYS)[number];

export const SPORT_DISPLAY_LABELS: Record<AuctionRatedSportKey, string> = {
    pickle: 'Pickle',
    padel: 'Padel',
    table_tennis: 'Table tennis',
    badminton: 'Badminton',
    carrom: 'Carrom',
    chess: 'Chess',
};

/** Per-sport columns in player_upload_template.csv (values 1–5). */
export const PLAYER_CSV_RATING_COLUMNS = AUCTION_RATED_SPORT_KEYS.map(
    (sport) => `rating_${sport}` as `rating_${AuctionRatedSportKey}`
);

/** Old template columns still accepted on CSV upload */
const LEGACY_CSV_RATING_COLUMNS: Record<string, AuctionRatedSportKey> = {
    rating_pickleball: 'pickle',
};

const SPORT_KEY_ALIASES: Record<string, AuctionRatedSportKey> = {
    pickle: 'pickle',
    pickleball: 'pickle',
    padel: 'padel',
    table_tennis: 'table_tennis',
    'table tennis': 'table_tennis',
    'table-tennis': 'table_tennis',
    tabletennis: 'table_tennis',
    badminton: 'badminton',
    carrom: 'carrom',
    chess: 'chess',
};

export function normalizeSportRatingKey(raw: string): string {
    const compact = raw.trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!compact) return raw.trim().toLowerCase();
    if (SPORT_KEY_ALIASES[compact]) return SPORT_KEY_ALIASES[compact];
    const underscored = compact.replace(/\s+/g, '_');
    if (SPORT_KEY_ALIASES[underscored]) return SPORT_KEY_ALIASES[underscored];
    return underscored;
}

/** Display label for a stored sport key */
export function formatSportLabel(sportKey: string): string {
    const key = normalizeSportRatingKey(sportKey);
    const known = SPORT_DISPLAY_LABELS[key as AuctionRatedSportKey];
    if (known) return known;
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
 * Accepts JSON object, JSON string, or "pickle:4,padel:5" style text (from CSV).
 */
export function parseSportRatings(raw: unknown): SportRatingsMap {
    if (raw == null || raw === '') return {};

    if (typeof raw === 'object' && !Array.isArray(raw)) {
        const out: SportRatingsMap = {};
        for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
            const num = typeof val === 'number' ? val : parseFloat(String(val));
            if (!key.trim() || !Number.isFinite(num) || num <= 0) continue;
            const sport = normalizeSportRatingKey(key);
            out[sport] = clampRating(num);
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
        const sport = normalizeSportRatingKey(segment.slice(0, sep));
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

/** Canonical auction sports first (fixed order), then any other rated sports alphabetically. */
export function getOrderedSportRatings(ratings: SportRatingsMap | undefined): TopSportRating[] {
    if (!ratings) return [];

    const out: TopSportRating[] = [];
    const used = new Set<string>();

    for (const sport of AUCTION_RATED_SPORT_KEYS) {
        const rating = ratings[sport];
        if (rating == null || rating <= 0) continue;
        out.push({ sport, rating: clampRating(rating) });
        used.add(sport);
    }

    const extras = Object.entries(ratings)
        .filter(([sport, rating]) => !used.has(sport) && rating > 0)
        .map(([sport, rating]) => ({ sport, rating: clampRating(rating) }))
        .sort((a, b) => a.sport.localeCompare(b.sport));

    return [...out, ...extras];
}

/** @deprecated Use getOrderedSportRatings */
export function getTopSportRatings(ratings: SportRatingsMap | undefined, _limit?: number): TopSportRating[] {
    return getOrderedSportRatings(ratings);
}

/** For DB insert/update (JSONB); keys normalized to canonical sports. */
export function sportRatingsForDb(raw: unknown): SportRatingsMap | null {
    const parsed = parseSportRatings(raw);
    return Object.keys(parsed).length > 0 ? parsed : null;
}

/** Merge optional sport_ratings column with rating_* columns from a CSV row. */
export function sportRatingsFromCsvRow(row: Record<string, unknown>): SportRatingsMap {
    const out = { ...parseSportRatings(row.sport_ratings) };

    for (const col of PLAYER_CSV_RATING_COLUMNS) {
        const sport = col.replace(/^rating_/, '');
        const val = row[col];
        if (val == null || String(val).trim() === '') continue;
        const n = parseFloat(String(val));
        if (Number.isFinite(n) && n > 0) {
            out[normalizeSportRatingKey(sport)] = clampRating(n);
        }
    }

    for (const [legacyCol, sport] of Object.entries(LEGACY_CSV_RATING_COLUMNS)) {
        const val = row[legacyCol];
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

export const PLAYER_CSV_RATING_COLUMNS_LABEL =
    'rating_pickle, rating_padel, rating_table_tennis, rating_badminton, rating_carrom, rating_chess';