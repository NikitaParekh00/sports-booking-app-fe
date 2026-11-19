import { phoneLast10 } from '@/lib/phoneNormalize';

/** Live auction UI (dashboard View + /auction) — admin only for now. */
export const AUCTION_ADMIN_PHONE_LAST10 = '7506256356';

export function isAuctionAdminPhone(phone: string | null | undefined): boolean {
    if (!phone) return false;
    return phoneLast10(phone) === AUCTION_ADMIN_PHONE_LAST10;
}