/** Every unordered pair exactly once (single round robin within a group). */
export function allUnorderedPairs<T>(items: T[]): [T, T][] {
    const out: [T, T][] = [];
    for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
            out.push([items[i], items[j]]);
        }
    }
    return out;
}

/**
 * Short, unique-ish token per DB group row for match_number (e.g. RR-A0-01).
 * Appends group_order so two groups with the same display name do not collide.
 */
export function roundRobinGroupSlug(groupName: string, groupOrder: number | null): string {
    const stripped = groupName.replace(/[^a-zA-Z0-9]+/g, "").toUpperCase().slice(0, 8);
    const ord = groupOrder != null && Number.isFinite(Number(groupOrder)) ? Number(groupOrder) : 0;
    const base = stripped.length >= 1 ? stripped : "G";
    return `${base}${ord}`;
}
