/** Parse stored `final_score` ("21-10, 21-8") into per-set fields (same as team Results tab). */
export function parseFinalScoreToSets(score: string | null | undefined, numSets: number): string[] {
    const arr = Array(numSets).fill("");
    if (!score || typeof score !== "string") return arr;
    const parts = score.split(",").map((s) => s.trim()).filter(Boolean);
    parts.forEach((p, i) => {
        if (i < numSets) arr[i] = p;
    });
    return arr;
}

export function formatSetsForDisplay(score: string | null | undefined): string {
    if (!score || typeof score !== "string") return "";
    const parts = score.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0];
    return parts.map((p, i) => `Set ${i + 1}: ${p}`).join(", ");
}
