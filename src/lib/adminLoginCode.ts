import { isAuctionAdminPhone } from '@/lib/auctionAccess';

/** Hardcoded admin verification code (development / gated admin login). */
export const ADMIN_LOGIN_CODE = '90123';

export function requiresAdminLoginCode(phone: string | null | undefined): boolean {
    return isAuctionAdminPhone(phone);
}

export function isValidAdminLoginCode(phone: string, code: string): boolean {
    if (!requiresAdminLoginCode(phone)) return false;
    return code.trim() === ADMIN_LOGIN_CODE;
}