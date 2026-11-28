import { isAuctionAdminPhone } from '@/lib/auctionAccess';

/** Chooser lives on existing confirm route (no extra App Router segment). */
export const AUCTION_HUB_PATH = '/auction/confirm?mode=choose';

export function isAppAdmin(role: string | null | undefined, phone: string | null | undefined): boolean {
    return role === 'admin' || isAuctionAdminPhone(phone);
}

/** Destination after login when the user did not ask to return to a specific page. */
export function defaultPostLoginPath(
    _role: string | null | undefined,
    _phone: string | null | undefined
): string {
    return AUCTION_HUB_PATH;
}

/** After login: honor deep links with ?mode=; bare /auction/confirm?session= → chooser. */
export function resolvePostLoginReturn(returnTo: string | null): string | null {
    if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) {
        return null;
    }
    const q = returnTo.indexOf('?');
    const path = q >= 0 ? returnTo.slice(0, q) : returnTo;
    if (path !== '/auction/confirm') {
        return returnTo;
    }
    const params = new URLSearchParams(q >= 0 ? returnTo.slice(q + 1) : '');
    const mode = params.get('mode');
    if (mode === 'choose' || mode === 'profile') {
        return returnTo;
    }
    return AUCTION_HUB_PATH;
}
