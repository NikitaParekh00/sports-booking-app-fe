"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabaseClient";
import PhoneInput from "@/components/PhoneInput";
import { opponentManager } from "@/lib/opponentManagement";
import { parseParticipantCsv, BADMINTON_PARTICIPANT_CSV_TEMPLATE } from "@/lib/csvParticipantParser";

const sports = [
    { id: "cricket", name: "Cricket", icon: "🏏" },
    { id: "football", name: "Football", icon: "⚽" },
    { id: "badminton", name: "Badminton", icon: "🏸" },
    { id: "tennis", name: "Lawn Tennis", icon: "🎾" },
    { id: "table-tennis", name: "Table Tennis", icon: "🏓" },
    { id: "pickleball", name: "Pickleball", icon: "🏓" },
    { id: "padel", name: "Padel", icon: "🎾" },
    { id: "squash", name: "Squash", icon: "🏓" },
    { id: "billiards", name: "Billiards", icon: "🎱" },
    { id: "basketball", name: "Basketball", icon: "🏀" },
];

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
    created_at: string;
    tournament_mode?: 'individual' | 'team';
}

export default function TournamentsPage() {
    const [tournaments, setTournaments] = useState<Tournament[]>([]);
    const [selectedSport, setSelectedSport] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    const fetchTournaments = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('tournaments')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching tournaments:', error);
                // If table doesn't exist or other error, set empty array
                setTournaments([]);
            } else {
                setTournaments(data || []);
            }
        } catch (error) {
            console.error('Error fetching tournaments:', error);
            setTournaments([]);
        } finally {
            setIsLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchTournaments();
    }, [fetchTournaments]);

    const handleSportSelect = (sportId: string) => {
        setSelectedSport(sportId);
        setShowCreateForm(true);
    };

    if (showCreateForm && selectedSport) {
        return <CreateTournamentForm sport={selectedSport} onBack={() => setShowCreateForm(false)} />;
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-gray-500">Loading tournaments...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                        <Image src="/logo.jpeg" alt="Simplifit" width={120} height={40} className="h-8 w-auto object-contain" />
                        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">Tournaments</h1>
                    </div>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm md:text-base w-full sm:w-auto"
                    >
                        Create Tournament
                    </button>
                </div>

                {tournaments.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-gray-500 mb-4">No tournaments found</div>
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700"
                        >
                            Create Your First Tournament
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {tournaments.map((tournament) => (
                            <div key={tournament.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-2xl">{sports.find(s => s.id === tournament.sport)?.icon}</span>
                                    <h3 className="font-semibold text-gray-900">{tournament.name}</h3>
                                </div>
                                <p className="text-gray-600 text-sm mb-2">{tournament.description}</p>
                                <div className="text-xs text-gray-500 space-y-1">
                                    <div>Sport: {sports.find(s => s.id === tournament.sport)?.name}</div>
                                    <div>Location: {tournament.location}</div>
                                    <div>Entry Fee: ₹{tournament.entry_fee}</div>
                                    <div>Prize Pool: ₹{tournament.prize_pool}</div>
                                    <div>Status: <span className={`font-medium ${tournament.status === 'live' ? 'text-green-600' : tournament.status === 'completed' ? 'text-gray-600' : 'text-blue-600'}`}>{tournament.status}</span></div>
                                </div>
                                <a
                                    href={`/scoring/tournaments/${tournament.id}`}
                                    className="block w-full mt-4 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 text-center"
                                >
                                    View Details
                                </a>
                            </div>
                        ))}
                    </div>
                )}

                {!selectedSport && (
                    <div className="mt-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Tournament</h2>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                            {sports.map((sport) => (
                                <button
                                    key={sport.id}
                                    onClick={() => handleSportSelect(sport.id)}
                                    className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-shadow"
                                >
                                    <div className="text-4xl mb-2">{sport.icon}</div>
                                    <span className="text-sm text-gray-800 text-center">{sport.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function CreateTournamentForm({ sport, onBack }: { sport: string; onBack: () => void }) {
    // Sport-specific defaults (pickleball & badminton)
    const isPickleball = sport === 'pickleball';
    const isBadminton = sport === 'badminton';
    const defaultPoints = isPickleball ? 11 : isBadminton ? 21 : 21;
    const defaultMaxPoints = isPickleball ? 15 : isBadminton ? 30 : 30;
    const defaultSets = 3;
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        location: '',
        max_participants: 16,
        entry_fee: 0,
        prize_pool: 0,
        tournament_mode: 'individual' as 'individual' | 'team',
        format: 'single_elimination',
        sets_per_match: defaultSets,
        points_per_set: defaultPoints,
        win_by_two: true, // Always true for pickleball
        max_points: defaultMaxPoints,
        seeding_method: 'random',
    });
    const [participants, setParticipants] = useState<Array<{ name: string; phone: string; email?: string; category?: string; seed?: number; club?: string }>>([]);
    const [newParticipantName, setNewParticipantName] = useState('');
    const [newParticipantPhone, setNewParticipantPhone] = useState('');
    const [csvUploadError, setCsvUploadError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Check if user is authenticated using localStorage (same as other pages)
            const storedUser = localStorage.getItem('sf:user');
            if (!storedUser) {
                alert('Please sign in to create tournaments. Redirecting to login...');
                window.location.href = '/login';
                return;
            }

            const userData = JSON.parse(storedUser);

            // Verify user exists in profiles table (they should already exist)
            const { data: existingUser, error: userError } = await supabase
                .from('profiles')
                .select('user_id, full_name, phone, role')
                .eq('user_id', userData.user_id)
                .single();

            if (userError || !existingUser) {
                console.error('User not found in profiles table:', userError);
                alert('User not found. Please sign in again.');
                setIsLoading(false);
                return;
            }

            // Ensure numeric fields are valid numbers, not NaN
            const tournamentData = {
                name: formData.name.trim(),
                description: formData.description.trim(),
                start_date: formData.start_date,
                end_date: formData.end_date,
                location: formData.location.trim(),
                max_participants: Number(formData.max_participants) || 16,
                entry_fee: Number(formData.entry_fee) || 0,
                prize_pool: Number(formData.prize_pool) || 0,
                tournament_mode: formData.tournament_mode,
                format: formData.format,
                sets_per_match: Number(formData.sets_per_match) || 3,
                points_per_set: Number(formData.points_per_set) || 21,
                win_by_two: formData.win_by_two,
                max_points: Number(formData.max_points) || 30,
                seeding_method: formData.seeding_method,
                created_by: userData.user_id,
                sport,
                status: 'upcoming',
            };

            // Create tournament
            const { data: tournament, error: tournamentError } = await supabase
                .from('tournaments')
                .insert(tournamentData)
                .select()
                .single();

            if (tournamentError) throw tournamentError;

            // Add participants if any were provided
            if (participants.length > 0 && tournament) {
                const participantPromises = participants.map(async (participant) => {
                    let userId = null;
                    if (participant.phone) {
                        const phoneValidation = opponentManager.validatePhoneNumber(participant.phone);
                        if (phoneValidation.isValid) {
                            const opponentInfo = await opponentManager.findOrCreateOpponent(participant.phone, participant.name);
                            userId = opponentInfo.user_id;
                        }
                    }

                    return supabase
                        .from('tournament_participants')
                        .insert({
                            tournament_id: tournament.id,
                            user_id: userId,
                            player_name: participant.name,
                            phone: participant.phone ? `+91-${participant.phone.replace(/\D/g, '')}` : null,
                            email: participant.email || null,
                            category: participant.category || null,
                            seed_number: participant.seed ?? null,
                            club: participant.club || null,
                            status: 'registered',
                        });
                });

                const results = await Promise.all(participantPromises);
                const errors = results.filter(r => r.error);
                if (errors.length > 0) {
                    console.error('Some participants failed to add:', errors);
                    // Continue anyway - tournament is created
                }
            }

            alert('Tournament created successfully!');
            onBack();
        } catch (error) {
            console.error('Error creating tournament:', error);
            alert('Failed to create tournament. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-600 mb-4 text-sm md:text-base"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Tournaments
                    </button>
                    <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">Create Tournament</h1>
                    <p className="text-gray-600 mt-1 text-sm md:text-base">
                        {sports.find(s => s.id === sport)?.name}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tournament Name
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tournament Mode
                        </label>
                        <select
                            value={formData.tournament_mode}
                            onChange={(e) => setFormData({ ...formData, tournament_mode: e.target.value as 'individual' | 'team' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                        >
                            <option value="individual">Individual (player vs player)</option>
                            <option value="team">Team (team vs team, e.g. league)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                            Team mode: create teams, assign participants, schedule team vs team matches and track standings.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date
                            </label>
                            <input
                                type="datetime-local"
                                required
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Date
                            </label>
                            <input
                                type="datetime-local"
                                required
                                value={formData.end_date}
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Location
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Max Participants
                            </label>
                            <input
                                type="number"
                                min="2"
                                value={formData.max_participants}
                                onChange={(e) => {
                                    const value = e.target.value === '' ? 16 : parseInt(e.target.value) || 16;
                                    setFormData({ ...formData, max_participants: value });
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Entry Fee (₹)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.entry_fee}
                                onChange={(e) => {
                                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                    setFormData({ ...formData, entry_fee: value });
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Prize Pool (₹)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={formData.prize_pool}
                                onChange={(e) => {
                                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                                    setFormData({ ...formData, prize_pool: value });
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                            />
                        </div>
                    </div>

                    {/* Tournament Format Section */}
                    <div className="border-t border-gray-200 pt-6 mt-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Tournament Format</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tournament Type *
                                </label>
                                <select
                                    value={formData.format}
                                    onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                                    required
                                >
                                    <option value="single_elimination">Single Elimination</option>
                                    <option value="double_elimination">Double Elimination</option>
                                    <option value="round_robin">Round Robin</option>
                                    <option value="round_robin_knockout">Round Robin + Knockout</option>
                                    <option value="swiss">Swiss System</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                    {formData.format === 'single_elimination' && (isPickleball 
                                        ? 'Players/teams are eliminated after one loss. Standard for most pickleball tournaments.'
                                        : isBadminton
                                        ? 'Players/pairs are eliminated after one loss. Standard for most badminton tournaments.'
                                        : 'Players are eliminated after one loss')}
                                    {formData.format === 'double_elimination' && (isPickleball
                                        ? 'Players/teams need two losses to be eliminated. More competitive format.'
                                        : isBadminton
                                        ? 'Players/pairs need two losses to be eliminated. More competitive format.'
                                        : 'Players need two losses to be eliminated')}
                                    {formData.format === 'round_robin' && (isPickleball
                                        ? 'All players/teams play against each other. Great for smaller tournaments.'
                                        : isBadminton
                                        ? 'All players/pairs play each other. Great for leagues and smaller events.'
                                        : 'All players play against each other')}
                                    {formData.format === 'round_robin_knockout' && (isPickleball
                                        ? 'Round robin stage to determine seeding, followed by knockout playoffs.'
                                        : isBadminton
                                        ? 'Round robin stage for seeding, then knockout playoffs. Common in badminton.'
                                        : 'Round robin stage followed by knockout')}
                                    {formData.format === 'swiss' && (isPickleball
                                        ? 'Players/teams with similar win-loss records are paired each round.'
                                        : isBadminton
                                        ? 'Players/pairs with similar records are paired each round.'
                                        : 'Players with similar records are paired')}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Games per Match {isPickleball && '(Pickleball)'} {isBadminton && '(Badminton)'}
                                    </label>
                                    <select
                                        value={formData.sets_per_match}
                                        onChange={(e) => setFormData({ ...formData, sets_per_match: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                                    >
                                        <option value={1}>1 game only</option>
                                        <option value={3}>Best of 3 {(isPickleball || isBadminton) && '(Standard)'}</option>
                                        <option value={5}>Best of 5</option>
                                    </select>
                                    {isPickleball && (
                                        <p className="text-xs text-gray-500 mt-1">Pickleball matches are typically best of 3 games</p>
                                    )}
                                    {isBadminton && (
                                        <p className="text-xs text-gray-500 mt-1">Badminton matches are typically best of 3 games (first to 2)</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Points per Game {isPickleball && '(Pickleball)'} {isBadminton && '(Badminton)'}
                                    </label>
                                    {isPickleball ? (
                                        <select
                                            value={formData.points_per_set}
                                            onChange={(e) => setFormData({ ...formData, points_per_set: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                                        >
                                            <option value={11}>11 points (Standard)</option>
                                            <option value={15}>15 points</option>
                                            <option value={21}>21 points</option>
                                        </select>
                                    ) : isBadminton ? (
                                        <select
                                            value={formData.points_per_set}
                                            onChange={(e) => setFormData({ ...formData, points_per_set: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                                        >
                                            <option value={21}>21 points (Standard)</option>
                                            <option value={15}>15 points (Legacy)</option>
                                        </select>
                                    ) : (
                                        <select
                                            value={formData.points_per_set}
                                            onChange={(e) => setFormData({ ...formData, points_per_set: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                                        >
                                            <option value={15}>15 points</option>
                                            <option value={21}>21 points</option>
                                        </select>
                                    )}
                                    {isPickleball && (
                                        <p className="text-xs text-gray-500 mt-1">Standard pickleball games are played to 11 points (win by 2)</p>
                                    )}
                                    {isBadminton && (
                                        <p className="text-xs text-gray-500 mt-1">Standard badminton games are played to 21 points (win by 2, cap at 30)</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Maximum Points (Cap)
                                    </label>
                                    <input
                                        type="number"
                                        min={isPickleball ? "13" : "21"}
                                        max={isPickleball ? "21" : "30"}
                                        value={formData.max_points}
                                        onChange={(e) => setFormData({ ...formData, max_points: parseInt(e.target.value) || defaultMaxPoints })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        {isPickleball 
                                            ? "Maximum points in a game (typically 15 for 11-point games, prevents infinite deuce)"
                                            : isBadminton
                                            ? "Maximum points in a game (badminton standard cap is 30; at 29-all, next point wins)"
                                            : "Maximum points allowed in a set (prevents infinite games)"}
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Seeding Method
                                    </label>
                                    <select
                                        value={formData.seeding_method}
                                        onChange={(e) => setFormData({ ...formData, seeding_method: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
                                    >
                                        <option value="random">Random</option>
                                        <option value="manual">Manual</option>
                                        <option value="ranking">By Ranking</option>
                                        <option value="registration_order">Registration Order</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.win_by_two}
                                        onChange={(e) => setFormData({ ...formData, win_by_two: e.target.checked })}
                                        className="rounded border-gray-300"
                                        disabled={isPickleball || isBadminton}
                                    />
                                    <span className="text-sm text-gray-700">
                                        Win by 2 points {(isPickleball || isBadminton) && '(Required)'}
                                    </span>
                                </label>
                                <p className="text-xs text-gray-500 mt-1 ml-6">
                                    {isPickleball 
                                        ? "Pickleball requires winning by 2 points (e.g., 11-9, not 11-10). If score reaches cap, next point wins."
                                        : isBadminton
                                        ? "Badminton requires winning by 2 points (e.g., 21-19, not 21-20). At 29-all, next point wins."
                                        : "If enabled, player must win by 2 points (e.g., 21-19, not 21-20)"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Participants Section */}
                    <div className="border-t border-gray-200 pt-6 mt-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Participants (Optional)</h2>
                        <p className="text-sm text-gray-600 mb-4">You can add participants now or later from the tournament page. Use the sheet upload for bulk add (CSV with name, phone, email, category, seed, club).</p>
                        
                        {/* Sheet / CSV upload */}
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 space-y-3">
                            <h3 className="text-sm font-medium text-gray-800">Upload from sheet (CSV)</h3>
                            <p className="text-xs text-gray-600">First row can be header: name, phone, email, category, seed, club. Name is required.</p>
                            <div className="flex flex-wrap items-center gap-3">
                                <label className="cursor-pointer bg-white border border-gray-300 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                    Choose CSV file
                                    <input
                                        type="file"
                                        accept=".csv,.txt"
                                        className="sr-only"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            setCsvUploadError(null);
                                            if (!file) return;
                                            const reader = new FileReader();
                                            reader.onload = () => {
                                                const text = String(reader.result ?? '');
                                                const { participants: parsed, errors } = parseParticipantCsv(text);
                                                if (parsed.length === 0 && errors.length > 0) {
                                                    setCsvUploadError(errors.join(' '));
                                                    return;
                                                }
                                                const max = formData.max_participants;
                                                const toAdd = parsed.slice(0, Math.max(0, max - participants.length));
                                                if (toAdd.length < parsed.length) {
                                                    setCsvUploadError(`Only ${toAdd.length} participants added; max ${max} for this tournament.`);
                                                }
                                                setParticipants((prev) => [...prev, ...toAdd]);
                                                if (errors.length > 0) setCsvUploadError((err) => (err ? err + ' ' : '') + errors.join(' '));
                                            };
                                            reader.readAsText(file);
                                            e.target.value = '';
                                        }}
                                    />
                                </label>
                                <a
                                    href={`data:text/csv;charset=utf-8,${encodeURIComponent(BADMINTON_PARTICIPANT_CSV_TEMPLATE)}`}
                                    download="badminton_participants_template.csv"
                                    className="text-sm text-blue-600 hover:underline"
                                >
                                    Download template
                                </a>
                            </div>
                            {csvUploadError && <p className="text-sm text-amber-700">{csvUploadError}</p>}
                        </div>
                        
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Participant Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newParticipantName}
                                        onChange={(e) => setNewParticipantName(e.target.value)}
                                        placeholder="Enter name"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
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
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (newParticipantName.trim()) {
                                        if (participants.length >= formData.max_participants) {
                                            alert(`Maximum ${formData.max_participants} participants allowed.`);
                                            return;
                                        }
                                        setParticipants([...participants, { name: newParticipantName.trim(), phone: newParticipantPhone, email: undefined, category: undefined, seed: undefined, club: undefined }]);
                                        setNewParticipantName('');
                                        setNewParticipantPhone('');
                                    }
                                }}
                                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm"
                            >
                                Add Participant
                            </button>
                        </div>

                        {participants.length > 0 && (
                            <div className="mt-4">
                                <h3 className="text-sm font-medium text-gray-700 mb-2">
                                    Added Participants ({participants.length})
                                </h3>
                                <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-48 overflow-y-auto">
                                    {participants.map((participant, index) => (
                                        <div key={index} className="flex items-center justify-between p-3">
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{participant.name}</div>
                                                <div className="text-xs text-gray-500">
                                                    {[participant.phone, participant.email, participant.category, participant.club].filter(Boolean).join(' · ') || '—'}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setParticipants(participants.filter((_, i) => i !== index));
                                                }}
                                                className="text-red-600 hover:text-red-700 text-sm"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                    >
                        {isLoading ? 'Creating...' : 'Create Tournament'}
                    </button>
                </form>
            </div>
        </div>
    );
}