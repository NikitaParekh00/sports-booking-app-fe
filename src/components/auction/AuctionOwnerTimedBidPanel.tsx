'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';

const CARD_BLUE = '#0F172A';
const BLUE_BORDER = '#3B82F6';
const TEXT = '#E5E7EB';
const TEXT_STRONG = '#FFFFFF';

function formatCountdown(endsAt: string | null): string {
    if (!endsAt) return '—';
    const ms = new Date(endsAt).getTime() - Date.now();
    if (ms <= 0) return 'Closing…';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
}

type Props = {
    sessionId: string;
    phone: string;
};

/** Closed / timed owner bids — embedded on profile page. */
export default function AuctionOwnerTimedBidPanel({ sessionId, phone }: Props) {
    const supabase = useMemo(() => createClient(), []);
    const [state, setState] = useState<Record<string, unknown> | null>(null);
    const [bidInput, setBidInput] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [countdown, setCountdown] = useState('—');

    const refresh = useCallback(async () => {
        if (!phone || !sessionId) return;
        const res = await fetch('/api/auction/timed/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, phone }),
        });
        const json = await res.json();
        if (res.ok) setState(json);
    }, [phone, sessionId]);

    useEffect(() => {
        if (!sessionId || !phone) return;
        void refresh();
        const lotStaged = Boolean(state?.lotStaged);
        const pollMs = lotStaged ? 1000 : 4000;
        const id = window.setInterval(() => void refresh(), pollMs);
        return () => window.clearInterval(id);
    }, [sessionId, phone, refresh, state?.lotStaged]);

    useEffect(() => {
        if (!sessionId) return;
        const channel = supabase
            .channel(`owner-timed-panel-${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'auction_sessions',
                    filter: `id=eq.${sessionId}`,
                },
                () => {
                    void refresh();
                }
            )
            .subscribe();
        return () => {
            void supabase.removeChannel(channel);
        };
    }, [sessionId, refresh, supabase]);

    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible') void refresh();
        };
        window.addEventListener('focus', onVisible);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            window.removeEventListener('focus', onVisible);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [refresh]);

    useEffect(() => {
        const ends = (state?.session as { lot_ends_at?: string } | undefined)?.lot_ends_at;
        const tick = () => setCountdown(formatCountdown(ends ?? null));
        tick();
        const id = window.setInterval(tick, 1000);
        return () => window.clearInterval(id);
    }, [state]);

    const submitBid = async () => {
        if (!phone || !sessionId) return;
        const amount = Number(bidInput.replace(/,/g, ''));
        if (!Number.isFinite(amount) || amount <= 0) {
            alert('Enter a valid bid amount');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch('/api/auction/timed/bid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, phone, amount }),
            });
            const json = await res.json();
            if (!res.ok) {
                alert(json.message || json.error || 'Bid failed');
                return;
            }
            setBidInput('');
            await refresh();
        } finally {
            setSubmitting(false);
        }
    };

    const lotPlayer = state?.lotPlayer as { name?: string; skill?: string; age?: number } | null | undefined;
    const team = state?.team as { name?: string; budget?: number } | null | undefined;
    const lotStaged = Boolean(state?.lotStaged);
    const lotBiddingOpen = Boolean(state?.lotBiddingOpen ?? state?.lotOpen);
    const mode = (state?.session as { auction_mode?: string } | undefined)?.auction_mode;

    return (
        <section
            className="mb-6 p-4 rounded-lg border space-y-3"
            style={{ backgroundColor: CARD_BLUE, borderColor: BLUE_BORDER }}
        >
            <h2 className="text-base font-bold" style={{ color: TEXT_STRONG }}>
                Closed bidding (team owners)
            </h2>
            <p className="text-xs" style={{ color: TEXT }}>
                Sealed bids while the timer runs — other teams&apos; amounts stay hidden until the lot closes.
            </p>

            {mode !== 'timed_owner' && (
                <p className="text-sm text-amber-300">Live admin mode is on — closed owner bids are not active yet.</p>
            )}

            {mode === 'timed_owner' && !team && (
                <p className="text-sm" style={{ color: '#F87171' }}>
                    No team linked to your phone. Ask admin to set your <strong>owner phone</strong> on your team.
                </p>
            )}

            {team && (
                <p className="text-sm" style={{ color: TEXT }}>
                    Bidding as <strong style={{ color: TEXT_STRONG }}>{team.name}</strong> · Budget ₹
                    {Number(team.budget).toLocaleString('en-IN')}
                </p>
            )}

            {mode === 'timed_owner' && lotStaged && lotPlayer && (
                <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: BLUE_BORDER, backgroundColor: '#111827' }}>
                    <div className="flex justify-between items-start gap-2">
                        <div>
                            <p className="text-xs uppercase" style={{ color: '#93C5FD' }}>
                                Current player
                            </p>
                            <p className="text-lg font-semibold" style={{ color: TEXT_STRONG }}>
                                {lotPlayer.name}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs uppercase" style={{ color: '#93C5FD' }}>
                                Time left
                            </p>
                            <p
                                className="font-mono font-bold text-emerald-400"
                                style={{ fontSize: lotBiddingOpen ? '1.75rem' : '1rem' }}
                            >
                                {lotBiddingOpen ? countdown : '—'}
                            </p>
                        </div>
                    </div>
                    {!lotBiddingOpen && (
                        <p className="text-sm text-amber-300">
                            Waiting for admin to start the timer on the live auction screen.
                        </p>
                    )}
                    {lotBiddingOpen && (
                        <>
                            <p className="text-sm" style={{ color: TEXT }}>
                                Min bid: ₹{Number(state?.minBid ?? 0).toLocaleString('en-IN')}
                            </p>
                            {state?.myBid != null && (
                                <p className="text-sm text-emerald-300">
                                    Your bid: ₹{Number(state.myBid).toLocaleString('en-IN')}
                                </p>
                            )}
                            <input
                                type="number"
                                inputMode="numeric"
                                value={bidInput}
                                onChange={(e) => setBidInput(e.target.value)}
                                placeholder="Your bid (₹)"
                                className="w-full px-3 py-2 rounded-lg border text-sm"
                                style={{ backgroundColor: '#0F172A', borderColor: BLUE_BORDER, color: TEXT }}
                            />
                            <button
                                type="button"
                                disabled={submitting || !team}
                                onClick={submitBid}
                                className="w-full py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
                                style={{ backgroundColor: '#059669', color: '#fff' }}
                            >
                                {submitting ? 'Submitting…' : 'Submit bid'}
                            </button>
                        </>
                    )}
                </div>
            )}

            {mode === 'timed_owner' && !lotStaged && (
                <p className="text-sm text-center py-4" style={{ color: '#9CA3AF' }}>
                    No lot open — wait for admin to stage the next player.
                </p>
            )}
        </section>
    );
}