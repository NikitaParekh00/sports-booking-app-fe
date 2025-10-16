"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabaseClient";
import { opponentManager } from "@/lib/opponentManagement";
import PhoneInput from "@/components/PhoneInput";

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

export default function FriendlyScoringPage() {
    const [selectedSport, setSelectedSport] = useState<string | null>(null);
    const [matchType, setMatchType] = useState<string | null>(null); // 'singles' or 'doubles'
    const [opponentPhone, setOpponentPhone] = useState("");
    const [opponentName, setOpponentName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingOpponent, setIsCheckingOpponent] = useState(false);
    const [checkTimeout, setCheckTimeout] = useState<NodeJS.Timeout | null>(null);
    const [opponentStatus, setOpponentStatus] = useState<'unknown' | 'found' | 'not-found' | 'owner-found'>('unknown');
    const supabase = createClient();

    // Cleanup timeout on component unmount
    useEffect(() => {
        return () => {
            if (checkTimeout) {
                clearTimeout(checkTimeout);
            }
        };
    }, [checkTimeout]);

    const handleSportSelect = (sportId: string) => {
        setSelectedSport(sportId);
        setMatchType(null);
    };

    const handleMatchTypeSelect = (type: string) => {
        setMatchType(type);
    };

    const handleOpponentPhoneChange = useCallback((phone: string) => {
        setOpponentPhone(phone);

        // Clear any existing timeout
        if (checkTimeout) {
            clearTimeout(checkTimeout);
        }

        // Validate phone number format
        const phoneValidation = opponentManager.validatePhoneNumber(phone);
        if (!phoneValidation.isValid) {
            setOpponentName(""); // Clear name if phone is invalid
            setOpponentStatus('unknown');
            return;
        }

        // Debounce the API call - wait 500ms after user stops typing
        const timeout = setTimeout(async () => {
            setIsCheckingOpponent(true);
            try {
                const cleanPhone = phone.replace(/\D/g, '');
                const formattedPhone = `+91-${cleanPhone}`;

                // Check if user exists as a PLAYER specifically
                const { data: playerOpponent } = await supabase
                    .from('profiles')
                    .select('full_name, role')
                    .eq('phone', formattedPhone)
                    .eq('role', 'player')
                    .single();

                if (playerOpponent) {
                    setOpponentName(playerOpponent.full_name);
                    setOpponentStatus('found');
                } else {
                    // Check if user exists with other roles
                    const { data: otherRoleUser } = await supabase
                        .from('profiles')
                        .select('full_name, role')
                        .eq('phone', formattedPhone)
                        .neq('role', 'player')
                        .single();

                    if (otherRoleUser) {
                        setOpponentName(otherRoleUser.full_name);
                        setOpponentStatus('owner-found'); // Show that they exist but need player account
                    } else {
                        setOpponentName(""); // Clear name if opponent doesn't exist
                        setOpponentStatus('not-found');
                    }
                }
            } catch (error) {
                console.error('Error checking opponent:', error);
                setOpponentName(""); // Clear name on error
                setOpponentStatus('unknown');
            } finally {
                setIsCheckingOpponent(false);
            }
        }, 500);

        setCheckTimeout(timeout);
    }, [checkTimeout, supabase]);

    const handleStartMatch = async () => {
        if (!selectedSport || !opponentPhone || (selectedSport === 'badminton' && !matchType)) return;

        setIsLoading(true);
        try {
            // Check if user is authenticated using localStorage (same as other pages)
            const storedUser = localStorage.getItem('sf:user');
            if (!storedUser) {
                alert('Please sign in to create matches. Redirecting to login...');
                window.location.href = '/login';
                return;
            }

            const userData = JSON.parse(storedUser);

            // Verify user exists in profiles table (they should already exist)
            const { data: existingUser, error: userError } = await supabase
                .from('profiles')
                .select('user_id, full_name, phone, role')
                .eq('user_id', userData.user_id)
                .single();

            if (userError || !existingUser) {
                console.error('User not found in profiles table:', userError);
                alert('User not found. Please sign in again.');
                setIsLoading(false);
                return;
            }

            // Business Logic Validation
            // 1. Check if user is trying to create match with themselves
            if (opponentManager.isSelfMatch(opponentPhone, userData.phone || '')) {
                alert('You cannot create a match with yourself. Please enter a different opponent\'s phone number.');
                setIsLoading(false);
                return;
            }

            // 2. Validate phone number format
            const phoneValidation = opponentManager.validatePhoneNumber(opponentPhone);
            if (!phoneValidation.isValid) {
                alert(phoneValidation.error);
                setIsLoading(false);
                return;
            }

            // 3. Find or create opponent
            const opponentInfo = await opponentManager.findOrCreateOpponent(opponentPhone, opponentName);

            // Create match
            const { data: match, error: matchError } = await supabase
                .from('matches')
                .insert({
                    created_by: userData.user_id,
                    sport: selectedSport,
                    match_type: 'friendly',
                    status: 'upcoming',
                    match_date: new Date().toISOString(),
                })
                .select()
                .single();

            if (matchError) throw matchError;

            // Add current user as player
            await supabase
                .from('match_players')
                .insert({
                    match_id: match.id,
                    user_id: userData.user_id,
                    player_name: userData.full_name || userData.email?.split('@')[0] || 'Player 1',
                    team: 'player_1',
                    is_captain: false, // Remove captain concept for badminton
                });

            // Add opponent as player
            await supabase
                .from('match_players')
                .insert({
                    match_id: match.id,
                    user_id: opponentInfo.user_id, // Will be null if opponent doesn't exist in auth.users
                    player_name: opponentInfo.player_name,
                    phone: opponentInfo.phone,
                    team: 'player_2',
                    is_captain: false,
                });

            // 3. Check for duplicate matches (optional - prevent spam)
            const { data: existingMatches } = await supabase
                .from('matches')
                .select('id')
                .eq('created_by', userData.user_id)
                .eq('sport', selectedSport)
                .eq('status', 'upcoming')
                .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes

            if (existingMatches && existingMatches.length > 3) {
                alert('You have created too many matches recently. Please wait a few minutes before creating another match.');
                setIsLoading(false);
                return;
            }

            // Show success message
            if (opponentInfo.isNewUser) {
                alert(`Match created successfully! A new account has been created for ${opponentInfo.player_name} (${opponentInfo.phone}). They can now join the match.`);
            } else {
                alert(`Match created successfully! ${opponentInfo.player_name} has been invited to the match.`);
            }

            // Redirect to scoring page
            window.location.href = `/scoring/match/${match.id}`;
        } catch (error) {
            console.error('Error creating match:', error);
            alert('Failed to create match. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (selectedSport) {
        // Show match type selection for badminton
        if (selectedSport === 'badminton' && !matchType) {
            return (
                <div className="min-h-screen bg-white p-4 pb-20">
                    <div className="max-w-md mx-auto">
                        <div className="mb-6">
                            <button
                                onClick={() => setSelectedSport(null)}
                                className="flex items-center gap-2 text-gray-600 mb-4"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back to Sports
                            </button>
                            <h1 className="text-2xl font-semibold text-gray-900">Start Badminton Match</h1>
                            <p className="text-gray-600 mt-1">Choose match type</p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Match Type</h3>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleMatchTypeSelect('singles')}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${matchType === 'singles'
                                            ? 'border-red-600 bg-red-50 text-red-600'
                                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                                            }`}
                                    >
                                        Singles
                                    </button>
                                    <button
                                        onClick={() => handleMatchTypeSelect('doubles')}
                                        className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors ${matchType === 'doubles'
                                            ? 'border-red-600 bg-red-50 text-red-600'
                                            : 'border-gray-300 text-gray-700 hover:border-gray-400'
                                            }`}
                                    >
                                        Doubles
                                    </button>
                                </div>
                            </div>
                        </div>
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

        // Show player details form
        return (
            <div className="min-h-screen bg-white p-4 pb-20">
                <div className="max-w-md mx-auto">
                    <div className="mb-6">
                        <button
                            onClick={() => selectedSport === 'badminton' ? setMatchType(null) : setSelectedSport(null)}
                            className="flex items-center gap-2 text-gray-600 mb-4"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back
                        </button>
                        <h1 className="text-2xl font-semibold text-gray-900">Start Friendly Match</h1>
                        <p className="text-gray-600 mt-1">
                            {sports.find(s => s.id === selectedSport)?.name}
                            {selectedSport === 'badminton' && matchType && ` • ${matchType.charAt(0).toUpperCase() + matchType.slice(1)}`}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Opponent&apos;s Phone Number
                            </label>
                            <PhoneInput
                                value={opponentPhone}
                                onChange={handleOpponentPhoneChange}
                                placeholder="9876543210"
                            />
                            {isCheckingOpponent && (
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    <span className="text-xs text-blue-600">Checking opponent...</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Opponent&apos;s Name (Optional)
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={opponentName}
                                    onChange={(e) => setOpponentName(e.target.value)}
                                    placeholder="Enter name if known"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {opponentName && !isCheckingOpponent && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            {!isCheckingOpponent && opponentStatus === 'found' && (
                                <p className="text-xs text-green-600 mt-1">
                                    ✓ User found
                                </p>
                            )}
                            {!isCheckingOpponent && opponentStatus === 'owner-found' && (
                                <p className="text-xs text-orange-600 mt-1">
                                    ℹ️ New user - account will be created automatically
                                </p>
                            )}
                            {!isCheckingOpponent && opponentStatus === 'not-found' && (
                                <p className="text-xs text-gray-500 mt-1">
                                    ℹ️ New user - account will be created automatically
                                </p>
                            )}
                        </div>

                        <button
                            onClick={handleStartMatch}
                            disabled={!opponentPhone || isLoading || (selectedSport === 'badminton' && !matchType)}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Creating Match...' : 'Start Match'}
                        </button>
                    </div>
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

    return (
        <div className="min-h-screen bg-white p-4 pb-20">
            <div className="max-w-md mx-auto">
                <h1 className="text-2xl font-semibold text-gray-900 mb-6">Choose Sport</h1>

                <div className="grid grid-cols-2 gap-4">
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
                    <a href="/profile" className="flex flex-col items-center">
                        <svg className="w-6 h-6 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-xs text-gray-400">Profile</span>
                    </a>
                </div>
            </div>
        </div>
    );
}