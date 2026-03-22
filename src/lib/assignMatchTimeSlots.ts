/**
 * Assign consecutive match_date values per court using a fixed daily window (local time).
 * Example: Apr 11–12, 6:00 PM–midnight, 15-minute slots → 24 starts per court per day.
 */

export type MatchForSlotAssign = {
    id: string;
    court_number?: string | null;
    match_number?: string | null;
};

export type DailyClock = { hour: number; minute: number };

export type AssignMatchTimesByCourtOptions = {
    /** Any instant on the first competition day (local date used; use `dailyStart` for clock). */
    anchorDate: Date;
    /** First slot on each day (default 18:00 = 6 PM). */
    dailyStart?: DailyClock;
    /** End of session, exclusive (default 24:00 = midnight). Last start is 23:45 for 15-min slots. */
    dailyEnd?: DailyClock;
    slotMinutes?: number;
    /** Court key when `court_number` is missing (string "1".."n"). */
    defaultCourtKey?: string;
};

function courtSortKey(court_number: string | null | undefined, defaultKey: string): number {
    const raw = (court_number ?? "").replace(/\D/g, "");
    const n = parseInt(raw || defaultKey, 10);
    return Number.isFinite(n) && n > 0 ? n : parseInt(defaultKey, 10) || 1;
}

function matchNumberSortKey(match_number: string | null | undefined): number {
    const m = (match_number ?? "").match(/\d+/);
    return m ? parseInt(m[0], 10) : Number.MAX_SAFE_INTEGER;
}

/** Sort for schedule assignment: court, then match number, then id. */
export function compareMatchesForSchedule(a: MatchForSlotAssign, b: MatchForSlotAssign, defaultCourtKey: string): number {
    const ca = courtSortKey(a.court_number, defaultCourtKey);
    const cb = courtSortKey(b.court_number, defaultCourtKey);
    if (ca !== cb) return ca - cb;
    const na = matchNumberSortKey(a.match_number);
    const nb = matchNumberSortKey(b.match_number);
    if (na !== nb) return na - nb;
    return a.id.localeCompare(b.id);
}

function minutesOfDay(h: number, m: number): number {
    return h * 60 + m;
}

/**
 * @returns ISO strings for `match_date` (via `Date.toISOString()`), local wall-clock rules.
 */
export function assignMatchTimesByCourt(
    matches: MatchForSlotAssign[],
    options: AssignMatchTimesByCourtOptions
): { id: string; match_date: string }[] {
    const dailyStart =
        options.dailyStart ??
        (() => {
            const a = options.anchorDate;
            return { hour: a.getHours(), minute: a.getMinutes() };
        })();
    const dailyEnd = options.dailyEnd ?? { hour: 24, minute: 0 };
    const slotMinutes = Math.max(1, Math.min(180, options.slotMinutes ?? 15));
    const defaultCourtKey = options.defaultCourtKey ?? "1";

    const startMin = minutesOfDay(dailyStart.hour, dailyStart.minute);
    const endMin = dailyEnd.hour >= 24 ? 24 * 60 : minutesOfDay(dailyEnd.hour, dailyEnd.minute);
    const windowLen = endMin - startMin;
    if (windowLen <= 0) {
        throw new Error("assignMatchTimesByCourt: dailyEnd must be after dailyStart");
    }
    const slotsPerDay = Math.floor(windowLen / slotMinutes);
    if (slotsPerDay <= 0) {
        throw new Error("assignMatchTimesByCourt: session window too short for this slot length");
    }

    const anchor = options.anchorDate;
    const y = anchor.getFullYear();
    const mo = anchor.getMonth();
    const da = anchor.getDate();

    const sorted = [...matches].sort((a, b) => compareMatchesForSchedule(a, b, defaultCourtKey));
    const byCourt = new Map<number, MatchForSlotAssign[]>();
    for (const m of sorted) {
        const ck = courtSortKey(m.court_number, defaultCourtKey);
        if (!byCourt.has(ck)) byCourt.set(ck, []);
        byCourt.get(ck)!.push(m);
    }

    const out: { id: string; match_date: string }[] = [];
    for (const [, list] of [...byCourt.entries()].sort((a, b) => a[0] - b[0])) {
        list.forEach((m, idx) => {
            const dayOff = Math.floor(idx / slotsPerDay);
            const slotInDay = idx % slotsPerDay;
            const d = new Date(y, mo, da + dayOff, 0, 0, 0, 0);
            d.setHours(dailyStart.hour, dailyStart.minute + slotInDay * slotMinutes, 0, 0);
            out.push({ id: m.id, match_date: d.toISOString() });
        });
    }
    return out;
}
