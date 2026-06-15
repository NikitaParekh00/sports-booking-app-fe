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
    /** Non-fatal gaps if the roster graph cannot satisfy every rule */
    coverageNotes?: string[];
};

/** Both players Advanced (normalized) → this key; Adv+Adv sides only face other Adv+Adv. */
export const ADV_ADV_CATEGORY_KEY = "advanced+advanced";

function edgeKey(id1: string, id2: string): string {
    return id1 < id2 ? `${id1}\t${id2}` : `${id2}\t${id1}`;
}

function sidePairEdge(a: RosterPlayer, b: RosterPlayer): string {
    return edgeKey(a.participantId, b.participantId);
}

/**
 * Unordered key of doubles-side-vs-doubles-side matchup.
 * Same side pair can repeat, but not against the exact same opponent side pair again.
 */
function lineupDuelKey(
    pa: { a: RosterPlayer; b: RosterPlayer },
    pb: { a: RosterPlayer; b: RosterPlayer }
): string {
    return edgeKey(sidePairEdge(pa.a, pa.b), sidePairEdge(pb.a, pb.b));
}

/** Coverage add-ons must not push any participant past target appearances (keeps 36×12÷4 = 108 max). */
function allFourPlayersHaveRoom(plays: Record<string, number>, ids: string[], targetPerPlayer: number): boolean {
    return ids.every((id) => (plays[id] ?? 0) < targetPerPlayer);
}

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

/** Default max times the same two club teammates may share a side (no name list). */
const DEFAULT_TEAMMATE_PAIR_REPEAT_CAP = 4;

function buildNormalizedDisplayNameSet(rawNames?: string[]): Set<string> {
    const s = new Set<string>();
    for (const n of rawNames ?? []) {
        const t = n.trim().toLowerCase();
        if (t) s.add(t);
    }
    return s;
}

/**
 * Teammate-edge repeat cap when `teammateMax3RepeatPlayerNames` is set:
 * exactly one name on the list on that side → 3; both on the list → 4; neither → 4.
 * If no list is configured, uses DEFAULT_TEAMMATE_PAIR_REPEAT_CAP (4) for every side.
 */
function teammateEdgeRepeatCap(a: RosterPlayer, b: RosterPlayer, max3PartnerNameSet: Set<string>): number {
    if (max3PartnerNameSet.size === 0) return DEFAULT_TEAMMATE_PAIR_REPEAT_CAP;
    const na = a.name.trim().toLowerCase();
    const nb = b.name.trim().toLowerCase();
    const aListed = max3PartnerNameSet.has(na);
    const bListed = max3PartnerNameSet.has(nb);
    if (aListed && bListed) return 4;
    if (aListed || bListed) return 3;
    return 4;
}

function rosterHasAdvAdvPair(team: TeamRosterInput): boolean {
    return enumeratePairs(team.players).some((p) => p.key === ADV_ADV_CATEGORY_KEY);
}

function buildTeammateCoverage(matches: GeneratedDoublesMatch[]): Map<string, Set<string>> {
    const m = new Map<string, Set<string>>();
    for (const g of matches) {
        const [xa, xb] = g.sideA;
        const [ya, yb] = g.sideB;
        if (!m.has(g.teamAId)) m.set(g.teamAId, new Set());
        if (!m.has(g.teamBId)) m.set(g.teamBId, new Set());
        m.get(g.teamAId)!.add(edgeKey(xa.participantId, xb.participantId));
        m.get(g.teamBId)!.add(edgeKey(ya.participantId, yb.participantId));
    }
    return m;
}

/** Teams that have played at least one Adv+Adv doubles match (either side). */
function teamsSatisfiedAdvAdv(matches: GeneratedDoublesMatch[]): Set<string> {
    const s = new Set<string>();
    for (const g of matches) {
        if (g.categoryKey !== ADV_ADV_CATEGORY_KEY) continue;
        s.add(g.teamAId);
        s.add(g.teamBId);
    }
    return s;
}

/** Unordered team-pair keys that already have an Adv+Adv vs Adv+Adv match between them. */
function buildAdvAdvTeamPairKeys(matches: GeneratedDoublesMatch[]): Set<string> {
    const s = new Set<string>();
    for (const g of matches) {
        if (g.categoryKey !== ADV_ADV_CATEGORY_KEY) continue;
        s.add(edgeKey(g.teamAId, g.teamBId));
    }
    return s;
}

function countAdvAdvUnsatisfiedTeams(rosters: TeamRosterInput[], matches: GeneratedDoublesMatch[]): number {
    const sat = teamsSatisfiedAdvAdv(matches);
    let n = 0;
    for (const r of rosters) {
        if (rosterHasAdvAdvPair(r) && !sat.has(r.teamId)) n++;
    }
    return n;
}

/** Each unordered team pair (both can field Adv+Adv) must have ≥1 Adv+Adv vs Adv+Adv match. */
function countMissingAdvAdvTeamPairings(rosters: TeamRosterInput[], matches: GeneratedDoublesMatch[]): number {
    const sat = buildAdvAdvTeamPairKeys(matches);
    let n = 0;
    for (let i = 0; i < rosters.length; i++) {
        for (let j = i + 1; j < rosters.length; j++) {
            const A = rosters[i];
            const B = rosters[j];
            if (!rosterHasAdvAdvPair(A) || !rosterHasAdvAdvPair(B)) continue;
            if (!sat.has(edgeKey(A.teamId, B.teamId))) n++;
        }
    }
    return n;
}

/** Player on homeTeam played on an Adv+Adv side vs oppTeam's Adv+Adv side. */
function hasPlayerAdvAdvVersusTeam(
    matches: GeneratedDoublesMatch[],
    homeTeamId: string,
    playerId: string,
    oppTeamId: string
): boolean {
    for (const g of matches) {
        if (g.categoryKey !== ADV_ADV_CATEGORY_KEY) continue;
        if (g.teamAId === homeTeamId && g.teamBId === oppTeamId) {
            if (g.sideA.some((p) => p.participantId === playerId)) return true;
        }
        if (g.teamAId === oppTeamId && g.teamBId === homeTeamId) {
            if (g.sideB.some((p) => p.participantId === playerId)) return true;
        }
    }
    return false;
}

function playerIsInSomeAdvAdvPairOnTeam(team: TeamRosterInput, playerId: string): boolean {
    return enumeratePairs(team.players).some(
        (p) =>
            p.key === ADV_ADV_CATEGORY_KEY &&
            (p.a.participantId === playerId || p.b.participantId === playerId)
    );
}

function countMissingAdvancedPlayerAdvCross(rosters: TeamRosterInput[], matches: GeneratedDoublesMatch[]): number {
    let n = 0;
    for (const TA of rosters) {
        for (const pl of TA.players) {
            if (pl.categoryNorm !== "advanced") continue;
            if (!playerIsInSomeAdvAdvPairOnTeam(TA, pl.participantId)) continue;
            for (const TB of rosters) {
                if (TB.teamId === TA.teamId) continue;
                if (!rosterHasAdvAdvPair(TB)) continue;
                if (!hasPlayerAdvAdvVersusTeam(matches, TA.teamId, pl.participantId, TB.teamId)) n++;
            }
        }
    }
    return n;
}

/**
 * Human-readable gaps (after generation). Use for alerts / QA.
 */
export function reportDoublesConstraintGaps(
    rosters: TeamRosterInput[],
    matches: GeneratedDoublesMatch[]
): string[] {
    const notes: string[] = [];
    const cov = buildTeammateCoverage(matches);
    for (const r of rosters) {
        const c = cov.get(r.teamId) ?? new Set();
        const missing: string[] = [];
        for (const p of enumeratePairs(r.players)) {
            if (!c.has(edgeKey(p.a.participantId, p.b.participantId))) {
                missing.push(`${p.a.name} + ${p.b.name}`);
            }
        }
        if (missing.length > 0) {
            notes.push(
                `${r.teamName}: ${missing.length} teammate pair(s) never played together on the same side (e.g. ${missing.slice(0, 3).join("; ")}${missing.length > 3 ? "…" : ""}).`
            );
        }
    }
    return notes;
}

/** One Adv+Adv vs Adv+Adv match for a team pair that does not have one yet. */
function tryAppendAdvAdvTeamPairing(
    rosters: TeamRosterInput[],
    matches: GeneratedDoublesMatch[],
    plays: Record<string, number>,
    teamCoverage: Map<string, Set<string>>,
    advAdvSatisfied: Set<string>,
    pairSat: Set<string>,
    usedLineupDuels: Set<string>,
    targetPerPlayer: number,
    teammatePairCountsByName: Map<string, number>,
    teammatePairCapMap: TeammatePairCapMap,
    teammatePairCountsById: Map<string, number>
): boolean {
    const pushMatch = (TA: TeamRosterInput, TB: TeamRosterInput, pa: { a: RosterPlayer; b: RosterPlayer; key: string }, pb: { a: RosterPlayer; b: RosterPlayer; key: string }) => {
        const duel = lineupDuelKey(pa, pb);
        if (usedLineupDuels.has(duel)) return false;
        if (teammatePairWouldExceedNameCap(pa.a, pa.b, teammatePairCountsByName, teammatePairCapMap)) return false;
        if (teammatePairWouldExceedNameCap(pb.a, pb.b, teammatePairCountsByName, teammatePairCapMap)) return false;
        const capA = DEFAULT_TEAMMATE_PAIR_REPEAT_CAP;
        const capB = DEFAULT_TEAMMATE_PAIR_REPEAT_CAP;
        if (teammatePairWouldExceedRepeatCap(pa.a, pa.b, teammatePairCountsById, capA)) return false;
        if (teammatePairWouldExceedRepeatCap(pb.a, pb.b, teammatePairCountsById, capB)) return false;
        const ids = [pa.a.participantId, pa.b.participantId, pb.a.participantId, pb.b.participantId];
        if (!allFourPlayersHaveRoom(plays, ids, targetPerPlayer)) return false;
        ids.forEach((id) => {
            plays[id] = (plays[id] ?? 0) + 1;
        });
        recordTeammatePairByName(pa.a, pa.b, teammatePairCountsByName);
        recordTeammatePairByName(pb.a, pb.b, teammatePairCountsByName);
        recordTeammatePairById(pa.a, pa.b, teammatePairCountsById);
        recordTeammatePairById(pb.a, pb.b, teammatePairCountsById);
        matches.push({
            teamAId: TA.teamId,
            teamBId: TB.teamId,
            teamAName: TA.teamName,
            teamBName: TB.teamName,
            sideA: [pa.a, pa.b],
            sideB: [pb.a, pb.b],
            categoryKey: pa.key,
        });
        if (!teamCoverage.has(TA.teamId)) teamCoverage.set(TA.teamId, new Set());
        if (!teamCoverage.has(TB.teamId)) teamCoverage.set(TB.teamId, new Set());
        teamCoverage.get(TA.teamId)!.add(edgeKey(pa.a.participantId, pa.b.participantId));
        teamCoverage.get(TB.teamId)!.add(edgeKey(pb.a.participantId, pb.b.participantId));
        advAdvSatisfied.add(TA.teamId);
        advAdvSatisfied.add(TB.teamId);
        pairSat.add(edgeKey(TA.teamId, TB.teamId));
        usedLineupDuels.add(duel);
        return true;
    };

    for (let i = 0; i < rosters.length; i++) {
        for (let j = i + 1; j < rosters.length; j++) {
            const TA = rosters[i];
            const TB = rosters[j];
            if (!rosterHasAdvAdvPair(TA) || !rosterHasAdvAdvPair(TB)) continue;
            const pk = edgeKey(TA.teamId, TB.teamId);
            if (pairSat.has(pk)) continue;
            const advPairsA = enumeratePairs(TA.players).filter((p) => p.key === ADV_ADV_CATEGORY_KEY);
            const advPairsB = enumeratePairs(TB.players).filter((p) => p.key === ADV_ADV_CATEGORY_KEY);
            for (const pa of advPairsA) {
                for (const pb of advPairsB) {
                    if (pushMatch(TA, TB, pa, pb)) return true;
                }
            }
        }
    }
    return false;
}

/** Each Advanced player on TA appears in ≥1 Adv+Adv vs Adv+Adv vs each other Adv-capable team TB. */
function tryAppendAdvancedPlayerVersusAdvTeam(
    rosters: TeamRosterInput[],
    matches: GeneratedDoublesMatch[],
    plays: Record<string, number>,
    teamCoverage: Map<string, Set<string>>,
    advAdvSatisfied: Set<string>,
    pairSat: Set<string>,
    usedLineupDuels: Set<string>,
    targetPerPlayer: number,
    teammatePairCountsByName: Map<string, number>,
    teammatePairCapMap: TeammatePairCapMap,
    teammatePairCountsById: Map<string, number>
): boolean {
    const pushMatch = (TA: TeamRosterInput, TB: TeamRosterInput, pa: { a: RosterPlayer; b: RosterPlayer; key: string }, pb: { a: RosterPlayer; b: RosterPlayer; key: string }) => {
        const duel = lineupDuelKey(pa, pb);
        if (usedLineupDuels.has(duel)) return false;
        if (teammatePairWouldExceedNameCap(pa.a, pa.b, teammatePairCountsByName, teammatePairCapMap)) return false;
        if (teammatePairWouldExceedNameCap(pb.a, pb.b, teammatePairCountsByName, teammatePairCapMap)) return false;
        const capA = DEFAULT_TEAMMATE_PAIR_REPEAT_CAP;
        const capB = DEFAULT_TEAMMATE_PAIR_REPEAT_CAP;
        if (teammatePairWouldExceedRepeatCap(pa.a, pa.b, teammatePairCountsById, capA)) return false;
        if (teammatePairWouldExceedRepeatCap(pb.a, pb.b, teammatePairCountsById, capB)) return false;
        const ids = [pa.a.participantId, pa.b.participantId, pb.a.participantId, pb.b.participantId];
        if (!allFourPlayersHaveRoom(plays, ids, targetPerPlayer)) return false;
        ids.forEach((id) => {
            plays[id] = (plays[id] ?? 0) + 1;
        });
        recordTeammatePairByName(pa.a, pa.b, teammatePairCountsByName);
        recordTeammatePairByName(pb.a, pb.b, teammatePairCountsByName);
        recordTeammatePairById(pa.a, pa.b, teammatePairCountsById);
        recordTeammatePairById(pb.a, pb.b, teammatePairCountsById);
        matches.push({
            teamAId: TA.teamId,
            teamBId: TB.teamId,
            teamAName: TA.teamName,
            teamBName: TB.teamName,
            sideA: [pa.a, pa.b],
            sideB: [pb.a, pb.b],
            categoryKey: pa.key,
        });
        if (!teamCoverage.has(TA.teamId)) teamCoverage.set(TA.teamId, new Set());
        if (!teamCoverage.has(TB.teamId)) teamCoverage.set(TB.teamId, new Set());
        teamCoverage.get(TA.teamId)!.add(edgeKey(pa.a.participantId, pa.b.participantId));
        teamCoverage.get(TB.teamId)!.add(edgeKey(pb.a.participantId, pb.b.participantId));
        advAdvSatisfied.add(TA.teamId);
        advAdvSatisfied.add(TB.teamId);
        pairSat.add(edgeKey(TA.teamId, TB.teamId));
        usedLineupDuels.add(duel);
        return true;
    };

    for (const TA of rosters) {
        for (const pl of TA.players) {
            if (pl.categoryNorm !== "advanced") continue;
            if (!playerIsInSomeAdvAdvPairOnTeam(TA, pl.participantId)) continue;
            for (const TB of rosters) {
                if (TB.teamId === TA.teamId) continue;
                if (!rosterHasAdvAdvPair(TB)) continue;
                if (hasPlayerAdvAdvVersusTeam(matches, TA.teamId, pl.participantId, TB.teamId)) continue;
                const advPairsA = enumeratePairs(TA.players).filter(
                    (p) =>
                        p.key === ADV_ADV_CATEGORY_KEY &&
                        (p.a.participantId === pl.participantId || p.b.participantId === pl.participantId)
                );
                const advPairsB = enumeratePairs(TB.players).filter((p) => p.key === ADV_ADV_CATEGORY_KEY);
                for (const pa of advPairsA) {
                    for (const pb of advPairsB) {
                        if (pushMatch(TA, TB, pa, pb)) return true;
                    }
                }
            }
        }
    }
    return false;
}

/**
 * Guarantee (within appearance caps): for each unordered pair of teams that can both field
 * Advanced+Advanced, schedule exactly one match with each side’s Adv+Adv pair vs the other’s.
 * Runs before the main greedy loop so this does not compete with mixed lineups for budget.
 */
function seedAdvAdvVersusEveryAdvTeamPair(
    rosters: TeamRosterInput[],
    matches: GeneratedDoublesMatch[],
    plays: Record<string, number>,
    teamCoverage: Map<string, Set<string>>,
    usedLineupDuels: Set<string>,
    targetPerPlayer: number,
    teammatePairCountsByName: Map<string, number>,
    teammatePairCapMap: TeammatePairCapMap,
    teammatePairCountsById: Map<string, number>
): void {
    const indexPairs: [number, number][] = [];
    for (let i = 0; i < rosters.length; i++) {
        for (let j = i + 1; j < rosters.length; j++) {
            indexPairs.push([i, j]);
        }
    }
    for (let k = indexPairs.length - 1; k > 0; k--) {
        const r = Math.floor(Math.random() * (k + 1));
        [indexPairs[k], indexPairs[r]] = [indexPairs[r], indexPairs[k]];
    }

    for (const [i, j] of indexPairs) {
        const TA = rosters[i];
        const TB = rosters[j];
        if (!rosterHasAdvAdvPair(TA) || !rosterHasAdvAdvPair(TB)) continue;

        const advPairsA = enumeratePairs(TA.players).filter((p) => p.key === ADV_ADV_CATEGORY_KEY);
        const advPairsB = enumeratePairs(TB.players).filter((p) => p.key === ADV_ADV_CATEGORY_KEY);
        if (advPairsA.length === 0 || advPairsB.length === 0) continue;

        for (let ka = advPairsA.length - 1; ka > 0; ka--) {
            const r = Math.floor(Math.random() * (ka + 1));
            [advPairsA[ka], advPairsA[r]] = [advPairsA[r], advPairsA[ka]];
        }
        for (let kb = advPairsB.length - 1; kb > 0; kb--) {
            const r = Math.floor(Math.random() * (kb + 1));
            [advPairsB[kb], advPairsB[r]] = [advPairsB[r], advPairsB[kb]];
        }

        const pa = advPairsA[0];
        const pb = advPairsB[0];
        const ids = [pa.a.participantId, pa.b.participantId, pb.a.participantId, pb.b.participantId];
        if (!allFourPlayersHaveRoom(plays, ids, targetPerPlayer)) continue;
        const duel = lineupDuelKey(pa, pb);
        if (usedLineupDuels.has(duel)) continue;
        if (teammatePairWouldExceedNameCap(pa.a, pa.b, teammatePairCountsByName, teammatePairCapMap)) continue;
        if (teammatePairWouldExceedNameCap(pb.a, pb.b, teammatePairCountsByName, teammatePairCapMap)) continue;
        const capA = DEFAULT_TEAMMATE_PAIR_REPEAT_CAP;
        const capB = DEFAULT_TEAMMATE_PAIR_REPEAT_CAP;
        if (teammatePairWouldExceedRepeatCap(pa.a, pa.b, teammatePairCountsById, capA)) continue;
        if (teammatePairWouldExceedRepeatCap(pb.a, pb.b, teammatePairCountsById, capB)) continue;

        ids.forEach((id) => {
            plays[id] = (plays[id] ?? 0) + 1;
        });
        recordTeammatePairByName(pa.a, pa.b, teammatePairCountsByName);
        recordTeammatePairByName(pb.a, pb.b, teammatePairCountsByName);
        recordTeammatePairById(pa.a, pa.b, teammatePairCountsById);
        recordTeammatePairById(pb.a, pb.b, teammatePairCountsById);
        matches.push({
            teamAId: TA.teamId,
            teamBId: TB.teamId,
            teamAName: TA.teamName,
            teamBName: TB.teamName,
            sideA: [pa.a, pa.b],
            sideB: [pb.a, pb.b],
            categoryKey: pa.key,
        });
        const covA = teamCoverage.get(TA.teamId)!;
        const covB = teamCoverage.get(TB.teamId)!;
        covA.add(edgeKey(pa.a.participantId, pa.b.participantId));
        covB.add(edgeKey(pb.a.participantId, pb.b.participantId));
        usedLineupDuels.add(duel);
    }
}

/** Normalize participant category for matching (case-insensitive trim). */
export function normalizeCategoryLabel(raw: string | null | undefined): string {
    let t = (raw ?? "").trim().toLowerCase();
    if (t === "emereging") t = "emerging"; // common DB/UI typo
    return t || "";
}

/**
 * If every participant reached `targetPerPlayer` appearances, match count would be
 * (number of participants × target) / 4 (each doubles match adds one appearance to 4 players).
 * That number is only achievable if skill-matched pairings allow it; often fewer matches are possible.
 */
export function theoreticalDoublesMatchCountIfFullyMet(totalParticipants: number, targetPerPlayer: number): number {
    if (totalParticipants <= 0 || targetPerPlayer <= 0) return 0;
    return (totalParticipants * targetPerPlayer) / 4;
}

/**
 * @param rosters One entry per club team; each must list all squad players with categories set.
 * @param targetPerPlayer Each player should play this many doubles matches (vs other teams).
 */
function cmpScheduleQuality(a: DoublesScheduleResult, b: DoublesScheduleResult): number {
    if (a.matches.length !== b.matches.length) return b.matches.length - a.matches.length;
    if (a.unmetPlayerIds.length !== b.unmetPlayerIds.length) return a.unmetPlayerIds.length - b.unmetPlayerIds.length;
    return 0;
}

function shuffleInPlace<T>(arr: T[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function buildTeamPairs(rosters: TeamRosterInput[]): [TeamRosterInput, TeamRosterInput][] {
    const teamPairs: [TeamRosterInput, TeamRosterInput][] = [];
    for (let i = 0; i < rosters.length; i++) {
        for (let j = i + 1; j < rosters.length; j++) {
            teamPairs.push([rosters[i], rosters[j]]);
        }
    }
    return teamPairs;
}

type GreedyDoublesState = {
    matches: GeneratedDoublesMatch[];
    plays: Record<string, number>;
    teammatePairCountsByName: Map<string, number>;
    teammatePairCountsById: Map<string, number>;
    teamCoverage: Map<string, Set<string>>;
    usedLineupDuels: Set<string>;
};

function buildStateFromMatches(initialMatches: GeneratedDoublesMatch[], rosters: TeamRosterInput[]): GreedyDoublesState {
    const plays: Record<string, number> = {};
    rosters.forEach((r) => {
        r.players.forEach((p) => {
            plays[p.participantId] = 0;
        });
    });
    const teammatePairCountsByName = new Map<string, number>();
    const teammatePairCountsById = new Map<string, number>();
    const teamCoverage = new Map<string, Set<string>>();
    rosters.forEach((r) => teamCoverage.set(r.teamId, new Set()));
    const usedLineupDuels = new Set<string>();
    const matches: GeneratedDoublesMatch[] = [];

    for (const m of initialMatches) {
        const pa = { a: m.sideA[0], b: m.sideA[1], key: m.categoryKey };
        const pb = { a: m.sideB[0], b: m.sideB[1], key: m.categoryKey };
        const ids = [pa.a.participantId, pa.b.participantId, pb.a.participantId, pb.b.participantId];
        for (const id of ids) {
            plays[id] = (plays[id] ?? 0) + 1;
        }
        recordTeammatePairByName(pa.a, pa.b, teammatePairCountsByName);
        recordTeammatePairByName(pb.a, pb.b, teammatePairCountsByName);
        recordTeammatePairById(pa.a, pa.b, teammatePairCountsById);
        recordTeammatePairById(pb.a, pb.b, teammatePairCountsById);
        usedLineupDuels.add(lineupDuelKey(pa, pb));
        teamCoverage.get(m.teamAId)!.add(edgeKey(pa.a.participantId, pa.b.participantId));
        teamCoverage.get(m.teamBId)!.add(edgeKey(pb.a.participantId, pb.b.participantId));
        matches.push({
            teamAId: m.teamAId,
            teamBId: m.teamBId,
            teamAName: m.teamAName,
            teamBName: m.teamBName,
            sideA: [m.sideA[0], m.sideA[1]],
            sideB: [m.sideB[0], m.sideB[1]],
            categoryKey: m.categoryKey,
        });
    }

    return { matches, plays, teammatePairCountsByName, teammatePairCountsById, teamCoverage, usedLineupDuels };
}

function greedyStateToResult(state: GreedyDoublesState, targetPerPlayer: number): DoublesScheduleResult {
    const unmetPlayerIds = Object.entries(state.plays)
        .filter(([, c]) => c < targetPerPlayer)
        .map(([id]) => id);
    return {
        matches: state.matches,
        counts: state.plays,
        unmetPlayerIds,
        targetPerPlayer,
        coverageNotes: undefined,
    };
}

function greedyExtendUntilStuck(
    rosters: TeamRosterInput[],
    targetPerPlayer: number,
    options: GenerateBalancedDoublesOptions | undefined,
    state: GreedyDoublesState,
    teamPairs: [TeamRosterInput, TeamRosterInput][]
): void {
    const teammatePairCapMap = buildTeammatePairCapMap(options?.teammatePairNameCaps);
    const teammateMax3PartnerNameSet = buildNormalizedDisplayNameSet(options?.teammateMax3RepeatPlayerNames);
    const { matches, plays, teammatePairCountsByName, teammatePairCountsById, teamCoverage, usedLineupDuels } = state;

    const allSatisfied = () => Object.values(plays).every((c) => c >= targetPerPlayer);
    let stagnation = 0;
    const maxStagnation = Math.max(200, rosters.length * rosters.length * targetPerPlayer * 4);

    type MainCand = {
        score: number;
        TA: TeamRosterInput;
        TB: TeamRosterInput;
        pa: { a: RosterPlayer; b: RosterPlayer; key: string };
        pb: { a: RosterPlayer; b: RosterPlayer; key: string };
    };

    while (!allSatisfied() && stagnation < maxStagnation) {
        const pool: MainCand[] = [];
        for (const [TA, TB] of teamPairs) {
            const pairsA = enumeratePairs(TA.players);
            const pairsB = enumeratePairs(TB.players);
            const byKeyB = new Map<string, { a: RosterPlayer; b: RosterPlayer; key: string }[]>();
            for (const pb of pairsB) {
                if (!byKeyB.has(pb.key)) byKeyB.set(pb.key, []);
                byKeyB.get(pb.key)!.push(pb);
            }

            for (const pa of pairsA) {
                const listB = byKeyB.get(pa.key);
                if (!listB?.length) continue;
                for (const pb of listB) {
                    if (teammatePairWouldExceedNameCap(pa.a, pa.b, teammatePairCountsByName, teammatePairCapMap)) continue;
                    if (teammatePairWouldExceedNameCap(pb.a, pb.b, teammatePairCountsByName, teammatePairCapMap)) continue;
                    const capA = teammateEdgeRepeatCap(pa.a, pa.b, teammateMax3PartnerNameSet);
                    const capB = teammateEdgeRepeatCap(pb.a, pb.b, teammateMax3PartnerNameSet);
                    if (teammatePairWouldExceedRepeatCap(pa.a, pa.b, teammatePairCountsById, capA)) continue;
                    if (teammatePairWouldExceedRepeatCap(pb.a, pb.b, teammatePairCountsById, capB)) continue;
                    const ids = [pa.a.participantId, pa.b.participantId, pb.a.participantId, pb.b.participantId];
                    if (ids.some((id) => plays[id] >= targetPerPlayer)) continue;
                    const score = Math.min(...ids.map((id) => plays[id]));
                    if (usedLineupDuels.has(lineupDuelKey(pa, pb))) continue;
                    pool.push({ score, TA, TB, pa, pb });
                }
            }
        }

        if (pool.length === 0) {
            stagnation += 1;
            continue;
        }

        pool.sort((x, y) => {
            if (x.score !== y.score) return x.score - y.score;
            return Math.random() - 0.5;
        });
        const pick = pool[0];
        const { TA, TB, pa, pb } = pick;
        const covA = teamCoverage.get(TA.teamId)!;
        const covB = teamCoverage.get(TB.teamId)!;
        const ids = [pa.a.participantId, pa.b.participantId, pb.a.participantId, pb.b.participantId];
        ids.forEach((id) => {
            plays[id] += 1;
        });
        recordTeammatePairByName(pa.a, pa.b, teammatePairCountsByName);
        recordTeammatePairByName(pb.a, pb.b, teammatePairCountsByName);
        recordTeammatePairById(pa.a, pa.b, teammatePairCountsById);
        recordTeammatePairById(pb.a, pb.b, teammatePairCountsById);
        matches.push({
            teamAId: TA.teamId,
            teamBId: TB.teamId,
            teamAName: TA.teamName,
            teamBName: TB.teamName,
            sideA: [pa.a, pa.b],
            sideB: [pb.a, pb.b],
            categoryKey: pa.key,
        });
        covA.add(edgeKey(pa.a.participantId, pa.b.participantId));
        covB.add(edgeKey(pb.a.participantId, pb.b.participantId));
        usedLineupDuels.add(lineupDuelKey(pa, pb));
        stagnation = 0;
    }
}

function generateBalancedDoublesScheduleOnce(
    rosters: TeamRosterInput[],
    targetPerPlayer: number,
    options?: GenerateBalancedDoublesOptions
): DoublesScheduleResult {
    const teamPairs = buildTeamPairs(rosters);
    shuffleInPlace(teamPairs);
    const state = buildStateFromMatches([], rosters);
    greedyExtendUntilStuck(rosters, targetPerPlayer, options, state, teamPairs);
    return greedyStateToResult(state, targetPerPlayer);
}

export type GenerateBalancedDoublesOptions = {
    /**
     * Run the greedy builder this many times with different random shuffles; keep the best result
     * (most matches, then fewest players below target). Improves chances of reaching ~theoretical max.
     */
    randomTrials?: number;
    /**
     * Optional caps for specific teammate pairs by display name (case-insensitive).
     * Example: [{ playerAName: "Vijay G", playerBName: "Jignesh", maxTogether: 2 }]
     */
    teammatePairNameCaps?: { playerAName: string; playerBName: string; maxTogether: number }[];
    /**
     * Display names (trim/case-insensitive): if exactly one player on a side is on the list,
     * that teammate pair may repeat at most 3 times; if both are on the list, or neither, cap is 4.
     */
    teammateMax3RepeatPlayerNames?: string[];
    /**
     * After random trials, run this many local-search steps (remove random matches, reshuffle, greedy refill).
     * Helps escape 107-vs-108 style local optima. Set 0 to disable.
     */
    localSearchIterations?: number;
};

function normalizeNameForCap(raw: string): string {
    return raw.trim().toLowerCase();
}

function teammatePairCapKeyByName(aName: string, bName: string): string {
    const a = normalizeNameForCap(aName);
    const b = normalizeNameForCap(bName);
    return a < b ? `${a}\t${b}` : `${b}\t${a}`;
}

function buildTeammatePairCountsByName(matches: GeneratedDoublesMatch[]): Map<string, number> {
    const out = new Map<string, number>();
    for (const m of matches) {
        const [a1, a2] = m.sideA;
        const [b1, b2] = m.sideB;
        const k1 = teammatePairCapKeyByName(a1.name, a2.name);
        const k2 = teammatePairCapKeyByName(b1.name, b2.name);
        out.set(k1, (out.get(k1) ?? 0) + 1);
        out.set(k2, (out.get(k2) ?? 0) + 1);
    }
    return out;
}

type TeammatePairCapMap = Map<string, number>;

function buildTeammatePairCapMap(
    caps?: { playerAName: string; playerBName: string; maxTogether: number }[]
): TeammatePairCapMap {
    const out = new Map<string, number>();
    for (const c of caps ?? []) {
        const key = teammatePairCapKeyByName(c.playerAName, c.playerBName);
        out.set(key, Math.max(0, Math.floor(c.maxTogether)));
    }
    return out;
}

function teammatePairWouldExceedNameCap(
    a: RosterPlayer,
    b: RosterPlayer,
    counts: Map<string, number>,
    caps: TeammatePairCapMap
): boolean {
    if (caps.size === 0) return false;
    const key = teammatePairCapKeyByName(a.name, b.name);
    const cap = caps.get(key);
    if (cap === undefined) return false;
    return (counts.get(key) ?? 0) + 1 > cap;
}

function recordTeammatePairByName(a: RosterPlayer, b: RosterPlayer, counts: Map<string, number>): void {
    const key = teammatePairCapKeyByName(a.name, b.name);
    counts.set(key, (counts.get(key) ?? 0) + 1);
}

function teammatePairWouldExceedRepeatCap(
    a: RosterPlayer,
    b: RosterPlayer,
    counts: Map<string, number>,
    maxTeammatePairings: number | null
): boolean {
    if (maxTeammatePairings == null) return false;
    const cap = Math.max(0, Math.floor(maxTeammatePairings));
    if (cap <= 0) return true;
    const key = edgeKey(a.participantId, b.participantId);
    return (counts.get(key) ?? 0) + 1 > cap;
}

function recordTeammatePairById(a: RosterPlayer, b: RosterPlayer, counts: Map<string, number>): void {
    const key = edgeKey(a.participantId, b.participantId);
    counts.set(key, (counts.get(key) ?? 0) + 1);
}

function teammateNameCapViolationCount(
    matches: GeneratedDoublesMatch[],
    caps?: { playerAName: string; playerBName: string; maxTogether: number }[]
): number {
    if (!caps || caps.length === 0) return 0;
    const counts = buildTeammatePairCountsByName(matches);
    let violations = 0;
    for (const c of caps) {
        const key = teammatePairCapKeyByName(c.playerAName, c.playerBName);
        const seen = counts.get(key) ?? 0;
        const maxTogether = Math.max(0, Math.floor(c.maxTogether));
        if (seen > maxTogether) violations += seen - maxTogether;
    }
    return violations;
}

function localSearchRefineDoubles(
    result: DoublesScheduleResult,
    rosters: TeamRosterInput[],
    options: GenerateBalancedDoublesOptions | undefined,
    iterations: number
): DoublesScheduleResult {
    if (iterations <= 0) return result;
    let best = result;
    let bestCapViolations = teammateNameCapViolationCount(best.matches, options?.teammatePairNameCaps);
    const nPlayers = rosters.reduce((s, r) => s + r.players.length, 0);
    const target = best.targetPerPlayer;
    const theoreticalMaxMatches =
        nPlayers > 0 && target > 0 && (nPlayers * target) % 4 === 0 ? (nPlayers * target) / 4 : -1;

    for (let it = 0; it < iterations; it++) {
        if (
            best.unmetPlayerIds.length === 0 &&
            theoreticalMaxMatches > 0 &&
            best.matches.length >= theoreticalMaxMatches
        ) {
            break;
        }
        const m = best.matches;
        if (m.length === 0) continue;
        const maxK = Math.min(6, m.length);
        const k = 1 + Math.floor(Math.random() * maxK);
        const drop = new Set<number>();
        while (drop.size < k) {
            drop.add(Math.floor(Math.random() * m.length));
        }
        const reduced = m.filter((_, i) => !drop.has(i));
        const state = buildStateFromMatches(reduced, rosters);
        const teamPairs = buildTeamPairs(rosters);
        shuffleInPlace(teamPairs);
        greedyExtendUntilStuck(rosters, target, options, state, teamPairs);
        const candidate = greedyStateToResult(state, target);
        const v = teammateNameCapViolationCount(candidate.matches, options?.teammatePairNameCaps);
        const qualityCmp = cmpScheduleQuality(candidate, best);
        if (qualityCmp < 0 || (qualityCmp === 0 && v < bestCapViolations)) {
            best = candidate;
            bestCapViolations = v;
        }
    }
    return best;
}

/**
 * @param rosters One entry per club team; each must list all squad players with categories set.
 * @param targetPerPlayer Each player should play this many doubles matches (vs other teams).
 */
export function generateBalancedDoublesSchedule(
    rosters: TeamRosterInput[],
    targetPerPlayer: number,
    options?: GenerateBalancedDoublesOptions
): DoublesScheduleResult {
    const trials = Math.max(1, Math.min(120, options?.randomTrials ?? 60));
    let best: DoublesScheduleResult | null = null;
    let bestCapViolations = Number.POSITIVE_INFINITY;
    for (let t = 0; t < trials; t++) {
        const r = generateBalancedDoublesScheduleOnce(rosters, targetPerPlayer, options);
        const v = teammateNameCapViolationCount(r.matches, options?.teammatePairNameCaps);
        if (!best) {
            best = r;
            bestCapViolations = v;
            continue;
        }
        const qualityCmp = cmpScheduleQuality(r, best);
        // Keep core schedule quality primary (match count / unmet players),
        // then use name-pair caps only as a tie-breaker.
        if (qualityCmp < 0 || (qualityCmp === 0 && v < bestCapViolations)) {
            best = r;
            bestCapViolations = v;
        }
    }
    const localIters = options?.localSearchIterations ?? 400;
    if (best && localIters > 0) {
        best = localSearchRefineDoubles(best, rosters, options, localIters);
        bestCapViolations = teammateNameCapViolationCount(best.matches, options?.teammatePairNameCaps);
    }
    if (best && options?.teammatePairNameCaps?.length) {
        const lines = [...(best.coverageNotes ?? [])];
        const counts = buildTeammatePairCountsByName(best.matches);
        for (const c of options.teammatePairNameCaps) {
            const key = teammatePairCapKeyByName(c.playerAName, c.playerBName);
            const seen = counts.get(key) ?? 0;
            if (seen > c.maxTogether) {
                lines.push(
                    `Pair cap unmet: ${c.playerAName} + ${c.playerBName} appeared together ${seen} time(s), cap is ${c.maxTogether}.`
                );
            }
        }
        best.coverageNotes = lines.length > 0 ? lines : undefined;
    }
    return best!;
}

/**
 * Count-only generator:
 * - no category constraints
 * - no advanced coverage checks
 * - no teammate-repeat constraints
 * Produces exact target appearances per player when feasible.
 */
export function generateDoublesScheduleByCountsOnly(
    rosters: TeamRosterInput[],
    targetPerPlayer: number,
): DoublesScheduleResult {
    const target = Math.max(1, Math.floor(targetPerPlayer));
    const nTeams = rosters.length;
    const teamById = new Map(rosters.map((r) => [r.teamId, r]));
    const teamIds = rosters.map((r) => r.teamId);
    const teamPairKey = (a: string, b: string) => (a < b ? `${a}\t${b}` : `${b}\t${a}`);

    // 1) Build per-team pair pool without forced 2/3 teammate distribution.
    const teamPairRemaining = new Map<string, number>();
    for (const r of rosters) {
        const pairs = enumeratePairs(r.players);
        for (const p of pairs) {
            const k = `${r.teamId}\t${edgeKey(p.a.participantId, p.b.participantId)}`;
            teamPairRemaining.set(k, target);
        }
    }

    // 2) Team-vs-team counts from greedy degree pairing (no forced 7/8 split).
    const sidePerTeam = Math.floor(((rosters[0]?.players.length ?? 0) * target) / 2);
    const edgeCounts = new Map<string, number>();
    const deg = new Map(teamIds.map((id) => [id, sidePerTeam]));
    for (let guard = 0; guard < 10000; guard++) {
        const ordered = [...teamIds].map((id) => ({ id, d: deg.get(id) ?? 0 })).sort((a, b) => b.d - a.d);
        if ((ordered[0]?.d ?? 0) === 0) break;
        if ((ordered[1]?.d ?? 0) === 0) break;
        const a = ordered[0].id;
        const b = ordered[1].id;
        deg.set(a, (deg.get(a) ?? 0) - 1);
        deg.set(b, (deg.get(b) ?? 0) - 1);
        const ek = teamPairKey(a, b);
        edgeCounts.set(ek, (edgeCounts.get(ek) ?? 0) + 1);
    }

    const matches: GeneratedDoublesMatch[] = [];
    const selectPairCombo = (teamAId: string, teamBId: string): { sideA: [RosterPlayer, RosterPlayer]; sideB: [RosterPlayer, RosterPlayer] } | null => {
        const teamA = teamById.get(teamAId);
        const teamB = teamById.get(teamBId);
        if (!teamA || !teamB) return null;
        const pairsA = enumeratePairs(teamA.players)
            .map((p) => {
                const pk = `${teamAId}\t${edgeKey(p.a.participantId, p.b.participantId)}`;
                const remPair = teamPairRemaining.get(pk) ?? 0;
                return { p, pk, remPair };
            })
            .filter((x) => x.remPair > 0);
        const pairsB = enumeratePairs(teamB.players)
            .map((p) => {
                const pk = `${teamBId}\t${edgeKey(p.a.participantId, p.b.participantId)}`;
                const remPair = teamPairRemaining.get(pk) ?? 0;
                return { p, pk, remPair };
            })
            .filter((x) => x.remPair > 0);

        let best: { a: typeof pairsA[number]; b: typeof pairsB[number]; score: number } | null = null;
        for (const a of pairsA) {
            for (const b of pairsB) {
                if (a.p.key !== b.p.key) continue;
                const sideA: [RosterPlayer, RosterPlayer] = [a.p.a, a.p.b];
                const sideB: [RosterPlayer, RosterPlayer] = [b.p.a, b.p.b];
                const score = a.remPair + b.remPair;
                if (!best || score > best.score || (score === best.score && Math.random() < 0.5)) best = { a, b, score };
            }
        }
        if (!best) return null;
        teamPairRemaining.set(best.a.pk, (teamPairRemaining.get(best.a.pk) ?? 0) - 1);
        teamPairRemaining.set(best.b.pk, (teamPairRemaining.get(best.b.pk) ?? 0) - 1);
        return { sideA: [best.a.p.a, best.a.p.b], sideB: [best.b.p.a, best.b.p.b] };
    };

    const edges = [...edgeCounts.entries()]
        .map(([k, n]) => {
            const [a, b] = k.split("\t");
            return { a, b, n };
        })
        .sort((x, y) => (y.n !== x.n ? y.n - x.n : Math.random() - 0.5));
    for (const e of edges) {
        for (let i = 0; i < e.n; i++) {
            const chosen = selectPairCombo(e.a, e.b);
            if (!chosen) continue;
            matches.push({
                teamAId: e.a,
                teamBId: e.b,
                teamAName: teamById.get(e.a)?.teamName ?? e.a,
                teamBName: teamById.get(e.b)?.teamName ?? e.b,
                sideA: chosen.sideA,
                sideB: chosen.sideB,
                categoryKey: pairKey(chosen.sideA[0], chosen.sideA[1]),
            });
        }
    }

    const counts: Record<string, number> = {};
    for (const r of rosters) for (const p of r.players) counts[p.participantId] = 0;
    for (const m of matches) {
        for (const p of [...m.sideA, ...m.sideB]) counts[p.participantId] = (counts[p.participantId] ?? 0) + 1;
    }
    const unmetPlayerIds = Object.entries(counts).filter(([, c]) => c < target).map(([id]) => id);
    const coverageNotes: string[] = [];
    if (unmetPlayerIds.length > 0) {
        coverageNotes.push(`${unmetPlayerIds.length} player(s) below ${target} matches.`);
    }
    return {
        matches,
        counts,
        unmetPlayerIds,
        targetPerPlayer: target,
        coverageNotes: coverageNotes.length > 0 ? coverageNotes : undefined,
    };
}

/**
 * Single-team mode:
 * Generate matches only for one focus team so each of its players reaches target appearances.
 * Opponent appearances are unconstrained.
 */
export function generateDoublesScheduleForTeamOnly(
    rosters: TeamRosterInput[],
    focusTeamId: string,
    targetPerPlayer: number,
): DoublesScheduleResult {
    const focus = rosters.find((r) => r.teamId === focusTeamId);
    if (!focus) {
        return { matches: [], counts: {}, unmetPlayerIds: [], targetPerPlayer, coverageNotes: ["Focus team not found."] };
    }
    const opponents = rosters.filter((r) => r.teamId !== focusTeamId);
    if (opponents.length === 0) {
        return { matches: [], counts: {}, unmetPlayerIds: [], targetPerPlayer, coverageNotes: ["Need at least one opponent team."] };
    }
    const target = Math.max(1, Math.floor(targetPerPlayer));
    const focusRemaining = new Map<string, number>(focus.players.map((p) => [p.participantId, target]));
    const oppUse = new Map<string, number>(opponents.map((o) => [o.teamId, 0]));
    const matches: GeneratedDoublesMatch[] = [];
    const focusPairs = enumeratePairs(focus.players);
    const pairNeed = new Map<string, number>();
    const pairKeyLocal = (p1: string, p2: string) => edgeKey(p1, p2);
    for (const p of focusPairs) pairNeed.set(pairKeyLocal(p.a.participantId, p.b.participantId), 2);
    // For 6 players and target 12: exactly six pair-links get one extra (become 3) so each player gets +2.
    if (focus.players.length === 6 && target === 12) {
        const cyc = [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 4],
            [4, 5],
            [5, 0],
        ] as const;
        for (const [i, j] of cyc) {
            const k = pairKeyLocal(focus.players[i].participantId, focus.players[j].participantId);
            pairNeed.set(k, (pairNeed.get(k) ?? 0) + 1);
        }
    }

    const wantedMatches = Math.floor((focus.players.length * target) / 2);
    for (let step = 0; step < wantedMatches; step++) {
        const pairCandidates = focusPairs
            .map((p) => {
                const r1 = focusRemaining.get(p.a.participantId) ?? 0;
                const r2 = focusRemaining.get(p.b.participantId) ?? 0;
                const need = pairNeed.get(pairKeyLocal(p.a.participantId, p.b.participantId)) ?? 0;
                return { p, score: r1 + r2, r1, r2, need };
            })
            .filter((x) => x.r1 > 0 && x.r2 > 0 && x.need > 0)
            .sort((a, b) => (b.need !== a.need ? b.need - a.need : b.score - a.score));
        if (pairCandidates.length === 0) break;

        let placed = false;
        for (const cand of pairCandidates) {
            const oppOrder = [...opponents].sort((a, b) => (oppUse.get(a.teamId) ?? 0) - (oppUse.get(b.teamId) ?? 0));
            for (const opp of oppOrder) {
                // Keep same-category-pair vs same-category-pair check.
                const oppPair = enumeratePairs(opp.players).find((q) => q.key === cand.p.key);
                if (!oppPair) continue;
                matches.push({
                    teamAId: focus.teamId,
                    teamBId: opp.teamId,
                    teamAName: focus.teamName,
                    teamBName: opp.teamName,
                    sideA: [cand.p.a, cand.p.b],
                    sideB: [oppPair.a, oppPair.b],
                    categoryKey: cand.p.key,
                });
                const k = pairKeyLocal(cand.p.a.participantId, cand.p.b.participantId);
                pairNeed.set(k, (pairNeed.get(k) ?? 0) - 1);
                focusRemaining.set(cand.p.a.participantId, (focusRemaining.get(cand.p.a.participantId) ?? 0) - 1);
                focusRemaining.set(cand.p.b.participantId, (focusRemaining.get(cand.p.b.participantId) ?? 0) - 1);
                oppUse.set(opp.teamId, (oppUse.get(opp.teamId) ?? 0) + 1);
                placed = true;
                break;
            }
            if (placed) break;
        }
        if (!placed) break;
    }

    const counts: Record<string, number> = {};
    for (const r of rosters) for (const p of r.players) counts[p.participantId] = 0;
    for (const m of matches) for (const p of [...m.sideA, ...m.sideB]) counts[p.participantId] = (counts[p.participantId] ?? 0) + 1;
    const unmetPlayerIds = focus.players
        .filter((p) => (counts[p.participantId] ?? 0) < target)
        .map((p) => p.participantId);
    const unfilledPairs = [...pairNeed.values()].reduce((a, b) => a + Math.max(0, b), 0);
    const notes: string[] = [];
    if (matches.length !== wantedMatches) notes.push(`Created ${matches.length}/${wantedMatches} matches for ${focus.teamName}.`);
    if (unfilledPairs > 0) notes.push(`${focus.teamName}: ${unfilledPairs} teammate-pair slots still unfilled for equal pairing.`);

    // Strict equal teammate distribution for focus team: each player's counts across 5 teammates differ by at most 1 and total target.
    const pairCount = new Map<string, number>();
    for (const m of matches) {
        if (m.teamAId === focus.teamId) {
            const [x, y] = m.sideA;
            const k = edgeKey(x.participantId, y.participantId);
            pairCount.set(k, (pairCount.get(k) ?? 0) + 1);
        }
        if (m.teamBId === focus.teamId) {
            const [x, y] = m.sideB;
            const k = edgeKey(x.participantId, y.participantId);
            pairCount.set(k, (pairCount.get(k) ?? 0) + 1);
        }
    }
    let badPartnerPlayers = 0;
    for (const p of focus.players) {
        const withMates: number[] = [];
        for (const q of focus.players) {
            if (q.participantId === p.participantId) continue;
            withMates.push(pairCount.get(edgeKey(p.participantId, q.participantId)) ?? 0);
        }
        const total = withMates.reduce((a, b) => a + b, 0);
        const mn = Math.min(...withMates);
        const mx = Math.max(...withMates);
        if (total !== target || mx - mn > 1) badPartnerPlayers++;
    }
    if (badPartnerPlayers > 0) {
        notes.push(`${focus.teamName}: ${badPartnerPlayers} player(s) are not equally distributed across teammates.`);
    }

    // Strict equal opponent distribution for focus team: across all other teams, counts differ by at most 1 and total wantedMatches.
    const vsOpp: number[] = opponents.map((o) => oppUse.get(o.teamId) ?? 0);
    const totalVsOpp = vsOpp.reduce((a, b) => a + b, 0);
    const mnOpp = Math.min(...vsOpp);
    const mxOpp = Math.max(...vsOpp);
    if (totalVsOpp !== wantedMatches || mxOpp - mnOpp > 1) {
        notes.push(`${focus.teamName}: not equally distributed against opponent teams.`);
    }

    const coverageNotes = notes.length > 0 ? notes : undefined;
    return { matches, counts, unmetPlayerIds, targetPerPlayer: target, coverageNotes };
}

/** Prefix for JSON lineup payload in `matches.notes` (exported for knockout / admin tools). */
export const NOTES_JSON_MARK = "__JSON__";

/** Stored in `matches.notes` for balanced-doubles rows; parsed by the schedule/results UI. */
export type DoublesLinePayload = {
    type: "doubles_line";
    categoryKey: string;
    teamAId: string;
    teamBId: string;
    sideA: { id: string; name: string; category: string }[];
    sideB: { id: string; name: string; category: string }[];
    /** Individual-tournament doubles: winning side id (e.g. side_a) when winner_team_id FK is unused. */
    winnerSideTeamId?: string;
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
            data.sideA.length >= 1 &&
            data.sideB.length >= 1
        ) {
            return data;
        }
    } catch {
        /* invalid JSON */
    }
    return null;
}

/** e.g. `Aryan (Advanced) & Apurva (Advanced) vs Mayur (Advanced) & Daivik (Advanced)` (with categories; omit via opts). */
export function formatDoublesPlayersLineCompact(
    payload: DoublesLinePayload,
    opts?: { includeCategories?: boolean },
): string {
    const includeCategories = opts?.includeCategories !== false;
    const lab = (name: string, cat: string) => {
        if (!includeCategories) return (name && String(name).trim()) || "—";
        const c = (cat && String(cat).trim()) || "—";
        return `${name} (${c})`;
    };
    const [a1, a2] = payload.sideA;
    const [b1, b2] = payload.sideB;
    const left = [a1, a2].filter(Boolean).map((p) => lab(p!.name, p!.category)).join(" & ");
    const right = [b1, b2].filter(Boolean).map((p) => lab(p!.name, p!.category)).join(" & ");
    return `${left} vs ${right}`;
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

/** Winning side for doubles: DB team FK when set, else notes payload (individual tournaments). */
export function doublesWinnerTeamId(
    notes: string | null | undefined,
    winnerTeamId: string | null | undefined,
): string | null {
    const d = parseDoublesMatchNotes(notes);
    if (d?.winnerSideTeamId) return d.winnerSideTeamId;
    return winnerTeamId ?? null;
}

/** Persist winning side on individual doubles matches (avoids invalid winner_team_id UUID). */
export function mergeDoublesWinnerIntoNotes(
    notes: string | null | undefined,
    winnerSideTeamId: string | null,
): string | null {
    const parsed = parseDoublesMatchNotes(notes);
    if (!parsed) return notes?.trim() || null;
    const idx = notes?.indexOf(NOTES_JSON_MARK) ?? -1;
    const textPart = idx >= 0 ? notes!.slice(0, idx).trim() : (notes || "").trim();
    const payload: DoublesLinePayload = { ...parsed };
    if (winnerSideTeamId) payload.winnerSideTeamId = winnerSideTeamId;
    else delete payload.winnerSideTeamId;
    const jsonPart = `${NOTES_JSON_MARK}${JSON.stringify(payload)}`;
    return [textPart, jsonPart].filter(Boolean).join("\n").trim() || null;
}
