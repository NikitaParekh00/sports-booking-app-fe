"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabaseClient";

interface Player {
    id: string;
    player_name: string;
    team: string;
}

interface BadmintonScore {
    id: string;
    player_id: string;
    sets_won: number;
    games_won: number;
    points_scored: number;
    service_errors: number;
}

interface BadmintonScoringProps {
    matchId: string;
    players: Player[];
}

export default function BadmintonScoring({ matchId, players }: BadmintonScoringProps) {
    const [scores, setScores] = useState<BadmintonScore[]>([]);
    // const [currentSet, setCurrentSet] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createClient();

    const initializeScores = useCallback(async () => {
        try {
            // Check if scores already exist
            const { data: existingScores } = await supabase
                .from('badminton_scores')
                .select('*')
                .eq('match_id', matchId);

            if (existingScores && existingScores.length > 0) {
                setScores(existingScores);
                return;
            }

            // Create initial scores for players
            const initialScores = players.map(player => ({
                match_id: matchId,
                player_id: player.id,
                sets_won: 0,
                games_won: 0,
                points_scored: 0,
                service_errors: 0,
            }));

            const { data: newScores, error } = await supabase
                .from('badminton_scores')
                .insert(initialScores)
                .select();

            if (error) throw error;
            setScores(newScores || []);
        } catch (error) {
            console.error('Error initializing scores:', error);
        }
    }, [matchId, players, supabase]);

    useEffect(() => {
        initializeScores();
    }, [initializeScores]);

    const updateScore = async (playerId: string, field: keyof BadmintonScore, value: number) => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('badminton_scores')
                .update({ [field]: value })
                .eq('match_id', matchId)
                .eq('player_id', playerId);

            if (error) throw error;

            setScores(prev => prev.map(score =>
                score.player_id === playerId
                    ? { ...score, [field]: value }
                    : score
            ));
        } catch (error) {
            console.error('Error updating score:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const addPoint = (playerId: string) => {
        const currentScore = scores.find(s => s.player_id === playerId);
        if (currentScore) {
            updateScore(playerId, 'points_scored', currentScore.points_scored + 1);
        }
    };

    const subtractPoint = (playerId: string) => {
        const currentScore = scores.find(s => s.player_id === playerId);
        if (currentScore && currentScore.points_scored > 0) {
            updateScore(playerId, 'points_scored', currentScore.points_scored - 1);
        }
    };

    const resetPoints = (playerId: string) => {
        updateScore(playerId, 'points_scored', 0);
    };

    const resetMatch = async () => {
        setIsLoading(true);
        try {
            // Reset all players' points to 0
            for (const player of players) {
                await updateScore(player.id, 'points_scored', 0);
            }
        } catch (error) {
            console.error('Error resetting match:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getPlayerScore = (playerId: string) => {
        return scores.find(s => s.player_id === playerId) || {
            sets_won: 0,
            games_won: 0,
            points_scored: 0,
            service_errors: 0,
        };
    };

    const player1 = players[0];
    const player2 = players[1];
    const player1Score = getPlayerScore(player1?.id || '');
    const player2Score = getPlayerScore(player2?.id || '');

    return (
        <div className="space-y-6">
            {/* Score Display */}
            <div className="grid grid-cols-2 gap-4">
                {/* Player 1 */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{player1?.player_name || 'Player 1'}</h3>

                    {/* Main Score */}
                    <div className="mb-6">
                        <div className="text-6xl font-bold text-red-600 mb-2">{player1Score.points_scored}</div>
                        <div className="text-sm text-gray-500">Points</div>
                    </div>

                    {/* Controls */}
                    <div className="space-y-3">
                        <div className="flex gap-2 justify-center">
                            <button
                                onClick={() => subtractPoint(player1?.id || '')}
                                disabled={isLoading || player1Score.points_scored === 0}
                                className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                            </button>
                            <button
                                onClick={() => addPoint(player1?.id || '')}
                                disabled={isLoading}
                                className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 disabled:opacity-50"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                        <button
                            onClick={() => resetPoints(player1?.id || '')}
                            disabled={isLoading}
                            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 font-medium"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {/* Player 2 */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">{player2?.player_name || 'Player 2'}</h3>

                    {/* Main Score */}
                    <div className="mb-6">
                        <div className="text-6xl font-bold text-red-600 mb-2">{player2Score.points_scored}</div>
                        <div className="text-sm text-gray-500">Points</div>
                    </div>

                    {/* Controls */}
                    <div className="space-y-3">
                        <div className="flex gap-2 justify-center">
                            <button
                                onClick={() => subtractPoint(player2?.id || '')}
                                disabled={isLoading || player2Score.points_scored === 0}
                                className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                            </button>
                            <button
                                onClick={() => addPoint(player2?.id || '')}
                                disabled={isLoading}
                                className="w-12 h-12 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 disabled:opacity-50"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                        <button
                            onClick={() => resetPoints(player2?.id || '')}
                            disabled={isLoading}
                            className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 font-medium"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Reset Match Button */}
            <div className="text-center">
                <button
                    onClick={resetMatch}
                    disabled={isLoading}
                    className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 disabled:opacity-50 font-medium"
                >
                    Reset Match
                </button>
            </div>
        </div>
    );
}
