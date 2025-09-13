"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabaseClient';

interface Match {
    id: string;
    sport: string;
    match_type: string;
    status: string;
    match_date: string;
    location?: string;
    notes?: string;
    created_at: string;
    winner_id?: string;
    completed_at?: string;
}

// interface Player {
//     id: string;
//     player_name: string;
//     team: string;
//     is_captain: boolean;
// }

export default function MyGamesPage() {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const fetchMyGames = useCallback(async () => {
        try {
            // For development: Get user from localStorage
            const storedUser = localStorage.getItem('sf:user');
            if (!storedUser) {
                setError('Please sign in to view your games');
                return;
            }

            const userData = JSON.parse(storedUser);

            // Fetch matches created by the user
            const { data: matchesData, error: matchesError } = await supabase
                .from('matches')
                .select('*')
                .eq('created_by', userData.user_id)
                .order('created_at', { ascending: false });

            if (matchesError) throw matchesError;

            setMatches(matchesData || []);
        } catch (error) {
            console.error('Error fetching games:', error);
            setError('Failed to load your games');
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        fetchMyGames();
    }, [fetchMyGames]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'live': return 'text-green-600 bg-green-100';
            case 'completed': return 'text-gray-600 bg-gray-100';
            case 'upcoming': return 'text-blue-600 bg-blue-100';
            case 'cancelled': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getSportIcon = (sport: string) => {
        const icons: { [key: string]: string } = {
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
        return icons[sport] || "🏆";
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-gray-500">Loading your games...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 mb-4">{error}</div>
                    <button
                        onClick={() => window.history.back()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <div className="px-4 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.history.back()}
                            className="p-2 hover:bg-gray-100 rounded-full"
                        >
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <div>
                            <h1 className="text-lg font-semibold text-gray-900">My Games</h1>
                            <p className="text-sm text-gray-600">{matches.length} games found</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Games List */}
            <div className="px-4 py-6 pb-20">
                {matches.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">🏆</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Games Yet</h3>
                        <p className="text-gray-600 mb-6">Start your first game to see it here!</p>
                        <a
                            href="/scoring/friendly"
                            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 inline-block"
                        >
                            Start a Game
                        </a>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {matches.map((match) => (
                            <div key={match.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl">{getSportIcon(match.sport)}</div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 capitalize">
                                                {match.sport} {match.match_type}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                {new Date(match.match_date || match.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(match.status)}`}>
                                        {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                                    </div>
                                </div>

                                {match.location && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="text-sm text-gray-600">{match.location}</span>
                                    </div>
                                )}

                                {match.status === 'completed' && match.completed_at && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span className="text-sm text-gray-600">
                                            Completed on {new Date(match.completed_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mt-3">
                                    <a
                                        href={`/scoring/match/${match.id}`}
                                        className="text-red-600 text-sm font-medium hover:text-red-700"
                                    >
                                        View Details →
                                    </a>
                                    <span className="text-xs text-gray-500">
                                        Created {new Date(match.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-20">
                <div className="flex justify-around items-center">
                    <a href="/dashboard" className="flex flex-col items-center">
                        <svg className="w-6 h-6 text-gray-400 mb-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        </svg>
                        <span className="text-xs text-gray-400">Home</span>
                    </a>
                    <a href="/search" className="flex flex-col items-center">
                        <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="text-xs text-gray-400">Search</span>
                    </a>
                    <div className="flex flex-col items-center">
                        <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="text-xs text-gray-400">Community</span>
                    </div>
                    <a href="/profile" className="flex flex-col items-center">
                        <span className="text-red-600 font-bold text-xs mb-1">SIMPLIFIT</span>
                        <span className="text-xs text-gray-400">Profile</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
