/** Participant row subset used to build a single-elimination draw. */
export type BracketParticipantInput = {
    id: string;
    player_name: string;
    seed_number?: number | null;
};

export function nextPowerOfTwo(n: number): number {
    if (n <= 1) return 1;
    let p = 1;
    while (p < n) p <<= 1;
    return p;
}

/** Lower seed number = stronger; nulls last; then name. */
export function orderParticipantsForBracket(participants: BracketParticipantInput[]): BracketParticipantInput[] {
    return [...participants].sort((a, b) => {
        const sa = a.seed_number != null && Number.isFinite(Number(a.seed_number)) ? Number(a.seed_number) : 9999;
        const sb = b.seed_number != null && Number.isFinite(Number(b.seed_number)) ? Number(b.seed_number) : 9999;
        if (sa !== sb) return sa - sb;
        return a.player_name.localeCompare(b.player_name, undefined, { sensitivity: "base" });
    });
}

export type RoundOnePairing =
    | { kind: "match"; a: BracketParticipantInput; b: BracketParticipantInput; slotIndex: number }
    | { kind: "bye"; advances: BracketParticipantInput; slotIndex: number }
    | { kind: "empty"; slotIndex: number };

/**
 * Pad ordered list to size B (next power of two) with nulls (byes) at the end,
 * then pair adjacent slots. Worst seeds (end of list) tend to receive byes when N < B.
 */
export function buildRoundOnePairings(orderedParticipants: BracketParticipantInput[]): {
    bracketSize: number;
    pairings: RoundOnePairing[];
} {
    const n = orderedParticipants.length;
    const B = nextPowerOfTwo(n);
    const slots: (BracketParticipantInput | null)[] = orderedParticipants.map((p) => p);
    while (slots.length < B) slots.push(null);

    const pairings: RoundOnePairing[] = [];
    const pairCount = B / 2;
    for (let i = 0; i < pairCount; i++) {
        const x = slots[i * 2];
        const y = slots[i * 2 + 1];
        if (x && y) {
            pairings.push({ kind: "match", a: x, b: y, slotIndex: i + 1 });
        } else if (x && !y) {
            pairings.push({ kind: "bye", advances: x, slotIndex: i + 1 });
        } else if (!x && y) {
            pairings.push({ kind: "bye", advances: y, slotIndex: i + 1 });
        } else {
            pairings.push({ kind: "empty", slotIndex: i + 1 });
        }
    }
    return { bracketSize: B, pairings };
}

export function bracketRoundName(roundNumber: number, bracketSize: number): string {
    const slotsThisRound = bracketSize / 2 ** (roundNumber - 1);
    if (slotsThisRound <= 1) return "Final";
    if (slotsThisRound === 2) return "Semifinals";
    if (slotsThisRound === 4) return "Quarterfinals";
    return `Round of ${slotsThisRound}`;
}
