/** Values allowed by DB check `tournaments_points_per_set_check` after migration (11 = pickleball). */
export function allowedPointsPerSetForSport(sport: string): number[] {
    if (sport === "pickleball") return [11, 15, 21];
    return [15, 21];
}

/** Coerce to a DB-safe points_per_set for the given sport (avoids CHECK violations). */
export function normalizePointsPerSetForSport(sport: string, raw: unknown): number {
    const n = typeof raw === "number" && Number.isFinite(raw) ? raw : parseInt(String(raw), 10);
    const allowed = allowedPointsPerSetForSport(sport);
    if (allowed.includes(n)) return n;
    return sport === "pickleball" ? 11 : 21;
}
