'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

const PAGE_BG = '#0F172A';
const CARD = '#111827';
const TEXT = '#E5E7EB';

type Props = {
    displayName: string | null;
    /** Auction admin can run buy/skip on live screen; everyone else watches. */
    canRunLiveAuction: boolean;
    showAppDashboard: boolean;
    activeSessionId: string | null;
    onLogout: () => void;
};

export default function AuctionChooseMode({
    displayName,
    canRunLiveAuction,
    showAppDashboard,
    activeSessionId,
    onLogout,
}: Props) {
    const router = useRouter();

    const liveHref = activeSessionId ? `/auction?session=${activeSessionId}` : '/auction';
    const profileHref = activeSessionId
        ? `/auction/confirm?mode=profile&session=${activeSessionId}`
        : '/auction/confirm?mode=profile';

    return (
        <div className="min-h-screen px-4 py-8" style={{ backgroundColor: PAGE_BG, color: TEXT }}>
            <div className="max-w-lg mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <Image src="/logo.jpeg" alt="Logo" width={120} height={48} className="rounded-lg" />
                    <button
                        type="button"
                        onClick={onLogout}
                        className="text-sm font-semibold px-3 py-1.5 rounded-lg border border-blue-500 text-white"
                    >
                        Logout
                    </button>
                </div>

                <h1 className="text-2xl font-bold text-white mb-1">Auction</h1>
                <p className="text-sm mb-6 text-gray-400">
                    {displayName
                        ? `Hi, ${displayName} — choose how you want to continue.`
                        : 'Choose how you want to continue.'}
                </p>

                <div className="space-y-4">
                    <button
                        type="button"
                        onClick={() => router.push(liveHref)}
                        className="w-full text-left p-5 rounded-xl border-2 border-red-600"
                        style={{ backgroundColor: CARD }}
                    >
                        <p className="text-lg font-bold text-white mb-1">Live auction</p>
                        <p className="text-sm text-gray-400">
                            {canRunLiveAuction
                                ? 'Run the live room — projector, buy/skip, and admin controls.'
                                : 'Watch the live auction as it happens (view only).'}
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push(profileHref)}
                        className="w-full text-left p-5 rounded-xl border-2 border-emerald-600"
                        style={{ backgroundColor: CARD }}
                    >
                        <p className="text-lg font-bold text-white mb-1">My profile &amp; closed bidding</p>
                        <p className="text-sm text-gray-400">
                            One page: confirm your player profile and submit sealed owner bids when timed mode is on.
                        </p>
                    </button>
                </div>

                {showAppDashboard && (
                    <button
                        type="button"
                        onClick={() => router.push('/dashboard')}
                        className="mt-6 w-full text-center text-sm underline text-blue-300"
                    >
                        Open main app (courts &amp; bookings)
                    </button>
                )}
            </div>
        </div>
    );
}