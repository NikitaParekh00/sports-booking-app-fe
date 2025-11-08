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
    bidAmount?: number; // Optional for players in team (bought players have bid amount)
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
    ownerName?: string;
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
    owner_name?: string;
}

interface DbPlayer {
    team_id: string;
    player_name: string;
    payment_status: string;
    gender: string;
    player_category: string;
    bid_amount: number;
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
            ownerName: undefined,
        }));
    });
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
    const [currentBid, setCurrentBid] = useState(MINIMUM_BID);
    const [auctionComplete, setAuctionComplete] = useState(false);
    const [isTeamsSheetOpen, setIsTeamsSheetOpen] = useState(false);
    const [isSkippedPlayersSheetOpen, setIsSkippedPlayersSheetOpen] = useState(false);
    const [loadingState, setLoadingState] = useState(true);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState<{ playerName: string; teamName: string; amount: number } | null>(null);
    const [skippedPlayers, setSkippedPlayers] = useState<Player[]>([]);
    const [boughtPlayerNames, setBoughtPlayerNames] = useState<Set<string>>(new Set());

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

                // Try to get most recent session (including completed ones)
                const { data: session, error: sessionError } = await supabase
                    .from('auction_sessions')
                    .select('*')
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
                    // No session exists, create one
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
                            mvp: p.mvp,
                            bidAmount: p.bid_amount
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
                        },
                        ownerName: team.owner_name || undefined
                    };
                });

                setTeams(mappedTeams);

                // Track bought player names
                const boughtNames = new Set(
                    (playersData || []).map((p: DbPlayer) => p.player_name)
                );
                setBoughtPlayerNames(boughtNames);

                // Calculate skipped players (players in pool that were never bought)
                if (finalSession.is_complete && mappedPlayers.length > 0) {
                    const skipped = mappedPlayers.filter(
                        player => !boughtNames.has(player.name)
                    );
                    setSkippedPlayers(skipped);
                } else {
                    setSkippedPlayers([]);
                }
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
                        mvp: p.mvp,
                        bidAmount: p.bid_amount
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

            // Update bought player names
            const boughtNames = new Set(
                playersData.map((p: DbPlayer) => p.player_name)
            );
            setBoughtPlayerNames(boughtNames);
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

    // Get current skipped players (players that have been processed but not bought)
    const getCurrentSkippedPlayers = useCallback(() => {
        // Players that have been processed (index < currentPlayerIndex) but not bought
        return players
            .slice(0, currentPlayerIndex)
            .filter(player => !boughtPlayerNames.has(player.name));
    }, [players, currentPlayerIndex, boughtPlayerNames]);

    // Get card styling based on player category
    const getPlayerCardStyle = (category: string) => {
        const categoryLower = category.toLowerCase();
        if (categoryLower.includes('super marquee')) {
            // Rich gold styling for Super Marquee
            return {
                bg: 'bg-gradient-to-br from-yellow-100 via-amber-100 to-yellow-200',
                border: 'border-4 border-amber-500',
                shadow: 'shadow-2xl shadow-amber-400/60'
            };
        } else if (categoryLower.includes('marquee') && !categoryLower.includes('super') && !categoryLower.includes('non')) {
            // Blue styling for Marquee (but not Super Marquee or Non Marquee)
            return {
                bg: 'bg-gradient-to-br from-blue-100 via-blue-200 to-blue-300',
                border: 'border-4 border-blue-500',
                shadow: 'shadow-2xl shadow-blue-500/50'
            };
        } else {
            // Default styling for others (Non Marquee, etc.)
            return {
                bg: 'bg-white',
                border: 'border-2 border-gray-200',
                shadow: 'shadow-sm'
            };
        }
    };

    // Get category tag styling
    const getCategoryTagStyle = (category: string) => {
        const categoryLower = category.toLowerCase();
        if (categoryLower.includes('marquee') && !categoryLower.includes('super') && !categoryLower.includes('non')) {
            // Blue styling for Marquee category tag
            return 'bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 text-blue-900 border-2 border-blue-500 shadow-lg font-semibold';
        } else if (categoryLower.includes('super marquee')) {
            // Rich gold styling for Super Marquee category tag
            return 'bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-300 text-amber-900 border-2 border-amber-500 shadow-lg font-semibold';
        } else {
            return 'bg-gray-100 text-gray-600';
        }
    };

    const cardStyle = currentPlayer ? getPlayerCardStyle(currentPlayer.category) : { bg: 'bg-white', border: 'border-2 border-gray-200', shadow: 'shadow-sm' };

    // Get minimum bid based on player category
    const getMinimumBid = (category: string) => {
        const categoryLower = category.toLowerCase();
        if (categoryLower.includes('super marquee')) {
            return 10000; // Super Marquee: ₹10,000
        } else if (categoryLower.includes('marquee') && !categoryLower.includes('super') && !categoryLower.includes('non')) {
            return 5000; // Marquee: ₹5,000
        } else {
            return 2000; // Others (Non Marquee, etc.): ₹2,000
        }
    };

    const currentMinimumBid = currentPlayer ? getMinimumBid(currentPlayer.category) : MINIMUM_BID;

    // Update bid when player changes
    useEffect(() => {
        if (currentPlayer) {
            const newMinimum = getMinimumBid(currentPlayer.category);
            setCurrentBid(newMinimum);
        }
    }, [currentPlayerIndex, currentPlayer]);

    const handleBidIncrease = () => {
        setCurrentBid(prev => prev + BID_INCREASE);
    };

    const handleBidDecrease = () => {
        if (currentBid > currentMinimumBid) {
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
            // Check if player has already been bought by any team
            const { data: existingPlayer, error: checkError } = await supabase
                .from('auction_players')
                .select('id, team_id')
                .eq('session_id', sessionId)
                .eq('player_name', currentPlayer.name)
                .maybeSingle();

            if (checkError) {
                console.error('Error checking for existing player:', checkError);
                throw checkError;
            }

            if (existingPlayer) {
                // Find which team has this player
                const { data: existingTeam } = await supabase
                    .from('auction_teams')
                    .select('name, team_number')
                    .eq('id', existingPlayer.team_id)
                    .single();

                const teamName = existingTeam?.name || `Team ${existingTeam?.team_number || 'Unknown'}`;
                alert(`${currentPlayer.name} has already been bought by ${teamName}!`);
                return;
            }

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

            // Show success modal
            setSuccessMessage({
                playerName: currentPlayer.name,
                teamName: team.name,
                amount: currentBid
            });
            setShowSuccessModal(true);

            // Move to next player
            const nextIndex = currentPlayerIndex < players.length - 1 ? currentPlayerIndex + 1 : currentPlayerIndex;

            await supabase
                .from('auction_sessions')
                .update({
                    current_player_index: nextIndex
                })
                .eq('id', sessionId);

            // Reset UI state
            const newMinimum = currentPlayer ? getMinimumBid(currentPlayer.category) : MINIMUM_BID;
            setCurrentBid(newMinimum);
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

            await supabase
                .from('auction_sessions')
                .update({
                    current_player_index: nextIndex
                })
                .eq('id', sessionId);

            // Reset UI state
            const newMinimum = currentPlayer ? getMinimumBid(currentPlayer.category) : MINIMUM_BID;
            setCurrentBid(newMinimum);
            setSelectedTeamId(null);
        } catch (error) {
            console.error('Error skipping player:', error);
            alert('Failed to save auction state. Please try again.');
        }
    };

    const handleJumpToSkippedPlayer = async (playerName: string) => {
        if (!canEdit) {
            alert('You do not have permission to edit the auction.');
            return;
        }

        if (!sessionId) {
            alert('Auction session not loaded. Please refresh the page.');
            return;
        }

        // Find the player's index
        const playerIndex = players.findIndex(p => p.name === playerName);
        if (playerIndex === -1) {
            alert('Player not found in the auction pool.');
            return;
        }

        try {
            // Update database session
            await supabase
                .from('auction_sessions')
                .update({
                    current_player_index: playerIndex
                })
                .eq('id', sessionId);

            // Update local state
            setCurrentPlayerIndex(playerIndex);

            // Reset bid to minimum for this player's category
            const targetPlayer = players[playerIndex];
            const newMinimum = targetPlayer ? getMinimumBid(targetPlayer.category) : MINIMUM_BID;
            setCurrentBid(newMinimum);
            setSelectedTeamId(null);

            // Close the skipped players sheet
            setIsSkippedPlayersSheetOpen(false);
        } catch (error) {
            console.error('Error jumping to player:', error);
            alert('Failed to jump to player. Please try again.');
        }
    };

    const handleEndAuction = async () => {
        if (!canEdit) {
            alert('You do not have permission to edit the auction.');
            return;
        }

        if (!sessionId) {
            alert('Auction session not loaded. Please refresh the page.');
            return;
        }

        // Confirm with user
        const confirmed = confirm(
            'Are you sure you want to end the auction?\n\n' +
            'This will:\n' +
            '- Mark the auction as complete\n' +
            '- Prevent further bidding\n' +
            '- Show final team results\n\n' +
            'You can still view the results, but no more players can be bought.'
        );

        if (!confirmed) {
            return;
        }

        try {
            // Mark auction as complete
            await supabase
                .from('auction_sessions')
                .update({
                    is_complete: true
                })
                .eq('id', sessionId);

            // Calculate skipped players
            const { data: boughtPlayersData } = await supabase
                .from('auction_players')
                .select('player_name')
                .eq('session_id', sessionId);

            const boughtPlayerNames = new Set(
                (boughtPlayersData || []).map((p: { player_name: string }) => p.player_name)
            );
            const skipped = players.filter(
                player => !boughtPlayerNames.has(player.name)
            );
            setSkippedPlayers(skipped);

            setAuctionComplete(true);
            alert('Auction ended successfully!');
        } catch (error) {
            console.error('Error ending auction:', error);
            alert('Failed to end auction. Please try again.');
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
                    <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Auction Complete! 🎉</h1>
                        <Image
                            src="/logo.jpeg"
                            alt="Logo"
                            width={120}
                            height={60}
                            className="object-contain w-32 h-12 md:w-[120px] md:h-[60px]"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {teams.map(team => (
                            <div key={team.id} className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
                                <div className="flex justify-between items-center mb-3">
                                    <h2 className="text-xl font-semibold text-gray-900">{team.name}</h2>
                                    <Image
                                        src={getTeamLogo(team.id)}
                                        alt={`${team.name} logo`}
                                        width={48}
                                        height={48}
                                        className="object-contain"
                                    />
                                </div>
                                {team.ownerName && (
                                    <div className="mb-2">
                                        <div className="flex-1 rounded p-1.5 text-center bg-white border border-gray-200">
                                            <div className="text-xs text-gray-600">Owner</div>
                                            <div className="text-xs font-semibold text-gray-900">{team.ownerName}</div>
                                        </div>
                                    </div>
                                )}
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

                    {/* Skipped Players Section */}
                    {skippedPlayers.length > 0 && (
                        <div className="mt-8 bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Skipped Players ({skippedPlayers.length})</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                                {skippedPlayers.map((player, idx) => (
                                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                        <div className="text-sm font-semibold text-gray-900">{player.name}</div>
                                        <div className="text-xs text-gray-600 mt-1">
                                            {player.category} • {player.gender === 'M' ? 'Male' : 'Female'}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            Runs: {player.runs} • Wickets: {player.wickets} • MVP: {player.mvp}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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
            {/* Success Modal */}
            {showSuccessModal && successMessage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8 md:p-12 transform transition-all relative overflow-hidden">
                        {/* Confetti Blast Animation */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {Array.from({ length: 100 }).map((_, i) => {
                                const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#a855f7'];
                                const color = colors[Math.floor(Math.random() * colors.length)];
                                // Blast from center-top
                                const angle = (Math.PI * 2 * i) / 100 + Math.random() * 0.5; // Spread in all directions
                                const distance = 300 + Math.random() * 200; // How far they travel
                                const x = Math.cos(angle) * distance;
                                const y = Math.sin(angle) * distance + 100; // Downward bias
                                const rotation = Math.random() * 360;
                                const size = Math.random() * 8 + 4; // 4-12px
                                const width = size;
                                const height = size * 0.3; // Paper strip shape
                                const duration = Math.random() * 1.5 + 1.5; // 1.5-3 seconds
                                const delay = Math.random() * 0.2; // 0-0.2 seconds

                                return (
                                    <div
                                        key={i}
                                        className="absolute animate-confetti-blast"
                                        style={{
                                            left: '50%',
                                            top: '20%',
                                            width: `${width}px`,
                                            height: `${height}px`,
                                            backgroundColor: color,
                                            '--confetti-x': `${x}px`,
                                            '--confetti-y': `${y}px`,
                                            '--confetti-rotate': `${rotation}deg`,
                                            '--confetti-duration': `${duration}s`,
                                            '--confetti-delay': `${delay}s`,
                                        } as React.CSSProperties}
                                    />
                                );
                            })}
                        </div>

                        {/* Content - Left Aligned */}
                        <div className="relative z-10 text-left">
                            {/* Congratulations with Logo aligned */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Congratulations!!</h2>
                                <Image
                                    src="/logo.jpeg"
                                    alt="Logo"
                                    width={120}
                                    height={60}
                                    className="object-contain"
                                />
                            </div>

                            {/* Player Name */}
                            <p className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                                {successMessage.playerName}
                            </p>

                            {/* Sold to Team */}
                            <p className="text-lg md:text-xl text-gray-600 mb-4">
                                Sold to <span className="font-bold text-red-600">{successMessage.teamName}</span>
                            </p>

                            {/* Amount */}
                            <p className="text-2xl md:text-3xl font-bold text-red-600 mb-8">
                                for ₹{successMessage.amount.toLocaleString()}
                            </p>
                        </div>

                        {/* Button */}
                        <div className="relative z-10 mt-6">
                            <button
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    setSuccessMessage(null);
                                }}
                                className="w-full bg-red-600 text-white py-3 px-8 rounded-lg font-semibold text-base hover:bg-red-700 transition-colors"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
                    <button
                        onClick={() => router.back()}
                        className="text-gray-600 hover:text-gray-900 flex items-center gap-1 md:gap-2 flex-shrink-0"
                    >
                        <span className="text-lg md:text-base">←</span>
                        <span className="hidden sm:inline">Back</span>
                    </button>
                    <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 flex-shrink-0">Auction</h1>
                    <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                        <button
                            onClick={() => setIsSkippedPlayersSheetOpen(true)}
                            className="text-red-600 hover:text-red-700 font-medium text-xs md:text-sm flex items-center gap-1"
                            title={`Skipped Players (${getCurrentSkippedPlayers().length})`}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <span className="hidden sm:inline">Skipped Players ({getCurrentSkippedPlayers().length})</span>
                            <span className="sm:hidden">({getCurrentSkippedPlayers().length})</span>
                        </button>
                        <button
                            onClick={() => setIsTeamsSheetOpen(true)}
                            className="md:hidden text-red-600 hover:text-red-700 font-medium text-xs md:text-sm"
                        >
                            Teams
                        </button>
                        {canEdit && !auctionComplete && (
                            <button
                                onClick={handleEndAuction}
                                className="hidden md:flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                                title="End Auction"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                End Auction
                            </button>
                        )}
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

                                            {/* Owner Name */}
                                            {team.ownerName && (
                                                <div className="mb-2">
                                                    <div className="flex-1 rounded p-1.5 text-center bg-white border border-gray-200">
                                                        <div className="text-xs text-gray-600">Owner</div>
                                                        <div className="text-xs font-semibold text-gray-900">{team.ownerName}</div>
                                                    </div>
                                                </div>
                                            )}

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
                                                                <span className="text-gray-500 text-xs">₹{player.bidAmount?.toLocaleString() || '0'}</span>
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
                        <div className={`${cardStyle.bg} ${cardStyle.border} rounded-xl p-6 md:p-8 ${cardStyle.shadow}`}>
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex-1">
                                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{currentPlayer.name}</h2>
                                    <div className="flex flex-wrap gap-2 text-sm">
                                        <span className="bg-gray-100 px-3 py-1.5 rounded-lg text-gray-600">{currentPlayer.gender === 'M' ? 'Male' : 'Female'}</span>
                                        <span className={`px-3 py-1.5 rounded-lg font-medium ${getCategoryTagStyle(currentPlayer.category)}`}>{currentPlayer.category}</span>
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
                                    disabled={!canEdit || currentBid <= currentMinimumBid}
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
                                Min: ₹{currentMinimumBid.toLocaleString()} | Increase: ₹{BID_INCREASE.toLocaleString()}
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

                                    {/* Owner Name */}
                                    {team.ownerName && (
                                        <div className="mb-3">
                                            <div className="flex-1 rounded-lg p-2 text-center bg-gray-100 border border-gray-200">
                                                <div className="text-xs text-gray-600">Owner</div>
                                                <div className="text-sm font-semibold text-gray-900">{team.ownerName}</div>
                                            </div>
                                        </div>
                                    )}

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
                                                        <span className="text-gray-500 text-xs">₹{player.bidAmount?.toLocaleString() || '0'}</span>
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

            {/* Skipped Players Bottom Sheet */}
            <BottomSheet
                isOpen={isSkippedPlayersSheetOpen}
                onClose={() => setIsSkippedPlayersSheetOpen(false)}
                title="Skipped Players"
            >
                <div className="pb-6">
                    {getCurrentSkippedPlayers().length > 0 ? (
                        <div className="space-y-3">
                            {getCurrentSkippedPlayers().map((player, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => canEdit && handleJumpToSkippedPlayer(player.name)}
                                    className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${canEdit
                                        ? 'cursor-pointer hover:bg-gray-100 hover:border-red-300 transition-colors'
                                        : 'cursor-default'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="text-base font-semibold text-gray-900">{player.name}</div>
                                            <div className="text-xs text-gray-600 mt-1">
                                                {player.category} • {player.gender === 'M' ? 'Male' : 'Female'}
                                            </div>
                                            {canEdit && (
                                                <div className="text-xs text-red-600 mt-1 font-medium">
                                                    Tap to auction again
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-3">
                                        <div className="text-center">
                                            <div className="text-xs text-gray-500">Runs</div>
                                            <div className="text-sm font-semibold text-gray-900">{player.runs}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs text-gray-500">Wickets</div>
                                            <div className="text-sm font-semibold text-gray-900">{player.wickets}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs text-gray-500">MVP</div>
                                            <div className="text-sm font-semibold text-gray-900">{player.mvp}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            No skipped players yet
                        </div>
                    )}
                </div>
            </BottomSheet>
        </div>
    );
}

