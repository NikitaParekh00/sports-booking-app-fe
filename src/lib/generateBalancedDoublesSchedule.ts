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

function countMissingTeammatePairs(rosters: TeamRosterInput[], matches: GeneratedDoublesMatch[]): number {
    const cov = buildTeammateCoverage(matches);
    let n = 0;
    for (const r of rosters) {
        const c = cov.get(r.teamId) ?? new Set();
        for (const p of enumeratePairs(r.players)) {
            if (!c.has(edgeKey(p.a.participantId, p.b.participantId))) n++;
        }
    }
    return n;
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
    const advPairSat = buildAdvAdvTeamPairKeys(matches);
    for (let i = 0; i < rosters.length; i++) {
        for (let j = i + 1; j < rosters.length; j++) {
            const A = rosters[i];
            const B = rosters[j];
            if (!rosterHasAdvAdvPair(A) || !rosterHasAdvAdvPair(B)) continue;
            if (!advPairSat.has(edgeKey(A.teamId, B.teamId))) {
                notes.push(
                    `Missing Advanced+Advanced vs Advanced+Advanced between "${A.teamName}" and "${B.teamName}" (both need two Advanced players; add/fix categories or another team).`
                );
            }
        }
    }
    for (const TA of rosters) {
        for (const pl of TA.players) {
            if (pl.categoryNorm !== "advanced") continue;
            if (!playerIsInSomeAdvAdvPairOnTeam(TA, pl.participantId)) continue;
            for (const TB of rosters) {
                if (TB.teamId === TA.teamId) continue;
                if (!rosterHasAdvAdvPair(TB)) continue;
                if (!hasPlayerAdvAdvVersusTeam(matches, TA.teamId, pl.participantId, TB.teamId)) {
                    notes.push(
                        `"${pl.name}" (${TA.teamName}): no Advanced+Advanced vs Advanced+Advanced match scheduled vs "${TB.teamName}".`
                    );
                }
            }
        }
    }
    return notes;
}

function tryAppendCoverageMatch(
    rosters: TeamRosterInput[],
    matches: GeneratedDoublesMatch[],
    plays: Record<string, number>,
    teamCoverage: Map<string, Set<string>>,
    advAdvSatisfied: Set<string>,
    usedLineupDuels: Set<string>,
    targetPerPlayer: number,
    teammatePairCountsByName: Map<string, number>,
    teammatePairCapMap: TeammatePairCapMap
): boolean {
    const pushMatch = (TA: TeamRosterInput, TB: TeamRosterInput, pa: { a: RosterPlayer; b: RosterPlayer; key: string }, pb: { a: RosterPlayer; b: RosterPlayer; key: string }) => {
        const duel = lineupDuelKey(pa, pb);
        if (usedLineupDuels.has(duel)) return false;
        if (teammatePairWouldExceedNameCap(pa.a, pa.b, teammatePairCountsByName, teammatePairCapMap)) return false;
        if (teammatePairWouldExceedNameCap(pb.a, pb.b, teammatePairCountsByName, teammatePairCapMap)) return false;
        const ids = [pa.a.participantId, pa.b.participantId, pb.a.participantId, pb.b.participantId];
        if (!allFourPlayersHaveRoom(plays, ids, targetPerPlayer)) return false;
        ids.forEach((id) => {
            plays[id] = (plays[id] ?? 0) + 1;
        });
        recordTeammatePairByName(pa.a, pa.b, teammatePairCountsByName);
        recordTeammatePairByName(pb.a, pb.b, teammatePairCountsByName);
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
        if (pa.key === ADV_ADV_CATEGORY_KEY) {
            advAdvSatisfied.add(TA.teamId);
            advAdvSatisfied.add(TB.teamId);
        }
        usedLineupDuels.add(duel);
        return true;
    };

    // Missing teammate edge (same-side pair at least once)
    for (const TA of rosters) {
        const covA = teamCoverage.get(TA.teamId) ?? new Set();
        for (const pa of enumeratePairs(TA.players)) {
            const ek = edgeKey(pa.a.participantId, pa.b.participantId);
            if (covA.has(ek)) continue;
            for (const TB of rosters) {
                if (TB.teamId === TA.teamId) continue;
                const pairsB = enumeratePairs(TB.players).filter((pb) => pb.key === pa.key);
                for (const pb of pairsB) {
                    if (pushMatch(TA, TB, pa, pb)) return true;
                }
            }
        }
    }

    return false;
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
    teammatePairCapMap: TeammatePairCapMap
): boolean {
    const pushMatch = (TA: TeamRosterInput, TB: TeamRosterInput, pa: { a: RosterPlayer; b: RosterPlayer; key: string }, pb: { a: RosterPlayer; b: RosterPlayer; key: string }) => {
        const duel = lineupDuelKey(pa, pb);
        if (usedLineupDuels.has(duel)) return false;
        if (teammatePairWouldExceedNameCap(pa.a, pa.b, teammatePairCountsByName, teammatePairCapMap)) return false;
        if (teammatePairWouldExceedNameCap(pb.a, pb.b, teammatePairCountsByName, teammatePairCapMap)) return false;
        const ids = [pa.a.participantId, pa.b.participantId, pb.a.participantId, pb.b.participantId];
        if (!allFourPlayersHaveRoom(plays, ids, targetPerPlayer)) return false;
        ids.forEach((id) => {
            plays[id] = (plays[id] ?? 0) + 1;
        });
        recordTeammatePairByName(pa.a, pa.b, teammatePairCountsByName);
        recordTeammatePairByName(pb.a, pb.b, teammatePairCountsByName);
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
    teammatePairCapMap: TeammatePairCapMap
): boolean {
    const pushMatch = (TA: TeamRosterInput, TB: TeamRosterInput, pa: { a: RosterPlayer; b: RosterPlayer; key: string }, pb: { a: RosterPlayer; b: RosterPlayer; key: string }) => {
        const duel = lineupDuelKey(pa, pb);
        if (usedLineupDuels.has(duel)) return false;
        if (teammatePairWouldExceedNameCap(pa.a, pa.b, teammatePairCountsByName, teammatePairCapMap)) return false;
        if (teammatePairWouldExceedNameCap(pb.a, pb.b, teammatePairCountsByName, teammatePairCapMap)) return false;
        const ids = [pa.a.participantId, pa.b.participantId, pb.a.participantId, pb.b.participantId];
        if (!allFourPlayersHaveRoom(plays, ids, targetPerPlayer)) return false;
        ids.forEach((id) => {
            plays[id] = (plays[id] ?? 0) + 1;
        });
        recordTeammatePairByName(pa.a, pa.b, teammatePairCountsByName);
        recordTeammatePairByName(pb.a, pb.b, teammatePairCountsByName);
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
    teammatePairCapMap: TeammatePairCapMap
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

        ids.forEach((id) => {
            plays[id] = (plays[id] ?? 0) + 1;
        });
        recordTeammatePairByName(pa.a, pa.b, teammatePairCountsByName);
        recordTeammatePairByName(pb.a, pb.b, teammatePairCountsByName);
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

function fillCoverageGaps(
    rosters: TeamRosterInput[],
    matches: GeneratedDoublesMatch[],
    plays: Record<string, number>,
    usedLineupDuels: Set<string>,
    targetPerPlayer: number,
    teammatePairCountsByName: Map<string, number>,
    teammatePairCapMap: TeammatePairCapMap
): void {
    const teamCoverage = buildTeammateCoverage(matches);
    const advAdvSatisfied = teamsSatisfiedAdvAdv(matches);
    while (
        tryAppendCoverageMatch(
            rosters,
            matches,
            plays,
            teamCoverage,
            advAdvSatisfied,
            usedLineupDuels,
            targetPerPlayer,
            teammatePairCountsByName,
            teammatePairCapMap
        )
    ) {
        /* teammate pair coverage */
    }
    const pairSat = buildAdvAdvTeamPairKeys(matches);
    while (
        tryAppendAdvAdvTeamPairing(
            rosters,
            matches,
            plays,
            teamCoverage,
            advAdvSatisfied,
            pairSat,
            usedLineupDuels,
            targetPerPlayer,
            teammatePairCountsByName,
            teammatePairCapMap
        )
    ) {
        /* every Adv-capable team pair gets ≥1 Adv+Adv vs Adv+Adv */
    }
    while (
        tryAppendAdvancedPlayerVersusAdvTeam(
            rosters,
            matches,
            plays,
            teamCoverage,
            advAdvSatisfied,
            pairSat,
            usedLineupDuels,
            targetPerPlayer,
            teammatePairCountsByName,
            teammatePairCapMap
        )
    ) {
        /* every Advanced player gets that lineup vs each other Adv-capable team */
    }
}

/** Normalize participant category for matching (case-insensitive trim). */
export function normalizeCategoryLabel(raw: string | null | undefined): string {
    const t = (raw ?? "").trim().toLowerCase();
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
function cmpScheduleQuality(a: DoublesScheduleResult, b: DoublesScheduleResult, rosters: TeamRosterInput[]): number {
    if (a.matches.length !== b.matches.length) return b.matches.length - a.matches.length;
    if (a.unmetPlayerIds.length !== b.unmetPlayerIds.length) return a.unmetPlayerIds.length - b.unmetPlayerIds.length;
    const missA = countMissingTeammatePairs(rosters, a.matches);
    const missB = countMissingTeammatePairs(rosters, b.matches);
    if (missA !== missB) return missA - missB;
    const advPairA = countMissingAdvAdvTeamPairings(rosters, a.matches);
    const advPairB = countMissingAdvAdvTeamPairings(rosters, b.matches);
    if (advPairA !== advPairB) return advPairA - advPairB;
    const pcA = countMissingAdvancedPlayerAdvCross(rosters, a.matches);
    const pcB = countMissingAdvancedPlayerAdvCross(rosters, b.matches);
    if (pcA !== pcB) return pcA - pcB;
    const advA = countAdvAdvUnsatisfiedTeams(rosters, a.matches);
    const advB = countAdvAdvUnsatisfiedTeams(rosters, b.matches);
    return advA - advB;
}

function generateBalancedDoublesScheduleOnce(
    rosters: TeamRosterInput[],
    targetPerPlayer: number,
    options?: GenerateBalancedDoublesOptions
): DoublesScheduleResult {
    const plays: Record<string, number> = {};
    rosters.forEach((r) => {
        r.players.forEach((p) => {
            plays[p.participantId] = 0;
        });
    });

    const matches: GeneratedDoublesMatch[] = [];
    const teammatePairCountsByName = new Map<string, number>();
    const teammatePairCapMap = buildTeammatePairCapMap(options?.teammatePairNameCaps);
    const teamCoverage = new Map<string, Set<string>>();
    const usedLineupDuels = new Set<string>();
    rosters.forEach((r) => teamCoverage.set(r.teamId, new Set()));

    const teamPairs: [TeamRosterInput, TeamRosterInput][] = [];
    for (let i = 0; i < rosters.length; i++) {
        for (let j = i + 1; j < rosters.length; j++) {
            teamPairs.push([rosters[i], rosters[j]]);
        }
    }

    seedAdvAdvVersusEveryAdvTeamPair(
        rosters,
        matches,
        plays,
        teamCoverage,
        usedLineupDuels,
        targetPerPlayer,
        teammatePairCountsByName,
        teammatePairCapMap
    );

    const allSatisfied = () => Object.values(plays).every((c) => c >= targetPerPlayer);

    let stagnation = 0;
    const maxStagnation = Math.max(200, rosters.length * rosters.length * targetPerPlayer * 4);

    type MainCand = {
        score: number;
        covGain: number;
        /** 1 if this would add the first Adv+Adv vs Adv+Adv for this unordered team pair (else 0). */
        advTeamPairMissing: number;
        TA: TeamRosterInput;
        TB: TeamRosterInput;
        pa: { a: RosterPlayer; b: RosterPlayer; key: string };
        pb: { a: RosterPlayer; b: RosterPlayer; key: string };
    };

    while (!allSatisfied() && stagnation < maxStagnation) {
        const advAdvPairsDone = buildAdvAdvTeamPairKeys(matches);
        // Global best over all team pairs (not “first pair in random order that works”) — avoids
        // getting stuck at 107 when a better placement exists on another pairing.
        const pool: MainCand[] = [];
        for (const [TA, TB] of teamPairs) {
            const pairsA = enumeratePairs(TA.players);
            const pairsB = enumeratePairs(TB.players);
            const byKeyB = new Map<string, { a: RosterPlayer; b: RosterPlayer; key: string }[]>();
            for (const pb of pairsB) {
                if (!byKeyB.has(pb.key)) byKeyB.set(pb.key, []);
                byKeyB.get(pb.key)!.push(pb);
            }

            const covA = teamCoverage.get(TA.teamId)!;
            const covB = teamCoverage.get(TB.teamId)!;

            for (const pa of pairsA) {
                const listB = byKeyB.get(pa.key);
                if (!listB?.length) continue;
                for (const pb of listB) {
                    if (teammatePairWouldExceedNameCap(pa.a, pa.b, teammatePairCountsByName, teammatePairCapMap)) continue;
                    if (teammatePairWouldExceedNameCap(pb.a, pb.b, teammatePairCountsByName, teammatePairCapMap)) continue;
                    const ids = [pa.a.participantId, pa.b.participantId, pb.a.participantId, pb.b.participantId];
                    if (ids.some((id) => plays[id] >= targetPerPlayer)) continue;
                    const score = Math.min(...ids.map((id) => plays[id]));
                    const ekA = edgeKey(pa.a.participantId, pa.b.participantId);
                    const ekB = edgeKey(pb.a.participantId, pb.b.participantId);
                    const covGain = (covA.has(ekA) ? 0 : 1) + (covB.has(ekB) ? 0 : 1);
                    const advTeamPairMissing =
                        pa.key === ADV_ADV_CATEGORY_KEY && !advAdvPairsDone.has(edgeKey(TA.teamId, TB.teamId))
                            ? 1
                            : 0;
                    if (usedLineupDuels.has(lineupDuelKey(pa, pb))) continue;
                    pool.push({ score, covGain, advTeamPairMissing, TA, TB, pa, pb });
                }
            }
        }

        if (pool.length === 0) {
            stagnation += 1;
            continue;
        }

        // Prefer closing each (teamA, teamB) Adv+Adv vs Adv+Adv edge once before “extra” Adv+Adv repeats,
        // so two-Advanced teams (one Adv+Adv side) get that lineup vs every opponent — not a single game.
        pool.sort((x, y) => {
            if (x.score !== y.score) return x.score - y.score;
            if (y.covGain !== x.covGain) return y.covGain - x.covGain;
            if (y.advTeamPairMissing !== x.advTeamPairMissing) return y.advTeamPairMissing - x.advTeamPairMissing;
            return Math.random() - 0.5;
        });
        const best = pool[0];
        const { TA, TB, pa, pb } = best;
        const covA = teamCoverage.get(TA.teamId)!;
        const covB = teamCoverage.get(TB.teamId)!;
        const ids = [pa.a.participantId, pa.b.participantId, pb.a.participantId, pb.b.participantId];
        ids.forEach((id) => {
            plays[id] += 1;
        });
        recordTeammatePairByName(pa.a, pa.b, teammatePairCountsByName);
        recordTeammatePairByName(pb.a, pb.b, teammatePairCountsByName);
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

    fillCoverageGaps(
        rosters,
        matches,
        plays,
        usedLineupDuels,
        targetPerPlayer,
        teammatePairCountsByName,
        teammatePairCapMap
    );

    const unmetPlayerIds = Object.entries(plays)
        .filter(([, c]) => c < targetPerPlayer)
        .map(([id]) => id);

    const gapLines = reportDoublesConstraintGaps(rosters, matches);

    return {
        matches,
        counts: plays,
        unmetPlayerIds,
        targetPerPlayer,
        coverageNotes: gapLines.length > 0 ? gapLines : undefined,
    };
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
        const qualityCmp = cmpScheduleQuality(r, best, rosters);
        // Keep core schedule quality primary (match count / unmet players),
        // then use name-pair caps only as a tie-breaker.
        if (qualityCmp < 0 || (qualityCmp === 0 && v < bestCapViolations)) {
            best = r;
            bestCapViolations = v;
        }
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
