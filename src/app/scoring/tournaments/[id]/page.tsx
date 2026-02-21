"use client";

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
    created_at: string;
}

interface TournamentTeamMember {
    id: string;
    team_id: string;
    participant_id: string;
    position: number;
    participant?: Participant;
}

export default function TournamentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const tournamentId = params.id as string;
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    type TabType = 'overview' | 'participants' | 'groups' | 'brackets' | 'matches' | 'settings' | 'teams' | 'schedule' | 'results' | 'team_stats' | 'player_stats';
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const isTeamTournament = (tournament?.tournament_mode ?? 'individual') === 'team';
    const [showAddParticipant, setShowAddParticipant] = useState(false);
    const supabase = createClient();

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

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-gray-500">Loading tournament...</div>
            </div>
        );
    }

    if (!tournament) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 mb-4">Tournament not found</div>
                    <button
                        onClick={() => router.push('/scoring/tournaments')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
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
            case 'completed': return 'text-gray-600 bg-gray-100';
            case 'cancelled': return 'text-red-600 bg-red-100';
            case 'upcoming': return 'text-blue-600 bg-blue-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <button
                        onClick={() => router.push('/scoring/tournaments')}
                        className="flex items-center gap-2 text-gray-600 mb-4 text-sm md:text-base"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Tournaments
                    </button>

                    <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-3xl md:text-4xl flex-shrink-0">{sportIcons[tournament.sport]}</span>
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-xl md:text-2xl font-semibold text-gray-900 truncate">{tournament.name}</h1>
                                    <p className="text-gray-600 text-xs md:text-sm mt-1 line-clamp-2">{tournament.description || 'No description'}</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-3 text-xs md:text-sm text-gray-600">
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
                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                            <div className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium ${getStatusColor(tournament.status)}`}>
                                {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                            </div>
                            {tournament.status === 'upcoming' && (
                                <button
                                    onClick={handleStartTournament}
                                    className="bg-green-600 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-md hover:bg-green-700 text-xs md:text-sm whitespace-nowrap"
                                >
                                    Start Tournament
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 bg-white sticky top-0 md:top-[140px] z-10">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex gap-3 md:gap-6 overflow-x-auto scrollbar-hide -mb-px">
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
                                        ? 'border-red-600 text-red-600'
                                        : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-4 md:py-6">
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
                    <TeamsTab tournament={tournament} participants={participants} onRefresh={fetchTournamentData} />
                )}
                {activeTab === 'schedule' && isTeamTournament && (
                    <TeamScheduleTab tournament={tournament} onRefresh={fetchTournamentData} />
                )}
                {activeTab === 'results' && isTeamTournament && (
                    <TeamResultsTab tournament={tournament} onRefresh={fetchTournamentData} />
                )}
                {activeTab === 'team_stats' && isTeamTournament && (
                    <TeamStatsTab tournament={tournament} />
                )}
                {activeTab === 'player_stats' && isTeamTournament && (
                    <PlayerStatsTab tournament={tournament} />
                )}

                {activeTab === 'settings' && (
                    <SettingsTab tournament={tournament} onTournamentUpdate={fetchTournamentData} />
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
                <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                    <div className="text-xs md:text-sm text-gray-600 mb-1">Total Participants</div>
                    <div className="text-xl md:text-2xl font-semibold text-gray-900">{participants.length}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                    <div className="text-xs md:text-sm text-gray-600 mb-1">Confirmed</div>
                    <div className="text-xl md:text-2xl font-semibold text-green-600">{confirmedParticipants.length}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                    <div className="text-xs md:text-sm text-gray-600 mb-1">Eliminated</div>
                    <div className="text-xl md:text-2xl font-semibold text-red-600">{eliminatedParticipants.length}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3 md:p-4">
                    <div className="text-xs md:text-sm text-gray-600 mb-1">Entry Fee</div>
                    <div className="text-xl md:text-2xl font-semibold text-gray-900">₹{tournament.entry_fee}</div>
                </div>
            </div>

            {/* Tournament Info */}
            <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
                <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Tournament Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                    <div>
                        <div className="text-gray-600 mb-1">Format</div>
                        <div className="font-medium text-gray-900">
                            {tournament.format?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Single Elimination'}
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-600 mb-1">Match Format</div>
                        <div className="font-medium text-gray-900">
                            Best of {tournament.sets_per_match || 3} sets, {tournament.points_per_set || 21} points
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-600 mb-1">Prize Pool</div>
                        <div className="font-medium text-gray-900">₹{tournament.prize_pool}</div>
                    </div>
                    <div>
                        <div className="text-gray-600 mb-1">Start Date</div>
                        <div className="font-medium text-gray-900">
                            {new Date(tournament.start_date).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {winner && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
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
}: {
    tournament: Tournament;
    participants: Participant[];
    onParticipantsChange: () => void;
    showAddParticipant: boolean;
    setShowAddParticipant: (show: boolean) => void;
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
                    phone: newParticipantPhone ? `+91-${newParticipantPhone.replace(/\D/g, '')}` : null,
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
                        phone: p.phone ? `+91-${p.phone.replace(/\D/g, '')}` : null,
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
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Participants</h2>
                {!showAddParticipant && (
                    <div className="flex items-center gap-2">
                        <label className="cursor-pointer bg-gray-100 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200 text-sm font-medium border border-gray-300">
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
                            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Add Participant
                        </button>
                    </div>
                )}
            </div>
            {csvUploadError && <p className="text-sm text-amber-700 mt-2">{csvUploadError}</p>}

            {showAddParticipant && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-4">Add New Participant</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Name *
                            </label>
                            <input
                                type="text"
                                value={newParticipantName}
                                onChange={(e) => setNewParticipantName(e.target.value)}
                                placeholder="Enter participant name"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {participants.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <div className="text-gray-500 mb-4">No participants yet</div>
                    <button
                        onClick={() => setShowAddParticipant(true)}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                    >
                        Add First Participant
                    </button>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Phone</th>
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Category</th>
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {participants.map((participant, index) => (
                                    <tr key={participant.id} className="hover:bg-gray-50">
                                        <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-gray-900">{index + 1}</td>
                                        <td className="px-2 md:px-4 py-3 text-xs md:text-sm">
                                            {editingId === participant.id ? (
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs md:text-sm"
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
                                            ) : (
                                                <span
                                                    className="cursor-pointer hover:text-red-600"
                                                    onClick={() => {
                                                        setEditingId(participant.id);
                                                        setEditName(participant.player_name);
                                                    }}
                                                >
                                                    {participant.player_name}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-gray-600 hidden sm:table-cell">{participant.phone || '-'}</td>
                                        <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-gray-600 hidden md:table-cell">{participant.category || '-'}</td>
                                        <td className="px-2 md:px-4 py-3 text-xs md:text-sm">
                                            <select
                                                value={participant.status}
                                                onChange={(e) => handleUpdateStatus(participant.id, e.target.value)}
                                                className="text-xs md:text-sm border border-gray-300 rounded px-1 md:px-2 py-1 w-full"
                                            >
                                                <option value="registered">Registered</option>
                                                <option value="confirmed">Confirmed</option>
                                                <option value="eliminated">Eliminated</option>
                                                <option value="winner">Winner</option>
                                            </select>
                                        </td>
                                        <td className="px-2 md:px-4 py-3 text-xs md:text-sm">
                                            <button
                                                onClick={() => handleRemoveParticipant(participant.id)}
                                                className="text-red-600 hover:text-red-700 text-xs md:text-sm"
                                            >
                                                Remove
                                            </button>
                                        </td>
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
                <h2 className="text-xl font-semibold text-gray-900">Groups</h2>
                {participants.length >= 2 && (
                    <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                        Create Groups
                    </button>
                )}
            </div>
            {participants.length < 2 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <p className="text-gray-600">You need at least 2 participants to create groups.</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <p className="text-gray-600">Groups will be displayed here once created.</p>
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
                <h2 className="text-xl font-semibold text-gray-900">Tournament Brackets</h2>
                {participants.length >= 2 && (
                    <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                        Generate Bracket
                    </button>
                )}
            </div>
            {participants.length < 2 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <p className="text-gray-600">You need at least 2 participants to generate brackets.</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <p className="text-gray-600">Bracket will be displayed here once generated.</p>
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
                <h2 className="text-xl font-semibold text-gray-900">Tournament Matches</h2>
            </div>
            {matches.length === 0 ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <p className="text-gray-600">No matches scheduled yet. Generate brackets to create matches.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {matches.map((match) => (
                        <div key={match.id} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium text-gray-900">
                                        {match.match_players?.find((p: MatchPlayer) => p.team === 'player_1')?.player_name || 'TBD'} 
                                        {' vs '}
                                        {match.match_players?.find((p: MatchPlayer) => p.team === 'player_2')?.player_name || 'TBD'}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                        {match.match_date ? new Date(match.match_date).toLocaleString() : 'Not scheduled'}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        match.status === 'live' ? 'bg-green-100 text-green-800' :
                                        match.status === 'completed' ? 'bg-gray-100 text-gray-800' :
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
}: {
    tournament: Tournament;
    participants: Participant[];
    onRefresh: () => void;
}) {
    const [teams, setTeams] = useState<TournamentTeam[]>([]);
    const [membersByTeam, setMembersByTeam] = useState<Record<string, TournamentTeamMember[]>>({});
    const [newTeamName, setNewTeamName] = useState("");
    const [newTeamShortName, setNewTeamShortName] = useState("");
    const [addingToTeamId, setAddingToTeamId] = useState<string | null>(null);
    const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
    const [position, setPosition] = useState<1 | 2>(1);
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

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Teams</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-wrap items-end gap-3">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Team name</label>
                    <input
                        type="text"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="e.g. Eagles"
                        className="w-48 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Short name</label>
                    <input
                        type="text"
                        value={newTeamShortName}
                        onChange={(e) => setNewTeamShortName(e.target.value)}
                        placeholder="e.g. EGL"
                        className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                </div>
                <button
                    type="button"
                    onClick={handleCreateTeam}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                >
                    Add Team
                </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                {teams.map((team) => (
                    <div key={team.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold text-gray-900">
                                {team.name}
                                {team.short_name && (
                                    <span className="text-gray-500 font-normal ml-2">({team.short_name})</span>
                                )}
                            </h3>
                        </div>
                        <ul className="space-y-2 mb-3">
                            {(membersByTeam[team.id] || []).map((m) => (
                                <li key={m.id} className="flex items-center justify-between text-sm">
                                    <span>
                                        P{m.position}: {(m as TournamentTeamMember & { participant?: Participant }).participant?.player_name ?? "—"}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveMember(m.id)}
                                        className="text-red-600 hover:underline"
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {addingToTeamId === team.id ? (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
                                <select
                                    value={selectedParticipantId || ""}
                                    onChange={(e) => setSelectedParticipantId(e.target.value || null)}
                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                    <option value="">Select participant</option>
                                    {availableParticipants.map((p) => (
                                        <option key={p.id} value={p.id}>{p.player_name}</option>
                                    ))}
                                </select>
                                <select
                                    value={position}
                                    onChange={(e) => setPosition(parseInt(e.target.value) as 1 | 2)}
                                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                    <option value={1}>P1</option>
                                    <option value={2}>P2</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={handleAddMember}
                                    className="bg-gray-700 text-white px-3 py-1 rounded text-sm"
                                >
                                    Add
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setAddingToTeamId(null); setSelectedParticipantId(null); }}
                                    className="text-gray-600 text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setAddingToTeamId(team.id)}
                                disabled={availableParticipants.length === 0}
                                className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                            >
                                + Add member
                            </button>
                        )}
                    </div>
                ))}
            </div>
            {teams.length === 0 && (
                <p className="text-gray-500 text-sm">Create teams and assign participants from the list. Participants must be added in the Participants tab first.</p>
            )}
        </div>
    );
}

function TeamScheduleTab({ tournament, onRefresh }: { tournament: Tournament; onRefresh: () => void }) {
    const [teams, setTeams] = useState<TournamentTeam[]>([]);
    const [matches, setMatches] = useState<TournamentMatch[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newMatch, setNewMatch] = useState({ team_a_id: "", team_b_id: "", court_number: "", match_date: "", match_number: "" });
    const supabase = createClient();

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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Schedule</h2>
                <button
                    type="button"
                    onClick={() => setShowAdd(!showAdd)}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                >
                    {showAdd ? "Cancel" : "Add Match"}
                </button>
            </div>
            {showAdd && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Team A</label>
                            <select
                                value={newMatch.team_a_id}
                                onChange={(e) => setNewMatch((m) => ({ ...m, team_a_id: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            >
                                <option value="">Select</option>
                                {teams.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Team B</label>
                            <select
                                value={newMatch.team_b_id}
                                onChange={(e) => setNewMatch((m) => ({ ...m, team_b_id: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Court</label>
                            <input
                                type="text"
                                value={newMatch.court_number}
                                onChange={(e) => setNewMatch((m) => ({ ...m, court_number: e.target.value }))}
                                placeholder="Court 1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date & time</label>
                            <input
                                type="datetime-local"
                                value={newMatch.match_date}
                                onChange={(e) => setNewMatch((m) => ({ ...m, match_date: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Match #</label>
                            <input
                                type="text"
                                value={newMatch.match_number}
                                onChange={(e) => setNewMatch((m) => ({ ...m, match_number: e.target.value }))}
                                placeholder="W01"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                        </div>
                    </div>
                    <button type="button" onClick={handleAddMatch} className="bg-gray-800 text-white px-4 py-2 rounded-md text-sm">
                        Save Match
                    </button>
                </div>
            )}
            <div className="space-y-2">
                {matches.map((match) => (
                    <div key={match.id} className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <span className="font-medium text-gray-900">
                                {(match as TournamentMatch).team_a?.name ?? "TBD"} vs {(match as TournamentMatch).team_b?.name ?? "TBD"}
                            </span>
                            <div className="text-sm text-gray-500 mt-1">
                                {match.match_date ? new Date(match.match_date).toLocaleString() : "—"} · Court: {match.court_number || "—"} · {match.match_number || "—"}
                            </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                            match.status === "completed" ? "bg-gray-100 text-gray-800" : match.status === "live" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                        }`}>
                            {match.status}
                        </span>
                    </div>
                ))}
            </div>
            {matches.length === 0 && !showAdd && <p className="text-gray-500 text-sm">No matches yet. Add a match to build the schedule.</p>}
        </div>
    );
}

function TeamResultsTab({ tournament, onRefresh }: { tournament: Tournament; onRefresh: () => void }) {
    const [matches, setMatches] = useState<TournamentMatch[]>([]);
    const [teams, setTeams] = useState<TournamentTeam[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [winnerId, setWinnerId] = useState("");
    const [finalScore, setFinalScore] = useState("");
    const supabase = createClient();

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
        try {
            const { error } = await supabase
                .from("matches")
                .update({
                    status: "completed",
                    winner_team_id: winnerId || null,
                    final_score: finalScore || null,
                    completed_at: new Date().toISOString(),
                })
                .eq("id", matchId);
            if (error) throw error;
            setEditingId(null);
            setWinnerId("");
            setFinalScore("");
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
        setFinalScore(m.final_score || "");
    };

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Results</h2>
            <p className="text-sm text-gray-500">Record winner and final score for completed matches.</p>
            <div className="space-y-2">
                {matches.map((match) => {
                    const m = match as TournamentMatch;
                    const isEditing = editingId === match.id;
                    const matchTeams = [m.team_a, m.team_b].filter(Boolean);
                    const winnerOptions = matchTeams.length >= 2 ? matchTeams : teams.filter((t) => t.id === m.team_a_id || t.id === m.team_b_id);
                    return (
                        <div key={match.id} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                    <span className="font-medium text-gray-900">{m.team_a?.name ?? teams.find((t) => t.id === m.team_a_id)?.name ?? "TBD"} vs {m.team_b?.name ?? teams.find((t) => t.id === m.team_b_id)?.name ?? "TBD"}</span>
                                    {match.status === "completed" && (
                                        <span className="ml-2 text-gray-600">
                                            Won by {(m.winner_team as { name?: string })?.name ?? teams.find((t) => t.id === m.winner_team_id)?.name ?? "—"} {m.final_score ? ` · ${m.final_score}` : ""}
                                        </span>
                                    )}
                                </div>
                                {match.status !== "completed" ? (
                                    isEditing ? (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <select
                                                value={winnerId}
                                                onChange={(e) => setWinnerId(e.target.value)}
                                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                                            >
                                                <option value="">Select winner</option>
                                                {winnerOptions.filter((t): t is NonNullable<typeof t> => t != null).map((t) => (
                                                    <option key={t.id} value={t.id}>{t.name}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="text"
                                                value={finalScore}
                                                onChange={(e) => setFinalScore(e.target.value)}
                                                placeholder="21-10"
                                                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                            />
                                            <button type="button" onClick={() => handleSaveResult(match.id)} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Save</button>
                                            <button type="button" onClick={() => { setEditingId(null); setWinnerId(""); setFinalScore(""); }} className="text-gray-600 text-sm">Cancel</button>
                                        </div>
                                    ) : (
                                        <button type="button" onClick={() => startEdit(m)} className="bg-gray-700 text-white px-3 py-1 rounded text-sm">Enter result</button>
                                    )
                                ) : (
                                    <span className="text-green-600 text-sm font-medium">Completed</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {matches.length === 0 && <p className="text-gray-500 text-sm">No matches. Add matches in the Schedule tab first.</p>}
        </div>
    );
}

function TeamStatsTab({ tournament }: { tournament: Tournament }) {
    const [matches, setMatches] = useState<TournamentMatch[]>([]);
    const [teams, setTeams] = useState<TournamentTeam[]>([]);
    const supabase = createClient();

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
            const parts = score.split("-").map((n) => parseInt(n.trim(), 10));
            if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                if (ma && stats[ma]) { stats[ma].pointsFor += parts[0]; stats[ma].pointsAgainst += parts[1]; }
                if (mb && stats[mb]) { stats[mb].pointsFor += parts[1]; stats[mb].pointsAgainst += parts[0]; }
            }
        }
    });
    const sorted = teams
        .map((t) => ({ team: t, ...stats[t.id], pts: (stats[t.id].won * 2) + (stats[t.id].lost * 0) }))
        .sort((a, b) => b.pts - a.pts);

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Team standings</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-900">#</th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-900">Team</th>
                            <th className="text-center py-2 px-3 text-sm font-medium text-gray-900">TM</th>
                            <th className="text-center py-2 px-3 text-sm font-medium text-gray-900">PL</th>
                            <th className="text-center py-2 px-3 text-sm font-medium text-gray-900">W</th>
                            <th className="text-center py-2 px-3 text-sm font-medium text-gray-900">L</th>
                            <th className="text-center py-2 px-3 text-sm font-medium text-gray-900">PTS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((row, idx) => (
                            <tr key={row.team.id} className="border-t border-gray-200">
                                <td className="py-2 px-3 text-sm">{idx + 1}</td>
                                <td className="py-2 px-3 text-sm font-medium">{row.team.name}</td>
                                <td className="py-2 px-3 text-sm text-center">{row.team.short_name || "—"}</td>
                                <td className="py-2 px-3 text-sm text-center">{row.played}</td>
                                <td className="py-2 px-3 text-sm text-center">{row.won}</td>
                                <td className="py-2 px-3 text-sm text-center">{row.lost}</td>
                                <td className="py-2 px-3 text-sm text-center">{row.pts}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-gray-500">TM = Team name short, PL = Played, W = Won, L = Lost, PTS = Points (2 per win).</p>
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
            return { member: mem, ...s, pts: s.won * 2 };
        })
        .filter((r) => r.member.participant)
        .sort((a, b) => b.pts - a.pts);

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Player stats</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-900">#</th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-900">Player</th>
                            <th className="text-left py-2 px-3 text-sm font-medium text-gray-900">Team</th>
                            <th className="text-center py-2 px-3 text-sm font-medium text-gray-900">PL</th>
                            <th className="text-center py-2 px-3 text-sm font-medium text-gray-900">W</th>
                            <th className="text-center py-2 px-3 text-sm font-medium text-gray-900">L</th>
                            <th className="text-center py-2 px-3 text-sm font-medium text-gray-900">PTS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((row, idx) => (
                            <tr key={row.member.id} className="border-t border-gray-200">
                                <td className="py-2 px-3 text-sm">{idx + 1}</td>
                                <td className="py-2 px-3 text-sm font-medium">{(row.member as TournamentTeamMember & { participant?: Participant }).participant?.player_name ?? "—"}</td>
                                <td className="py-2 px-3 text-sm">{(row.member as TournamentTeamMember & { team?: TournamentTeam }).team?.name ?? "—"}</td>
                                <td className="py-2 px-3 text-sm text-center">{row.played}</td>
                                <td className="py-2 px-3 text-sm text-center">{row.won}</td>
                                <td className="py-2 px-3 text-sm text-center">{row.lost}</td>
                                <td className="py-2 px-3 text-sm text-center">{row.pts}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Settings Tab Component
function SettingsTab({ tournament, onTournamentUpdate }: { tournament: Tournament; onTournamentUpdate: () => void }) {
    const [settings, setSettings] = useState({
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
            <h2 className="text-xl font-semibold text-gray-900">Tournament Settings</h2>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tournament Format
                    </label>
                    <select
                        value={settings.format}
                        onChange={(e) => setSettings({ ...settings, format: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        <option value="single_elimination">Single Elimination</option>
                        <option value="double_elimination">Double Elimination</option>
                        <option value="round_robin">Round Robin</option>
                        <option value="round_robin_knockout">Round Robin + Knockout</option>
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sets per Match
                        </label>
                        <select
                            value={settings.sets_per_match}
                            onChange={(e) => setSettings({ ...settings, sets_per_match: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                            <option value={3}>Best of 3</option>
                            <option value={5}>Best of 5</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Points per Set
                        </label>
                        <select
                            value={settings.points_per_set}
                            onChange={(e) => setSettings({ ...settings, points_per_set: parseInt(e.target.value) })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
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
                            onChange={(e) => setSettings({ ...settings, win_by_two: e.target.checked })}
                            className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Win by 2 points</span>
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Points (cap)
                    </label>
                    <input
                        type="number"
                        value={settings.max_points}
                        onChange={(e) => setSettings({ ...settings, max_points: parseInt(e.target.value) })}
                        min="21"
                        max="30"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seeding Method
                    </label>
                    <select
                        value={settings.seeding_method}
                        onChange={(e) => setSettings({ ...settings, seeding_method: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        <option value="random">Random</option>
                        <option value="manual">Manual</option>
                        <option value="ranking">By Ranking</option>
                        <option value="registration_order">Registration Order</option>
                    </select>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>
        </div>
    );
}

