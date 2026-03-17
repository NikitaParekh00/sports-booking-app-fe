"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { opponentManager } from "@/lib/opponentManagement";
import PhoneInput from "@/components/PhoneInput";
import { parseParticipantCsv, BADMINTON_PARTICIPANT_CSV_TEMPLATE } from "@/lib/csvParticipantParser";

interface Tournament {
    id: string;
    name: string;
    sport: string;
    description: string;
    start_date: string;
    end_date: string;
    location: string;
    max_participants: number;
    entry_fee: number;
    prize_pool: number;
    status: string;
    created_by: string;
    format?: string;
    sets_per_match?: number;
    points_per_set?: number;
    win_by_two?: boolean;
    max_points?: number;
    seeding_method?: string;
    current_round?: number;
    total_rounds?: number;
    brackets_generated?: boolean;
    groups_generated?: boolean;
    tournament_mode?: 'individual' | 'team';
}

interface Participant {
    id: string;
    tournament_id: string;
    user_id: string | null;
    player_name: string;
    phone: string | null;
    status: string;
    created_at: string;
    email?: string | null;
    category?: string | null;
    seed_number?: number | null;
    club?: string | null;
}

interface MatchPlayer {
    id: string;
    player_name: string;
    team: string;
}

interface TournamentMatch {
    id: string;
    match_date: string | null;
    status: string;
    match_players?: MatchPlayer[];
    team_a_id?: string | null;
    team_b_id?: string | null;
    winner_team_id?: string | null;
    court_number?: string | null;
    final_score?: string | null;
    match_number?: string | null;
    team_a?: { id: string; name: string; short_name?: string | null };
    team_b?: { id: string; name: string; short_name?: string | null };
    winner_team?: { id: string; name: string } | null;
}

interface TournamentTeam {
    id: string;
    tournament_id: string;
    name: string;
    short_name: string | null;
    category: string | null;
    created_at: string;
}

interface TournamentTeamMember {
    id: string;
    team_id: string;
    participant_id: string;
    position: number;
    participant?: Participant;
}

const ALLOWED_EDIT_PHONE = "+91-7506256356";

export default function TournamentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const tournamentId = params.id as string;
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(true);
    const [canEdit, setCanEdit] = useState(false);
    type TabType = 'overview' | 'participants' | 'groups' | 'brackets' | 'matches' | 'settings' | 'teams' | 'schedule' | 'results' | 'team_stats' | 'player_stats';
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const isTeamTournament = (tournament?.tournament_mode ?? 'individual') === 'team';
    const [showAddParticipant, setShowAddParticipant] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const checkEditAccess = async () => {
            try {
                const storedUser = localStorage.getItem("sf:user");
                if (!storedUser) {
                    setCanEdit(false);
                    setAuthLoading(false);
                    return;
                }
                const userData = JSON.parse(storedUser);
                const { data: profile } = await supabase.from("profiles").select("phone").eq("user_id", userData.user_id).single();
                setCanEdit(profile?.phone === ALLOWED_EDIT_PHONE);
            } catch {
                setCanEdit(false);
            } finally {
                setAuthLoading(false);
            }
        };
        checkEditAccess();
    }, [supabase]);

    const fetchTournamentData = useCallback(async () => {
        try {
            // Fetch tournament
            const { data: tournamentData, error: tournamentError } = await supabase
                .from('tournaments')
                .select('*')
                .eq('id', tournamentId)
                .single();

            if (tournamentError) throw tournamentError;

            // Fetch participants
            const { data: participantsData, error: participantsError } = await supabase
                .from('tournament_participants')
                .select('*')
                .eq('tournament_id', tournamentId)
                .order('created_at', { ascending: true });

            if (participantsError) throw participantsError;

            setTournament(tournamentData);
            setParticipants(participantsData || []);
        } catch (error) {
            console.error('Error fetching tournament data:', error);
            alert('Failed to load tournament data');
        } finally {
            setIsLoading(false);
        }
    }, [tournamentId, supabase]);

    useEffect(() => {
        if (tournamentId) {
            fetchTournamentData();
        }
    }, [tournamentId, fetchTournamentData]);

    const handleStartTournament = async () => {
        if (!tournament) return;

        if (participants.length < 2) {
            alert('You need at least 2 participants to start a tournament');
            return;
        }

        try {
            const { error } = await supabase
                .from('tournaments')
                .update({ status: 'live' })
                .eq('id', tournamentId);

            if (error) throw error;

            setTournament(prev => prev ? { ...prev, status: 'live' } : null);
            alert('Tournament started!');
        } catch (error) {
            console.error('Error starting tournament:', error);
            alert('Failed to start tournament');
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4" />
                    <p className="text-gray-400">{authLoading ? "Checking access…" : "Loading tournament…"}</p>
                </div>
            </div>
        );
    }

    if (!tournament) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
                <div className="text-center bg-gray-900 rounded-2xl shadow-lg p-6 max-w-md w-full border border-[#1F2937]">
                    <p className="text-red-600 mb-4">Tournament not found</p>
                    <button
                        onClick={() => router.push("/scoring/tournaments")}
                        className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                    >
                        Back to Tournaments
                    </button>
                </div>
            </div>
        );
    }

    const sportIcons: { [key: string]: string } = {
        cricket: "🏏",
        football: "⚽",
        badminton: "🏸",
        tennis: "🎾",
        "table-tennis": "🏓",
        pickleball: "🏓",
        padel: "🎾",
        squash: "🏓",
        billiards: "🎱",
        basketball: "🏀",
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'live': return 'text-green-600 bg-green-100';
            case 'completed': return 'text-gray-400 bg-gray-800';
            case 'cancelled': return 'text-red-600 bg-red-100';
            case 'upcoming': return 'text-blue-600 bg-blue-100';
            default: return 'text-gray-400 bg-gray-800';
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 w-full min-w-0 overflow-x-hidden" style={{ backgroundColor: '#0F172A' }}>
            {/* Header */}
            <div className="border-b border-[#1F2937] sticky top-0 z-10 shadow-sm" style={{ backgroundColor: '#111827' }}>
                <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-4 mb-4 min-w-0">
                        <button
                            onClick={() => router.push('/scoring/tournaments')}
                            className="flex items-center gap-1.5 sm:gap-2 text-gray-300 hover:text-red-400 text-sm md:text-base touch-manipulation flex-shrink-0 min-w-0"
                        >
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <span className="truncate">Back to Tournaments</span>
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4 min-w-0">
                        <div className="flex-1 min-w-0 w-full">
                            <div className="flex items-start gap-3 mb-2 min-w-0">
                                <span className="text-2xl sm:text-3xl md:text-4xl flex-shrink-0">{sportIcons[tournament.sport]}</span>
                                <div className="min-w-0 flex-1 overflow-hidden">
                                    <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-100 break-words line-clamp-2">{tournament.name}</h1>
                                    <p className="text-gray-400 text-xs md:text-sm mt-1 line-clamp-2">{tournament.description || 'No description'}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-3 text-xs md:text-sm text-gray-400">
                                <div className="flex items-center gap-1">
                                    <span>📍</span>
                                    <span className="truncate">{tournament.location || 'No location'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span>📅</span>
                                    <span>{new Date(tournament.start_date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span>👥</span>
                                    <span>{participants.length} / {tournament.max_participants} participants</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center flex-shrink-0">
                            <Image src="/logo.jpeg" alt="Simplifit" width={260} height={72} className="h-14 sm:h-16 w-auto object-contain max-w-[200px] sm:max-w-[240px]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-[#1F2937] sticky top-0 md:top-[140px] z-10 shadow-sm min-w-0" style={{ backgroundColor: '#111827' }}>
                <div className="max-w-6xl mx-auto px-3 sm:px-4 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0 -mb-px pb-px">
                        <div className="flex gap-2 sm:gap-4 md:gap-6 overflow-x-auto scrollbar-hide min-w-0 flex-1">
                            {(isTeamTournament
                                ? [
                                    { id: 'overview', label: 'Overview' },
                                    { id: 'participants', label: `Participants (${participants.length})` },
                                    { id: 'teams', label: 'Teams' },
                                    { id: 'schedule', label: 'Schedule' },
                                    { id: 'results', label: 'Results' },
                                    { id: 'team_stats', label: 'Team Stats' },
                                    { id: 'player_stats', label: 'Player Stats' },
                                    { id: 'settings', label: 'Settings' },
                                  ]
                                : [
                                    { id: 'overview', label: 'Overview' },
                                    { id: 'participants', label: `Participants (${participants.length})` },
                                    { id: 'groups', label: 'Groups' },
                                    { id: 'brackets', label: 'Brackets' },
                                    { id: 'matches', label: 'Matches' },
                                    { id: 'settings', label: 'Settings' },
                                  ]
                            ).map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabType)}
                                className={`py-3 md:py-4 px-2 border-b-2 font-medium text-xs md:text-sm transition-colors whitespace-nowrap flex-shrink-0 ${
                                    activeTab === tab.id
                                            ? 'border-red-500 text-red-400'
                                            : 'border-transparent text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 pl-2 border-b-2 border-transparent py-3 md:py-4">
                            <div className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium ${getStatusColor(tournament.status)}`}>
                                {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                            </div>
                            {tournament.status === 'upcoming' && canEdit && (
                                <button
                                    onClick={handleStartTournament}
                                    className="bg-red-600 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-red-700 text-xs md:text-sm whitespace-nowrap font-medium"
                                >
                                    Start Tournament
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 md:py-6 min-w-0 w-full overflow-x-hidden" style={{ backgroundColor: '#0F172A' }}>
                {activeTab === 'overview' && (
                    <TournamentOverview tournament={tournament} participants={participants} />
                )}

                {activeTab === 'participants' && (
                    <ParticipantsTab
                        tournament={tournament}
                        participants={participants}
                        onParticipantsChange={fetchTournamentData}
                        showAddParticipant={showAddParticipant}
                        setShowAddParticipant={setShowAddParticipant}
                        canEdit={canEdit}
                    />
                )}

                {activeTab === 'groups' && (
                    <GroupsTab tournament={tournament} participants={participants} />
                )}

                {activeTab === 'brackets' && (
                    <BracketsTab tournament={tournament} participants={participants} />
                )}

                {activeTab === 'matches' && (
                    <MatchesTab tournament={tournament} />
                )}

                {activeTab === 'teams' && isTeamTournament && (
                    <TeamsTab tournament={tournament} participants={participants} onRefresh={fetchTournamentData} canEdit={canEdit} />
                )}
                {activeTab === 'schedule' && isTeamTournament && (
                    <TeamScheduleTab tournament={tournament} onRefresh={fetchTournamentData} canEdit={canEdit} />
                )}
                {activeTab === 'results' && isTeamTournament && (
                    <TeamResultsTab tournament={tournament} onRefresh={fetchTournamentData} canEdit={canEdit} />
                )}
                {activeTab === 'team_stats' && isTeamTournament && (
                    <TeamStatsTab tournament={tournament} canEdit={canEdit} />
                )}
                {activeTab === 'player_stats' && isTeamTournament && (
                    <PlayerStatsTab tournament={tournament} />
                )}

                {activeTab === 'settings' && (
                    <SettingsTab tournament={tournament} onTournamentUpdate={fetchTournamentData} canEdit={canEdit} />
                )}
            </div>
        </div>
    );
}

// Overview Tab Component
function TournamentOverview({ tournament, participants }: { tournament: Tournament; participants: Participant[] }) {
    const confirmedParticipants = participants.filter(p => p.status === 'confirmed' || p.status === 'registered');
    const eliminatedParticipants = participants.filter(p => p.status === 'eliminated');
    const winner = participants.find(p => p.status === 'winner');

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-gray-900 border border-[#1F2937] rounded-xl shadow-sm p-3 md:p-4">
                    <div className={`text-xs md:text-sm text-gray-400 mb-1`}>Total Participants</div>
                    <div className={`text-xl md:text-2xl font-semibold text-gray-100`}>{participants.length}</div>
                </div>
                <div className="bg-gray-900 border border-[#1F2937] rounded-xl shadow-sm p-3 md:p-4">
                    <div className={`text-xs md:text-sm text-gray-400 mb-1`}>Confirmed</div>
                    <div className={`text-xl md:text-2xl font-semibold text-green-600`}>{confirmedParticipants.length}</div>
                </div>
                <div className="bg-gray-900 border border-[#1F2937] rounded-xl shadow-sm p-3 md:p-4">
                    <div className={`text-xs md:text-sm text-gray-400 mb-1`}>Eliminated</div>
                    <div className="text-xl md:text-2xl font-semibold text-red-600">{eliminatedParticipants.length}</div>
                </div>
                <div className="bg-gray-900 border border-[#1F2937] rounded-xl shadow-sm p-3 md:p-4">
                    <div className={`text-xs md:text-sm text-gray-400 mb-1`}>Entry Fee</div>
                    <div className={`text-xl md:text-2xl font-semibold text-gray-100`}>₹{tournament.entry_fee}</div>
                </div>
            </div>

            {/* Tournament Info */}
            <div className="bg-gray-900 border border-[#1F2937] rounded-xl shadow-sm p-4 md:p-6">
                <h2 className={`text-base md:text-lg font-semibold text-gray-100 mb-4`}>Tournament Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                    <div>
                        <div className="text-gray-400 mb-1">Format</div>
                        <div className={`font-medium text-gray-100`}>
                            {tournament.format?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Single Elimination'}
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-400 mb-1">Match Format</div>
                        <div className={`font-medium text-gray-100`}>
                            Best of {tournament.sets_per_match || 3} sets, {tournament.points_per_set || 21} points
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-400 mb-1">Prize Pool</div>
                        <div className={`font-medium text-gray-100`}>₹{tournament.prize_pool}</div>
                    </div>
                    <div>
                        <div className="text-gray-400 mb-1">Start Date</div>
                        <div className={`font-medium text-gray-100`}>
                            {new Date(tournament.start_date).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {winner && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <span className="text-4xl">🏆</span>
                        <div>
                            <div className="text-sm text-yellow-800 font-medium">Tournament Winner</div>
                            <div className="text-2xl font-bold text-yellow-900">{winner.player_name}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Participants Tab Component
function ParticipantsTab({
    tournament,
    participants,
    onParticipantsChange,
    showAddParticipant,
    setShowAddParticipant,
    canEdit = false,
}: {
    tournament: Tournament;
    participants: Participant[];
    onParticipantsChange: () => void;
    showAddParticipant: boolean;
    setShowAddParticipant: (show: boolean) => void;
    canEdit?: boolean;
}) {
    const [newParticipantName, setNewParticipantName] = useState("");
    const [newParticipantPhone, setNewParticipantPhone] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [isUploadingCsv, setIsUploadingCsv] = useState(false);
    const [csvUploadError, setCsvUploadError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const supabase = createClient();

    const handleAddParticipant = async () => {
        if (!newParticipantName.trim()) {
            alert('Please enter participant name');
            return;
        }

        if (participants.length >= tournament.max_participants) {
            alert(`Tournament is full. Maximum ${tournament.max_participants} participants allowed.`);
            return;
        }

        const formattedPhone = newParticipantPhone ? `+91-${newParticipantPhone.replace(/\D/g, '')}` : null;

        setIsAdding(true);
        try {
            // If phone is provided, try to find or create user
            let userId = null;
            if (newParticipantPhone) {
                const phoneValidation = opponentManager.validatePhoneNumber(newParticipantPhone);
                if (phoneValidation.isValid) {
                    const opponentInfo = await opponentManager.findOrCreateOpponent(newParticipantPhone, newParticipantName);
                    userId = opponentInfo.user_id;
                }
            }

            const { error } = await supabase
                .from('tournament_participants')
                .insert({
                    tournament_id: tournament.id,
                    user_id: userId,
                    player_name: newParticipantName,
                    phone: formattedPhone,
                    status: 'registered',
                });

            if (error) throw error;

            setNewParticipantName("");
            setNewParticipantPhone("");
            setShowAddParticipant(false);
            onParticipantsChange();
        } catch (error) {
            console.error('Error adding participant:', error);
            alert('Failed to add participant');
        } finally {
            setIsAdding(false);
        }
    };

    const handleUploadCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setCsvUploadError(null);
        if (!file) return;
        const text = await file.text();
        const { participants: parsed, errors } = parseParticipantCsv(text);
        if (parsed.length === 0) {
            setCsvUploadError(errors.length > 0 ? errors.join(' ') : 'No valid rows in CSV.');
            e.target.value = '';
            return;
        }
        const max = tournament.max_participants;
        const allowed = Math.max(0, max - participants.length);
        const toAdd = parsed.slice(0, allowed);
        if (toAdd.length === 0) {
            setCsvUploadError(`Tournament is full (max ${max}).`);
            e.target.value = '';
            return;
        }
        if (toAdd.length < parsed.length) {
            setCsvUploadError(`Only ${toAdd.length} of ${parsed.length} added; max ${max} participants.`);
        }
        setIsUploadingCsv(true);
        try {
            for (const p of toAdd) {
                const phone = p.phone ? `+91-${p.phone.replace(/\D/g, '')}` : null;
                let userId = null;
                if (p.phone) {
                    const phoneValidation = opponentManager.validatePhoneNumber(p.phone);
                    if (phoneValidation.isValid) {
                        const opponentInfo = await opponentManager.findOrCreateOpponent(p.phone, p.name);
                        userId = opponentInfo.user_id;
                    }
                }
                const { error } = await supabase
                    .from('tournament_participants')
                    .insert({
                        tournament_id: tournament.id,
                        user_id: userId,
                        player_name: p.name,
                        phone: phone || null,
                        email: p.email || null,
                        category: p.category || null,
                        seed_number: p.seed ?? null,
                        club: p.club || null,
                        status: 'registered',
                    });
                if (error) throw error;
            }
            onParticipantsChange();
        } catch (err) {
            console.error('CSV upload error:', err);
            setCsvUploadError('Failed to add some participants. Check format and try again.');
        } finally {
            setIsUploadingCsv(false);
            e.target.value = '';
        }
    };

    const handleRemoveParticipant = async (participantId: string) => {
        if (!confirm('Are you sure you want to remove this participant?')) return;

        try {
            const { error } = await supabase
                .from('tournament_participants')
                .delete()
                .eq('id', participantId);

            if (error) throw error;

            onParticipantsChange();
        } catch (error) {
            console.error('Error removing participant:', error);
            alert('Failed to remove participant');
        }
    };

    const handleUpdateStatus = async (participantId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('tournament_participants')
                .update({ status: newStatus })
                .eq('id', participantId);

            if (error) throw error;

            onParticipantsChange();
        } catch (error) {
            console.error('Error updating participant status:', error);
            alert('Failed to update participant status');
        }
    };

    const handleEditParticipant = async (participantId: string) => {
        if (!editName.trim()) {
            alert('Please enter a name');
            return;
        }

        try {
            const { error } = await supabase
                .from('tournament_participants')
                .update({ player_name: editName })
                .eq('id', participantId);

            if (error) throw error;

            setEditingId(null);
            setEditName("");
            onParticipantsChange();
        } catch (error) {
            console.error('Error updating participant:', error);
            alert('Failed to update participant');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className={`text-xl font-semibold text-gray-100`}>Participants</h2>
                {canEdit && !showAddParticipant && (
                    <div className="flex items-center gap-2">
                        <label className="cursor-pointer bg-gray-800 text-gray-200 px-3 py-2 rounded-lg hover:bg-gray-700 border-gray-600 text-sm font-medium border border-gray-600 bg-gray-800 text-gray-100">
                            {isUploadingCsv ? 'Uploading...' : 'Upload CSV'}
                            <input
                                type="file"
                                accept=".csv,.txt"
                                className="sr-only"
                                disabled={isUploadingCsv || participants.length >= tournament.max_participants}
                                onChange={handleUploadCsv}
                            />
                        </label>
                        <a
                            href={`data:text/csv;charset=utf-8,${encodeURIComponent(BADMINTON_PARTICIPANT_CSV_TEMPLATE)}`}
                            download="badminton_participants_template.csv"
                            className="text-sm text-blue-600 hover:underline"
                        >
                            Template
                        </a>
                        <button
                            onClick={() => setShowAddParticipant(true)}
                            disabled={participants.length >= tournament.max_participants}
                            className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                            Add Participant
                        </button>
                    </div>
                )}
                {!canEdit && <p className="text-sm text-gray-400">View only</p>}
            </div>
            {csvUploadError && <p className="text-sm text-amber-700 mt-2">{csvUploadError}</p>}

            {canEdit && showAddParticipant && (
                <div className="bg-gray-900 border border-[#1F2937] rounded-xl shadow-sm p-4">
                    <h3 className={`font-medium text-gray-100 mb-4`}>Add New Participant</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Name *
                            </label>
                            <input
                                type="text"
                                value={newParticipantName}
                                onChange={(e) => setNewParticipantName(e.target.value)}
                                placeholder="Enter participant name"
                                className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Phone Number (Optional)
                            </label>
                            <PhoneInput
                                value={newParticipantPhone}
                                onChange={setNewParticipantPhone}
                                placeholder="9876543210"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddParticipant}
                                disabled={isAdding}
                                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                            >
                                {isAdding ? 'Adding...' : 'Add Participant'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddParticipant(false);
                                    setNewParticipantName("");
                                    setNewParticipantPhone("");
                                }}
                                className="bg-gray-200 text-gray-300 px-4 py-2 rounded-md hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {participants.length === 0 ? (
                <div className="text-center py-12 bg-gray-900 border border-[#1F2937] rounded-xl shadow-sm">
                    <div className="text-gray-400 mb-4">No participants yet</div>
                    <p className="text-sm text-gray-400 mb-4">Add one by one or upload a CSV (name, phone, email, category, seed, club).</p>
                    {canEdit && (
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <label className="cursor-pointer bg-gray-800 text-gray-200 px-3 py-2 rounded-lg hover:bg-gray-700 border-gray-600 text-sm font-medium border border-gray-600 bg-gray-800 text-gray-100">
                            {isUploadingCsv ? 'Uploading...' : 'Upload CSV'}
                            <input
                                type="file"
                                accept=".csv,.txt"
                                className="sr-only"
                                disabled={isUploadingCsv || participants.length >= tournament.max_participants}
                                onChange={handleUploadCsv}
                            />
                        </label>
                        <a
                            href={`data:text/csv;charset=utf-8,${encodeURIComponent(BADMINTON_PARTICIPANT_CSV_TEMPLATE)}`}
                            download="participants_template.csv"
                            className="text-sm text-red-600 hover:underline px-2"
                        >
                            Download template
                        </a>
                        <span className="text-gray-400">or</span>
                        <button
                            onClick={() => setShowAddParticipant(true)}
                            className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
                        >
                            Add First Participant
                        </button>
                    </div>
                    )}
                </div>
            ) : (
                <div className="bg-gray-900 border border-[#1F2937] rounded-xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-800">
                                <tr>
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-medium uppercase text-gray-100">#</th>
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-medium uppercase text-gray-100">Name</th>
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-medium uppercase text-gray-100 hidden sm:table-cell">Phone</th>
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-medium uppercase text-gray-100 hidden md:table-cell">Category</th>
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-medium uppercase text-gray-100">Status</th>
                                    {canEdit && <th className="px-2 md:px-4 py-3 text-left text-xs font-medium uppercase text-gray-100">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1F2937]">
                                {participants.map((participant, index) => (
                                    <tr key={participant.id} className="hover:bg-gray-900">
                                        <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-gray-100">{index + 1}</td>
                                        <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-gray-300">
                                            {canEdit && editingId === participant.id ? (
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="w-full px-2 py-1 border border-gray-600 bg-gray-800 text-gray-100 rounded text-xs md:text-sm"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleEditParticipant(participant.id);
                                                        } else if (e.key === 'Escape') {
                                                            setEditingId(null);
                                                            setEditName("");
                                                        }
                                                    }}
                                                    autoFocus
                                                />
                                            ) : canEdit ? (
                                                <span
                                                    className="cursor-pointer text-gray-300 hover:text-red-400"
                                                    onClick={() => {
                                                        setEditingId(participant.id);
                                                        setEditName(participant.player_name);
                                                    }}
                                                >
                                                    {participant.player_name}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300">{participant.player_name}</span>
                                            )}
                                        </td>
                                        <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-gray-400 hidden sm:table-cell">{participant.phone || '-'}</td>
                                        <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-gray-400 hidden md:table-cell">{participant.category || '-'}</td>
                                        <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-gray-300">
                                            {canEdit ? (
                                                <select
                                                    value={participant.status}
                                                    onChange={(e) => handleUpdateStatus(participant.id, e.target.value)}
                                                    className="text-xs md:text-sm border border-gray-600 bg-gray-800 text-gray-100 rounded px-1 md:px-2 py-1 w-full"
                                                >
                                                    <option value="registered">Registered</option>
                                                    <option value="confirmed">Confirmed</option>
                                                    <option value="eliminated">Eliminated</option>
                                                    <option value="winner">Winner</option>
                                                </select>
                                            ) : (
                                                <span className="text-gray-300">{participant.status}</span>
                                            )}
                                        </td>
                                        {canEdit && (
                                        <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-gray-300">
                                            <button
                                                onClick={() => handleRemoveParticipant(participant.id)}
                                                className="text-red-600 hover:text-red-700 text-xs md:text-sm"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

// Groups Tab Component
function GroupsTab({ participants }: { tournament: Tournament; participants: Participant[] }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-100">Groups</h2>
                {participants.length >= 2 && (
                    <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                        Create Groups
                    </button>
                )}
            </div>
            {participants.length < 2 ? (
                <div className="bg-gray-900 border border-[#1F2937] rounded-lg p-6 text-center">
                    <p className="text-gray-300">You need at least 2 participants to create groups.</p>
                </div>
            ) : (
                <div className="bg-gray-900 border border-[#1F2937] rounded-xl shadow-sm p-6">
                    <p className="text-gray-300">Groups will be displayed here once created.</p>
                </div>
            )}
        </div>
    );
}

// Brackets Tab Component
function BracketsTab({ participants }: { tournament: Tournament; participants: Participant[] }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-100">Tournament Brackets</h2>
                {participants.length >= 2 && (
                    <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                        Generate Bracket
                    </button>
                )}
            </div>
            {participants.length < 2 ? (
                <div className="bg-gray-900 border border-[#1F2937] rounded-lg p-6 text-center">
                    <p className="text-gray-300">You need at least 2 participants to generate brackets.</p>
                </div>
            ) : (
                <div className="bg-gray-900 border border-[#1F2937] rounded-xl shadow-sm p-6">
                    <p className="text-gray-300">Bracket will be displayed here once generated.</p>
                </div>
            )}
        </div>
    );
}

// Matches Tab Component
function MatchesTab({ tournament }: { tournament: Tournament }) {
    const [matches, setMatches] = useState<TournamentMatch[]>([]);
    const supabase = createClient();

    useEffect(() => {
        const fetchMatches = async () => {
            try {
                const { data, error } = await supabase
                    .from('matches')
                    .select('*, match_players(*)')
                    .eq('tournament_id', tournament.id)
                    .order('match_date', { ascending: true });

                if (error) throw error;
                setMatches(data || []);
            } catch (error) {
                console.error('Error fetching matches:', error);
            }
        };

        if (tournament.id) {
            fetchMatches();
        }
    }, [tournament.id, supabase]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-100">Tournament Matches</h2>
            </div>
            {matches.length === 0 ? (
                <div className="bg-gray-900 border border-[#1F2937] rounded-lg p-6 text-center">
                    <p className="text-gray-300">No matches scheduled yet. Generate brackets to create matches.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {matches.map((match) => (
                        <div key={match.id} className="bg-gray-900 border border-[#1F2937] rounded-xl shadow-sm p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium text-gray-100">
                                        {match.match_players?.find((p: MatchPlayer) => p.team === 'player_1')?.player_name || 'TBD'} 
                                        {' vs '}
                                        {match.match_players?.find((p: MatchPlayer) => p.team === 'player_2')?.player_name || 'TBD'}
                                    </div>
                                    <div className="text-sm text-gray-300 mt-1">
                                        {match.match_date ? new Date(match.match_date).toLocaleString() : 'Not scheduled'}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        match.status === 'live' ? 'bg-green-100 text-green-800' :
                                        match.status === 'completed' ? 'bg-gray-800 text-gray-200' :
                                        'bg-blue-100 text-blue-800'
                                    }`}>
                                        {match.status}
                                    </span>
                                    {match.status === 'live' && (
                                        <a
                                            href={`/scoring/match/${match.id}`}
                                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                        >
                                            Score
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// --- Team tournament tabs ---

function TeamsTab({
    tournament,
    participants,
    onRefresh,
    canEdit = false,
}: {
    tournament: Tournament;
    participants: Participant[];
    onRefresh: () => void;
    canEdit?: boolean;
}) {
    const [teams, setTeams] = useState<TournamentTeam[]>([]);
    const [membersByTeam, setMembersByTeam] = useState<Record<string, TournamentTeamMember[]>>({});
    const [newTeamName, setNewTeamName] = useState("");
    const [newTeamShortName, setNewTeamShortName] = useState("");
    const [addingToTeamId, setAddingToTeamId] = useState<string | null>(null);
    const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
    const [position, setPosition] = useState<1 | 2>(1);
    const [isCreatingFromClubs, setIsCreatingFromClubs] = useState(false);
    const supabase = createClient();

    const loadTeams = useCallback(async () => {
        const { data: teamsData, error: teamsError } = await supabase
            .from("tournament_teams")
            .select("*")
            .eq("tournament_id", tournament.id)
            .order("name");
        if (teamsError) {
            console.error(teamsError);
            return;
        }
        setTeams(teamsData || []);
        const teamIds = (teamsData || []).map((t) => t.id);
        if (teamIds.length === 0) {
            setMembersByTeam({});
            return;
        }
        const { data: membersData, error: membersError } = await supabase
            .from("tournament_team_members")
            .select("*, participant:tournament_participants(*)")
            .in("team_id", teamIds);
        if (membersError) {
            console.error(membersError);
            return;
        }
        const byTeam: Record<string, TournamentTeamMember[]> = {};
        teamIds.forEach((id) => (byTeam[id] = []));
        (membersData || []).forEach((m: TournamentTeamMember & { participant?: Participant }) => {
            if (!byTeam[m.team_id]) byTeam[m.team_id] = [];
            byTeam[m.team_id].push(m);
        });
        setMembersByTeam(byTeam);
    }, [tournament.id, supabase]);

    useEffect(() => {
        loadTeams();
    }, [loadTeams]);

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) {
            alert("Enter team name");
            return;
        }
        try {
            const { error } = await supabase.from("tournament_teams").insert({
                tournament_id: tournament.id,
                name: newTeamName.trim(),
                short_name: newTeamShortName.trim() || null,
            });
            if (error) throw error;
            setNewTeamName("");
            setNewTeamShortName("");
            loadTeams();
            onRefresh();
        } catch (e) {
            console.error(e);
            alert("Failed to create team");
        }
    };

    const handleAddMember = async () => {
        if (!addingToTeamId || !selectedParticipantId) return;
        try {
            const { error } = await supabase.from("tournament_team_members").insert({
                team_id: addingToTeamId,
                participant_id: selectedParticipantId,
                position,
            });
            if (error) throw error;
            setAddingToTeamId(null);
            setSelectedParticipantId(null);
            loadTeams();
            onRefresh();
        } catch (e) {
            console.error(e);
            alert("Failed to add member");
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        try {
            const { error } = await supabase.from("tournament_team_members").delete().eq("id", memberId);
            if (error) throw error;
            loadTeams();
            onRefresh();
        } catch (e) {
            console.error(e);
            alert("Failed to remove member");
        }
    };

    const assignedParticipantIds = Object.values(membersByTeam).flat().map((m) => m.participant_id);
    const availableParticipants = participants.filter((p) => !assignedParticipantIds.includes(p.id));

    const handleCreateTeamsFromClubs = async () => {
        const withClub = participants.filter((p) => p.club != null && String(p.club).trim() !== "");
        if (withClub.length === 0) {
            alert("No participants have a club set. Upload CSV with a 'club' column (same number = one doubles team).");
            return;
        }
        const byClub: Record<string, Participant[]> = {};
        withClub.forEach((p) => {
            const key = String(p.club).trim();
            if (!byClub[key]) byClub[key] = [];
            byClub[key].push(p);
        });
        const unassigned = participants.filter((p) => !assignedParticipantIds.includes(p.id));
        const unassignedIds = new Set(unassigned.map((p) => p.id));
        const toCreate: { club: string; participants: Participant[] }[] = [];
        Object.entries(byClub).forEach(([club, list]) => {
            const inList = list.filter((p) => unassignedIds.has(p.id));
            if (inList.length >= 1) toCreate.push({ club, participants: inList });
        });
        if (toCreate.length === 0) {
            alert("All participants with a club are already in a team.");
            return;
        }
        setIsCreatingFromClubs(true);
        try {
            let created = 0;
            for (const { club, participants: list } of toCreate) {
                const cat = list[0]?.category?.trim() || null;
                const name = cat ? `Club ${club} (${cat})` : `Club ${club}`;
                const { data: team, error: teamErr } = await supabase
                    .from("tournament_teams")
                    .insert({ tournament_id: tournament.id, name, short_name: `C${club}`, category: cat })
                    .select("id")
                    .single();
                if (teamErr) {
                    if (teamErr.code === "23505") continue;
                    throw teamErr;
                }
                const pos1 = list[0];
                const pos2 = list[1];
                if (pos1) {
                    await supabase.from("tournament_team_members").insert({ team_id: team.id, participant_id: pos1.id, position: 1 });
                }
                if (pos2) {
                    await supabase.from("tournament_team_members").insert({ team_id: team.id, participant_id: pos2.id, position: 2 });
                }
                created++;
            }
            await loadTeams();
            onRefresh();
            alert(`Created ${created} team(s) from clubs. Each club = one doubles team; category is used for round-robin scheduling.`);
        } catch (e) {
            console.error(e);
            alert("Failed to create teams from clubs.");
        } finally {
            setIsCreatingFromClubs(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-gray-100">Teams</h2>
                {!canEdit && <p className="text-sm text-gray-400">View only</p>}
            </div>
            {canEdit && (
            <>
            <div className="flex flex-wrap items-center gap-2 mb-2">
                <button
                    type="button"
                    onClick={handleCreateTeamsFromClubs}
                    disabled={isCreatingFromClubs || participants.length === 0}
                    className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                >
                    {isCreatingFromClubs ? "Creating…" : "Create teams from clubs (doubles)"}
                </button>
                <span className="text-xs text-gray-400">Same club number in CSV = one team (2 players). Category used for round-robin.</span>
            </div>
            <div className="bg-gray-900 border border-[#1F2937] rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-3 shadow-sm">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Team name</label>
                    <input
                        type="text"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="e.g. Eagles"
                        className="w-40 sm:w-48 px-3 py-2 border border-gray-600 bg-gray-800 text-gray-100 rounded-lg text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Short name</label>
                    <input
                        type="text"
                        value={newTeamShortName}
                        onChange={(e) => setNewTeamShortName(e.target.value)}
                        placeholder="e.g. EGL"
                        className="w-20 sm:w-24 px-3 py-2 border border-gray-600 bg-gray-800 text-gray-100 rounded-lg text-sm"
                    />
                </div>
                <button
                    type="button"
                    onClick={handleCreateTeam}
                    className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
                >
                    Add Team
                </button>
            </div>
            </>
            )}
            <div className="grid gap-4 md:grid-cols-2">
                {teams.map((team) => (
                    <div key={team.id} className="bg-gray-900 border border-[#1F2937] rounded-xl shadow-sm p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-100 text-sm sm:text-base">
                                {team.name}
                                {team.short_name && (
                                    <span className="text-gray-400 font-normal ml-2">({team.short_name})</span>
                                )}
                            </h3>
                        </div>
                        <ul className="space-y-2 mb-3">
                            {(membersByTeam[team.id] || []).map((m) => (
                                <li key={m.id} className="flex items-center justify-between text-sm text-gray-200">
                                    <span className="text-gray-200">
                                        P{m.position}: {(m as TournamentTeamMember & { participant?: Participant }).participant?.player_name ?? "—"}
                                    </span>
                                    {canEdit && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveMember(m.id)}
                                        className="text-red-600 hover:underline text-xs sm:text-sm"
                                    >
                                        Remove
                                    </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                        {canEdit && (addingToTeamId === team.id ? (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1F2937]">
                                <select
                                    value={selectedParticipantId || ""}
                                    onChange={(e) => setSelectedParticipantId(e.target.value || null)}
                                    className="px-2 py-1 border border-gray-600 bg-gray-800 text-gray-100 rounded-lg text-sm"
                                >
                                    <option value="">Select participant</option>
                                    {availableParticipants.map((p) => (
                                        <option key={p.id} value={p.id}>{p.player_name}</option>
                                    ))}
                                </select>
                                <select
                                    value={position}
                                    onChange={(e) => setPosition(parseInt(e.target.value) as 1 | 2)}
                                    className="px-2 py-1 border border-gray-600 bg-gray-800 text-gray-100 rounded-lg text-sm"
                                >
                                    <option value={1}>P1</option>
                                    <option value={2}>P2</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={handleAddMember}
                                    className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm"
                                >
                                    Add
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setAddingToTeamId(null); setSelectedParticipantId(null); }}
                                    className="text-gray-300 text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setAddingToTeamId(team.id)}
                                disabled={availableParticipants.length === 0}
                                className="text-sm text-red-600 hover:underline disabled:opacity-50"
                            >
                                + Add member
                            </button>
                        ))}
                    </div>
                ))}
            </div>
            {teams.length === 0 && (
                <p className="text-gray-400 text-sm">Create teams and assign participants from the list. Participants must be added in the Participants tab first.</p>
            )}
        </div>
    );
}

function useTeamMemberNames(teamIds: string[]) {
    const [memberNamesByTeam, setMemberNamesByTeam] = useState<Record<string, string[]>>({});
    const supabase = createClient();
    useEffect(() => {
        if (teamIds.length === 0) {
            setMemberNamesByTeam({});
            return;
        }
        supabase
            .from("tournament_team_members")
            .select("team_id, position, participant:tournament_participants(player_name)")
            .in("team_id", teamIds)
            .then(({ data }) => {
                const byTeam: Record<string, { position: number; name: string }[]> = {};
                teamIds.forEach((id) => (byTeam[id] = []));
                (data || []).forEach((row: { team_id: string; position: number; participant?: { player_name?: string } | { player_name?: string }[] }) => {
                    const p = Array.isArray(row.participant) ? row.participant[0] : row.participant;
                    const name = p?.player_name ?? "—";
                    if (!byTeam[row.team_id]) byTeam[row.team_id] = [];
                    byTeam[row.team_id].push({ position: row.position, name });
                });
                const result: Record<string, string[]> = {};
                Object.entries(byTeam).forEach(([id, list]) => {
                    list.sort((a, b) => a.position - b.position);
                    result[id] = list.map((x) => x.name);
                });
                setMemberNamesByTeam(result);
            });
    }, [teamIds.join(","), supabase]);
    return memberNamesByTeam;
}

function formatTeamWithPlayers(teamName: string, playerNames: string[]) {
    if (!playerNames.length) return teamName;
    return `${teamName} (${playerNames.join(", ")})`;
}

function TeamScheduleTab({ tournament, onRefresh, canEdit = false }: { tournament: Tournament; onRefresh: () => void; canEdit?: boolean }) {
    const [teams, setTeams] = useState<TournamentTeam[]>([]);
    const [matches, setMatches] = useState<TournamentMatch[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [scheduleBaseDate, setScheduleBaseDate] = useState("");
    const [newMatch, setNewMatch] = useState({ team_a_id: "", team_b_id: "", court_number: "", match_date: "", match_number: "" });
    const supabase = createClient();
    const isRoundRobin = tournament.format === "round_robin" || tournament.format === "round_robin_knockout";
    const teamIds = teams.map((t) => t.id);
    const memberNamesByTeam = useTeamMemberNames(teamIds);

    useEffect(() => {
        supabase.from("tournament_teams").select("*").eq("tournament_id", tournament.id).order("name").then(({ data }) => setTeams(data || []));
    }, [tournament.id, supabase]);
    useEffect(() => {
        supabase
            .from("matches")
            .select("*, team_a:tournament_teams!team_a_id(id,name,short_name), team_b:tournament_teams!team_b_id(id,name,short_name)")
            .eq("tournament_id", tournament.id)
            .order("match_date", { ascending: true })
            .then(({ data }) => setMatches(data || []));
    }, [tournament.id, supabase]);

    const existingPairs = new Set<string>();
    matches.forEach((m) => {
        const a = (m as TournamentMatch).team_a_id;
        const b = (m as TournamentMatch).team_b_id;
        if (a && b) existingPairs.add([a, b].sort().join(","));
    });

    const SCHEDULE_BY_COURT: { court: string; slotIndex: number; cat: string; i: number; j: number; matchLabel: string }[] = [
        { court: "1", slotIndex: 0, cat: "A", i: 1, j: 2, matchLabel: "A-M1" }, { court: "1", slotIndex: 1, cat: "A", i: 3, j: 4, matchLabel: "A-M2" },
        { court: "1", slotIndex: 2, cat: "A", i: 2, j: 3, matchLabel: "A-M3" }, { court: "1", slotIndex: 3, cat: "A", i: 4, j: 1, matchLabel: "A-M4" },
        { court: "1", slotIndex: 4, cat: "A", i: 1, j: 3, matchLabel: "A-M5" }, { court: "1", slotIndex: 5, cat: "D", i: 1, j: 3, matchLabel: "D-M1" },
        { court: "1", slotIndex: 6, cat: "A", i: 2, j: 4, matchLabel: "A-M6" }, { court: "1", slotIndex: 7, cat: "D", i: 1, j: 2, matchLabel: "D-M2" },
        { court: "1", slotIndex: 8, cat: "D", i: 2, j: 3, matchLabel: "D-M3" }, { court: "1", slotIndex: 9, cat: "D", i: 4, j: 1, matchLabel: "D-M4" },
        { court: "2", slotIndex: 0, cat: "B", i: 1, j: 2, matchLabel: "B-M1" }, { court: "2", slotIndex: 1, cat: "B", i: 3, j: 4, matchLabel: "B-M2" },
        { court: "2", slotIndex: 2, cat: "B", i: 2, j: 3, matchLabel: "B-M3" }, { court: "2", slotIndex: 3, cat: "B", i: 4, j: 1, matchLabel: "B-M4" },
        { court: "2", slotIndex: 4, cat: "B", i: 1, j: 3, matchLabel: "B-M5" }, { court: "2", slotIndex: 5, cat: "D", i: 2, j: 4, matchLabel: "D-M5" },
        { court: "2", slotIndex: 6, cat: "B", i: 2, j: 4, matchLabel: "B-M6" }, { court: "2", slotIndex: 7, cat: "E", i: 1, j: 2, matchLabel: "E-M1" },
        { court: "2", slotIndex: 8, cat: "E", i: 1, j: 3, matchLabel: "E-M2" }, { court: "2", slotIndex: 9, cat: "E", i: 2, j: 3, matchLabel: "E-M3" },
        { court: "3", slotIndex: 0, cat: "C", i: 1, j: 2, matchLabel: "C-M1" }, { court: "3", slotIndex: 1, cat: "C", i: 3, j: 4, matchLabel: "C-M2" },
        { court: "3", slotIndex: 2, cat: "C", i: 2, j: 3, matchLabel: "C-M3" }, { court: "3", slotIndex: 3, cat: "C", i: 4, j: 1, matchLabel: "C-M4" },
        { court: "3", slotIndex: 4, cat: "C", i: 1, j: 3, matchLabel: "C-M5" }, { court: "3", slotIndex: 5, cat: "E", i: 3, j: 4, matchLabel: "E-M4" },
        { court: "3", slotIndex: 6, cat: "C", i: 2, j: 4, matchLabel: "C-M6" }, { court: "3", slotIndex: 7, cat: "D", i: 3, j: 4, matchLabel: "D-M6" },
        { court: "3", slotIndex: 8, cat: "E", i: 2, j: 4, matchLabel: "E-M5" }, { court: "3", slotIndex: 9, cat: "E", i: 4, j: 1, matchLabel: "E-M6" },
    ];

    const handleGenerateScheduleByCourtAndTime = async () => {
        const byCategory: Record<string, TournamentTeam[]> = {};
        teams.forEach((t) => {
            const cat = (t.category != null && String(t.category).trim() !== "") ? String(t.category).trim() : "_";
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(t);
        });
        Object.keys(byCategory).forEach((cat) => {
            byCategory[cat].sort((a, b) => (a.short_name || a.name).localeCompare(b.short_name || b.name, undefined, { numeric: true }));
        });
        const baseDate = scheduleBaseDate ? new Date(scheduleBaseDate) : (() => { const d = new Date(); d.setHours(17, 0, 0, 0); return d; })();
        baseDate.setSeconds(0, 0);
        // If time is midnight (00:00), default to 5 PM start
        if (baseDate.getHours() === 0 && baseDate.getMinutes() === 0) {
            baseDate.setHours(17, 0, 0, 0);
        }
        const storedUser = localStorage.getItem("sf:user");
        const created_by = storedUser ? JSON.parse(storedUser).user_id : null;
        const toInsert: { teamAId: string; teamBId: string; matchNumber: string; courtNumber: string; matchDate: Date }[] = [];
        for (const row of SCHEDULE_BY_COURT) {
            const catTeams = byCategory[row.cat];
            if (!catTeams || catTeams.length < Math.max(row.i, row.j)) continue;
            const teamA = catTeams[row.i - 1];
            const teamB = catTeams[row.j - 1];
            if (!teamA || !teamB || teamA.id === teamB.id) continue;
            const key = [teamA.id, teamB.id].sort().join(",");
            if (existingPairs.has(key)) continue;
            const matchDate = new Date(baseDate);
            matchDate.setMinutes(baseDate.getMinutes() + row.slotIndex * 15);
            toInsert.push({
                teamAId: teamA.id,
                teamBId: teamB.id,
                matchNumber: row.matchLabel,
                courtNumber: row.court,
                matchDate,
            });
        }
        if (toInsert.length === 0) {
            alert("No new matches to add (all schedule slots already exist or category/team count doesn’t match).");
            return;
        }
        setIsGenerating(true);
        try {
            for (const { teamAId, teamBId, matchNumber, courtNumber, matchDate } of toInsert) {
                const { error } = await supabase.from("matches").insert({
                    tournament_id: tournament.id,
                    sport: tournament.sport,
                    match_type: "tournament",
                    status: "upcoming",
                    team_a_id: teamAId,
                    team_b_id: teamBId,
                    court_number: courtNumber,
                    match_date: matchDate.toISOString(),
                    match_number: matchNumber,
                    created_by,
                });
                if (error) throw error;
            }
            onRefresh();
            supabase
                .from("matches")
                .select("*, team_a:tournament_teams!team_a_id(id,name,short_name), team_b:tournament_teams!team_b_id(id,name,short_name)")
                .eq("tournament_id", tournament.id)
                .order("match_date", { ascending: true })
                .then(({ data }) => setMatches(data || []));
            alert(`Added ${toInsert.length} match(es) on 3 courts with 15-min slots. Use "Generate quarter-finals" after round-robin for QF/Semi/Final.`);
        } catch (e) {
            console.error(e);
            alert("Failed to generate schedule.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateRoundRobinByCategory = async () => {
        const byCategory: Record<string, TournamentTeam[]> = {};
        teams.forEach((t) => {
            const cat = (t.category != null && String(t.category).trim() !== "") ? String(t.category).trim() : "_";
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(t);
        });
        const storedUser = localStorage.getItem("sf:user");
        const created_by = storedUser ? JSON.parse(storedUser).user_id : null;
        const categoryList = Object.keys(byCategory).sort();
        const toInsert: { teamAId: string; teamBId: string; matchNumber: string; courtNumber: string }[] = [];
        categoryList.forEach((cat, catIndex) => {
            const catTeams = byCategory[cat];
            if (catTeams.length < 2) return;
            const courtNum = String((catIndex % 3) + 1);
            const prefix = cat === "_" ? "M" : `${cat}-M`;
            let n = 0;
            for (let i = 0; i < catTeams.length; i++) {
                for (let j = i + 1; j < catTeams.length; j++) {
                    const key = [catTeams[i].id, catTeams[j].id].sort().join(",");
                    if (!existingPairs.has(key)) {
                        n++;
                        toInsert.push({ teamAId: catTeams[i].id, teamBId: catTeams[j].id, matchNumber: `${prefix}${n}`, courtNumber: courtNum });
                    }
                }
            }
        });
        if (toInsert.length === 0) {
            alert("All category round-robin matches already exist. No new matches to add.");
            return;
        }
        setIsGenerating(true);
        try {
            for (const { teamAId, teamBId, matchNumber, courtNumber } of toInsert) {
                const { error } = await supabase.from("matches").insert({
                    tournament_id: tournament.id,
                    sport: tournament.sport,
                    match_type: "tournament",
                    status: "upcoming",
                    team_a_id: teamAId,
                    team_b_id: teamBId,
                    court_number: courtNumber,
                    match_date: null,
                    match_number: matchNumber,
                    created_by,
                });
                if (error) throw error;
            }
            onRefresh();
            supabase
                .from("matches")
                .select("*, team_a:tournament_teams!team_a_id(id,name,short_name), team_b:tournament_teams!team_b_id(id,name,short_name)")
                .eq("tournament_id", tournament.id)
                .order("match_date", { ascending: true })
                .then(({ data }) => setMatches(data || []));
            alert(`Added ${toInsert.length} match(es) by category on 3 courts (Court 1, 2, 3). Set date/time below if needed.`);
        } catch (e) {
            console.error(e);
            alert("Failed to generate schedule. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateRoundRobin = async () => {
        if (teams.length < 2) {
            alert("Add at least 2 teams to generate a round-robin schedule.");
            return;
        }
        const teamsWithCategory = teams.filter((t) => t.category != null && String(t.category).trim() !== "");
        if (teamsWithCategory.length >= 2) {
            await handleGenerateRoundRobinByCategory();
            return;
        }
        const storedUser = localStorage.getItem("sf:user");
        const created_by = storedUser ? JSON.parse(storedUser).user_id : null;
        const pairs: [string, string][] = [];
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                const key = [teams[i].id, teams[j].id].sort().join(",");
                if (!existingPairs.has(key)) pairs.push([teams[i].id, teams[j].id]);
            }
        }
        if (pairs.length === 0) {
            alert("All round-robin matches already exist. No new matches to add.");
            return;
        }
        setIsGenerating(true);
        try {
            let matchNum = matches.length;
            for (const [teamAId, teamBId] of pairs) {
                matchNum += 1;
                const { error } = await supabase.from("matches").insert({
                    tournament_id: tournament.id,
                    sport: tournament.sport,
                    match_type: "tournament",
                    status: "upcoming",
                    team_a_id: teamAId,
                    team_b_id: teamBId,
                    court_number: null,
                    match_date: null,
                    match_number: `M${matchNum}`,
                    created_by,
                });
                if (error) throw error;
            }
            onRefresh();
            supabase
                .from("matches")
                .select("*, team_a:tournament_teams!team_a_id(id,name,short_name), team_b:tournament_teams!team_b_id(id,name,short_name)")
                .eq("tournament_id", tournament.id)
                .order("match_date", { ascending: true })
                .then(({ data }) => setMatches(data || []));
            alert(`Added ${pairs.length} match(es). You can set court and date for each match below.`);
        } catch (e) {
            console.error(e);
            alert("Failed to generate schedule. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddMatch = async () => {
        if (!newMatch.team_a_id || !newMatch.team_b_id) {
            alert("Select both teams");
            return;
        }
        if (newMatch.team_a_id === newMatch.team_b_id) {
            alert("Select two different teams");
            return;
        }
        try {
            const storedUser = localStorage.getItem("sf:user");
            const created_by = storedUser ? JSON.parse(storedUser).user_id : null;
            const { error } = await supabase.from("matches").insert({
                tournament_id: tournament.id,
                sport: tournament.sport,
                match_type: "tournament",
                status: "upcoming",
                team_a_id: newMatch.team_a_id,
                team_b_id: newMatch.team_b_id,
                court_number: newMatch.court_number || null,
                match_date: newMatch.match_date ? new Date(newMatch.match_date).toISOString() : null,
                match_number: newMatch.match_number || null,
                created_by,
            });
            if (error) throw error;
            setNewMatch({ team_a_id: "", team_b_id: "", court_number: "", match_date: "", match_number: "" });
            setShowAdd(false);
            onRefresh();
            supabase
                .from("matches")
                .select("*, team_a:tournament_teams!team_a_id(id,name,short_name), team_b:tournament_teams!team_b_id(id,name,short_name)")
                .eq("tournament_id", tournament.id)
                .order("match_date", { ascending: true })
                .then(({ data }) => setMatches(data || []));
        } catch (e) {
            console.error(e);
            alert("Failed to create match");
        }
    };

    return (
        <div className="space-y-4 min-w-0 w-full overflow-hidden">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between min-w-0">
                <h2 className="text-xl font-semibold text-gray-100 shrink-0">Schedule</h2>
                {canEdit ? (
                <div className="flex flex-wrap items-center gap-2 min-w-0 w-full sm:w-auto">
                    {isRoundRobin && (
                        <button
                            type="button"
                            onClick={handleGenerateRoundRobin}
                            disabled={isGenerating || teams.length < 2}
                            className="w-full sm:w-auto bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                            {isGenerating ? "Generating…" : "Generate round-robin schedule"}
                        </button>
                    )}
                    {isRoundRobin && teams.some((t) => t.category) && (
                        <>
                            <input
                                type="datetime-local"
                                value={scheduleBaseDate}
                                onChange={(e) => setScheduleBaseDate(e.target.value)}
                                className="w-full sm:min-w-0 px-3 py-2 border border-gray-600 bg-gray-800 text-gray-100 rounded-lg text-sm max-w-full"
                            />
                            <button
                                type="button"
                                onClick={handleGenerateScheduleByCourtAndTime}
                                disabled={isGenerating || teams.length < 2}
                                className="w-full sm:w-auto bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                            >
                                {isGenerating ? "Generating…" : "Generate schedule (courts & times)"}
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowAdd(!showAdd)}
                        className="w-full sm:w-auto bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
                    >
                        {showAdd ? "Cancel" : "Add Match"}
                    </button>
                </div>
                ) : <p className="text-sm text-gray-400">View only</p>}
            </div>
            {isRoundRobin && teams.length >= 2 && (
                <p className="text-sm text-gray-400 break-words">
                    {teams.some((t) => t.category) ? (
                        <>Teams have categories. &quot;Generate round-robin schedule&quot; creates matches <strong>within each category</strong> (Category A vs A, B vs B, C vs C). Match numbers: A-M1, B-M1, etc.</>
                    ) : (
                        <>Format is Round Robin. Use &quot;Generate round-robin schedule&quot; to create all {teams.length * (teams.length - 1) / 2} matches (each team vs every other team once).</>
                    )}
                </p>
            )}
            {canEdit && showAdd && (
                <div className="bg-gray-900 border border-[#1F2937] rounded-xl shadow-sm p-4 space-y-3 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Team A</label>
                            <select
                                value={newMatch.team_a_id}
                                onChange={(e) => setNewMatch((m) => ({ ...m, team_a_id: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-gray-100 rounded-lg text-sm"
                            >
                                <option value="">Select</option>
                                {teams.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Team B</label>
                            <select
                                value={newMatch.team_b_id}
                                onChange={(e) => setNewMatch((m) => ({ ...m, team_b_id: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-gray-100 rounded-md text-sm"
                            >
                                <option value="">Select</option>
                                {teams.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Court</label>
                            <input
                                type="text"
                                value={newMatch.court_number}
                                onChange={(e) => setNewMatch((m) => ({ ...m, court_number: e.target.value }))}
                                placeholder="Court 1"
                                className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-gray-100 rounded-md text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Date & time</label>
                            <input
                                type="datetime-local"
                                value={newMatch.match_date}
                                onChange={(e) => setNewMatch((m) => ({ ...m, match_date: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-gray-100 rounded-md text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Match #</label>
                            <input
                                type="text"
                                value={newMatch.match_number}
                                onChange={(e) => setNewMatch((m) => ({ ...m, match_number: e.target.value }))}
                                placeholder="W01"
                                className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-gray-100 rounded-md text-sm"
                            />
                        </div>
                    </div>
                    <button type="button" onClick={handleAddMatch} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">
                        Save Match
                    </button>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 min-w-0">
                {["1", "2", "3"].map((courtKey) => {
                    const courtMatches = matches.filter((m) => {
                        const c = (m as TournamentMatch).court_number;
                        if (!c) return courtKey === "1";
                        const num = c.replace(/\D/g, "") || c;
                        return num === courtKey || c === `Court ${courtKey}`;
                    }).sort((a, b) => {
                        const da = a.match_date ? new Date(a.match_date).getTime() : 0;
                        const db = b.match_date ? new Date(b.match_date).getTime() : 0;
                        return da - db;
                    });
                    return (
                        <div key={courtKey} className="border border-[#1F2937] rounded-xl overflow-hidden bg-gray-900 shadow-sm min-w-0">
                            <div className="bg-gray-800 px-3 py-2 font-medium text-gray-100 text-sm">Court {courtKey}</div>
                            <div className="divide-y divide-[#1F2937]">
                                {courtMatches.map((match) => {
                                    const m = match as TournamentMatch;
                                    const nameA = m.team_a?.name ?? "TBD";
                                    const nameB = m.team_b?.name ?? "TBD";
                                    const playersA = (m.team_a_id && memberNamesByTeam[m.team_a_id]) || [];
                                    const playersB = (m.team_b_id && memberNamesByTeam[m.team_b_id]) || [];
                                    return (
                                        <div key={match.id} className="p-3 flex flex-wrap items-center justify-between gap-2 bg-gray-900 min-w-0">
                                            <div className="min-w-0 flex-1 overflow-hidden">
                                                <span className="font-medium text-gray-100 text-sm block break-words">
                                                    {formatTeamWithPlayers(nameA, playersA)} vs {formatTeamWithPlayers(nameB, playersB)}
                                                </span>
                                                <div className="text-xs text-gray-400 mt-0.5">
                                                    {match.match_date ? new Date(match.match_date).toLocaleString() : "—"} · {match.match_number || "—"}
                                                </div>
                                            </div>
                                            <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                                                match.status === "completed" ? "bg-gray-800 text-gray-200" : match.status === "live" ? "bg-green-900/50 text-green-300" : "bg-blue-900/50 text-blue-300"
                                            }`}>
                                                {match.status}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                            {courtMatches.length === 0 && <p className="p-3 text-sm text-gray-400">No matches</p>}
                        </div>
                    );
                })}
            </div>
            {matches.length === 0 && !showAdd && <p className="text-gray-400 text-sm">No matches yet. Add a match to build the schedule.</p>}
        </div>
    );
}

function parseFinalScoreToSets(score: string | null | undefined, numSets: number): string[] {
    const arr = Array(numSets).fill("");
    if (!score || typeof score !== "string") return arr;
    const parts = score.split(",").map((s) => s.trim()).filter(Boolean);
    parts.forEach((p, i) => { if (i < numSets) arr[i] = p; });
    return arr;
}

function formatSetsForDisplay(score: string | null | undefined): string {
    if (!score || typeof score !== "string") return "";
    const parts = score.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0];
    return parts.map((p, i) => `Set ${i + 1}: ${p}`).join(", ");
}

function TeamResultsTab({ tournament, onRefresh, canEdit = false }: { tournament: Tournament; onRefresh: () => void; canEdit?: boolean }) {
    const numSets = Math.min(5, Math.max(1, Number(tournament.sets_per_match) || 3));
    const [matches, setMatches] = useState<TournamentMatch[]>([]);
    const [teams, setTeams] = useState<TournamentTeam[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [winnerId, setWinnerId] = useState("");
    const [setScores, setSetScores] = useState<string[]>(() => Array(numSets).fill(""));
    const supabase = createClient();
    const teamIds = teams.map((t) => t.id);
    const memberNamesByTeam = useTeamMemberNames(teamIds);

    useEffect(() => {
        supabase.from("tournament_teams").select("*").eq("tournament_id", tournament.id).then(({ data }) => setTeams(data || []));
        supabase
            .from("matches")
            .select("*, team_a:tournament_teams!team_a_id(id,name,short_name), team_b:tournament_teams!team_b_id(id,name,short_name), winner_team:tournament_teams!winner_team_id(id,name)")
            .eq("tournament_id", tournament.id)
            .order("match_date", { ascending: true })
            .then(({ data }) => setMatches(data || []));
    }, [tournament.id, supabase]);

    const handleSaveResult = async (matchId: string) => {
        const finalScoreStr = setScores.filter(Boolean).join(", ");
        try {
            const { error } = await supabase
                .from("matches")
                .update({
                    status: "completed",
                    winner_team_id: winnerId || null,
                    final_score: finalScoreStr || null,
                    completed_at: new Date().toISOString(),
                })
                .eq("id", matchId);
            if (error) throw error;
            setEditingId(null);
            setWinnerId("");
            setSetScores(Array(numSets).fill(""));
            onRefresh();
            supabase
                .from("matches")
                .select("*, team_a:tournament_teams!team_a_id(id,name,short_name), team_b:tournament_teams!team_b_id(id,name,short_name), winner_team:tournament_teams!winner_team_id(id,name)")
                .eq("tournament_id", tournament.id)
                .order("match_date", { ascending: true })
                .then(({ data }) => setMatches(data || []));
        } catch (e) {
            console.error(e);
            alert("Failed to save result");
        }
    };

    const startEdit = (m: TournamentMatch) => {
        setEditingId(m.id);
        setWinnerId(m.winner_team_id || "");
        setSetScores(parseFinalScoreToSets(m.final_score, numSets));
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-gray-100">Results</h2>
                {!canEdit && <p className="text-sm text-gray-400">View only</p>}
            </div>
            {canEdit && <p className="text-sm text-gray-400">Record winner and set scores. Best of {numSets} sets — enter each set score (e.g. 21-10). Leave a set blank if the match ended early (e.g. 2-0).</p>}
            <div className="space-y-2">
                {matches.map((match) => {
                    const m = match as TournamentMatch;
                    const isEditing = editingId === match.id;
                    const matchTeams = [m.team_a, m.team_b].filter(Boolean);
                    const winnerOptions = matchTeams.length >= 2 ? matchTeams : teams.filter((t) => t.id === m.team_a_id || t.id === m.team_b_id);
                    return (
                        <div key={match.id} className="bg-gray-900 border border-[#1F2937] rounded-xl shadow-sm p-4 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <span className="font-medium text-gray-100 text-sm sm:text-base">
                                        {formatTeamWithPlayers(m.team_a?.name ?? teams.find((t) => t.id === m.team_a_id)?.name ?? "TBD", (m.team_a_id && memberNamesByTeam[m.team_a_id]) || [])}
                                        {" vs "}
                                        {formatTeamWithPlayers(m.team_b?.name ?? teams.find((t) => t.id === m.team_b_id)?.name ?? "TBD", (m.team_b_id && memberNamesByTeam[m.team_b_id]) || [])}
                                    </span>
                                    {match.status === "completed" && (
                                        <span className="ml-2 text-gray-300 text-sm block sm:inline">
                                            Won by {(m.winner_team as { name?: string })?.name ?? teams.find((t) => t.id === m.winner_team_id)?.name ?? "—"}
                                            {m.final_score ? ` · ${formatSetsForDisplay(m.final_score)}` : ""}
                                        </span>
                                    )}
                                </div>
                                {match.status !== "completed" ? (
                                    canEdit && isEditing ? (
                                        <div className="flex flex-col gap-3 w-full mt-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <select
                                                    value={winnerId}
                                                    onChange={(e) => setWinnerId(e.target.value)}
                                                    className="px-2 py-1 border border-gray-600 bg-gray-800 text-gray-100 rounded-lg text-sm"
                                                >
                                                    <option value="">Select winner</option>
                                                    {winnerOptions.filter((t): t is NonNullable<typeof t> => t != null).map((t) => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                                <button type="button" onClick={() => handleSaveResult(match.id)} className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium">Save</button>
                                                <button type="button" onClick={() => { setEditingId(null); setWinnerId(""); setSetScores(Array(numSets).fill("")); }} className="text-gray-300 text-sm">Cancel</button>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                {Array.from({ length: numSets }, (_, i) => (
                                                    <div key={i} className="flex items-center gap-1">
                                                        <label className="text-xs text-gray-300 whitespace-nowrap">Set {i + 1}</label>
                                                        <input
                                                            type="text"
                                                            value={setScores[i] ?? ""}
                                                            onChange={(e) => {
                                                                const next = [...setScores];
                                                                next[i] = e.target.value;
                                                                setSetScores(next);
                                                            }}
                                                            placeholder="21-10"
                                                            className="w-16 px-2 py-1 border border-gray-600 bg-gray-800 text-gray-100 rounded-lg text-sm"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : canEdit ? (
                                        <button type="button" onClick={() => startEdit(m)} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium shrink-0">Enter result</button>
                                    ) : (
                                        <span className="text-gray-400 text-sm">Upcoming</span>
                                    )
                                ) : (
                                    <span className="text-green-600 text-sm font-medium shrink-0">Completed</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {matches.length === 0 && <p className="text-gray-400 text-sm">No matches. Add matches in the Schedule tab first.</p>}
        </div>
    );
}

function GeneratePlayoffsBlock({
    tournament,
    qualifiedTeams,
    onRefresh,
}: {
    tournament: Tournament;
    qualifiedTeams: TournamentTeam[];
    onRefresh: () => void;
}) {
    const [existingQF, setExistingQF] = useState<TournamentMatch[]>([]);
    const [generating, setGenerating] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        supabase
            .from("matches")
            .select("*, team_a:tournament_teams!team_a_id(id,name), team_b:tournament_teams!team_b_id(id,name)")
            .eq("tournament_id", tournament.id)
            .in("match_number", ["QF1", "QF2", "QF3", "QF4"])
            .then(({ data }) => setExistingQF((data || []) as TournamentMatch[]));
    }, [tournament.id, supabase]);

    const handleGenerate = async () => {
        if (qualifiedTeams.length < 8) return;
        setGenerating(true);
        try {
            const storedUser = localStorage.getItem("sf:user");
            const created_by = storedUser ? JSON.parse(storedUser).user_id : null;
            const t = qualifiedTeams;
            await supabase.from("matches").insert([
                { tournament_id: tournament.id, sport: tournament.sport, match_type: "tournament", status: "upcoming", team_a_id: t[0].id, team_b_id: t[7].id, match_number: "QF1", court_number: "1", created_by },
                { tournament_id: tournament.id, sport: tournament.sport, match_type: "tournament", status: "upcoming", team_a_id: t[3].id, team_b_id: t[4].id, match_number: "QF2", court_number: "2", created_by },
                { tournament_id: tournament.id, sport: tournament.sport, match_type: "tournament", status: "upcoming", team_a_id: t[1].id, team_b_id: t[6].id, match_number: "QF3", court_number: "3", created_by },
                { tournament_id: tournament.id, sport: tournament.sport, match_type: "tournament", status: "upcoming", team_a_id: t[2].id, team_b_id: t[5].id, match_number: "QF4", court_number: "1", created_by },
            ]);
            onRefresh();
            supabase
                .from("matches")
                .select("*, team_a:tournament_teams!team_a_id(id,name), team_b:tournament_teams!team_b_id(id,name)")
                .eq("tournament_id", tournament.id)
                .in("match_number", ["QF1", "QF2", "QF3", "QF4"])
                .then(({ data }) => setExistingQF((data || []) as TournamentMatch[]));
        } catch (e) {
            console.error(e);
            alert("Failed to create quarter-final matches.");
        } finally {
            setGenerating(false);
        }
    };

    if (qualifiedTeams.length < 8) return null;
    return (
        <div className="rounded-lg border border-[#1F2937] bg-gray-900 p-4">
            <h3 className="font-medium text-gray-100 mb-2">Playoffs: Quarter-finals → Semis → Finals</h3>
            {existingQF.length >= 4 ? (
                <p className="text-sm text-gray-300">QF1–QF4 already created (3 courts). Enter results in Results tab; then add Semi 1, Semi 2, and Final matches in Schedule when ready.</p>
            ) : (
                <>
                    <p className="text-sm text-gray-300 mb-2">8 qualified: {qualifiedTeams.map((t) => t.name).join(", ")}</p>
                    <p className="text-xs text-gray-400 mb-2">QF1 (Court 1): 1st vs 8th · QF2 (Court 2): 4th vs 5th · QF3 (Court 3): 2nd vs 7th · QF4 (Court 1): 3rd vs 6th. Winners go to semis, then final.</p>
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={generating}
                        className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm disabled:opacity-50"
                    >
                        {generating ? "Creating…" : "Generate quarter-finals (QF1–QF4) on 3 courts"}
                    </button>
                </>
            )}
        </div>
    );
}

function TeamStatsTab({ tournament, canEdit = false }: { tournament: Tournament; canEdit?: boolean }) {
    const [matches, setMatches] = useState<TournamentMatch[]>([]);
    const [teams, setTeams] = useState<TournamentTeam[]>([]);
    const supabase = createClient();
    const teamIds = teams.map((t) => t.id);
    const memberNamesByTeam = useTeamMemberNames(teamIds);

    useEffect(() => {
        supabase.from("tournament_teams").select("*").eq("tournament_id", tournament.id).order("name").then(({ data }) => setTeams(data || []));
        supabase
            .from("matches")
            .select("*, team_a:tournament_teams!team_a_id(id,name), team_b:tournament_teams!team_b_id(id,name), winner_team:tournament_teams!winner_team_id(id,name)")
            .eq("tournament_id", tournament.id)
            .eq("status", "completed")
            .then(({ data }) => setMatches(data || []));
    }, [tournament.id, supabase]);

    const stats: Record<string, { played: number; won: number; lost: number; pointsFor: number; pointsAgainst: number }> = {};
    teams.forEach((t) => { stats[t.id] = { played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 }; });
    matches.forEach((m) => {
        const ma = (m as TournamentMatch).team_a_id;
        const mb = (m as TournamentMatch).team_b_id;
        const winner = (m as TournamentMatch).winner_team_id;
        if (ma && stats[ma]) {
            stats[ma].played += 1;
            if (winner === ma) stats[ma].won += 1; else stats[ma].lost += 1;
        }
        if (mb && stats[mb]) {
            stats[mb].played += 1;
            if (winner === mb) stats[mb].won += 1; else stats[mb].lost += 1;
        }
        const score = (m as TournamentMatch).final_score;
        if (score && typeof score === "string") {
            const sets = score.split(",").map((s) => s.trim()).filter(Boolean);
            let pfA = 0, pfB = 0;
            sets.forEach((setStr) => {
                const parts = setStr.split("-").map((n) => parseInt(n.trim(), 10));
                if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    pfA += parts[0];
                    pfB += parts[1];
                }
            });
            if (ma && stats[ma]) { stats[ma].pointsFor += pfA; stats[ma].pointsAgainst += pfB; }
            if (mb && stats[mb]) { stats[mb].pointsFor += pfB; stats[mb].pointsAgainst += pfA; }
        }
    });
    const withPts = teams.map((t) => ({
        team: t,
        ...stats[t.id],
        pts: stats[t.id].won * 1,
        pointsDifference: stats[t.id].pointsFor - stats[t.id].pointsAgainst,
    }));
    const sorted = withPts.sort((a, b) => {
        if (a.pts !== b.pts) return b.pts - a.pts;
        return (b.pointsDifference ?? 0) - (a.pointsDifference ?? 0);
    });

    const byCategory: Record<string, typeof sorted> = {};
    sorted.forEach((row) => {
        const cat = (row.team.category != null && String(row.team.category).trim() !== "") ? String(row.team.category).trim() : "—";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(row);
    });
    const categoriesOrdered = Object.keys(byCategory).sort();
    categoriesOrdered.forEach((cat) => {
        byCategory[cat].sort((a, b) => {
            if (a.pts !== b.pts) return b.pts - a.pts;
            return (b.pointsDifference ?? 0) - (a.pointsDifference ?? 0);
        });
    });
    const eligible = sorted.filter((r) => r.played >= 1 && r.pts >= 1);
    const topPerCategory = categoriesOrdered
        .map((cat) => byCategory[cat].find((r) => r.played >= 1 && r.pts >= 1))
        .filter((r): r is NonNullable<typeof r> => Boolean(r));
    const needEightQF = 8;
    const qualifiedForQF = [...topPerCategory];
    if (qualifiedForQF.length < needEightQF && eligible.length > topPerCategory.length) {
        const alreadyIn = new Set(qualifiedForQF.map((r) => r.team.id));
        const rest = eligible.filter((r) => !alreadyIn.has(r.team.id));
        for (let i = 0; i < rest.length && qualifiedForQF.length < needEightQF; i++) {
            qualifiedForQF.push(rest[i]);
        }
    }

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-100">Team standings</h2>
            <p className="text-sm text-gray-300">Ranked by PTS, then point difference (PD). Only teams with at least one win (PTS ≥ 1) can qualify. Top 1 per category (by PTS, PD) → QF; next best fill to 8. Then QF → Semis → Finals.</p>
            <div className="overflow-x-auto">
                <table className="min-w-full border border-[#1F2937] rounded-lg overflow-hidden">
                    <thead className="bg-gray-800">
                        <tr>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-100">#</th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-100">Cat</th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-100">Team</th>
                            <th className="text-center py-2 px-3 text-sm font-medium text-gray-100">TM</th>
                            <th className="text-center py-2 px-3 text-sm font-medium text-gray-100">PL</th>
                            <th className="text-center py-2 px-3 text-sm font-medium text-gray-100">W</th>
                            <th className="text-center py-2 px-3 text-sm font-medium text-gray-100">L</th>
                            <th className="text-center py-2 px-3 text-sm font-medium text-gray-100">PTS</th>
                            <th className="text-center py-2 px-3 text-sm font-medium text-gray-100">PD</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((row, idx) => {
                            const isQualified = qualifiedForQF.some((q) => q && q.team && q.team.id === row.team.id);
                            const rank = idx + 1;
                            const rankDisplay = rank === 1 ? <span className="text-xl" title="1st" aria-label="1st">🥇</span>
                                : rank === 2 ? <span className="text-xl" title="2nd" aria-label="2nd">🥈</span>
                                : rank === 3 ? <span className="text-xl" title="3rd" aria-label="3rd">🥉</span>
                                : <span className="text-gray-300">{rank}</span>;
                            return (
                            <tr key={row.team.id} className={`border-t border-[#1F2937] ${isQualified ? "bg-emerald-900/30" : ""}`}>
                                <td className="py-2 px-3 text-sm">{rankDisplay}</td>
                                <td className="py-2 px-3 text-sm text-gray-300">{row.team.category || "—"}</td>
                                <td className="py-2 px-3 text-sm font-medium text-gray-300">
                                    {formatTeamWithPlayers(row.team.name, memberNamesByTeam[row.team.id] || [])}
                                    {isQualified && <span className="ml-2 text-emerald-600 text-xs font-medium">→ QF</span>}
                                </td>
                                <td className="py-2 px-3 text-sm text-center text-gray-300">{row.team.short_name || "—"}</td>
                                <td className="py-2 px-3 text-sm text-center text-gray-300">{row.played}</td>
                                <td className="py-2 px-3 text-sm text-center text-gray-300">{row.won}</td>
                                <td className="py-2 px-3 text-sm text-center text-gray-300">{row.lost}</td>
                                <td className="py-2 px-3 text-sm text-center text-gray-300">{row.pts}</td>
                                <td className="py-2 px-3 text-sm text-center text-gray-300">{row.pointsDifference != null ? (row.pointsDifference >= 0 ? `+${row.pointsDifference}` : String(row.pointsDifference)) : "—"}</td>
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-gray-400">Cat = Category. TM = short name, PL = Played, W = Won, L = Lost, PTS = Points (1 per win), PD = Point difference (for–against). Tiebreaker: PTS then PD.</p>

            {canEdit && qualifiedForQF.length >= 4 && (
                <GeneratePlayoffsBlock
                    tournament={tournament}
                    qualifiedTeams={qualifiedForQF.map((r) => r.team)}
                    onRefresh={() => window.location.reload()}
                />
            )}
        </div>
    );
}

function PlayerStatsTab({ tournament }: { tournament: Tournament }) {
    const [members, setMembers] = useState<(TournamentTeamMember & { participant?: Participant; team?: TournamentTeam })[]>([]);
    const [matches, setMatches] = useState<TournamentMatch[]>([]);
    const supabase = createClient();

    useEffect(() => {
        supabase
            .from("tournament_team_members")
            .select("*, participant:tournament_participants(*), team:tournament_teams(*)")
            .then(({ data }) => {
                const byTournament = (data || []).filter(
                    (m: TournamentTeamMember & { team?: TournamentTeam }) => m.team?.tournament_id === tournament.id
                );
                setMembers(byTournament);
            });
        supabase
            .from("matches")
            .select("*, winner_team:tournament_teams!winner_team_id(id)")
            .eq("tournament_id", tournament.id)
            .eq("status", "completed")
            .then(({ data }) => setMatches(data || []));
    }, [tournament.id, supabase]);

    const participantStats: Record<string, { played: number; won: number; lost: number }> = {};
    members.forEach((m) => {
        const pid = (m as TournamentTeamMember & { participant?: Participant }).participant_id;
        if (pid) participantStats[pid] = { played: 0, won: 0, lost: 0 };
    });
    matches.forEach((match) => {
        const winnerId = (match as TournamentMatch).winner_team_id;
        const teamA = (match as TournamentMatch).team_a_id;
        const teamB = (match as TournamentMatch).team_b_id;
        members.forEach((mem) => {
            const tid = (mem as TournamentTeamMember & { team?: TournamentTeam }).team_id;
            const pid = (mem as TournamentTeamMember & { participant?: Participant }).participant_id;
            if (!pid || !participantStats[pid]) return;
            if (tid === teamA || tid === teamB) {
                participantStats[pid].played += 1;
                if (tid === winnerId) participantStats[pid].won += 1; else participantStats[pid].lost += 1;
            }
        });
    });
    const sorted = members
        .map((m) => {
            const mem = m as TournamentTeamMember & { participant?: Participant; team?: TournamentTeam };
            const pid = mem.participant_id;
            const s = participantStats[pid] || { played: 0, won: 0, lost: 0 };
            return { member: mem, ...s, pts: s.won * 1 };
        })
        .filter((r) => r.member.participant)
        .sort((a, b) => b.pts - a.pts);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-gray-100">Player stats</h2>
                <div className="text-xs text-gray-400">Sorted by PTS (wins)</div>
            </div>

            <div className="rounded-xl border border-[#1F2937] overflow-hidden" style={{ backgroundColor: '#111827' }}>
                {sorted.length === 0 ? (
                    <div className="p-4 text-sm text-gray-400">No completed matches yet.</div>
                ) : (
                    <div className="divide-y divide-[#1F2937]">
                        {sorted.map((row, idx) => {
                            const rank = idx + 1;
                            const paddedRank = String(rank).padStart(3, "0");
                            const participantName =
                                (row.member as TournamentTeamMember & { participant?: Participant }).participant?.player_name ?? "—";
                            const teamName =
                                (row.member as TournamentTeamMember & { team?: TournamentTeam }).team?.name ?? "—";

                            const medal =
                                rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

                            const initials = participantName
                                .split(" ")
                                .filter(Boolean)
                                .slice(0, 2)
                                .map((p) => p[0]?.toUpperCase())
                                .join("") || "P";

                            return (
                                <div
                                    key={row.member.id}
                                    className="flex items-center justify-between gap-4 px-4 py-3"
                                    style={{ backgroundColor: idx % 2 === 0 ? "#0F172A" : "#111827" }}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="relative flex-shrink-0">
                                            <div className="h-11 w-11 rounded-full flex items-center justify-center border border-[#1F2937] bg-gray-800 text-gray-100 font-semibold">
                                                {initials}
                                            </div>
                                            {medal && (
                                                <span className="absolute -bottom-2 -left-2 text-lg" aria-label={`Rank ${rank}`}>
                                                    {medal}
                                                </span>
                                            )}
                                        </div>

                                        <div className="min-w-0">
                                            <div className="text-sm sm:text-base font-semibold text-gray-100 truncate">
                                                {participantName}
                                            </div>
                                            <div className="text-xs sm:text-sm text-gray-400 truncate">
                                                {teamName} • PL: {row.played} • W: {row.won} • L: {row.lost} • PTS: {row.pts}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-shrink-0 text-2xl sm:text-3xl font-semibold tracking-wide text-gray-200">
                                        {paddedRank}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// Settings Tab Component
function SettingsTab({ tournament, onTournamentUpdate, canEdit = false }: { tournament: Tournament; onTournamentUpdate: () => void; canEdit?: boolean }) {
    const [settings, setSettings] = useState({
        tournament_mode: (tournament.tournament_mode || 'individual') as 'individual' | 'team',
        format: tournament.format || 'single_elimination',
        sets_per_match: tournament.sets_per_match || 3,
        points_per_set: tournament.points_per_set || 21,
        win_by_two: tournament.win_by_two !== false,
        max_points: tournament.max_points || 30,
        seeding_method: tournament.seeding_method || 'random',
    });
    const [isSaving, setIsSaving] = useState(false);
    const supabase = createClient();

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('tournaments')
                .update(settings)
                .eq('id', tournament.id);

            if (error) throw error;
            alert('Settings saved successfully!');
            onTournamentUpdate();
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-gray-100">Tournament Settings</h2>
                {!canEdit && <p className="text-sm text-gray-400">View only</p>}
            </div>
            <div className="bg-gray-900 border border-[#1F2937] rounded-xl shadow-sm p-4 sm:p-6 space-y-4 shadow-sm">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Tournament Mode
                    </label>
                    <select
                        value={settings.tournament_mode}
                        onChange={(e) => canEdit && setSettings({ ...settings, tournament_mode: e.target.value as 'individual' | 'team' })}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-900 disabled:cursor-not-allowed"
                    >
                        <option value="individual">Individual (player vs player)</option>
                        <option value="team">Team (team vs team — shows Teams, Schedule, Results, Stats)</option>
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Team mode shows Teams, Schedule, Results, Team Stats and Player Stats tabs.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Tournament Format
                    </label>
                    <select
                        value={settings.format}
                        onChange={(e) => canEdit && setSettings({ ...settings, format: e.target.value })}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-900 disabled:cursor-not-allowed"
                    >
                        <option value="single_elimination">Single Elimination</option>
                        <option value="double_elimination">Double Elimination</option>
                        <option value="round_robin">Round Robin</option>
                        <option value="round_robin_knockout">Round Robin + Knockout</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Sets per Match
                        </label>
                        <select
                            value={settings.sets_per_match}
                            onChange={(e) => canEdit && setSettings({ ...settings, sets_per_match: parseInt(e.target.value) })}
                            disabled={!canEdit}
                            className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-900 disabled:cursor-not-allowed"
                        >
                            <option value={1}>1 game only</option>
                            <option value={3}>Best of 3</option>
                            <option value={5}>Best of 5</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Points per Set
                        </label>
                        <select
                            value={settings.points_per_set}
                            onChange={(e) => canEdit && setSettings({ ...settings, points_per_set: parseInt(e.target.value) })}
                            disabled={!canEdit}
                            className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-900 disabled:cursor-not-allowed"
                        >
                            <option value={15}>15 points</option>
                            <option value={21}>21 points</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={settings.win_by_two}
                            onChange={(e) => canEdit && setSettings({ ...settings, win_by_two: e.target.checked })}
                            disabled={!canEdit}
                            className="rounded border-gray-300 disabled:opacity-60"
                        />
                        <span className="text-sm text-gray-300">Win by 2 points</span>
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Maximum Points (cap)
                    </label>
                    <input
                        type="number"
                        value={settings.max_points}
                        onChange={(e) => canEdit && setSettings({ ...settings, max_points: parseInt(e.target.value) })}
                        disabled={!canEdit}
                        min="21"
                        max="30"
                        className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-900 disabled:cursor-not-allowed"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Seeding Method
                    </label>
                    <select
                        value={settings.seeding_method}
                        onChange={(e) => canEdit && setSettings({ ...settings, seeding_method: e.target.value })}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-900 disabled:cursor-not-allowed"
                    >
                        <option value="random">Random</option>
                        <option value="manual">Manual</option>
                        <option value="ranking">By Ranking</option>
                        <option value="registration_order">Registration Order</option>
                    </select>
                </div>

                {canEdit && (
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-red-600 text-white py-2.5 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
                )}
            </div>
        </div>
    );
}

