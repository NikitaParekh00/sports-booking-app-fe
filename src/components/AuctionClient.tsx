"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomSheet from './BottomSheet';

interface Player {
    name: string;
    payment: 'Y' | 'N';
    gender: 'M' | 'F';
    category: string;
    runs: number;
    strikeRate: number;
    wickets: number;
    average: number;
    catch: number;
    ro: number;
    mvp: number;
}

interface Team {
    id: number;
    name: string;
    budget: number;
    players: Player[];
    categoryCount: {
        A: number;
        B: number;
        C: number;
    };
}

const initialPlayers: Player[] = [
    { name: 'Tushar Bohra', payment: 'N', gender: 'M', category: 'A', runs: 45, strikeRate: 150, wickets: 2, average: 11, catch: 0, ro: 1, mvp: 8.186 },
    { name: 'Amit Kasliwal', payment: 'Y', gender: 'M', category: 'A', runs: 9, strikeRate: 90, wickets: 4, average: 6, catch: 0, ro: 0, mvp: 5.768 },
    { name: 'Parv Kasliwal', payment: 'Y', gender: 'M', category: 'A', runs: 122, strikeRate: 321.05, wickets: 0, average: 0, catch: 3, ro: 0, mvp: 13.442 },
    { name: 'Vihaan Kasliwal', payment: 'Y', gender: 'M', category: 'A', runs: 42, strikeRate: 247.06, wickets: 3, average: 7.67, catch: 2, ro: 0, mvp: 8.466 },
    { name: 'Alok Kasliwal', payment: 'Y', gender: 'M', category: 'A', runs: 25, strikeRate: 131.58, wickets: 2, average: 9.5, catch: 0, ro: 1, mvp: 6.304 },
    { name: 'Ashish Gangwal', payment: 'N', gender: 'M', category: 'A', runs: 9, strikeRate: 60, wickets: 1, average: 25, catch: 1, ro: 0, mvp: 2.22 },
];

const TOTAL_AMOUNT = 111000;
const MINIMUM_BID = 5000;
const BID_INCREASE = 1000;
const TEAMS_COUNT = 8;
const PLAYERS_PER_TEAM = 10;

export default function AuctionClient() {
    const router = useRouter();
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [players, setPlayers] = useState<Player[]>(initialPlayers);
    const [teams, setTeams] = useState<Team[]>(() => {
        return Array.from({ length: TEAMS_COUNT }, (_, i) => ({
            id: i + 1,
            name: `Team ${i + 1}`,
            budget: TOTAL_AMOUNT,
            players: [],
            categoryCount: { A: 0, B: 0, C: 0 },
        }));
    });
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
    const [currentBid, setCurrentBid] = useState(MINIMUM_BID);
    const [auctionComplete, setAuctionComplete] = useState(false);
    const [isTeamsSheetOpen, setIsTeamsSheetOpen] = useState(false);

    const currentPlayer = players[currentPlayerIndex];
    const remainingPlayers = players.length - currentPlayerIndex;

    const handleBidIncrease = () => {
        setCurrentBid(prev => prev + BID_INCREASE);
    };

    const handleBidDecrease = () => {
        if (currentBid > MINIMUM_BID) {
            setCurrentBid(prev => prev - BID_INCREASE);
        }
    };

    const handleBuyPlayer = () => {
        if (!selectedTeamId) {
            alert('Please select a team');
            return;
        }

        const team = teams.find(t => t.id === selectedTeamId);
        if (!team) return;

        if (team.budget < currentBid) {
            alert(`Team ${team.name} doesn't have enough budget!`);
            return;
        }

        // Check if team has space
        if (team.players.length >= PLAYERS_PER_TEAM) {
            alert(`Team ${team.name} already has ${PLAYERS_PER_TEAM} players!`);
            return;
        }

        // Check category limit
        const categoryLimit = currentPlayer.category === 'A' ? 7 : currentPlayer.category === 'B' ? 2 : 1;
        if (team.categoryCount[currentPlayer.category as 'A' | 'B' | 'C'] >= categoryLimit) {
            alert(`Team ${team.name} already has maximum ${currentPlayer.category} category players!`);
            return;
        }

        // Update team
        const updatedTeams = teams.map(t => {
            if (t.id === selectedTeamId) {
                return {
                    ...t,
                    budget: t.budget - currentBid,
                    players: [...t.players, currentPlayer],
                    categoryCount: {
                        ...t.categoryCount,
                        [currentPlayer.category]: t.categoryCount[currentPlayer.category as 'A' | 'B' | 'C'] + 1,
                    },
                };
            }
            return t;
        });

        setTeams(updatedTeams);

        // Move to next player
        if (currentPlayerIndex < players.length - 1) {
            setCurrentPlayerIndex(prev => prev + 1);
            setCurrentBid(MINIMUM_BID);
            setSelectedTeamId(null);
        } else {
            setAuctionComplete(true);
        }
    };

    const handleSkip = () => {
        if (currentPlayerIndex < players.length - 1) {
            setCurrentPlayerIndex(prev => prev + 1);
            setCurrentBid(MINIMUM_BID);
            setSelectedTeamId(null);
        } else {
            setAuctionComplete(true);
        }
    };

    if (auctionComplete) {
        return (
            <div className="min-h-screen bg-gray-50 px-4 py-8">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-4xl font-bold text-center mb-8 text-gray-900">Auction Complete! 🎉</h1>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {teams.map(team => (
                            <div key={team.id} className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                    <h2 className="text-xl font-semibold text-gray-900">{team.name}</h2>
                                    <span className="text-sm font-medium text-gray-600">₹{team.budget.toLocaleString()}</span>
                                </div>
                                <div className="text-sm text-gray-600 mb-2">
                                    Players: {team.players.length}/{PLAYERS_PER_TEAM} |
                                    A: {team.categoryCount.A}/7 |
                                    B: {team.categoryCount.B}/2 |
                                    C: {team.categoryCount.C}/1
                                </div>
                                <div className="space-y-1">
                                    {team.players.map((player, idx) => (
                                        <div key={idx} className="text-sm text-gray-700 py-1 border-b border-gray-100 last:border-0">
                                            {player.name} ({player.category})
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-center mt-8">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="px-8 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => router.back()}
                        className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
                    >
                        ← Back
                    </button>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900">Auction</h1>
                    <button
                        onClick={() => setIsTeamsSheetOpen(true)}
                        className="md:hidden text-red-600 hover:text-red-700 font-medium text-sm"
                    >
                        View Teams
                    </button>
                    <div className="hidden md:block text-sm text-gray-600">
                        Player {currentPlayerIndex + 1} of {players.length}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Sidebar - Teams Overview (Desktop) */}
                    <div className="hidden lg:block lg:col-span-1">
                        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Team Dynamics</h2>

                            {/* Teams List */}
                            <div className="space-y-3">
                                {teams.map(team => {
                                    const totalSpent = TOTAL_AMOUNT - team.budget;

                                    return (
                                        <div key={team.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-semibold text-gray-900 text-sm">{team.name}</h3>
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        {team.players.length}/{PLAYERS_PER_TEAM} players
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-medium text-gray-600">Remaining</div>
                                                    <div className="text-sm font-bold text-gray-900">₹{team.budget.toLocaleString()}</div>
                                                </div>
                                            </div>

                                            {/* Budget Progress */}
                                            <div className="mb-2">
                                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                    <div
                                                        className="bg-red-600 h-1.5 rounded-full transition-all"
                                                        style={{ width: `${Math.min((totalSpent / TOTAL_AMOUNT) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            {/* Category Distribution */}
                                            <div className="flex gap-1.5">
                                                <div className={`flex-1 rounded p-1.5 text-center ${team.categoryCount.A >= 7 ? 'bg-red-100' : 'bg-white'}`}>
                                                    <div className="text-xs text-gray-600">A</div>
                                                    <div className="text-xs font-semibold text-gray-900">{team.categoryCount.A}/7</div>
                                                </div>
                                                <div className={`flex-1 rounded p-1.5 text-center ${team.categoryCount.B >= 2 ? 'bg-red-100' : 'bg-white'}`}>
                                                    <div className="text-xs text-gray-600">B</div>
                                                    <div className="text-xs font-semibold text-gray-900">{team.categoryCount.B}/2</div>
                                                </div>
                                                <div className={`flex-1 rounded p-1.5 text-center ${team.categoryCount.C >= 1 ? 'bg-red-100' : 'bg-white'}`}>
                                                    <div className="text-xs text-gray-600">C</div>
                                                    <div className="text-xs font-semibold text-gray-900">{team.categoryCount.C}/1</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-6 pb-32 md:pb-6">
                        {/* Progress */}
                        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span>Player {currentPlayerIndex + 1} of {players.length}</span>
                                <span>{remainingPlayers} remaining</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className="bg-red-600 h-3 rounded-full transition-all duration-300"
                                    style={{ width: `${((currentPlayerIndex + 1) / players.length) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Current Player Card */}
                        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 md:p-8 shadow-sm">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{currentPlayer.name}</h2>
                                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                                        <span className="bg-gray-100 px-3 py-1.5 rounded-lg">{currentPlayer.gender === 'M' ? 'Male' : 'Female'}</span>
                                        <span className="bg-gray-100 px-3 py-1.5 rounded-lg">Category {currentPlayer.category}</span>
                                        <span className={`px-3 py-1.5 rounded-lg ${currentPlayer.payment === 'Y' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {currentPlayer.payment === 'Y' ? 'Paid' : 'Unpaid'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="text-xs text-gray-500 mb-1">Runs</div>
                                    <div className="text-2xl font-semibold text-gray-900">{currentPlayer.runs}</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="text-xs text-gray-500 mb-1">Strike Rate</div>
                                    <div className="text-2xl font-semibold text-gray-900">{currentPlayer.strikeRate}</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="text-xs text-gray-500 mb-1">Wickets</div>
                                    <div className="text-2xl font-semibold text-gray-900">{currentPlayer.wickets}</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="text-xs text-gray-500 mb-1">Average</div>
                                    <div className="text-2xl font-semibold text-gray-900">{currentPlayer.average}</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="text-xs text-gray-500 mb-1">Catches</div>
                                    <div className="text-2xl font-semibold text-gray-900">{currentPlayer.catch}</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <div className="text-xs text-gray-500 mb-1">R/O</div>
                                    <div className="text-2xl font-semibold text-gray-900">{currentPlayer.ro}</div>
                                </div>
                            </div>

                            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                                <div className="text-sm text-red-600 mb-1 font-medium">MVP Score</div>
                                <div className="text-3xl font-bold text-red-700">{currentPlayer.mvp}</div>
                            </div>
                        </div>

                        {/* Bid Amount */}
                        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
                            <div className="text-lg font-semibold text-gray-900 mb-4">Bid Amount</div>
                            <div className="flex items-center justify-center gap-6 mb-4">
                                <button
                                    onClick={handleBidDecrease}
                                    disabled={currentBid <= MINIMUM_BID}
                                    className="w-12 h-12 rounded-lg border-2 border-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-2xl font-semibold"
                                >
                                    −
                                </button>
                                <div className="text-5xl font-bold text-gray-900">₹{currentBid.toLocaleString()}</div>
                                <button
                                    onClick={handleBidIncrease}
                                    className="w-12 h-12 rounded-lg border-2 border-gray-300 flex items-center justify-center hover:bg-gray-50 text-2xl font-semibold"
                                >
                                    +
                                </button>
                            </div>
                            <div className="text-sm text-gray-500 text-center">
                                Min: ₹{MINIMUM_BID.toLocaleString()} | Increase: ₹{BID_INCREASE.toLocaleString()}
                            </div>
                        </div>

                        {/* Team Selection */}
                        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
                            <div className="text-lg font-semibold text-gray-900 mb-4">Select Team</div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {teams.map(team => {
                                    const canAfford = team.budget >= currentBid;
                                    const hasSpace = team.players.length < PLAYERS_PER_TEAM;
                                    const categoryLimit = currentPlayer.category === 'A' ? 7 : currentPlayer.category === 'B' ? 2 : 1;
                                    const canAddCategory = team.categoryCount[currentPlayer.category as 'A' | 'B' | 'C'] < categoryLimit;
                                    const isDisabled = !canAfford || !hasSpace || !canAddCategory;

                                    return (
                                        <button
                                            key={team.id}
                                            onClick={() => !isDisabled && setSelectedTeamId(team.id)}
                                            disabled={isDisabled}
                                            className={`p-4 rounded-lg border-2 text-left transition-all ${selectedTeamId === team.id
                                                ? 'border-red-600 bg-red-50 shadow-md'
                                                : isDisabled
                                                    ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                                                }`}
                                        >
                                            <div className="font-semibold text-gray-900 mb-2">{team.name}</div>
                                            <div className="text-sm text-gray-600 mb-1">
                                                Budget: ₹{team.budget.toLocaleString()}
                                            </div>
                                            <div className="text-sm text-gray-600 mb-2">
                                                Players: {team.players.length}/{PLAYERS_PER_TEAM}
                                            </div>
                                            {!canAfford && (
                                                <div className="text-xs text-red-600 mt-1">Insufficient budget</div>
                                            )}
                                            {!hasSpace && (
                                                <div className="text-xs text-red-600 mt-1">Team full</div>
                                            )}
                                            {!canAddCategory && (
                                                <div className="text-xs text-red-600 mt-1">Category limit reached</div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:static md:border-0 md:bg-transparent md:p-0 flex gap-4 md:gap-6 z-10 md:z-auto md:left-auto md:right-auto">
                            <button
                                onClick={handleSkip}
                                className="flex-1 py-3 md:py-4 px-4 md:px-6 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-base md:text-lg"
                            >
                                Skip Player
                            </button>
                            <button
                                onClick={handleBuyPlayer}
                                disabled={!selectedTeamId}
                                className="flex-1 py-3 md:py-4 px-4 md:px-6 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-lg"
                            >
                                Buy Player
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Teams Overview Bottom Sheet */}
            <BottomSheet
                isOpen={isTeamsSheetOpen}
                onClose={() => setIsTeamsSheetOpen(false)}
                title="Team Dynamics"
            >
                <div className="space-y-4">
                    {/* Teams List */}
                    <div className="space-y-3">
                        {teams.map(team => {
                            const totalSpent = TOTAL_AMOUNT - team.budget;
                            const avgPlayerCost = team.players.length > 0 ? totalSpent / team.players.length : 0;

                            return (
                                <div key={team.id} className="bg-white border-2 border-gray-200 rounded-xl p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {team.players.length} / {PLAYERS_PER_TEAM} players
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium text-gray-600">Remaining</div>
                                            <div className="text-lg font-bold text-gray-900">₹{team.budget.toLocaleString()}</div>
                                        </div>
                                    </div>

                                    {/* Budget Progress */}
                                    <div className="mb-3">
                                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                                            <span>Spent: ₹{totalSpent.toLocaleString()}</span>
                                            <span>{((totalSpent / TOTAL_AMOUNT) * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-red-600 h-2 rounded-full transition-all"
                                                style={{ width: `${(totalSpent / TOTAL_AMOUNT) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Category Distribution */}
                                    <div className="flex gap-2 mb-3">
                                        <div className={`flex-1 rounded-lg p-2 text-center ${team.categoryCount.A >= 7 ? 'bg-red-100' : 'bg-gray-100'}`}>
                                            <div className="text-xs text-gray-600">A</div>
                                            <div className="text-sm font-semibold text-gray-900">
                                                {team.categoryCount.A}/7
                                            </div>
                                        </div>
                                        <div className={`flex-1 rounded-lg p-2 text-center ${team.categoryCount.B >= 2 ? 'bg-red-100' : 'bg-gray-100'}`}>
                                            <div className="text-xs text-gray-600">B</div>
                                            <div className="text-sm font-semibold text-gray-900">
                                                {team.categoryCount.B}/2
                                            </div>
                                        </div>
                                        <div className={`flex-1 rounded-lg p-2 text-center ${team.categoryCount.C >= 1 ? 'bg-red-100' : 'bg-gray-100'}`}>
                                            <div className="text-xs text-gray-600">C</div>
                                            <div className="text-sm font-semibold text-gray-900">
                                                {team.categoryCount.C}/1
                                            </div>
                                        </div>
                                    </div>

                                    {/* Players List */}
                                    {team.players.length > 0 ? (
                                        <div className="border-t border-gray-200 pt-3">
                                            <div className="text-xs font-semibold text-gray-600 mb-2">Players:</div>
                                            <div className="space-y-1 max-h-32 overflow-y-auto">
                                                {team.players.map((player, idx) => (
                                                    <div key={idx} className="flex justify-between items-center text-sm py-1">
                                                        <span className="text-gray-700">
                                                            {player.name}
                                                            <span className="text-gray-500 ml-1">({player.category})</span>
                                                        </span>
                                                        <span className="text-gray-500 text-xs">MVP: {player.mvp}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {avgPlayerCost > 0 && (
                                                <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                                                    Avg. Cost: ₹{Math.round(avgPlayerCost).toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-400 text-center py-2 border-t border-gray-200 pt-3">
                                            No players yet
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </BottomSheet>
        </div>
    );
}

