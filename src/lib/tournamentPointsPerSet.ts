/** Values allowed by DB check `tournaments_points_per_set_check` (11, 15, 21). */
export function allowedPointsPerSetForSport(_sport: string): number[] {
    return [11, 15, 21];
}

/** Human-readable dropdown label; sport in brackets only when that score is the usual one for this sport. */
export function pointsPerSetOptionLabel(sport: string, pts: number): string {
    if (pts === 11) {
        return sport === "pickleball" ? "11 points (pickleball)" : "11 points";
    }
    if (pts === 15) return "15 points";
    if (pts === 21) {
        return sport === "badminton" ? "21 points (badminton)" : "21 points";
    }
    return `${pts} points`;
}

/** Coerce to a DB-safe points_per_set for the given sport (avoids CHECK violations). */
export function normalizePointsPerSetForSport(sport: string, raw: unknown): number {
    const n = typeof raw === "number" && Number.isFinite(raw) ? raw : parseInt(String(raw), 10);
    const allowed = allowedPointsPerSetForSport(sport);
    if (allowed.includes(n)) return n;
    return sport === "pickleball" ? 11 : 21;
}
