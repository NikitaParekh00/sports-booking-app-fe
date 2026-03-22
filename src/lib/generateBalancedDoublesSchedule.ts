/**
 * Build inter-team doubles matches so each side uses two players whose skill multiset
 * matches the opponent side (e.g. Advanced+Beginner vs Advanced+Beginner).
 * Greedy algorithm targets N appearances per player (each appearance = one doubles match).
 */

export type RosterPlayer = {
    participantId: string;
    name: string;
    /** Original label from CSV/UI (e.g. "Advanced") */
    category: string;
    /** Normalized for pairing rules */
    categoryNorm: string;
};

export type TeamRosterInput = {
    teamId: string;
    teamName: string;
    players: RosterPlayer[];
};

export type GeneratedDoublesMatch = {
    teamAId: string;
    teamBId: string;
    teamAName: string;
    teamBName: string;
    sideA: [RosterPlayer, RosterPlayer];
    sideB: [RosterPlayer, RosterPlayer];
    /** Sorted normalized categories joined by "+", e.g. "advanced+beginner" */
    categoryKey: string;
};

export type DoublesScheduleResult = {
    matches: GeneratedDoublesMatch[];
    /** Final appearance count per participant id */
    counts: Record<string, number>;
    /** Participant ids still below target */
    unmetPlayerIds: string[];
    targetPerPlayer: number;
};

function pairKey(p1: RosterPlayer, p2: RosterPlayer): string {
    return [p1.categoryNorm, p2.categoryNorm].sort().join("+");
}

function enumeratePairs(players: RosterPlayer[]): { a: RosterPlayer; b: RosterPlayer; key: string }[] {
    const out: { a: RosterPlayer; b: RosterPlayer; key: string }[] = [];
    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            const a = players[i];
            const b = players[j];
            out.push({ a, b, key: pairKey(a, b) });
        }
    }
    return out;
}

/** Normalize participant category for matching (case-insensitive trim). */
export function normalizeCategoryLabel(raw: string | null | undefined): string {
    const t = (raw ?? "").trim().toLowerCase();
    return t || "";
}

/**
 * @param rosters One entry per club team; each must list all squad players with categories set.
 * @param targetPerPlayer Each player should play this many doubles matches (vs other teams).
 */
export function generateBalancedDoublesSchedule(
    rosters: TeamRosterInput[],
    targetPerPlayer: number
): DoublesScheduleResult {
    const plays: Record<string, number> = {};
    rosters.forEach((r) => {
        r.players.forEach((p) => {
            plays[p.participantId] = 0;
        });
    });

    const matches: GeneratedDoublesMatch[] = [];

    const teamPairs: [TeamRosterInput, TeamRosterInput][] = [];
    for (let i = 0; i < rosters.length; i++) {
        for (let j = i + 1; j < rosters.length; j++) {
            teamPairs.push([rosters[i], rosters[j]]);
        }
    }

    const allSatisfied = () => Object.values(plays).every((c) => c >= targetPerPlayer);

    let stagnation = 0;
    const maxStagnation = Math.max(200, rosters.length * rosters.length * targetPerPlayer * 4);

    while (!allSatisfied() && stagnation < maxStagnation) {
        let added = false;

        // Shuffle order each pass to spread matches across team-pairs
        const order = [...teamPairs].sort(() => Math.random() - 0.5);

        for (const [TA, TB] of order) {
            const pairsA = enumeratePairs(TA.players);
            const pairsB = enumeratePairs(TB.players);
            const byKeyB = new Map<string, { a: RosterPlayer; b: RosterPlayer; key: string }[]>();
            for (const pb of pairsB) {
                if (!byKeyB.has(pb.key)) byKeyB.set(pb.key, []);
                byKeyB.get(pb.key)!.push(pb);
            }

            type Cand = {
                score: number;
                pa: { a: RosterPlayer; b: RosterPlayer; key: string };
                pb: { a: RosterPlayer; b: RosterPlayer; key: string };
            };
            const candidates: Cand[] = [];

            for (const pa of pairsA) {
                const listB = byKeyB.get(pa.key);
                if (!listB?.length) continue;
                for (const pb of listB) {
                    const ids = [pa.a.participantId, pa.b.participantId, pb.a.participantId, pb.b.participantId];
                    if (ids.some((id) => plays[id] >= targetPerPlayer)) continue;
                    const score = Math.min(...ids.map((id) => plays[id]));
                    candidates.push({ score, pa, pb });
                }
            }

            if (candidates.length === 0) continue;

            candidates.sort((x, y) => x.score - y.score);
            const best = candidates[0];
            const pa = best.pa;
            const pb = best.pb;
            const ids = [pa.a.participantId, pa.b.participantId, pb.a.participantId, pb.b.participantId];
            ids.forEach((id) => {
                plays[id] += 1;
            });
            matches.push({
                teamAId: TA.teamId,
                teamBId: TB.teamId,
                teamAName: TA.teamName,
                teamBName: TB.teamName,
                sideA: [pa.a, pa.b],
                sideB: [pb.a, pb.b],
                categoryKey: pa.key,
            });
            added = true;
            break;
        }

        if (!added) stagnation += 1;
        else stagnation = 0;
    }

    const unmetPlayerIds = Object.entries(plays)
        .filter(([, c]) => c < targetPerPlayer)
        .map(([id]) => id);

    return { matches, counts: plays, unmetPlayerIds, targetPerPlayer };
}

const NOTES_JSON_MARK = "__JSON__";

/** Stored in `matches.notes` for balanced-doubles rows; parsed by the schedule/results UI. */
export type DoublesLinePayload = {
    type: "doubles_line";
    categoryKey: string;
    teamAId: string;
    teamBId: string;
    sideA: { id: string; name: string; category: string }[];
    sideB: { id: string; name: string; category: string }[];
};

export function parseDoublesMatchNotes(notes: string | null | undefined): DoublesLinePayload | null {
    if (!notes?.trim()) return null;
    const idx = notes.indexOf(NOTES_JSON_MARK);
    let raw = "";
    if (idx !== -1) {
        raw = notes.slice(idx + NOTES_JSON_MARK.length).trim();
    } else if (notes.trim().startsWith("{")) {
        raw = notes.trim();
    } else {
        return null;
    }
    try {
        const data = JSON.parse(raw) as DoublesLinePayload;
        if (
            data?.type === "doubles_line" &&
            Array.isArray(data.sideA) &&
            Array.isArray(data.sideB) &&
            data.sideA.length >= 2 &&
            data.sideB.length >= 2
        ) {
            return data;
        }
    } catch {
        /* invalid JSON */
    }
    return null;
}

/** e.g. `Aryan (Advanced) & Apurva (Advanced) vs Mayur (Advanced) & Daivik (Advanced)` */
export function formatDoublesPlayersLineCompact(payload: DoublesLinePayload): string {
    const lab = (name: string, cat: string) => {
        const c = (cat && String(cat).trim()) || "—";
        return `${name} (${c})`;
    };
    const [a1, a2] = payload.sideA;
    const [b1, b2] = payload.sideB;
    return `${lab(a1.name, a1.category)} & ${lab(a2.name, a2.category)} vs ${lab(b1.name, b1.category)} & ${lab(b2.name, b2.category)}`;
}

export function formatDoublesMatchNotes(m: GeneratedDoublesMatch): string {
    const payload: DoublesLinePayload = {
        type: "doubles_line",
        categoryKey: m.categoryKey,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        sideA: m.sideA.map((p) => ({ id: p.participantId, name: p.name, category: p.category })),
        sideB: m.sideB.map((p) => ({ id: p.participantId, name: p.name, category: p.category })),
    };
    return `${NOTES_JSON_MARK}${JSON.stringify(payload)}`;
}
