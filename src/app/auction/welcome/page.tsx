import { redirect } from 'next/navigation';

/** Legacy URL — hub is on /auction/confirm?mode=choose */
export default function AuctionWelcomeRedirect() {
    redirect('/auction/confirm?mode=choose');
}