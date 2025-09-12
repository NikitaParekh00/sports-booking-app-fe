"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import BadmintonScoring from "@/components/BadmintonScoring";

interface Match {
    id: string;
    sport: string;
    match_type: string;
    status: string;
    match_date: string;
    location: string;
    notes: string;
}

interface Player {
    id: string;
    player_name: string;
    team: string;
    is_captain: boolean;
}

export default function MatchScoringPage() {
    const params = useParams();
    const matchId = params.id as string;
    const [match, setMatch] = useState<Match | null>(null);
    const [players, setPlayers] = useState<Player[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const fetchMatchData = useCallback(async () => {
        try {
            // Fetch match details
            const { data: matchData, error: matchError } = await supabase
                .from('matches')
                .select('*')
                .eq('id', matchId)
                .single();

            if (matchError) throw matchError;

            // Fetch players
            const { data: playersData, error: playersError } = await supabase
                .from('match_players')
                .select('*')
                .eq('match_id', matchId);

            if (playersError) throw playersError;

            setMatch(matchData);
            setPlayers(playersData || []);
        } catch (error) {
            console.error('Error fetching match data:', error);
            setError('Failed to load match data');
        } finally {
            setIsLoading(false);
        }
    }, [matchId, supabase]);

    useEffect(() => {
        if (matchId) {
            fetchMatchData();
        }
    }, [matchId, fetchMatchData]);

    const startMatch = async () => {
        try {
            const { error } = await supabase
                .from('matches')
                .update({ status: 'live' })
                .eq('id', matchId);

            if (error) throw error;

            setMatch(prev => prev ? { ...prev, status: 'live' } : null);
        } catch (error) {
            console.error('Error starting match:', error);
            alert('Failed to start match');
        }
    };

    const endMatch = async () => {
        try {
            // Get final scores to determine winner
            const { data: scores, error: scoresError } = await supabase
                .from('badminton_scores')
                .select('*')
                .eq('match_id', matchId);

            if (scoresError) throw scoresError;

            let winnerId = null;
            if (scores && scores.length >= 2) {
                // Find player with highest points
                const sortedScores = scores.sort((a, b) => b.points_scored - a.points_scored);
                winnerId = sortedScores[0].player_id;
            }

            // Update match with winner and status
            const { error } = await supabase
                .from('matches')
                .update({
                    status: 'completed',
                    winner_id: winnerId,
                    completed_at: new Date().toISOString()
                })
                .eq('id', matchId);

            if (error) throw error;

            setMatch(prev => prev ? { ...prev, status: 'completed' } : null);

            // Show winner
            if (winnerId) {
                const winner = players.find(p => p.id === winnerId);
                alert(`Match completed! Winner: ${winner?.player_name || 'Unknown'}`);
            } else {
                alert('Match completed!');
            }
        } catch (error) {
            console.error('Error ending match:', error);
            alert('Failed to end match');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-gray-500">Loading match...</div>
            </div>
        );
    }

    if (error || !match) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-600 mb-4">{error || 'Match not found'}</div>
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
            case 'upcoming': return 'text-blue-600 bg-blue-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <div className="min-h-screen bg-white p-4 pb-20">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => window.history.back()}
                        className="flex items-center gap-2 text-gray-600 mb-4"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                                <span className="text-3xl">{sportIcons[match.sport]}</span>
                                {match.sport.charAt(0).toUpperCase() + match.sport.slice(1)} Match
                            </h1>
                            <p className="text-gray-600 mt-1">
                                {new Date(match.match_date).toLocaleDateString()} • {match.location || 'No location set'}
                            </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(match.status)}`}>
                            {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                        </div>
                    </div>
                </div>

                {/* Match Controls */}
                <div className="mb-6 flex gap-4">
                    {match.status === 'upcoming' && (
                        <button
                            onClick={startMatch}
                            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700"
                        >
                            Start Match
                        </button>
                    )}
                    {match.status === 'live' && (
                        <button
                            onClick={endMatch}
                            className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700"
                        >
                            End Match
                        </button>
                    )}
                </div>

                {/* Players */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Players</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        {players.map((player) => (
                            <div key={player.id} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-gray-900">{player.player_name}</h3>
                                        <p className="text-sm text-gray-600">Team: {player.team}</p>
                                    </div>
                                    {player.is_captain && (
                                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                            Captain
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sport-specific scoring */}
                {match.status === 'live' ? (
                    <div>
                        {match.sport === 'badminton' ? (
                            <BadmintonScoring matchId={match.id} players={players} />
                        ) : (
                            <div className="bg-gray-50 rounded-lg p-6 text-center">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Scoring</h3>
                                <p className="text-gray-600">Scoring interface for {match.sport} coming soon...</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Scoring</h3>
                        <p className="text-gray-600">
                            {match.status === 'upcoming'
                                ? 'Start the match to begin scoring'
                                : 'Match completed'
                            }
                        </p>
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
