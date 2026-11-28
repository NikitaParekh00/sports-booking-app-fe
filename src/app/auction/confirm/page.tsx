'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { processImageUrl } from '@/lib/imageUrlHelper';
import PlayerSportRatings from '@/components/PlayerSportRatings';
import { AUCTION_STATS_FIELD_LABELS } from '@/lib/auctionPlayerStatsFields';
import type { SportRatingsMap } from '@/lib/sportRatings';
import AuctionChooseMode from '@/components/auction/AuctionChooseMode';
import AuctionOwnerTimedBidPanel from '@/components/auction/AuctionOwnerTimedBidPanel';
import { isAuctionAdminPhone } from '@/lib/auctionAccess';
import { AUCTION_HUB_PATH, isAppAdmin } from '@/lib/postLoginRedirect';

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

/** Same blues as auction team cards that can bid. */
const PAGE_BG = '#1E3A8A';
const CARD_BLUE = '#0F172A';
const BLUE_BORDER = '#3B82F6';
const TEXT = '#E5E7EB';
const TEXT_STRONG = '#FFFFFF';

const valueStyle = { color: TEXT_STRONG };

const pageBackground = {
    backgroundColor: '#0F172A',
    color: TEXT,
};

function dash(value: string | number | null | undefined) {
    if (value == null) return '—';
    const text = String(value).trim();
    return text ? text : '—';
}

function DetailTile({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
        <div
            className="rounded-lg p-2.5 border min-w-[7rem] flex-1"
            style={{ backgroundColor: PAGE_BG, borderColor: BLUE_BORDER }}
        >
            <div className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: '#93C5FD' }}>
                {label}
            </div>
            <div className="text-sm font-medium" style={{ color: TEXT_STRONG }}>
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
            style={{ backgroundColor: PAGE_BG, borderColor: BLUE_BORDER }}
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
    const pageMode = searchParams.get('mode') === 'choose' ? 'choose' : 'profile';
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
    const [canRunLiveAuction, setCanRunLiveAuction] = useState(false);
    const [showAppDashboard, setShowAppDashboard] = useState(false);
    const [hubSessionId, setHubSessionId] = useState<string | null>(null);

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
                let role = user.role as string | undefined;
                if (user.user_id) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('phone, role, full_name')
                        .eq('user_id', user.user_id)
                        .maybeSingle();
                    phone = phone ?? profile?.phone ?? undefined;
                    role = role ?? profile?.role ?? undefined;
                    if (profile?.full_name && !user.full_name) {
                        setUserName(profile.full_name);
                    }
                }
                if (!phone) {
                    setMessage('Your account has no phone number on file. Contact support.');
                    setReady(true);
                    return;
                }
                setUserPhone(phone);
                setUserId(user.user_id ?? null);
                setUserName((user.full_name as string) ?? null);
                setCanRunLiveAuction(isAuctionAdminPhone(phone));
                setShowAppDashboard(isAppAdmin(role, phone));
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
                if (active[0]?.id) setHubSessionId(active[0].id);
                setSelectedSessionId((current) => {
                    if (active.length === 1) return active[0].id;
                    if (current && !active.some((s) => s.id === current)) return '';
                    return current;
                });
            });
    }, [ready, supabase]);

    useEffect(() => {
        if (!ready || sessions.length === 0 || pageMode === 'choose') return;
        if (sessions.length === 1) {
            const onlyId = sessions[0].id;
            if (sessionIdFromUrl !== onlyId) {
                router.replace(`/auction/confirm?mode=profile&session=${onlyId}`);
            }
            return;
        }
        if (sessionIdFromUrl && !sessions.some((s) => s.id === sessionIdFromUrl)) {
            router.replace('/auction/confirm?mode=profile');
        }
    }, [ready, sessions, sessionIdFromUrl, router, pageMode]);

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
        if (pageMode === 'choose') return;
        if (ready && userPhone && selectedSessionId) {
            loadMyProfile(selectedSessionId);
        }
    }, [ready, userPhone, selectedSessionId, pageMode]);

    const handleLogout = () => {
        try {
            localStorage.removeItem('sf:user');
            localStorage.removeItem('sf:selectedLocation');
            localStorage.removeItem('sf:selectedLocationObj');
        } catch {
            /* ignore */
        }
        window.location.href = '/login';
    };

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
            <div className="min-h-screen flex items-center justify-center" style={pageBackground}>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: BLUE_BORDER }} />
            </div>
        );
    }

    if (pageMode === 'choose') {
        return (
            <AuctionChooseMode
                displayName={userName}
                canRunLiveAuction={canRunLiveAuction}
                showAppDashboard={showAppDashboard}
                activeSessionId={hubSessionId ?? (selectedSessionId || null)}
                onLogout={handleLogout}
            />
        );
    }

    return (
        <div className="min-h-screen px-4 py-6" style={pageBackground}>
            <div className="max-w-lg mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <button
                        type="button"
                        onClick={() => router.push(AUCTION_HUB_PATH)}
                        className="text-sm"
                        style={{ color: TEXT }}
                    >
                        ← Back
                    </button>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="text-sm font-semibold px-3 py-1.5 rounded-lg border"
                        style={{ color: TEXT_STRONG, borderColor: BLUE_BORDER, backgroundColor: BLUE_BORDER }}
                    >
                        Logout
                    </button>
                </div>

                <h1 className="text-xl font-bold mb-1">Profile &amp; closed bidding</h1>
                <p className="text-sm mb-6" style={{ color: TEXT }}>
                    Confirm your player details below. Team owners can place sealed bids in the same place when timed
                    mode is running.
                </p>

                {ready && sessions.length === 0 && (
                    <p className="text-sm mb-6 text-center" style={{ color: TEXT }}>
                        No active auction sessions right now. Check back when your league opens profile
                        confirmation.
                    </p>
                )}

                {sessions.length > 0 && (
                    <label className="block mb-6">
                        <span className="text-sm font-medium mb-1 block" style={{ color: TEXT }}>
                            Auction session
                        </span>
                        <select
                            value={selectedSessionId}
                            onChange={(e) => {
                                const id = e.target.value;
                                setSelectedSessionId(id);
                                router.replace(
                                    id
                                        ? `/auction/confirm?mode=profile&session=${id}`
                                        : '/auction/confirm?mode=profile'
                                );
                            }}
                            className="w-full px-3 py-2 rounded-lg border-2 text-sm"
                            style={{ backgroundColor: '#111827', borderColor: BLUE_BORDER, color: TEXT }}
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

                {userPhone && selectedSessionId && (
                    <AuctionOwnerTimedBidPanel sessionId={selectedSessionId} phone={userPhone} />
                )}

                {loading && (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: BLUE_BORDER }} />
                    </div>
                )}

                {!loading && message && (
                    <p className="text-center py-8 text-sm" style={{ color: TEXT }}>
                        {message}
                    </p>
                )}

                {!loading && player && (
                    <>
                        <div
                            className="p-4 md:p-6 rounded-lg border space-y-4"
                            style={{ backgroundColor: CARD_BLUE, borderColor: BLUE_BORDER }}
                        >
                            <div className="flex items-start justify-between gap-3 pb-3 border-b" style={{ borderColor: BLUE_BORDER }}>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                        <p className="text-sm sm:text-base font-semibold" style={{ color: TEXT_STRONG }}>
                                            {sessionName ?? 'Auction session'}
                                        </p>
                                        {tournamentDates && (
                                            <>
                                                <span className="text-sm hidden sm:inline" style={{ color: BLUE_BORDER }}>
                                                    |
                                                </span>
                                                <p
                                                    className="text-xs sm:text-sm font-semibold uppercase tracking-wide"
                                                    style={{ color: '#93C5FD' }}
                                                >
                                                    Tournament dates
                                                </p>
                                            </>
                                        )}
                                    </div>
                                    {tournamentDates && (
                                        <p
                                            className="text-xs sm:text-sm mt-1.5 leading-relaxed whitespace-pre-line"
                                            style={{ color: TEXT }}
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
                                    <h2 className="text-xl md:text-2xl font-semibold mb-3" style={{ color: TEXT_STRONG }}>
                                        {player.name}
                                    </h2>
                                    <div className="overflow-x-auto">
                                        <table
                                            className="w-full border-collapse text-left"
                                            style={{ backgroundColor: PAGE_BG, border: `2px solid ${BLUE_BORDER}` }}
                                        >
                                            <colgroup>
                                                <col style={{ width: '22%' }} />
                                                <col style={{ width: '28%' }} />
                                                <col style={{ width: '50%' }} />
                                            </colgroup>
                                            <thead>
                                                <tr>
                                                    {['Age', 'Skill', 'Federation'].map((h, i) => (
                                                        <th
                                                            key={h}
                                                            className={`text-[11px] sm:text-xs font-bold uppercase tracking-wide leading-tight whitespace-normal break-words ${
                                                                i === 0 ? 'px-1.5 py-2' : 'p-2'
                                                            }`}
                                                            style={{
                                                                color: TEXT_STRONG,
                                                                backgroundColor: BLUE_BORDER,
                                                                borderBottom: `1px solid ${PAGE_BG}`,
                                                                borderRight: i < 2 ? `1px solid ${PAGE_BG}` : undefined,
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
                                                        style={{ ...valueStyle, borderRight: `1px solid ${BLUE_BORDER}` }}
                                                    >
                                                        {dash(player.age)}
                                                    </td>
                                                    <td
                                                        className="p-2 text-sm font-semibold break-words leading-snug"
                                                        style={{ ...valueStyle, borderRight: `1px solid ${BLUE_BORDER}` }}
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

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#93C5FD' }}>
                                    Cricket stats
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <DetailTile label={AUCTION_STATS_FIELD_LABELS.batting_hand} value={player.batting_hand} />
                                    <DetailTile label={AUCTION_STATS_FIELD_LABELS.bowling_hand} value={player.bowling_hand} />
                                    <DetailTile label={AUCTION_STATS_FIELD_LABELS.wing} value={player.wing} />
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#93C5FD' }}>
                                    Sport ratings
                                </p>
                                <PlayerSportRatings
                                    ratings={player.sport_ratings}
                                    textColor={TEXT}
                                    panelStyle={{ backgroundColor: PAGE_BG, border: `2px solid ${BLUE_BORDER}` }}
                                    showAllRatedSports
                                />
                            </div>
                        </div>

                        {approvedAt ? (
                            <p
                                className="mt-4 py-2.5 px-3 rounded-lg text-sm text-center font-medium"
                                style={{ backgroundColor: PAGE_BG, color: TEXT, border: `2px solid ${BLUE_BORDER}` }}
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
                                style={{ backgroundColor: BLUE_BORDER, color: TEXT_STRONG }}
                            >
                                {approveSubmitting ? 'Saving…' : 'Approve — my details are correct'}
                            </button>
                        )}
                    </>
                )}

                {showIssueForm && (
                    <div
                        className="mt-6 p-4 rounded-lg border"
                        style={{ backgroundColor: '#111827', borderColor: BLUE_BORDER }}
                    >
                        <h3 className="text-base font-semibold mb-2">Report an issue</h3>
                        <p className="text-xs mb-3" style={{ color: TEXT }}>
                            Describe what is wrong (age, photo, federation, sport ratings, or{' '}
                            <strong className="font-semibold" style={{ color: '#FFFFFF' }}>
                                matches / runs / wickets
                            </strong>
                            ). If stats are wrong, paste your{' '}
                            <a
                                href="https://cricheroes.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                                style={{ color: TEXT }}
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
                                backgroundColor: PAGE_BG,
                                borderColor: BLUE_BORDER,
                                color: TEXT,
                            }}
                        />
                        <button
                            type="button"
                            disabled={issueSubmitting || issueText.trim().length < 5}
                            onClick={submitIssue}
                            className="w-full py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
                            style={{ backgroundColor: BLUE_BORDER, color: TEXT_STRONG }}
                        >
                            {issueSubmitting ? 'Sending…' : 'Submit issue'}
                        </button>
                        {issueSent && (
                            <p className="text-sm mt-3 text-center" style={{ color: TEXT }}>
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
                <div className="min-h-screen flex items-center justify-center" style={pageBackground}>
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: BLUE_BORDER }} />
                </div>
            }
        >
            <AuctionConfirmContent />
        </Suspense>
    );
}