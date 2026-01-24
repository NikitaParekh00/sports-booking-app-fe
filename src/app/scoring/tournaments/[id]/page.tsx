"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { opponentManager } from "@/lib/opponentManagement";
import PhoneInput from "@/components/PhoneInput";

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
}

interface Participant {
    id: string;
    tournament_id: string;
    user_id: string | null;
    player_name: string;
    phone: string | null;
    status: string;
    created_at: string;
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
}

export default function TournamentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const tournamentId = params.id as string;
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    type TabType = 'overview' | 'participants' | 'groups' | 'brackets' | 'matches' | 'settings';
    const [activeTab, setActiveTab] = useState<TabType>('overview');
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
                        {[
                            { id: 'overview', label: 'Overview' },
                            { id: 'participants', label: `Participants (${participants.length})` },
                            { id: 'groups', label: 'Groups' },
                            { id: 'brackets', label: 'Brackets' },
                            { id: 'matches', label: 'Matches' },
                            { id: 'settings', label: 'Settings' },
                        ].map((tab) => (
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
                    <button
                        onClick={() => setShowAddParticipant(true)}
                        disabled={participants.length >= tournament.max_participants}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Add Participant
                    </button>
                )}
            </div>

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

