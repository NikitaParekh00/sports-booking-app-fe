'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { processImageUrl } from '@/lib/imageUrlHelper';
import PlayerSportRatings from '@/components/PlayerSportRatings';
import { AUCTION_STATS_FIELD_LABELS } from '@/lib/auctionPlayerStatsFields';
import type { SportRatingsMap } from '@/lib/sportRatings';

interface SessionOption {
    id: string;
    session_name: string;
}

interface MyPlayer {
    id?: string;
    name: string;
    photo?: string | null;
    age?: number | null;
    skill?: string | null;
    experience?: string | null;
    player_order: number;
    batting_hand?: string | null;
    bowling_hand?: string | null;
    wing?: string | null;
    phone?: string | null;
    sport_ratings?: SportRatingsMap;
}

const panelStyle = { backgroundColor: '#1F2937', border: '2px solid #374151' };
const labelStyle = { color: '#9CA3AF' };
const valueStyle = { color: '#E5E7EB' };

function dash(value: string | number | null | undefined) {
    if (value == null) return '—';
    const text = String(value).trim();
    return text ? text : '—';
}

function DetailTile({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
        <div className="rounded-lg p-2.5 border min-w-[7rem] flex-1" style={panelStyle}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={labelStyle}>
                {label}
            </div>
            <div className="text-sm font-medium" style={valueStyle}>
                {dash(value)}
            </div>
        </div>
    );
}

function TournamentLogoSlot({ url, alt }: { url?: string | null; alt: string }) {
    const processed = url ? processImageUrl(url) : null;
    return (
        <div
            className="w-24 h-16 sm:w-32 sm:h-20 shrink-0 rounded-lg border flex items-center justify-center overflow-hidden"
            style={{ borderColor: '#374151', backgroundColor: '#1F2937' }}
        >
            {processed ? (
                processed.startsWith('/api/proxy-image') ? (
                    <img src={processed} alt={alt} className="max-w-full max-h-full object-contain p-1" />
                ) : (
                    <Image
                        src={processed}
                        alt={alt}
                        width={128}
                        height={80}
                        className="max-w-full max-h-full object-contain p-1"
                        unoptimized
                    />
                )
            ) : (
                <span className="text-[10px] sm:text-xs text-center px-2 leading-tight" style={{ color: '#6B7280' }}>
                    Tournament logo
                </span>
            )}
        </div>
    );
}

function PlayerPhoto({ name, photo }: { name: string; photo?: string | null }) {
    const photoUrl = photo ? processImageUrl(photo) : null;
    if (!photoUrl) return null;
    const isProxy = photoUrl.startsWith('/api/proxy-image');
    const className = 'object-cover rounded-lg w-28 h-36 sm:w-32 sm:h-40 flex-shrink-0';
    if (isProxy) {
        return (
            <img
                src={photoUrl}
                alt={name}
                width={128}
                height={160}
                className={className}
            />
        );
    }
    return (
        <Image
            src={photoUrl}
            alt={name}
            width={128}
            height={160}
            className={className}
            unoptimized
        />
    );
}

function AuctionConfirmContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionIdFromUrl = searchParams.get('session');
    const supabase = createClient();

    const [ready, setReady] = useState(false);
    const [userPhone, setUserPhone] = useState<string | null>(null);
    const [sessions, setSessions] = useState<SessionOption[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState(sessionIdFromUrl ?? '');
    const [loading, setLoading] = useState(false);
    const [player, setPlayer] = useState<MyPlayer | null>(null);
    const [sessionName, setSessionName] = useState<string | null>(null);
    const [tournamentLogo, setTournamentLogo] = useState<string | null>(null);
    const [tournamentDates, setTournamentDates] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [issueText, setIssueText] = useState('');
    const [issueSubmitting, setIssueSubmitting] = useState(false);
    const [issueSent, setIssueSent] = useState(false);
    const [approvedAt, setApprovedAt] = useState<string | null>(null);
    const [approveSubmitting, setApproveSubmitting] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('sf:user');
        if (!storedUser) {
            const returnTo = `${window.location.pathname}${window.location.search}`;
            router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
            return;
        }
        const init = async () => {
            try {
                const user = JSON.parse(storedUser);
                let phone = user.phone as string | undefined;
                if (!phone && user.user_id) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('phone')
                        .eq('user_id', user.user_id)
                        .maybeSingle();
                    phone = profile?.phone ?? undefined;
                }
                if (!phone) {
                    setMessage('Your account has no phone number on file. Contact support.');
                    setReady(true);
                    return;
                }
                setUserPhone(phone);
                setUserId(user.user_id ?? null);
                setUserName((user.full_name as string) ?? null);
                setReady(true);
            } catch {
                router.push('/login');
            }
        };
        init();
    }, [router, supabase]);

    useEffect(() => {
        if (!ready) return;
        supabase
            .from('auction_sessions')
            .select('id, session_name')
            .eq('is_complete', false)
            .order('created_at', { ascending: false })
            .then(({ data }) => {
                const active = data ?? [];
                setSessions(active);
                setSelectedSessionId((current) => {
                    if (active.length === 1) {
                        const onlyId = active[0].id;
                        if (current !== onlyId) {
                            router.replace(`/auction/confirm?session=${onlyId}`);
                            return onlyId;
                        }
                        return current;
                    }
                    if (current && !active.some((s) => s.id === current)) {
                        router.replace('/auction/confirm');
                        return '';
                    }
                    return current;
                });
            });
    }, [ready, supabase, router]);

    useEffect(() => {
        if (sessionIdFromUrl) setSelectedSessionId(sessionIdFromUrl);
    }, [sessionIdFromUrl]);

    const loadMyProfile = async (sessionId: string) => {
        if (!userPhone || !sessionId) return;
        setLoading(true);
        setMessage(null);
        setPlayer(null);
        setSessionName(null);
        setTournamentLogo(null);
        setTournamentDates(null);
        setApprovedAt(null);
        try {
            const res = await fetch('/api/auction/my-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, phone: userPhone }),
            });
            const json = await res.json();
            if (!res.ok) {
                setMessage(json.message || json.error || 'Could not load your profile.');
                return;
            }
            setSessionName(json.sessionName ?? null);
            setTournamentLogo((json.tournamentLogo as string | null) ?? null);
            setTournamentDates((json.tournamentDates as string | null) ?? null);
            setPlayer(json.player as MyPlayer);
            const approval = json.approval as { approvedAt?: string } | null | undefined;
            setApprovedAt(approval?.approvedAt ?? null);
        } catch {
            setMessage('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (ready && userPhone && selectedSessionId) {
            loadMyProfile(selectedSessionId);
        }
    }, [ready, userPhone, selectedSessionId]);

    const submitIssue = async () => {
        if (!userPhone || !issueText.trim()) return;
        setIssueSubmitting(true);
        setIssueSent(false);
        try {
            const res = await fetch('/api/auction/profile-issue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: selectedSessionId || null,
                    phone: userPhone,
                    message: issueText.trim(),
                    playerPoolId: player?.id ?? null,
                    playerName: player?.name ?? null,
                    reporterUserId: userId,
                    reporterName: userName,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                const detail = json.detail ? `\n\n(${json.detail})` : '';
                alert((json.message || json.error || 'Could not submit. Please try again.') + detail);
                return;
            }
            setIssueText('');
            setIssueSent(true);
        } catch {
            alert('Network error. Please try again.');
        } finally {
            setIssueSubmitting(false);
        }
    };

    const showIssueForm = Boolean(selectedSessionId && userPhone);

    const approveProfile = async () => {
        if (!userPhone || !player?.id || !selectedSessionId) return;
        setApproveSubmitting(true);
        try {
            const res = await fetch('/api/auction/profile-approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: selectedSessionId,
                    phone: userPhone,
                    playerPoolId: player.id,
                    playerName: player.name,
                    approverUserId: userId,
                    approverName: userName,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                const detail = json.detail ? `\n\n(${json.detail})` : '';
                alert((json.message || json.error || 'Could not save approval.') + detail);
                return;
            }
            setApprovedAt(json.approvedAt ?? new Date().toISOString());
        } catch {
            alert('Network error. Please try again.');
        } finally {
            setApproveSubmitting(false);
        }
    };

    if (!ready) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0F172A' }}>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
            </div>
        );
    }

    return (
        <div className="min-h-screen px-4 py-6" style={{ backgroundColor: '#0F172A', color: '#E5E7EB' }}>
            <div className="max-w-lg mx-auto">
                <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="text-sm mb-4"
                    style={{ color: '#9CA3AF' }}
                >
                    ← Dashboard
                </button>

                <h1 className="text-xl font-bold mb-1">My auction profile</h1>
                <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>
                    This profile is from the Google Form you submitted. If anything is wrong, use Report an issue below
                    — the auction admin will review it.
                </p>

                {ready && sessions.length === 0 && (
                    <p className="text-sm mb-6 text-center" style={{ color: '#9CA3AF' }}>
                        No active auction sessions right now. Check back when your league opens profile
                        confirmation.
                    </p>
                )}

                {sessions.length > 0 && (
                    <label className="block mb-6">
                        <span className="text-sm font-medium mb-1 block" style={{ color: '#E5E7EB' }}>
                            Auction session
                        </span>
                        <select
                            value={selectedSessionId}
                            onChange={(e) => {
                                const id = e.target.value;
                                setSelectedSessionId(id);
                                router.replace(id ? `/auction/confirm?session=${id}` : '/auction/confirm');
                            }}
                            className="w-full px-3 py-2 rounded-lg border-2 text-sm"
                            style={{ backgroundColor: '#111827', borderColor: '#374151', color: '#E5E7EB' }}
                        >
                            <option value="">Select session…</option>
                            {sessions.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.session_name}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                {loading && (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
                    </div>
                )}

                {!loading && message && (
                    <p className="text-center py-8 text-sm" style={{ color: '#F87171' }}>
                        {message}
                    </p>
                )}

                {!loading && player && (
                    <>
                        <div
                            className="p-4 md:p-6 rounded-lg border space-y-4"
                            style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}
                        >
                            <div className="flex items-start justify-between gap-3 pb-3 border-b" style={{ borderColor: '#374151' }}>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                        <p className="text-sm sm:text-base font-semibold" style={{ color: '#E5E7EB' }}>
                                            {sessionName ?? 'Auction session'}
                                        </p>
                                        {tournamentDates && (
                                            <>
                                                <span className="text-sm hidden sm:inline" style={{ color: '#4B5563' }}>
                                                    |
                                                </span>
                                                <p
                                                    className="text-xs sm:text-sm font-semibold uppercase tracking-wide"
                                                    style={{ color: '#9CA3AF' }}
                                                >
                                                    Tournament dates
                                                </p>
                                            </>
                                        )}
                                    </div>
                                    {tournamentDates && (
                                        <p
                                            className="text-xs sm:text-sm mt-1.5 leading-relaxed whitespace-pre-line"
                                            style={{ color: '#9CA3AF' }}
                                        >
                                            {tournamentDates}
                                        </p>
                                    )}
                                </div>
                                <TournamentLogoSlot url={tournamentLogo} alt={sessionName ?? 'Tournament'} />
                            </div>
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                                <PlayerPhoto name={player.name} photo={player.photo} />
                                <div className="flex-1 w-full min-w-0 text-center sm:text-left">
                                    <h2 className="text-xl md:text-2xl font-semibold mb-3">{player.name}</h2>
                                    <div className="overflow-x-auto">
                                        <table
                                            className="w-full border-collapse table-fixed text-left"
                                            style={panelStyle}
                                        >
                                            <colgroup>
                                                <col className="w-[20%] min-w-[3.25rem]" />
                                                <col className="w-[38%]" />
                                                <col className="w-[42%]" />
                                            </colgroup>
                                            <thead>
                                                <tr>
                                                    {['Age', 'Skill', 'Federation'].map((h, i) => (
                                                        <th
                                                            key={h}
                                                            className={`text-xs font-bold uppercase tracking-wide ${
                                                                i === 0 ? 'px-1.5 py-2' : 'p-2'
                                                            } ${i === 2 ? 'break-words leading-snug' : ''}`}
                                                            style={{
                                                                ...labelStyle,
                                                                borderBottom: '1px solid #374151',
                                                                borderRight: i < 2 ? '1px solid #374151' : undefined,
                                                            }}
                                                        >
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td
                                                        className="px-1.5 py-2 text-sm font-semibold text-center sm:text-left"
                                                        style={{ ...valueStyle, borderRight: '1px solid #374151' }}
                                                    >
                                                        {dash(player.age)}
                                                    </td>
                                                    <td
                                                        className="p-2 text-sm font-semibold break-words leading-snug"
                                                        style={{ ...valueStyle, borderRight: '1px solid #374151' }}
                                                    >
                                                        {dash(player.skill)}
                                                    </td>
                                                    <td
                                                        className="p-2 text-sm font-semibold break-words leading-snug"
                                                        style={valueStyle}
                                                    >
                                                        {dash(player.experience)}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <DetailTile label={AUCTION_STATS_FIELD_LABELS.batting_hand} value={player.batting_hand} />
                                <DetailTile label={AUCTION_STATS_FIELD_LABELS.bowling_hand} value={player.bowling_hand} />
                                <DetailTile label={AUCTION_STATS_FIELD_LABELS.wing} value={player.wing} />
                                <DetailTile label="Phone" value={player.phone} />
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={labelStyle}>
                                    Sport ratings
                                </p>
                                <PlayerSportRatings
                                    ratings={player.sport_ratings}
                                    textColor="#E5E7EB"
                                    panelStyle={panelStyle}
                                    showAllRatedSports
                                />
                            </div>
                        </div>

                        {approvedAt ? (
                            <p
                                className="mt-4 py-2.5 px-3 rounded-lg text-sm text-center font-medium"
                                style={{ backgroundColor: '#14532D', color: '#86EFAC' }}
                            >
                                You approved this profile on{' '}
                                {new Date(approvedAt).toLocaleString(undefined, {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                })}
                            </p>
                        ) : (
                            <button
                                type="button"
                                disabled={approveSubmitting}
                                onClick={approveProfile}
                                className="mt-4 w-full py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
                                style={{ backgroundColor: '#22C55E', color: '#0F172A' }}
                            >
                                {approveSubmitting ? 'Saving…' : 'Approve — my details are correct'}
                            </button>
                        )}
                    </>
                )}

                {showIssueForm && (
                    <div
                        className="mt-6 p-4 rounded-lg border"
                        style={{ backgroundColor: '#111827', borderColor: '#374151' }}
                    >
                        <h3 className="text-base font-semibold mb-2">Report an issue</h3>
                        <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>
                            Describe what is wrong (age, photo, federation, sport ratings, or{' '}
                            <strong className="font-semibold" style={{ color: '#D1D5DB' }}>
                                matches / runs / wickets
                            </strong>
                            ). If stats are wrong, paste your{' '}
                            <a
                                href="https://cricheroes.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                                style={{ color: '#93C5FD' }}
                            >
                                CricHeroes
                            </a>{' '}
                            profile link so admin can verify. Admin updates data in the auction dashboard.
                        </p>
                        <textarea
                            value={issueText}
                            onChange={(e) => setIssueText(e.target.value)}
                            rows={5}
                            placeholder={`Example: Matches should be 14, runs 620, wickets 6 (not 0). CricHeroes: https://cricheroes.com/player/your-name-xxxxx\nMy federation should be Jain CA Federation. Age is 28.`}
                            className="w-full px-3 py-2 rounded-lg border-2 text-sm mb-3 resize-y"
                            style={{
                                backgroundColor: '#0F172A',
                                borderColor: '#374151',
                                color: '#E5E7EB',
                            }}
                        />
                        <button
                            type="button"
                            disabled={issueSubmitting || issueText.trim().length < 5}
                            onClick={submitIssue}
                            className="w-full py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
                            style={{ backgroundColor: '#E11D48', color: '#FFFFFF' }}
                        >
                            {issueSubmitting ? 'Sending…' : 'Submit issue'}
                        </button>
                        {issueSent && (
                            <p className="text-sm mt-3 text-center" style={{ color: '#22C55E' }}>
                                Thanks — your report was sent to the admin.
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AuctionConfirmPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0F172A' }}>
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
                </div>
            }
        >
            <AuctionConfirmContent />
        </Suspense>
    );
}