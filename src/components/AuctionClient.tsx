"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabaseClient';
import BottomSheet from './BottomSheet';
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
    bowling_hand?: string; // Right/Left
    wing?: string; // Player wing/position
    flat_no?: string; // Flat number
    phone?: string; // Player phone number
    category?: string; // Player category
    player_order?: number; // Player order in the auction
}

interface Team {
    id: number;
    name: string;
    budget: number;
    players: Player[];
    ownerName?: string;
    ownerPhoto?: string; // Owner photo URL
    logoUrl?: string; // Custom logo URL from database
}


// Helper function to format numbers in Indian numbering system (1,00,000 instead of 100,000)
const formatIndianNumber = (num: number): string => {
    return num.toLocaleString('en-IN');
};

// Default values (used as fallback ONLY if settings not loaded and database has no value)
// These should rarely be used - always prefer database values
const DEFAULT_MINIMUM_BID = 2000; // Fallback only - will be overridden by database
const DEFAULT_PLAYERS_PER_TEAM = 11;

// Default bid increment function (used as fallback)
const getDefaultBidIncrement = (currentBid: number): number => {
    if (currentBid >= 700000) {
        return 50000;
    } else if (currentBid >= 400000) {
        return 30000;
    } else if (currentBid >= 200000) {
        return 20000;
    } else if (currentBid >= 100000) {
        return 10000;
    } else {
        return 5000;
    }
};

// Get bid increment based on settings
const getBidIncrementFromSettings = (currentBid: number, settings: {
    minimum_bid: number;
    players_per_team: number;
    default_bid_increment: number;
    bid_increment_1_threshold: number;
    bid_increment_1_amount: number;
    bid_increment_2_threshold: number;
    bid_increment_2_amount: number;
    bid_increment_3_threshold: number;
    bid_increment_3_amount: number;
    bid_increment_4_threshold: number;
    bid_increment_4_amount: number;
} | null): number => {
    if (!settings) {
        return getDefaultBidIncrement(currentBid);
    }

    // Check thresholds in descending order (highest first)
    if (currentBid >= settings.bid_increment_4_threshold) {
        return settings.bid_increment_4_amount;
    } else if (currentBid >= settings.bid_increment_3_threshold) {
        return settings.bid_increment_3_amount;
    } else if (currentBid >= settings.bid_increment_2_threshold) {
        return settings.bid_increment_2_amount;
    } else if (currentBid >= settings.bid_increment_1_threshold) {
        return settings.bid_increment_1_amount;
    } else {
        return settings.default_bid_increment;
    }
};

// Helper function to get team logo from database (Google Drive or direct URL)
// All team logos are now stored in the database as logo_url
const getTeamLogo = (customLogoUrl?: string): string => {
    // If team has a custom logo URL from database, process it (handles Google Drive links)
    if (customLogoUrl) {
        const processed = processImageUrl(customLogoUrl);
        return processed || customLogoUrl; // Fallback to original if processing fails
    }

    // Fallback to default logo if no custom logo is provided
    return '/logo.jpeg';
};

// Database types for auction
interface DbTeam {
    id: string;
    team_number: number;
    name: string;
    budget: number;
    owner_name?: string;
    owner_photo?: string;
    logo_url?: string;
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
    bowling_hand?: string;
    wing?: string;
    flat_no?: string;
    phone?: string;
    category?: string;
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

export default function AuctionClient({ initialSessionId }: AuctionClientProps) {
    const router = useRouter();
    const supabase = createClient();
    const [authLoading, setAuthLoading] = useState(true);
    const [canEdit, setCanEdit] = useState(false); // Can this user edit the auction?
    const [canView, setCanView] = useState(false); // Can this user view the auction?
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [sessionName, setSessionName] = useState<string | null>(null); // Store session name to determine Men's/Women's
    const [tournamentLogo, setTournamentLogo] = useState<string | null>(null); // Store tournament logo URL from database
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [players, setPlayers] = useState<Player[]>([]);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [teams, setTeams] = useState<Team[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
    const [auctionSettings, setAuctionSettings] = useState<{
        minimum_bid: number;
        players_per_team: number;
        default_bid_increment: number;
        bid_increment_1_threshold: number;
        bid_increment_1_amount: number;
        bid_increment_2_threshold: number;
        bid_increment_2_amount: number;
        bid_increment_3_threshold: number;
        bid_increment_3_amount: number;
        bid_increment_4_threshold: number;
        bid_increment_4_amount: number;
        category_color_mapping?: Record<string, string>;
        category_minimum_bids?: Record<string, number>;
        category_limits?: Record<string, number>;
    } | null>(null);
    // Initialize with default - will be immediately updated from database settings when loaded
    const [currentBid, setCurrentBid] = useState(DEFAULT_MINIMUM_BID);
    const [auctionComplete, setAuctionComplete] = useState(false);

    // Track previous player index to detect changes
    const prevPlayerIndexRef = useRef<number>(-1);
    const isInitialLoadRef = useRef<boolean>(true);
    const isSkippedPlayersModeRef = useRef<boolean>(false);
    const playersRef = useRef<Player[]>([]);
    const isUpdatingBidRef = useRef<boolean>(false); // Track if we're updating bid ourselves
    const isUpdatingIndexRef = useRef<boolean>(false); // Track if we're updating player index ourselves (mode switches)

    // Resizable divider state
    const [leftPanelWidth, setLeftPanelWidth] = useState<number | null>(null); // null means use default
    const [isDragging, setIsDragging] = useState(false);
    const dividerRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Header minimize/expand state
    const [isHeaderOpen, setIsHeaderOpen] = useState(true);

    // Helper function to get minimum bid for a specific player
    const getMinimumBidForPlayer = (player: Player | null | undefined): number => {
        // First, check if there's a category-specific minimum bid set in category_minimum_bids
        if (player?.category && auctionSettings?.category_minimum_bids) {
            const categoryMinBid = auctionSettings.category_minimum_bids[player.category];
            if (categoryMinBid != null && categoryMinBid > 0) {
                return categoryMinBid;
            }
        }
        

        
        // For other categories, use default minimum_bid from database, fallback to DEFAULT_MINIMUM_BID if not set or invalid
        const minBid = auctionSettings?.minimum_bid;
        return (minBid != null && minBid > 0) ? minBid : DEFAULT_MINIMUM_BID;
    };

    // Helper functions to get current settings values (with fallback to defaults)
    const getMinimumBid = (): number => {
        return getMinimumBidForPlayer(currentPlayer);
    };
    
    // Get the regular minimum bid from database (for calculating remaining player requirements)
    // This doesn't consider the current player's category - used for budget calculations
    const getRegularMinimumBid = (): number => {
        const minBid = auctionSettings?.minimum_bid;
        return (minBid != null && minBid > 0) ? minBid : DEFAULT_MINIMUM_BID;
    };
    
    // Calculate minimum required budget for remaining players
    // Uses category_limits and category_minimum_bids from database settings
    // Total players per team is taken from players_per_team setting
    const calculateMinimumRequiredForRemaining = (team: Team): number => {
        if (!auctionSettings) {
            // If no settings, use default minimum bid for all remaining slots
            const totalPlayers = getPlayersPerTeam();
            const remainingSlots = Math.max(0, totalPlayers - team.players.length - (currentPlayer ? 1 : 0));
            return remainingSlots * getRegularMinimumBid();
        }

        // Count current players by category
        // Use originalPlayerPool to get category info, not the current players array
        // (which might be filtered to skipped players only)
        const categoryCounts: Record<string, number> = {};
        let playersWithoutLimitedCategory = 0;
        
        team.players.forEach(player => {
            const playerInPool = originalPlayerPoolIndexMap.has(player.name)
                ? originalPlayerPool[originalPlayerPoolIndexMap.get(player.name)!]
                : undefined;
            const category = playerInPool?.category;
            if (category && auctionSettings.category_limits?.[category]) {
                // Player has a category that has a limit
                categoryCounts[category] = (categoryCounts[category] || 0) + 1;
            } else {
                // Player doesn't have a category with a limit
                playersWithoutLimitedCategory++;
            }
        });
        
        // If buying current player, account for it
        if (currentPlayer?.category) {
            const currentCategory = currentPlayer.category;
            if (auctionSettings.category_limits?.[currentCategory]) {
                // Current player's category has a limit
                categoryCounts[currentCategory] = (categoryCounts[currentCategory] || 0) + 1;
            } else {
                // Current player's category doesn't have a limit
                playersWithoutLimitedCategory++;
            }
        } else if (currentPlayer) {
            // Current player has no category
            playersWithoutLimitedCategory++;
        }
        
        // Get category limits and minimum bids from settings
        const categoryLimits = auctionSettings.category_limits || {};
        const categoryMinimumBids = auctionSettings.category_minimum_bids || {};
        const defaultMinimumBid = auctionSettings.minimum_bid || DEFAULT_MINIMUM_BID;
        
        let totalMinimumRequired = 0;
        
        // Calculate minimum required for each category that has a limit
        Object.entries(categoryLimits).forEach(([category, limit]) => {
            const currentCount = categoryCounts[category] || 0;
            const remainingSlots = Math.max(0, limit - currentCount);
            
            // Get minimum bid for this category, fallback to default
            const categoryMinBid = categoryMinimumBids[category] || defaultMinimumBid;
            
            totalMinimumRequired += remainingSlots * categoryMinBid;
        });
        
        // Calculate remaining slots for players without category limits
        // Total players needed minus players in limited categories
        const totalPlayers = getPlayersPerTeam();
        const playersInLimitedCategories = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);
        const totalLimitedSlots = Object.values(categoryLimits).reduce((sum, limit) => sum + limit, 0);
        const remainingUnlimitedSlots = Math.max(0, (totalPlayers - totalLimitedSlots) - playersWithoutLimitedCategory);
        
        // Use default minimum bid for unlimited category slots
        totalMinimumRequired += remainingUnlimitedSlots * defaultMinimumBid;
        
        return totalMinimumRequired;
    };

    const getPlayersPerTeam = (): number => {
        return auctionSettings?.players_per_team || DEFAULT_PLAYERS_PER_TEAM;
    };

    const getBidIncrement = (currentBid: number): number => {
        // Use database settings for bid increment (based on bid amount thresholds)
        return getBidIncrementFromSettings(currentBid, auctionSettings);
    };

    // Helper function to determine if text should be white or black based on background color
    const getContrastColor = (hexColor: string): string => {
        // Remove # if present
        const hex = hexColor.replace('#', '');
        // Convert to RGB
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        // Return black for light colors, white for dark colors
        return luminance > 0.5 ? '#000000' : '#FFFFFF';
    };

    const [playerBids, setPlayerBids] = useState<Map<number, { teamId: number; teamName: string; amount: number }>>(new Map()); // Track bids: amount -> team info
    const [isSkippedPlayersSheetOpen, setIsSkippedPlayersSheetOpen] = useState(false);
    const [frozenSkippedPlayers, setFrozenSkippedPlayers] = useState<Player[]>([]);
    const [isTopPlayersSheetOpen, setIsTopPlayersSheetOpen] = useState(false);
    const [isTeamDynamicsSheetOpen, setIsTeamDynamicsSheetOpen] = useState(false);
    const [teamDynamicsTab, setTeamDynamicsTab] = useState<'list' | 'select'>('list'); // Tab state for Team Dynamics sheet
    const [isPlayerListSheetOpen, setIsPlayerListSheetOpen] = useState(false);
    const [playerListFilter, setPlayerListFilter] = useState<'All' | 'Sold' | 'Unsold'>('All');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
    const [selectedTeamFilters, setSelectedTeamFilters] = useState<Set<number>>(new Set()); // Empty set means "All" selected
    const [loadingState, setLoadingState] = useState(true);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState<{ playerName: string; teamName: string; amount: number } | null>(null);
    const [skippedPlayers, setSkippedPlayers] = useState<Player[]>([]);
    const [boughtPlayerNames, setBoughtPlayerNames] = useState<Set<string>>(new Set());
    const [isSkippedPlayersMode, setIsSkippedPlayersMode] = useState(false); // Track if we're showing only skipped players
    const [originalPlayerPool, setOriginalPlayerPool] = useState<Player[]>([]); // Store original player pool for switching back
    const originalPlayerPoolRef = useRef<Player[]>([]); // Ref for originalPlayerPool to use in subscriptions
    const [pdfGeneratingTeamId, setPdfGeneratingTeamId] = useState<number | null>(null); // Track which team is generating PDF
    const [pdfGeneratingTopPlayers, setPdfGeneratingTopPlayers] = useState<boolean>(false); // Track if top players PDF is generating
    
    // Undo system state
    type UndoAction = 
        | { type: 'buy'; playerName: string; teamId: number; bidAmount: number; previousPlayerIndex: number; previousBid: number; previousTeamId: number | null }
        | { type: 'skip'; playerName: string; previousPlayerIndex: number; previousBid: number; previousTeamId: number | null }
        | { type: 'bid'; previousBid: number; previousTeamId: number | null };
    const [lastAction, setLastAction] = useState<UndoAction | null>(null);

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
                        setTournamentLogo((session as any).tournament_logo || null); // Store tournament logo from database
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
                        setTournamentLogo((newSession as any).tournament_logo || null); // Store tournament logo from database

                        // NOTE: Initial teams are now expected to be created via admin dashboard / migrations.
                        // This block previously auto-created teams with hardcoded TOTAL_AMOUNT and TEAMS_COUNT.
                    }
                }

                if (!finalSession) {
                    throw new Error('Failed to get or create session');
                }

                setSessionId(finalSession.id);
                const initialPlayerIndex = finalSession.current_player_index;
                // Don't set currentPlayerIndex yet - we need to load players first
                // Then we'll find the correct index in the players array
                // Don't set prevPlayerIndexRef here - it will be set when currentPlayerIndex is set
                // This ensures they match exactly
                isInitialLoadRef.current = true;
                setAuctionComplete(finalSession.is_complete);

                // Check if there's a sold player info to show and modal is not acknowledged
                const soldPlayerInfo = (finalSession as any).sold_player_info;
                const congratulationsAcknowledged = (finalSession as any).congratulations_modal_acknowledged;
                
                // Show modal if sold_player_info exists and congratulations_modal_acknowledged is false
                if (soldPlayerInfo && soldPlayerInfo.playerName && soldPlayerInfo.teamName && soldPlayerInfo.amount && congratulationsAcknowledged === false) {
                    setSuccessMessage({
                        playerName: soldPlayerInfo.playerName,
                        teamName: soldPlayerInfo.teamName,
                        amount: soldPlayerInfo.amount
                    });
                    setShowSuccessModal(true);
                }

                // Load current bid amount and selected team from database
                // We'll load settings first to get the minimum_bid, then decide what to use
                const sessionBidAmount = (finalSession as any).current_bid_amount;
                const sessionBidTeamId = (finalSession as any).current_bid_team_id;
                if (sessionBidTeamId !== undefined && sessionBidTeamId !== null) {
                    setSelectedTeamId(Number(sessionBidTeamId));
                }

                // Load skipped_players_index if available (for maintaining position in skipped players mode)
                const skippedPlayersIndex = (finalSession as any).skipped_players_index;

                // Load player pool from database - only select fields we actually use
                const { data: playerPoolData, error: poolError } = await supabase
                    .from('auction_player_pool')
                    .select('id, player_order, name, photo, age, played_s1, experience, active_sport, skill, batting_hand, bowling_hand, wing, flat_no, phone, category')
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
                    batting_hand: p.batting_hand || undefined,
                    bowling_hand: p.bowling_hand || undefined,
                    wing: p.wing || undefined,
                    flat_no: p.flat_no || undefined,
                    phone: p.phone || undefined,
                    category: p.category || undefined,
                    player_order: p.player_order || undefined
                }));

                setPlayers(mappedPlayers);
                setOriginalPlayerPool(mappedPlayers); // Store original player pool

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
                        ownerName: team.owner_name || undefined,
                        ownerPhoto: team.owner_photo || undefined,
                        logoUrl: team.logo_url || undefined
                    };
                });

                setTeams(mappedTeams);

                // Track bought player names
                const boughtNames = new Set(
                    (playersData || []).map((p: DbPlayer) => p.player_name)
                );
                setBoughtPlayerNames(boughtNames);

                // Load skipped players from the dedicated table
                const { data: skippedPlayersData, error: skippedError } = await supabase
                    .from('auction_skipped_players')
                    .select('player_pool_id, player_name, player_order')
                    .eq('session_id', finalSession.id)
                    .order('player_order', { ascending: true });

                if (skippedError) {
                    // Table might not exist yet, log but don't fail
                    console.warn('Error fetching skipped players (table may not exist yet):', skippedError);
                }

                // Create a map of player pool IDs to player data for quick lookup
                const playerPoolMap = new Map(
                    (playerPoolData || []).map((p: Partial<DbPlayerPool> & { id: string; name: string }) => [p.id, p])
                );

                // Map skipped players from the table
                const skippedFromTable: Player[] = (skippedPlayersData || [])
                    .map((sp: { player_pool_id: string; player_name: string }) => {
                        const poolPlayer = playerPoolMap.get(sp.player_pool_id);
                        if (!poolPlayer) return null;
                        return {
                            name: poolPlayer.name,
                            photo: poolPlayer.photo || undefined,
                            age: poolPlayer.age || undefined,
                            played_s1: poolPlayer.played_s1 || undefined,
                            experience: poolPlayer.experience || undefined,
                            active_sport: poolPlayer.active_sport || undefined,
                            skill: poolPlayer.skill || undefined,
                            batting_hand: poolPlayer.batting_hand || undefined,
                            bowling_hand: poolPlayer.bowling_hand || undefined,
                            wing: poolPlayer.wing || undefined,
                            flat_no: poolPlayer.flat_no || undefined,
                            phone: poolPlayer.phone || undefined,
                            category: poolPlayer.category || undefined,
                            player_order: poolPlayer.player_order || undefined
                        } as Player;
                    })
                    .filter((p): p is Player => p !== null);

                setSkippedPlayers(skippedFromTable);

                // Load auction settings
                const { data: settingsData, error: settingsError } = await supabase
                    .from('auction_settings')
                    .select('*')
                    .eq('session_id', finalSession.id)
                    .maybeSingle();

                // Declare loadedSettings in broader scope so it can be used later
                let loadedSettings: {
                    minimum_bid: number;
                    players_per_team: number;
                    default_bid_increment: number;
                    bid_increment_1_threshold: number;
                    bid_increment_1_amount: number;
                    bid_increment_2_threshold: number;
                    bid_increment_2_amount: number;
                    bid_increment_3_threshold: number;
                    bid_increment_3_amount: number;
                    bid_increment_4_threshold: number;
                    bid_increment_4_amount: number;
                    category_color_mapping: Record<string, string>;
                    category_minimum_bids: Record<string, number>;
                    category_limits: Record<string, number>;
                } | null = null;

                if (settingsData && !settingsError) {
                    // Debug: Log the raw database value
                    console.log('[SETTINGS DEBUG] Raw minimum_bid from database:', settingsData.minimum_bid, 'Type:', typeof settingsData.minimum_bid);

                    loadedSettings = {
                        minimum_bid: (settingsData.minimum_bid != null && !isNaN(Number(settingsData.minimum_bid)) && Number(settingsData.minimum_bid) > 0) ? Number(settingsData.minimum_bid) : DEFAULT_MINIMUM_BID, // Use database value, fallback to default if invalid
                        players_per_team: settingsData.players_per_team || DEFAULT_PLAYERS_PER_TEAM,
                        default_bid_increment: settingsData.default_bid_increment || 5000,
                        bid_increment_1_threshold: settingsData.bid_increment_1_threshold || 100000,
                        bid_increment_1_amount: settingsData.bid_increment_1_amount || 10000,
                        bid_increment_2_threshold: settingsData.bid_increment_2_threshold || 200000,
                        bid_increment_2_amount: settingsData.bid_increment_2_amount || 20000,
                        bid_increment_3_threshold: settingsData.bid_increment_3_threshold || 400000,
                        bid_increment_3_amount: settingsData.bid_increment_3_amount || 30000,
                        bid_increment_4_threshold: settingsData.bid_increment_4_threshold || 700000,
                        bid_increment_4_amount: settingsData.bid_increment_4_amount || 50000,
                        category_color_mapping: settingsData.category_color_mapping || {},
                        category_minimum_bids: settingsData.category_minimum_bids || {},
                        category_limits: settingsData.category_limits || {}
                    };

                    // Debug: Log the final loaded settings
                    console.log('[SETTINGS DEBUG] Loaded minimum_bid:', loadedSettings.minimum_bid, 'DEFAULT_MINIMUM_BID:', DEFAULT_MINIMUM_BID);

                    setAuctionSettings(loadedSettings);
                    // Note: We'll set the bid after determining the current player to use category-specific minimum bid
                } else {
                    // Use defaults if settings not found
                    setAuctionSettings(null);
                    // Don't set bid here - will be set after determining current player
                }

                // Check if we should be in skipped players mode
                // Use the database flag if available, otherwise use the old logic
                const dbSkippedMode = (finalSession as any).is_skipped_players_mode === true;
                console.log('Initial load - finalSession.is_skipped_players_mode:', (finalSession as any).is_skipped_players_mode, 'dbSkippedMode:', dbSkippedMode);

                // If database flag is set to true, always use skipped players mode (if we have skipped players)
                // Otherwise, use the old logic
                const shouldBeInSkippedMode = dbSkippedMode
                    ? (skippedFromTable.length > 0) // If flag is true, only enter mode if we have skipped players
                    : (skippedFromTable.length > 0 && (
                        finalSession.is_complete ||
                        (initialPlayerIndex < skippedFromTable.length &&
                            mappedPlayers[initialPlayerIndex] &&
                            skippedFromTable.some(sp => sp.name === mappedPlayers[initialPlayerIndex].name))
                    ));

                console.log('Initial load - dbSkippedMode:', dbSkippedMode, 'skippedFromTable.length:', skippedFromTable.length, 'shouldBeInSkippedMode:', shouldBeInSkippedMode);

                if (shouldBeInSkippedMode && skippedFromTable.length > 0) {
                    // We're in skipped players mode
                    console.log('Loading skipped players mode with', skippedFromTable.length, 'players');
                    setPlayers(skippedFromTable);
                    setIsSkippedPlayersMode(true);
                    setSkippedPlayers(skippedFromTable); // Also update skippedPlayers state
                    // Update refs immediately to prevent race conditions
                    isSkippedPlayersModeRef.current = true;
                    playersRef.current = skippedFromTable;

                    // Find the index of current player in skipped players list
                    // Use saved skipped_players_index if available, otherwise try to find current player
                    let skippedIndex = 0;
                    if (skippedPlayersIndex !== undefined && skippedPlayersIndex !== null && skippedPlayersIndex >= 0 && skippedPlayersIndex < skippedFromTable.length) {
                        // Use saved index if valid
                        skippedIndex = skippedPlayersIndex;
                        } else {
                        // Try to find current player in skipped list
                    const currentPlayerName = mappedPlayers[initialPlayerIndex]?.name;
                    if (currentPlayerName) {
                            const foundIndex = skippedFromTable.findIndex(sp => sp.name === currentPlayerName);
                            if (foundIndex !== -1) {
                                skippedIndex = foundIndex;
                            }
                        }
                    }
                    // Sync prevPlayerIndexRef BEFORE setting currentPlayerIndex to prevent race condition
                    if (isInitialLoadRef.current) {
                        prevPlayerIndexRef.current = skippedIndex;
                    }
                            setCurrentPlayerIndex(skippedIndex);
                    
                    // Set bid based on current player's category-specific minimum bid
                    const currentPlayerForBid = skippedFromTable[skippedIndex];
                    if (currentPlayerForBid) {
                        // Calculate minimum bid for this player's category
                        let minimumBidForPlayer = DEFAULT_MINIMUM_BID; // Default fallback
                        if (loadedSettings) {
                            minimumBidForPlayer = loadedSettings.minimum_bid;
                            if (currentPlayerForBid.category && loadedSettings.category_minimum_bids) {
                                const categoryMinBid = loadedSettings.category_minimum_bids[currentPlayerForBid.category];
                                if (categoryMinBid != null && categoryMinBid > 0) {
                                    minimumBidForPlayer = categoryMinBid;
                                } else if (currentPlayerForBid.category === 'ICON') {
                                    minimumBidForPlayer = 1000000; // Hardcoded ICON minimum
                                }
                            } else if (currentPlayerForBid.category === 'ICON') {
                                minimumBidForPlayer = 1000000; // Hardcoded ICON minimum
                            }
                        } else if (currentPlayerForBid.category === 'ICON') {
                            minimumBidForPlayer = 1000000; // Hardcoded ICON minimum
                        }
                        
                        // Use session bid if it's higher than minimum, otherwise use category-specific minimum
                        const sessionBid = sessionBidAmount !== undefined && sessionBidAmount !== null ? Number(sessionBidAmount) : null;
                        if (sessionBid && sessionBid >= minimumBidForPlayer) {
                            setCurrentBid(sessionBid);
                        } else {
                            setCurrentBid(minimumBidForPlayer);
                            if (sessionId && canEdit) {
                                supabase
                                    .from('auction_sessions')
                                    .update({ current_bid_amount: minimumBidForPlayer })
                                    .eq('id', sessionId);
                            }
                        }
                    }
                    
                    // Ensure database reflects the skipped players mode state
                    supabase
                        .from('auction_sessions')
                        .update({
                            is_skipped_players_mode: true,
                            skipped_players_index: skippedIndex
                        })
                        .eq('id', finalSession.id)
                        .then(({ error }) => {
                            if (error) {
                                console.error('Error updating skipped players mode on load:', error);
                    } else {
                                console.log('Successfully updated skipped players mode on load');
                    }
                        });
                } else {
                    // Show all players normally
                    console.log('Loading all players mode with', mappedPlayers.length, 'players');
                    setPlayers(mappedPlayers);
                    setIsSkippedPlayersMode(false);
                    // Update refs immediately to prevent race conditions
                    isSkippedPlayersModeRef.current = false;
                    playersRef.current = mappedPlayers;
                    
                    // Find the player at initialPlayerIndex in originalPlayerPool, then find it in the current players array
                    // initialPlayerIndex is the index in originalPlayerPool (which matches mappedPlayers at this point)
                    let actualPlayerIndex = initialPlayerIndex;
                    if (initialPlayerIndex >= 0 && initialPlayerIndex < mappedPlayers.length) {
                        // In all players mode, mappedPlayers should match originalPlayerPool, so index should be the same
                        actualPlayerIndex = initialPlayerIndex;
                    } else if (initialPlayerIndex >= mappedPlayers.length) {
                        // Index is out of bounds, use last valid index
                        actualPlayerIndex = mappedPlayers.length > 0 ? mappedPlayers.length - 1 : 0;
                    }
                    // Sync prevPlayerIndexRef BEFORE setting currentPlayerIndex to prevent race condition
                    // This ensures they match when the useEffect runs
                    if (isInitialLoadRef.current) {
                        prevPlayerIndexRef.current = actualPlayerIndex;
                    }
                    setCurrentPlayerIndex(actualPlayerIndex);
                    
                    // Set bid based on current player's category-specific minimum bid
                    const currentPlayerForBid = mappedPlayers[actualPlayerIndex];
                    if (currentPlayerForBid) {
                        // Calculate minimum bid for this player's category
                        let minimumBidForPlayer = DEFAULT_MINIMUM_BID; // Default fallback
                        if (loadedSettings) {
                            minimumBidForPlayer = loadedSettings.minimum_bid;
                            if (currentPlayerForBid.category && loadedSettings.category_minimum_bids) {
                                const categoryMinBid = loadedSettings.category_minimum_bids[currentPlayerForBid.category];
                                if (categoryMinBid != null && categoryMinBid > 0) {
                                    minimumBidForPlayer = categoryMinBid;
                                } else if (currentPlayerForBid.category === 'ICON') {
                                    minimumBidForPlayer = 1000000; // Hardcoded ICON minimum
                                }
                            } else if (currentPlayerForBid.category === 'ICON') {
                                minimumBidForPlayer = 1000000; // Hardcoded ICON minimum
                            }
                        } else if (currentPlayerForBid.category === 'ICON') {
                            minimumBidForPlayer = 1000000; // Hardcoded ICON minimum
                        }
                        
                        // Use session bid if it's higher than minimum, otherwise use category-specific minimum
                        const sessionBid = sessionBidAmount !== undefined && sessionBidAmount !== null ? Number(sessionBidAmount) : null;
                        if (sessionBid && sessionBid >= minimumBidForPlayer) {
                            setCurrentBid(sessionBid);
                        } else {
                            setCurrentBid(minimumBidForPlayer);
                            if (sessionId && canEdit) {
                                supabase
                                    .from('auction_sessions')
                                    .update({ current_bid_amount: minimumBidForPlayer })
                                    .eq('id', sessionId);
                            }
                        }
                    }
                    
                    // Ensure database reflects the all players mode state
                    supabase
                        .from('auction_sessions')
                        .update({
                            is_skipped_players_mode: false,
                            current_player_index: initialPlayerIndex // Keep the original pool index
                        })
                        .eq('id', finalSession.id)
                        .then(({ error }) => {
                            if (error) {
                                console.error('Error updating all players mode on load:', error);
                            } else {
                                console.log('Successfully updated all players mode on load', {
                                    initialPlayerIndex,
                                    actualPlayerIndex,
                                    playerName: mappedPlayers[actualPlayerIndex]?.name
                                });
                            }
                        });
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
    // Optimized: Select only needed columns and use Map for O(n) grouping instead of O(teams × players)
    const reloadTeams = useCallback(async () => {
        if (!sessionId) return;

        const { data: teamsData } = await supabase
            .from('auction_teams')
            .select('id, team_number, name, budget, owner_name, owner_photo, logo_url')
            .eq('session_id', sessionId)
            .order('team_number', { ascending: true });

        const { data: playersData } = await supabase
            .from('auction_players')
            .select('team_id, player_name, bid_amount')
            .eq('session_id', sessionId);

        if (teamsData && playersData) {
            // Build a Map of team_id -> players[] in O(n) instead of O(teams × players)
            const playersByTeamId = new Map<string, Array<{ name: string; bidAmount: number }>>();
            for (const player of playersData) {
                const teamId = player.team_id;
                if (!playersByTeamId.has(teamId)) {
                    playersByTeamId.set(teamId, []);
                }
                playersByTeamId.get(teamId)!.push({
                    name: player.player_name,
                    bidAmount: Number(player.bid_amount) || 0
                });
            }

            // Map teams using the pre-built Map (O(teams) instead of O(teams × players))
            const mappedTeams: Team[] = teamsData.map((team: DbTeam) => ({
                    id: team.team_number,
                    name: team.name,
                budget: Number(team.budget),
                players: playersByTeamId.get(team.id) || [],
                    ownerName: team.owner_name,
                    ownerPhoto: team.owner_photo || undefined,
                    logoUrl: team.logo_url || undefined
            }));

            setTeams(mappedTeams);

            // Update bought player names
            const boughtNames = new Set(
                playersData.map((p: DbPlayer) => p.player_name)
            );
            setBoughtPlayerNames(boughtNames);
        }
    }, [sessionId, supabase]);

    // Update refs when values change
    useEffect(() => {
        isSkippedPlayersModeRef.current = isSkippedPlayersMode;
        playersRef.current = players;
        originalPlayerPoolRef.current = originalPlayerPool;
    }, [isSkippedPlayersMode, players, originalPlayerPool]);

    // Handle divider drag
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;

            // Constrain between 20% and 70% of container width
            const constrainedWidth = Math.max(20, Math.min(70, newLeftWidth));
            setLeftPanelWidth(constrainedWidth);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isDragging]);

    // Reset bid to minimum when player index changes
    useEffect(() => {
        // Skip on initial load - just mark as done and return
        // NEVER reset bid on initial load - it should come from loadAuctionState
        // prevPlayerIndexRef is already set correctly in loadAuctionState before setCurrentPlayerIndex
        if (isInitialLoadRef.current) {
            // DON'T update prevPlayerIndexRef here - it's already set correctly in loadAuctionState
            // If it's still -1, that means loadAuctionState hasn't run yet, so wait for it
            // Only mark as done if prevPlayerIndexRef was set (meaning loadAuctionState completed)
            if (prevPlayerIndexRef.current !== -1) {
            isInitialLoadRef.current = false;
            }
            return;
        }
        
        // If prevPlayerIndexRef hasn't been initialized yet, initialize it now
        // This can happen if currentPlayerIndex was set before this effect ran
        // BUT: Only do this if we're NOT on initial load (to avoid overwriting the correct value set in loadAuctionState)
        // Actually, if we get here, isInitialLoadRef.current is already false, so this is safe
        if (prevPlayerIndexRef.current === -1 && currentPlayerIndex >= 0) {
            prevPlayerIndexRef.current = currentPlayerIndex;
            return;
        }
        
        // If they match, no player change - just update ref and return
        if (prevPlayerIndexRef.current === currentPlayerIndex) {
            return;
        }

        // If in skipped players mode, ensure index is within bounds
        if (isSkippedPlayersModeRef.current && playersRef.current.length > 0) {
            if (currentPlayerIndex >= playersRef.current.length) {
                // Index is out of bounds, reset to last valid index
                const validIndex = playersRef.current.length - 1;
                setCurrentPlayerIndex(validIndex);
                prevPlayerIndexRef.current = validIndex;
                return;
            }
        }

        // If in unbidded mode (filtered list), ensure index is within bounds
        if (!isSkippedPlayersModeRef.current && playersRef.current.length > 0 && originalPlayerPool.length > 0) {
            const isUnbiddedMode = playersRef.current.length < originalPlayerPool.length;
            if (isUnbiddedMode && currentPlayerIndex >= playersRef.current.length) {
                // Index is out of bounds, reset to last valid index
                const validIndex = playersRef.current.length - 1;
                setCurrentPlayerIndex(validIndex);
                prevPlayerIndexRef.current = validIndex;
                return;
            }
        }

        // Player index changed - just update the ref
        // DO NOT reset bid here - bid is only reset when user clicks "Skip" or "Buy Player"
            prevPlayerIndexRef.current = currentPlayerIndex;
    }, [currentPlayerIndex, auctionSettings, sessionId, supabase, isSkippedPlayersMode, players.length]);

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
            }, async (payload) => {
                if (payload.new) {
                    const session = payload.new as {
                        current_player_index: number;
                        skipped_players_index?: number;
                        is_complete: boolean;
                        current_bid_amount?: number;
                        current_bid_team_id?: number;
                        sold_player_info?: { playerName: string; teamName: string; amount: number } | null;
                        congratulations_modal_acknowledged?: boolean;
                        is_skipped_players_mode?: boolean;
                    };
                    const prevIndex = prevPlayerIndexRef.current;

                    // Check if skipped players mode changed
                    // Only react if the value is explicitly set (not undefined) and different from current state
                    // Skip if we're already in the correct mode to prevent unnecessary reloads
                    if (session.is_skipped_players_mode !== undefined &&
                        session.is_skipped_players_mode !== isSkippedPlayersModeRef.current) {
                        const shouldBeInSkippedMode = session.is_skipped_players_mode === true;

                        console.log('Real-time subscription: mode change detected', {
                            dbMode: session.is_skipped_players_mode,
                            currentMode: isSkippedPlayersModeRef.current,
                            shouldSwitch: shouldBeInSkippedMode && !isSkippedPlayersModeRef.current,
                            currentPlayersCount: playersRef.current.length
                        });

                        if (shouldBeInSkippedMode && !isSkippedPlayersModeRef.current) {
                            console.log('Real-time subscription: Switching to skipped players mode');
                            // Double-check we're still not in skipped mode (race condition protection)
                            if (isSkippedPlayersModeRef.current) {
                                console.log('Real-time subscription: Already in skipped mode, skipping reload');
                                return;
                            }

                            // Switch to skipped players mode - reload skipped players from database
                            supabase
                                .from('auction_skipped_players')
                                .select(`
                                    player_pool_id,
                                    player_name,
                                    player_order,
                                    auction_player_pool!inner(
                                        id, name, photo, age, played_s1, experience, active_sport, skill, batting_hand, bowling_hand, wing, flat_no, phone, category, player_order
                                    )
                                `)
                                .eq('session_id', sessionId)
                                .order('player_order', { ascending: true })
                                .then(({ data: skippedPlayersData }) => {
                                    console.log('Real-time subscription: Loaded skipped players', skippedPlayersData?.length);
                                    // Double-check again before setting (race condition protection)
                                    if (isSkippedPlayersModeRef.current) {
                                        console.log('Real-time subscription: Mode changed while loading, skipping set');
                                        return;
                                    }

                                    if (skippedPlayersData && skippedPlayersData.length > 0) {
                                        const skippedFromTable: Player[] = skippedPlayersData.map((sp: any) => {
                                            const poolPlayer = sp.auction_player_pool;
                                            return {
                                                name: poolPlayer.name,
                                                photo: poolPlayer.photo || undefined,
                                                age: poolPlayer.age || undefined,
                                                played_s1: poolPlayer.played_s1 || undefined,
                                                experience: poolPlayer.experience || undefined,
                                                active_sport: poolPlayer.active_sport || undefined,
                                                skill: poolPlayer.skill || undefined,
                                                batting_hand: poolPlayer.batting_hand || undefined,
                                                bowling_hand: poolPlayer.bowling_hand || undefined,
                                                wing: poolPlayer.wing || undefined,
                                                flat_no: poolPlayer.flat_no || undefined,
                                                phone: poolPlayer.phone || undefined,
                                                category: poolPlayer.category || undefined,
                                                player_order: poolPlayer.player_order || undefined
                                            };
                                        });
                                        console.log('Real-time subscription: Setting skipped players', skippedFromTable.length);
                                        setPlayers(skippedFromTable);
                                        setSkippedPlayers(skippedFromTable);
                                        setIsSkippedPlayersMode(true);
                                        // Update ref immediately to prevent race conditions
                                        isSkippedPlayersModeRef.current = true;
                                        playersRef.current = skippedFromTable;
                                        console.log('Real-time subscription: Refs updated, players count:', playersRef.current.length);
                                        // Adjust index if needed
                                        const newIndex = session.current_player_index < skippedFromTable.length
                                            ? session.current_player_index
                                            : 0;
                                        setCurrentPlayerIndex(newIndex);
                                    }
                                });
                        } else if (!shouldBeInSkippedMode && isSkippedPlayersModeRef.current) {
                            // Database says false but we're in skipped mode - switch back to all players
                            console.log('Real-time subscription: Switching back to all players mode');
                            
                            // Double-check we're still in skipped mode (race condition protection)
                            if (!isSkippedPlayersModeRef.current) {
                                console.log('Real-time subscription: Already switched back, skipping reload');
                            return;
                        }
                            
                            // Switch back to all players - reload from original player pool
                            supabase
                                .from('auction_player_pool')
                                .select('id, player_order, name, photo, age, played_s1, experience, active_sport, skill, batting_hand, bowling_hand, wing, flat_no, phone, category')
                                .eq('session_id', sessionId)
                                .order('player_order', { ascending: true })
                                .then(({ data: playerPoolData }) => {
                                    console.log('Real-time subscription: Loaded all players', playerPoolData?.length);
                                    
                                    // Double-check again before setting (race condition protection)
                                    if (!isSkippedPlayersModeRef.current) {
                                        console.log('Real-time subscription: Mode changed while loading, skipping set');
                                        return;
                                    }
                                    
                                    if (playerPoolData) {
                                        const mappedPlayers: Player[] = playerPoolData.map((p: Partial<DbPlayerPool> & { name: string }) => ({
                                            name: p.name,
                                            photo: p.photo || undefined,
                                            age: p.age || undefined,
                                            played_s1: p.played_s1 || undefined,
                                            experience: p.experience || undefined,
                                            active_sport: p.active_sport || undefined,
                                            skill: p.skill || undefined,
                                            batting_hand: p.batting_hand || undefined,
                                            bowling_hand: p.bowling_hand || undefined,
                                            wing: p.wing || undefined,
                                            flat_no: p.flat_no || undefined,
                                            phone: p.phone || undefined,
                                            category: p.category || undefined,
                                            player_order: p.player_order || undefined
                                        }));
                                        
                                        console.log('Real-time subscription: Setting all players', mappedPlayers.length);
                                        setPlayers(mappedPlayers);
                                        setOriginalPlayerPool(mappedPlayers);
                                        setIsSkippedPlayersMode(false);
                                        // Update ref immediately to prevent race conditions
                                        isSkippedPlayersModeRef.current = false;
                                        playersRef.current = mappedPlayers;
                                        
                                        // Restore the correct index based on current_player_index from database
                                        // current_player_index is an index in originalPlayerPool
                                        // Since we're loading all players, the index should match directly
                                        const savedIndex = session.current_player_index ?? 0;
                                        let actualIndex = 0;
                                        if (savedIndex >= 0 && savedIndex < mappedPlayers.length) {
                                            actualIndex = savedIndex;
                                        } else if (savedIndex >= mappedPlayers.length) {
                                            actualIndex = mappedPlayers.length > 0 ? mappedPlayers.length - 1 : 0;
                                        }
                                        
                                        setCurrentPlayerIndex(actualIndex);
                                        prevPlayerIndexRef.current = actualIndex;
                                    }
                                });
                            }
                    }

                    // Handle congratulations modal state via real-time updates
                    const congratulationsAcknowledged = session.congratulations_modal_acknowledged;
                    const soldPlayerInfo = session.sold_player_info;
                    const oldSoldInfo = (payload.old as any)?.sold_player_info;
                    const oldAcknowledged = (payload.old as any)?.congratulations_modal_acknowledged;
                    
                    // Read the correct index based on mode
                    // Use database flag (is_skipped_players_mode) as source of truth, not local ref
                    // This prevents race conditions when switching modes
                    const dbIsSkippedMode = session.is_skipped_players_mode === true;
                    const localIsSkippedMode = isSkippedPlayersModeRef.current;
                    let sessionNewIndex: number;
                    if (dbIsSkippedMode && session.skipped_players_index !== undefined && session.skipped_players_index !== null) {
                        sessionNewIndex = session.skipped_players_index;
                    } else {
                        // Not in skipped mode - use current_player_index
                        sessionNewIndex = session.current_player_index;
                    }
                    
                    console.log('[REALTIME SUBSCRIPTION] Index calculation:', {
                        dbIsSkippedMode,
                        localIsSkippedMode,
                        sessionNewIndex,
                        skipped_players_index: session.skipped_players_index,
                        current_player_index: session.current_player_index,
                        currentPlayerIndex,
                        prevPlayerIndexRef: prevPlayerIndexRef.current,
                        playersRefLength: playersRef.current.length,
                        originalPlayerPoolLength: originalPlayerPool.length,
                        isUpdatingIndexRef: isUpdatingIndexRef.current,
                            timestamp: new Date().toISOString()
                        });
                    
                    // Show modal when sold_player_info is set and not acknowledged (real-time)
                    // Only show if congratulations_modal_acknowledged is false or undefined
                    if (soldPlayerInfo && soldPlayerInfo.playerName && soldPlayerInfo.teamName && soldPlayerInfo.amount && 
                        congratulationsAcknowledged !== true && payload.eventType === 'UPDATE') {
                        // Only show if it's a new sold_player_info (was null/undefined before, now has value)
                        const isNewSoldInfo = !oldSoldInfo && soldPlayerInfo;
                        if (isNewSoldInfo || !showSuccessModal) {
                            console.log('[MODAL DEBUG] ✅ Showing success modal - sold_player_info set (real-time)', {
                                soldInfo: soldPlayerInfo,
                                acknowledged: congratulationsAcknowledged,
                            timestamp: new Date().toISOString()
                        });
                            setSuccessMessage(soldPlayerInfo);
                        setShowSuccessModal(true);
                        }
                    }
                    
                    // Close modal when congratulations_modal_acknowledged is set to true (real-time)
                    // Close regardless of current modal state to ensure all devices close
                    if (congratulationsAcknowledged === true && payload.eventType === 'UPDATE') {
                        console.log('[MODAL DEBUG] ❌ Closing modal - congratulations_modal_acknowledged set to true (real-time)', {
                            oldAcknowledged: oldAcknowledged,
                            newAcknowledged: congratulationsAcknowledged,
                            currentModalState: showSuccessModal,
                            timestamp: new Date().toISOString()
                        });
                        setShowSuccessModal(false);
                        setSuccessMessage(null);
                    }
                    
                    // Close modal if sold_player_info is cleared (set to null)
                    // This handles the case where sold_player_info is cleared
                    if (!soldPlayerInfo && oldSoldInfo && payload.eventType === 'UPDATE') {
                        console.log('[MODAL DEBUG] ❌ Closing modal - sold_player_info cleared (real-time)', {
                            timestamp: new Date().toISOString()
                        });
                        setShowSuccessModal(false);
                        setSuccessMessage(null);
                    }

                    // If in skipped players mode, ensure the index is within bounds of skipped players array
                    let clampedIndex = sessionNewIndex;
                    let shouldUpdateIndex = true;
                    
                    if (isUpdatingIndexRef.current) {
                        // We're currently updating the index ourselves (e.g. switching modes) on this device.
                        // Skip applying realtime index changes to avoid overwriting the local selection.
                        console.log('[REALTIME SUBSCRIPTION] Skipping index update because isUpdatingIndexRef is true', {
                            sessionNewIndex,
                            currentPlayerIndex,
                            timestamp: new Date().toISOString()
                        });
                        shouldUpdateIndex = false;
                    } else if (dbIsSkippedMode) {
                        // Same approach as unbidded players: query skipped player names and filter from originalPlayerPool
                        // Use ref to get latest originalPlayerPool value (not stale closure)
                        if (originalPlayerPoolRef.current.length > 0) {
                            // Query fresh data to ensure we have the latest skipped players (same as unbidded mode)
                            const { data: skippedPlayersData } = await supabase
                                .from('auction_skipped_players')
                                .select('player_name')
                                .eq('session_id', sessionId);
                            
                            if (skippedPlayersData) {
                                const skippedNames = new Set(skippedPlayersData.map((sp: any) => sp.player_name));
                                const updatedSkippedList = originalPlayerPoolRef.current.filter(player => skippedNames.has(player.name));
                                setPlayers(updatedSkippedList);
                                setSkippedPlayers(updatedSkippedList);
                                playersRef.current = updatedSkippedList;
                            }
                        }
                        
                        // Clamp index to valid range for skipped players
                        if (playersRef.current.length > 0) {
                            if (clampedIndex >= playersRef.current.length) {
                                clampedIndex = playersRef.current.length - 1;
                            }
                            if (clampedIndex < 0) {
                                clampedIndex = 0;
                            }
                            
                            // Only update if the index actually changed to prevent unnecessary resets
                            // This prevents resetting to index 0 when we're already at the last player
                            if (clampedIndex === prevPlayerIndexRef.current && clampedIndex === currentPlayerIndex) {
                                // Index hasn't changed, skip index update but continue with other updates
                                shouldUpdateIndex = false;
                            }
                        } else {
                            // No skipped players, skip index update
                            shouldUpdateIndex = false;
                        }
                    } else if (!dbIsSkippedMode) {
                        // Not in skipped players mode - could be showing all players or unbidded players
                        // sessionNewIndex is an index in originalPlayerPool
                        // We need to find the corresponding player in the current players array
                        
                        // First, ensure players list is up-to-date (in case teams subscription hasn't fired yet)
                        // Use ref to get latest originalPlayerPool value (not stale closure)
                        if (originalPlayerPoolRef.current.length > 0) {
                            const isUnbiddedMode = playersRef.current.length < originalPlayerPoolRef.current.length;
                            if (isUnbiddedMode) {
                                // Query fresh data to ensure we have the latest bought players
                                const { data: playersData } = await supabase
                                    .from('auction_players')
                                    .select('player_name')
                                    .eq('session_id', sessionId);
                                
                                if (playersData) {
                                    const boughtNames = new Set(playersData.map((p: any) => p.player_name));
                                    const updatedUnbiddedList = originalPlayerPoolRef.current.filter(player => !boughtNames.has(player.name));
                                    setPlayers(updatedUnbiddedList);
                                    playersRef.current = updatedUnbiddedList;
                                }
                            }
                        }
                        
                        if (playersRef.current.length > 0 && originalPlayerPoolRef.current.length > 0) {
                            // Check if current players array is a subset (unbidded players) or full list
                            // Use database flag to determine mode, but also check list length as fallback
                            const isUnbiddedMode = playersRef.current.length < originalPlayerPoolRef.current.length;
                            
                            console.log('[REALTIME SUBSCRIPTION] Not in skipped mode, calculating index:', {
                                isUnbiddedMode,
                                playersRefLength: playersRef.current.length,
                                originalPlayerPoolLength: originalPlayerPoolRef.current.length,
                                sessionNewIndex,
                                timestamp: new Date().toISOString()
                            });
                            
                            if (isUnbiddedMode) {
                                // We're showing unbidded players, need to convert original pool index to unbidded list index
                                if (sessionNewIndex >= 0 && sessionNewIndex < originalPlayerPoolRef.current.length) {
                                    const playerAtOriginalIndex = originalPlayerPoolRef.current[sessionNewIndex];
                                    console.log('[REALTIME SUBSCRIPTION] Looking for player in unbidded list:', {
                                        playerAtOriginalIndex: playerAtOriginalIndex?.name,
                                        sessionNewIndex,
                                        timestamp: new Date().toISOString()
                                    });
                                    
                                    if (playerAtOriginalIndex) {
                                        const foundInCurrentList = playersRef.current.findIndex(p => p.name === playerAtOriginalIndex.name);
                                        if (foundInCurrentList !== -1) {
                                            clampedIndex = foundInCurrentList;
                                            console.log('[REALTIME SUBSCRIPTION] Found player in unbidded list:', {
                                                foundIndex: foundInCurrentList,
                                                playerName: playerAtOriginalIndex.name,
                                                timestamp: new Date().toISOString()
                                            });
                                        } else {
                                            console.log('[REALTIME SUBSCRIPTION] Player not found in unbidded list, searching for closest:', {
                                                playerName: playerAtOriginalIndex.name,
                                                timestamp: new Date().toISOString()
                                            });
                                            // Player at that index was bought, find closest unbidded player
                                            // Try next players first
                                            for (let i = sessionNewIndex + 1; i < originalPlayerPool.length; i++) {
                                                const nextPlayer = originalPlayerPool[i];
                                                const found = playersRef.current.findIndex(p => p.name === nextPlayer.name);
                                                if (found !== -1) {
                                                    clampedIndex = found;
                                                    console.log('[REALTIME SUBSCRIPTION] Found next player:', {
                                                        foundIndex: found,
                                                        playerName: nextPlayer.name,
                                                        timestamp: new Date().toISOString()
                                                    });
                                                    break;
                                                }
                                            }
                                            // If not found, try previous players
                                            if (clampedIndex === sessionNewIndex) {
                                                for (let i = sessionNewIndex - 1; i >= 0; i--) {
                                                    const prevPlayer = originalPlayerPoolRef.current[i];
                                                    const found = playersRef.current.findIndex(p => p.name === prevPlayer.name);
                                                    if (found !== -1) {
                                                        clampedIndex = found;
                                                        console.log('[REALTIME SUBSCRIPTION] Found previous player:', {
                                                            foundIndex: found,
                                                            playerName: prevPlayer.name,
                                                            timestamp: new Date().toISOString()
                                                        });
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            } else {
                                // We're showing all players, index should match
                                clampedIndex = sessionNewIndex;
                                console.log('[REALTIME SUBSCRIPTION] All players mode, using sessionNewIndex directly:', {
                                    clampedIndex,
                                    timestamp: new Date().toISOString()
                                });
                            }
                        } else if (originalPlayerPoolRef.current.length === 0) {
                            // originalPlayerPool is empty - this shouldn't happen, but if it does, skip index update
                            // to prevent wrong player from being shown
                            console.log('[REALTIME SUBSCRIPTION] originalPlayerPool is empty, skipping index update to prevent wrong player:', {
                                playersRefLength: playersRef.current.length,
                                sessionNewIndex,
                                currentPlayerIndex,
                                timestamp: new Date().toISOString()
                            });
                            shouldUpdateIndex = false;
                        } else {
                            // playersRef is empty but originalPlayerPool is not - use sessionNewIndex
                            clampedIndex = sessionNewIndex;
                            console.log('[REALTIME SUBSCRIPTION] playersRef empty, using sessionNewIndex:', {
                                clampedIndex,
                                timestamp: new Date().toISOString()
                            });
                        }
                        
                        // Only update if the index actually changed
                        if (clampedIndex === prevPlayerIndexRef.current && clampedIndex === currentPlayerIndex) {
                            // Index hasn't changed, skip index update but continue with other updates
                            shouldUpdateIndex = false;
                            console.log('[REALTIME SUBSCRIPTION] Index unchanged, skipping update:', {
                                clampedIndex,
                                prevPlayerIndexRef: prevPlayerIndexRef.current,
                                currentPlayerIndex,
                                timestamp: new Date().toISOString()
                            });
                        }
                    }

                    // Only update index if it actually changed
                    if (shouldUpdateIndex) {
                        console.log('[REALTIME SUBSCRIPTION] Updating index:', {
                            clampedIndex,
                            playerName: playersRef.current[clampedIndex]?.name,
                            prevIndex: prevPlayerIndexRef.current,
                            currentIndex: currentPlayerIndex,
                            timestamp: new Date().toISOString()
                        });
                    setCurrentPlayerIndex(clampedIndex);
                    // Update ref after setting state
                    prevPlayerIndexRef.current = clampedIndex;
                    } else {
                        console.log('[REALTIME SUBSCRIPTION] Skipping index update (shouldUpdateIndex=false)', {
                            clampedIndex,
                            prevPlayerIndexRef: prevPlayerIndexRef.current,
                            currentPlayerIndex,
                            timestamp: new Date().toISOString()
                        });
                    }
                    
                    setAuctionComplete(session.is_complete);

                    // Always read bid from database - it's the source of truth
                        // Skip if we're currently updating the bid ourselves to prevent overwriting our own changes
                        if (!isUpdatingBidRef.current && session.current_bid_amount !== undefined && session.current_bid_amount !== null) {
                            const newBidAmount = Number(session.current_bid_amount);
                            // Only update if the value is actually different to prevent unnecessary re-renders
                            if (newBidAmount !== currentBid) {
                                setCurrentBid(newBidAmount);
                            }
                        }
                    
                    // If player index actually changed, clear selected team
                    const effectiveNewIndex = shouldUpdateIndex ? clampedIndex : currentPlayerIndex;
                    if (effectiveNewIndex !== prevIndex) {
                        setSelectedTeamId(null);
                    }
                    // Update selected team if it changed
                    // Skip if we're currently updating the bid ourselves to prevent overwriting our own changes
                    if (!isUpdatingBidRef.current && session.current_bid_team_id !== undefined) {
                        const newTeamId = session.current_bid_team_id === null ? null : Number(session.current_bid_team_id);
                        // Only update if the value is actually different to prevent unnecessary re-renders
                        if (newTeamId !== selectedTeamId) {
                            setSelectedTeamId(newTeamId);
                        }
                        // If DB cleared the selected team, also clear local bid->team mapping
                        // (UI displays "Bid by" using playerBids.get(currentBid), not selectedTeamId)
                        if (newTeamId === null) {
                            setPlayerBids(new Map());
                        }
                    }
                }
            })
            .subscribe();

        // Subscribe to team changes
        // This covers budget updates when players are bought (by any admin) and manual team updates
        // When a player is bought/removed, auction_teams updates (budget change), so this subscription fires
        const teamsChannel = supabase
            .channel('auction-teams-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'auction_teams',
                filter: `session_id=eq.${sessionId}`
            }, async (payload) => {
                console.log('Team changed:', payload);
                
                // Update players list FIRST (before reloadTeams) using fresh data from database
                // This ensures session subscription has correct data when it fires
                if (!isSkippedPlayersModeRef.current && originalPlayerPoolRef.current.length > 0) {
                    const { data: playersData } = await supabase
                        .from('auction_players')
                        .select('player_name')
                        .eq('session_id', sessionId);
                    
                    if (playersData) {
                        const boughtNames = new Set(playersData.map((p: any) => p.player_name));
                        const isUnbiddedMode = playersRef.current.length < originalPlayerPoolRef.current.length;
                        if (isUnbiddedMode) {
                            const updatedUnbiddedList = originalPlayerPoolRef.current.filter(player => !boughtNames.has(player.name));
                            setPlayers(updatedUnbiddedList);
                            playersRef.current = updatedUnbiddedList;
                        }
                    }
                }
                
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
                // Only reload player pool if we're NOT in skipped players mode
                // If we're in skipped players mode, we should keep showing skipped players
                console.log('Player pool subscription fired, isSkippedPlayersMode:', isSkippedPlayersModeRef.current);
                if (isSkippedPlayersModeRef.current) {
                    console.log('In skipped players mode, skipping player pool reload');
                    // We're in skipped players mode, don't reset the players list
                    // Just update the original player pool for when we switch back
                    const { data: playerPoolData } = await supabase
                        .from('auction_player_pool')
                        .select('id, player_order, name, photo, age, played_s1, experience, active_sport, skill, batting_hand, bowling_hand, wing, flat_no, phone, category')
                        .eq('session_id', sessionId)
                        .order('player_order', { ascending: true });

                    if (playerPoolData) {
                        const mappedPlayers: Player[] = playerPoolData.map((p: Partial<DbPlayerPool> & { name: string }) => ({
                            name: p.name,
                            photo: p.photo || undefined,
                            age: p.age || undefined,
                            played_s1: p.played_s1 || undefined,
                            experience: p.experience || undefined,
                            active_sport: p.active_sport || undefined,
                            skill: p.skill || undefined,
                            batting_hand: p.batting_hand || undefined,
                            bowling_hand: p.bowling_hand || undefined,
                            wing: p.wing || undefined,
                            flat_no: p.flat_no || undefined,
                            phone: p.phone || undefined,
                            category: p.category || undefined,
                            player_order: p.player_order || undefined
                        }));
                        // Only update originalPlayerPool, don't change the current players list
                        setOriginalPlayerPool(mappedPlayers);
                    }
                    return; // Exit early, don't reset players
                }

                // Reload player pool when it changes - only select fields we actually use
                const { data: playerPoolData } = await supabase
                    .from('auction_player_pool')
                    .select('id, player_order, name, photo, age, played_s1, experience, active_sport, skill, batting_hand, bowling_hand, wing, flat_no, phone, category')
                    .eq('session_id', sessionId)
                    .order('player_order', { ascending: true });

                if (playerPoolData) {
                    // Double-check we're still not in skipped mode (race condition protection)
                    if (isSkippedPlayersModeRef.current) {
                        console.log('Player pool subscription: Still in skipped mode, skipping reset');
                        setOriginalPlayerPool(playerPoolData.map((p: Partial<DbPlayerPool> & { name: string }) => ({
                            name: p.name,
                            photo: p.photo || undefined,
                            age: p.age || undefined,
                            played_s1: p.played_s1 || undefined,
                            experience: p.experience || undefined,
                            active_sport: p.active_sport || undefined,
                            skill: p.skill || undefined,
                            batting_hand: p.batting_hand || undefined,
                            bowling_hand: p.bowling_hand || undefined,
                            wing: p.wing || undefined,
                            flat_no: p.flat_no || undefined,
                            phone: p.phone || undefined,
                            category: p.category || undefined,
                            player_order: p.player_order || undefined
                        })));
                        return;
                    }

                    // Safely handle missing fields (in case migration hasn't been run yet)
                    const mappedPlayers: Player[] = playerPoolData.map((p: Partial<DbPlayerPool> & { name: string }) => ({
                        name: p.name,
                        photo: p.photo || undefined,
                        age: p.age || undefined,
                        played_s1: p.played_s1 || undefined,
                        experience: p.experience || undefined,
                        active_sport: p.active_sport || undefined,
                        skill: p.skill || undefined,
                        batting_hand: p.batting_hand || undefined,
                        bowling_hand: p.bowling_hand || undefined,
                        wing: p.wing || undefined,
                        flat_no: p.flat_no || undefined,
                        phone: p.phone || undefined,
                        category: p.category || undefined,
                        player_order: p.player_order || undefined
                    }));
                    // Double-check we're still not in skipped mode before setting all players
                    // This prevents race conditions where the mode changes while loading
                    if (isSkippedPlayersModeRef.current) {
                        console.log('Player pool subscription: Still in skipped mode after loading, skipping reset to all players');
                        setOriginalPlayerPool(mappedPlayers);
                        return;
                    }
                    console.log('Player pool subscription: Setting all players', mappedPlayers.length, 'isSkippedMode:', isSkippedPlayersModeRef.current);
                    setPlayers(mappedPlayers);
                    setOriginalPlayerPool(mappedPlayers);
                }
            })
            .subscribe();

        // Subscribe to skipped players changes
        const skippedPlayersChannel = supabase
            .channel('auction-skipped-players-changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'auction_skipped_players',
                filter: `session_id=eq.${sessionId}`
            }, async () => {
                console.log('Skipped players changed, reloading...');
                // Same approach as unbidded players: query skipped player names and filter from originalPlayerPool
                if (originalPlayerPoolRef.current.length > 0) {
                    const { data: skippedPlayersData, error: skippedError } = await supabase
                        .from('auction_skipped_players')
                        .select('player_name')
                        .eq('session_id', sessionId);

                    if (skippedError) {
                        console.error('Error reloading skipped players:', skippedError);
                        return;
                    }

                    if (skippedPlayersData) {
                        const skippedNames = new Set(skippedPlayersData.map((sp: any) => sp.player_name));
                        const skippedFromTable = originalPlayerPoolRef.current.filter(player => skippedNames.has(player.name));

                        // Update skipped players state (this will update the count in the button)
                        setSkippedPlayers(skippedFromTable);

                        // If we're currently in skipped players mode, also update the players list
                        // Update playersRef FIRST to ensure session subscription has correct data
                        if (isSkippedPlayersModeRef.current) {
                            playersRef.current = skippedFromTable; // Update ref FIRST (synchronously)
                            setPlayers(skippedFromTable); // Then update state
                        }
                    } else {
                        // No skipped players, clear the list
                        setSkippedPlayers([]);
                        if (isSkippedPlayersModeRef.current) {
                            playersRef.current = [];
                            setPlayers([]);
                        }
                    }
                }
            })
            .subscribe();

        return () => {
            sessionChannel.unsubscribe();
            teamsChannel.unsubscribe();
            playerPoolChannel.unsubscribe();
            skippedPlayersChannel.unsubscribe();
        };
    }, [sessionId, supabase, reloadTeams]);

    const currentPlayer = players[currentPlayerIndex] || null;
    const remainingPlayers = players.length > 0 ? players.length - currentPlayerIndex : 0;
    
    // Create a map of player name -> index in originalPlayerPool for O(1) lookup
    const originalPlayerPoolIndexMap = useMemo(() => {
        const map = new Map<string, number>();
        originalPlayerPool.forEach((player, index) => {
            map.set(player.name, index);
        });
        return map;
    }, [originalPlayerPool]);
    
    // Get original player index in the originalPlayerPool (0-based array index)
    const getOriginalPoolIndex = (player: Player | null): number => {
        if (!player || originalPlayerPool.length === 0) {
            return 0;
        }
        return originalPlayerPoolIndexMap.get(player.name) ?? 0;
    };
    
    // Get original player index and total from the full player pool (for display)
    const getOriginalPlayerInfo = () => {
        // If in skipped players mode, show current index and total from skipped players list
        if (isSkippedPlayersMode) {
            if (!currentPlayer || players.length === 0) {
                return { originalIndex: 0, totalPlayers: players.length || 0 };
            }
            // In skipped mode, show index in skipped players list (1-based)
            const skippedIndex = currentPlayerIndex + 1;
            return { originalIndex: skippedIndex, totalPlayers: players.length };
        }
        
        // Check if we're in unbidded mode (filtered list) vs all players mode
        const isUnbiddedMode = originalPlayerPool.length > 0 && players.length < originalPlayerPool.length;
        
        // In all players mode (not filtered), show original pool index
        if (!isUnbiddedMode) {
            if (!currentPlayer || originalPlayerPool.length === 0) {
                return { originalIndex: 0, totalPlayers: originalPlayerPool.length || 0 };
            }
            
            // Find the current player in the original pool by name
            const foundPlayer = currentPlayer && originalPlayerPoolIndexMap.has(currentPlayer.name)
                ? originalPlayerPool[originalPlayerPoolIndexMap.get(currentPlayer.name)!]
                : undefined;
            
            // If found, use player_order if available (it's already 1-based), otherwise use array index + 1
            if (foundPlayer) {
                const displayIndex = foundPlayer.player_order !== undefined 
                    ? foundPlayer.player_order 
                    : originalPlayerPool.findIndex(p => p.name === currentPlayer.name) + 1;
                return { originalIndex: displayIndex, totalPlayers: originalPlayerPool.length };
            }
            
            // Fallback: use player_order from current player if available
            if (currentPlayer.player_order !== undefined) {
                return { originalIndex: currentPlayer.player_order, totalPlayers: originalPlayerPool.length || 0 };
            }
            
            return { originalIndex: 0, totalPlayers: originalPlayerPool.length || 0 };
        }
        
        // In unbidded mode, find the current player in the original pool to get its original position
        if (!currentPlayer || originalPlayerPool.length === 0) {
            return { originalIndex: 0, totalPlayers: originalPlayerPool.length || 0 };
        }
        
        // Find the current player in the original pool by name
        const foundPlayer = originalPlayerPool.find(p => p.name === currentPlayer.name);
        
        // If found, use player_order if available (it's already 1-based), otherwise use array index + 1
        if (foundPlayer) {
            const displayIndex = foundPlayer.player_order !== undefined 
                ? foundPlayer.player_order 
                : originalPlayerPool.findIndex(p => p.name === currentPlayer.name) + 1;
            return { originalIndex: displayIndex, totalPlayers: originalPlayerPool.length };
        }
        
        // Fallback: use player_order from current player if available
        if (currentPlayer.player_order !== undefined) {
            return { originalIndex: currentPlayer.player_order, totalPlayers: originalPlayerPool.length || 0 };
        }
        
        return { originalIndex: 0, totalPlayers: originalPlayerPool.length || 0 };
    };
    
    const { originalIndex, totalPlayers } = getOriginalPlayerInfo();


    // Get current skipped players - now simply returns from state (loaded from table)
    const getCurrentSkippedPlayers = useCallback(() => {
        return skippedPlayers;
    }, [skippedPlayers]);

    // Get all unbidded players (players that were never bought, regardless of whether they were skipped)
    const getAllUnbiddedPlayers = useCallback(() => {
        if (originalPlayerPool.length === 0) return [];
        return originalPlayerPool.filter(player => !boughtPlayerNames.has(player.name));
    }, [originalPlayerPool, boughtPlayerNames]);

    // Switch to unbidded players mode
    const handleSwitchToUnbiddedPlayers = async () => {
        if (!sessionId) {
            alert('Auction session not loaded. Please refresh the page.');
            return;
        }

        try {
            // First, get the saved current_player_index from database to restore it
            const { data: sessionData } = await supabase
                .from('auction_sessions')
                .select('current_player_index')
                .eq('id', sessionId)
                .single();
            
            const unbiddedList = getAllUnbiddedPlayers();
            if (unbiddedList.length === 0) {
                alert('No unbidded players available.');
                return;
            }

            setPlayers(unbiddedList);
            setIsSkippedPlayersMode(false);
            // Update ref immediately to prevent race conditions with real-time subscription
            isSkippedPlayersModeRef.current = false;
            playersRef.current = unbiddedList;
            
            // Ensure originalPlayerPool is set (it should be, but double-check to prevent subscription issues)
            if (originalPlayerPool.length === 0) {
                // Reload original player pool if it's empty
                const { data: playerPoolData } = await supabase
                    .from('auction_player_pool')
                    .select('id, player_order, name, photo, age, played_s1, experience, active_sport, skill, batting_hand, bowling_hand, wing, flat_no, phone, category')
                    .eq('session_id', sessionId)
                    .order('player_order', { ascending: true });
                
                if (playerPoolData) {
                    const mappedPlayers: Player[] = playerPoolData.map((p: Partial<DbPlayerPool> & { name: string }) => ({
                        name: p.name,
                        photo: p.photo || undefined,
                        age: p.age || undefined,
                        played_s1: p.played_s1 || undefined,
                        experience: p.experience || undefined,
                        active_sport: p.active_sport || undefined,
                        skill: p.skill || undefined,
                        batting_hand: p.batting_hand || undefined,
                        bowling_hand: p.bowling_hand || undefined,
                        wing: p.wing || undefined,
                        flat_no: p.flat_no || undefined,
                        phone: p.phone || undefined,
                        category: p.category || undefined,
                        player_order: p.player_order || undefined
                    }));
                    setOriginalPlayerPool(mappedPlayers);
                }
            }
            
            // Restore the saved current_player_index (index in originalPlayerPool)
            const savedIndex = sessionData?.current_player_index ?? 0;
            // Find the player at that index in originalPlayerPool, then find it in unbiddedList
            let actualIndex = 0;
            if (savedIndex >= 0 && savedIndex < originalPlayerPool.length) {
                const playerAtSavedIndex = originalPlayerPool[savedIndex];
                if (playerAtSavedIndex) {
                    const foundIndex = unbiddedList.findIndex(p => p.name === playerAtSavedIndex.name);
                    if (foundIndex !== -1) {
                        actualIndex = foundIndex;
                    } else {
                        // Player at saved index was bought, find the closest unbidded player
                        // Try to find the next unbidded player after the saved index
                        for (let i = savedIndex; i < originalPlayerPool.length; i++) {
                            const nextPlayer = originalPlayerPool[i];
                            const foundInUnbidded = unbiddedList.findIndex(p => p.name === nextPlayer.name);
                            if (foundInUnbidded !== -1) {
                                actualIndex = foundInUnbidded;
                                break;
                            }
                        }
                        // If not found after, try before
                        if (actualIndex === 0) {
                            for (let i = savedIndex - 1; i >= 0; i--) {
                                const prevPlayer = originalPlayerPool[i];
                                const foundInUnbidded = unbiddedList.findIndex(p => p.name === prevPlayer.name);
                                if (foundInUnbidded !== -1) {
                                    actualIndex = foundInUnbidded;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            console.log('[SWITCH TO UNBIDDED] Setting local index:', {
                actualIndex,
                playerName: unbiddedList[actualIndex]?.name,
                unbiddedListLength: unbiddedList.length,
                savedIndex,
                timestamp: new Date().toISOString()
            });
            console.log('[SWITCH TO UNBIDDED] Setting local index:', {
                actualIndex,
                playerName: unbiddedList[actualIndex]?.name,
                unbiddedListLength: unbiddedList.length,
                savedIndex,
                timestamp: new Date().toISOString()
            });
            setCurrentPlayerIndex(actualIndex);
            
            // Update prevPlayerIndexRef to prevent the useEffect from resetting the bid
            prevPlayerIndexRef.current = actualIndex;

            // Update database to sync mode across all screens
            // Update current_player_index to the original pool index of the player we're now showing
            // This ensures the index is correct when we refresh or when real-time updates come in
            const currentPlayerInUnbidded = unbiddedList[actualIndex];
            let originalPoolIndex = savedIndex; // Default to saved index
            if (currentPlayerInUnbidded) {
                const foundOriginalIndex = originalPlayerPool.findIndex(p => p.name === currentPlayerInUnbidded.name);
                if (foundOriginalIndex !== -1) {
                    originalPoolIndex = foundOriginalIndex;
                }
            }
            
            console.log('[SWITCH TO UNBIDDED] Updating database:', {
                originalPoolIndex,
                playerName: currentPlayerInUnbidded?.name,
                is_skipped_players_mode: false,
                timestamp: new Date().toISOString()
            });
            
            // Mark that we're updating the index ourselves so the realtime subscription
            // does not immediately overwrite it on THIS device
            isUpdatingIndexRef.current = true;

            await supabase
                .from('auction_sessions')
                .update({
                    is_skipped_players_mode: false,
                    current_player_index: originalPoolIndex // Update to the correct original pool index
                    // Keep skipped_players_index unchanged so we can restore it when switching back
                })
                .eq('id', sessionId)
                .then(({ error }) => {
                    if (error) {
                        console.error('[SWITCH TO UNBIDDED] Database update error:', error);
                    } else {
                        console.log('[SWITCH TO UNBIDDED] Database update complete', {
                            originalPoolIndex,
                            timestamp: new Date().toISOString()
                        });
                    }
                    // Allow realtime subscription to resume index updates
                    isUpdatingIndexRef.current = false;
                });
            
            console.log('[SWITCH TO UNBIDDED] Database update complete', {
                timestamp: new Date().toISOString()
            });

            const newMinimum = getMinimumBid();
            setCurrentBid(newMinimum);
            setSelectedTeamId(null);
        } catch (error) {
            console.error('Error switching to unbidded players:', error);
            alert('Failed to switch to unbidded players. Please try again.');
        }
    };

    // Switch to skipped players mode
    const handleSwitchToSkippedPlayers = async () => {
        if (!sessionId) {
            alert('Auction session not loaded. Please refresh the page.');
            return;
        }

        try {
            // Always load skipped players from database to ensure we have the complete list
            const { data: skippedPlayersData, error: skippedError } = await supabase
                .from('auction_skipped_players')
                .select(`
                    player_pool_id,
                    player_name,
                    player_order,
                    auction_player_pool!inner(
                        id, name, photo, age, played_s1, experience, active_sport, skill, batting_hand, bowling_hand, wing, flat_no, phone, category, player_order
                    )
                `)
                .eq('session_id', sessionId)
                .order('player_order', { ascending: true });

            if (skippedError) {
                console.error('Error fetching skipped players:', skippedError);
                alert('Failed to load skipped players. Please try again.');
                return;
            }

            if (!skippedPlayersData || skippedPlayersData.length === 0) {
                alert('No skipped players available.');
                return;
            }

            // Map skipped players from the database
            const skippedList: Player[] = skippedPlayersData.map((sp: any) => {
                const poolPlayer = sp.auction_player_pool;
                return {
                    name: poolPlayer.name,
                    photo: poolPlayer.photo || undefined,
                    age: poolPlayer.age || undefined,
                    played_s1: poolPlayer.played_s1 || undefined,
                    experience: poolPlayer.experience || undefined,
                    active_sport: poolPlayer.active_sport || undefined,
                    skill: poolPlayer.skill || undefined,
                    batting_hand: poolPlayer.batting_hand || undefined,
                    bowling_hand: poolPlayer.bowling_hand || undefined,
                    wing: poolPlayer.wing || undefined,
                    flat_no: poolPlayer.flat_no || undefined,
                    phone: poolPlayer.phone || undefined,
                    category: poolPlayer.category || undefined,
                    player_order: poolPlayer.player_order || undefined
                };
            });

            console.log('handleSwitchToSkippedPlayers: Setting skipped players', skippedList.length);
            
            // Get current player's index in originalPlayerPool before switching
            const currentPlayer = players[currentPlayerIndex];
            const currentPlayerOriginalIndex = currentPlayer ? getOriginalPoolIndex(currentPlayer) : 0;
            
            setPlayers(skippedList);
            setSkippedPlayers(skippedList);
            setIsSkippedPlayersMode(true);
            // Update ref immediately to prevent race conditions with real-time subscription
            isSkippedPlayersModeRef.current = true;
            playersRef.current = skippedList;
            setCurrentPlayerIndex(0);

            console.log('handleSwitchToSkippedPlayers: Refs updated, updating database');
            // Update database to sync mode across all screens
            // Save current_player_index (in originalPlayerPool) before switching so we can restore it
            // and set skipped_players_index to 0 (starting at beginning of skipped players)
            const { data: updateData, error: updateError } = await supabase
                .from('auction_sessions')
                .update({
                    skipped_players_index: 0, // Start at beginning of skipped players
                    current_player_index: currentPlayerOriginalIndex, // Save current position in originalPlayerPool
                    is_skipped_players_mode: true
                })
                .eq('id', sessionId)
                .select();

            if (updateError) {
                console.error('handleSwitchToSkippedPlayers: Database update error:', updateError);
            } else {
                console.log('handleSwitchToSkippedPlayers: Database updated successfully', updateData);
            }

            console.log('handleSwitchToSkippedPlayers: Database update complete, current players:', playersRef.current.length);

            // Get minimum bid for the first skipped player explicitly (not relying on currentPlayer which might not be updated yet)
            const firstSkippedPlayer = skippedList[0];
            const newMinimum = getMinimumBidForPlayer(firstSkippedPlayer);
            setCurrentBid(newMinimum);
            setSelectedTeamId(null);
            
            // Also update database to sync the bid
            if (canEdit) {
                await supabase
                    .from('auction_sessions')
                    .update({
                        current_bid_amount: newMinimum,
                        current_bid_team_id: null
                    })
                    .eq('id', sessionId);
            }
        } catch (error) {
            console.error('Error switching to skipped players:', error);
            alert('Failed to switch to skipped players. Please try again.');
        }
    };

    // Get players list based on filter (All, Sold, Unsold) in random order
    // Memoized to prevent reshuffling on every render - only recalculates when filters change
    const getFilteredPlayersList = useCallback(() => {
        if (originalPlayerPool.length === 0) return [];

        let filtered: Player[] = [];

        if (playerListFilter === 'All') {
            filtered = [...originalPlayerPool];
        } else if (playerListFilter === 'Sold') {
            filtered = originalPlayerPool.filter(player => boughtPlayerNames.has(player.name));
        } else if (playerListFilter === 'Unsold') {
            filtered = originalPlayerPool.filter(player => !boughtPlayerNames.has(player.name));
        }

        // Apply category filter
        if (selectedCategoryFilter !== 'All') {
            filtered = filtered.filter(player => player.category === selectedCategoryFilter);
        }

        // Sort sold players in ascending order by numeric prefix in name, others remain shuffled
        if (playerListFilter === 'Sold') {
            // Sort by numeric prefix in player name (e.g., "41 Raj Kale" -> 41)
            filtered.sort((a, b) => {
                // Extract numeric prefix from name
                const extractNumber = (name: string): number => {
                    const match = name.match(/^\s*(\d+)/);
                    return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
                };

                const numA = extractNumber(a.name);
                const numB = extractNumber(b.name);

                // If both have numbers, sort by number
                if (numA !== Number.MAX_SAFE_INTEGER && numB !== Number.MAX_SAFE_INTEGER) {
                    return numA - numB;
                }

                // If only one has a number, put the one with number first
                if (numA !== Number.MAX_SAFE_INTEGER) return -1;
                if (numB !== Number.MAX_SAFE_INTEGER) return 1;

                // If neither has a number, sort alphabetically
                return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
            });
            return filtered;
        }

        // Shuffle array randomly for other filters
        const shuffled = [...filtered];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled;
    }, [originalPlayerPool, boughtPlayerNames, playerListFilter, selectedCategoryFilter]);

    // Memoize the filtered players list to prevent reshuffling on every render
    // Only recalculates when the sheet is open and filters change
    const memoizedFilteredPlayers = useMemo(() => {
        if (!isPlayerListSheetOpen) return [];
        return getFilteredPlayersList();
    }, [isPlayerListSheetOpen, getFilteredPlayersList]);

    // Create a map of team ID -> team for O(1) lookup instead of O(teams)
    const teamMap = useMemo(() => {
        const map = new Map<number, Team>();
        teams.forEach(team => {
            map.set(team.id, team);
        });
        return map;
    }, [teams]);

    // Create a map of player name -> team for O(1) lookup instead of O(teams × players)
    const playerToTeamMap = useMemo(() => {
        const map = new Map<string, { team: Team; bidAmount: number | undefined }>();
        teams.forEach(team => {
            team.players.forEach(player => {
                map.set(player.name, { team, bidAmount: player.bidAmount });
            });
        });
        return map;
    }, [teams]);

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

    // Modal state is now controlled by database polling (congratulations_modal_acknowledged)
    // No need for auto-close logic - modal closes when admin clicks Proceed

    // Default card styling (no category-based styling)
    const cardStyle = { bg: 'bg-white', border: 'border-2 border-gray-200', shadow: 'shadow-sm' };

    // Memoize minimum bid to avoid recalculating on every render
    const currentMinimumBid = useMemo(() => getMinimumBid(), [currentPlayer, auctionSettings]);
    
    // Memoize skipped players count to avoid recalculating on every render
    const skippedPlayersCount = useMemo(() => getCurrentSkippedPlayers().length, [getCurrentSkippedPlayers]);

    // Clear player bids and selected team when player changes
    // DO NOT reset bid here - bid is only reset when user clicks "Skip" or "Buy Player"
    // BUT: If current bid doesn't match the minimum for this player category, adjust it
    // (e.g., if switching from ICON ₹10,00,000 to non-ICON ₹1,00,000, or vice versa)
    useEffect(() => {
        if (currentPlayer && sessionId && auctionSettings) {
            // Clear bids for new player
            setPlayerBids(new Map());
            // Clear selected team
            setSelectedTeamId(null);

            // Get the minimum bid for this player category
            const minimumForThisPlayer = getMinimumBid();
            setCurrentBid(prevBid => {
                // If bid doesn't match the minimum for this player category, reset it
                // This handles switching between ICON (₹10,00,000) and non-ICON (₹1,00,000) players
                if (prevBid !== minimumForThisPlayer) {
                    // Update database to sync
                    if (canEdit) {
                        supabase
                            .from('auction_sessions')
                            .update({ current_bid_amount: minimumForThisPlayer })
                            .eq('id', sessionId);
                    }
                    return minimumForThisPlayer;
                }
                return prevBid;
            });

            console.log('[MODAL DEBUG] 🔄 Player changed - clearing sold_player_info in useEffect', {
                currentPlayerIndex: currentPlayerIndex,
                playerName: currentPlayer.name,
                timestamp: new Date().toISOString(),
                sessionId: sessionId
            });
        }
    }, [currentPlayerIndex, currentPlayer, sessionId, auctionSettings, canEdit, supabase]);

    // Modal state is now handled via real-time subscription (no polling needed)

    // Track bid when team is selected and bid amount changes
    useEffect(() => {
        if (selectedTeamId && currentBid >= getMinimumBid()) {
            const team = selectedTeamId ? teamMap.get(selectedTeamId) : undefined;
            if (team) {
                setPlayerBids(prev => {
                    const newBids = new Map(prev);
                    newBids.set(currentBid, {
                        teamId: selectedTeamId,
                        teamName: team.name,
                        amount: currentBid
                    });
                    return newBids;
                });
            }
        }
    }, [currentBid, selectedTeamId, teams]);

    // Helper function to handle team selection with bid increase
    const handleTeamSelection = async (teamId: number) => {
        if (!canEdit || !sessionId) return;

        const team = teamId ? teamMap.get(teamId) : undefined;
        if (!team) return;

        // Calculate maximum bid this team can make for current player
        // They need to reserve minimum bid for remaining players
        // Uses category_limits and category_minimum_bids from database settings
        const minimumRequiredForRemaining = calculateMinimumRequiredForRemaining(team);
        const maxBid = team.budget - minimumRequiredForRemaining;

        // Calculate new bid amount first
        // If user has entered a custom bid that's >= minimum, use that
        // Otherwise, if no team is selected yet, set to minimum bid on first click
        // Otherwise, add increment for subsequent bids
        const minimumBid = getMinimumBid();
        let newBid: number;
        if (currentBid >= minimumBid && (!selectedTeamId || currentBid > minimumBid)) {
            // User has entered a custom bid or there's already a valid bid, use it
            newBid = currentBid;
        } else if (!selectedTeamId || currentBid < minimumBid) {
            // First bid: set to minimum bid (base price)
            newBid = minimumBid;
        } else {
            // Subsequent bids: add increment
            const increment = getBidIncrement(currentBid);
            newBid = currentBid + increment;
        }

        // Check if team can afford the NEW bid amount and if it's within their max bid
        // Use a small tolerance (0.01) to handle floating point precision issues
        const canAfford = team.budget >= newBid;
        const withinMaxBid = newBid <= maxBid + 0.01;
        const hasSpace = team.players.length < getPlayersPerTeam();

        // Check category limits
        const currentPlayerCategory = currentPlayer?.category;
        let withinCategoryLimit = true;
        if (currentPlayerCategory && auctionSettings?.category_limits && auctionSettings.category_limits[currentPlayerCategory]) {
            const categoryLimit = auctionSettings.category_limits[currentPlayerCategory];
            // Count how many players of this category the team already has
            // Use originalPlayerPool to get category info, not the current players array
            // (which might be filtered to skipped players only)
            const categoryCount = team.players.filter(p => {
                // Need to get the category from the original player pool
                const playerInPool = originalPlayerPool.find(pl => pl.name === p.name);
                return playerInPool?.category === currentPlayerCategory;
            }).length;
            withinCategoryLimit = categoryCount < categoryLimit;
        }

        // Show helpful error messages if validation fails
        if (!hasSpace) {
            alert(`Team ${team.name} already has ${getPlayersPerTeam()} players! Maximum allowed is ${getPlayersPerTeam()}.`);
            return;
        }
        if (!canAfford) {
            alert(`Team ${team.name} doesn't have enough budget! Current budget: ₹${formatIndianNumber(team.budget)}, Required: ₹${formatIndianNumber(newBid)}`);
            return;
        }
        if (!withinMaxBid) {
            // Calculate remaining slots for display
            const remainingSlots = getPlayersPerTeam() - team.players.length - 1;
            alert(
                `Team ${team.name} cannot bid ₹${formatIndianNumber(newBid)} on this player.\n\n` +
                `After this bid, the team will have ₹${formatIndianNumber(team.budget - newBid)} remaining, ` +
                `but needs at least ₹${formatIndianNumber(minimumRequiredForRemaining)} to buy the remaining players.\n\n` +
                `Maximum allowed bid: ₹${formatIndianNumber(maxBid)}`
            );
            return;
        }
        if (maxBid < getMinimumBid()) {
            alert(`Team ${team.name} doesn't have enough budget to make even the minimum bid of ₹${formatIndianNumber(getMinimumBid())}!`);
            return;
        }
        if (!withinCategoryLimit) {
            const categoryLimit = auctionSettings?.category_limits?.[currentPlayerCategory || ''];
            alert(`Team ${team.name} has reached the limit of ${categoryLimit} player(s) in category ${currentPlayerCategory}.`);
            return;
        }

        // Set the new bid amount and selected team
        setCurrentBid(newBid);
        setSelectedTeamId(teamId);

        // Store previous state for undo (only if bid or team changed)
        const previousBid = currentBid;
        const previousTeamId = selectedTeamId;
        if (newBid !== previousBid || teamId !== previousTeamId) {
            setLastAction({
                type: 'bid',
                previousBid,
                previousTeamId
            });
        }

        // Record the bid immediately
        setPlayerBids(prev => {
            const newBids = new Map(prev);
            newBids.set(newBid, {
                teamId: teamId,
                teamName: team.name,
                amount: newBid
            });
            return newBids;
        });

        // Update database for real-time sync
        await supabase
            .from('auction_sessions')
            .update({
                current_bid_amount: newBid,
                current_bid_team_id: teamId
            })
            .eq('id', sessionId);
    };

    const handleBidIncrease = async () => {
        if (!sessionId) return;

        const increment = getBidIncrement(currentBid);
        const newBid = currentBid + increment;

        // Store previous state for undo
        const previousBid = currentBid;
        const previousTeamId = selectedTeamId;
        setLastAction({
            type: 'bid',
            previousBid,
            previousTeamId
        });

        // Update local state immediately
        setCurrentBid(newBid);

        // Update database for real-time sync
        // Preserve the current_bid_team_id if a team is already selected
        const updateData: { current_bid_amount: number; current_bid_team_id?: number | null } = {
            current_bid_amount: newBid
        };
        if (selectedTeamId !== null) {
            updateData.current_bid_team_id = selectedTeamId;
        }

        await supabase
            .from('auction_sessions')
            .update(updateData)
            .eq('id', sessionId);
    };

    const handleBidDecrease = async () => {
        if (!sessionId || currentBid <= currentMinimumBid) return;

        // Calculate increment based on the amount we're decreasing FROM
        const increment = getBidIncrement(currentBid);
        const newBid = Math.max(currentMinimumBid, currentBid - increment);

        // Store previous state for undo
        const previousBid = currentBid;
        const previousTeamId = selectedTeamId;
        setLastAction({
            type: 'bid',
            previousBid,
            previousTeamId
        });

        // Update local state immediately
        setCurrentBid(newBid);

        // Update database for real-time sync
        // Preserve the current_bid_team_id if a team is already selected
        const updateData: { current_bid_amount: number; current_bid_team_id?: number | null } = {
            current_bid_amount: newBid
        };
        if (selectedTeamId !== null) {
            updateData.current_bid_team_id = selectedTeamId;
        }

        await supabase
            .from('auction_sessions')
            .update(updateData)
            .eq('id', sessionId);
    };

    const [bidInputValue, setBidInputValue] = useState<string>('');

    // Sync bidInputValue with currentBid when it changes externally
    useEffect(() => {
        setBidInputValue(currentBid.toString());
    }, [currentBid]);

    const handleBidInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!canEdit || !sessionId) return;

        const value = e.target.value.replace(/[^0-9]/g, ''); // Remove non-numeric characters
        setBidInputValue(value);

        if (value === '') {
            return;
        }

        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
            // Ensure the value is at least the minimum bid
            const newBid = Math.max(currentMinimumBid, numValue);

            // Mark that we're updating the bid ourselves
            isUpdatingBidRef.current = true;
            setCurrentBid(newBid);

            // Update database immediately to persist the custom bid
            // Preserve the current_bid_team_id if a team is already selected
            const updateData: { current_bid_amount: number; current_bid_team_id?: number | null } = {
                current_bid_amount: newBid
            };
            // Only update team_id if we want to preserve it (keep existing team selected)
            if (selectedTeamId !== null) {
                updateData.current_bid_team_id = selectedTeamId;
            }

            await supabase
                .from('auction_sessions')
                .update(updateData)
                .eq('id', sessionId);

            // Reset flag after a delay to allow our database update to propagate
            // This prevents the subscription from overwriting our changes
            setTimeout(() => {
                isUpdatingBidRef.current = false;
            }, 300);
        }
    };

    const handleBidInputBlur = async () => {
        if (!sessionId) return;

        // Ensure bid is at least minimum when input loses focus
        let finalBid = currentBid;
        if (currentBid < currentMinimumBid) {
            finalBid = currentMinimumBid;
            setCurrentBid(finalBid);
        }

        // Sync input value with current bid (in case it was adjusted)
        setBidInputValue(finalBid.toString());

        // Update database for real-time sync
        // Preserve the current_bid_team_id if a team is already selected
        const updateData: { current_bid_amount: number; current_bid_team_id?: number | null } = {
            current_bid_amount: finalBid
        };
        if (selectedTeamId !== null) {
            updateData.current_bid_team_id = selectedTeamId;
        }

        await supabase
            .from('auction_sessions')
            .update(updateData)
            .eq('id', sessionId);
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

        // Store state for undo before making changes
        const previousPlayerIndex = currentPlayerIndex;
        const previousBid = currentBid;
        const previousTeamId = selectedTeamId;

        // Check if team has space
        const playersPerTeam = getPlayersPerTeam();
        if (team.players.length >= playersPerTeam) {
            alert(`Team ${team.name} already has ${playersPerTeam} players! Maximum allowed is ${playersPerTeam}.`);
            return;
        }

        // Check if team has enough budget for current bid
        if (team.budget < currentBid) {
            alert(`Team ${team.name} doesn't have enough budget!`);
            return;
        }

        // Calculate minimum required budget for remaining players
        // Uses category_limits and category_minimum_bids from database settings
        const minimumRequiredBudget = calculateMinimumRequiredForRemaining(team);
        const maxBid = team.budget - minimumRequiredBudget;

        // Check if after this bid, team will have enough budget for remaining players
        // If no more players needed (team will be full), allow the bid regardless
        const budgetAfterBid = team.budget - currentBid;
        const remainingPlayersNeeded = playersPerTeam - team.players.length - 1; // For display in alert
        if (remainingPlayersNeeded > 0 && budgetAfterBid < minimumRequiredBudget) {
            alert(
                `Team ${team.name} cannot bid ₹${formatIndianNumber(currentBid)} on this player.\n\n` +
                `After this bid, the team will have ₹${formatIndianNumber(budgetAfterBid)} remaining, ` +
                `but needs at least ₹${formatIndianNumber(minimumRequiredBudget)} to buy the remaining players (1 ICON + 9 others).\n\n` +
                `Maximum allowed bid: ₹${formatIndianNumber(maxBid)}`
            );
            return;
        }
        
        // Also check if current bid exceeds max bid
        if (currentBid > maxBid) {
            alert(
                `Team ${team.name} cannot bid ₹${formatIndianNumber(currentBid)} on this player.\n\n` +
                `Maximum allowed bid: ₹${formatIndianNumber(maxBid)} (to reserve budget for remaining players)`
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

            // Remove from skipped_players table if player was previously skipped
            const { data: playerPoolData } = await supabase
                .from('auction_player_pool')
                .select('id')
                .eq('session_id', sessionId)
                .eq('name', currentPlayer.name)
                .single();

            if (playerPoolData) {
                await supabase
                    .from('auction_skipped_players')
                    .delete()
                    .eq('session_id', sessionId)
                    .eq('player_pool_id', playerPoolData.id);

                // Update local skipped players state
                setSkippedPlayers(prev => prev.filter(p => p.name !== currentPlayer.name));
            }

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

            // Store sold player info in database for all users to see
            const soldPlayerInfo = {
                playerName: currentPlayer.name,
                teamName: team.name,
                amount: currentBid
            };

            // Store action for undo
            setLastAction({
                type: 'buy',
                playerName: currentPlayer.name,
                teamId: selectedTeamId,
                bidAmount: currentBid,
                previousPlayerIndex,
                previousBid,
                previousTeamId
            });

            // Move to next player
            let nextIndex: number;
            let nextPlayer: Player | undefined;
            let nextPlayerOriginalIndex: number;
            
            if (isSkippedPlayersModeRef.current) {
                // In skipped players mode: reload skipped players list first to get updated list after removal
                // The current player has been removed, so the list is now shorter
                const { data: updatedSkippedData } = await supabase
                    .from('auction_skipped_players')
                    .select('player_pool_id, player_name, player_order')
                    .eq('session_id', sessionId)
                    .order('player_order', { ascending: true });

                if (updatedSkippedData && updatedSkippedData.length > 0) {
                    // Get player pool data to map skipped players
                    const { data: allPoolData } = await supabase
                        .from('auction_player_pool')
                        .select('id, name, photo, age, played_s1, experience, active_sport, skill, batting_hand, bowling_hand, wing, flat_no, phone, category')
                        .eq('session_id', sessionId);

                    const poolMap = new Map(
                        (allPoolData || []).map((p: any) => [p.id, p])
                    );

                    const updatedSkippedList: Player[] = updatedSkippedData
                        .map((sp: any) => {
                            const poolPlayer = poolMap.get(sp.player_pool_id);
                            if (!poolPlayer) return null;
                            return {
                                name: poolPlayer.name,
                                photo: poolPlayer.photo || undefined,
                                age: poolPlayer.age || undefined,
                                played_s1: poolPlayer.played_s1 || undefined,
                                experience: poolPlayer.experience || undefined,
                                active_sport: poolPlayer.active_sport || undefined,
                                skill: poolPlayer.skill || undefined,
                                batting_hand: poolPlayer.batting_hand || undefined,
                                bowling_hand: poolPlayer.bowling_hand || undefined,
                                wing: poolPlayer.wing || undefined,
                                flat_no: poolPlayer.flat_no || undefined,
                                phone: poolPlayer.phone || undefined,
                                category: poolPlayer.category || undefined
                            } as Player;
                        })
                        .filter((p): p is Player => p !== null);

                    // Find the next player by finding the player that comes after current player in original pool order
                    // This ensures we get the correct next player even after the list has been updated
                    const currentPlayerOriginalIndex = getOriginalPoolIndex(currentPlayer);
                    let foundNextIndex = 0;
                    
                    // Search for the next player in original pool order that's still in the skipped list
                    for (let i = currentPlayerOriginalIndex + 1; i < originalPlayerPool.length; i++) {
                        const candidatePlayer = originalPlayerPool[i];
                        const foundIndex = updatedSkippedList.findIndex(sp => sp.name === candidatePlayer.name);
                        if (foundIndex !== -1) {
                            foundNextIndex = foundIndex;
                            break;
                        }
                    }
                    
                    // If no next player found in original order, use the first available player
                    // (this handles edge cases where we're at the end)
                    if (foundNextIndex === 0 && updatedSkippedList.length > 0) {
                        const firstPlayerName = updatedSkippedList[0]?.name;
                        const firstPlayerOriginalIndex = originalPlayerPool.findIndex(p => p.name === firstPlayerName);
                        // Only use index 0 if it's actually after the current player
                        if (firstPlayerOriginalIndex <= currentPlayerOriginalIndex && updatedSkippedList.length > 1) {
                            foundNextIndex = 1;
                        }
                    }
                    
                    nextIndex = Math.min(foundNextIndex, updatedSkippedList.length - 1);
                    nextPlayer = updatedSkippedList[nextIndex];
                    nextPlayerOriginalIndex = nextPlayer ? getOriginalPoolIndex(nextPlayer) : currentPlayerOriginalIndex;
                    
                    // Update local state with updated skipped players list
                    setPlayers(updatedSkippedList);
                    setSkippedPlayers(updatedSkippedList);
                    playersRef.current = updatedSkippedList;
                } else {
                    // No more skipped players - stay in skipped players mode at the last index
                    // Don't auto-switch to all players mode - user can manually click "All Unbidded" if they want
                    // Keep the current player visible (the one that was just bought) so UI doesn't break
                    nextIndex = currentPlayerIndex;
                    nextPlayer = currentPlayer;
                    nextPlayerOriginalIndex = getOriginalPoolIndex(currentPlayer);
                    // Keep skipped players mode active
                    // Keep the current player in the list so UI doesn't break (it's already bought, but we show it)
                    setPlayers([currentPlayer]);
                    setSkippedPlayers([]);
                    playersRef.current = [currentPlayer];
                    // Keep is_skipped_players_mode: true in database
                }
            } else {
                // In all players mode (or unbidded mode): find next player in original pool
                const currentPlayerOriginalIndex = getOriginalPoolIndex(currentPlayer);
                const updatedBoughtNames = new Set([...boughtPlayerNames, currentPlayer.name]);
                
                // Check if we're in unbidded mode - if so, update the players list immediately
                // to prevent race condition with real-time subscription
                const isUnbiddedMode = players.length < originalPlayerPool.length;
                if (isUnbiddedMode) {
                    // Update players list immediately to exclude the just-bought player
                    // This ensures playersRef.current is correct when real-time subscription fires
                    const updatedUnbiddedList = originalPlayerPool.filter(player => !updatedBoughtNames.has(player.name));
                    setPlayers(updatedUnbiddedList);
                    playersRef.current = updatedUnbiddedList;
                }
                
                // Find the next player in original pool that hasn't been bought
                let foundNextPlayer: Player | undefined;
                let foundNextOriginalIndex = currentPlayerOriginalIndex;
                
                for (let i = currentPlayerOriginalIndex + 1; i < originalPlayerPool.length; i++) {
                    const candidatePlayer = originalPlayerPool[i];
                    if (!updatedBoughtNames.has(candidatePlayer.name)) {
                        foundNextPlayer = candidatePlayer;
                        foundNextOriginalIndex = i;
                        break;
                    }
                }
                
                // If next player found, use it; otherwise stay on current
                if (foundNextPlayer) {
                    nextPlayer = foundNextPlayer;
                    nextPlayerOriginalIndex = foundNextOriginalIndex;
                    // Find index in the updated list (if unbidded mode) or current list
                    const listToSearch = isUnbiddedMode ? playersRef.current : players;
                    nextIndex = listToSearch.findIndex(p => p.name === foundNextPlayer!.name);
                    if (nextIndex === -1) {
                        // Fallback: use current index (shouldn't happen, but subscription will correct it)
                        nextIndex = Math.min(currentPlayerIndex, listToSearch.length - 1);
                    }
                } else {
                    // No more unbidded players, stay on current
                    nextIndex = currentPlayerIndex;
                    nextPlayer = currentPlayer;
                    nextPlayerOriginalIndex = currentPlayerOriginalIndex;
                }
            }

            // Update session with next player index and sold player info
            // This will trigger real-time updates for all users
            // Preserve is_skipped_players_mode flag and save appropriate index
            console.log('[MODAL DEBUG] 🛒 handleBuyPlayer - Setting sold_player_info and moving to next player', {
                currentIndex: currentPlayerIndex,
                nextIndex: nextIndex,
                nextPlayerOriginalIndex: nextPlayerOriginalIndex,
                soldPlayerInfo: soldPlayerInfo,
                timestamp: new Date().toISOString()
            });

            const updateData: any = {
                    sold_player_info: soldPlayerInfo,
                congratulations_modal_acknowledged: false, // Set to false to show modal to all users
                    is_skipped_players_mode: isSkippedPlayersModeRef.current,
                    current_bid_team_id: null // Clear team selection in first update to prevent subscription overwrite
            };

            // Save index to the appropriate column based on mode
            if (isSkippedPlayersModeRef.current) {
                // In skipped players mode: save to skipped_players_index
                // Even if there are no more skipped players, keep the mode and save the last index
                updateData.skipped_players_index = nextIndex;
            } else if (!isSkippedPlayersModeRef.current) {
                // In all players mode: save to current_player_index using originalPlayerPool index
                updateData.current_player_index = nextPlayerOriginalIndex;
            }

            // Set flag to prevent subscription from overwriting our changes
            isUpdatingBidRef.current = true;

            await supabase
                .from('auction_sessions')
                .update(updateData)
                .eq('id', sessionId)
                .then(({ error }) => {
                    if (error) {
                        console.error('[MODAL DEBUG] ❌ Error setting sold_player_info:', error);
                    } else {
                        console.log('[MODAL DEBUG] ✅ Successfully set sold_player_info and moved to next player');
                    }
                });

            // Update local state immediately for instant UI update
            setCurrentPlayerIndex(nextIndex);

            // Show success modal for admin (will also show for others via database polling)
            // sold_player_info will be cleared when admin clicks "Proceed" button
            console.log('[MODAL DEBUG] 📢 Setting local modal state for admin', {
                soldPlayerInfo: soldPlayerInfo,
                timestamp: new Date().toISOString()
            });
            setSuccessMessage(soldPlayerInfo);
            setShowSuccessModal(true);

            // Reset UI state and update database
            // Use nextPlayer to get the minimum bid for the NEXT player (not current player)
            const newMinimum = getMinimumBidForPlayer(nextPlayer);
            setCurrentBid(newMinimum);
            setSelectedTeamId(null);
            setPlayerBids(new Map());
            
            // Set flag to prevent subscription from overwriting our changes
            isUpdatingBidRef.current = true;
            
            // Update database to sync bid reset
            await supabase
                .from('auction_sessions')
                .update({
                    current_bid_amount: newMinimum,
                    current_bid_team_id: null
                })
                .eq('id', sessionId);
            
            // Clear flag after a short delay to allow database update to propagate
            setTimeout(() => {
                isUpdatingBidRef.current = false;
            }, 300);
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
            const currentPlayer = players[currentPlayerIndex];
            if (!currentPlayer) {
                alert('No player to skip.');
                return;
            }

            // Store state for undo before making changes
            const previousPlayerIndex = currentPlayerIndex;
            const previousBid = currentBid;
            const previousTeamId = selectedTeamId;

            // Check if player has already been sold (bought)
            if (boughtPlayerNames.has(currentPlayer.name)) {
                alert(`${currentPlayer.name} has already been bought and cannot be skipped.`);
                    return;
                }
                
            // Double-check in database to ensure player hasn't been bought
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
                alert(`${currentPlayer.name} has already been bought by ${teamName} and cannot be skipped.`);
                return;
            }

            // Get the player pool ID for the current player
            const { data: playerPoolData } = await supabase
                .from('auction_player_pool')
                .select('id, player_order')
                .eq('session_id', sessionId)
                .eq('name', currentPlayer.name)
                .single();

            if (playerPoolData) {
                // Insert into skipped_players table
                const { error: skipError } = await supabase
                    .from('auction_skipped_players')
                    .insert({
                        session_id: sessionId,
                        player_pool_id: playerPoolData.id,
                        player_name: currentPlayer.name,
                        player_order: playerPoolData.player_order
                    });

                if (skipError) {
                    // If it's a unique constraint error, player is already in the table (ignore)
                    if (skipError.code !== '23505') {
                        console.error('Error inserting skipped player:', skipError);
                        throw skipError;
                    }
                } else {
                    // Add to local state
                    setSkippedPlayers(prev => [...prev, currentPlayer]);
                }
            }

            // Move to next player (do NOT auto-complete the auction here)
            // Auction completion is handled only via handleEndAuction (End Auction button)
            {
                // Move to next player
                // If in skipped players mode, ensure we stay within skipped players array
                let nextPlayer: Player | undefined;
                if (isSkippedPlayersMode) {
                    const nextIndex = currentPlayerIndex < players.length - 1 ? currentPlayerIndex + 1 : currentPlayerIndex;
                    nextPlayer = players[nextIndex];
                    setCurrentPlayerIndex(nextIndex);
                    await supabase
                        .from('auction_sessions')
                        .update({
                            skipped_players_index: nextIndex,
                            is_skipped_players_mode: true
                        })
                        .eq('id', sessionId);
                } else {
                    const nextIndex = currentPlayerIndex + 1;
                    // Get the next player to find its index in originalPlayerPool
                    nextPlayer = players[nextIndex];
                    const nextPlayerOriginalIndex = nextPlayer ? getOriginalPoolIndex(nextPlayer) : getOriginalPoolIndex(currentPlayer);
                    setCurrentPlayerIndex(nextIndex);
                    await supabase
                        .from('auction_sessions')
                        .update({
                            current_player_index: nextPlayerOriginalIndex, // Save index in originalPlayerPool
                            is_skipped_players_mode: false
                        })
                        .eq('id', sessionId);
            }

                // Reset UI state and update database
                // Use nextPlayer to get the minimum bid for the NEXT player (not current player)
                const newMinimum = getMinimumBidForPlayer(nextPlayer);
            setCurrentBid(newMinimum);
            setSelectedTeamId(null);
            setPlayerBids(new Map());
                
                // Set flag to prevent subscription from overwriting our changes
                isUpdatingBidRef.current = true;
                
                // Update database to sync bid reset
                await supabase
                    .from('auction_sessions')
                    .update({
                        current_bid_amount: newMinimum,
                        current_bid_team_id: null
                    })
                    .eq('id', sessionId);
                
                // Clear flag after a short delay to allow database update to propagate
                setTimeout(() => {
                    isUpdatingBidRef.current = false;
                }, 300);

                // Store action for undo
                setLastAction({
                    type: 'skip',
                    playerName: currentPlayer.name,
                    previousPlayerIndex,
                    previousBid,
                    previousTeamId
                });
            }
        } catch (error) {
            console.error('Error skipping player:', error);
            alert('Failed to save auction state. Please try again.');
        }
    };

    // Undo last action
    const handleUndo = async () => {
        if (!canEdit || !lastAction || !sessionId) {
            return;
        }

        try {
            if (lastAction.type === 'buy') {
                // Undo buy: Remove player from team, restore budget, restore player index
                const { data: dbTeam } = await supabase
                    .from('auction_teams')
                    .select('id')
                    .eq('session_id', sessionId)
                    .eq('team_number', lastAction.teamId)
                    .single();

                if (dbTeam) {
                    // Delete player from auction_players
                    const { error: deleteError } = await supabase
                        .from('auction_players')
                        .delete()
                        .eq('session_id', sessionId)
                        .eq('player_name', lastAction.playerName);
                    
                    if (deleteError) {
                        alert('Failed to undo: Could not remove player from database.');
                        return;
                    }
                    
                    // Restore team budget
                    const team = teamMap.get(lastAction.teamId);
                    if (team) {
                        const restoredBudget = team.budget + lastAction.bidAmount;
                        await supabase
                            .from('auction_teams')
                            .update({ budget: restoredBudget })
                            .eq('id', dbTeam.id);
                    }
                    
                    // Reload teams - this updates teams list and boughtPlayerNames from database
                    await reloadTeams();

                    // Restore player index
                    if (isSkippedPlayersMode) {
                        // Re-insert player back into auction_skipped_players table
                        const { data: playerPoolData } = await supabase
                            .from('auction_player_pool')
                            .select('id, player_order')
                            .eq('session_id', sessionId)
                            .eq('name', lastAction.playerName)
                            .single();

                        if (playerPoolData) {
                            await supabase
                                .from('auction_skipped_players')
                                .insert({
                                    session_id: sessionId,
                                    player_pool_id: playerPoolData.id,
                                    player_name: lastAction.playerName,
                                    player_order: playerPoolData.player_order
                                });
                        }

                        // Reload skipped players list from database
                const { data: skippedData } = await supabase
                    .from('auction_skipped_players')
                            .select(`
                                player_pool_id,
                                player_name,
                                player_order,
                                auction_player_pool!inner(
                                    id, name, photo, age, played_s1, experience, active_sport, skill, batting_hand, bowling_hand, wing, flat_no, phone, category, player_order
                                )
                            `)
                    .eq('session_id', sessionId)
                    .order('player_order', { ascending: true });

                if (skippedData && skippedData.length > 0) {
                    const poolMap = new Map(
                                skippedData.map((sp: any) => [sp.player_pool_id, sp.auction_player_pool])
                    );

                            const updatedSkippedList: Player[] = skippedData
                        .map((sp: any) => {
                            const poolPlayer = poolMap.get(sp.player_pool_id);
                            if (!poolPlayer) return null;
                            return {
                                name: poolPlayer.name,
                                photo: poolPlayer.photo || undefined,
                                age: poolPlayer.age || undefined,
                                played_s1: poolPlayer.played_s1 || undefined,
                                experience: poolPlayer.experience || undefined,
                                active_sport: poolPlayer.active_sport || undefined,
                                skill: poolPlayer.skill || undefined,
                                batting_hand: poolPlayer.batting_hand || undefined,
                                bowling_hand: poolPlayer.bowling_hand || undefined,
                                wing: poolPlayer.wing || undefined,
                                flat_no: poolPlayer.flat_no || undefined,
                                phone: poolPlayer.phone || undefined,
                                category: poolPlayer.category || undefined
                            } as Player;
                        })
                        .filter((p): p is Player => p !== null);

                            setPlayers(updatedSkippedList);
                            setSkippedPlayers(updatedSkippedList);
                            playersRef.current = updatedSkippedList;

                            const undoneIndex = updatedSkippedList.findIndex(p => p.name === lastAction.playerName);
                            if (undoneIndex !== -1) {
                                setCurrentPlayerIndex(undoneIndex);
                        await supabase
                            .from('auction_sessions')
                            .update({
                                        skipped_players_index: undoneIndex,
                                        current_bid_amount: lastAction.previousBid,
                                        current_bid_team_id: lastAction.previousTeamId
                            })
                            .eq('id', sessionId);
                    }
                }
            } else {
                        // In all players or unbidded mode
                        const updatedBoughtNames = new Set(boughtPlayerNames);
                        updatedBoughtNames.delete(lastAction.playerName);
                        
                        const isUnbiddedMode = players.length < originalPlayerPool.length;
                        if (isUnbiddedMode) {
                            const updatedUnbiddedList = originalPlayerPool.filter(player => !updatedBoughtNames.has(player.name));
                            setPlayers(updatedUnbiddedList);
                            playersRef.current = updatedUnbiddedList;
                            
                            const undoneIndex = updatedUnbiddedList.findIndex(p => p.name === lastAction.playerName);
                            if (undoneIndex !== -1) {
                                setCurrentPlayerIndex(undoneIndex);
                                const undonePlayer = updatedUnbiddedList[undoneIndex];
                                const originalIndex = getOriginalPoolIndex(undonePlayer);
                    await supabase
                        .from('auction_sessions')
                        .update({
                                        current_player_index: originalIndex,
                                        current_bid_amount: lastAction.previousBid,
                                        current_bid_team_id: lastAction.previousTeamId
                        })
                        .eq('id', sessionId);
                            }
                } else {
                            // All players mode
                            const originalIndex = originalPlayerPool.findIndex(p => p.name === lastAction.playerName);
                            if (originalIndex !== -1) {
                                setCurrentPlayerIndex(originalIndex);
                    await supabase
                        .from('auction_sessions')
                        .update({
                                        current_player_index: originalIndex,
                                        current_bid_amount: lastAction.previousBid,
                                        current_bid_team_id: lastAction.previousTeamId
                        })
                        .eq('id', sessionId);
                            }
                        }
                    }

                    // Restore bid and team selection
                    setCurrentBid(lastAction.previousBid);
                    setSelectedTeamId(lastAction.previousTeamId);
                }
            } else if (lastAction.type === 'skip') {
                // Undo skip: Remove from skipped_players table, restore player index
                await supabase
                    .from('auction_skipped_players')
                    .delete()
                    .eq('session_id', sessionId)
                    .eq('player_name', lastAction.playerName);

                // Remove from local skipped players
                setSkippedPlayers(prev => prev.filter(p => p.name !== lastAction.playerName));

                // Restore player index and bid
                setCurrentPlayerIndex(lastAction.previousPlayerIndex);
                setCurrentBid(lastAction.previousBid);
                setSelectedTeamId(lastAction.previousTeamId);

                // Update database
                const currentPlayer = players[lastAction.previousPlayerIndex];
                if (currentPlayer) {
                    const originalIndex = getOriginalPoolIndex(currentPlayer);
                    await supabase
                        .from('auction_sessions')
                        .update({
                            current_player_index: originalIndex,
                            current_bid_amount: lastAction.previousBid,
                            current_bid_team_id: lastAction.previousTeamId
                        })
                        .eq('id', sessionId);
                }
            } else if (lastAction.type === 'bid') {
                // Undo bid: Restore previous bid and team selection
                setCurrentBid(lastAction.previousBid);
                setSelectedTeamId(lastAction.previousTeamId);

                // Update playerBids map
                if (lastAction.previousTeamId && lastAction.previousBid >= currentMinimumBid) {
                    const team = teamMap.get(lastAction.previousTeamId);
                    if (team) {
                        setPlayerBids(prev => {
                            const newBids = new Map(prev);
                            newBids.set(lastAction.previousBid, {
                                teamId: lastAction.previousTeamId!,
                                teamName: team.name,
                                amount: lastAction.previousBid
                            });
                            return newBids;
                        });
                    }
                } else {
                    setPlayerBids(new Map());
                }

                // Update database
                await supabase
                    .from('auction_sessions')
                    .update({
                        current_bid_amount: lastAction.previousBid,
                        current_bid_team_id: lastAction.previousTeamId
                    })
                    .eq('id', sessionId);
            }

            // Clear last action after undo
            setLastAction(null);
        } catch (error) {
            console.error('Error undoing action:', error);
            alert('Failed to undo action. Please try again.');
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
                // Switch to skipped players only
                setPlayers(skippedList);
                setIsSkippedPlayersMode(true);
                // Update ref immediately to prevent race conditions with useEffect
                isSkippedPlayersModeRef.current = true;
                playersRef.current = skippedList;
            }

            // Update database session - save mode and appropriate index
            // IMPORTANT: Only update skipped_players_index, NOT current_player_index
            // This preserves the position in all players mode when switching back
            const updateData: any = {
                is_skipped_players_mode: true,
                skipped_players_index: playerIndex
                // Do NOT update current_player_index - keep it as is
            };
            
            await supabase
                .from('auction_sessions')
                .update(updateData)
                .eq('id', sessionId);

            // Update local state to the specific player index
            // The ref is already updated above, so the useEffect will know we're in skipped mode
            setCurrentPlayerIndex(playerIndex);

            // Reset bid to minimum
            const newMinimum = getMinimumBid();
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

            // Load skipped players from table
            const { data: skippedData } = await supabase
                .from('auction_skipped_players')
                .select('player_pool_id, player_name, player_order')
                .eq('session_id', sessionId)
                .order('player_order', { ascending: true });

            if (skippedData && skippedData.length > 0) {
                // Get player pool data to map skipped players
                const { data: allPoolData } = await supabase
                    .from('auction_player_pool')
                    .select('id, name, photo, age, played_s1, experience, active_sport, skill, batting_hand, bowling_hand, wing, flat_no, phone, category')
                    .eq('session_id', sessionId);

                const poolMap = new Map(
                    (allPoolData || []).map((p: any) => [p.id, p])
                );

                const skippedList: Player[] = skippedData
                    .map((sp: any) => {
                        const poolPlayer = poolMap.get(sp.player_pool_id);
                        if (!poolPlayer) return null;
                        return {
                            name: poolPlayer.name,
                            photo: poolPlayer.photo || undefined,
                            age: poolPlayer.age || undefined,
                            played_s1: poolPlayer.played_s1 || undefined,
                            experience: poolPlayer.experience || undefined,
                            active_sport: poolPlayer.active_sport || undefined,
                            skill: poolPlayer.skill || undefined,
                            batting_hand: poolPlayer.batting_hand || undefined,
                            bowling_hand: poolPlayer.bowling_hand || undefined,
                            wing: poolPlayer.wing || undefined,
                            flat_no: poolPlayer.flat_no || undefined,
                            phone: poolPlayer.phone || undefined,
                            category: poolPlayer.category || undefined
                        } as Player;
                    })
                    .filter((p): p is Player => p !== null);

                setSkippedPlayers(skippedList);
            } else {
                setSkippedPlayers([]);
            }

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
            const { default: JsPDF } = await import('jspdf');
            const pdf = new JsPDF('p', 'mm', 'a4');
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
                const teamLogoPath = getTeamLogo(team.logoUrl);
                // If it's a proxy URL (starts with /api/proxy-image), use it directly
                // Otherwise, fetch it normally
                const logoUrlToFetch = teamLogoPath.startsWith('/api/proxy-image')
                    ? teamLogoPath
                    : teamLogoPath;
                const response = await fetch(logoUrlToFetch);
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

            // Load tournament logo from database (or fallback to logo2.png)
            try {
                // Fetch tournament logo directly from database for this session
                let tournamentLogoUrl: string = '/logo2.png'; // Default fallback

                if (sessionId) {
                    const { data: sessionData, error: sessionError } = await supabase
                        .from('auction_sessions')
                        .select('tournament_logo')
                        .eq('id', sessionId)
                        .single();

                    if (!sessionError && sessionData && sessionData.tournament_logo && typeof sessionData.tournament_logo === 'string') {
                        const processedUrl = processImageUrl(sessionData.tournament_logo);
                        if (processedUrl) {
                            tournamentLogoUrl = processedUrl;
                            console.log('Using tournament logo from DB:', tournamentLogoUrl);
                        } else {
                            console.log('Failed to process tournament logo URL, using fallback');
                        }
                    } else {
                        console.log('No tournament logo in DB, using fallback:', sessionError || 'No logo field');
                    }
                } else if (tournamentLogo && typeof tournamentLogo === 'string') {
                    // Fallback to state if sessionId not available
                    const processedUrl = processImageUrl(tournamentLogo);
                    if (processedUrl) {
                        tournamentLogoUrl = processedUrl;
                        console.log('Using tournament logo from state:', tournamentLogoUrl);
                    } else {
                        console.log('Failed to process tournament logo from state, using fallback');
                    }
                }

                // If it's a proxy URL (starts with /api/proxy-image), use it directly
                // Otherwise, fetch it normally
                const logoUrlToFetch = tournamentLogoUrl.startsWith('/api/proxy-image')
                    ? tournamentLogoUrl
                    : tournamentLogoUrl;

                const response = await fetch(logoUrlToFetch);
                if (!response.ok) {
                    throw new Error(`Failed to fetch tournament logo: ${response.statusText}`);
                }
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
                        logoImg.onerror = () => {
                            console.error('Error loading tournament logo image');
                            resolve(); // Continue if tournament logo fails
                        };
                        logoImg.src = logo2DataUrl;
                    };
                    reader.onerror = () => {
                        console.error('Error reading tournament logo file');
                        resolve(); // Continue if tournament logo fails
                    };
                    reader.readAsDataURL(blob);
                });
            } catch (logo2Error) {
                console.error('Error loading tournament logo:', logo2Error);
            }

            // Helper function to detect image format from data URL
            const getImageFormat = (dataUrl: string): string => {
                if (dataUrl.startsWith('data:image/png')) return 'PNG';
                if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) return 'JPEG';
                if (dataUrl.startsWith('data:image/gif')) return 'GIF';
                if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
                // Default to JPEG if format cannot be determined
                return 'JPEG';
            };

            // Add app logo (left side)
            if (appLogoDataUrl && appLogoHeight > 0 && logoWidth > 0) {
                try {
                    // Validate dimensions before adding
                    if (isFinite(logoWidth) && isFinite(appLogoHeight)) {
                        const appLogoFormat = getImageFormat(appLogoDataUrl);
                        pdf.addImage(appLogoDataUrl, appLogoFormat, margin, logoY, logoWidth, appLogoHeight);
                        maxHeaderHeight = Math.max(maxHeaderHeight, appLogoHeight);
                    }
                } catch (appLogoError) {
                    console.error('Error adding app logo to PDF:', appLogoError);
                    // Continue without app logo
                }
            }

            // Add logo2.png (right side) - same Y position as app logo (bigger size)
            if (logo2DataUrl && logo2Height > 0 && logoWidth > 0) {
                try {
                    const logo2Width = logoWidth * 1.3; // 30% bigger than app logo
                    const logo2HeightBigger = (logo2Height / logoWidth) * logo2Width; // Maintain aspect ratio
                    // Validate dimensions before adding
                    if (logo2Width > 0 && logo2HeightBigger > 0 && isFinite(logo2Width) && isFinite(logo2HeightBigger)) {
                        const logo2X = pageWidth - margin - logo2Width; // Right aligned
                        const logo2Format = getImageFormat(logo2DataUrl);
                        pdf.addImage(logo2DataUrl, logo2Format, logo2X, logoY, logo2Width, logo2HeightBigger);
                        maxHeaderHeight = Math.max(maxHeaderHeight, logo2HeightBigger);
                    }
                } catch (logo2AddError) {
                    console.error('Error adding tournament logo to PDF:', logo2AddError);
                    // Continue without tournament logo
                }
            }

            // "Team Report" text below app logo (left aligned)
            pdf.setFontSize(22);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('helvetica', 'bold');
            const teamReportY = logoY + (appLogoHeight || 15) + 8;
            pdf.text('Team Report', margin, teamReportY);

            // Add team logo below "Team Report" (left aligned, larger size)
            let teamLogoBelowY = teamReportY + 6; // Small gap below "Team Report" text
            if (teamLogoDataUrl && teamLogoHeight > 0 && logoWidth > 0) {
                try {
                    const teamLogoBelowWidth = 50; // Increased width for logo below Team Report (was 30)
                    const teamLogoBelowHeight = (teamLogoHeight / logoWidth) * teamLogoBelowWidth;
                    // Validate dimensions before adding
                    if (teamLogoBelowWidth > 0 && teamLogoBelowHeight > 0 && isFinite(teamLogoBelowWidth) && isFinite(teamLogoBelowHeight)) {
                        const teamLogoFormat = getImageFormat(teamLogoDataUrl);
                        pdf.addImage(teamLogoDataUrl, teamLogoFormat, margin, teamLogoBelowY, teamLogoBelowWidth, teamLogoBelowHeight);
                        teamLogoBelowY += teamLogoBelowHeight + 8; // Increased gap to 8mm between logo and text
                    } else {
                        teamLogoBelowY += 8;
                    }
                } catch (teamLogoError) {
                    console.error('Error adding team logo to PDF:', teamLogoError);
                    teamLogoBelowY += 8;
                }
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
                // Adjusted column widths: S.No (5mm), Photo (fixed size matching auction UI), Name (flexible), Phone (30mm), Amount (35mm fixed)
                const sNoWidth = 5; // Reduced from 10mm
                // Fixed image size matching auction UI: w-72 (288px ≈ 76mm) h-96 (384px ≈ 102mm)
                const imageWidth = 40; // Reduced width for player images
                const imageHeight = 54; // Reduced height for player images (maintains 3:4 aspect ratio)
                const imageRowHeight = imageHeight + 4; // Image height + 2mm padding top and bottom
                const phoneWidth = 30;
                const amountWidth = 35;
                const nameWidth = playerTableWidth - sNoWidth - imageWidth - phoneWidth - amountWidth - 2; // Extra 2mm for spacing

                // Table Header
                pdf.setFillColor(220, 38, 38);
                pdf.rect(playerTableStartX, yPosition, playerTableWidth, playerRowHeight, 'F');
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(10);
                pdf.setFont('helvetica', 'bold');
                pdf.text('No', playerTableStartX + sNoWidth / 2, yPosition + 5.5, { align: 'center' });
                pdf.text('Photo', playerTableStartX + sNoWidth + imageWidth / 2, yPosition + 5.5, { align: 'center' });
                pdf.text('Player Name', playerTableStartX + sNoWidth + imageWidth + nameWidth / 2, yPosition + 5.5, { align: 'center' });
                pdf.text('Phone', playerTableStartX + sNoWidth + imageWidth + nameWidth + phoneWidth / 2, yPosition + 5.5, { align: 'center' });
                pdf.text('Amount', playerTableStartX + sNoWidth + imageWidth + nameWidth + phoneWidth + amountWidth / 2, yPosition + 5.5, { align: 'center' });
                yPosition += playerRowHeight;

                // Fetch player photos and phone numbers from player pool
                const { data: playerPoolData } = await supabase
                    .from('auction_player_pool')
                    .select('name, photo, phone')
                    .eq('session_id', sessionId || '');

                const playerPhotoMap = new Map<string, string>();
                const playerPhoneMap = new Map<string, string>();
                if (playerPoolData) {
                    for (const poolPlayer of playerPoolData) {
                        if (poolPlayer.photo) {
                            playerPhotoMap.set(poolPlayer.name, poolPlayer.photo);
                        }
                        if (poolPlayer.phone) {
                            playerPhoneMap.set(poolPlayer.name, poolPlayer.phone);
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

                    // Phone Number - centered vertically
                    const playerPhone = playerPhoneMap.get(player.name) || '';
                    const phoneX = playerTableStartX + sNoWidth + imageWidth + nameWidth + 2;
                    pdf.text(playerPhone, phoneX, yPosition + currentRowHeight / 2);

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
                    const amountX = playerTableStartX + sNoWidth + imageWidth + nameWidth + phoneWidth + amountWidth - 2;
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
                const totalAmountX = playerTableStartX + sNoWidth + imageWidth + nameWidth + phoneWidth + amountWidth - 2;
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

    const generateTopBiddedPlayersPDF = async () => {
        // Set loading state
        setPdfGeneratingTopPlayers(true);
        try {
            if (!sessionId) {
                alert('No session found. Please select a session first.');
                return;
            }

            // Fetch top 5 bidded players for the current session
            const { data: topPlayers, error: fetchError } = await supabase
                .from('auction_players')
                .select(`
                    player_name,
                    bid_amount,
                    photo,
                    age
                `)
                .eq('session_id', sessionId)
                .order('bid_amount', { ascending: false })
                .limit(5);

            if (fetchError) {
                console.error('Error fetching top players:', fetchError);
                throw fetchError;
            }

            if (!topPlayers || topPlayers.length === 0) {
                alert('No players have been bid on yet in this session.');
                return;
            }

            const { default: JsPDF } = await import('jspdf');
            const pdf = new JsPDF('p', 'mm', 'a4');
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

            // Load tournament logo from database (or fallback to logo2.png)
            try {
                // Fetch tournament logo directly from database for this session
                let tournamentLogoUrl: string = '/logo2.png'; // Default fallback

                if (sessionId) {
                    const { data: sessionData, error: sessionError } = await supabase
                        .from('auction_sessions')
                        .select('tournament_logo')
                        .eq('id', sessionId)
                        .single();

                    if (!sessionError && sessionData && sessionData.tournament_logo && typeof sessionData.tournament_logo === 'string') {
                        const processedUrl = processImageUrl(sessionData.tournament_logo);
                        if (processedUrl) {
                            tournamentLogoUrl = processedUrl;
                            console.log('Using tournament logo from DB:', tournamentLogoUrl);
                        } else {
                            console.log('Failed to process tournament logo URL, using fallback');
                        }
                    } else {
                        console.log('No tournament logo in DB, using fallback:', sessionError || 'No logo field');
                    }
                } else if (tournamentLogo && typeof tournamentLogo === 'string') {
                    // Fallback to state if sessionId not available
                    const processedUrl = processImageUrl(tournamentLogo);
                    if (processedUrl) {
                        tournamentLogoUrl = processedUrl;
                        console.log('Using tournament logo from state:', tournamentLogoUrl);
                    } else {
                        console.log('Failed to process tournament logo from state, using fallback');
                    }
                }

                // If it's a proxy URL (starts with /api/proxy-image), use it directly
                // Otherwise, fetch it normally
                const logoUrlToFetch = tournamentLogoUrl.startsWith('/api/proxy-image')
                    ? tournamentLogoUrl
                    : tournamentLogoUrl;

                const response = await fetch(logoUrlToFetch);
                if (!response.ok) {
                    throw new Error(`Failed to fetch tournament logo: ${response.statusText}`);
                }
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
                        logoImg.onerror = () => {
                            console.error('Error loading tournament logo image');
                            resolve(); // Continue if tournament logo fails
                        };
                        logoImg.src = logo2DataUrl;
                    };
                    reader.onerror = () => {
                        console.error('Error reading tournament logo file');
                        resolve(); // Continue if tournament logo fails
                    };
                    reader.readAsDataURL(blob);
                });
            } catch (logo2Error) {
                console.error('Error loading tournament logo:', logo2Error);
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
            const titleText = 'Top 5 Bidded Players';
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

            // Fetch player photos from player pool using the current session ID
            const { data: playerPoolData } = await supabase
                .from('auction_player_pool')
                .select('name, photo')
                .eq('session_id', sessionId);

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
            pdf.save('Top_5_Bidded_Players.pdf');
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        } finally {
            setPdfGeneratingTopPlayers(false);
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
                                    {(() => {
                                        const logoUrl = getTeamLogo(team.logoUrl);
                                        const isProxyUrl = logoUrl.startsWith('/api/proxy-image');
                                        if (isProxyUrl) {
                                            return (
                                                <img
                                                    key={`team-dynamics-${team.id}-${sessionName || 'default'}`}
                                                    src={logoUrl}
                                                    alt={`${team.name} logo`}
                                                    width={48}
                                                    height={48}
                                                    className="object-contain"
                                                />
                                            );
                                        }
                                        return (
                                            <Image
                                                key={`team-dynamics-${team.id}-${sessionName || 'default'}`}
                                                src={logoUrl}
                                                alt={`${team.name} logo`}
                                                width={48}
                                                height={48}
                                                unoptimized
                                                className="object-contain"
                                            />
                                        );
                                    })()}
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
                                            Download PDF
                                        </>
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Top 5 Bidded Players PDF Downloads */}
                    <div className="mt-8 bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Top 5 Bidded Players Report</h2>
                        <div className="flex justify-center">
                            <button
                                onClick={() => generateTopBiddedPlayersPDF()}
                                disabled={pdfGeneratingTopPlayers}
                                className="w-full md:w-auto px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {pdfGeneratingTopPlayers ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Generating PDF...
                                    </>
                                ) : (
                                    <>
                                        Download Top 5 Players PDF
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
        <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#0F172A' }}>
            {/* Success Modal */}
            {showSuccessModal && successMessage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 md:p-12 transform transition-all relative overflow-visible">
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

                        {/* Content - Centered */}
                        <div className="relative z-10 text-center">
                            {/* Logo on Top */}
                            <div className="flex justify-center mb-4">
                                <Image
                                    src="/logo.jpeg"
                                    alt="Logo"
                                    width={120}
                                    height={60}
                                    className="object-contain"
                                />
                            </div>

                            {/* Congratulations */}
                            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Congratulations!!</h2>

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
                                for ₹{formatIndianNumber(successMessage.amount)}
                            </p>
                        </div>

                        {/* Button - Only show for admin users */}
                        {canEdit && (
                            <div className="relative z-10 mt-6">
                                <button
                                    onClick={async () => {
                                        console.log('[MODAL DEBUG] 🔘 Proceed button clicked - admin acknowledging modal', {
                                            timestamp: new Date().toISOString(),
                                            sessionId: sessionId
                                        });
                                        
                                        // Update database: set congratulations_modal_acknowledged to true and clear sold_player_info
                                        if (sessionId) {
                                            const { error } = await supabase
                                                .from('auction_sessions')
                                                .update({ 
                                                    congratulations_modal_acknowledged: true,
                                                    sold_player_info: null 
                                                })
                                                .eq('id', sessionId);

                                            if (error) {
                                                console.error('[MODAL DEBUG] ❌ Error updating congratulations_modal_acknowledged:', error);
                                                alert('Failed to update. Please try again.');
                                            } else {
                                                console.log('[MODAL DEBUG] ✅ Successfully acknowledged congratulations modal');
                                                // Close modal locally
                                                setShowSuccessModal(false);
                                                setSuccessMessage(null);
                                            }
                                        }
                                    }}
                                    className="w-full bg-red-600 text-white py-3 px-8 rounded-lg font-semibold text-base hover:bg-red-700 transition-colors"
                                >
                                    Continue
                                </button>
                            </div>
                        )}
                        {/* For non-admin users, show message that it will close automatically */}
                        {!canEdit && (
                            <div className="relative z-10 mt-6">
                                <p className="text-sm text-gray-500 text-center">
                                    The auction will continue automatically...
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Header */}
            <div className={`border-b sticky top-0 z-10 shadow-sm transition-all duration-300 ${isHeaderOpen ? 'px-2 md:px-3 py-3' : 'px-2 py-1'}`} style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}>
                {isHeaderOpen ? (
                    <div className="w-full flex items-center justify-between gap-2">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-1 md:gap-2 flex-shrink-0" style={{ color: '#E5E7EB' }}
                        >
                            <span className="hidden sm:inline">Back</span>
                        </button>
                        <h1 className="text-lg md:text-xl lg:text-2xl font-bold flex-shrink-0" style={{ color: '#E5E7EB' }}>
                            <span className="md:hidden">Auction</span>
                            <span className="hidden md:inline">{sessionName ? `${sessionName} Auction` : 'Auction'}</span>
                        </h1>
                        <div
                            className="flex items-center gap-1 md:gap-1.5 md:gap-3 flex-shrink-0 overflow-x-auto"
                            style={{
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                                WebkitScrollbar: { display: 'none' }
                            } as React.CSSProperties}
                        >
                            <button
                                onClick={() => setIsTopPlayersSheetOpen(true)}
                                className="px-2 py-1 md:px-4 md:py-2 rounded-lg border-2 font-medium text-xs md:text-sm transition-colors whitespace-nowrap flex-shrink-0"
                                style={{
                                    backgroundColor: '#F59E0B',
                                    borderColor: '#F59E0B',
                                    color: '#FFFFFF'
                                }}
                                title="Top 5 Bidded Players"
                            >
                                <span className="sm:hidden">Top 5</span>
                                <span className="hidden sm:inline">Top 5</span>
                            </button>
                            <button
                                onClick={() => setIsTeamDynamicsSheetOpen(true)}
                                className="px-2 py-1 md:px-4 md:py-2 rounded-lg border-2 font-medium text-xs md:text-sm transition-colors whitespace-nowrap flex-shrink-0"
                                style={{
                                    backgroundColor: '#3B82F6',
                                    borderColor: '#3B82F6',
                                    color: '#FFFFFF'
                                }}
                                title="Team Dynamics"
                            >
                                <span className="sm:hidden">Teams</span>
                                <span className="hidden sm:inline">Team Dynamics</span>
                            </button>
                            <button
                                onClick={() => setIsSkippedPlayersSheetOpen(true)}
                                className="px-2 py-1 md:px-4 md:py-2 rounded-lg border-2 font-medium text-xs md:text-sm transition-colors whitespace-nowrap flex-shrink-0"
                                style={{
                                    backgroundColor: '#F97316',
                                    borderColor: '#F97316',
                                    color: '#FFFFFF'
                                }}
                                title={`Skipped Players (${skippedPlayersCount})`}
                            >
                                <span className="sm:hidden">Skip ({skippedPlayersCount})</span>
                                <span className="hidden sm:inline">Skipped Players ({skippedPlayersCount})</span>
                            </button>
                            {/* Mode switcher buttons - show when in skipped mode or auction is complete */}
                            {(isSkippedPlayersMode || auctionComplete) && canEdit && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleSwitchToUnbiddedPlayers}
                                        className={`px-3 py-1.5 text-xs md:text-sm rounded-lg font-medium transition-colors ${!isSkippedPlayersMode
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        title="Switch to All Unbidded Players"
                                    >
                                        <span className="hidden sm:inline">All Unbidded</span>
                                        <span className="sm:hidden">All</span>
                                    </button>
                                    <button
                                        onClick={handleSwitchToSkippedPlayers}
                                        className={`px-3 py-1.5 text-xs md:text-sm rounded-lg font-medium transition-colors ${isSkippedPlayersMode
                                            ? 'bg-red-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        title="Switch to Skipped Players Only"
                                    >
                                        <span className="hidden sm:inline">Skipped Only</span>
                                        <span className="sm:hidden">Skipped</span>
                                    </button>
                                </div>
                            )}
                            <button
                                onClick={() => setIsPlayerListSheetOpen(true)}
                                className="px-2 py-1 md:px-4 md:py-2 rounded-lg border-2 font-medium text-xs md:text-sm transition-colors whitespace-nowrap flex-shrink-0"
                                style={{
                                    backgroundColor: '#10B981',
                                    borderColor: '#10B981',
                                    color: '#FFFFFF'
                                }}
                                title="View All Players"
                            >
                                <span className="hidden sm:inline">Players List</span>
                                <span className="sm:hidden">List</span>
                            </button>
                            {canEdit && !auctionComplete && (
                                <button
                                    onClick={handleEndAuction}
                                    className="hidden md:flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                                    title="End Auction"
                                >
                                    End Auction
                                </button>
                            )}
                            <button
                                onClick={() => setIsHeaderOpen(!isHeaderOpen)}
                                className="flex items-center gap-1 px-2 py-1 text-sm hover:bg-gray-700 rounded transition-colors"
                                style={{ color: '#E5E7EB' }}
                                title={isHeaderOpen ? "Minimize header" : "Expand header"}
                            >
                                {isHeaderOpen ? '−' : '+'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="w-full flex items-center justify-between">
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-1 md:gap-2 flex-shrink-0" style={{ color: '#E5E7EB' }}
                        >
                            <span className="hidden sm:inline">Back</span>
                        </button>
                        <button
                            onClick={() => setIsHeaderOpen(!isHeaderOpen)}
                            className="flex items-center gap-1 px-2 py-1 text-sm hover:bg-gray-700 rounded transition-colors"
                            style={{ color: '#E5E7EB' }}
                            title="Expand header"
                        >
                            +
                        </button>
                    </div>
                )}
            </div>

            <div className="w-full px-2 md:px-3 flex-1 overflow-hidden xl:overflow-hidden overflow-y-auto min-h-0">
                <div
                    ref={containerRef}
                    className="hidden xl:flex items-stretch gap-3 h-full"
                >
                    {/* Left Sidebar - Team Selection (Desktop) */}
                    <div
                        className="flex-shrink-0 overflow-hidden"
                        style={{
                            width: leftPanelWidth !== null
                                ? `${leftPanelWidth}%`
                                : teams.length > 10
                                    ? '60%'
                                    : '33.333%'
                        }}
                    >
                        <div className="rounded-xl border-2 p-4 md:p-5 h-full flex flex-col" style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}>
                            {/* Select Team Section */}
                            <div className="flex-1 overflow-hidden">
                                <div className={`grid ${teams.length > 10 ? 'grid-cols-4' : 'grid-cols-2'} gap-2 md:gap-3 h-full overflow-y-auto pr-2`}>
                                    {teams.map(team => {
                                        // Calculate maximum bid this team can make for current player
                                        // They need to reserve minimum bid for remaining players
                                        // Uses category_limits and category_minimum_bids from database settings
                                        const minimumRequiredForRemaining = calculateMinimumRequiredForRemaining(team);
                                        const maxBid = team.budget - minimumRequiredForRemaining;

                                        // Calculate what the new bid would be if this team is selected
                                        // Use current bid if it's >= minimum, otherwise calculate increment
                                        const minimumBid = getMinimumBid();
                                        let newBid: number;
                                        if (currentBid >= minimumBid) {
                                            // Use current bid (could be custom bid)
                                            newBid = currentBid;
                                        } else {
                                            // Calculate increment
                                            const increment = getBidIncrement(currentBid);
                                            newBid = currentBid + increment;
                                        }

                                        // Check if team can afford the new bid and if it's within their max bid
                                        // Use a small tolerance (0.01) to handle floating point precision issues
                                        const canAfford = team.budget >= newBid;
                                        const withinMaxBid = newBid <= maxBid + 0.01;
                                        const hasSpace = team.players.length < getPlayersPerTeam();

                                        // Check category limits
                                        const currentPlayerCategory = currentPlayer?.category;
                                        let withinCategoryLimit = true;
                                        if (currentPlayerCategory && auctionSettings?.category_limits && auctionSettings.category_limits[currentPlayerCategory]) {
                                            const categoryLimit = auctionSettings.category_limits[currentPlayerCategory];
                                            // Count how many players of this category the team already has
                                            // Use originalPlayerPool to get category info, not the current players array
                                            // (which might be filtered to skipped players only)
                                            const categoryCount = team.players.filter(p => {
                                                // Need to get the category from the original player pool
                                                const playerInPool = originalPlayerPool.find(pl => pl.name === p.name);
                                                return playerInPool?.category === currentPlayerCategory;
                                            }).length;
                                            withinCategoryLimit = categoryCount < categoryLimit;
                                        }

                                        const isDisabled = !canAfford || !hasSpace || !withinMaxBid || maxBid < getMinimumBid() || !withinCategoryLimit;

                                        const isViewOnly = !canEdit;
                                        const finalDisabled = isDisabled || isViewOnly;

                                        // Determine team status for coloring
                                        // Use relative budget percentage per team using its initial budget if available
                                        const budgetPercentage = team.budget > 0 && team.players.length > 0
                                            ? (team.budget / (team.budget + team.players.reduce((sum, p) => sum + (p.bidAmount || 0), 0))) * 100
                                            : 100;
                                        const isLowBudget = budgetPercentage < 20; // Less than 20% of total budget remaining
                                        const isSelected = selectedTeamId === team.id;

                                        // Status-based colors
                                        let backgroundColor = '#111827';
                                        let borderColor = '#1F2937';

                                        if (isSelected) {
                                            // Red for selected team
                                            backgroundColor = '#7F1D1D';
                                            borderColor = '#DC2626';
                                        } else if (finalDisabled) {
                                            // Red for cannot bid (no budget or team full)
                                            backgroundColor = '#111827';
                                            borderColor = '#DC2626';
                                        } else if (isLowBudget) {
                                            // Yellow/Orange for low budget warning
                                            backgroundColor = '#78350F';
                                            borderColor = '#F59E0B';
                                        } else if (canAfford && hasSpace && withinMaxBid) {
                                            // Blue for can bid
                                            backgroundColor = '#1E3A8A';
                                            borderColor = '#3B82F6';
                                        } else {
                                            // Default gray
                                            backgroundColor = '#111827';
                                            borderColor = '#1F2937';
                                        }

                                        return (
                                            <button
                                                key={team.id}
                                                onClick={() => {
                                                    if (!finalDisabled) {
                                                        handleTeamSelection(team.id);
                                                    }
                                                }}
                                                disabled={finalDisabled}
                                                className={`${teams.length > 10 ? 'p-2 md:p-2.5' : 'p-2 md:p-2.5'} rounded-lg border-2 text-left transition-all min-w-0 w-full ${selectedTeamId === team.id
                                                    ? 'shadow-md' // Active - will add custom style
                                                    : finalDisabled
                                                        ? 'opacity-50 cursor-not-allowed'
                                                        : ''
                                                    }`}
                                                style={{ backgroundColor, borderColor }}
                                            >
                                                <div className="flex items-start gap-1.5 mb-2 w-full">
                                                    {(() => {
                                                        const logoUrl = getTeamLogo(team.logoUrl);
                                                        const isProxyUrl = logoUrl.startsWith('/api/proxy-image');
                                                        const logoSize = teams.length > 10 ? 36 : 32;
                                                        if (isProxyUrl) {
                                                            return (
                                                                <img
                                                                    key={`team-${team.id}-${sessionName || 'default'}`}
                                                                    src={logoUrl}
                                                                    alt={`${team.name} logo`}
                                                                    width={logoSize}
                                                                    height={logoSize}
                                                                    className="object-contain flex-shrink-0 mt-0.5"
                                                                />
                                                            );
                                                        }
                                                        return (
                                                            <Image
                                                                key={`team-${team.id}-${sessionName || 'default'}`}
                                                                src={logoUrl}
                                                                alt={`${team.name} logo`}
                                                                width={logoSize}
                                                                height={logoSize}
                                                                className="object-contain flex-shrink-0 mt-0.5"
                                                                unoptimized
                                                            />
                                                        );
                                                    })()}
                                                    <div className={`font-semibold flex-1 leading-tight break-words ${teams.length > 10 ? 'text-sm md:text-base' : 'text-sm md:text-base'}`} style={{ color: '#E5E7EB', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: '1.3' }} title={team.name}>{team.name}</div>
                                                </div>
                                                <div className={`${teams.length > 10 ? 'text-sm' : 'text-sm'} mb-1 font-bold`} style={{ color: '#FFFFFF' }}>
                                                    Budget: ₹{formatIndianNumber(team.budget)}
                                                </div>
                                                <div className={`${teams.length > 10 ? 'text-sm' : 'text-sm'} mb-1 font-bold`} style={{ color: '#FFFFFF' }}>
                                                    Players: {team.players.length}/{getPlayersPerTeam()}
                                                </div>
                                                {/* Display category limits below Players */}
                                                {auctionSettings?.category_limits && Object.keys(auctionSettings.category_limits).length > 0 && (
                                                    <div className={`${teams.length > 10 ? 'text-xs' : 'text-xs'} mb-1 font-bold`} style={{ color: '#FFFFFF' }}>
                                                        {Object.entries(auctionSettings.category_limits).map(([category, limit], index) => {
                                                            // Count how many players of this category the team already has
                                                            // Use originalPlayerPool to get category info, not the current players array
                                                            // (which might be filtered to skipped players only)
                                                            const categoryCount = team.players.filter(p => {
                                                                const playerInPool = originalPlayerPool.find(pl => pl.name === p.name);
                                                                return playerInPool?.category === category;
                                                            }).length;
                                                            return (
                                                                <span key={category}>
                                                                    {category}: {categoryCount}/{limit}
                                                                    {index < Object.keys(auctionSettings.category_limits!).length - 1 && '  '}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {maxBid >= getMinimumBid() && (
                                                    <div className={`${teams.length > 10 ? 'text-base md:text-lg' : 'text-base md:text-lg'} mb-1 font-bold`} style={{ color: '#22C55E' }}>
                                                        Max Bid: ₹{formatIndianNumber(maxBid)}
                                                    </div>
                                                )}
                                                {!hasSpace && (
                                                    <div className="text-xs mt-1" style={{ color: '#E11D48' }}>Team full</div>
                                                )}
                                                {hasSpace && maxBid < getMinimumBid() && (
                                                    <div className="text-xs mt-1" style={{ color: '#E11D48' }}>Cannot afford minimum</div>
                                                )}
                                                {hasSpace && maxBid >= getMinimumBid() && !withinMaxBid && (
                                                    <div className="text-xs mt-1" style={{ color: '#E11D48' }}>Exceeds max bid</div>
                                                )}
                                                {!withinCategoryLimit && currentPlayerCategory && (
                                                    <div className="text-xs mt-1" style={{ color: '#E11D48' }}>
                                                        {currentPlayerCategory} limit reached
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Resizable Divider */}
                    <div
                        ref={dividerRef}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        className="w-1 bg-gray-600 hover:bg-gray-500 cursor-col-resize flex-shrink-0 transition-colors"
                        style={{
                            minWidth: '4px',
                            cursor: isDragging ? 'col-resize' : 'col-resize'
                        }}
                        title="Drag to resize panels"
                    />

                    {/* Main Content Area */}
                    <div
                        className="flex-1 overflow-auto space-y-4"
                        style={{
                            minWidth: '30%'
                        }}
                    >
                        {/* Progress */}
                        <div className="rounded-xl border-2 p-3 md:p-4 lg:mt-0" style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}>
                            <div className="flex justify-between text-sm mb-2" style={{ color: '#9CA3AF' }}>
                                <span>Player {originalIndex} of {totalPlayers}</span>
                                <span>{totalPlayers - originalIndex} remaining</span>
                            </div>
                            <div className="w-full rounded-full h-3" style={{ backgroundColor: '#1F2937' }}>
                                <div
                                    className="h-3 rounded-full transition-all duration-300"
                                    style={{ backgroundColor: '#22C55E', width: `${(originalIndex / totalPlayers) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Current Player Card */}
                        {(() => {
                            const categoryColor = currentPlayer.category ? auctionSettings?.category_color_mapping?.[currentPlayer.category] : null;
                            const hasColorMapping = !!categoryColor;
                            const backgroundColor = hasColorMapping
                                ? categoryColor // Category color as background
                                : '#111827';
                            const borderColor = hasColorMapping ? categoryColor : '#1F2937';

                            return (
                                <div className="rounded-xl p-3 md:p-4 border-2 shadow-lg" style={{ backgroundColor, borderColor }}>
                                    <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-3">
                                        {/* Player Photo - Top on mobile, Left on desktop */}
                                        <div className="flex-shrink-0 flex justify-center md:justify-start">
                                            {currentPlayer.photo && (
                                                <div key={`player-image-${currentPlayer.name}-${currentPlayerIndex}`} className="relative w-full max-w-xs h-64 md:w-56 md:h-80 rounded-xl overflow-hidden border-4 border-white shadow-2xl bg-gray-100">
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
                                                                style={{ objectPosition: 'center top' }}
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
                                            <div className="flex items-center justify-center md:justify-between gap-2 md:gap-3 mb-2">
                                                <h2 className="text-xl md:text-2xl font-bold" style={{ color: hasColorMapping ? getContrastColor(categoryColor) : '#E5E7EB' }}>{currentPlayer.name}</h2>
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

                                            {/* Basic Info Badges - Row 1: Age, Category, and Skill */}
                                            <div className="flex flex-wrap gap-2 md:gap-3 justify-center md:justify-start mb-3">
                                                {currentPlayer.age && (
                                                    <span className="px-4 py-2.5 rounded-lg text-sm md:text-base font-semibold" style={{ backgroundColor: hasColorMapping ? 'rgba(255, 255, 255, 0.2)' : '#1F2937', color: hasColorMapping ? getContrastColor(categoryColor) : '#E5E7EB', border: hasColorMapping ? '3px solid #FFFFFF' : '2px solid #1F2937' }}>
                                                        Age: {currentPlayer.age}
                                                    </span>
                                                )}
                                                {currentPlayer.category && currentPlayer.category !== 'Normal' && (
                                                    <span className="px-4 py-2.5 rounded-lg text-sm md:text-base font-semibold" style={{ backgroundColor: hasColorMapping ? 'rgba(255, 255, 255, 0.2)' : '#1F2937', color: hasColorMapping ? getContrastColor(categoryColor) : '#E5E7EB', border: hasColorMapping ? '3px solid #FFFFFF' : '2px solid #1F2937' }}>
                                                        Category: {currentPlayer.category}
                                                    </span>
                                                )}
                                                {currentPlayer.skill && (
                                                    <span className="px-4 py-2.5 rounded-lg text-sm md:text-base font-semibold" style={{ backgroundColor: hasColorMapping ? 'rgba(255, 255, 255, 0.2)' : '#1F2937', color: hasColorMapping ? getContrastColor(categoryColor) : '#E5E7EB', border: hasColorMapping ? '3px solid #FFFFFF' : '2px solid #1F2937' }}>
                                                        {currentPlayer.skill}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Basic Info Badges - Row 2: Bat */}
                                            <div className="flex flex-wrap gap-2 md:gap-3 justify-center md:justify-start mb-3">
                                                {currentPlayer.batting_hand && (
                                                    <span className="px-4 py-2.5 rounded-lg text-sm md:text-base font-semibold" style={{ backgroundColor: hasColorMapping ? 'rgba(255, 255, 255, 0.2)' : '#1F2937', color: hasColorMapping ? getContrastColor(categoryColor) : '#E5E7EB', border: hasColorMapping ? '3px solid #FFFFFF' : '2px solid #1F2937' }}>
                                                        Bat: {currentPlayer.batting_hand}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Player Stats - Matches, Runs, Wickets Table */}
                                            <div className="mb-3 overflow-x-auto">
                                                <table className="w-full border-collapse" style={{ backgroundColor: hasColorMapping ? 'rgba(255, 255, 255, 0.2)' : '#1F2937', border: hasColorMapping ? '3px solid #FFFFFF' : '2px solid #374151' }}>
                                                    <thead>
                                                        <tr>
                                                            <th className="p-2 md:p-2.5 text-xs font-semibold uppercase tracking-wide text-left" style={{ color: hasColorMapping ? getContrastColor(categoryColor) : '#9CA3AF', borderBottom: '1px solid #374151', borderRight: '1px solid #374151' }}>Matches</th>
                                                            <th className="p-2 md:p-2.5 text-xs font-semibold uppercase tracking-wide text-left" style={{ color: hasColorMapping ? getContrastColor(categoryColor) : '#9CA3AF', borderBottom: '1px solid #374151', borderRight: '1px solid #374151' }}>Runs</th>
                                                            <th className="p-2 md:p-2.5 text-xs font-semibold uppercase tracking-wide text-left" style={{ color: hasColorMapping ? getContrastColor(categoryColor) : '#9CA3AF', borderBottom: '1px solid #374151' }}>Wickets</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <td className="p-2 md:p-2.5 text-sm md:text-base font-medium" style={{ color: hasColorMapping ? getContrastColor(categoryColor) : '#E5E7EB', borderRight: '1px solid #374151' }}>{currentPlayer.bowling_hand || '0'}</td>
                                                            <td className="p-2 md:p-2.5 text-sm md:text-base font-medium" style={{ color: hasColorMapping ? getContrastColor(categoryColor) : '#E5E7EB', borderRight: '1px solid #374151' }}>{currentPlayer.wing || '0'}</td>
                                                            <td className="p-2 md:p-2.5 text-sm md:text-base font-medium" style={{ color: hasColorMapping ? getContrastColor(categoryColor) : '#E5E7EB' }}>{currentPlayer.flat_no || '0'}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Player Details - Additional Info */}
                                            <div className="flex flex-wrap gap-1.5 md:gap-2">
                                                {/* Membership No (was Experience) */}
                                                {currentPlayer.experience && (
                                                    <div className="rounded-lg p-2 md:p-2.5 w-auto inline-block" style={{ backgroundColor: hasColorMapping ? 'rgba(255, 255, 255, 0.2)' : '#1F2937', border: hasColorMapping ? '3px solid #FFFFFF' : '2px solid #374151' }}>
                                                        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: hasColorMapping ? getContrastColor(categoryColor) : '#9CA3AF' }}>Membership No</div>
                                                        <div className="text-sm md:text-base font-medium" style={{ color: hasColorMapping ? getContrastColor(categoryColor) : '#E5E7EB' }}>{currentPlayer.experience}</div>
                                                    </div>
                                                )}

                                                {/* Profession */}
                                                {currentPlayer.active_sport && (
                                                    <div className="rounded-lg p-2 md:p-2.5" style={{ backgroundColor: hasColorMapping ? 'rgba(255, 255, 255, 0.2)' : '#1F2937', border: hasColorMapping ? '3px solid #FFFFFF' : '2px solid #374151' }}>
                                                        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: hasColorMapping ? getContrastColor(categoryColor) : '#9CA3AF' }}>Profession</div>
                                                        <div className="text-sm md:text-base font-medium" style={{ color: hasColorMapping ? getContrastColor(categoryColor) : '#E5E7EB' }}>{currentPlayer.active_sport}</div>
                                                    </div>
                                                )}

                                                {/* Played Previous MBBL Season - Only for Men's auction */}
                                                {currentPlayer.played_s1 && sessionName && !sessionName.toLowerCase().includes('women') && (
                                                    <div className="rounded-lg p-2 md:p-2.5" style={{ backgroundColor: hasColorMapping ? 'rgba(255, 255, 255, 0.2)' : '#1F2937', border: hasColorMapping ? '3px solid #FFFFFF' : '2px solid #374151' }}>
                                                        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: hasColorMapping ? getContrastColor(categoryColor) : '#9CA3AF' }}>Played S1</div>
                                                        <div className="text-sm md:text-base font-medium" style={{ color: hasColorMapping ? getContrastColor(categoryColor) : '#E5E7EB' }}>{currentPlayer.played_s1}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Bid Amount */}
                        <div className="border-2 rounded-xl p-4 md:p-6 shadow-sm" style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}>
                            {!canEdit && (
                                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 text-center">
                                    View-only mode - You can watch the auction live
                                </div>
                            )}
                            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                                {/* Left side - Bid Amount controls */}
                                <div className="flex-1">
                                    <div className="flex items-center justify-center gap-6 mb-3">
                                        <button
                                            onClick={handleBidDecrease}
                                            disabled={!canEdit || currentBid <= currentMinimumBid}
                                            className="w-12 h-12 rounded-lg border-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-2xl font-semibold transition-colors"
                                            style={{
                                                backgroundColor: '#1F2937',
                                                borderColor: '#1F2937',
                                                color: '#E5E7EB'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (canEdit && currentBid > currentMinimumBid) {
                                                    e.currentTarget.style.borderColor = '#E11D48';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (canEdit && currentBid > currentMinimumBid) {
                                                    e.currentTarget.style.borderColor = '#1F2937';
                                                }
                                            }}
                                        >
                                            −
                                        </button>
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="text-5xl font-bold" style={{ color: '#22C55E' }}>₹{formatIndianNumber(currentBid)}</div>
                                            {(() => {
                                                const bidInfo = playerBids.get(currentBid);
                                                if (bidInfo) {
                                                    const team = bidInfo.teamId ? teamMap.get(bidInfo.teamId) : undefined;
                                                    return (
                                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#1F2937' }}>
                                                            {team && (() => {
                                                                const logoUrl = getTeamLogo(team.logoUrl);
                                                                const isProxyUrl = logoUrl.startsWith('/api/proxy-image');
                                                                if (isProxyUrl) {
                                                                    return (
                                                                        <img
                                                                            key={`bid-team-${bidInfo.teamId}-${sessionName || 'default'}`}
                                                                            src={logoUrl}
                                                                            alt={`${bidInfo.teamName} logo`}
                                                                            width={24}
                                                                            height={24}
                                                                            className="object-contain flex-shrink-0"
                                                                        />
                                                                    );
                                                                }
                                                                return (
                                                                    <Image
                                                                        key={`bid-team-${bidInfo.teamId}-${sessionName || 'default'}`}
                                                                        src={logoUrl}
                                                                        alt={`${bidInfo.teamName} logo`}
                                                                        width={24}
                                                                        height={24}
                                                                        className="object-contain flex-shrink-0"
                                                                        unoptimized
                                                                    />
                                                                );
                                                            })()}
                                                            <span className="text-sm font-semibold" style={{ color: '#E5E7EB' }}>
                                                                Bid by: {bidInfo.teamName}
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                        <button
                                            onClick={handleBidIncrease}
                                            disabled={!canEdit}
                                            className="w-12 h-12 rounded-lg border-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-2xl font-semibold transition-colors"
                                            style={{
                                                backgroundColor: '#1F2937',
                                                borderColor: '#1F2937',
                                                color: '#E5E7EB'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (canEdit) {
                                                    e.currentTarget.style.borderColor = '#E11D48';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (canEdit) {
                                                    e.currentTarget.style.borderColor = '#1F2937';
                                                }
                                            }}
                                        >
                                            +
                                        </button>
                                    </div>

                                    {/* Custom Bid Input */}
                                    <div className="mb-3">
                                        <label className="block text-sm font-medium mb-1.5" style={{ color: '#E5E7EB' }}>Enter Custom Bid Amount</label>
                                        <div className="flex items-center gap-2">
                                            <span style={{ color: '#E5E7EB' }}>₹</span>
                                            <input
                                                type="text"
                                                value={bidInputValue}
                                                onChange={handleBidInputChange}
                                                onBlur={(e) => {
                                                    e.currentTarget.style.borderColor = '#1F2937';
                                                    handleBidInputBlur();
                                                }}
                                                disabled={!canEdit}
                                                className="flex-1 px-4 py-2 border-2 rounded-lg text-lg font-semibold focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                style={{
                                                    backgroundColor: '#111827',
                                                    borderColor: '#1F2937',
                                                    color: '#E5E7EB'
                                                }}
                                                onFocus={(e) => {
                                                    e.currentTarget.style.borderColor = '#E11D48';
                                                    e.currentTarget.style.outline = 'none';
                                                }}
                                                placeholder="Enter amount"
                                            />
                                        </div>
                                    </div>

                                    <div className="text-sm text-center mb-2" style={{ color: '#9CA3AF' }}>
                                        Min: ₹{formatIndianNumber(currentMinimumBid)} | Increase: ₹{formatIndianNumber(getBidIncrement(currentBid))}
                                    </div>
                                </div>

                                {/* Right side - Action Buttons */}
                                <div className="flex flex-col gap-3 md:gap-4 justify-start md:min-w-[200px]">
                                    <button
                                        onClick={handleBuyPlayer}
                                        disabled={!canEdit || !selectedTeamId}
                                        className="w-full py-3 md:py-4 px-4 md:px-6 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-lg"
                                        style={{ backgroundColor: '#E11D48', color: '#E5E7EB' }}
                                        onMouseEnter={(e) => !canEdit || !selectedTeamId || (e.currentTarget.style.backgroundColor = '#BE185D')}
                                        onMouseLeave={(e) => !canEdit || !selectedTeamId || (e.currentTarget.style.backgroundColor = '#E11D48')}
                                    >
                                        Buy Player
                                    </button>
                                    <button
                                        onClick={handleSkip}
                                        disabled={!canEdit}
                                        className="w-full py-3 md:py-4 px-4 md:px-6 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-lg"
                                        style={{ backgroundColor: '#1F2937', color: '#9CA3AF' }}
                                        onMouseEnter={(e) => !canEdit || (e.currentTarget.style.backgroundColor = '#374151')}
                                        onMouseLeave={(e) => !canEdit || (e.currentTarget.style.backgroundColor = '#1F2937')}
                                    >
                                        Skip Player
                                    </button>
                                    <button
                                        onClick={handleUndo}
                                        disabled={!canEdit || !lastAction}
                                        className="w-full py-3 md:py-4 px-4 md:px-6 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base md:text-lg"
                                        style={{ 
                                            backgroundColor: lastAction ? '#6B7280' : '#1F2937', 
                                            color: '#FFFFFF',
                                            border: lastAction ? '2px solid #6B7280' : '2px solid #374151'
                                        }}
                                        title={lastAction ? `Undo last ${lastAction.type}` : 'No action to undo'}
                                        onMouseEnter={(e) => !canEdit || !lastAction || (e.currentTarget.style.backgroundColor = '#4B5563')}
                                        onMouseLeave={(e) => !canEdit || !lastAction || (e.currentTarget.style.backgroundColor = '#6B7280')}
                                    >
                                        Undo
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile Layout - Keep original grid for mobile/tablet */}
                <div className={`xl:hidden flex flex-col gap-3 md:gap-4 overflow-y-auto flex-1 min-h-0`}>
                    {/* Main Content Area (Mobile) - Player info only, teams hidden */}
                    <div className="space-y-4 pb-4">
                        {/* Progress */}
                        <div className="rounded-xl border-2 p-3 md:p-4 lg:mt-0" style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}>
                            <div className="flex justify-between text-sm mb-2" style={{ color: '#9CA3AF' }}>
                                <span>Player {originalIndex} of {totalPlayers}</span>
                                <span>{totalPlayers - originalIndex} remaining</span>
                            </div>
                            <div className="w-full rounded-full h-3" style={{ backgroundColor: '#1F2937' }}>
                                <div
                                    className="h-3 rounded-full transition-all duration-300"
                                    style={{ backgroundColor: '#22C55E', width: `${(originalIndex / totalPlayers) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        {/* Current Player Card */}
                        {(() => {
                            const categoryColor = currentPlayer.category ? auctionSettings?.category_color_mapping?.[currentPlayer.category] : null;
                            const hasColorMapping = !!categoryColor;
                            const backgroundColor = hasColorMapping
                                ? categoryColor // Category color as background
                                : '#111827';
                            const borderColor = hasColorMapping ? categoryColor : '#1F2937';

                            return (
                                <div className="rounded-xl p-3 md:p-4 border-2 shadow-lg" style={{ backgroundColor, borderColor }}>
                                    <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-3">
                                        {/* Player Photo - Top on mobile, Left on desktop */}
                                        <div className="flex-shrink-0 flex justify-center md:justify-start">
                                            {currentPlayer.photo && (
                                                <div key={`player-image-mobile-${currentPlayer.name}-${currentPlayerIndex}`} className="relative w-full max-w-xs h-80 md:w-56 md:h-80 rounded-xl overflow-hidden border-4 border-white shadow-2xl bg-gray-100">
                                                    {(() => {
                                                        const imageUrl = processImageUrl(currentPlayer.photo);
                                                        if (!imageUrl) return null;
                                                        const finalImageUrl = imageUrl.includes('?')
                                                            ? `${imageUrl}&_idx=${currentPlayerIndex}`
                                                            : `${imageUrl}?_idx=${currentPlayerIndex}`;
                                                        return (
                                                            <img
                                                                key={`img-mobile-${currentPlayer.name}-${currentPlayerIndex}`}
                                                                src={finalImageUrl}
                                                                alt={currentPlayer.name}
                                                                className="object-cover w-full h-full"
                                                                style={{ objectPosition: 'center top' }}
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
                                            <div className="flex items-center justify-center md:justify-between gap-2 md:gap-3 mb-2">
                                                <h2 className="text-xl md:text-2xl font-bold" style={{ color: hasColorMapping ? getContrastColor(categoryColor) : '#E5E7EB' }}>{currentPlayer.name}</h2>
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

                                            {/* Basic Info Badges - Row 1: Age, Category, and Skill */}
                                            <div className="flex flex-wrap gap-2 md:gap-3 justify-center md:justify-start mb-3">
                                                {currentPlayer.age && (
                                                    <span className="px-4 py-2.5 rounded-lg text-sm md:text-base font-semibold" style={{ backgroundColor: hasColorMapping ? 'rgba(255, 255, 255, 0.2)' : '#1F2937', color: hasColorMapping ? getContrastColor(categoryColor) : '#E5E7EB', border: hasColorMapping ? '3px solid #FFFFFF' : '2px solid #1F2937' }}>
                                                        Age: {currentPlayer.age}
                                                    </span>
                                                )}
                                                {currentPlayer.category && currentPlayer.category !== 'Normal' && (
                                                    <span className="px-4 py-2.5 rounded-lg text-sm md:text-base font-semibold" style={{ backgroundColor: hasColorMapping ? 'rgba(255, 255, 255, 0.2)' : '#1F2937', color: hasColorMapping ? getContrastColor(categoryColor) : '#E5E7EB', border: hasColorMapping ? '3px solid #FFFFFF' : '2px solid #1F2937' }}>
                                                        Category: {currentPlayer.category}
                                                    </span>
                                                )}
                                                {currentPlayer.skill && (
                                                    <span className="px-4 py-2.5 rounded-lg text-sm md:text-base font-semibold" style={{ backgroundColor: hasColorMapping ? 'rgba(255, 255, 255, 0.2)' : '#1F2937', color: hasColorMapping ? getContrastColor(categoryColor) : '#E5E7EB', border: hasColorMapping ? '3px solid #FFFFFF' : '2px solid #1F2937' }}>
                                                        {currentPlayer.skill}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Basic Info Badges - Row 2: Bat */}
                                            <div className="flex flex-wrap gap-2 md:gap-3 justify-center md:justify-start mb-3">
                                                {currentPlayer.batting_hand && (
                                                    <span className="px-4 py-2.5 rounded-lg text-sm md:text-base font-semibold" style={{ backgroundColor: hasColorMapping ? 'rgba(255, 255, 255, 0.2)' : '#1F2937', color: hasColorMapping ? getContrastColor(categoryColor) : '#E5E7EB', border: hasColorMapping ? '3px solid #FFFFFF' : '2px solid #1F2937' }}>
                                                        Bat: {currentPlayer.batting_hand}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Player Stats - Matches, Runs, Wickets Table */}
                                            <div className="mb-3 overflow-x-auto">
                                                <table className="w-full border-collapse" style={{ backgroundColor: '#1F2937', border: '2px solid #374151' }}>
                                                    <thead>
                                                        <tr>
                                                            <th className="p-2 md:p-2.5 text-xs font-semibold uppercase tracking-wide text-left" style={{ color: '#9CA3AF', borderBottom: '1px solid #374151', borderRight: '1px solid #374151' }}>Matches</th>
                                                            <th className="p-2 md:p-2.5 text-xs font-semibold uppercase tracking-wide text-left" style={{ color: '#9CA3AF', borderBottom: '1px solid #374151', borderRight: '1px solid #374151' }}>Runs</th>
                                                            <th className="p-2 md:p-2.5 text-xs font-semibold uppercase tracking-wide text-left" style={{ color: '#9CA3AF', borderBottom: '1px solid #374151' }}>Wickets</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <td className="p-2 md:p-2.5 text-sm md:text-base font-medium" style={{ color: '#E5E7EB', borderRight: '1px solid #374151' }}>{currentPlayer.bowling_hand || '0'}</td>
                                                            <td className="p-2 md:p-2.5 text-sm md:text-base font-medium" style={{ color: '#E5E7EB', borderRight: '1px solid #374151' }}>{currentPlayer.wing || '0'}</td>
                                                            <td className="p-2 md:p-2.5 text-sm md:text-base font-medium" style={{ color: '#E5E7EB' }}>{currentPlayer.flat_no || '0'}</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Player Details - Additional Info */}
                                            <div className="flex flex-wrap gap-1.5 md:gap-2">
                                                {currentPlayer.experience && (
                                                    <div className="rounded-lg p-2 md:p-2.5 border w-auto inline-block" style={{ backgroundColor: '#1F2937', borderColor: '#374151' }}>
                                                        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>Membership No</div>
                                                        <div className="text-sm md:text-base font-medium" style={{ color: '#E5E7EB' }}>{currentPlayer.experience}</div>
                                                    </div>
                                                )}
                                                {currentPlayer.active_sport && (
                                                    <div className="rounded-lg p-2 md:p-2.5 border" style={{ backgroundColor: '#1F2937', borderColor: '#374151' }}>
                                                        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>Profession</div>
                                                        <div className="text-sm md:text-base font-medium" style={{ color: '#E5E7EB' }}>{currentPlayer.active_sport}</div>
                                                    </div>
                                                )}
                                                {currentPlayer.played_s1 && sessionName && !sessionName.toLowerCase().includes('women') && (
                                                    <div className="rounded-lg p-2 md:p-2.5 border" style={{ backgroundColor: '#1F2937', borderColor: '#374151' }}>
                                                        <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#9CA3AF' }}>Played S1</div>
                                                        <div className="text-sm md:text-base font-medium" style={{ color: '#E5E7EB' }}>{currentPlayer.played_s1}</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Bid Amount */}
                        <div className="border-2 rounded-xl p-4 md:p-6 shadow-sm" style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}>
                            {!canEdit && (
                                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 text-center">
                                    View-only mode - You can watch the auction live
                                </div>
                            )}
                            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                                {/* Left side - Bid Amount controls */}
                                <div className="flex-1">
                                    <div className="flex items-center justify-center gap-6 mb-3">
                                        <button
                                            onClick={handleBidDecrease}
                                            disabled={!canEdit || currentBid <= currentMinimumBid}
                                            className="w-12 h-12 rounded-lg border-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-2xl font-semibold transition-colors"
                                            style={{
                                                backgroundColor: '#1F2937',
                                                borderColor: '#1F2937',
                                                color: '#E5E7EB'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (canEdit && currentBid > currentMinimumBid) {
                                                    e.currentTarget.style.borderColor = '#E11D48';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (canEdit && currentBid > currentMinimumBid) {
                                                    e.currentTarget.style.borderColor = '#1F2937';
                                                }
                                            }}
                                        >
                                            −
                                        </button>
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="text-4xl md:text-5xl font-bold" style={{ color: '#22C55E' }}>
                                                ₹{formatIndianNumber(currentBid)}
                                            </div>
                                            {(() => {
                                                const bidInfo = playerBids.get(currentBid);
                                                if (bidInfo) {
                                                    const team = bidInfo.teamId ? teamMap.get(bidInfo.teamId) : undefined;
                                                    return (
                                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#1F2937' }}>
                                                            {team && (() => {
                                                                const logoUrl = getTeamLogo(team.logoUrl);
                                                                const isProxyUrl = logoUrl.startsWith('/api/proxy-image');
                                                                if (isProxyUrl) {
                                                                    return (
                                                                        <img
                                                                            key={`bid-team-mobile-${bidInfo.teamId}-${sessionName || 'default'}`}
                                                                            src={logoUrl}
                                                                            alt={`${bidInfo.teamName} logo`}
                                                                            width={24}
                                                                            height={24}
                                                                            className="object-contain flex-shrink-0"
                                                                        />
                                                                    );
                                                                }
                                                                return (
                                                                    <Image
                                                                        key={`bid-team-mobile-${bidInfo.teamId}-${sessionName || 'default'}`}
                                                                        src={logoUrl}
                                                                        alt={`${bidInfo.teamName} logo`}
                                                                        width={24}
                                                                        height={24}
                                                                        className="object-contain flex-shrink-0"
                                                                        unoptimized
                                                                    />
                                                                );
                                                            })()}
                                                            <span className="text-xs md:text-sm font-semibold" style={{ color: '#E5E7EB' }}>
                                                                Bid by: {bidInfo.teamName}
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                        <button
                                            onClick={handleBidIncrease}
                                            disabled={!canEdit}
                                            className="w-12 h-12 rounded-lg border-2 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-2xl font-semibold transition-colors"
                                            style={{
                                                backgroundColor: '#1F2937',
                                                borderColor: '#1F2937',
                                                color: '#E5E7EB'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (canEdit) {
                                                    e.currentTarget.style.borderColor = '#22C55E';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (canEdit) {
                                                    e.currentTarget.style.borderColor = '#1F2937';
                                                }
                                            }}
                                        >
                                            +
                                        </button>
                                    </div>
                                    <div className="text-center text-sm mb-4" style={{ color: '#9CA3AF' }}>
                                        Min: ₹{formatIndianNumber(currentMinimumBid)} | Increase: ₹{formatIndianNumber(getBidIncrement(currentBid))}
                                    </div>
                                    {/* Custom Bid Input - Hidden on mobile */}
                                    <div className="mb-4 hidden md:block">
                                        <label className="block text-sm font-medium mb-2" style={{ color: '#E5E7EB' }}>Enter Custom Bid Amount</label>
                                        <div className="flex items-center gap-2">
                                            <span style={{ color: '#E5E7EB' }}>₹</span>
                                            <input
                                                type="text"
                                                value={bidInputValue}
                                                onChange={handleBidInputChange}
                                                onBlur={(e) => {
                                                    e.currentTarget.style.borderColor = '#1F2937';
                                                    handleBidInputBlur();
                                                }}
                                                disabled={!canEdit}
                                                className="flex-1 px-4 py-2 border-2 rounded-lg text-lg font-semibold focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                style={{
                                                    backgroundColor: '#111827',
                                                    borderColor: '#1F2937',
                                                    color: '#E5E7EB'
                                                }}
                                                onFocus={(e) => {
                                                    e.currentTarget.style.borderColor = '#E11D48';
                                                }}
                                                placeholder={formatIndianNumber(currentMinimumBid)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Right side - Action buttons */}
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleBuyPlayer}
                                        disabled={!canEdit || !selectedTeamId}
                                        className="px-6 py-3 rounded-lg font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            backgroundColor: selectedTeamId ? '#E11D48' : '#1F2937',
                                            color: '#FFFFFF',
                                            border: selectedTeamId ? '2px solid #E11D48' : '2px solid #374151'
                                        }}
                                    >
                                        Buy Player
                                    </button>
                                    <button
                                        onClick={handleSkip}
                                        disabled={!canEdit}
                                        className="px-6 py-3 rounded-lg font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            backgroundColor: '#1F2937',
                                            color: '#9CA3AF',
                                            border: '2px solid #374151'
                                        }}
                                    >
                                        Skip Player
                                    </button>
                                    <button
                                        onClick={handleUndo}
                                        disabled={!canEdit || !lastAction}
                                        className="px-6 py-3 rounded-lg font-semibold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{
                                            backgroundColor: lastAction ? '#6B7280' : '#1F2937',
                                            color: '#FFFFFF',
                                            border: lastAction ? '2px solid #6B7280' : '2px solid #374151'
                                        }}
                                        title={lastAction ? `Undo last ${lastAction.type}` : 'No action to undo'}
                                    >
                                        Undo
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Teams Section (Mobile) - Hidden, teams accessible via "Teams" button in header */}
                    <div className="hidden">
                        <div className="rounded-xl border-2 p-4 md:p-5" style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}>
                            <div>
                                <div className={`grid ${teams.length > 10 ? 'grid-cols-4' : 'grid-cols-2'} gap-2 md:gap-3 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2`}>
                                    {teams.map(team => {
                                        // Calculate maximum bid this team can make for current player
                                        // Teams need: 1 ICON player (₹10,00,000) + 9 other players (regular minimum bid each) = 10 total players
                                        const minimumRequiredForRemaining = calculateMinimumRequiredForRemaining(team);
                                        const maxBid = team.budget - minimumRequiredForRemaining;
                                        const increment = getBidIncrement(currentBid);
                                        const newBid = currentBid + increment;
                                        const canAfford = team.budget >= newBid;
                                        const withinMaxBid = newBid <= maxBid;
                                        const hasSpace = team.players.length < getPlayersPerTeam();
                                        const isDisabled = !canAfford || !hasSpace || !withinMaxBid || maxBid < getMinimumBid();
                                        const isViewOnly = !canEdit;
                                        const finalDisabled = isDisabled || isViewOnly;

                                        // Determine team status for coloring
                                        const budgetPercentage = team.budget > 0 && team.players.length > 0
                                            ? (team.budget / (team.budget + team.players.reduce((sum, p) => sum + (p.bidAmount || 0), 0))) * 100
                                            : 100;
                                        const isLowBudget = budgetPercentage < 20; // Less than 20% of total budget remaining
                                        const isSelected = selectedTeamId === team.id;

                                        // Status-based colors
                                        let backgroundColor = '#111827';
                                        let borderColor = '#1F2937';

                                        if (isSelected) {
                                            // Red for selected team
                                            backgroundColor = '#7F1D1D';
                                            borderColor = '#DC2626';
                                        } else if (finalDisabled) {
                                            // Red for cannot bid (no budget or team full)
                                            backgroundColor = '#111827';
                                            borderColor = '#DC2626';
                                        } else if (isLowBudget) {
                                            // Yellow/Orange for low budget warning
                                            backgroundColor = '#78350F';
                                            borderColor = '#F59E0B';
                                        } else if (canAfford && hasSpace && withinMaxBid) {
                                            // Blue for can bid
                                            backgroundColor = '#1E3A8A';
                                            borderColor = '#3B82F6';
                                        } else {
                                            // Default gray
                                            backgroundColor = '#111827';
                                            borderColor = '#1F2937';
                                        }

                                        return (
                                            <button
                                                key={`mobile-${team.id}`}
                                                onClick={() => {
                                                    if (!finalDisabled) {
                                                        handleTeamSelection(team.id);
                                                    }
                                                }}
                                                disabled={finalDisabled}
                                                className={`${teams.length > 10 ? 'p-2 md:p-2.5' : 'p-2 md:p-2.5'} rounded-lg border-2 text-left transition-all min-w-0 w-full ${selectedTeamId === team.id
                                                    ? 'shadow-md'
                                                    : finalDisabled
                                                        ? 'opacity-50 cursor-not-allowed'
                                                        : ''
                                                    }`}
                                                style={{ backgroundColor, borderColor }}
                                            >
                                                <div className="flex items-start gap-1.5 mb-2 w-full">
                                                    {(() => {
                                                        const logoUrl = getTeamLogo(team.logoUrl);
                                                        const isProxyUrl = logoUrl.startsWith('/api/proxy-image');
                                                        const logoSize = teams.length > 10 ? 36 : 32;
                                                        if (isProxyUrl) {
                                                            return (
                                                                <img
                                                                    key={`mobile-team-${team.id}`}
                                                                    src={logoUrl}
                                                                    alt={`${team.name} logo`}
                                                                    width={logoSize}
                                                                    height={logoSize}
                                                                    className="object-contain flex-shrink-0 mt-0.5"
                                                                />
                                                            );
                                                        }
                                                        return (
                                                            <Image
                                                                key={`mobile-team-${team.id}`}
                                                                src={logoUrl}
                                                                alt={`${team.name} logo`}
                                                                width={logoSize}
                                                                height={logoSize}
                                                                className="object-contain flex-shrink-0 mt-0.5"
                                                                unoptimized
                                                            />
                                                        );
                                                    })()}
                                                    <div className={`font-semibold flex-1 leading-tight break-words ${teams.length > 10 ? 'text-sm md:text-base' : 'text-sm md:text-base'}`} style={{ color: '#E5E7EB', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: '1.3' }} title={team.name}>{team.name}</div>
                                                </div>
                                                <div className={`${teams.length > 10 ? 'text-sm' : 'text-sm'} mb-1 font-bold`} style={{ color: '#FFFFFF' }}>
                                                    Budget: ₹{formatIndianNumber(team.budget)}
                                                </div>
                                                <div className={`${teams.length > 10 ? 'text-sm' : 'text-sm'} mb-1 font-bold`} style={{ color: '#FFFFFF' }}>
                                                    Players: {team.players.length}/{getPlayersPerTeam()}
                                                </div>
                                                {maxBid >= getMinimumBid() && (
                                                    <div className={`${teams.length > 10 ? 'text-base md:text-lg' : 'text-base md:text-lg'} mb-1 font-bold`} style={{ color: '#22C55E' }}>
                                                        Max Bid: ₹{formatIndianNumber(maxBid)}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Team Dynamics Bottom Sheet */}
            <BottomSheet
                isOpen={isTeamDynamicsSheetOpen}
                onClose={() => {
                    setIsTeamDynamicsSheetOpen(false);
                    setSelectedTeamFilters(new Set()); // Reset filters when closing
                    setTeamDynamicsTab('list'); // Reset to list tab when closing
                }}
                title="Team Dynamics"
            >
                {/* Tabs */}
                <div className="flex gap-2 mb-4 border-b" style={{ borderColor: '#1F2937' }}>
                    <button
                        onClick={() => setTeamDynamicsTab('list')}
                        className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                            teamDynamicsTab === 'list' ? 'text-white border-b-2' : 'text-gray-400'
                        }`}
                        style={teamDynamicsTab === 'list' 
                            ? { borderBottomColor: '#3B82F6' }
                            : {}
                        }
                    >
                        Team List
                    </button>
                    <button
                        onClick={() => setTeamDynamicsTab('select')}
                        className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                            teamDynamicsTab === 'select' ? 'text-white border-b-2' : 'text-gray-400'
                        }`}
                        style={teamDynamicsTab === 'select' 
                            ? { borderBottomColor: '#3B82F6' }
                            : {}
                        }
                    >
                        Select Team
                    </button>
                </div>

                {/* Tab Content */}
                {teamDynamicsTab === 'list' ? (
                <div className="space-y-4">
                    {/* Team Filter */}
                    <div className="rounded-lg p-3 border" style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}>
                        <div className="text-xs font-semibold mb-2" style={{ color: '#E5E7EB' }}>Filter Teams:</div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setSelectedTeamFilters(new Set())}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedTeamFilters.size === 0
                                    ? 'text-white'
                                    : 'border'
                                    }`}
                                style={selectedTeamFilters.size === 0
                                    ? { backgroundColor: '#E11D48' }
                                    : { backgroundColor: '#1F2937', color: '#9CA3AF', borderColor: '#1F2937' }
                                }
                            >
                                All
                            </button>
                            {teams.map(team => (
                                <button
                                    key={team.id}
                                    onClick={() => {
                                        const newFilters = new Set(selectedTeamFilters);
                                        if (newFilters.has(team.id)) {
                                            newFilters.delete(team.id);
                                        } else {
                                            newFilters.add(team.id);
                                        }
                                        setSelectedTeamFilters(newFilters);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${selectedTeamFilters.has(team.id)
                                        ? 'text-white'
                                        : 'border'
                                        }`}
                                    style={selectedTeamFilters.has(team.id)
                                        ? { backgroundColor: '#E11D48' }
                                        : { backgroundColor: '#1F2937', color: '#9CA3AF', borderColor: '#1F2937' }
                                    }
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedTeamFilters.has(team.id)}
                                        onChange={() => { }} // Handled by button onClick
                                        className="w-3 h-3"
                                    />
                                    <span className="truncate max-w-[80px]">{team.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Teams List */}
                    <div className="space-y-3">
                        {teams
                            .filter(team => selectedTeamFilters.size === 0 || selectedTeamFilters.has(team.id))
                            .map(team => {
                                // Calculate spent as sum of all player bid amounts (more accurate)
                                const totalSpent = team.players.reduce((sum, player) => sum + (player.bidAmount || 0), 0);
                                const initialBudget = team.budget + totalSpent;

                                return (
                                    <div key={team.id} className="rounded-xl p-4 border-2" style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                {(() => {
                                                    const logoUrl = getTeamLogo(team.logoUrl);
                                                    const isProxyUrl = logoUrl.startsWith('/api/proxy-image');
                                                    if (isProxyUrl) {
                                                        return (
                                                            <img
                                                                key={`team-dynamics-${team.id}-${sessionName || 'default'}`}
                                                                src={logoUrl}
                                                                alt={`${team.name} logo`}
                                                                width={40}
                                                                height={40}
                                                                className="object-contain flex-shrink-0"
                                                            />
                                                        );
                                                    }
                                                    return (
                                                        <Image
                                                            key={`team-dynamics-${team.id}-${sessionName || 'default'}`}
                                                            src={logoUrl}
                                                            alt={`${team.name} logo`}
                                                            width={40}
                                                            height={40}
                                                            className="object-contain flex-shrink-0"
                                                            unoptimized
                                                        />
                                                    );
                                                })()}
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="text-base md:text-lg font-semibold break-normal leading-tight" style={{ color: '#E5E7EB' }}>{team.name}</h3>
                                                    <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                                                        {team.players.length} / {getPlayersPerTeam()} players
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-medium" style={{ color: '#9CA3AF' }}>Remaining</div>
                                                <div className="text-lg font-bold" style={{ color: '#E5E7EB' }}>₹{formatIndianNumber(team.budget)}</div>
                                            </div>
                                        </div>

                                        {/* Budget Progress */}
                                        <div className="mb-3">
                                            <div className="w-full rounded-full h-2" style={{ backgroundColor: '#1F2937' }}>
                                                <div
                                                    className="h-2 rounded-full transition-all"
                                                    style={{
                                                        width: `${initialBudget > 0 ? Math.min((totalSpent / initialBudget) * 100, 100) : 0}%`,
                                                        backgroundColor: '#22C55E'
                                                    }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Owner Name */}
                                        {team.ownerName && (
                                            <div className="mb-3">
                                                <div className="flex-1 rounded-lg p-2 border flex items-center gap-2" style={{ backgroundColor: '#1F2937', borderColor: '#1F2937' }}>
                                                    {team.ownerPhoto && (() => {
                                                        const ownerPhotoUrl = processImageUrl(team.ownerPhoto);
                                                        if (!ownerPhotoUrl) return null;
                                                        const isProxyUrl = ownerPhotoUrl.startsWith('/api/proxy-image');
                                                        if (isProxyUrl) {
                                                            return (
                                                                <img
                                                                    src={ownerPhotoUrl}
                                                                    alt={team.ownerName}
                                                                    width={32}
                                                                    height={32}
                                                                    className="object-cover rounded-full flex-shrink-0"
                                                                />
                                                            );
                                                        }
                                                        return (
                                                            <Image
                                                                src={ownerPhotoUrl}
                                                                alt={team.ownerName}
                                                                width={32}
                                                                height={32}
                                                                className="object-cover rounded-full flex-shrink-0"
                                                                unoptimized
                                                            />
                                                        );
                                                    })()}
                                                    <div className="flex-1">
                                                        <div className="text-xs" style={{ color: '#9CA3AF' }}>Owner</div>
                                                        <div className="text-sm font-semibold" style={{ color: '#E5E7EB' }}>{team.ownerName}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Players List */}
                                        {team.players.length > 0 ? (
                                            <div className="border-t pt-3" style={{ borderColor: '#1F2937' }}>
                                                <div className="text-xs font-semibold mb-2" style={{ color: '#9CA3AF' }}>Players:</div>
                                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                                    {team.players.map((player, idx) => (
                                                        <div key={idx} className="flex justify-between items-center text-sm py-1">
                                                            <span style={{ color: '#E5E7EB' }}>
                                                                {player.name}
                                                            </span>
                                                            <span className="text-xs" style={{ color: '#9CA3AF' }}>₹{player.bidAmount ? formatIndianNumber(player.bidAmount) : '0'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-center py-2 border-t pt-3" style={{ color: '#9CA3AF', borderColor: '#1F2937' }}>
                                                No players yet
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                    </div>
                </div>
                ) : (
                    /* Select Team Tab - Team Cards Grid */
                    <div className="space-y-4">
                        <div className="text-sm mb-2" style={{ color: '#9CA3AF' }}>
                            Select a team to bid on the current player
                        </div>
                        <div className={`grid ${teams.length > 10 ? 'grid-cols-4' : 'grid-cols-2'} gap-2 md:gap-3 max-h-[calc(100vh-12rem)] overflow-y-auto pr-2`}>
                            {teams.map(team => {
                                // Calculate maximum bid this team can make for current player
                                // They need to reserve minimum bid for remaining players
                                // Teams need: 1 ICON player (₹10,00,000) + 9 other players (regular minimum bid each) = 10 total players
                                const minimumRequiredForRemaining = calculateMinimumRequiredForRemaining(team);
                                const maxBid = team.budget - minimumRequiredForRemaining;

                                // Calculate what the new bid would be if this team is selected
                                // Use current bid if it's >= minimum, otherwise calculate increment
                                const minimumBid = getMinimumBid();
                                let newBid: number;
                                if (currentBid >= minimumBid) {
                                    // Use current bid (could be custom bid)
                                    newBid = currentBid;
                                } else {
                                    // Calculate increment
                                    const increment = getBidIncrement(currentBid);
                                    newBid = currentBid + increment;
                                }

                                // Check if team can afford the new bid and if it's within their max bid
                                // Use a small tolerance (0.01) to handle floating point precision issues
                                const canAfford = team.budget >= newBid;
                                const withinMaxBid = newBid <= maxBid + 0.01;
                                const hasSpace = team.players.length < getPlayersPerTeam();

                                // Check category limits
                                const currentPlayerCategory = currentPlayer?.category;
                                let withinCategoryLimit = true;
                                if (currentPlayerCategory && auctionSettings?.category_limits && auctionSettings.category_limits[currentPlayerCategory]) {
                                    const categoryLimit = auctionSettings.category_limits[currentPlayerCategory];
                                    // Count how many players of this category the team already has
                                    // Use originalPlayerPool to get category info, not the current players array
                                    // (which might be filtered to skipped players only)
                                    const categoryCount = team.players.filter(p => {
                                        // Need to get the category from the original player pool
                                        const playerInPool = originalPlayerPool.find(pl => pl.name === p.name);
                                        return playerInPool?.category === currentPlayerCategory;
                                    }).length;
                                    withinCategoryLimit = categoryCount < categoryLimit;
                                }

                                const isDisabled = !canAfford || !hasSpace || !withinMaxBid || maxBid < getMinimumBid() || !withinCategoryLimit;

                                const isViewOnly = !canEdit;
                                const finalDisabled = isDisabled || isViewOnly;

                                // Determine team status for coloring
                                const budgetPercentage = team.budget > 0 && team.players.length > 0
                                    ? (team.budget / (team.budget + team.players.reduce((sum, p) => sum + (p.bidAmount || 0), 0))) * 100
                                    : 100;
                                const isLowBudget = budgetPercentage < 20; // Less than 20% of total budget remaining
                                const isSelected = selectedTeamId === team.id;

                                // Status-based colors
                                let backgroundColor = '#111827';
                                let borderColor = '#1F2937';

                                if (isSelected) {
                                    // Red for selected team
                                    backgroundColor = '#7F1D1D';
                                    borderColor = '#DC2626';
                                } else if (finalDisabled) {
                                    // Red for cannot bid (no budget or team full)
                                    backgroundColor = '#111827';
                                    borderColor = '#DC2626';
                                } else if (isLowBudget) {
                                    // Yellow/Orange for low budget warning
                                    backgroundColor = '#78350F';
                                    borderColor = '#F59E0B';
                                } else if (canAfford && hasSpace && withinMaxBid) {
                                    // Blue for can bid
                                    backgroundColor = '#1E3A8A';
                                    borderColor = '#3B82F6';
                                } else {
                                    // Default gray
                                    backgroundColor = '#111827';
                                    borderColor = '#1F2937';
                                }

                                return (
                                    <button
                                        key={team.id}
                                        onClick={() => {
                                            if (!finalDisabled) {
                                                handleTeamSelection(team.id);
                                                setIsTeamDynamicsSheetOpen(false); // Close sheet after selection
                                            }
                                        }}
                                        disabled={finalDisabled}
                                        className={`${teams.length > 10 ? 'p-2 md:p-2.5' : 'p-2 md:p-2.5'} rounded-lg border-2 text-left transition-all min-w-0 w-full ${selectedTeamId === team.id
                                            ? 'shadow-md' // Active - will add custom style
                                            : finalDisabled
                                                ? 'opacity-50 cursor-not-allowed'
                                                : ''
                                            }`}
                                        style={{ backgroundColor, borderColor }}
                                    >
                                        <div className="flex items-start gap-1.5 mb-2 w-full">
                                            {(() => {
                                                const logoUrl = getTeamLogo(team.logoUrl);
                                                const isProxyUrl = logoUrl.startsWith('/api/proxy-image');
                                                const logoSize = teams.length > 10 ? 36 : 32;
                                                if (isProxyUrl) {
                                                    return (
                                                        <img
                                                            key={`team-select-${team.id}-${sessionName || 'default'}`}
                                                            src={logoUrl}
                                                            alt={`${team.name} logo`}
                                                            width={logoSize}
                                                            height={logoSize}
                                                            className="object-contain flex-shrink-0 mt-0.5"
                                                        />
                                                    );
                                                }
                                                return (
                                                    <Image
                                                        key={`team-select-${team.id}-${sessionName || 'default'}`}
                                                        src={logoUrl}
                                                        alt={`${team.name} logo`}
                                                        width={logoSize}
                                                        height={logoSize}
                                                        className="object-contain flex-shrink-0 mt-0.5"
                                                        unoptimized
                                                    />
                                                );
                                            })()}
                                            <div className={`font-semibold flex-1 leading-tight break-words ${teams.length > 10 ? 'text-sm md:text-base' : 'text-sm md:text-base'}`} style={{ color: '#E5E7EB', wordBreak: 'break-word', overflowWrap: 'break-word', lineHeight: '1.3' }} title={team.name}>{team.name}</div>
                                        </div>
                                        <div className={`${teams.length > 10 ? 'text-sm' : 'text-sm'} mb-1 font-bold`} style={{ color: '#FFFFFF' }}>
                                            Budget: ₹{formatIndianNumber(team.budget)}
                                        </div>
                                        <div className={`${teams.length > 10 ? 'text-sm' : 'text-sm'} mb-1 font-bold`} style={{ color: '#FFFFFF' }}>
                                            Players: {team.players.length}/{getPlayersPerTeam()}
                                        </div>
                                        {/* Display category limits below Players */}
                                        {auctionSettings?.category_limits && Object.keys(auctionSettings.category_limits).length > 0 && (
                                            <div className={`${teams.length > 10 ? 'text-xs' : 'text-xs'} mb-1 font-bold`} style={{ color: '#FFFFFF' }}>
                                                {Object.entries(auctionSettings.category_limits).map(([category, limit], index) => {
                                                    // Count how many players of this category the team already has
                                                    // Use originalPlayerPool to get category info, not the current players array
                                                    // (which might be filtered to skipped players only)
                                                    const categoryCount = team.players.filter(p => {
                                                        const playerInPool = originalPlayerPool.find(pl => pl.name === p.name);
                                                        return playerInPool?.category === category;
                                                    }).length;
                                                    return (
                                                        <span key={category}>
                                                            {category}: {categoryCount}/{limit}
                                                            {index < Object.keys(auctionSettings.category_limits!).length - 1 && '  '}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {maxBid >= getMinimumBid() && (
                                            <div className={`${teams.length > 10 ? 'text-base md:text-lg' : 'text-base md:text-lg'} mb-1 font-bold`} style={{ color: '#22C55E' }}>
                                                Max Bid: ₹{formatIndianNumber(maxBid)}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
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
                                <div className="text-center py-8" style={{ color: '#9CA3AF' }}>
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
                                                className="border rounded-lg p-4"
                                                style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full text-white text-sm font-bold flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E11D48' }}>
                                                            {idx + 1}
                                                        </div>
                                                        <span className="font-semibold text-base" style={{ color: '#E5E7EB' }}>{player.name}</span>
                                                    </div>
                                                    <span className="text-base font-bold" style={{ color: '#22C55E' }}>₹{player.bidAmount ? formatIndianNumber(player.bidAmount) : '0'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm ml-11" style={{ color: '#9CA3AF' }}>
                                                    {(() => {
                                                        const playerTeam = player.teamId ? teamMap.get(player.teamId) : undefined;
                                                        const logoUrl = getTeamLogo(playerTeam?.logoUrl);
                                                        const isProxyUrl = logoUrl.startsWith('/api/proxy-image');
                                                        if (isProxyUrl) {
                                                            return (
                                                                <img
                                                                    src={logoUrl}
                                                                    alt={`${player.teamName} logo`}
                                                                    width={20}
                                                                    height={20}
                                                                    className="object-contain"
                                                                />
                                                            );
                                                        }
                                                        return (
                                                            <Image
                                                                src={logoUrl}
                                                                alt={`${player.teamName} logo`}
                                                                width={20}
                                                                height={20}
                                                                className="object-contain"
                                                                unoptimized
                                                            />
                                                        );
                                                    })()}
                                                    <span>{player.teamName}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8" style={{ color: '#9CA3AF' }}>
                                        No players found
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
                                    className={`border rounded-lg p-4 transition-colors ${canEdit
                                        ? 'cursor-pointer'
                                        : 'cursor-default'
                                        }`}
                                    style={canEdit
                                        ? {
                                            backgroundColor: '#111827',
                                            borderColor: '#1F2937'
                                        }
                                        : {
                                            backgroundColor: '#111827',
                                            borderColor: '#1F2937'
                                        }
                                    }
                                    onMouseEnter={(e) => {
                                        if (canEdit) {
                                            e.currentTarget.style.borderColor = '#E11D48';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (canEdit) {
                                            e.currentTarget.style.borderColor = '#1F2937';
                                        }
                                    }}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <div className="text-base font-semibold" style={{ color: '#E5E7EB' }}>{player.name}</div>
                                            {canEdit && (
                                                <div className="text-xs mt-1 font-medium" style={{ color: '#E11D48' }}>
                                                    Tap to auction again
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8" style={{ color: '#9CA3AF' }}>
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
                            <div className="mt-6 pt-6 border-t" style={{ borderColor: '#1F2937' }}>
                                <button
                                    onClick={async () => {
                                        try {
                                            // Use the proper handler to switch to skipped players mode
                                            // This ensures we load skipped players from the database correctly
                                            await handleSwitchToSkippedPlayers();

                                            // Close the sheet
                                            setIsSkippedPlayersSheetOpen(false);
                                        } catch (error) {
                                            console.error('Error starting skipped players auction:', error);
                                            alert('Failed to start skipped players auction. Please try again.');
                                        }
                                    }}
                                    className="w-full text-white py-3 px-4 rounded-lg font-semibold transition-colors"
                                    style={{ backgroundColor: '#E11D48' }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C81E3D'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E11D48'}
                                >
                                    Start Auction with Skipped Players
                                </button>
                            </div>
                        ) : null;
                    })()}
                </div>
            </BottomSheet>

            {/* Players List Bottom Sheet */}
            <BottomSheet
                isOpen={isPlayerListSheetOpen}
                onClose={() => setIsPlayerListSheetOpen(false)}
                title="Players List"
            >
                <div className="pb-6">
                    {/* Filter Buttons */}
                    <div className="mb-4 rounded-lg p-3 border" style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}>
                        <div className="text-xs font-semibold mb-2" style={{ color: '#E5E7EB' }}>Status Filter:</div>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {(['All', 'Sold', 'Unsold'] as const).map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setPlayerListFilter(filter)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${playerListFilter === filter
                                        ? 'text-white'
                                        : 'border'
                                        }`}
                                    style={playerListFilter === filter
                                        ? { backgroundColor: '#E11D48' }
                                        : { backgroundColor: '#1F2937', color: '#9CA3AF', borderColor: '#1F2937' }
                                    }
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                        {/* Category Filter */}
                        {(() => {
                            const uniqueCategories = Array.from(new Set(originalPlayerPool.map(p => p.category).filter((cat): cat is string => Boolean(cat)))).sort();
                            if (uniqueCategories.length === 0) return null;

                            return (
                                <>
                                    <div className="text-xs font-semibold mb-2" style={{ color: '#E5E7EB' }}>Category Filter:</div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setSelectedCategoryFilter('All')}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategoryFilter === 'All'
                                                ? 'text-white'
                                                : 'border'
                                                }`}
                                            style={selectedCategoryFilter === 'All'
                                                ? { backgroundColor: '#E11D48' }
                                                : { backgroundColor: '#1F2937', color: '#9CA3AF', borderColor: '#1F2937' }
                                            }
                                        >
                                            All
                                        </button>
                                        {uniqueCategories.map((category) => (
                                            <button
                                                key={category}
                                                onClick={() => setSelectedCategoryFilter(category || 'All')}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedCategoryFilter === category
                                                    ? 'text-white'
                                                    : 'border'
                                                    }`}
                                                style={selectedCategoryFilter === category
                                                    ? { backgroundColor: '#E11D48' }
                                                    : { backgroundColor: '#1F2937', color: '#9CA3AF', borderColor: '#1F2937' }
                                                }
                                            >
                                                {category}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    {/* Players List */}
                    {memoizedFilteredPlayers.length > 0 ? (
                            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                                {memoizedFilteredPlayers.map((player, idx) => {
                                    const isSold = boughtPlayerNames.has(player.name);
                                    // Get team info for sold players using optimized map lookup
                                    const playerTeamInfo = isSold ? playerToTeamMap.get(player.name) : null;
                                    const playerTeam = playerTeamInfo?.team || null;
                                    const bidAmount = playerTeamInfo?.bidAmount;

                                    return (
                                        <div
                                            key={`${player.name}-${idx}`}
                                            className="border rounded-lg p-3"
                                            style={isSold
                                                ? { backgroundColor: '#111827', borderColor: '#22C55E' }
                                                : { backgroundColor: '#111827', borderColor: '#1F2937' }
                                            }
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="font-semibold" style={{ color: '#E5E7EB' }}>{player.name}</div>
                                                    {isSold && playerTeam && (
                                                        <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                                                            Sold to {playerTeam.name} for ₹{bidAmount ? formatIndianNumber(bidAmount) : '0'}
                                                        </div>
                                                    )}
                                                    {!isSold && (
                                                        <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Unsold</div>
                                                    )}
                                                </div>
                                                <div className="px-2 py-1 rounded text-xs font-medium" style={isSold
                                                    ? { backgroundColor: '#22C55E', color: '#0F172A' }
                                                    : { backgroundColor: '#1F2937', color: '#9CA3AF' }
                                                }>
                                                    {isSold ? 'Sold' : 'Unsold'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-8" style={{ color: '#9CA3AF' }}>
                                No players found
                            </div>
                        )}
                </div>
            </BottomSheet>
        </div>
    );
}


