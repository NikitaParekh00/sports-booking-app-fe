"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabaseClient';
import BottomSheet from './BottomSheet';
import jsPDF from 'jspdf';
import { processImageUrl } from '@/lib/imageUrlHelper';

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
    photo?: string; // Player photo URL
    age?: number; // Player age
    played_s1?: string; // Played S1: Yes/No
    experience?: string; // Experience
    active_sport?: string; // Active sport practiced
    skill?: string; // Skill (Fielder, Bowler, All Rounder, etc.)
    batting_hand?: string; // Right/Left
    s1_ranking?: string; // S1 Ranking
    s2_ranking?: string; // S2 Ranking
    s3_ranking?: string; // S3 Ranking
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
    photo?: string;
    age?: number;
    played_s1?: string;
    experience?: string;
    active_sport?: string;
    skill?: string;
    batting_hand?: string;
    s1_ranking?: string;
    s2_ranking?: string;
    s3_ranking?: string;
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
    photo?: string;
    age?: number;
    played_s1?: string;
    experience?: string;
    active_sport?: string;
    skill?: string;
    batting_hand?: string;
    s1_ranking?: string;
    s2_ranking?: string;
    s3_ranking?: string;
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
    const [imageReloadKey, setImageReloadKey] = useState(0);
    const imageRef = useRef<HTMLImageElement | null>(null);
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
    const [frozenSkippedPlayers, setFrozenSkippedPlayers] = useState<Player[]>([]);
    const [isTopPlayersSheetOpen, setIsTopPlayersSheetOpen] = useState(false);
    const [loadingState, setLoadingState] = useState(true);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState<{ playerName: string; teamName: string; amount: number } | null>(null);
    const [skippedPlayers, setSkippedPlayers] = useState<Player[]>([]);
    const [boughtPlayerNames, setBoughtPlayerNames] = useState<Set<string>>(new Set());
    const [topPlayersGenderFilter, setTopPlayersGenderFilter] = useState<'all' | 'M' | 'F'>('all');

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

                if (poolError) {
                    console.error('Error fetching player pool:', poolError);
                    throw poolError;
                }

                // Map database player pool to component players
                // Safely handle missing fields (in case migration hasn't been run yet)
                const mappedPlayers: Player[] = (playerPoolData || []).map((p: Partial<DbPlayerPool> & { name: string; payment_status: string; gender: string; category: string }) => ({
                    name: p.name,
                    payment: p.payment_status as 'Y' | 'N',
                    gender: p.gender as 'M' | 'F',
                    category: p.category || 'Non Marquee',
                    runs: p.runs || 0,
                    strikeRate: p.strike_rate || 0,
                    wickets: p.wickets || 0,
                    average: p.average || 0,
                    catch: p.catch_count || 0,
                    ro: p.ro || 0,
                    mvp: p.mvp || 0,
                    photo: p.photo || undefined,
                    age: p.age || undefined,
                    played_s1: p.played_s1 || undefined,
                    experience: p.experience || undefined,
                    active_sport: p.active_sport || undefined,
                    skill: p.skill || undefined,
                    batting_hand: p.batting_hand || undefined,
                    s1_ranking: p.s1_ranking || undefined,
                    s2_ranking: p.s2_ranking || undefined,
                    s3_ranking: p.s3_ranking || undefined
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

                // Filter to show only skipped players (players processed but not bought)
                const skippedOnly = mappedPlayers
                    .slice(0, finalSession.current_player_index)
                    .filter(player => !boughtNames.has(player.name));

                // Set players to only skipped players if there are any
                if (skippedOnly.length > 0) {
                    setPlayers(skippedOnly);
                    // Reset current player index to 0 since we're showing only skipped players
                    setCurrentPlayerIndex(0);
                    // Update session to reflect we're starting from index 0 for skipped players
                    await supabase
                        .from('auction_sessions')
                        .update({ current_player_index: 0 })
                        .eq('id', finalSession.id);
                } else {
                    // If no skipped players, show all players as normal
                    setPlayers(mappedPlayers);
                }
            } catch (error) {
                console.error('Error loading auction state:', error);
                // Ensure loading state is set to false even on error
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
                    },
                    ownerName: team.owner_name
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
                    // Safely handle missing fields (in case migration hasn't been run yet)
                    const mappedPlayers: Player[] = playerPoolData.map((p: Partial<DbPlayerPool> & { name: string; payment_status: string; gender: string; category: string }) => ({
                        name: p.name,
                        payment: p.payment_status as 'Y' | 'N',
                        gender: p.gender as 'M' | 'F',
                        category: p.category || 'Non Marquee',
                        runs: p.runs || 0,
                        strikeRate: p.strike_rate || 0,
                        wickets: p.wickets || 0,
                        average: p.average || 0,
                        catch: p.catch_count || 0,
                        ro: p.ro || 0,
                        mvp: p.mvp || 0,
                        photo: p.photo || undefined,
                        age: p.age || undefined,
                        played_s1: p.played_s1 || undefined,
                        experience: p.experience || undefined,
                        active_sport: p.active_sport || undefined,
                        skill: p.skill || undefined,
                        batting_hand: p.batting_hand || undefined,
                        s1_ranking: p.s1_ranking || undefined,
                        s2_ranking: p.s2_ranking || undefined,
                        s3_ranking: p.s3_ranking || undefined
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

    // Force image reload when player changes
    useEffect(() => {
        if (currentPlayer?.photo) {
            setImageReloadKey(prev => prev + 1);
        }
    }, [currentPlayerIndex, currentPlayer?.photo]);

    // Get current skipped players (players that have been processed but not bought)
    const getCurrentSkippedPlayers = useCallback(() => {
        // Players that have been processed (index < currentPlayerIndex) but not bought
        return players
            .slice(0, currentPlayerIndex)
            .filter(player => !boughtPlayerNames.has(player.name));
    }, [players, currentPlayerIndex, boughtPlayerNames]);

    // Freeze skipped players list when sheet opens
    useEffect(() => {
        if (isSkippedPlayersSheetOpen) {
            // Freeze the skipped players list when sheet opens
            setFrozenSkippedPlayers(getCurrentSkippedPlayers());
        } else {
            // Clear frozen list when sheet closes
            setFrozenSkippedPlayers([]);
        }
    }, [isSkippedPlayersSheetOpen, getCurrentSkippedPlayers]);

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

    // Generate PDF for a team
    const generateTeamPDF = async (team: Team) => {
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 15;
            let yPosition = margin;

            // Header section with left and right alignment
            const headerStartY = yPosition;
            let maxHeaderHeight = 0;
            const logoWidth = 50; // Same width for both logos
            const logoY = headerStartY; // Same Y position for both logos

            // Load both logos first to ensure proper alignment
            let appLogoHeight = 0;
            let teamLogoHeight = 0;
            let appLogoDataUrl = '';
            let teamLogoDataUrl = '';

            // Load app logo
            try {
                const response = await fetch('/logo.jpeg');
                const blob = await response.blob();
                const reader = new FileReader();

                await new Promise<void>((resolve, reject) => {
                    reader.onload = () => {
                        appLogoDataUrl = reader.result as string;
                        const logoImg = document.createElement('img');
                        logoImg.onload = () => {
                            appLogoHeight = (logoImg.height / logoImg.width) * logoWidth;
                            resolve();
                        };
                        logoImg.onerror = reject;
                        logoImg.src = appLogoDataUrl;
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (logoError) {
                console.error('Error loading logo:', logoError);
            }

            // Load team logo
            try {
                const teamLogoPath = getTeamLogo(team.id);
                const response = await fetch(teamLogoPath);
                const blob = await response.blob();
                const reader = new FileReader();

                await new Promise<void>((resolve) => {
                    reader.onload = () => {
                        teamLogoDataUrl = reader.result as string;
                        const logoImg = document.createElement('img');
                        logoImg.onload = () => {
                            teamLogoHeight = (logoImg.height / logoImg.width) * logoWidth;
                            resolve();
                        };
                        logoImg.onerror = () => resolve(); // Continue if team logo fails
                        logoImg.src = teamLogoDataUrl;
                    };
                    reader.onerror = () => resolve(); // Continue if team logo fails
                    reader.readAsDataURL(blob);
                });
            } catch (teamLogoError) {
                console.error('Error loading team logo:', teamLogoError);
            }

            // Add app logo (left side) - same Y position as team logo
            if (appLogoDataUrl) {
                pdf.addImage(appLogoDataUrl, 'JPEG', margin, logoY, logoWidth, appLogoHeight);
                maxHeaderHeight = Math.max(maxHeaderHeight, appLogoHeight);
            }

            // Add team logo (right side) - same Y position as app logo
            if (teamLogoDataUrl) {
                const teamLogoX = pageWidth - margin - logoWidth; // Right aligned
                pdf.addImage(teamLogoDataUrl, 'JPEG', teamLogoX, logoY, logoWidth, teamLogoHeight);
                maxHeaderHeight = Math.max(maxHeaderHeight, teamLogoHeight);
            }

            // "Team Report" text below app logo (left aligned)
            pdf.setFontSize(22);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Team Report', margin, logoY + (appLogoHeight || 15) + 8);
            maxHeaderHeight = Math.max(maxHeaderHeight, (appLogoHeight || 15) + 15);

            // Team Name below team logo (right aligned, same X as logo)
            pdf.setFontSize(18);
            pdf.setTextColor(220, 38, 38); // Red color
            pdf.setFont('helvetica', 'bold');
            const teamLogoRightX = pageWidth - margin; // Right edge of team logo
            const teamNameY = logoY + (teamLogoHeight || 15) + 8;
            pdf.text(team.name, teamLogoRightX, teamNameY, { align: 'right' });
            maxHeaderHeight = Math.max(maxHeaderHeight, (teamLogoHeight || 15) + 15);

            // Owner Name below team name (right aligned, same X as logo and name)
            if (team.ownerName) {
                pdf.setFontSize(12);
                pdf.setTextColor(0, 0, 0);
                pdf.setFont('helvetica', 'normal');
                const ownerY = teamNameY + 8;
                pdf.text(`Owner: ${team.ownerName}`, teamLogoRightX, ownerY, { align: 'right' });
                maxHeaderHeight = Math.max(maxHeaderHeight, ownerY - headerStartY + 8);
            }

            // Move to next section
            yPosition = headerStartY + maxHeaderHeight + 10;

            // Budget Information Table
            const totalSpent = TOTAL_AMOUNT - team.budget;
            const tableStartX = margin;
            const tableWidth = pageWidth - (2 * margin);
            const rowHeight = 8;

            // Helper function to format numbers (avoid Indian numbering system issues)
            const formatNumber = (num: number) => {
                return num.toLocaleString('en-US');
            };

            // Table Header
            pdf.setFillColor(220, 38, 38); // Red background
            pdf.rect(tableStartX, yPosition, tableWidth, rowHeight, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'bold');
            pdf.text('Budget Information', tableStartX + tableWidth / 2, yPosition + 5.5, { align: 'center' });
            yPosition += rowHeight;

            // Budget Rows
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);

            const budgetData = [
                ['Total Budget', formatNumber(TOTAL_AMOUNT)],
                ['Amount Spent', formatNumber(totalSpent)],
                ['Remaining Budget', formatNumber(team.budget)]
            ];

            budgetData.forEach((row, index) => {
                // Draw background for even rows only
                if (index % 2 === 0) {
                    pdf.setFillColor(245, 245, 245); // Light gray background
                    pdf.rect(tableStartX, yPosition, tableWidth, rowHeight, 'F');
                } else {
                    pdf.setFillColor(255, 255, 255); // White background
                    pdf.rect(tableStartX, yPosition, tableWidth, rowHeight, 'F');
                }

                // Reset text color after drawing background
                pdf.setTextColor(0, 0, 0);
                pdf.text(row[0], tableStartX + 5, yPosition + 5.5);
                pdf.text(row[1], tableStartX + tableWidth - 5, yPosition + 5.5, { align: 'right' });
                yPosition += rowHeight;
            });

            yPosition += 10;

            // Players Section Header
            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(0, 0, 0);
            pdf.text('Players Acquired', margin, yPosition);
            yPosition += 8;

            // Players Table
            if (team.players.length === 0) {
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(128, 128, 128);
                pdf.text('No players acquired', margin + 5, yPosition);
            } else {
                const playerTableStartX = margin;
                const playerTableWidth = pageWidth - (2 * margin);
                const playerRowHeight = 8;
                // Adjusted column widths: S.No (10mm), Name (flexible), Amount (35mm fixed)
                const sNoWidth = 10;
                const amountWidth = 35;
                const nameWidth = playerTableWidth - sNoWidth - amountWidth - 2; // Extra 2mm for spacing

                // Table Header
                pdf.setFillColor(220, 38, 38);
                pdf.rect(playerTableStartX, yPosition, playerTableWidth, playerRowHeight, 'F');
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.text('S.No', playerTableStartX + sNoWidth / 2, yPosition + 5.5, { align: 'center' });
                pdf.text('Player Name', playerTableStartX + sNoWidth + nameWidth / 2, yPosition + 5.5, { align: 'center' });
                pdf.text('Amount', playerTableStartX + sNoWidth + nameWidth + amountWidth / 2, yPosition + 5.5, { align: 'center' });
                yPosition += playerRowHeight;

                // Player Rows
                pdf.setTextColor(0, 0, 0);
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(9);

                team.players.forEach((player, index) => {
                    // Check if we need a new page
                    if (yPosition > pageHeight - 30) {
                        pdf.addPage();
                        yPosition = margin;
                    }

                    // Alternate row colors
                    if (index % 2 === 0) {
                        pdf.setFillColor(250, 250, 250);
                    } else {
                        pdf.setFillColor(255, 255, 255);
                    }
                    pdf.rect(playerTableStartX, yPosition, playerTableWidth, playerRowHeight, 'F');

                    // S.No
                    pdf.text(String(index + 1), playerTableStartX + sNoWidth / 2, yPosition + 5.5, { align: 'center' });

                    // Player Name - truncate if too long
                    const playerText = player.name;
                    const maxNameWidth = nameWidth - 4; // Leave padding
                    let displayName = playerText;
                    const textWidth = pdf.getTextWidth(playerText);
                    if (textWidth > maxNameWidth) {
                        // Truncate name if too long
                        let truncated = playerText;
                        while (pdf.getTextWidth(truncated + '...') > maxNameWidth && truncated.length > 0) {
                            truncated = truncated.slice(0, -1);
                        }
                        displayName = truncated + '...';
                    }
                    pdf.text(displayName, playerTableStartX + sNoWidth + 2, yPosition + 5.5);

                    // Bid Amount - right aligned within its column, ensure it fits
                    const bidAmount = player.bidAmount || 0;
                    const bidText = formatNumber(bidAmount);
                    // Calculate max width for amount (leave 2mm padding on right)
                    const maxAmountWidth = amountWidth - 4;
                    const displayAmount = bidText;
                    if (pdf.getTextWidth(bidText) > maxAmountWidth) {
                        // If amount is too long, use smaller font
                        pdf.setFontSize(8);
                    }
                    const amountX = playerTableStartX + sNoWidth + nameWidth + amountWidth - 2;
                    pdf.text(displayAmount, amountX, yPosition + 5.5, { align: 'right' });
                    // Reset font size
                    pdf.setFontSize(9);

                    yPosition += playerRowHeight;
                });

                // Total row
                if (yPosition > pageHeight - 20) {
                    pdf.addPage();
                    yPosition = margin;
                }

                pdf.setFillColor(240, 240, 240);
                pdf.rect(playerTableStartX, yPosition, playerTableWidth, playerRowHeight, 'F');
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(10);
                pdf.text('Total', playerTableStartX + sNoWidth + nameWidth / 2, yPosition + 5.5, { align: 'center' });
                const totalBidAmount = team.players.reduce((sum, p) => sum + (p.bidAmount || 0), 0);
                const totalAmountText = formatNumber(totalBidAmount);
                // Ensure total amount fits
                const maxTotalWidth = amountWidth - 4;
                if (pdf.getTextWidth(totalAmountText) > maxTotalWidth) {
                    pdf.setFontSize(9);
                }
                const totalAmountX = playerTableStartX + sNoWidth + nameWidth + amountWidth - 2;
                pdf.text(totalAmountText, totalAmountX, yPosition + 5.5, { align: 'right' });
            }

            // Save PDF
            pdf.save(`${team.name.replace(/\s+/g, '_')}_Team_Report.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
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
                                <div className="space-y-1 mb-4">
                                    {team.players.map((player, idx) => (
                                        <div key={idx} className="text-sm text-gray-700 py-1 border-b border-gray-100 last:border-0">
                                            {player.name}
                                        </div>
                                    ))}
                                </div>
                                {/* Download PDF Button */}
                                <button
                                    onClick={() => generateTeamPDF(team)}
                                    className="w-full mt-4 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Download PDF
                                </button>
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
            <div className="bg-white border-b border-gray-200 px-2 md:px-3 py-3 sticky top-0 z-10 shadow-sm">
                <div className="w-full flex items-center justify-between gap-2">
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
                            onClick={() => setIsTopPlayersSheetOpen(true)}
                            className="text-red-600 hover:text-red-700 font-medium text-xs md:text-sm flex items-center gap-1"
                            title="Top 5 Bidded Players"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            <span className="hidden sm:inline">Top 5</span>
                        </button>
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

            <div className="w-full px-2 md:px-3 py-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
                    {/* Left Sidebar - Teams Overview (Desktop) */}
                    <div className="hidden lg:block lg:col-span-1">
                        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 md:p-5 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto space-y-4">
                            {/* Team Dynamics Section */}
                            <div>
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
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-2 space-y-4 pb-32 md:pb-4">
                        {/* Progress */}
                        <div className="bg-white rounded-xl border-2 border-gray-200 p-3 md:p-4">
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
                        <div className={`${cardStyle.bg} ${cardStyle.border} rounded-xl p-5 md:p-7 ${cardStyle.shadow}`}>
                            <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-6">
                                {/* Player Photo - Top on mobile, Left on desktop */}
                                <div className="flex-shrink-0 flex justify-center md:justify-start">
                                    {currentPlayer.photo && (
                                        <div key={`player-image-${currentPlayer.name}-${currentPlayerIndex}-${imageReloadKey}`} className="relative w-full max-w-xs h-80 md:w-72 md:h-96 rounded-xl overflow-hidden border-4 border-white shadow-2xl bg-gray-100">
                                            {/* Automatically converts Google Drive links to direct image URLs */}
                                            {(() => {
                                                const imageUrl = processImageUrl(currentPlayer.photo);
                                                console.log('Original photo URL:', currentPlayer.photo);
                                                console.log('Processed image URL:', imageUrl);
                                                console.log('Image reload key:', imageReloadKey);

                                                if (!imageUrl) return null;

                                                // Use photo URL itself as cache key - each player has unique photo URL
                                                // Add minimal cache-busting only with player identifier (no timestamp to avoid slow loading)
                                                const photoUrlHash = currentPlayer.photo ? currentPlayer.photo.substring(Math.max(0, currentPlayer.photo.length - 30)) : '';
                                                const cacheParams = new URLSearchParams({
                                                    _p: currentPlayer.name.substring(0, 10), // First 10 chars of name
                                                    _i: String(currentPlayerIndex),
                                                    _h: photoUrlHash.replace(/[^a-zA-Z0-9]/g, '').substring(0, 15) // Last part of photo URL
                                                });
                                                const cacheBuster = imageUrl.includes('?') ? `&${cacheParams.toString()}` : `?${cacheParams.toString()}`;
                                                const finalImageUrl = `${imageUrl}${cacheBuster}`;

                                                // Use regular img tag for all URLs (proxy API route or external URLs)
                                                // Next.js Image doesn't support query strings in local patterns
                                                return (
                                                    <img
                                                        ref={imageRef}
                                                        key={`img-${currentPlayer.name}-${currentPlayerIndex}-${imageReloadKey}-${currentPlayer.photo?.substring(0, 20)}`}
                                                        src={finalImageUrl}
                                                        alt={currentPlayer.name}
                                                        className="object-cover w-full h-full"
                                                        loading="eager"
                                                        decoding="async"
                                                        crossOrigin="anonymous"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            console.error('❌ Failed to load player image:', finalImageUrl);
                                                            console.error('Original URL:', currentPlayer.photo);
                                                            // Hide the broken image
                                                            target.style.display = 'none';
                                                            // Show a placeholder
                                                            const parent = target.parentElement;
                                                            if (parent && !parent.querySelector('.placeholder')) {
                                                                const placeholder = document.createElement('div');
                                                                placeholder.className = 'placeholder w-full h-full flex items-center justify-center bg-gray-200 text-gray-400 text-xs';
                                                                placeholder.textContent = 'Image unavailable';
                                                                parent.appendChild(placeholder);
                                                            }
                                                        }}
                                                        onLoad={() => {
                                                            console.log('✅ Successfully loaded player image:', finalImageUrl);
                                                        }}
                                                    />
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>

                                {/* Player Info - Below image on mobile, Right side on desktop */}
                                <div className="flex-1 flex flex-col">
                                    {/* Header: Name and Logo */}
                                    <div className="flex items-center justify-center md:justify-between gap-3 md:gap-4 mb-3">
                                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{currentPlayer.name}</h2>
                                        <div className="flex-shrink-0">
                                            <Image
                                                src="/logo.jpeg"
                                                alt="Logo"
                                                width={180}
                                                height={80}
                                                className="object-contain w-16 h-16 md:w-[180px] md:h-[80px]"
                                            />
                                        </div>
                                    </div>

                                    {/* Basic Info Badges - Right below name */}
                                    <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                                        {currentPlayer.age && (
                                            <span className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium border border-blue-200">
                                                Age: {currentPlayer.age}
                                            </span>
                                        )}
                                        {currentPlayer.batting_hand && (
                                            <span className="bg-purple-50 text-purple-700 px-4 py-2 rounded-lg font-medium border border-purple-200">
                                                {currentPlayer.batting_hand} Handed
                                            </span>
                                        )}
                                        {currentPlayer.skill && (
                                            <span className="bg-green-50 text-green-700 px-4 py-2 rounded-lg font-medium border border-green-200">
                                                {currentPlayer.skill}
                                            </span>
                                        )}
                                    </div>

                                    {/* Player Details Grid */}
                                    <div className="space-y-4">
                                        {/* Experience */}
                                        {currentPlayer.experience && (
                                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 md:p-5 border border-gray-200">
                                                <div className="text-sm md:text-base font-semibold text-gray-500 uppercase tracking-wide mb-2">Experience</div>
                                                <div className="text-lg md:text-xl text-gray-900 font-medium">{currentPlayer.experience}</div>
                                            </div>
                                        )}

                                        {/* Rankings */}
                                        {(currentPlayer.s1_ranking || currentPlayer.s2_ranking || currentPlayer.s3_ranking) && (
                                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-5 md:p-6 border border-indigo-200">
                                                <div className="text-sm md:text-base font-semibold text-indigo-600 uppercase tracking-wide mb-4">Season Rankings</div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    {currentPlayer.s1_ranking && (
                                                        <div className="text-center bg-white rounded-lg p-4 border border-indigo-100">
                                                            <div className="text-sm text-gray-500 mb-2">S1</div>
                                                            <div className="text-xl md:text-2xl font-bold text-indigo-700">{currentPlayer.s1_ranking}</div>
                                                        </div>
                                                    )}
                                                    {currentPlayer.s2_ranking && (
                                                        <div className="text-center bg-white rounded-lg p-4 border border-indigo-100">
                                                            <div className="text-sm text-gray-500 mb-2">S2</div>
                                                            <div className="text-xl md:text-2xl font-bold text-indigo-700">{currentPlayer.s2_ranking}</div>
                                                        </div>
                                                    )}
                                                    {currentPlayer.s3_ranking && (
                                                        <div className="text-center bg-white rounded-lg p-4 border border-indigo-100">
                                                            <div className="text-sm text-gray-500 mb-2">S3</div>
                                                            <div className="text-xl md:text-2xl font-bold text-indigo-700">{currentPlayer.s3_ranking}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Active Sport - Full Width Below Image */}
                            {currentPlayer.active_sport && (
                                <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 md:p-5 border border-blue-200 w-full mt-6">
                                    <div className="text-lg md:text-xl text-gray-900 font-medium">{currentPlayer.active_sport}</div>
                                </div>
                            )}
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

            {/* Top 5 Bidded Players Bottom Sheet */}
            <BottomSheet
                isOpen={isTopPlayersSheetOpen}
                onClose={() => setIsTopPlayersSheetOpen(false)}
                title="Top 5 Bidded Players"
            >
                <div className="pb-6">
                    {(() => {
                        // Collect all players from all teams with their bid amounts
                        const allBoughtPlayers = teams.flatMap(team =>
                            team.players
                                .filter(player => player.bidAmount && player.bidAmount > 0)
                                .map(player => ({
                                    ...player,
                                    teamName: team.name,
                                    teamId: team.id
                                }))
                        );

                        // Filter by gender if needed
                        const filteredPlayers = topPlayersGenderFilter === 'all'
                            ? allBoughtPlayers
                            : allBoughtPlayers.filter(player => player.gender === topPlayersGenderFilter);

                        // Sort by bid amount (highest first) and take top 5
                        const top5Players = filteredPlayers
                            .sort((a, b) => (b.bidAmount || 0) - (a.bidAmount || 0))
                            .slice(0, 5);

                        if (allBoughtPlayers.length === 0) {
                            return (
                                <div className="text-center py-8 text-gray-500">
                                    No players have been bought yet
                                </div>
                            );
                        }

                        return (
                            <>
                                {/* Gender Filter Buttons */}
                                <div className="flex gap-2 mb-4">
                                    <button
                                        onClick={() => setTopPlayersGenderFilter('all')}
                                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${topPlayersGenderFilter === 'all'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setTopPlayersGenderFilter('M')}
                                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${topPlayersGenderFilter === 'M'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Male
                                    </button>
                                    <button
                                        onClick={() => setTopPlayersGenderFilter('F')}
                                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${topPlayersGenderFilter === 'F'
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Female
                                    </button>
                                </div>

                                {top5Players.length > 0 ? (
                                    <div className="space-y-3">
                                        {top5Players.map((player, idx) => (
                                            <div
                                                key={`${player.name}-${idx}`}
                                                className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-red-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                                                            {idx + 1}
                                                        </div>
                                                        <span className="font-semibold text-gray-900 text-base">{player.name}</span>
                                                    </div>
                                                    <span className="text-base font-bold text-red-600">₹{player.bidAmount?.toLocaleString() || '0'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-600 ml-11">
                                                    <Image
                                                        src={getTeamLogo(player.teamId)}
                                                        alt={`${player.teamName} logo`}
                                                        width={20}
                                                        height={20}
                                                        className="object-contain"
                                                    />
                                                    <span>{player.teamName}</span>
                                                    <span>•</span>
                                                    <span>{player.category}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        No {topPlayersGenderFilter === 'all' ? '' : topPlayersGenderFilter === 'M' ? 'male ' : 'female '}players found
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            </BottomSheet>

            {/* Skipped Players Bottom Sheet */}
            <BottomSheet
                isOpen={isSkippedPlayersSheetOpen}
                onClose={() => {
                    setIsSkippedPlayersSheetOpen(false);
                    setFrozenSkippedPlayers([]);
                }}
                title="Skipped Players"
            >
                <div className="pb-6">
                    {(frozenSkippedPlayers.length > 0 ? frozenSkippedPlayers : getCurrentSkippedPlayers()).length > 0 ? (
                        <div className="space-y-3">
                            {(frozenSkippedPlayers.length > 0 ? frozenSkippedPlayers : getCurrentSkippedPlayers()).map((player, idx) => (
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

