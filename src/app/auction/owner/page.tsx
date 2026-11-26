'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

function formatCountdown(endsAt: string | null): string {
    if (!endsAt) return '—';
    const ms = new Date(endsAt).getTime() - Date.now();
    if (ms <= 0) return 'Closing…';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, '0')}`;
}

function OwnerBidContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionIdFromUrl = searchParams.get('session') ?? '';
    const supabase = useMemo(() => createClient(), []);

    const [phone, setPhone] = useState<string | null>(null);
    const [ready, setReady] = useState(false);
    const [sessions, setSessions] = useState<Array<{ id: string; session_name: string }>>([]);
    const [selectedSessionId, setSelectedSessionId] = useState(sessionIdFromUrl);
    const [state, setState] = useState<Record<string, unknown> | null>(null);
    const [bidInput, setBidInput] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [countdown, setCountdown] = useState('—');

    useEffect(() => {
        const stored = localStorage.getItem('sf:user');
        if (!stored) {
            const returnTo = `${window.location.pathname}${window.location.search}`;
            router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
            return;
        }
        try {
            const user = JSON.parse(stored);
            if (!user.phone) {
                alert('Your login has no phone. Contact admin.');
                router.replace('/auction/confirm');
                return;
            }
            setPhone(user.phone);
            setReady(true);
        } catch {
            router.replace('/login');
        }
    }, [router]);

    useEffect(() => {
        if (!ready) return;
        fetch('/api/auction/timed/sessions', { method: 'POST' })
            .then((r) => r.json())
            .then((j) => {
                if (j.sessions) setSessions(j.sessions);
            })
            .catch(() => {});
    }, [ready]);

    const refresh = useCallback(async () => {
        if (!phone || !selectedSessionId) return;
        const res = await fetch('/api/auction/timed/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: selectedSessionId, phone }),
        });
        const json = await res.json();
        if (res.ok) setState(json);
    }, [phone, selectedSessionId]);

    useEffect(() => {
        if (!ready || !phone || !selectedSessionId) return;
        void refresh();
        const lotStaged = Boolean(state?.lotStaged);
        const pollMs = lotStaged ? 1000 : 4000;
        const id = window.setInterval(() => void refresh(), pollMs);
        return () => window.clearInterval(id);
    }, [ready, phone, selectedSessionId, refresh, state?.lotStaged]);

    useEffect(() => {
        if (!ready || !selectedSessionId) return;
        const channel = supabase
            .channel(`owner-timed-session-${selectedSessionId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'auction_sessions',
                    filter: `id=eq.${selectedSessionId}`,
                },
                () => {
                    void refresh();
                }
            )
            .subscribe();
        return () => {
            void supabase.removeChannel(channel);
        };
    }, [ready, selectedSessionId, refresh, supabase]);

    useEffect(() => {
        if (!ready || !phone || !selectedSessionId) return;
        const onVisible = () => {
            if (document.visibilityState === 'visible') void refresh();
        };
        window.addEventListener('focus', onVisible);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            window.removeEventListener('focus', onVisible);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [ready, phone, selectedSessionId, refresh]);

    useEffect(() => {
        const ends = (state?.session as { lot_ends_at?: string } | undefined)?.lot_ends_at;
        const tick = () => setCountdown(formatCountdown(ends ?? null));
        tick();
        const id = window.setInterval(tick, 1000);
        return () => window.clearInterval(id);
    }, [state]);

    const submitBid = async () => {
        if (!phone || !selectedSessionId) return;
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
                body: JSON.stringify({ sessionId: selectedSessionId, phone, amount }),
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

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
                Loading…
            </div>
        );
    }

    const lotPlayer = state?.lotPlayer as { name?: string; skill?: string; age?: number } | null | undefined;
    const team = state?.team as { name?: string; budget?: number } | null | undefined;
    const lotStaged = Boolean(state?.lotStaged);
    const lotBiddingOpen = Boolean(state?.lotBiddingOpen ?? state?.lotOpen);
    const mode = (state?.session as { auction_mode?: string } | undefined)?.auction_mode;

    return (
        <div className="min-h-screen px-4 py-6 bg-slate-900 text-slate-100">
            <div className="max-w-lg mx-auto">
                <button type="button" onClick={() => router.push('/auction/confirm')} className="text-sm text-slate-400 mb-4">
                    ← My profile
                </button>
                <h1 className="text-xl font-bold mb-2">Team owner bidding</h1>
                <p className="text-sm text-slate-400 mb-4">
                    Submit your bid before the timer ends. Other teams&apos; bids stay hidden until the lot closes.
                </p>

                <label className="block mb-4">
                    <span className="text-sm font-medium text-slate-300">Auction session</span>
                    <select
                        value={selectedSessionId}
                        onChange={(e) => {
                            const id = e.target.value;
                            setSelectedSessionId(id);
                            router.replace(id ? `/auction/owner?session=${id}` : '/auction/owner');
                        }}
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-sm"
                    >
                        <option value="">Select session…</option>
                        {sessions.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.session_name}
                            </option>
                        ))}
                    </select>
                </label>

                {mode !== 'timed_owner' && selectedSessionId && (
                    <p className="text-amber-400 text-sm mb-4">This session is not in timed owner mode yet.</p>
                )}

                {team ? (
                    <p className="text-sm mb-4 text-slate-300">
                        Bidding as <strong>{team.name}</strong> · Budget ₹{Number(team.budget).toLocaleString('en-IN')}
                    </p>
                ) : (
                    selectedSessionId && (
                        <p className="text-red-400 text-sm mb-4">
                            No team linked to your phone. Admin must set <strong>owner phone</strong> on your team (+91-XXXXXXXXXX).
                        </p>
                    )
                )}

                {lotStaged && lotPlayer && (
                    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 mb-4 space-y-3">
                        <div className="flex justify-between items-start gap-2">
                            <div>
                                <p className="text-xs uppercase text-slate-400">Current player</p>
                                <p className="text-lg font-semibold">{lotPlayer.name}</p>
                                {(lotPlayer.skill || lotPlayer.age != null) && (
                                    <p className="text-sm text-slate-400">
                                        {[lotPlayer.age != null && `Age ${lotPlayer.age}`, lotPlayer.skill]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </p>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-xs uppercase text-slate-400">Time left</p>
                                <p
                                    className="font-mono font-bold text-emerald-400"
                                    style={{ fontSize: lotBiddingOpen ? '2rem' : '1rem' }}
                                >
                                    {lotBiddingOpen ? countdown : '—'}
                                </p>
                            </div>
                        </div>
                        {!lotBiddingOpen && (
                            <p className="text-sm text-amber-300">Waiting for admin to start the timer on the live auction screen.</p>
                        )}
                        {lotBiddingOpen && (
                            <>
                                <p className="text-sm text-slate-300">
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
                                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-900"
                                />
                                <button
                                    type="button"
                                    disabled={submitting || !team}
                                    onClick={submitBid}
                                    className="w-full py-2.5 rounded-lg font-semibold bg-emerald-600 text-slate-900 disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting…' : 'Submit bid'}
                                </button>
                            </>
                        )}
                    </div>
                )}

                {selectedSessionId && !lotStaged && mode === 'timed_owner' && (
                    <p className="text-sm text-slate-400 text-center py-8">
                        No lot open — wait for admin to start the next player.
                    </p>
                )}
            </div>
        </div>
    );
}

export default function AuctionOwnerPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading…</div>
            }
        >
            <OwnerBidContent />
        </Suspense>
    );
}