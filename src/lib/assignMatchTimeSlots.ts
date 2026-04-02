/**
 * Assign consecutive match_date values per court using a fixed daily window (local time).
 * Example: Apr 11–12, 6:00 PM–midnight, 15-minute slots → 24 starts per court per day.
 *
 * For doubles / roster-aware scheduling use `assignMatchTimesWithPlayerConstraints` so the same
 * participant is never on two courts at once and never plays more than N consecutive 15-min slots.
 */

import { parseDoublesMatchNotes } from "@/lib/generateBalancedDoublesSchedule";

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

export type MatchForPlayerAwareAssign = MatchForSlotAssign & {
    /** Tournament participant ids involved (doubles: 4; else union of both team rosters). */
    playerParticipantIds: string[];
};

export type AssignWithPlayerOptions = AssignMatchTimesByCourtOptions & {
    /** Max matches in a row on adjacent 15-min slots (default 2). */
    maxConsecutivePlayingSlots?: number;
    /** Max matches per player on the same local calendar day (default 9). */
    maxMatchesPerPlayerPerDay?: number;
};

function compareByMatchNumberGlobal(
    a: MatchForSlotAssign,
    b: MatchForSlotAssign,
    defaultCourtKey: string
): number {
    const na = matchNumberSortKey(a.match_number);
    const nb = matchNumberSortKey(b.match_number);
    if (na !== nb) return na - nb;
    return compareMatchesForSchedule(a, b, defaultCourtKey);
}

function longestConsecutiveRun(sortedMs: number[], slotMs: number): number {
    if (sortedMs.length === 0) return 0;
    let run = 1;
    let best = 1;
    for (let i = 1; i < sortedMs.length; i++) {
        if (sortedMs[i] - sortedMs[i - 1] === slotMs) {
            run++;
            best = Math.max(best, run);
        } else {
            run = 1;
        }
    }
    return best;
}

function playerAllowsSlot(
    existingTimes: number[] | undefined,
    slotStartMs: number,
    slotMs: number,
    maxConsecutive: number
): boolean {
    const times = existingTimes ?? [];
    if (times.some((t) => t === slotStartMs)) return false;
    const merged = [...times, slotStartMs].sort((a, b) => a - b);
    return longestConsecutiveRun(merged, slotMs) <= maxConsecutive;
}

function localDayKey(ms: number): string {
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${da}`;
}

function playerAllowsDailyCap(existingTimes: number[] | undefined, slotStartMs: number, maxPerDay: number): boolean {
    const times = existingTimes ?? [];
    const day = localDayKey(slotStartMs);
    const count = times.reduce((acc, t) => (localDayKey(t) === day ? acc + 1 : acc), 0);
    return count < maxPerDay;
}

function isValidSessionSlotStart(d: Date, dailyStart: DailyClock, endMin: number, slotMinutes: number): boolean {
    const startMin = minutesOfDay(dailyStart.hour, dailyStart.minute);
    const md = d.getHours() * 60 + d.getMinutes();
    const lastStartMin = endMin - slotMinutes;
    return md >= startMin && md <= lastStartMin && d.getSeconds() === 0 && d.getMilliseconds() === 0;
}

/** Next evening session start on or after calendar day of `d` (local). */
function nextEveningSessionStart(d: Date, dailyStart: DailyClock): Date {
    const startMin = minutesOfDay(dailyStart.hour, dailyStart.minute);
    const md = d.getHours() * 60 + d.getMinutes();
    const x = new Date(d);
    if (md < startMin) {
        x.setHours(dailyStart.hour, dailyStart.minute, 0, 0);
        return x;
    }
    x.setDate(x.getDate() + 1);
    x.setHours(dailyStart.hour, dailyStart.minute, 0, 0);
    return x;
}

function advanceSlotStartMs(fromSlotStartMs: number, dailyStart: DailyClock, endMin: number, slotMinutes: number): number {
    const slotMs = slotMinutes * 60 * 1000;
    const cand = new Date(fromSlotStartMs + slotMs);
    if (isValidSessionSlotStart(cand, dailyStart, endMin, slotMinutes)) {
        return cand.getTime();
    }
    return nextEveningSessionStart(cand, dailyStart).getTime();
}

/**
 * Time-wave packing: for each slot (6:00, 6:15, …), place as many matches as possible at that
 * exact start time—one per court, no shared players across those placements, respecting
 * max consecutive slots per player. Then advance to the next slot. This fills all courts at
 * 6:00 whenever disjoint lineups exist (e.g. DD-001 on C1 and a non-overlapping match on C2).
 */
export function assignMatchTimesWithPlayerConstraints(
    matches: MatchForPlayerAwareAssign[],
    options: AssignWithPlayerOptions
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
    const maxConsecutive = Math.max(1, Math.min(10, options.maxConsecutivePlayingSlots ?? 2));
    const maxPerDay = Math.max(1, Math.min(50, options.maxMatchesPerPlayerPerDay ?? 9));
    const slotMs = slotMinutes * 60 * 1000;

    const startMin = minutesOfDay(dailyStart.hour, dailyStart.minute);
    const endMin = dailyEnd.hour >= 24 ? 24 * 60 : minutesOfDay(dailyEnd.hour, dailyEnd.minute);
    const windowLen = endMin - startMin;
    if (windowLen <= 0) {
        throw new Error("assignMatchTimesWithPlayerConstraints: dailyEnd must be after dailyStart");
    }
    const slotsPerDay = Math.floor(windowLen / slotMinutes);
    if (slotsPerDay <= 0) {
        throw new Error("assignMatchTimesWithPlayerConstraints: session window too short for this slot length");
    }

    const anchor = options.anchorDate;
    const anchorSlotStart = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate(), dailyStart.hour, dailyStart.minute, 0, 0);
    const anchorMs = anchorSlotStart.getTime();

    const sorted = [...matches].sort((a, b) => compareByMatchNumberGlobal(a, b, defaultCourtKey));
    const courtsInUse = new Set(sorted.map((m) => courtSortKey(m.court_number, defaultCourtKey)));
    const courtNext = new Map<number, number>();
    for (const c of courtsInUse) {
        courtNext.set(c, anchorMs);
    }

    const playerToTimes = new Map<string, number[]>();
    const out: { id: string; match_date: string }[] = [];
    let pool = sorted;

    const maxOuterSteps = Math.min(500_000, Math.max(slotsPerDay * 200, slotsPerDay * 50 * Math.max(1, matches.length)));
    let T = anchorMs;
    let steps = 0;

    while (pool.length > 0) {
        if (steps++ > maxOuterSteps) {
            throw new Error(
                "Could not place all matches within the session window without breaking player rest / overlap rules. Add days, widen hours, or reduce matches."
            );
        }

        if (!isValidSessionSlotStart(new Date(T), dailyStart, endMin, slotMinutes)) {
            T = nextEveningSessionStart(new Date(T), dailyStart).getTime();
            continue;
        }

        const courtsUsedThisSlot = new Set<number>();
        const playersUsedThisSlot = new Set<string>();
        const maxInner = pool.length * (courtsInUse.size + 2) + 5;
        let inner = 0;

        while (inner < maxInner) {
            inner++;
            const candidates = pool
                .filter((m) => {
                    const C = courtSortKey(m.court_number, defaultCourtKey);
                    if (courtsUsedThisSlot.has(C)) return false;
                    const next = courtNext.get(C);
                    return next !== undefined && next <= T;
                })
                .sort((a, b) => compareByMatchNumberGlobal(a, b, defaultCourtKey));

            const pick = candidates.find((m) => {
                const players = m.playerParticipantIds ?? [];
                if (players.some((p) => playersUsedThisSlot.has(p))) return false;
                for (const p of players) {
                    const existing = playerToTimes.get(p);
                    if (!playerAllowsSlot(existing, T, slotMs, maxConsecutive)) return false;
                    if (!playerAllowsDailyCap(existing, T, maxPerDay)) return false;
                }
                return true;
            });

            if (!pick) break;

            const C = courtSortKey(pick.court_number, defaultCourtKey);
            out.push({ id: pick.id, match_date: new Date(T).toISOString() });
            courtsUsedThisSlot.add(C);
            courtNext.set(C, T + slotMs);
            for (const p of pick.playerParticipantIds ?? []) {
                playersUsedThisSlot.add(p);
                if (!playerToTimes.has(p)) playerToTimes.set(p, []);
                playerToTimes.get(p)!.push(T);
            }
            pool = pool.filter((x) => x.id !== pick.id);
        }

        T = advanceSlotStartMs(T, dailyStart, endMin, slotMinutes);
    }

    return out;
}

/** Participant ids for scheduling: doubles lineups from notes, else all roster ids on both teams. */
export function participantIdsForMatchScheduling(
    notes: string | null | undefined,
    teamAId: string | null | undefined,
    teamBId: string | null | undefined,
    rosterByTeamId: Map<string, string[]>
): string[] {
    const d = parseDoublesMatchNotes(notes);
    if (d) {
        const ids = [...d.sideA.slice(0, 2), ...d.sideB.slice(0, 2)]
            .map((x) => x.id)
            .filter(Boolean);
        return [...new Set(ids)];
    }
    const a = teamAId ? rosterByTeamId.get(teamAId) ?? [] : [];
    const b = teamBId ? rosterByTeamId.get(teamBId) ?? [] : [];
    return [...new Set([...a, ...b])];
}

export function shouldUsePlayerAwareAssignment(matches: MatchForPlayerAwareAssign[]): boolean {
    return matches.some((m) => (m.playerParticipantIds?.length ?? 0) > 0);
}
