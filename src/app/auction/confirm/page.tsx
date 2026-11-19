'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { processImageUrl } from '@/lib/imageUrlHelper';

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
    category?: string | null;
    player_order: number;
    experience?: string | null;
    active_sport?: string | null;
}

function PlayerPhoto({ name, photo }: { name: string; photo?: string | null }) {
    const photoUrl = photo ? processImageUrl(photo) : null;
    if (!photoUrl) return null;
    const isProxy = photoUrl.startsWith('/api/proxy-image');
    if (isProxy) {
        return (
            <img
                src={photoUrl}
                alt={name}
                width={80}
                height={80}
                className="object-cover rounded-lg flex-shrink-0"
            />
        );
    }
    return (
        <Image
            src={photoUrl}
            alt={name}
            width={80}
            height={80}
            className="object-cover rounded-lg flex-shrink-0"
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
    const [message, setMessage] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [userName, setUserName] = useState<string | null>(null);
    const [issueText, setIssueText] = useState('');
    const [issueSubmitting, setIssueSubmitting] = useState(false);
    const [issueSent, setIssueSent] = useState(false);

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
            .order('created_at', { ascending: false })
            .then(({ data }) => {
                if (data) setSessions(data);
            });
    }, [ready, supabase]);

    useEffect(() => {
        if (sessionIdFromUrl) setSelectedSessionId(sessionIdFromUrl);
    }, [sessionIdFromUrl]);

    const loadMyProfile = async (sessionId: string) => {
        if (!userPhone || !sessionId) return;
        setLoading(true);
        setMessage(null);
        setPlayer(null);
        setSessionName(null);
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
            setPlayer(json.player as MyPlayer);
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
                    Only your row is shown, matched to the phone you logged in with. If anything is wrong, use Report an
                    issue below — the auction admin will review it.
                </p>

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
                        {sessionName && (
                            <p className="text-sm mb-3" style={{ color: '#9CA3AF' }}>
                                {sessionName}
                            </p>
                        )}
                        <div
                            className="p-4 md:p-6 rounded-lg border"
                            style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}
                        >
                            <div className="flex items-center gap-4">
                                <PlayerPhoto name={player.name} photo={player.photo} />
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-lg md:text-xl font-semibold mb-1">{player.name}</h2>
                                    <p className="text-sm md:text-base" style={{ color: '#9CA3AF' }}>
                                        {player.age != null && <span>Age: {player.age}</span>}
                                        {player.age != null && player.skill && <span> | </span>}
                                        {player.skill && <span>Skill: {player.skill}</span>}
                                        {player.category && (
                                            <>
                                                {(player.age != null || player.skill) && <span> | </span>}
                                                <span>Category: {player.category}</span>
                                            </>
                                        )}
                                        <span> | </span>
                                        <span>Order: {player.player_order}</span>
                                    </p>
                                    {(player.experience || player.active_sport) && (
                                        <p className="text-sm mt-2" style={{ color: '#9CA3AF' }}>
                                            {player.experience && <span>Membership: {player.experience}</span>}
                                            {player.experience && player.active_sport && <span> | </span>}
                                            {player.active_sport && <span>Profession: {player.active_sport}</span>}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {showIssueForm && (
                    <div
                        className="mt-6 p-4 rounded-lg border"
                        style={{ backgroundColor: '#111827', borderColor: '#374151' }}
                    >
                        <h3 className="text-base font-semibold mb-2">Report an issue</h3>
                        <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>
                            Describe what is wrong (e.g. wrong age, photo, category, or missing profile). Admin updates
                            data in the auction dashboard.
                        </p>
                        <textarea
                            value={issueText}
                            onChange={(e) => setIssueText(e.target.value)}
                            rows={4}
                            placeholder="Example: My category should be B, not Emerging. My age is 27."
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