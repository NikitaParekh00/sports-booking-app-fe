"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabaseClient';
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

// Team logos mapping
const TEAM_LOGOS: { [key: number]: string } = {
    1: '/team-logos/team1.jpeg',
    2: '/team-logos/team2.jpeg',
    3: '/team-logos/team3.jpeg',
    4: '/team-logos/team4.jpeg',
    5: '/team-logos/team5.jpeg',
    6: '/team-logos/team6.jpeg',
    7: '/team-logos/team7.jpeg',
    8: '/team-logos/team8.jpeg',
};

// Helper function to get team logo
const getTeamLogo = (teamId: number): string => {
    return TEAM_LOGOS[teamId] || '/logo.jpeg'; // Fallback to main logo if team logo not found
};

// Database types for auction
interface DbTeam {
    id: string;
    team_number: number;
    name: string;
    budget: number;
    category_a_count: number;
    category_b_count: number;
    category_c_count: number;
}

interface DbPlayer {
    team_id: string;
    player_name: string;
    payment_status: string;
    gender: string;
    player_category: string;
    runs: number;
    strike_rate: number;
    wickets: number;
    average: number;
    catch_count: number;
    ro: number;
    mvp: number;
}

interface DbPlayerPool {
    id: string;
    session_id: string;
    player_order: number;
    name: string;
    payment_status: string;
    gender: string;
    category: string;
    runs: number;
    strike_rate: number;
    wickets: number;
    average: number;
    catch_count: number;
    ro: number;
    mvp: number;
}

// Configure the allowed user for auction access
// Use the EXACT format as stored in database: +91-XXXXXXXXXX
const ALLOWED_AUCTION_USER: {
    user_id?: string | null;
    phone?: string | null;
    email?: string | null;
} = {
    // Set one of these to restrict access:
    // user_id: 'your-user-id-here',
    // phone: '+91-7506256356' (use exact format from database),
    // email: 'your-email@example.com',
    // Or leave all as undefined/null to allow all logged-in users
    phone: '+91-7506256356', // Use exact format: +91-XXXXXXXXXX
};

export default function AuctionClient() {
    const router = useRouter();
    const supabase = createClient();
    const [authLoading, setAuthLoading] = useState(true);
    const [canEdit, setCanEdit] = useState(false); // Can this user edit the auction?
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [players, setPlayers] = useState<Player[]>([]);
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
    const [loadingState, setLoadingState] = useState(true);

    // Check authentication and edit permissions
    useEffect(() => {
        const checkAccess = async () => {
            try {
                // Get user from localStorage
                const storedUser = localStorage.getItem('sf:user');

                if (!storedUser) {
                    // No user logged in - redirect to login
                    alert('Please log in to access the auction page.');
                    router.push('/login');
                    return;
                }

                const userData = JSON.parse(storedUser);

                // Get user profile to check phone/email if needed
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('user_id', userData.user_id)
                    .single();

                // Check if user can edit (matches allowed user)
                let canUserEdit = false;

                if (!ALLOWED_AUCTION_USER.phone && !ALLOWED_AUCTION_USER.user_id && !ALLOWED_AUCTION_USER.email) {
                    // No restriction - all users can edit
                    canUserEdit = true;
                } else {
                    if (ALLOWED_AUCTION_USER.user_id && userData.user_id === ALLOWED_AUCTION_USER.user_id) {
                        canUserEdit = true;
                    } else if (ALLOWED_AUCTION_USER.phone && profile?.phone === ALLOWED_AUCTION_USER.phone) {
                        // Simple exact match - phone must be in format: +91-XXXXXXXXXX
                        canUserEdit = true;
                    } else if (ALLOWED_AUCTION_USER.email && (userData.email === ALLOWED_AUCTION_USER.email || profile?.email === ALLOWED_AUCTION_USER.email)) {
                        canUserEdit = true;
                    }
                }

                setCanEdit(canUserEdit);
            } catch (error) {
                console.error('Error checking access:', error);
                setCanEdit(false);
            } finally {
                setAuthLoading(false);
            }
        };

        checkAccess();
    }, [router, supabase]);

    // Load auction state from database
    useEffect(() => {
        const loadAuctionState = async () => {
            try {
                setLoadingState(true);

                // Get or create active auction session
                let finalSession = null;

                // Try to get existing session
                const { data: session, error: sessionError } = await supabase
                    .from('auction_sessions')
                    .select('*')
                    .eq('is_complete', false)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (session) {
                    finalSession = session;
                } else if (sessionError && sessionError.code !== 'PGRST116') {
                    // Error other than "no rows" - might be table doesn't exist
                    console.error('Error fetching session:', sessionError);
                    throw new Error(`Database error: ${sessionError.message}. Please run the auction_schema.sql script first.`);
                } else {
                    // No active session, create one
                    const { data: newSession, error: createError } = await supabase
                        .from('auction_sessions')
                        .insert({
                            session_name: 'Main Auction',
                            current_player_index: 0,
                            is_complete: false
                        })
                        .select()
                        .single();

                    if (createError) {
                        console.error('Error creating session:', createError);
                        throw new Error(`Failed to create session: ${createError.message}. Please ensure auction tables exist.`);
                    }

                    if (!newSession) {
                        throw new Error('Session created but returned null');
                    }

                    finalSession = newSession;

                    // Create initial teams
                    const teamsData = Array.from({ length: TEAMS_COUNT }, (_, i) => ({
                        session_id: finalSession!.id,
                        team_number: i + 1,
                        name: `Team ${i + 1}`,
                        budget: TOTAL_AMOUNT,
                        category_a_count: 0,
                        category_b_count: 0,
                        category_c_count: 0
                    }));

                    const { error: teamsError } = await supabase.from('auction_teams').insert(teamsData);
                    if (teamsError) {
                        console.error('Error creating teams:', teamsError);
                        throw new Error(`Failed to create teams: ${teamsError.message}`);
                    }

                    // Create initial player pool if session was just created
                    const playerPoolData = initialPlayers.map((player, index) => ({
                        session_id: finalSession!.id,
                        player_order: index,
                        name: player.name,
                        payment_status: player.payment,
                        gender: player.gender,
                        category: player.category,
                        runs: player.runs,
                        strike_rate: player.strikeRate,
                        wickets: player.wickets,
                        average: player.average,
                        catch_count: player.catch,
                        ro: player.ro,
                        mvp: player.mvp
                    }));

                    const { error: poolError } = await supabase.from('auction_player_pool').insert(playerPoolData);
                    if (poolError) {
                        console.error('Error creating player pool:', poolError);
                        throw new Error(`Failed to create player pool: ${poolError.message}`);
                    }
                }

                if (!finalSession) {
                    throw new Error('Failed to get or create session');
                }

                setSessionId(finalSession.id);
                setCurrentPlayerIndex(finalSession.current_player_index);
                setAuctionComplete(finalSession.is_complete);

                // Load player pool from database
                const { data: playerPoolData, error: poolError } = await supabase
                    .from('auction_player_pool')
                    .select('*')
                    .eq('session_id', finalSession.id)
                    .order('player_order', { ascending: true });

                if (poolError) throw poolError;

                // Map database player pool to component players
                const mappedPlayers: Player[] = (playerPoolData || []).map((p: DbPlayerPool) => ({
                    name: p.name,
                    payment: p.payment_status as 'Y' | 'N',
                    gender: p.gender as 'M' | 'F',
                    category: p.category,
                    runs: p.runs,
                    strikeRate: p.strike_rate,
                    wickets: p.wickets,
                    average: p.average,
                    catch: p.catch_count,
                    ro: p.ro,
                    mvp: p.mvp
                }));

                setPlayers(mappedPlayers);

                // Load teams
                const { data: teamsData, error: teamsError } = await supabase
                    .from('auction_teams')
                    .select('*')
                    .eq('session_id', finalSession.id)
                    .order('team_number', { ascending: true });

                if (teamsError) throw teamsError;

                // Load players for each team
                const { data: playersData, error: playersError } = await supabase
                    .from('auction_players')
                    .select('*')
                    .eq('session_id', finalSession.id);

                if (playersError) throw playersError;

                // Map database teams to component teams
                const mappedTeams: Team[] = (teamsData || []).map((team: DbTeam) => {
                    const teamPlayers = (playersData || [])
                        .filter((p: DbPlayer) => p.team_id === team.id)
                        .map((p: DbPlayer) => ({
                            name: p.player_name,
                            payment: p.payment_status as 'Y' | 'N',
                            gender: p.gender as 'M' | 'F',
                            category: p.player_category,
                            runs: p.runs,
                            strikeRate: p.strike_rate,
                            wickets: p.wickets,
                            average: p.average,
                            catch: p.catch_count,
                            ro: p.ro,
                            mvp: p.mvp
                        }));

                    return {
                        id: team.team_number,
                        name: team.name,
                        budget: Number(team.budget), // Ensure budget is a number
                        players: teamPlayers,
                        categoryCount: {
                            A: team.category_a_count,
                            B: team.category_b_count,
                            C: team.category_c_count
                        }
                    };
                });

                setTeams(mappedTeams);
            } catch (error) {
                console.error('Error loading auction state:', error);
            } finally {
                setLoadingState(false);
            }
        };

        if (!authLoading) {
            loadAuctionState();
        }
    }, [authLoading, supabase]);

    // Helper function to reload teams (accessible throughout component)
    const reloadTeams = useCallback(async () => {
        if (!sessionId) return;

        const { data: teamsData } = await supabase
            .from('auction_teams')
            .select('*')
            .eq('session_id', sessionId)
            .order('team_number', { ascending: true });

        const { data: playersData } = await supabase
            .from('auction_players')
            .select('*')
            .eq('session_id', sessionId);

        if (teamsData && playersData) {
            const mappedTeams: Team[] = teamsData.map((team: DbTeam) => {
                const teamPlayers = playersData
                    .filter((p: DbPlayer) => p.team_id === team.id)
                    .map((p: DbPlayer) => ({
                        name: p.player_name,
                        payment: p.payment_status as 'Y' | 'N',
                        gender: p.gender as 'M' | 'F',
                        category: p.player_category,
                        runs: p.runs,
                        strikeRate: p.strike_rate,
                        wickets: p.wickets,
                        average: p.average,
                        catch: p.catch_count,
                        ro: p.ro,
                        mvp: p.mvp
                    }));

                return {
                    id: team.team_number,
                    name: team.name,
                    budget: Number(team.budget), // Ensure budget is a number
                    players: teamPlayers,
                    categoryCount: {
                        A: team.category_a_count,
                        B: team.category_b_count,
                        C: team.category_c_count
                    }
                };
            });

            setTeams(mappedTeams);
        }
    }, [sessionId, supabase]);

    // Real-time subscription for auction updates
    useEffect(() => {
        if (!sessionId) return;

        // Subscribe to session changes
        const sessionChannel = supabase
            .channel('auction-session-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'auction_sessions',
                filter: `id=eq.${sessionId}`
            }, (payload) => {
                if (payload.new) {
                    const session = payload.new as { current_player_index: number; is_complete: boolean };
                    setCurrentPlayerIndex(session.current_player_index);
                    setAuctionComplete(session.is_complete);
                }
            })
            .subscribe();

        // Subscribe to team changes
        const teamsChannel = supabase
            .channel('auction-teams-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'auction_teams',
                filter: `session_id=eq.${sessionId}`
            }, async (payload) => {
                console.log('Team changed:', payload);
                await reloadTeams();
            })
            .subscribe();

        // Subscribe to player changes (bought players)
        const playersChannel = supabase
            .channel('auction-players-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'auction_players',
                filter: `session_id=eq.${sessionId}`
            }, async (payload) => {
                console.log('Player changed:', payload);
                // Reload teams when players change (this also reloads team budgets)
                await reloadTeams();
            })
            .subscribe();

        // Subscribe to player pool changes (available players list)
        const playerPoolChannel = supabase
            .channel('auction-player-pool-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'auction_player_pool',
                filter: `session_id=eq.${sessionId}`
            }, async () => {
                // Reload player pool when it changes
                const { data: playerPoolData } = await supabase
                    .from('auction_player_pool')
                    .select('*')
                    .eq('session_id', sessionId)
                    .order('player_order', { ascending: true });

                if (playerPoolData) {
                    const mappedPlayers: Player[] = playerPoolData.map((p: DbPlayerPool) => ({
                        name: p.name,
                        payment: p.payment_status as 'Y' | 'N',
                        gender: p.gender as 'M' | 'F',
                        category: p.category,
                        runs: p.runs,
                        strikeRate: p.strike_rate,
                        wickets: p.wickets,
                        average: p.average,
                        catch: p.catch_count,
                        ro: p.ro,
                        mvp: p.mvp
                    }));

                    setPlayers(mappedPlayers);
                }
            })
            .subscribe();

        return () => {
            sessionChannel.unsubscribe();
            teamsChannel.unsubscribe();
            playersChannel.unsubscribe();
            playerPoolChannel.unsubscribe();
        };
    }, [sessionId, supabase, reloadTeams]);

    const currentPlayer = players[currentPlayerIndex] || null;
    const remainingPlayers = players.length > 0 ? players.length - currentPlayerIndex : 0;

    const handleBidIncrease = () => {
        setCurrentBid(prev => prev + BID_INCREASE);
    };

    const handleBidDecrease = () => {
        if (currentBid > MINIMUM_BID) {
            setCurrentBid(prev => prev - BID_INCREASE);
        }
    };

    const handleBuyPlayer = async () => {
        if (!canEdit) {
            alert('You do not have permission to edit the auction.');
            return;
        }

        if (!sessionId) {
            alert('Auction session not loaded. Please refresh the page.');
            return;
        }

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

        try {
            // Get team UUID from database
            const { data: dbTeam } = await supabase
                .from('auction_teams')
                .select('id')
                .eq('session_id', sessionId)
                .eq('team_number', selectedTeamId)
                .single();

            if (!dbTeam) throw new Error('Team not found');

            // Insert player into database
            await supabase.from('auction_players').insert({
                session_id: sessionId,
                team_id: dbTeam.id,
                player_name: currentPlayer.name,
                player_category: currentPlayer.category,
                bid_amount: currentBid,
                payment_status: currentPlayer.payment,
                gender: currentPlayer.gender,
                runs: currentPlayer.runs,
                strike_rate: currentPlayer.strikeRate,
                wickets: currentPlayer.wickets,
                average: currentPlayer.average,
                catch_count: currentPlayer.catch,
                ro: currentPlayer.ro,
                mvp: currentPlayer.mvp
            });

            // Update team budget
            const newBudget = Number(team.budget) - Number(currentBid);

            const { error: updateError } = await supabase
                .from('auction_teams')
                .update({
                    budget: newBudget
                })
                .eq('id', dbTeam.id);

            if (updateError) {
                console.error('Error updating team budget:', updateError);
                throw updateError;
            }

            // Manually reload teams to ensure UI updates immediately
            await reloadTeams();

            // Move to next player
            const nextIndex = currentPlayerIndex < players.length - 1 ? currentPlayerIndex + 1 : currentPlayerIndex;
            const isComplete = nextIndex >= players.length - 1;

            await supabase
                .from('auction_sessions')
                .update({
                    current_player_index: nextIndex,
                    is_complete: isComplete
                })
                .eq('id', sessionId);

            // Reset UI state
            setCurrentBid(MINIMUM_BID);
            setSelectedTeamId(null);
        } catch (error) {
            console.error('Error buying player:', error);
            alert('Failed to save auction state. Please try again.');
        }
    };

    const handleSkip = async () => {
        if (!canEdit) {
            alert('You do not have permission to edit the auction.');
            return;
        }

        if (!sessionId) {
            alert('Auction session not loaded. Please refresh the page.');
            return;
        }

        try {
            // Move to next player
            const nextIndex = currentPlayerIndex < players.length - 1 ? currentPlayerIndex + 1 : currentPlayerIndex;
            const isComplete = nextIndex >= players.length - 1;

            await supabase
                .from('auction_sessions')
                .update({
                    current_player_index: nextIndex,
                    is_complete: isComplete
                })
                .eq('id', sessionId);

            // Reset UI state
            setCurrentBid(MINIMUM_BID);
            setSelectedTeamId(null);
        } catch (error) {
            console.error('Error skipping player:', error);
            alert('Failed to save auction state. Please try again.');
        }
    };

    // Show loading state
    if (authLoading || loadingState || !currentPlayer || players.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <div className="text-gray-600">
                        {authLoading ? 'Checking access...' : loadingState ? 'Loading auction...' : 'Loading players...'}
                    </div>
                </div>
            </div>
        );
    }

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
                                                <div className="flex items-center gap-2">
                                                    <Image
                                                        src={getTeamLogo(team.id)}
                                                        alt={`${team.name} logo`}
                                                        width={32}
                                                        height={32}
                                                        className="object-contain flex-shrink-0"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-semibold text-gray-900 text-sm break-normal leading-tight">{team.name}</h3>
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            {team.players.length}/{PLAYERS_PER_TEAM} players
                                                        </div>
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
                                            <div className="flex gap-1.5 mb-2">
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

                                            {/* Players List */}
                                            {team.players.length > 0 ? (
                                                <div className="border-t border-gray-200 pt-2 mt-2">
                                                    <div className="text-xs font-semibold text-gray-600 mb-1.5">Players:</div>
                                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                                        {team.players.map((player, idx) => (
                                                            <div key={idx} className="flex justify-between items-center text-xs py-0.5">
                                                                <span className="text-gray-700">
                                                                    {player.name}
                                                                    <span className="text-gray-500 ml-1">({player.category})</span>
                                                                </span>
                                                                <span className="text-gray-500 text-xs">MVP: {player.mvp}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-xs text-gray-400 text-center py-1 border-t border-gray-200 mt-2 pt-2">
                                                    No players yet
                                                </div>
                                            )}
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
                                <div className="flex-1">
                                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{currentPlayer.name}</h2>
                                    <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                                        <span className="bg-gray-100 px-3 py-1.5 rounded-lg">{currentPlayer.gender === 'M' ? 'Male' : 'Female'}</span>
                                        <span className="bg-gray-100 px-3 py-1.5 rounded-lg">Category {currentPlayer.category}</span>
                                    </div>
                                </div>
                                <Image
                                    src="/logo.jpeg"
                                    alt="Logo"
                                    width={180}
                                    height={80}
                                    className="object-contain w-16 h-16 md:w-[180px] md:h-[80px]"
                                />
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
                            {!canEdit && (
                                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 text-center">
                                    View-only mode - You can watch the auction live
                                </div>
                            )}
                            <div className="flex items-center justify-center gap-6 mb-4">
                                <button
                                    onClick={handleBidDecrease}
                                    disabled={!canEdit || currentBid <= MINIMUM_BID}
                                    className="w-12 h-12 rounded-lg border-2 border-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-2xl font-semibold"
                                >
                                    −
                                </button>
                                <div className="text-5xl font-bold text-gray-900">₹{currentBid.toLocaleString()}</div>
                                <button
                                    onClick={handleBidIncrease}
                                    disabled={!canEdit}
                                    className="w-12 h-12 rounded-lg border-2 border-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-2xl font-semibold"
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
                                    const isDisabled = !canAfford || !hasSpace;

                                    const isViewOnly = !canEdit;
                                    const finalDisabled = isDisabled || isViewOnly;

                                    return (
                                        <button
                                            key={team.id}
                                            onClick={() => !finalDisabled && setSelectedTeamId(team.id)}
                                            disabled={finalDisabled}
                                            className={`p-4 rounded-lg border-2 text-left transition-all ${selectedTeamId === team.id
                                                ? 'border-red-600 bg-red-50 shadow-md'
                                                : finalDisabled
                                                    ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                                                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 mb-2">
                                                <Image
                                                    src={getTeamLogo(team.id)}
                                                    alt={`${team.name} logo`}
                                                    width={40}
                                                    height={40}
                                                    className="object-contain flex-shrink-0"
                                                />
                                                <div className="font-semibold text-gray-900 text-sm md:text-base break-normal min-w-0 flex-1 leading-tight">{team.name}</div>
                                            </div>
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
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 md:static md:border-0 md:bg-transparent md:p-0 flex gap-4 md:gap-6 z-10 md:z-auto md:left-auto md:right-auto">
                            <button
                                onClick={handleSkip}
                                disabled={!canEdit}
                                className="flex-1 py-3 md:py-4 px-4 md:px-6 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-lg"
                            >
                                Skip Player
                            </button>
                            <button
                                onClick={handleBuyPlayer}
                                disabled={!canEdit || !selectedTeamId}
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
                                        <div className="flex items-center gap-3">
                                            <Image
                                                src={getTeamLogo(team.id)}
                                                alt={`${team.name} logo`}
                                                width={40}
                                                height={40}
                                                className="object-contain flex-shrink-0"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-base md:text-lg font-semibold text-gray-900 break-normal leading-tight">{team.name}</h3>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {team.players.length} / {PLAYERS_PER_TEAM} players
                                                </div>
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

