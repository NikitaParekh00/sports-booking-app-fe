"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabaseClient";

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
        <div className="min-h-screen bg-white p-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-semibold text-gray-900">Tournaments</h1>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                        Create Tournament
                    </button>
                </div>

                {tournaments.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-gray-500 mb-4">No tournaments found</div>
                        <button
                            onClick={() => setSelectedSport('')}
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
                                <button className="w-full mt-4 bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200">
                                    View Details
                                </button>
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
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        start_date: '',
        end_date: '',
        location: '',
        max_participants: 16,
        entry_fee: 0,
        prize_pool: 0,
    });
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Check if user is authenticated
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                alert('Please sign in to create tournaments. Redirecting to login...');
                window.location.href = '/login';
                return;
            }

            const { error } = await supabase
                .from('tournaments')
                .insert({
                    ...formData,
                    created_by: user.id,
                    sport,
                    status: 'upcoming',
                });

            if (error) throw error;

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
        <div className="min-h-screen bg-white p-4">
            <div className="max-w-md mx-auto">
                <div className="mb-6">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-600 mb-4"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Tournaments
                    </button>
                    <h1 className="text-2xl font-semibold text-gray-900">Create Tournament</h1>
                    <p className="text-gray-600 mt-1">
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
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date
                            </label>
                            <input
                                type="datetime-local"
                                required
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Max Participants
                            </label>
                            <input
                                type="number"
                                min="2"
                                value={formData.max_participants}
                                onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                onChange={(e) => setFormData({ ...formData, entry_fee: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                onChange={(e) => setFormData({ ...formData, prize_pool: parseFloat(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Creating...' : 'Create Tournament'}
                    </button>
                </form>
            </div>
        </div>
    );
}