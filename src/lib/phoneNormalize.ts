/** Last 10 digits for Indian mobile numbers. */
export function phoneLast10(input: string): string | null {
    const digits = input.replace(/\D/g, '');
    if (digits.length < 10) return null;
    return digits.slice(-10);
}

/** Common stored formats in profiles / player CSV. */
export function phoneMatchVariants(input: string): string[] {
    const last10 = phoneLast10(input);
    if (!last10) return [input.trim()].filter(Boolean);
    return [
        `+91-${last10}`,
        `+91${last10}`,
        last10,
        `91${last10}`,
        `+91 ${last10}`,
    ];
}