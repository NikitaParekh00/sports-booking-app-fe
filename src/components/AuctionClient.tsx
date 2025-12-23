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
    bidAmount?: number; // Optional for players in team (bought players have bid amount)
    photo?: string; // Player photo URL
    age?: number; // Player age
    played_s1?: string; // Played S1: Yes/No
    experience?: string; // Experience
    active_sport?: string; // Active sport practiced
    skill?: string; // Skill (Fielder, Bowler, All Rounder, etc.)
    batting_hand?: string; // Right/Left
}

interface Team {
    id: number;
    name: string;
    budget: number;
    players: Player[];
    ownerName?: string;
}

const TOTAL_AMOUNT = 111000;
const MINIMUM_BID = 5000;
const TEAMS_COUNT = 8;
const PLAYERS_PER_TEAM = 11; // Maximum 11 players per team

// Dynamic bid increment based on current bid amount
const getBidIncrement = (currentBid: number): number => {
    if (currentBid >= 700000) {
        return 50000; // After 7 lacs: increase by 50,000
    } else if (currentBid >= 400000) {
        return 30000; // After 4 lacs: increase by 30,000
    } else if (currentBid >= 200000) {
        return 20000; // After 2 lacs: increase by 20,000
    } else if (currentBid >= 100000) {
        return 10000; // After 1 lac: increase by 10,000
    } else {
        return 5000; // Default: increase by 5,000
    }
};

// Team logos mapping for Women's teams (first 4 logos)
const WOMENS_TEAM_LOGOS: { [key: number]: string } = {
    1: '/team-logos/team1.jpeg',
    2: '/team-logos/team2.jpeg',
    3: '/team-logos/team3.jpeg',
    4: '/team-logos/team4.jpeg',
};

// Team logos mapping for Men's teams (logos 5-14 for 10 teams)
const MENS_TEAM_LOGOS: { [key: number]: string } = {
    1: '/team-logos/team5.jpeg',
    2: '/team-logos/team6.jpeg',
    3: '/team-logos/team7.jpeg',
    4: '/team-logos/team8.jpeg',
    5: '/team-logos/team9.jpeg',
    6: '/team-logos/team10.jpeg',
    7: '/team-logos/team11.jpeg',
    8: '/team-logos/team12.jpeg',
    9: '/team-logos/team13.jpeg',
    10: '/team-logos/team14.jpeg',
};

// Helper function to get team logo based on session type
const getTeamLogo = (teamId: number, sessionName: string | null): string => {
    // Default to Men's if session name is not available
    if (!sessionName) {
        return MENS_TEAM_LOGOS[teamId] || '/logo.jpeg';
    }

    const sessionNameLower = sessionName.toLowerCase().trim();

    // Explicitly check for Women's session
    if (sessionNameLower.includes('women')) {
        // Women's teams use first 4 logos (team1-4.jpeg)
        return WOMENS_TEAM_LOGOS[teamId] || '/logo.jpeg';
    }

    // For Men's session or any other case, use Men's logos (team5-14.jpeg)
    // This includes sessions with "Men", "Mens", or any other name
    return MENS_TEAM_LOGOS[teamId] || '/logo.jpeg';
};

// Database types for auction
interface DbTeam {
    id: string;
    team_number: number;
    name: string;
    budget: number;
    owner_name?: string;
}

interface DbPlayer {
    team_id: string;
    player_name: string;
    bid_amount: number;
}

interface DbPlayerPool {
    id: string;
    session_id: string;
    player_order: number;
    name: string;
    photo?: string;
    age?: number;
    played_s1?: string;
    experience?: string;
    active_sport?: string;
    skill?: string;
    batting_hand?: string;
}

// Flag to control public auction access
// Set to true to allow everyone to view auctions, false to restrict to specific phone number
const PUBLIC_AUCTION_ACCESS = true; // Change to true when auctions start for everyone

// Configure the allowed user for auction access (when PUBLIC_AUCTION_ACCESS is false)
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

interface AuctionClientProps {
    initialSessionId?: string;
}

export default function AuctionClient({ initialSessionId }: AuctionClientProps = {}) {
    const router = useRouter();
    const supabase = createClient();
    const [authLoading, setAuthLoading] = useState(true);
    const [canEdit, setCanEdit] = useState(false); // Can this user edit the auction?
    const [canView, setCanView] = useState(false); // Can this user view the auction?
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionName, setSessionName] = useState<string | null>(null); // Store session name to determine Men's/Women's
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [players, setPlayers] = useState<Player[]>([]);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [teams, setTeams] = useState<Team[]>(() => {
        return Array.from({ length: TEAMS_COUNT }, (_, i) => ({
            id: i + 1,
            name: `Team ${i + 1}`,
            budget: TOTAL_AMOUNT,
            players: [],
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
    const [isSkippedPlayersMode, setIsSkippedPlayersMode] = useState(false); // Track if we're showing only skipped players
    const [allPlayers, setAllPlayers] = useState<Player[]>([]); // Store all players when switching to skipped mode
    const [pdfGeneratingTeamId, setPdfGeneratingTeamId] = useState<number | null>(null); // Track which team is generating PDF
    const [pdfGeneratingTopPlayers, setPdfGeneratingTopPlayers] = useState<string | null>(null); // Track which top players PDF is generating ('male' or 'female')

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

                // Check if user can view the auction
                let canUserView = false;
                let canUserEdit = false;

                if (PUBLIC_AUCTION_ACCESS) {
                    // Public access enabled - everyone can view
                    canUserView = true;
                    // Check if user can edit (matches allowed user)
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
                } else {
                    // Restricted access - only allowed user can view
                    if (ALLOWED_AUCTION_USER.user_id && userData.user_id === ALLOWED_AUCTION_USER.user_id) {
                        canUserView = true;
                        canUserEdit = true;
                    } else if (ALLOWED_AUCTION_USER.phone && profile?.phone === ALLOWED_AUCTION_USER.phone) {
                        // Simple exact match - phone must be in format: +91-XXXXXXXXXX
                        canUserView = true;
                        canUserEdit = true;
                    } else if (ALLOWED_AUCTION_USER.email && (userData.email === ALLOWED_AUCTION_USER.email || profile?.email === ALLOWED_AUCTION_USER.email)) {
                        canUserView = true;
                        canUserEdit = true;
                    }
                }

                setCanView(canUserView);
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

                // If initialSessionId is provided, use that session
                if (initialSessionId) {
                    const { data: session, error: sessionError } = await supabase
                        .from('auction_sessions')
                        .select('*')
                        .eq('id', initialSessionId)
                        .maybeSingle();

                    if (session) {
                        finalSession = session;
                        setSessionName(session.session_name); // Store session name for logo mapping
                    } else if (sessionError) {
                        console.error('Error fetching specified session:', sessionError);
                        alert(`Session not found. Please check the URL.`);
                        router.push('/dashboard');
                        return;
                    } else {
                        alert(`Session not found. Please check the URL.`);
                        router.push('/dashboard');
                        return;
                    }
                } else {
                    // Try to get most recent session (including completed ones)
                    const { data: session, error: sessionError } = await supabase
                        .from('auction_sessions')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();

                    if (session) {
                        finalSession = session;
                        setSessionName(session.session_name); // Store session name for logo mapping
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
                        setSessionName(newSession.session_name); // Store session name for logo mapping

                        // Create initial teams
                        const teamsData = Array.from({ length: TEAMS_COUNT }, (_, i) => ({
                            session_id: finalSession!.id,
                            team_number: i + 1,
                            name: `Team ${i + 1}`,
                            budget: TOTAL_AMOUNT
                        }));

                        const { error: teamsError } = await supabase.from('auction_teams').insert(teamsData);
                        if (teamsError) {
                            console.error('Error creating teams:', teamsError);
                            throw new Error(`Failed to create teams: ${teamsError.message}`);
                        }

                        // Initial player pool will be created separately via database inserts
                    }
                }

                if (!finalSession) {
                    throw new Error('Failed to get or create session');
                }

                setSessionId(finalSession.id);
                setCurrentPlayerIndex(finalSession.current_player_index);
                setAuctionComplete(finalSession.is_complete);

                // Load player pool from database - only select fields we actually use
                const { data: playerPoolData, error: poolError } = await supabase
                    .from('auction_player_pool')
                    .select('id, player_order, name, photo, age, played_s1, experience, active_sport, skill, batting_hand')
                    .eq('session_id', finalSession.id)
                    .order('player_order', { ascending: true });

                if (poolError) {
                    console.error('Error fetching player pool:', poolError);
                    throw poolError;
                }

                // Map database player pool to component players
                // Safely handle missing fields (in case migration hasn't been run yet)
                const mappedPlayers: Player[] = (playerPoolData || []).map((p: Partial<DbPlayerPool> & { name: string }) => ({
                    name: p.name,
                    photo: p.photo || undefined,
                    age: p.age || undefined,
                    played_s1: p.played_s1 || undefined,
                    experience: p.experience || undefined,
                    active_sport: p.active_sport || undefined,
                    skill: p.skill || undefined,
                    batting_hand: p.batting_hand || undefined
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
                            bidAmount: p.bid_amount
                        }));

                    return {
                        id: team.team_number,
                        name: team.name,
                        budget: Number(team.budget), // Ensure budget is a number
                        players: teamPlayers,
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

                    // Only show skipped players if auction is complete AND there are skipped players
                    // This means we've finished the main auction and are now auctioning skipped players
                    if (skipped.length > 0) {
                        setPlayers(skipped);
                        setIsSkippedPlayersMode(true);
                        // Reset current player index to 0 since we're starting skipped players auction
                        setCurrentPlayerIndex(0);
                        // Update session to reflect we're starting from index 0 for skipped players
                        await supabase
                            .from('auction_sessions')
                            .update({ current_player_index: 0 })
                            .eq('id', finalSession.id);
                    } else {
                        // No skipped players, show all players (auction is complete with all players bought)
                        setPlayers(mappedPlayers);
                        setIsSkippedPlayersMode(false);
                    }
                } else {
                    // Auction is not complete, show all players normally
                    setSkippedPlayers([]);
                    setPlayers(mappedPlayers);
                    setIsSkippedPlayersMode(false);
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
    }, [authLoading, supabase, initialSessionId, router]);

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
                        bidAmount: Number(p.bid_amount) || 0 // Ensure bid_amount is a number
                    }));

                return {
                    id: team.team_number,
                    name: team.name,
                    budget: Number(team.budget), // Ensure budget is a number
                    players: teamPlayers,
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
                // Reload player pool when it changes - only select fields we actually use
                const { data: playerPoolData } = await supabase
                    .from('auction_player_pool')
                    .select('id, player_order, name, photo, age, played_s1, experience, active_sport, skill, batting_hand')
                    .eq('session_id', sessionId)
                    .order('player_order', { ascending: true });

                if (playerPoolData) {
                    // Safely handle missing fields (in case migration hasn't been run yet)
                    const mappedPlayers: Player[] = playerPoolData.map((p: Partial<DbPlayerPool> & { name: string }) => ({
                        name: p.name,
                        photo: p.photo || undefined,
                        age: p.age || undefined,
                        played_s1: p.played_s1 || undefined,
                        experience: p.experience || undefined,
                        active_sport: p.active_sport || undefined,
                        skill: p.skill || undefined,
                        batting_hand: p.batting_hand || undefined
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


    // Get current skipped players
    const getCurrentSkippedPlayers = useCallback(() => {
        // If auction is complete, return all players that were never bought
        if (auctionComplete) {
            return players.filter(player => !boughtPlayerNames.has(player.name));
        }

        // If auction is in progress, only return players that have been processed (index < currentPlayerIndex) but not bought
        // This gives the list of players that were skipped during the auction so far
        return players
            .slice(0, currentPlayerIndex)
            .filter(player => !boughtPlayerNames.has(player.name));
    }, [players, boughtPlayerNames, auctionComplete, currentPlayerIndex]);

    // Freeze skipped players list when sheet opens
    useEffect(() => {
        if (isSkippedPlayersSheetOpen) {
            // Freeze the skipped players list when sheet opens
            // Use skippedPlayers state if available, otherwise calculate from current players
            const skippedList = skippedPlayers.length > 0
                ? skippedPlayers
                : getCurrentSkippedPlayers();
            setFrozenSkippedPlayers(skippedList);
        } else {
            // Clear frozen list when sheet closes
            setFrozenSkippedPlayers([]);
        }
    }, [isSkippedPlayersSheetOpen, getCurrentSkippedPlayers, skippedPlayers]);

    // Default card styling (no category-based styling)
    const cardStyle = { bg: 'bg-white', border: 'border-2 border-gray-200', shadow: 'shadow-sm' };

    const currentMinimumBid = 5000

    // Update bid when player changes
    useEffect(() => {
        if (currentPlayer) {
            const newMinimum = MINIMUM_BID;
            setCurrentBid(newMinimum);
        }
    }, [currentPlayerIndex, currentPlayer]);

    const handleBidIncrease = () => {
        setCurrentBid(prev => {
            const increment = getBidIncrement(prev);
            return prev + increment;
        });
    };

    const handleBidDecrease = () => {
        if (currentBid > currentMinimumBid) {
            setCurrentBid(prev => {
                // Calculate increment based on the amount we're decreasing FROM
                // This ensures we decrease by the same amount we would have increased
                const increment = getBidIncrement(prev);
                return Math.max(currentMinimumBid, prev - increment);
            });
        }
    };

    const [bidInputValue, setBidInputValue] = useState<string>('');

    // Sync bidInputValue with currentBid when it changes externally
    useEffect(() => {
        setBidInputValue(currentBid.toString());
    }, [currentBid]);

    const handleBidInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!canEdit) return;

        const value = e.target.value.replace(/[^0-9]/g, ''); // Remove non-numeric characters
        setBidInputValue(value);

        if (value === '') {
            return;
        }

        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
            // Ensure the value is at least the minimum bid
            setCurrentBid(Math.max(currentMinimumBid, numValue));
        }
    };

    const handleBidInputBlur = () => {
        // Ensure bid is at least minimum when input loses focus
        if (currentBid < currentMinimumBid) {
            setCurrentBid(currentMinimumBid);
        }
        // Sync input value with current bid (in case it was adjusted)
        setBidInputValue(currentBid.toString());
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

        // Check if team has space (maximum 11 players)
        if (team.players.length >= PLAYERS_PER_TEAM) {
            alert(`Team ${team.name} already has ${PLAYERS_PER_TEAM} players! Maximum allowed is ${PLAYERS_PER_TEAM}.`);
            return;
        }

        // Check if team has enough budget for current bid
        if (team.budget < currentBid) {
            alert(`Team ${team.name} doesn't have enough budget!`);
            return;
        }

        // Calculate remaining players needed
        const remainingPlayersNeeded = PLAYERS_PER_TEAM - team.players.length - 1; // -1 because we're about to buy this player
        const minimumRequiredBudget = remainingPlayersNeeded * MINIMUM_BID;

        // Check if after this bid, team will have enough budget for remaining players
        const budgetAfterBid = team.budget - currentBid;
        if (budgetAfterBid < minimumRequiredBudget) {
            alert(
                `Team ${team.name} cannot bid ₹${currentBid.toLocaleString()} on this player.\n\n` +
                `After this bid, the team will have ₹${budgetAfterBid.toLocaleString()} remaining, ` +
                `but needs at least ₹${minimumRequiredBudget.toLocaleString()} to buy ${remainingPlayersNeeded} more player(s) at minimum bid (₹${MINIMUM_BID.toLocaleString()} each).\n\n` +
                `Maximum allowed bid: ₹${(team.budget - minimumRequiredBudget).toLocaleString()}`
            );
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
            const { error: insertError } = await supabase.from('auction_players').insert({
                session_id: sessionId,
                team_id: dbTeam.id,
                player_name: currentPlayer.name,
                bid_amount: currentBid
            });

            if (insertError) {
                console.error('Error inserting player:', insertError);
                throw insertError;
            }

            // Immediately update boughtPlayerNames to prevent player from appearing in skipped list
            setBoughtPlayerNames(prev => new Set([...prev, currentPlayer.name]));

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

            // Update local state immediately for instant UI update
            setCurrentPlayerIndex(nextIndex);

            await supabase
                .from('auction_sessions')
                .update({
                    current_player_index: nextIndex
                })
                .eq('id', sessionId);

            // Reset UI state
            const newMinimum = MINIMUM_BID;
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
            // Check if this is the last player
            const isLastPlayer = currentPlayerIndex >= players.length - 1;

            if (isLastPlayer) {
                // When skipping the last player, check for skipped players
                // Get all bought players to calculate skipped ones
                const { data: boughtPlayersData } = await supabase
                    .from('auction_players')
                    .select('player_name')
                    .eq('session_id', sessionId);

                const boughtPlayerNames = new Set(
                    (boughtPlayersData || []).map((p: { player_name: string }) => p.player_name)
                );

                // Calculate skipped players (all players that were not bought)
                const skippedPlayersList = players.filter(
                    player => !boughtPlayerNames.has(player.name)
                );

                if (skippedPlayersList.length > 0) {
                    // Switch to skipped players mode
                    if (!isSkippedPlayersMode && allPlayers.length === 0) {
                        setAllPlayers([...players]);
                    }
                    setPlayers(skippedPlayersList);
                    setCurrentPlayerIndex(0);
                    setSkippedPlayers(skippedPlayersList);
                    setIsSkippedPlayersMode(true);

                    // Update database to start from index 0 for skipped players
                    await supabase
                        .from('auction_sessions')
                        .update({
                            current_player_index: 0
                        })
                        .eq('id', sessionId);

                    // Reset UI state for first skipped player
                    const newMinimum = MINIMUM_BID;
                    setCurrentBid(newMinimum);
                    setSelectedTeamId(null);
                } else {
                    // No skipped players, mark auction as complete
                    const finalIndex = players.length - 1;
                    setCurrentPlayerIndex(finalIndex);
                    setAuctionComplete(true);

                    await supabase
                        .from('auction_sessions')
                        .update({
                            current_player_index: finalIndex,
                            is_complete: true
                        })
                        .eq('id', sessionId);
                }
            } else {
                // Move to next player
                const nextIndex = currentPlayerIndex + 1;

                // Update local state immediately for instant UI update
                setCurrentPlayerIndex(nextIndex);

                // Update database
                await supabase
                    .from('auction_sessions')
                    .update({
                        current_player_index: nextIndex
                    })
                    .eq('id', sessionId);

                // Reset UI state
                const newMinimum = MINIMUM_BID;
                setCurrentBid(newMinimum);
                setSelectedTeamId(null);
            }
        } catch (error) {
            console.error('Error skipping player:', error);
            alert('Failed to save auction state. Please try again.');
            // Revert local state on error
            // The real-time subscription will sync the correct state
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

        try {
            // Get the list of skipped players (all players not bought)
            const skippedList = skippedPlayers.length > 0
                ? skippedPlayers
                : getCurrentSkippedPlayers();

            // Find the player's index in the skipped players list
            const playerIndex = skippedList.findIndex(p => p.name === playerName);
            if (playerIndex === -1) {
                alert('Player not found in skipped players list.');
                return;
            }

            // If not already in skipped players mode, switch to it
            if (!isSkippedPlayersMode) {
                // Store all current players
                setAllPlayers([...players]);
                // Switch to skipped players only
                setPlayers(skippedList);
                setIsSkippedPlayersMode(true);
            }

            // Update database session
            await supabase
                .from('auction_sessions')
                .update({
                    current_player_index: playerIndex
                })
                .eq('id', sessionId);

            // Update local state to the specific player index
            setCurrentPlayerIndex(playerIndex);

            // Reset bid to minimum
            const newMinimum = MINIMUM_BID;
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
        // Set loading state
        setPdfGeneratingTeamId(team.id);
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
            let logo2DataUrl = '';
            let logo2Height = 0;

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
                const teamLogoPath = getTeamLogo(team.id, sessionName);
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

            // Load logo2.png
            try {
                const response = await fetch('/logo2.png');
                const blob = await response.blob();
                const reader = new FileReader();

                await new Promise<void>((resolve) => {
                    reader.onload = () => {
                        logo2DataUrl = reader.result as string;
                        const logoImg = document.createElement('img');
                        logoImg.onload = () => {
                            logo2Height = (logoImg.height / logoImg.width) * logoWidth;
                            resolve();
                        };
                        logoImg.onerror = () => resolve(); // Continue if logo2 fails
                        logoImg.src = logo2DataUrl;
                    };
                    reader.onerror = () => resolve(); // Continue if logo2 fails
                    reader.readAsDataURL(blob);
                });
            } catch (logo2Error) {
                console.error('Error loading logo2:', logo2Error);
            }

            // Add app logo (left side)
            if (appLogoDataUrl) {
                pdf.addImage(appLogoDataUrl, 'JPEG', margin, logoY, logoWidth, appLogoHeight);
                maxHeaderHeight = Math.max(maxHeaderHeight, appLogoHeight);
            }

            // Add logo2.png (right side) - same Y position as app logo (bigger size)
            if (logo2DataUrl) {
                const logo2Width = logoWidth * 1.3; // 30% bigger than app logo
                const logo2HeightBigger = (logo2Height / logoWidth) * logo2Width; // Maintain aspect ratio
                const logo2X = pageWidth - margin - logo2Width; // Right aligned
                pdf.addImage(logo2DataUrl, 'PNG', logo2X, logoY, logo2Width, logo2HeightBigger);
                maxHeaderHeight = Math.max(maxHeaderHeight, logo2HeightBigger);
            }

            // "Team Report" text below app logo (left aligned)
            pdf.setFontSize(22);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('helvetica', 'bold');
            const teamReportY = logoY + (appLogoHeight || 15) + 8;
            pdf.text('Team Report', margin, teamReportY);

            // Add team logo below "Team Report" (left aligned, larger size)
            let teamLogoBelowY = teamReportY + 6; // Small gap below "Team Report" text
            if (teamLogoDataUrl) {
                const teamLogoBelowWidth = 50; // Increased width for logo below Team Report (was 30)
                const teamLogoBelowHeight = (teamLogoHeight / logoWidth) * teamLogoBelowWidth;
                pdf.addImage(teamLogoDataUrl, 'JPEG', margin, teamLogoBelowY, teamLogoBelowWidth, teamLogoBelowHeight);
                teamLogoBelowY += teamLogoBelowHeight + 8; // Increased gap to 8mm between logo and text
            } else {
                teamLogoBelowY += 8;
            }

            // Team Name below team logo (left aligned)
            pdf.setFontSize(18);
            pdf.setTextColor(220, 38, 38); // Red color
            pdf.setFont('helvetica', 'bold');
            pdf.text(team.name, margin, teamLogoBelowY);
            let leftSideY = teamLogoBelowY + 6; // Gap between team name and owner name

            // Owner Name below team name (left aligned)
            if (team.ownerName) {
                pdf.setFontSize(12);
                pdf.setTextColor(0, 0, 0); // Black color
                pdf.setFont('helvetica', 'normal');
                pdf.text(`Owner: ${team.ownerName}`, margin, leftSideY);
                leftSideY += 4;
            }

            // Update maxHeaderHeight to include left side content
            maxHeaderHeight = Math.max(maxHeaderHeight, leftSideY);

            // Move to next section (reduced gap)
            yPosition = headerStartY + maxHeaderHeight + 5; // Reduced from 10 to 5

            // Budget Information Table
            // Calculate spent as sum of all player bid amounts (more accurate)
            const totalSpent = team.players.reduce((sum, player) => sum + (player.bidAmount || 0), 0);
            const initialBudget = team.budget + totalSpent;
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
                ['Total Budget', formatNumber(initialBudget)],
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
                // Adjusted column widths: S.No (5mm), Photo (fixed size matching auction UI), Name (flexible), Amount (35mm fixed)
                const sNoWidth = 5; // Reduced from 10mm
                // Fixed image size matching auction UI: w-72 (288px ≈ 76mm) h-96 (384px ≈ 102mm)
                const imageWidth = 40; // Reduced width for player images
                const imageHeight = 54; // Reduced height for player images (maintains 3:4 aspect ratio)
                const imageRowHeight = imageHeight + 4; // Image height + 2mm padding top and bottom
                const amountWidth = 35;
                const nameWidth = playerTableWidth - sNoWidth - imageWidth - amountWidth - 2; // Extra 2mm for spacing

                // Table Header
                pdf.setFillColor(220, 38, 38);
                pdf.rect(playerTableStartX, yPosition, playerTableWidth, playerRowHeight, 'F');
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.text('No', playerTableStartX + sNoWidth / 2, yPosition + 5.5, { align: 'center' });
                pdf.text('Photo', playerTableStartX + sNoWidth + imageWidth / 2, yPosition + 5.5, { align: 'center' });
                pdf.text('Player Name', playerTableStartX + sNoWidth + imageWidth + nameWidth / 2, yPosition + 5.5, { align: 'center' });
                pdf.text('Amount', playerTableStartX + sNoWidth + imageWidth + nameWidth + amountWidth / 2, yPosition + 5.5, { align: 'center' });
                yPosition += playerRowHeight;

                // Fetch player photos from player pool
                const { data: playerPoolData } = await supabase
                    .from('auction_player_pool')
                    .select('name, photo')
                    .eq('session_id', sessionId || '');

                const playerPhotoMap = new Map<string, string>();
                if (playerPoolData) {
                    for (const poolPlayer of playerPoolData) {
                        if (poolPlayer.photo) {
                            playerPhotoMap.set(poolPlayer.name, poolPlayer.photo);
                        }
                    }
                }

                // Player Rows
                pdf.setTextColor(0, 0, 0);
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(9);

                for (let index = 0; index < team.players.length; index++) {
                    const player = team.players[index];

                    // Determine row height - use fixed image row height if photo exists, otherwise default
                    const playerPhotoUrl = playerPhotoMap.get(player.name);
                    const currentRowHeight = playerPhotoUrl ? imageRowHeight : playerRowHeight;

                    // Check if we need a new page
                    if (yPosition + currentRowHeight > pageHeight - 30) {
                        pdf.addPage();
                        yPosition = margin;
                    }

                    // Alternate row colors
                    if (index % 2 === 0) {
                        pdf.setFillColor(250, 250, 250);
                    } else {
                        pdf.setFillColor(255, 255, 255);
                    }
                    pdf.rect(playerTableStartX, yPosition, playerTableWidth, currentRowHeight, 'F');

                    // S.No - centered vertically in the row
                    pdf.text(String(index + 1), playerTableStartX + sNoWidth / 2, yPosition + currentRowHeight / 2, { align: 'center' });

                    // Player Photo - if available, use fixed size matching auction UI
                    if (playerPhotoUrl) {
                        try {
                            const processedPhotoUrl = processImageUrl(playerPhotoUrl);
                            if (processedPhotoUrl) {
                                // Fetch and convert image to data URL
                                const imageResponse = await fetch(processedPhotoUrl);
                                const imageBlob = await imageResponse.blob();
                                const imageReader = new FileReader();

                                const imageDataUrl = await new Promise<string>((resolve, reject) => {
                                    imageReader.onload = () => resolve(imageReader.result as string);
                                    imageReader.onerror = reject;
                                    imageReader.readAsDataURL(imageBlob);
                                });

                                // Load image to get dimensions for aspect ratio calculation
                                const img = document.createElement('img');
                                await new Promise<void>((resolve, reject) => {
                                    img.onload = () => resolve();
                                    img.onerror = reject;
                                    img.src = imageDataUrl;
                                });

                                // Create a canvas to apply browser's EXIF rotation automatically
                                // This ensures the PDF image matches what the browser displays
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                if (!ctx) {
                                    throw new Error('Could not get canvas context');
                                }

                                // Set canvas size to match the displayed image (browser applies EXIF rotation)
                                // The displayed dimensions reflect the browser's auto-rotation
                                canvas.width = img.width;
                                canvas.height = img.height;

                                // Draw the image on canvas - browser's EXIF rotation is automatically applied
                                ctx.drawImage(img, 0, 0);

                                // Get the correctly oriented image data from canvas
                                const orientedImageDataUrl = canvas.toDataURL('image/jpeg', 0.95);

                                // Use displayed dimensions (which include EXIF rotation) for aspect ratio
                                const originalWidth = img.width; // Displayed width (after EXIF rotation)
                                const originalHeight = img.height; // Displayed height (after EXIF rotation)
                                const aspectRatio = originalWidth / originalHeight;

                                // Calculate dimensions that fit within fixed size while maintaining aspect ratio
                                // Use the fixed dimensions as maximum bounds
                                const maxWidth = imageWidth - 2; // Leave 1mm padding on each side
                                const maxHeight = imageHeight - 2; // Leave 1mm padding top and bottom

                                let finalWidth, finalHeight;

                                // For portrait images (height > width, aspectRatio < 1), fit to height first
                                // For landscape images (width > height, aspectRatio > 1), fit to width first
                                if (aspectRatio < 1) {
                                    // Portrait: fit to height constraint first to preserve vertical orientation
                                    finalHeight = maxHeight;
                                    finalWidth = maxHeight * aspectRatio;
                                    // If width exceeds max width, scale down based on width
                                    if (finalWidth > maxWidth) {
                                        finalWidth = maxWidth;
                                        finalHeight = maxWidth / aspectRatio;
                                    }
                                } else {
                                    // Landscape: fit to width constraint first
                                    finalWidth = maxWidth;
                                    finalHeight = maxWidth / aspectRatio;
                                    // If height exceeds max height, scale down based on height
                                    if (finalHeight > maxHeight) {
                                        finalHeight = maxHeight;
                                        finalWidth = maxHeight * aspectRatio;
                                    }
                                }

                                // Center the image in the cell
                                const imageX = playerTableStartX + sNoWidth + (imageWidth - finalWidth) / 2;
                                const imageY = yPosition + (imageRowHeight - finalHeight) / 2;

                                // Add image from canvas (which has EXIF rotation applied) to match browser display
                                pdf.addImage(orientedImageDataUrl, 'JPEG', imageX, imageY, finalWidth, finalHeight);
                            }
                        } catch (imageError) {
                            console.error(`Error loading image for ${player.name}:`, imageError);
                            // Continue without image if it fails to load
                        }
                    }

                    // Player Name - truncate if too long, centered vertically
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
                    pdf.text(displayName, playerTableStartX + sNoWidth + imageWidth + 2, yPosition + currentRowHeight / 2);

                    // Bid Amount - right aligned within its column, centered vertically
                    const bidAmount = player.bidAmount || 0;
                    const bidText = formatNumber(bidAmount);
                    // Calculate max width for amount (leave 2mm padding on right)
                    const maxAmountWidth = amountWidth - 4;
                    const displayAmount = bidText;
                    if (pdf.getTextWidth(bidText) > maxAmountWidth) {
                        // If amount is too long, use smaller font
                        pdf.setFontSize(8);
                    }
                    const amountX = playerTableStartX + sNoWidth + imageWidth + nameWidth + amountWidth - 2;
                    pdf.text(displayAmount, amountX, yPosition + currentRowHeight / 2, { align: 'right' });
                    // Reset font size
                    pdf.setFontSize(9);

                    // Increment position by row height
                    yPosition += currentRowHeight;
                }

                // Total row
                if (yPosition > pageHeight - 20) {
                    pdf.addPage();
                    yPosition = margin;
                }

                pdf.setFillColor(240, 240, 240);
                pdf.rect(playerTableStartX, yPosition, playerTableWidth, playerRowHeight, 'F');
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(10);
                pdf.text('Total', playerTableStartX + sNoWidth + imageWidth + nameWidth / 2, yPosition + 5.5, { align: 'center' });
                const totalBidAmount = team.players.reduce((sum, p) => sum + (p.bidAmount || 0), 0);
                const totalAmountText = formatNumber(totalBidAmount);
                // Ensure total amount fits
                const maxTotalWidth = amountWidth - 4;
                if (pdf.getTextWidth(totalAmountText) > maxTotalWidth) {
                    pdf.setFontSize(9);
                }
                const totalAmountX = playerTableStartX + sNoWidth + imageWidth + nameWidth + amountWidth - 2;
                pdf.text(totalAmountText, totalAmountX, yPosition + 5.5, { align: 'right' });
            }

            // Save PDF
            pdf.save(`${team.name.replace(/\s+/g, '_')}_Team_Report.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            // Clear loading state
            setPdfGeneratingTeamId(null);
        }
    };

    const generateTopBiddedPlayersPDF = async (gender: 'M' | 'F') => {
        // Set loading state
        setPdfGeneratingTopPlayers(gender);
        try {
            // Use the correct session ID based on gender
            // Men's session: ebd10b54-366d-4986-bdea-fa4cd35fe000
            // Women's session: d4dbe601-381a-4dcf-b131-8919cbbc9f17
            const targetSessionId = gender === 'M'
                ? 'ebd10b54-366d-4986-bdea-fa4cd35fe000'
                : 'd4dbe601-381a-4dcf-b131-8919cbbc9f17';

            // Fetch top 5 bidded players for the specified session
            // Note: We don't filter by gender since session_id already determines gender
            // (Men's session = M, Women's session = F)
            const { data: topPlayers, error: fetchError } = await supabase
                .from('auction_players')
                .select(`
                    player_name,
                    bid_amount,
                    photo,
                    age
                `)
                .eq('session_id', targetSessionId)
                .order('bid_amount', { ascending: false })
                .limit(5);

            if (fetchError) {
                console.error('Error fetching top players:', fetchError);
                throw fetchError;
            }

            if (!topPlayers || topPlayers.length === 0) {
                console.log('No players found for session:', targetSessionId, 'gender:', gender);
                // Try to get count of all players in this session for debugging
                const { count } = await supabase
                    .from('auction_players')
                    .select('*', { count: 'exact', head: true })
                    .eq('session_id', targetSessionId);
                console.log('Total players in session:', count);
                alert(`No ${gender === 'M' ? 'male' : 'female'} players have been bid on yet in this session.`);
                return;
            }

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 15;
            let yPosition = margin;

            // Header section
            const headerStartY = yPosition;
            let maxHeaderHeight = 0;
            const logoWidth = 50;
            const logoY = headerStartY;

            // Load logos
            let appLogoHeight = 0;
            let logo2DataUrl = '';
            let logo2Height = 0;

            // Load app logo
            try {
                const response = await fetch('/logo.jpeg');
                const blob = await response.blob();
                const reader = new FileReader();

                await new Promise<void>((resolve, reject) => {
                    reader.onload = () => {
                        const appLogoDataUrl = reader.result as string;
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

            // Load logo2.png
            try {
                const response = await fetch('/logo2.png');
                const blob = await response.blob();
                const reader = new FileReader();

                await new Promise<void>((resolve) => {
                    reader.onload = () => {
                        logo2DataUrl = reader.result as string;
                        const logoImg = document.createElement('img');
                        logoImg.onload = () => {
                            logo2Height = (logoImg.height / logoImg.width) * logoWidth;
                            resolve();
                        };
                        logoImg.onerror = () => resolve();
                        logoImg.src = logo2DataUrl;
                    };
                    reader.onerror = () => resolve();
                    reader.readAsDataURL(blob);
                });
            } catch (logo2Error) {
                console.error('Error loading logo2:', logo2Error);
            }

            // Add app logo (left side)
            if (appLogoHeight > 0) {
                const response = await fetch('/logo.jpeg');
                const blob = await response.blob();
                const reader = new FileReader();
                await new Promise<void>((resolve) => {
                    reader.onload = () => {
                        pdf.addImage(reader.result as string, 'JPEG', margin, logoY, logoWidth, appLogoHeight);
                        resolve();
                    };
                    reader.onerror = () => resolve();
                    reader.readAsDataURL(blob);
                });
                maxHeaderHeight = Math.max(maxHeaderHeight, appLogoHeight);
            }

            // Add logo2.png (right side)
            let logo2HeightBigger = 0;
            if (logo2DataUrl) {
                const logo2Width = logoWidth * 1.3;
                logo2HeightBigger = (logo2Height / logoWidth) * logo2Width;
                const logo2X = pageWidth - margin - logo2Width;
                pdf.addImage(logo2DataUrl, 'PNG', logo2X, logoY, logo2Width, logo2HeightBigger);
                maxHeaderHeight = Math.max(maxHeaderHeight, logo2HeightBigger);
            }

            // Title - moved down to avoid overlap with right logo
            pdf.setFontSize(22);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('helvetica', 'bold');
            // Calculate max header height including logo2
            const maxLogoHeight = Math.max(appLogoHeight || 15, logo2HeightBigger || 0);
            const titleY = logoY + maxLogoHeight + 12; // Increased gap to avoid overlap
            const titleText = `Top 5 Bidded ${gender === 'M' ? 'Male' : 'Female'} Players`;
            pdf.text(titleText, margin, titleY);
            yPosition = titleY + 12;

            // Players Table
            const tableStartX = margin;
            const tableWidth = pageWidth - (2 * margin);
            const rowHeight = 8;
            const sNoWidth = 5;
            const imageWidth = 40;
            const imageHeight = 54;
            const imageRowHeight = imageHeight + 4;
            const amountWidth = 35;
            const nameWidth = tableWidth - sNoWidth - imageWidth - amountWidth - 2;

            // Table Header
            pdf.setFillColor(220, 38, 38);
            pdf.rect(tableStartX, yPosition, tableWidth, rowHeight, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.text('No', tableStartX + sNoWidth / 2, yPosition + 5.5, { align: 'center' });
            pdf.text('Photo', tableStartX + sNoWidth + imageWidth / 2, yPosition + 5.5, { align: 'center' });
            pdf.text('Player Name', tableStartX + sNoWidth + imageWidth + nameWidth / 2, yPosition + 5.5, { align: 'center' });
            pdf.text('Bid Amount', tableStartX + sNoWidth + imageWidth + nameWidth + amountWidth / 2, yPosition + 5.5, { align: 'center' });
            yPosition += rowHeight;

            // Fetch player photos from player pool using the correct session ID
            const { data: playerPoolData } = await supabase
                .from('auction_player_pool')
                .select('name, photo')
                .eq('session_id', targetSessionId);

            const playerPhotoMap = new Map<string, string>();
            if (playerPoolData) {
                for (const poolPlayer of playerPoolData) {
                    if (poolPlayer.photo) {
                        playerPhotoMap.set(poolPlayer.name, poolPlayer.photo);
                    }
                }
            }

            // Helper function to format numbers
            const formatNumber = (num: number) => {
                return num.toLocaleString('en-US');
            };

            // Player Rows
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);

            for (let index = 0; index < topPlayers.length; index++) {
                const player = topPlayers[index];
                const playerPhotoUrl = player.photo || playerPhotoMap.get(player.player_name);
                const currentRowHeight = playerPhotoUrl ? imageRowHeight : rowHeight;

                // Check if we need a new page
                if (yPosition + currentRowHeight > pageHeight - 30) {
                    pdf.addPage();
                    yPosition = margin;
                }

                // Alternate row colors
                if (index % 2 === 0) {
                    pdf.setFillColor(250, 250, 250);
                } else {
                    pdf.setFillColor(255, 255, 255);
                }
                pdf.rect(tableStartX, yPosition, tableWidth, currentRowHeight, 'F');

                // S.No
                pdf.text(String(index + 1), tableStartX + sNoWidth / 2, yPosition + currentRowHeight / 2, { align: 'center' });

                // Player Photo
                if (playerPhotoUrl) {
                    try {
                        const processedPhotoUrl = processImageUrl(playerPhotoUrl);
                        if (processedPhotoUrl) {
                            const imageResponse = await fetch(processedPhotoUrl);
                            const imageBlob = await imageResponse.blob();
                            const imageReader = new FileReader();

                            const imageDataUrl = await new Promise<string>((resolve, reject) => {
                                imageReader.onload = () => resolve(imageReader.result as string);
                                imageReader.onerror = reject;
                                imageReader.readAsDataURL(imageBlob);
                            });

                            const img = document.createElement('img');
                            await new Promise<void>((resolve, reject) => {
                                img.onload = () => resolve();
                                img.onerror = reject;
                                img.src = imageDataUrl;
                            });

                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                canvas.width = img.width;
                                canvas.height = img.height;
                                ctx.drawImage(img, 0, 0);
                                const orientedImageDataUrl = canvas.toDataURL('image/jpeg', 0.95);

                                const originalWidth = img.width;
                                const originalHeight = img.height;
                                const aspectRatio = originalWidth / originalHeight;

                                const maxWidth = imageWidth - 2;
                                const maxHeight = imageHeight - 2;

                                let finalWidth, finalHeight;
                                if (aspectRatio < 1) {
                                    finalHeight = maxHeight;
                                    finalWidth = maxHeight * aspectRatio;
                                    if (finalWidth > maxWidth) {
                                        finalWidth = maxWidth;
                                        finalHeight = maxWidth / aspectRatio;
                                    }
                                } else {
                                    finalWidth = maxWidth;
                                    finalHeight = maxWidth / aspectRatio;
                                    if (finalHeight > maxHeight) {
                                        finalHeight = maxHeight;
                                        finalWidth = maxHeight * aspectRatio;
                                    }
                                }

                                const imageX = tableStartX + sNoWidth + (imageWidth - finalWidth) / 2;
                                const imageY = yPosition + (imageRowHeight - finalHeight) / 2;

                                pdf.addImage(orientedImageDataUrl, 'JPEG', imageX, imageY, finalWidth, finalHeight);
                            }
                        }
                    } catch (imageError) {
                        console.error(`Error loading image for ${player.player_name}:`, imageError);
                    }
                }

                // Player Name
                const playerText = player.player_name;
                const maxNameWidth = nameWidth - 4;
                let displayName = playerText;
                const textWidth = pdf.getTextWidth(playerText);
                if (textWidth > maxNameWidth) {
                    let truncated = playerText;
                    while (pdf.getTextWidth(truncated + '...') > maxNameWidth && truncated.length > 0) {
                        truncated = truncated.slice(0, -1);
                    }
                    displayName = truncated + '...';
                }
                pdf.text(displayName, tableStartX + sNoWidth + imageWidth + 2, yPosition + currentRowHeight / 2);

                // Bid Amount
                const bidAmount = Number(player.bid_amount) || 0;
                const bidText = formatNumber(bidAmount);
                const maxAmountWidth = amountWidth - 4;
                if (pdf.getTextWidth(bidText) > maxAmountWidth) {
                    pdf.setFontSize(8);
                }
                const amountX = tableStartX + sNoWidth + imageWidth + nameWidth + amountWidth - 2;
                pdf.text(bidText, amountX, yPosition + currentRowHeight / 2, { align: 'right' });
                pdf.setFontSize(9);

                yPosition += currentRowHeight;
            }

            // Total row
            if (yPosition > pageHeight - 20) {
                pdf.addPage();
                yPosition = margin;
            }

            pdf.setFillColor(240, 240, 240);
            pdf.rect(tableStartX, yPosition, tableWidth, rowHeight, 'F');
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.text('Total', tableStartX + sNoWidth + imageWidth + nameWidth / 2, yPosition + 5.5, { align: 'center' });
            const totalBidAmount = topPlayers.reduce((sum, p) => sum + (Number(p.bid_amount) || 0), 0);
            const totalAmountText = formatNumber(totalBidAmount);
            if (pdf.getTextWidth(totalAmountText) > amountWidth - 4) {
                pdf.setFontSize(9);
            }
            const totalAmountX = tableStartX + sNoWidth + imageWidth + nameWidth + amountWidth - 2;
            pdf.text(totalAmountText, totalAmountX, yPosition + 5.5, { align: 'right' });

            // Save PDF
            const genderLabel = gender === 'M' ? 'Male' : 'Female';
            pdf.save(`Top_5_Bidded_${genderLabel}_Players.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setPdfGeneratingTopPlayers(null);
        }
    };

    // Show loading state
    // Show loading only if user can view (or we're still checking access)
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Checking access...</p>
                </div>
            </div>
        );
    }

    // Show "Stay tuned" if user cannot view
    if (!canView) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
                    <div className="text-6xl mb-4">⏰</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Stay Tuned!</h2>
                    <p className="text-gray-600 mb-6">
                        The auction is not yet live. Please check back soon!
                    </p>
                    <button
                        onClick={() => router.back()}
                        className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (loadingState || !currentPlayer || players.length === 0) {
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
                                        key={`team-dynamics-${team.id}-${sessionName || 'default'}`}
                                        src={getTeamLogo(team.id, sessionName)}
                                        alt={`${team.name} logo`}
                                        width={48}
                                        height={48}
                                        unoptimized
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
                                    disabled={pdfGeneratingTeamId === team.id}
                                    className="w-full mt-4 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {pdfGeneratingTeamId === team.id ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Generating PDF...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Download PDF
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Top 5 Bidded Players PDF Downloads */}
                    <div className="mt-8 bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Top 5 Bidded Players Reports</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => generateTopBiddedPlayersPDF('M')}
                                disabled={pdfGeneratingTopPlayers === 'M'}
                                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {pdfGeneratingTopPlayers === 'M' ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Generating PDF...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Download Top 5 Male Players PDF
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => generateTopBiddedPlayersPDF('F')}
                                disabled={pdfGeneratingTopPlayers === 'F'}
                                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {pdfGeneratingTopPlayers === 'F' ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Generating PDF...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Download Top 5 Female Players PDF
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Skipped Players Section */}
                    {skippedPlayers.length > 0 && (
                        <div className="mt-8 bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Skipped Players ({skippedPlayers.length})</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                                {skippedPlayers.map((player, idx) => (
                                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                        <div className="text-sm font-semibold text-gray-900">{player.name}</div>
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
                    <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 flex-shrink-0">
                        <span className="md:hidden">Auction</span>
                        <span className="hidden md:inline">{sessionName ? `${sessionName} Auction` : 'Auction'}</span>
                    </h1>
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4 items-start">
                    {/* Left Sidebar - Teams Overview (Desktop) */}
                    <div className="hidden lg:block lg:col-span-1">
                        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 md:p-5 space-y-4">
                            {/* Team Dynamics Section */}
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Team Dynamics</h2>

                                {/* Teams List */}
                                <div className="space-y-3">
                                    {teams.map(team => {
                                        // Calculate spent as sum of all player bid amounts (more accurate)
                                        const totalSpent = team.players.reduce((sum, player) => sum + (player.bidAmount || 0), 0);
                                        const initialBudget = team.budget + totalSpent;

                                        return (
                                            <div key={team.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Image
                                                            key={`team-budget-${team.id}-${sessionName || 'default'}`}
                                                            src={getTeamLogo(team.id, sessionName)}
                                                            alt={`${team.name} logo`}
                                                            width={32}
                                                            height={32}
                                                            unoptimized
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
                                                            style={{ width: `${initialBudget > 0 ? Math.min((totalSpent / initialBudget) * 100, 100) : 0}%` }}
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
                        <div className="bg-white rounded-xl border-2 border-gray-200 p-3 md:p-4 lg:mt-0">
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
                                        <div key={`player-image-${currentPlayer.name}-${currentPlayerIndex}`} className="relative w-full max-w-xs h-80 md:w-72 md:h-96 rounded-xl overflow-hidden border-4 border-white shadow-2xl bg-gray-100">
                                            {/* Automatically converts Google Drive links to direct image URLs */}
                                            {(() => {
                                                const imageUrl = processImageUrl(currentPlayer.photo);
                                                if (!imageUrl) return null;

                                                // Simple cache-busting: use player index only (changes when player changes)
                                                // This ensures images reload when switching players without excessive parameters
                                                const finalImageUrl = imageUrl.includes('?')
                                                    ? `${imageUrl}&_idx=${currentPlayerIndex}`
                                                    : `${imageUrl}?_idx=${currentPlayerIndex}`;

                                                // Use regular img tag for all URLs (proxy API route or external URLs)
                                                // Next.js Image doesn't support query strings in local patterns
                                                return (
                                                    <img
                                                        ref={imageRef}
                                                        key={`img-${currentPlayer.name}-${currentPlayerIndex}`}
                                                        src={finalImageUrl}
                                                        alt={currentPlayer.name}
                                                        className="object-cover w-full h-full"
                                                        loading="eager"
                                                        decoding="async"
                                                        onError={(e) => {
                                                            const target = e.target as HTMLImageElement;
                                                            target.style.display = 'none';
                                                            const parent = target.parentElement;
                                                            if (parent && !parent.querySelector('.placeholder')) {
                                                                const placeholder = document.createElement('div');
                                                                placeholder.className = 'placeholder w-full h-full flex items-center justify-center bg-gray-200 text-gray-400 text-xs';
                                                                placeholder.textContent = 'Image unavailable';
                                                                parent.appendChild(placeholder);
                                                            }
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
                                        {/* Played Previous MBBL Season - Only for Men's auction */}
                                        {currentPlayer.played_s1 && sessionName && !sessionName.toLowerCase().includes('women') && (
                                            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 md:p-5 border border-orange-200">
                                                <div className="text-sm md:text-base font-semibold text-gray-500 uppercase tracking-wide mb-2">Played Previous MBBL Season</div>
                                                <div className="text-lg md:text-xl text-gray-900 font-medium">{currentPlayer.played_s1}</div>
                                            </div>
                                        )}

                                        {/* Experience */}
                                        {currentPlayer.experience && (
                                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 md:p-5 border border-gray-200">
                                                <div className="text-sm md:text-base font-semibold text-gray-500 uppercase tracking-wide mb-2">Experience</div>
                                                <div className="text-lg md:text-xl text-gray-900 font-medium">{currentPlayer.experience}</div>
                                            </div>
                                        )}

                                        {/* Active Sport - Below Experience */}
                                        {currentPlayer.active_sport && (
                                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 md:p-5 border border-blue-200">
                                                <div className="text-lg md:text-xl text-gray-900 font-medium">{currentPlayer.active_sport}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
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

                            {/* Custom Bid Input */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Enter Custom Bid Amount</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">₹</span>
                                    <input
                                        type="text"
                                        value={bidInputValue}
                                        onChange={handleBidInputChange}
                                        onBlur={handleBidInputBlur}
                                        disabled={!canEdit}
                                        className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg text-lg font-semibold text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder="Enter amount"
                                    />
                                </div>
                            </div>

                            <div className="text-sm text-gray-500 text-center">
                                Min: ₹{currentMinimumBid.toLocaleString()} | Increase: ₹{getBidIncrement(currentBid).toLocaleString()}
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
                                                    key={`team-${team.id}-${sessionName || 'default'}`}
                                                    src={getTeamLogo(team.id, sessionName)}
                                                    alt={`${team.name} logo`}
                                                    width={40}
                                                    height={40}
                                                    className="object-contain flex-shrink-0"
                                                    unoptimized
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
                            // Calculate spent as sum of all player bid amounts (more accurate than using TOTAL_AMOUNT)
                            const totalSpent = team.players.reduce((sum, player) => sum + (player.bidAmount || 0), 0);
                            const avgPlayerCost = team.players.length > 0 ? totalSpent / team.players.length : 0;
                            // Calculate initial budget: remaining + spent
                            const initialBudget = team.budget + totalSpent;

                            return (
                                <div key={team.id} className="bg-white border-2 border-gray-200 rounded-xl p-4">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <Image
                                                key={`team-top-${team.id}-${sessionName || 'default'}`}
                                                src={getTeamLogo(team.id, sessionName)}
                                                alt={`${team.name} logo`}
                                                width={40}
                                                height={40}
                                                className="object-contain flex-shrink-0"
                                                unoptimized
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
                                            <span>{initialBudget > 0 ? ((totalSpent / initialBudget) * 100).toFixed(1) : '0.0'}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-red-600 h-2 rounded-full transition-all"
                                                style={{ width: `${initialBudget > 0 ? Math.min((totalSpent / initialBudget) * 100, 100) : 0}%` }}
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

                        // Sort by bid amount (highest first) and take top 5
                        const top5Players = allBoughtPlayers
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
                                                        src={getTeamLogo(player.teamId, sessionName)}
                                                        alt={`${player.teamName} logo`}
                                                        width={20}
                                                        height={20}
                                                        className="object-contain"
                                                    />
                                                    <span>{player.teamName}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        No players found
                                    </div>
                                )}

                                {/* PDF Download Buttons */}
                                <div className="mt-6 space-y-3 pt-4 border-t border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Download Top 5 Reports</h3>
                                    <button
                                        onClick={() => generateTopBiddedPlayersPDF('M')}
                                        disabled={pdfGeneratingTopPlayers === 'M'}
                                        className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {pdfGeneratingTopPlayers === 'M' ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Generating PDF...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Top 5 Male Players PDF
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => generateTopBiddedPlayersPDF('F')}
                                        disabled={pdfGeneratingTopPlayers === 'F'}
                                        className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {pdfGeneratingTopPlayers === 'F' ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                Generating PDF...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                Top 5 Female Players PDF
                                            </>
                                        )}
                                    </button>
                                </div>
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
                    {(() => {
                        // Use frozen list if available, otherwise use skippedPlayers state if available, otherwise calculate from current players
                        const skippedList = frozenSkippedPlayers.length > 0
                            ? frozenSkippedPlayers
                            : (skippedPlayers.length > 0
                                ? skippedPlayers
                                : getCurrentSkippedPlayers());
                        return skippedList;
                    })().length > 0 ? (
                        <div className="space-y-3">
                            {(() => {
                                const skippedList = frozenSkippedPlayers.length > 0
                                    ? frozenSkippedPlayers
                                    : (skippedPlayers.length > 0
                                        ? skippedPlayers
                                        : getCurrentSkippedPlayers());
                                return skippedList;
                            })().map((player, idx) => (
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
                                            {canEdit && (
                                                <div className="text-xs text-red-600 mt-1 font-medium">
                                                    Tap to auction again
                                                </div>
                                            )}
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

                    {/* Button to start auction with skipped players */}
                    {canEdit && (() => {
                        const skippedList = frozenSkippedPlayers.length > 0
                            ? frozenSkippedPlayers
                            : (skippedPlayers.length > 0
                                ? skippedPlayers
                                : getCurrentSkippedPlayers());
                        return skippedList.length > 0 && !isSkippedPlayersMode ? (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <button
                                    onClick={async () => {
                                        try {
                                            // Store all current players if not already stored
                                            if (allPlayers.length === 0) {
                                                setAllPlayers([...players]);
                                            }

                                            // Switch to skipped players mode
                                            const skippedList = skippedPlayers.length > 0
                                                ? skippedPlayers
                                                : getCurrentSkippedPlayers();
                                            setPlayers(skippedList);
                                            setIsSkippedPlayersMode(true);

                                            // Reset to first skipped player
                                            setCurrentPlayerIndex(0);

                                            // Update database
                                            await supabase
                                                .from('auction_sessions')
                                                .update({
                                                    current_player_index: 0
                                                })
                                                .eq('id', sessionId);

                                            // Reset bid
                                            const newMinimum = MINIMUM_BID;
                                            setCurrentBid(newMinimum);
                                            setSelectedTeamId(null);

                                            // Close the sheet
                                            setIsSkippedPlayersSheetOpen(false);
                                        } catch (error) {
                                            console.error('Error starting skipped players auction:', error);
                                            alert('Failed to start skipped players auction. Please try again.');
                                        }
                                    }}
                                    className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                                >
                                    Start Auction with Skipped Players
                                </button>
                            </div>
                        ) : null;
                    })()}
                </div>
            </BottomSheet>
        </div>
    );
}


