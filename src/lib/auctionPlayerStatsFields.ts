/** DB columns batting_hand / bowling_hand / wing store cricket-style stats (legacy names). */

export const AUCTION_STATS_FIELD_LABELS = {
    batting_hand: 'Matches',
    bowling_hand: 'Runs',
    wing: 'Wickets',
} as const;

export function statsFromCsvRow(row: Record<string, unknown>): {
    batting_hand: string | null;
    bowling_hand: string | null;
    wing: string | null;
} {
    const pick = (...keys: string[]): string | null => {
        for (const key of keys) {
            const val = row[key];
            if (val != null && String(val).trim() !== '') return String(val).trim();
        }
        return null;
    };
    return {
        batting_hand: pick('matches', 'batting_hand'),
        bowling_hand: pick('runs', 'bowling_hand'),
        wing: pick('wickets', 'wing'),
    };
}