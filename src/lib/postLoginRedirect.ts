import { isAuctionAdminPhone } from '@/lib/auctionAccess';

export function isAppAdmin(role: string | null | undefined, phone: string | null | undefined): boolean {
    return role === 'admin' || isAuctionAdminPhone(phone);
}

/** Destination after login when the user did not ask to return to a specific page. */
export function defaultPostLoginPath(role: string | null | undefined, phone: string | null | undefined): string {
    return isAppAdmin(role, phone) ? '/dashboard' : '/auction/confirm';
}
