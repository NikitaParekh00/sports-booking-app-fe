"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { opponentManager } from "@/lib/opponentManagement";
import PhoneInput from "@/components/PhoneInput";
import { parseParticipantCsv, BADMINTON_PARTICIPANT_CSV_TEMPLATE } from "@/lib/csvParticipantParser";
import type { DoublesLinePayload } from "@/lib/generateBalancedDoublesSchedule";
import {
    generateDoublesScheduleForTeamOnly,
    generateDoublesScheduleByCountsOnly,
    generateBalancedDoublesSchedule,
    formatDoublesMatchNotes,
    normalizeCategoryLabel,
    NOTES_JSON_MARK,
    parseDoublesMatchNotes,
    theoreticalDoublesMatchCountIfFullyMet,
} from "@/lib/generateBalancedDoublesSchedule";
import {
    assignMatchTimesByCourt,
    assignMatchTimesWithPlayerConstraints,
    parseTimeInputToDailyClock,
    participantIdsForMatchScheduling,
    shouldUsePlayerAwareAssignment,
} from "@/lib/assignMatchTimeSlots";
import { buildScheduleExportRows, downloadSchedulePdf, downloadScheduleXlsx } from "@/lib/exportTournamentSchedule";
import {
    allowedPointsPerSetForSport,
    normalizePointsPerSetForSport,
    pointsPerSetOptionLabel,
} from "@/lib/tournamentPointsPerSet";
import { allUnorderedPairs, roundRobinGroupSlug } from "@/lib/generateGroupRoundRobin";
import {
    bracketRoundName,
    buildRoundOnePairings,
    nextPowerOfTwo,
    orderParticipantsForBracket,
} from "@/lib/singleEliminationBracket";
import { formatSetsForDisplay, parseFinalScoreToSets } from "@/lib/tournamentSetScoreUtils";

/** Clamp saved/display court count (DB column may be null before migration). */
function clampCourtCount(n: unknown): number {
    const x = typeof n === "number" ? n : typeof n === "string" ? parseInt(n, 10) : NaN;
    if (!Number.isFinite(x)) return 3;
    return Math.min(16, Math.max(1, Math.floor(x)));
}

function getCourtCount(t: Tournament): number {
    return clampCourtCount(t.number_of_courts);
}

function parseCourtLabelsFromDb(raw: unknown): string[] {
    if (raw == null) return [];
    if (!Array.isArray(raw)) return [];
    return raw.map((x) => (typeof x === "string" ? x : String(x ?? "")));
}

/** Editable labels from Settings; length follows number_of_courts (empty string = use default "Court N"). */
function courtLabelsStateFromTournament(t: Tournament): string[] {
    const n = clampCourtCount(t.number_of_courts ?? 3);
    const stored = parseCourtLabelsFromDb(t.court_labels);
    return Array.from({ length: n }, (_, i) => (stored[i] != null ? String(stored[i]) : ""));
}

function getCourtDisplayLabels(t: Tournament): string[] {
    const n = getCourtCount(t);
    const stored = parseCourtLabelsFromDb(t.court_labels);
    return Array.from({ length: n }, (_, i) => {
        const s = (stored[i] ?? "").trim();
        return s || `Court ${i + 1}`;
    });
}

function courtDisplayLabelForKey(t: Tournament, courtKey: string): string {
    const idx = parseInt(courtKey, 10) - 1;
    if (Number.isFinite(idx) && idx >= 0 && idx < getCourtCount(t)) {
        return getCourtDisplayLabels(t)[idx];
    }
    return `Court ${courtKey}`;
}

/** Schedule cards / exports: map stored numeric court keys to Settings labels; keep other values as-is. */
function formatStoredCourtForDisplay(t: Tournament, court_number: string | null | undefined): string {
    const c = String(court_number ?? "").trim();
    if (!c) return "—";
    if (/^\d+$/.test(c)) {
        const num = parseInt(c, 10);
        if (num >= 1 && num <= getCourtCount(t)) return courtDisplayLabelForKey(t, c);
    }
    const m = c.match(/^court\s*(\d+)$/i);
    if (m) {
        const num = parseInt(m[1], 10);
        if (num >= 1 && num <= getCourtCount(t)) return courtDisplayLabelForKey(t, m[1]);
    }
    return c;
}

/** Match slot length for “Assign match times” / court-time generation (aligned with assignMatchTimeSlots). */
const ASSIGN_SLOT_MINUTES_MIN = 1;
const ASSIGN_SLOT_MINUTES_MAX = 180;
const DEFAULT_ASSIGN_SLOT_MINUTES = 15;
const UMPIRE_PREFIX = "UMP:";

function clampAssignSlotMinutes(n: number): number {
    if (!Number.isFinite(n)) return DEFAULT_ASSIGN_SLOT_MINUTES;
    return Math.min(ASSIGN_SLOT_MINUTES_MAX, Math.max(ASSIGN_SLOT_MINUTES_MIN, Math.floor(n)));
}

function getUmpireFromNotes(notes: string | null | undefined): string {
    if (!notes) return "";
    const idx = notes.indexOf(NOTES_JSON_MARK);
    const textPart = (idx >= 0 ? notes.slice(0, idx) : notes).trim();
    if (!textPart) return "";
    const line = textPart
        .split("\n")
        .map((s) => s.trim())
        .find((s) => /^ump(ire)?\s*:/i.test(s));
    if (!line) return "";
    return line.replace(/^ump(ire)?\s*:\s*/i, "").trim();
}

function setUmpireInNotes(
    existingNotes: string | null | undefined,
    umpireName: string | null | undefined,
): string | null {
    const raw = (existingNotes || "").trim();
    const idx = raw.indexOf(NOTES_JSON_MARK);
    const jsonPart = idx >= 0 ? raw.slice(idx).trim() : "";
    const textPart = idx >= 0 ? raw.slice(0, idx).trim() : raw;

    const cleanedTextLines = textPart
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s && !/^ump(ire)?\s*:/i.test(s));

    const cleanUmpire = (umpireName || "").trim();
    const nextTextLines = cleanUmpire
        ? [`${UMPIRE_PREFIX} ${cleanUmpire}`, ...cleanedTextLines]
        : cleanedTextLines;

    const assembled = [nextTextLines.join("\n").trim(), jsonPart]
        .filter(Boolean)
        .join("\n")
        .trim();
    return assembled || null;
}

interface Tournament {
    id: string;
    name: string;
    sport: string;
    description: string;
    start_date: string;
    end_date: string;
    location: string;
    max_participants: number;
    entry_fee: number;
    prize_pool: number;
    status: string;
    created_by: string;
    /** Parallel courts for schedule UI and generators (default 3). */
    number_of_courts?: number | null;
    /** JSON array of optional display names; index 0 = court 1. */
    court_labels?: unknown;
    format?: string;
    sets_per_match?: number;
    points_per_set?: number;
    win_by_two?: boolean;
    max_points?: number;
    seeding_method?: string;
    current_round?: number;
    total_rounds?: number;
    brackets_generated?: boolean;
    groups_generated?: boolean;
    tournament_mode?: 'individual' | 'team';
}

interface Participant {
    id: string;
    tournament_id: string;
    user_id: string | null;
    player_name: string;
    phone: string | null;
    status: string;
    created_at: string;
    email?: string | null;
    category?: string | null;
    seed_number?: number | null;
    club?: string | null;
}

interface MatchPlayer {
    id: string;
    player_name: string;
    team: string;
    user_id?: string | null;
}

interface TournamentMatch {
    id: string;
    match_date: string | null;
    status: string;
    notes?: string | null;
    match_type?: string;
    match_players?: MatchPlayer[];
    team_a_id?: string | null;
    team_b_id?: string | null;
    winner_team_id?: string | null;
    winner_id?: string | null;
    court_number?: string | null;
    final_score?: string | null;
    match_number?: string | null;
    team_a?: { id: string; name: string; short_name?: string | null };
    team_b?: { id: string; name: string; short_name?: string | null };
    winner_team?: { id: string; name: string } | null;
}

interface TournamentTeam {
    id: string;
    tournament_id: string;
    name: string;
    short_name: string | null;
    category: string | null;
    created_at: string;
}

interface TournamentTeamMember {
    id: string;
    team_id: string;
    participant_id: string;
    position: number;
    participant?: Participant;
}

const ALLOWED_EDIT_PHONE = "+91-7506256356";

export default function TournamentDetailPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const tournamentId = params.id as string;
    const [tournament, setTournament] = useState<Tournament | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(true);
    /** Set true only after a valid `sf:user` session (same gate as auction). */
    const [sessionOk, setSessionOk] = useState(false);
    const [canEdit, setCanEdit] = useState(false);
    type TabType = 'overview' | 'participants' | 'groups' | 'brackets' | 'settings' | 'teams' | 'schedule' | 'results' | 'team_stats' | 'player_stats';
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const isTeamTournament = (tournament?.tournament_mode ?? 'individual') === 'team';
    const [showAddParticipant, setShowAddParticipant] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        const checkEditAccess = async () => {
            try {
                const storedUser = localStorage.getItem("sf:user");
                if (!storedUser) {
                    setCanEdit(false);
                    alert("Please log in to view tournaments.");
                    router.push("/login");
                    return;
                }
                let userData: { user_id?: string };
                try {
                    userData = JSON.parse(storedUser) as { user_id?: string };
            } catch {
                setCanEdit(false);
                    alert("Please log in to view tournaments.");
                    router.push("/login");
                    return;
                }
                if (!userData?.user_id) {
                    setCanEdit(false);
                    alert("Please log in to view tournaments.");
                    router.push("/login");
                    return;
                }
                const { data: profile, error } = await supabase
                    .from("profiles")
                    .select("phone")
                    .eq("user_id", userData.user_id)
                    .single();
                if (error) {
                    console.error("Profile fetch for edit gate:", error);
                    setCanEdit(false);
                } else {
                    setCanEdit(profile?.phone === ALLOWED_EDIT_PHONE);
                }
                setSessionOk(true);
            } catch (e) {
                console.error(e);
                setCanEdit(false);
                setSessionOk(true);
            } finally {
                setAuthLoading(false);
            }
        };
        void checkEditAccess();
    }, [router, supabase]);

    const fetchTournamentData = useCallback(async () => {
        try {
            // Fetch tournament
            const { data: tournamentData, error: tournamentError } = await supabase
                .from('tournaments')
                .select('*')
                .eq('id', tournamentId)
                .single();

            if (tournamentError) throw tournamentError;

            // Fetch participants
            const { data: participantsData, error: participantsError } = await supabase
                .from('tournament_participants')
                .select('*')
                .eq('tournament_id', tournamentId)
                .order('created_at', { ascending: true });

            if (participantsError) throw participantsError;

            setTournament(tournamentData);
            setParticipants(participantsData || []);
        } catch (error) {
            console.error('Error fetching tournament data:', error);
            alert('Failed to load tournament data');
        } finally {
            setIsLoading(false);
        }
    }, [tournamentId, supabase]);

    useEffect(() => {
        if (tournamentId && sessionOk) {
            void fetchTournamentData();
        }
    }, [tournamentId, sessionOk, fetchTournamentData]);

    const showSettingsTab = !authLoading && canEdit;

    useEffect(() => {
        const t = searchParams.get("tab");
        if (t === "settings" && !showSettingsTab) {
            setActiveTab("overview");
            return;
        }
        if (t === "results") setActiveTab("results");
        if (t === "schedule") setActiveTab("schedule");
        if (t === "player_stats") setActiveTab("player_stats");
        if (t === "settings" && showSettingsTab) setActiveTab("settings");
    }, [searchParams, showSettingsTab]);

    useEffect(() => {
        if (!showSettingsTab && activeTab === "settings") {
            setActiveTab("overview");
        }
    }, [showSettingsTab, activeTab]);

    const handleStartTournament = async () => {
        if (!tournament) return;

        if (participants.length < 2) {
            alert('You need at least 2 participants to start a tournament');
            return;
        }

        try {
            const { error } = await supabase
                .from('tournaments')
                .update({ status: 'live' })
                .eq('id', tournamentId);

            if (error) throw error;

            setTournament(prev => prev ? { ...prev, status: 'live' } : null);
            alert('Tournament started!');
        } catch (error) {
            console.error('Error starting tournament:', error);
            alert('Failed to start tournament');
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white px-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4" />
                    <p className="text-gray-600">Checking access…</p>
                </div>
            </div>
        );
    }

    if (!sessionOk) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white px-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4" />
                    <p className="text-gray-600">Redirecting to login…</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white px-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading tournament…</p>
                </div>
            </div>
        );
    }

    if (!tournament) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white px-4">
                <div className="text-center bg-white rounded-2xl shadow-lg p-6 max-w-md w-full border border-gray-200">
                    <p className="text-red-600 mb-4">Tournament not found</p>
                    <button
                        onClick={() => router.push("/scoring/tournaments")}
                        className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                    >
                        Back to Tournaments
                    </button>
                </div>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'live': return 'text-green-600 bg-green-100';
            case 'completed': return 'text-gray-400 bg-gray-800';
            case 'cancelled': return 'text-red-600 bg-red-100';
            case 'upcoming': return 'text-blue-600 bg-blue-100';
            default: return 'text-gray-400 bg-gray-800';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 w-full min-w-0 overflow-x-hidden">
            {/* Header */}
            <div className="border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
                <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-4 mb-4 min-w-0">
                    <button
                        onClick={() => router.push('/scoring/tournaments')}
                            className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-red-600 text-sm md:text-base touch-manipulation flex-shrink-0 min-w-0"
                    >
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                            <span className="truncate">Back to Tournaments</span>
                    </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4 min-w-0">
                        <div className="flex-1 min-w-0 w-full">
                            <div className="flex items-start gap-3 mb-2 min-w-0">
                                <Image
                                    src="/logoSponser1.png"
                                    alt="Sponsor"
                                    width={180}
                                    height={180}
                                    className="h-24 w-24 sm:h-28 sm:w-28 object-contain rounded-md flex-shrink-0 self-start -mt-2"
                                />
                                <div className="min-w-0 flex-1 overflow-hidden">
                                    <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900 break-words line-clamp-2">{tournament.name}</h1>
                                    <div className="mt-1 flex items-center gap-2 min-w-0">
                                        <p className="text-gray-600 text-xs md:text-sm line-clamp-2">{tournament.description || 'No description'}</p>
                                        <Image
                                            src="/logoSponser2.jpeg"
                                            alt="Sponsor 2"
                                            width={420}
                                            height={100}
                                            className="h-14 sm:h-[4.5rem] w-auto object-contain flex-shrink-0"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-3 text-xs md:text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                    <span>📍</span>
                                    <span className="truncate">{tournament.location || 'No location'}</span>
                            </div>
                                <div className="flex items-center gap-1">
                                    <span>📅</span>
                                    <span>{new Date(tournament.start_date).toLocaleDateString()}</span>
                        </div>
                                <div className="flex items-center gap-1">
                                    <span>👥</span>
                                    <span>{participants.length} / {tournament.max_participants} participants</span>
                            </div>
                            </div>
                        </div>
                        <div className="flex items-center flex-shrink-0">
                            <Image src="/logo.jpeg" alt="Simplifit" width={260} height={72} className="h-14 sm:h-16 w-auto object-contain max-w-[200px] sm:max-w-[240px]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 bg-white sticky top-0 md:top-[140px] z-10 shadow-sm min-w-0">
                <div className="max-w-6xl mx-auto px-3 sm:px-4 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0 py-2">
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide min-w-0 flex-1">
                            {(isTeamTournament
                                ? [
                                      { id: "overview", label: "Overview" },
                                      { id: "participants", label: `Participants (${participants.length})` },
                                      { id: "schedule", label: "Schedule" },
                                      { id: "results", label: "Results" },
                                      { id: "player_stats", label: "Player Stats" },
                                      ...(showSettingsTab ? [{ id: "settings" as const, label: "Settings" }] : []),
                                  ]
                                : [
                                      { id: "overview", label: "Overview" },
                                      { id: "participants", label: `Participants (${participants.length})` },
                                      { id: "groups", label: "Groups" },
                                      { id: "brackets", label: "Brackets" },
                                      { id: "schedule", label: "Schedule" },
                                      { id: "results", label: "Results" },
                                      { id: "player_stats", label: "Player Stats" },
                                      ...(showSettingsTab ? [{ id: "settings" as const, label: "Settings" }] : []),
                                  ]
                            ).map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`px-3 md:px-4 py-2 rounded-lg border text-sm font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${
                                    activeTab === tab.id
                                        ? 'bg-red-600 border-red-600 text-white'
                                        : 'bg-white border-gray-200 text-gray-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 pl-2 py-1">
                            <div className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium ${getStatusColor(tournament.status)}`}>
                                {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                            </div>
                            {tournament.status === 'upcoming' && canEdit && (
                                <button
                                    onClick={handleStartTournament}
                                    className="bg-red-600 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-red-700 text-xs md:text-sm whitespace-nowrap font-medium"
                                >
                                    Start Tournament
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 md:py-6 min-w-0 w-full overflow-x-hidden">
                {activeTab === "overview" && (
                    <TournamentOverview tournament={tournament} participants={participants} canEdit={canEdit} />
                )}

                {activeTab === 'participants' && (
                    <ParticipantsTab
                        tournament={tournament}
                        participants={participants}
                        onParticipantsChange={fetchTournamentData}
                        showAddParticipant={showAddParticipant}
                        setShowAddParticipant={setShowAddParticipant}
                        canEdit={canEdit}
                    />
                )}

                {activeTab === 'groups' && (
                    <GroupsTab tournament={tournament} participants={participants} canEdit={canEdit} onRefresh={fetchTournamentData} />
                )}

                {activeTab === 'brackets' && (
                    <BracketsTab tournament={tournament} participants={participants} canEdit={canEdit} onRefresh={fetchTournamentData} />
                )}

                {activeTab === "schedule" && !isTeamTournament && (
                    <IndividualScheduleTab
                        tournament={tournament}
                        participants={participants}
                        onRefresh={fetchTournamentData}
                        canEdit={canEdit}
                    />
                )}

                {activeTab === 'teams' && isTeamTournament && (
                    <TeamsTab tournament={tournament} participants={participants} onRefresh={fetchTournamentData} canEdit={canEdit} />
                )}
                {activeTab === 'schedule' && isTeamTournament && (
                    <TeamScheduleTab tournament={tournament} onRefresh={fetchTournamentData} canEdit={canEdit} />
                )}
                {activeTab === 'results' && isTeamTournament && (
                    <TeamResultsTab tournament={tournament} onRefresh={fetchTournamentData} canEdit={canEdit} />
                )}
                {activeTab === "results" && !isTeamTournament && (
                    <BracketResultsTab
                        tournament={tournament}
                        participants={participants}
                        onRefresh={fetchTournamentData}
                        canEdit={canEdit}
                        resultMatchId={searchParams.get("resultMatch")}
                    />
                )}
                {activeTab === 'team_stats' && isTeamTournament && (
                    <TeamStatsTab tournament={tournament} canEdit={canEdit} />
                )}
                {activeTab === 'player_stats' && isTeamTournament && (
                    <PlayerStatsTab tournament={tournament} />
                )}
                {activeTab === "player_stats" && !isTeamTournament && (
                    <IndividualPlayerStatsTab tournament={tournament} participants={participants} />
                )}

                {activeTab === "settings" && showSettingsTab && (
                    <SettingsTab tournament={tournament} onTournamentUpdate={fetchTournamentData} canEdit={canEdit} />
                )}
            </div>
        </div>
    );
}

// Overview Tab Component
function TournamentOverview({
    tournament,
    participants,
    canEdit = false,
}: {
    tournament: Tournament;
    participants: Participant[];
    canEdit?: boolean;
}) {
    const confirmedParticipants = participants.filter(p => p.status === 'confirmed' || p.status === 'registered');
    const eliminatedParticipants = participants.filter(p => p.status === 'eliminated');
    const winner = participants.find(p => p.status === 'winner');

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 md:p-4">
                    <div className={`text-xs md:text-sm text-gray-600 mb-1`}>Total Participants</div>
                    <div className={`text-xl md:text-2xl font-semibold text-gray-900`}>{participants.length}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 md:p-4">
                    <div className={`text-xs md:text-sm text-gray-600 mb-1`}>Confirmed</div>
                    <div className={`text-xl md:text-2xl font-semibold text-green-600`}>{confirmedParticipants.length}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 md:p-4">
                    <div className={`text-xs md:text-sm text-gray-600 mb-1`}>Eliminated</div>
                    <div className="text-xl md:text-2xl font-semibold text-red-600">{eliminatedParticipants.length}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 md:p-4">
                    <div className={`text-xs md:text-sm text-gray-600 mb-1`}>Entry Fee</div>
                    <div className={`text-xl md:text-2xl font-semibold text-gray-900`}>₹{tournament.entry_fee}</div>
                </div>
            </div>

            {canEdit && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 md:p-6">
                    <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">Tournament Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm">
                    <div>
                        <div className="text-gray-600 mb-1">Format</div>
                            <div className="font-medium text-gray-900">
                                {tournament.format?.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "Single Elimination"}
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-600 mb-1">Match Format</div>
                            <div className="font-medium text-gray-900">
                            Best of {tournament.sets_per_match || 3} sets, {tournament.points_per_set || 21} points
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-600 mb-1">Prize Pool</div>
                            <div className="font-medium text-gray-900">₹{tournament.prize_pool}</div>
                    </div>
                    <div>
                        <div className="text-gray-600 mb-1">Start Date</div>
                            <div className="font-medium text-gray-900">{new Date(tournament.start_date).toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            )}

            {winner && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
                    <div className="flex items-center gap-3">
                        <span className="text-4xl">🏆</span>
                        <div>
                            <div className="text-sm text-yellow-800 font-medium">Tournament Winner</div>
                            <div className="text-2xl font-bold text-yellow-900">{winner.player_name}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Participants Tab Component
function ParticipantsTab({
    tournament,
    participants,
    onParticipantsChange,
    showAddParticipant,
    setShowAddParticipant,
    canEdit = false,
}: {
    tournament: Tournament;
    participants: Participant[];
    onParticipantsChange: () => void;
    showAddParticipant: boolean;
    setShowAddParticipant: (show: boolean) => void;
    canEdit?: boolean;
}) {
    const [newParticipantName, setNewParticipantName] = useState("");
    const [newParticipantPhone, setNewParticipantPhone] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [isUploadingCsv, setIsUploadingCsv] = useState(false);
    const [csvUploadError, setCsvUploadError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const supabase = createClient();

    const handleAddParticipant = async () => {
        if (!newParticipantName.trim()) {
            alert('Please enter participant name');
            return;
        }

        if (participants.length >= tournament.max_participants) {
            alert(`Tournament is full. Maximum ${tournament.max_participants} participants allowed.`);
            return;
        }

        const formattedPhone = newParticipantPhone ? `+91-${newParticipantPhone.replace(/\D/g, '')}` : null;

        setIsAdding(true);
        try {
            // If phone is provided, try to find or create user
            let userId = null;
            if (newParticipantPhone) {
                const phoneValidation = opponentManager.validatePhoneNumber(newParticipantPhone);
                if (phoneValidation.isValid) {
                    const opponentInfo = await opponentManager.findOrCreateOpponent(newParticipantPhone, newParticipantName);
                    userId = opponentInfo.user_id;
                }
            }

            const { error } = await supabase
                .from('tournament_participants')
                .insert({
                    tournament_id: tournament.id,
                    user_id: userId,
                    player_name: newParticipantName,
                    phone: formattedPhone,
                    status: 'registered',
                });

            if (error) throw error;

            setNewParticipantName("");
            setNewParticipantPhone("");
            setShowAddParticipant(false);
            onParticipantsChange();
        } catch (error) {
            console.error('Error adding participant:', error);
            alert('Failed to add participant');
        } finally {
            setIsAdding(false);
        }
    };

    const handleUploadCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setCsvUploadError(null);
        if (!file) return;
        const text = await file.text();
        const { participants: parsed, errors } = parseParticipantCsv(text);
        if (parsed.length === 0) {
            setCsvUploadError(errors.length > 0 ? errors.join(' ') : 'No valid rows in CSV.');
            e.target.value = '';
            return;
        }
        const max = tournament.max_participants;
        const allowed = Math.max(0, max - participants.length);
        const toAdd = parsed.slice(0, allowed);
        if (toAdd.length === 0) {
            setCsvUploadError(`Tournament is full (max ${max}).`);
            e.target.value = '';
            return;
        }
        if (toAdd.length < parsed.length) {
            setCsvUploadError(`Only ${toAdd.length} of ${parsed.length} added; max ${max} participants.`);
        }
        setIsUploadingCsv(true);
        try {
            for (const p of toAdd) {
                const phone = p.phone ? `+91-${p.phone.replace(/\D/g, '')}` : null;
                let userId = null;
                if (p.phone) {
                    const phoneValidation = opponentManager.validatePhoneNumber(p.phone);
                    if (phoneValidation.isValid) {
                        const opponentInfo = await opponentManager.findOrCreateOpponent(p.phone, p.name);
                        userId = opponentInfo.user_id;
                    }
                }
                const { error } = await supabase
                    .from('tournament_participants')
                    .insert({
                        tournament_id: tournament.id,
                        user_id: userId,
                        player_name: p.name,
                        phone: phone || null,
                        email: p.email || null,
                        category: p.category || null,
                        seed_number: p.seed ?? null,
                        club: p.club || null,
                        status: 'registered',
                    });
                if (error) throw error;
            }
            onParticipantsChange();
        } catch (err) {
            console.error('CSV upload error:', err);
            setCsvUploadError('Failed to add some participants. Check format and try again.');
        } finally {
            setIsUploadingCsv(false);
            e.target.value = '';
        }
    };

    const handleRemoveParticipant = async (participantId: string) => {
        if (!confirm('Are you sure you want to remove this participant?')) return;

        try {
            const { error } = await supabase
                .from('tournament_participants')
                .delete()
                .eq('id', participantId);

            if (error) throw error;

            onParticipantsChange();
        } catch (error) {
            console.error('Error removing participant:', error);
            alert('Failed to remove participant');
        }
    };

    const handleUpdateStatus = async (participantId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('tournament_participants')
                .update({ status: newStatus })
                .eq('id', participantId);

            if (error) throw error;

            onParticipantsChange();
        } catch (error) {
            console.error('Error updating participant status:', error);
            alert('Failed to update participant status');
        }
    };

    const handleEditParticipant = async (participantId: string) => {
        if (!editName.trim()) {
            alert('Please enter a name');
            return;
        }

        const target = participants.find((p) => p.id === participantId);
        const oldName = (target?.player_name || '').trim();
        const nextName = editName.trim();
        if (!oldName) {
            alert('Could not find participant to edit.');
            return;
        }
        if (oldName === nextName) {
            setEditingId(null);
            setEditName('');
            return;
        }

        const rewriteDoublesNotesName = (notes: string | null | undefined): string | null | undefined => {
            const parsed = parseDoublesMatchNotes(notes);
            if (!parsed) return notes;

            let changed = false;
            const sideA = parsed.sideA.map((s) => {
                if (s.id !== participantId || s.name === nextName) return s;
                changed = true;
                return { ...s, name: nextName };
            });
            const sideB = parsed.sideB.map((s) => {
                if (s.id !== participantId || s.name === nextName) return s;
                changed = true;
                return { ...s, name: nextName };
            });
            if (!changed) return notes;

            const raw = (notes || '').trim();
            const idx = raw.indexOf(NOTES_JSON_MARK);
            const textPart = idx >= 0 ? raw.slice(0, idx).trim() : '';
            const jsonPart = `${NOTES_JSON_MARK}${JSON.stringify({ ...parsed, sideA, sideB })}`;
            const assembled = [textPart, jsonPart].filter(Boolean).join('\n').trim();
            return assembled || null;
        };

        try {
            const { error } = await supabase
                .from('tournament_participants')
                .update({ player_name: nextName })
                .eq('id', participantId);

            if (error) throw error;

            const { data: matchRows, error: matchErr } = await supabase
                .from('matches')
                .select('id, notes')
                .eq('tournament_id', tournament.id);
            if (matchErr) throw matchErr;

            const matchIds = (matchRows || []).map((m) => m.id);
            if (matchIds.length > 0) {
                // Keep names in sync for score-entry rows that read from match_players.
                if (target?.user_id) {
                    const { error: eByUser } = await supabase
                        .from('match_players')
                        .update({ player_name: nextName })
                        .eq('user_id', target.user_id)
                        .in('match_id', matchIds);
                    if (eByUser) throw eByUser;
                }
                const { error: eByName } = await supabase
                    .from('match_players')
                    .update({ player_name: nextName })
                    .eq('player_name', oldName)
                    .in('match_id', matchIds);
                if (eByName) throw eByName;

                // Keep doubles lineup JSON in notes aligned for schedule/results/export.
                for (const m of matchRows || []) {
                    const nextNotes = rewriteDoublesNotesName(m.notes);
                    if (nextNotes === m.notes) continue;
                    const { error: noteErr } = await supabase.from('matches').update({ notes: nextNotes }).eq('id', m.id);
                    if (noteErr) throw noteErr;
                }
            }

            setEditingId(null);
            setEditName("");
            onParticipantsChange();
        } catch (error) {
            console.error('Error updating participant:', error);
            alert('Failed to update participant');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className={`text-xl font-semibold text-gray-900`}>Participants</h2>
                {canEdit && !showAddParticipant && (
                    <div className="flex items-center gap-2">
                        <label className="cursor-pointer bg-white text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 border-gray-300 text-sm font-medium border border-gray-300">
                            {isUploadingCsv ? 'Uploading...' : 'Upload CSV'}
                            <input
                                type="file"
                                accept=".csv,.txt"
                                className="sr-only"
                                disabled={isUploadingCsv || participants.length >= tournament.max_participants}
                                onChange={handleUploadCsv}
                            />
                        </label>
                        <a
                            href={`data:text/csv;charset=utf-8,${encodeURIComponent(BADMINTON_PARTICIPANT_CSV_TEMPLATE)}`}
                            download="badminton_participants_template.csv"
                            className="text-sm text-blue-600 hover:underline"
                        >
                            Template
                        </a>
                    <button
                        onClick={() => setShowAddParticipant(true)}
                        disabled={participants.length >= tournament.max_participants}
                            className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                        Add Participant
                    </button>
                    </div>
                )}
                {!canEdit && <p className="text-sm text-gray-600">View only</p>}
            </div>
            {csvUploadError && <p className="text-sm text-amber-700 mt-2">{csvUploadError}</p>}

            {canEdit && showAddParticipant && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                    <h3 className={`font-medium text-gray-900 mb-4`}>Add New Participant</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Name *
                            </label>
                            <input
                                type="text"
                                value={newParticipantName}
                                onChange={(e) => setNewParticipantName(e.target.value)}
                                placeholder="Enter participant name"
                                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone Number (Optional)
                            </label>
                            <PhoneInput
                                value={newParticipantPhone}
                                onChange={setNewParticipantPhone}
                                placeholder="9876543210"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleAddParticipant}
                                disabled={isAdding}
                                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                            >
                                {isAdding ? 'Adding...' : 'Add Participant'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowAddParticipant(false);
                                    setNewParticipantName("");
                                    setNewParticipantPhone("");
                                }}
                                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {participants.length === 0 ? (
                <div className="text-center py-12 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="text-gray-600 mb-4">No participants yet</div>
                    <p className="text-sm text-gray-600 mb-4">
                        Add one by one or upload a CSV (name, phone, email, category, seed, club). Same <strong>club</strong> or same numeric <strong>seed</strong> (if club empty) groups players into a team on the Teams tab.
                    </p>
                    {canEdit && (
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        <label className="cursor-pointer bg-white text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 border-gray-300 text-sm font-medium border border-gray-300">
                            {isUploadingCsv ? 'Uploading...' : 'Upload CSV'}
                            <input
                                type="file"
                                accept=".csv,.txt"
                                className="sr-only"
                                disabled={isUploadingCsv || participants.length >= tournament.max_participants}
                                onChange={handleUploadCsv}
                            />
                        </label>
                        <a
                            href={`data:text/csv;charset=utf-8,${encodeURIComponent(BADMINTON_PARTICIPANT_CSV_TEMPLATE)}`}
                            download="participants_template.csv"
                            className="text-sm text-red-600 hover:underline px-2"
                        >
                            Download template
                        </a>
                        <span className="text-gray-500">or</span>
                    <button
                        onClick={() => setShowAddParticipant(true)}
                            className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
                    >
                        Add First Participant
                    </button>
                    </div>
                    )}
                </div>
            ) : (
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-white border-b border-gray-200">
                                <tr>
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-600">#</th>
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-600">Name</th>
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-600 hidden sm:table-cell">Phone</th>
                                    <th className="px-2 md:px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-600">Status</th>
                                    {canEdit && <th className="px-2 md:px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-600">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {participants.map((participant, index) => (
                                    <tr key={participant.id} style={{ backgroundColor: index % 2 === 0 ? "#FFFFFF" : "#FFF5F5" }}>
                                        <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-gray-900">{index + 1}</td>
                                        <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-gray-900 font-medium">
                                            {canEdit && editingId === participant.id ? (
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="w-full px-2 py-1 border border-gray-300 bg-white text-gray-900 rounded text-xs md:text-sm"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleEditParticipant(participant.id);
                                                        } else if (e.key === 'Escape') {
                                                            setEditingId(null);
                                                            setEditName("");
                                                        }
                                                    }}
                                                    autoFocus
                                                />
                                            ) : canEdit ? (
                                                <span
                                                    className="cursor-pointer text-gray-900 hover:text-red-600 font-semibold"
                                                    onClick={() => {
                                                        setEditingId(participant.id);
                                                        setEditName(participant.player_name);
                                                    }}
                                                >
                                                    {formatPlayerNameWithCategory(participant.player_name, participant.category)}
                                                </span>
                                            ) : (
                                                <span className="text-gray-900 font-semibold">
                                                    {formatPlayerNameWithCategory(participant.player_name, participant.category)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-gray-700 hidden sm:table-cell">{participant.phone || '-'}</td>
                                        <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-gray-900">
                                            {canEdit ? (
                                            <select
                                                value={participant.status}
                                                onChange={(e) => handleUpdateStatus(participant.id, e.target.value)}
                                                    className="text-xs md:text-sm border border-gray-300 bg-white text-gray-900 rounded px-1 md:px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-red-500"
                                            >
                                                <option value="registered">Registered</option>
                                                <option value="confirmed">Confirmed</option>
                                                <option value="eliminated">Eliminated</option>
                                                <option value="winner">Winner</option>
                                            </select>
                                            ) : (
                                                <span className="text-gray-900 capitalize">{participant.status}</span>
                                            )}
                                        </td>
                                        {canEdit && (
                                        <td className="px-2 md:px-4 py-3 text-xs md:text-sm">
                                            <button
                                                onClick={() => handleRemoveParticipant(participant.id)}
                                                className="text-red-600 hover:text-red-700 text-xs md:text-sm"
                                            >
                                                Remove
                                            </button>
                                        </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

type GroupRow = { id: string; group_name: string; group_order: number | null };
type GroupWithMembers = GroupRow & { members: Participant[] };

function allocateUniqueGroupName(rawKey: string, used: Set<string>): string {
    const base = (rawKey.trim() || "No club").slice(0, 50);
    let candidate = base;
    let n = 2;
    while (used.has(candidate)) {
        const suffix = ` ${n}`;
        candidate = (base.slice(0, Math.max(1, 50 - suffix.length)) + suffix).slice(0, 50);
        n += 1;
    }
    used.add(candidate);
    return candidate;
}

function participantsByClubKey(participants: Participant[]): Map<string, Participant[]> {
    const m = new Map<string, Participant[]>();
    for (const p of participants) {
        const key = (p.club?.trim() ?? "").length > 0 ? p.club!.trim() : "No club";
        if (!m.has(key)) m.set(key, []);
        m.get(key)!.push(p);
    }
    return m;
}

// Groups Tab Component (individual tournaments — one group per distinct `club` on participants)
function GroupsTab({
    tournament,
    participants,
    canEdit = false,
    onRefresh,
}: {
    tournament: Tournament;
    participants: Participant[];
    canEdit?: boolean;
    onRefresh: () => void;
}) {
    const [groups, setGroups] = useState<GroupWithMembers[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const supabase = createClient();

    const loadGroups = useCallback(async () => {
        setLoading(true);
        try {
            const { data: grps, error: e1 } = await supabase
                .from("tournament_groups")
                .select("id, group_name, group_order")
                .eq("tournament_id", tournament.id)
                .order("group_order", { ascending: true });
            if (e1) throw e1;
            if (!grps?.length) {
                setGroups([]);
                return;
            }
            const gids = grps.map((g) => g.id);
            const { data: links, error: e2 } = await supabase
                .from("tournament_group_participants")
                .select("group_id, participant_id, position")
                .in("group_id", gids);
            if (e2) throw e2;
            const byGroup = new Map<string, { participant_id: string; position: number | null }[]>();
            for (const l of links || []) {
                if (!byGroup.has(l.group_id)) byGroup.set(l.group_id, []);
                byGroup.get(l.group_id)!.push({ participant_id: l.participant_id, position: l.position });
            }
            const pmap = new Map(participants.map((p) => [p.id, p]));
            const merged: GroupWithMembers[] = grps.map((g) => {
                const rows = (byGroup.get(g.id) || []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
                const members = rows.map((r) => pmap.get(r.participant_id)).filter((p): p is Participant => Boolean(p));
                return { ...g, members };
            });
            setGroups(merged);
        } catch (err) {
            console.error("loadGroups", err);
            setGroups([]);
        } finally {
            setLoading(false);
        }
    }, [supabase, tournament.id, participants]);

    useEffect(() => {
        loadGroups();
    }, [loadGroups]);

    const handleCreateFromClubs = async () => {
        if (!canEdit || participants.length < 2) return;
        const byClub = participantsByClubKey(participants);
        if (byClub.size === 0) {
            alert("No participants to group.");
            return;
        }
        if (groups.length > 0) {
            const ok = window.confirm(
                "This removes existing groups for this tournament and rebuilds them from each participant’s Club value (empty club → “No club”). Continue?"
            );
            if (!ok) return;
        }
        setCreating(true);
        try {
            const { error: delErr } = await supabase.from("tournament_groups").delete().eq("tournament_id", tournament.id);
            if (delErr) throw delErr;

            const entries = [...byClub.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { sensitivity: "base" }));
            const usedNames = new Set<string>();
            const payloads = entries.map(([clubKey], idx) => ({
                tournament_id: tournament.id,
                group_name: allocateUniqueGroupName(clubKey, usedNames),
                group_order: idx,
            }));

            const { data: inserted, error: insErr } = await supabase.from("tournament_groups").insert(payloads).select("id, group_name, group_order");
            if (insErr) throw insErr;
            if (!inserted || inserted.length !== entries.length) {
                throw new Error("Group insert count mismatch");
            }

            const orderedGroups = [...inserted].sort((a, b) => (a.group_order ?? 0) - (b.group_order ?? 0));
            const linkRows: { group_id: string; participant_id: string; position: number }[] = [];
            orderedGroups.forEach((g, i) => {
                const plist = entries[i][1];
                plist.forEach((p, j) => {
                    linkRows.push({ group_id: g.id, participant_id: p.id, position: j + 1 });
                });
            });

            if (linkRows.length > 0) {
                const { error: linkErr } = await supabase.from("tournament_group_participants").insert(linkRows);
                if (linkErr) throw linkErr;
            }

            const { error: upErr } = await supabase.from("tournaments").update({ groups_generated: true }).eq("id", tournament.id);
            if (upErr) {
                console.warn("Could not set groups_generated on tournament (RLS/auth):", upErr);
            }

            await loadGroups();
            onRefresh();
            alert(`Created ${orderedGroups.length} group(s) from the Club column.`);
        } catch (err) {
            console.error(err);
            const msg =
                err instanceof Error ? err.message : "Failed to create groups.";
            const rlsHint =
                typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "42501"
                    ? " Run db/fix_tournament_groups_rls_localstorage_auth.sql in Supabase (RLS + localStorage auth)."
                    : "";
            alert(`${msg}${rlsHint}`);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                <h2 className="text-xl font-semibold text-gray-900">Groups</h2>
                    <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                        Use <strong>Club</strong> on each participant (Participants tab or CSV) as the group name. One group per distinct club; blank club →{" "}
                        <strong>No club</strong>. Rebuild replaces all current groups.
                    </p>
                </div>
                {participants.length >= 2 && canEdit && (
                    <button
                        type="button"
                        onClick={handleCreateFromClubs}
                        disabled={creating}
                        className="shrink-0 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                    >
                        {creating ? "Working…" : groups.length ? "Rebuild groups from clubs" : "Create groups from clubs"}
                    </button>
                )}
            </div>
            {!canEdit && participants.length >= 2 && (
                <p className="text-xs text-gray-500">Only the tournament owner can create or rebuild groups.</p>
            )}
            {participants.length < 2 ? (
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                    <p className="text-gray-700">You need at least 2 participants to create groups.</p>
                </div>
            ) : loading ? (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 text-center text-gray-600 text-sm">Loading groups…</div>
            ) : groups.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                    <p className="text-gray-700">No groups yet. {canEdit ? "Click the button above to create them from the Club column." : ""}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {groups.map((g) => (
                        <div key={g.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between gap-2">
                                <span className="font-semibold text-gray-900">{g.group_name}</span>
                                <span className="text-xs text-gray-500">{g.members.length} player{g.members.length === 1 ? "" : "s"}</span>
                            </div>
                            <ul className="divide-y divide-gray-100">
                                {g.members.map((p) => (
                                    <li key={p.id} className="px-4 py-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                                        <span className="font-medium text-gray-900">
                                            {formatPlayerNameWithCategory(p.player_name, p.category)}
                                        </span>
                                        <span className="text-gray-500 text-xs">
                                            Club: {p.club?.trim() ? p.club : "—"}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

type BracketDbRow = {
    id: string;
    round_number: number;
    match_position: number;
    match_id: string | null;
    bracket_type: string;
};

// Brackets Tab — single-elimination main draw for individual tournaments
function BracketsTab({
    tournament,
    participants,
    canEdit = false,
    onRefresh,
}: {
    tournament: Tournament;
    participants: Participant[];
    canEdit?: boolean;
    onRefresh: () => void;
}) {
    const [bracketRows, setBracketRows] = useState<BracketDbRow[]>([]);
    const [matchById, setMatchById] = useState<Map<string, TournamentMatch>>(new Map());
    const [groupStageMatches, setGroupStageMatches] = useState<TournamentMatch[]>([]);
    const [bracketSize, setBracketSize] = useState(0);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const supabase = createClient();
    const format = tournament.format || "single_elimination";
    const isRRFormat = format === "round_robin" || format === "round_robin_knockout";

    const loadBracket = useCallback(async () => {
        setLoading(true);
        try {
            const { data: rrMs, error: rrErr } = await supabase
                .from("matches")
                .select("*, match_players(*)")
                .eq("tournament_id", tournament.id)
                .like("match_number", "RR-%")
                .order("match_date", { ascending: true });
            if (rrErr) {
                console.error(rrErr);
                setGroupStageMatches([]);
            } else {
                setGroupStageMatches((rrMs || []) as TournamentMatch[]);
            }

            const { data: rows, error: e1 } = await supabase
                .from("tournament_brackets")
                .select("id, round_number, match_position, match_id, bracket_type")
                .eq("tournament_id", tournament.id)
                .eq("bracket_type", "main")
                .order("round_number", { ascending: true })
                .order("match_position", { ascending: true });
            if (e1) throw e1;
            const list = (rows || []) as BracketDbRow[];
            setBracketRows(list);
            const ids = list.map((r) => r.match_id).filter((id): id is string => Boolean(id));
            if (ids.length === 0) {
                setMatchById(new Map());
            } else {
                const { data: ms, error: e2 } = await supabase.from("matches").select("*, match_players(*)").in("id", ids);
                if (e2) throw e2;
                const m = new Map<string, TournamentMatch>();
                (ms || []).forEach((row) => m.set(row.id, row as TournamentMatch));
                setMatchById(m);
            }
            const maxR = list.reduce((acc, r) => Math.max(acc, r.round_number), 1);
            const bDepth = 2 ** maxR;
            const r1Matches = list.filter((r) => r.round_number === 1 && r.match_id).length;
            const bFromPairs = nextPowerOfTwo(Math.max(2, r1Matches * 2));
            setBracketSize(Math.max(bDepth, bFromPairs));
        } catch (err) {
            console.error("loadBracket", err);
            setBracketRows([]);
            setMatchById(new Map());
        } finally {
            setLoading(false);
        }
    }, [supabase, tournament.id]);

    useEffect(() => {
        loadBracket();
    }, [loadBracket]);

    const handleGenerate = async () => {
        if (!canEdit || participants.length < 2) return;

        if (isRRFormat) {
            if (bracketRows.length > 0 || groupStageMatches.length > 0) {
                const ok = window.confirm(
                    "This removes all group round-robin matches (RR-…) and any knockout bracket rows (B-…). Continue?"
                );
                if (!ok) return;
            }
            setGenerating(true);
            try {
                const storedUser = localStorage.getItem("sf:user");
                const created_by = storedUser ? JSON.parse(storedUser).user_id : null;
                const nc = getCourtCount(tournament);

                const { data: grps, error: eg } = await supabase
                    .from("tournament_groups")
                    .select("id, group_name, group_order")
                    .eq("tournament_id", tournament.id)
                    .order("group_order", { ascending: true });
                if (eg) throw eg;
                if (!grps?.length) {
                    alert(
                        "No groups found. Open the Groups tab and use “Create groups from clubs” (or rebuild), then try again."
                    );
                    return;
                }

                const gids = grps.map((g) => g.id);
                const { data: links, error: el } = await supabase
                    .from("tournament_group_participants")
                    .select("group_id, participant_id, position")
                    .in("group_id", gids);
                if (el) throw el;

                const pmap = new Map(participants.map((p) => [p.id, p]));
                type GroupBundle = {
                    group: (typeof grps)[number];
                    members: Participant[];
                };
                const bundles: GroupBundle[] = grps.map((g) => {
                    const memberLinks = (links || [])
                        .filter((l) => l.group_id === g.id)
                        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
                    const members = memberLinks
                        .map((l) => pmap.get(l.participant_id))
                        .filter((p): p is Participant => Boolean(p));
                    return { group: g, members };
                });

                const playable = bundles.filter((b) => b.members.length >= 2);
                if (playable.length === 0) {
                    alert("Each group needs at least 2 participants linked to the tournament. Check the Groups tab.");
                    return;
                }

                const { error: delB } = await supabase.from("tournament_brackets").delete().eq("tournament_id", tournament.id);
                if (delB) throw delB;

                const { data: allTourMatches, error: selAll } = await supabase
                    .from("matches")
                    .select("id, match_number")
                    .eq("tournament_id", tournament.id);
                if (selAll) throw selAll;
                const wipeIds = (allTourMatches || [])
                    .filter(
                        (m) =>
                            typeof m.match_number === "string" &&
                            (m.match_number.startsWith("B-") || m.match_number.startsWith("RR-"))
                    )
                    .map((m) => m.id);
                if (wipeIds.length > 0) {
                    const { error: delM } = await supabase.from("matches").delete().in("id", wipeIds);
                    if (delM) throw delM;
                }

                let globalIdx = 0;
                let totalCreated = 0;
                const skipped: string[] = [];

                for (const { group: g, members } of bundles) {
                    if (members.length < 2) {
                        skipped.push(g.group_name);
                        continue;
                    }
                    const slug = roundRobinGroupSlug(g.group_name, g.group_order);
                    const pairs = allUnorderedPairs(members);
                    let mi = 0;
                    for (const [fullA, fullB] of pairs) {
                        mi += 1;
                        globalIdx += 1;
                        const match_number = `RR-${slug}-${String(mi).padStart(2, "0")}`;
                        const { data: insMatch, error: mErr } = await supabase
                            .from("matches")
                            .insert({
                                tournament_id: tournament.id,
                                sport: tournament.sport,
                                match_type: "tournament",
                                status: "upcoming",
                                created_by,
                                match_number,
                                match_date: null,
                                court_number: String(((globalIdx - 1) % nc) + 1),
                            })
                            .select("id")
                            .single();
                        if (mErr) throw mErr;
                        const mid = insMatch.id;
                        const { error: p1e } = await supabase.from("match_players").insert({
                            match_id: mid,
                            user_id: fullA.user_id ?? null,
                            player_name: fullA.player_name,
                            phone: fullA.phone ?? null,
                            team: "player_1",
                            is_captain: false,
                        });
                        if (p1e) throw p1e;
                        const { error: p2e } = await supabase.from("match_players").insert({
                            match_id: mid,
                            user_id: fullB.user_id ?? null,
                            player_name: fullB.player_name,
                            phone: fullB.phone ?? null,
                            team: "player_2",
                            is_captain: false,
                        });
                        if (p2e) throw p2e;
                        totalCreated += 1;
                    }
                }

                const { error: upBr } = await supabase
                    .from("tournaments")
                    .update({ brackets_generated: false })
                    .eq("id", tournament.id);
                if (upBr) console.warn("brackets_generated update:", upBr);

                await loadBracket();
                onRefresh();
                const skipMsg =
                    skipped.length > 0
                        ? `\n\nSkipped groups with fewer than 2 players: ${skipped.join(", ")}.`
                        : "";
                alert(
                    `Round robin created: ${totalCreated} match(es) in ${playable.length} group(s). Everyone plays everyone else within each group.${skipMsg}`
                );
            } catch (err) {
                console.error(err);
                const code =
                    typeof err === "object" && err !== null && "code" in err ? String((err as { code?: string }).code) : "";
                const hint =
                    code === "42501"
                        ? " Run db/fix_tournament_brackets_rls_localstorage_auth.sql and db/fix_tournament_matches_insert_rls.sql in Supabase."
                        : "";
                alert(err instanceof Error ? `${err.message}${hint}` : `Failed to generate round robin.${hint}`);
            } finally {
                setGenerating(false);
            }
            return;
        }

        if (bracketRows.length > 0) {
            const ok = window.confirm(
                "This removes existing bracket rows and all B- and RR- tournament matches for this draw. Continue?"
            );
            if (!ok) return;
        }
        setGenerating(true);
        try {
            const storedUser = localStorage.getItem("sf:user");
            const created_by = storedUser ? JSON.parse(storedUser).user_id : null;
            const nc = getCourtCount(tournament);

            const { error: delB } = await supabase.from("tournament_brackets").delete().eq("tournament_id", tournament.id);
            if (delB) throw delB;

            const { data: oldMatches, error: selErr } = await supabase
                .from("matches")
                .select("id, match_number")
                .eq("tournament_id", tournament.id);
            if (selErr) throw selErr;
            const delIds = (oldMatches || [])
                .filter(
                    (m) =>
                        typeof m.match_number === "string" &&
                        (m.match_number.startsWith("B-") || m.match_number.startsWith("RR-"))
                )
                .map((m) => m.id);
            if (delIds.length > 0) {
                const { error: delM } = await supabase.from("matches").delete().in("id", delIds);
                if (delM) throw delM;
            }

            const ordered = orderParticipantsForBracket(
                participants.map((p) => ({
                    id: p.id,
                    player_name: p.player_name,
                    seed_number: p.seed_number,
                }))
            );
            const { bracketSize: B, pairings } = buildRoundOnePairings(ordered);

            const bracketInserts: {
                tournament_id: string;
                bracket_type: string;
                round_number: number;
                match_position: number;
                match_id: string | null;
            }[] = [];

            let r1pos = 0;
            for (const p of pairings) {
                if (p.kind === "match") {
                    const fullA = participants.find((x) => x.id === p.a.id);
                    const fullB = participants.find((x) => x.id === p.b.id);
                    if (!fullA || !fullB) continue;
                    r1pos += 1;
                    const match_number = `B-R1-${String(r1pos).padStart(2, "0")}`;
                    const { data: insMatch, error: mErr } = await supabase
                        .from("matches")
                        .insert({
                            tournament_id: tournament.id,
                            sport: tournament.sport,
                            match_type: "tournament",
                            status: "upcoming",
                            created_by,
                            match_number,
                            match_date: null,
                            court_number: String(((r1pos - 1) % nc) + 1),
                        })
                        .select("id")
                        .single();
                    if (mErr) throw mErr;
                    const mid = insMatch.id;
                    const { error: p1e } = await supabase.from("match_players").insert({
                        match_id: mid,
                        user_id: fullA.user_id ?? null,
                        player_name: fullA.player_name,
                        phone: fullA.phone ?? null,
                        team: "player_1",
                        is_captain: false,
                    });
                    if (p1e) throw p1e;
                    const { error: p2e } = await supabase.from("match_players").insert({
                        match_id: mid,
                        user_id: fullB.user_id ?? null,
                        player_name: fullB.player_name,
                        phone: fullB.phone ?? null,
                        team: "player_2",
                        is_captain: false,
                    });
                    if (p2e) throw p2e;
                    bracketInserts.push({
                        tournament_id: tournament.id,
                        bracket_type: "main",
                        round_number: 1,
                        match_position: p.slotIndex,
                        match_id: mid,
                    });
                }
            }

            let totalRounds = 0;
            for (let x = B; x > 1; x >>= 1) totalRounds += 1;
            for (let r = 2; r <= totalRounds; r++) {
                const slots = B / 2 ** r;
                for (let pos = 1; pos <= slots; pos++) {
                    bracketInserts.push({
                        tournament_id: tournament.id,
                        bracket_type: "main",
                        round_number: r,
                        match_position: pos,
                        match_id: null,
                    });
                }
            }

            if (bracketInserts.length > 0) {
                const { error: biErr } = await supabase.from("tournament_brackets").insert(bracketInserts);
                if (biErr) throw biErr;
            }

            const { error: upErr } = await supabase.from("tournaments").update({ brackets_generated: true }).eq("id", tournament.id);
            if (upErr) console.warn("brackets_generated update:", upErr);

            await loadBracket();
            onRefresh();
            alert(
                `Single-elimination bracket created (draw size ${B}). Round 1: ${bracketInserts.filter((x) => x.round_number === 1).length} match(es). Later rounds are placeholders until you add matches.`
            );
        } catch (err) {
            console.error(err);
            const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code?: string }).code) : "";
            const hint =
                code === "42501"
                    ? " Run db/fix_tournament_brackets_rls_localstorage_auth.sql and db/fix_tournament_matches_insert_rls.sql in Supabase."
                    : "";
            alert(err instanceof Error ? `${err.message}${hint}` : `Failed to generate bracket.${hint}`);
        } finally {
            setGenerating(false);
        }
    };

    const roundsMap = useMemo(() => {
        const m = new Map<number, BracketDbRow[]>();
        for (const r of bracketRows) {
            if (!m.has(r.round_number)) m.set(r.round_number, []);
            m.get(r.round_number)!.push(r);
        }
        return m;
    }, [bracketRows]);

    const sortedRoundNums = useMemo(() => [...roundsMap.keys()].sort((a, b) => a - b), [roundsMap]);

    const hasGroupStage = groupStageMatches.length > 0;
    const hasKnockoutBracket = bracketRows.length > 0;

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Tournament brackets</h2>
                    {isRRFormat ? (
                        <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                            <strong>Round robin</strong> within each <strong>group</strong> from the Groups tab (everyone plays everyone else in the same group once). Match numbers look like{" "}
                            <code className="text-[11px] bg-gray-100 px-1 rounded">RR-A0-01</code>. Courts rotate from Settings. Use the{" "}
                            <Link href={`/scoring/tournaments/${tournament.id}?tab=schedule`} className="text-red-600 font-medium hover:text-red-800">
                                Schedule
                            </Link>{" "}
                            tab for filters, export, and times.{" "}
                            {format === "round_robin_knockout" && (
                                <span className="block mt-1">
                                    <strong>Knockout</strong> after the group stage is not generated automatically yet; set tournament format to single elimination if you only want a bracket.
                                </span>
                            )}
                        </p>
                    ) : (
                        <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                            <strong>Single elimination</strong> main draw. Players ordered by <strong>seed</strong> (lower = stronger; empty seed last), padded to a power of two with byes at the bottom of the list.
                            <strong> Round 1</strong> is shown below <strong>by court</strong> (same layout as the Schedule tab). Use the{" "}
                            <Link href={`/scoring/tournaments/${tournament.id}?tab=schedule`} className="text-red-600 font-medium hover:text-red-800">
                                Schedule
                            </Link>{" "}
                            tab for filters, export, and assigning match times. Later bracket rounds stay as a simple list until those matches exist.
                        </p>
                    )}
                    {tournament.groups_generated && !isRRFormat && (
                        <p className="text-xs text-amber-800 mt-2 max-w-2xl">
                            You have <strong>Groups</strong> set up. For <strong>round robin inside each group</strong> (everyone vs everyone in the same club/group), set tournament{" "}
                            <strong>Format</strong> to <strong>Round Robin</strong> on the <strong>Settings</strong> tab, then use <strong>Generate round robin</strong> here.
                        </p>
                    )}
                    {(tournament.format === "double_elimination" || tournament.format === "swiss") && (
                        <p className="text-xs text-amber-800 mt-1">Only the <strong>main</strong> bracket is generated here; losers bracket / Swiss logic is not automated yet.</p>
                    )}
                </div>
                {participants.length >= 2 && canEdit && (
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={generating}
                        className="shrink-0 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                    >
                        {generating
                            ? "Generating…"
                            : isRRFormat
                              ? hasGroupStage
                                  ? "Regenerate round robin"
                                  : "Generate round robin"
                              : hasKnockoutBracket
                                ? "Regenerate bracket"
                                : "Generate bracket"}
                    </button>
                )}
            </div>
            {!canEdit && participants.length >= 2 && (
                <p className="text-xs text-gray-500">Only the tournament owner can generate or regenerate the bracket.</p>
            )}
            {participants.length < 2 ? (
                <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
                    <p className="text-gray-700">You need at least 2 participants to generate brackets.</p>
                </div>
            ) : loading ? (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 text-center text-gray-600 text-sm">Loading bracket…</div>
            ) : !hasGroupStage && !hasKnockoutBracket ? (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                    <p className="text-gray-700">
                        {isRRFormat ? (
                            <>
                                No round robin matches yet.{" "}
                                {canEdit ? (
                                    <>
                                        Create groups on the <strong>Groups</strong> tab, then click <strong>Generate round robin</strong>.
                                    </>
                                ) : (
                                    ""
                                )}
                            </>
                        ) : (
                            <>
                                No bracket yet.{" "}
                                {canEdit ? "Click Generate bracket to build the draw from participants (and seeds)." : ""}
                            </>
                        )}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {isRRFormat && hasGroupStage && (
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                                <span className="font-semibold text-gray-900">Group stage — round robin</span>
                                <Link
                                    href={`/scoring/tournaments/${tournament.id}?tab=schedule`}
                                    className="text-sm font-medium text-red-600 hover:text-red-800 shrink-0"
                                >
                                    Open Schedule tab
                                </Link>
                            </div>
                            <div className="p-3 sm:p-4">
                                <IndividualCourtScheduleGrid
                                    matches={groupStageMatches}
                                    participants={participants}
                                    tournament={tournament}
                                    poolSize={groupStageMatches.length}
                                />
                            </div>
                        </div>
                    )}
                    {hasKnockoutBracket &&
                    sortedRoundNums.map((rn) => {
                        const rows = roundsMap.get(rn) || [];
                        const label = bracketRoundName(rn, bracketSize > 0 ? bracketSize : 2 ** sortedRoundNums.length);
                        if (rn === 1) {
                            const r1Matches = rows
                                .map((row) => (row.match_id ? matchById.get(row.match_id) : null))
                                .filter((tm): tm is TournamentMatch => Boolean(tm));
                            const r1Awaiting = rows.filter((row) => !row.match_id);
                            return (
                                <div key={rn} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <span className="font-semibold text-gray-900">Round {rn}</span>
                                            <span className="text-gray-500 text-sm ml-2">— {label}</span>
                                        </div>
                                        <Link
                                            href={`/scoring/tournaments/${tournament.id}?tab=schedule`}
                                            className="text-sm font-medium text-red-600 hover:text-red-800 shrink-0"
                                        >
                                            Open Schedule tab
                                        </Link>
                                    </div>
                                    <div className="p-3 sm:p-4">
                                        {r1Matches.length > 0 ? (
                                            <IndividualCourtScheduleGrid
                                                matches={r1Matches}
                                                participants={participants}
                                                tournament={tournament}
                                                poolSize={r1Matches.length}
                                            />
                                        ) : (
                                            <p className="text-sm text-gray-600">No round 1 matches in the draw yet.</p>
                                        )}
                                        {r1Awaiting.length > 0 && (
                                            <ul className="mt-4 divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                                                {r1Awaiting.map((row) => (
                                                    <li key={row.id} className="px-4 py-2.5 text-sm text-gray-600 bg-gray-50/50">
                                                        Bye or slot pending — no match row yet (position {row.match_position})
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div key={rn} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                                    <span className="font-semibold text-gray-900">Round {rn}</span>
                                    <span className="text-gray-500 text-sm ml-2">— {label}</span>
                                </div>
                                <ul className="divide-y divide-gray-100">
                                    {rows.map((row) => {
                                        const tm = row.match_id ? matchById.get(row.match_id) : null;
                                        const p1 = tm?.match_players?.find((x: MatchPlayer) => x.team === "player_1");
                                        const p2 = tm?.match_players?.find((x: MatchPlayer) => x.team === "player_2");
                                        return (
                                            <li key={row.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
                                                <div className="min-w-0">
                                                    {tm ? (
                                                        <>
                                                            <span className="font-medium text-gray-900">
                                                                {p1?.player_name ?? "TBD"} <span className="text-gray-400 font-normal">vs</span>{" "}
                                                                {p2?.player_name ?? "TBD"}
                                                            </span>
                                                            <div className="text-xs text-gray-500 mt-0.5 font-mono">{tm.match_number}</div>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-600">Winner(s) from previous round — match not created yet</span>
                                                    )}
                                                </div>
                                                {tm && (
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span
                                                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                                tm.status === "live"
                                                                    ? "bg-green-100 text-green-800"
                                                                    : tm.status === "completed"
                                                                      ? "bg-gray-800 text-gray-200"
                                                                      : "bg-blue-100 text-blue-800"
                                                            }`}
                                                        >
                                                            {tm.status}
                                                        </span>
                                                        <Link
                                                            href={`/scoring/tournaments/${tournament.id}?tab=results&resultMatch=${tm.id}`}
                                                            className="text-red-600 hover:text-red-800 text-xs font-medium"
                                                        >
                                                            Enter results
                                                        </Link>
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function isIndividualDrawMatch(m: TournamentMatch): boolean {
    return !m.team_a_id && !m.team_b_id && (m.match_type === "tournament" || m.match_type == null);
}

function individualMatchForExport(m: TournamentMatch) {
    const p1 = m.match_players?.find((x) => x.team === "player_1");
    const p2 = m.match_players?.find((x) => x.team === "player_2");
    return {
        match_number: m.match_number,
        match_date: m.match_date,
        court_number: m.court_number,
        status: m.status,
        notes: m.notes,
        team_a: { name: p1?.player_name || "TBD" },
        team_b: { name: p2?.player_name || "TBD" },
    };
}

/** Court-column schedule for individual tournaments (same layout as team Schedule tab). */
function IndividualScheduleTab({
    tournament,
    participants,
    onRefresh,
    canEdit = false,
}: {
    tournament: Tournament;
    participants: Participant[];
    onRefresh: () => void;
    canEdit?: boolean;
}) {
    const [matches, setMatches] = useState<TournamentMatch[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [assignSessionStart, setAssignSessionStart] = useState(() => {
        const d = new Date(2026, 3, 11, 18, 0, 0, 0);
        const p = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
    });
    const [assignOverwriteTimes, setAssignOverwriteTimes] = useState(false);
    const [assignSlotMinutes, setAssignSlotMinutes] = useState(DEFAULT_ASSIGN_SLOT_MINUTES);
    /** Optional: day 2 (and later days) session start; day 1 uses datetime-local above. */
    const [assignSessionDay2Time, setAssignSessionDay2Time] = useState("");
    const [scheduleFilterPlayer, setScheduleFilterPlayer] = useState("");
    const supabase = createClient();

    const drawMatches = useMemo(
        () => matches.filter((m) => isIndividualDrawMatch(m as TournamentMatch)),
        [matches],
    );

    const filteredMatches = useMemo(() => {
        const q = scheduleFilterPlayer.trim().toLowerCase();
        if (!q) return drawMatches;
        return drawMatches.filter((m) => {
            const tm = m as TournamentMatch;
            const names = (tm.match_players || []).map((x) => (x.player_name || "").toLowerCase());
            return names.some((n) => n.includes(q));
        });
    }, [drawMatches, scheduleFilterPlayer]);

    const scheduleExportFilterNote = useMemo(() => {
        if (!scheduleFilterPlayer.trim()) return undefined;
        return `Player contains: ${scheduleFilterPlayer.trim()}`;
    }, [scheduleFilterPlayer]);

    const resolveCourtExport = useCallback((raw: string) => formatStoredCourtForDisplay(tournament, raw), [tournament]);

    const refreshMatches = useCallback(() => {
        supabase
            .from("matches")
            .select("*, match_players(*)")
            .eq("tournament_id", tournament.id)
            .order("match_date", { ascending: true })
            .then(({ data }) => setMatches((data || []) as TournamentMatch[]));
    }, [tournament.id, supabase]);

    useEffect(() => {
        refreshMatches();
    }, [refreshMatches]);

    const handleScheduleDownloadXlsx = useCallback(() => {
        if (filteredMatches.length === 0) {
            alert("No matches to export.");
            return;
        }
        const rows = buildScheduleExportRows(filteredMatches.map((m) => individualMatchForExport(m as TournamentMatch)));
        downloadScheduleXlsx(tournament.name, rows, scheduleExportFilterNote, resolveCourtExport);
    }, [filteredMatches, tournament.name, scheduleExportFilterNote, resolveCourtExport]);

    const handleScheduleDownloadPdf = useCallback(async () => {
        if (filteredMatches.length === 0) {
            alert("No matches to export.");
            return;
        }
        const rows = buildScheduleExportRows(filteredMatches.map((m) => individualMatchForExport(m as TournamentMatch)));
        await downloadSchedulePdf(tournament.name, rows, scheduleExportFilterNote, resolveCourtExport);
    }, [filteredMatches, tournament.name, scheduleExportFilterNote, resolveCourtExport]);

    const handleScheduleDownloadPdfByCourt = useCallback(async () => {
        if (filteredMatches.length === 0) {
            alert("No matches to export.");
            return;
        }
        const rows = buildScheduleExportRows(filteredMatches.map((m) => individualMatchForExport(m as TournamentMatch)));
        await downloadSchedulePdf(tournament.name, rows, scheduleExportFilterNote, resolveCourtExport, {
            layout: "by_court",
        });
    }, [filteredMatches, tournament.name, scheduleExportFilterNote, resolveCourtExport]);

    const handleAssignTimesToExistingMatches = async () => {
        if (!assignSessionStart.trim()) {
            alert("Choose session start (e.g. Apr 11, 6:00 PM).");
            return;
        }
        const anchor = new Date(assignSessionStart);
        if (Number.isNaN(anchor.getTime())) {
            alert("Invalid date/time.");
            return;
        }
        const day2Clock = assignSessionDay2Time.trim() ? parseTimeInputToDailyClock(assignSessionDay2Time) : null;
        if (assignSessionDay2Time.trim() && !day2Clock) {
            alert("Invalid day 2 session start (use the time picker).");
            return;
        }
        const day1Clock = { hour: anchor.getHours(), minute: anchor.getMinutes() };
        const dailyStarts = day2Clock ? [day1Clock, day2Clock] : undefined;
        const defaultCourtKey = "1";
        const list = drawMatches.filter((m) => {
            if (assignOverwriteTimes) return true;
            return !(m as TournamentMatch).match_date;
        });
        if (list.length === 0) {
            alert(
                assignOverwriteTimes
                    ? "No matches to update."
                    : "Every match already has a time, or there are no matches. Turn on “Overwrite existing times” to re-assign.",
            );
            return;
        }
        const slotM = clampAssignSlotMinutes(assignSlotMinutes);
        const enriched = list.map((m) => {
            const tm = m as TournamentMatch;
            return {
                id: tm.id,
                court_number: tm.court_number,
                match_number: tm.match_number,
                playerParticipantIds: participantIdsFromBracketMatch(tm, participants),
            };
        });
        let updates: { id: string; match_date: string }[];
        try {
            if (shouldUsePlayerAwareAssignment(enriched)) {
                updates = assignMatchTimesWithPlayerConstraints(enriched, {
                    anchorDate: anchor,
                    ...(dailyStarts ? { dailyStarts } : { dailyStart: day1Clock }),
                    dailyEnd: { hour: 25, minute: 0 },
                    slotMinutes: slotM,
                    defaultCourtKey,
                    maxConsecutivePlayingSlots: 2,
                    maxMatchesPerPlayerPerDay: 9,
                });
            } else {
                updates = assignMatchTimesByCourt(
                    enriched.map(({ id, court_number, match_number }) => ({ id, court_number, match_number })),
                    {
                        anchorDate: anchor,
                        ...(dailyStarts ? { dailyStarts } : { dailyStart: day1Clock }),
                        dailyEnd: { hour: 25, minute: 0 },
                        slotMinutes: slotM,
                        defaultCourtKey,
                    },
                );
            }
        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : "Could not build time slots.");
            return;
        }
        const smartNote = shouldUsePlayerAwareAssignment(enriched)
            ? `\n\nPlayer-aware: same rules as team schedule (no double-booking; max 2 consecutive ${slotM}-minute matches per player; max 9 matches per player per day).`
            : "\n\nPer-court timing only (link players to tournament participants for smarter slots).";
        const day1Line = `Day 1: ${anchor.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} → 1:00 AM next day (local).`;
        const day2Line = day2Clock
            ? `Day 2+: ${new Date(2000, 0, 1, day2Clock.hour, day2Clock.minute).toLocaleTimeString(undefined, { timeStyle: "short" })} → 1:00 AM next day (local); further days use the same start as day 2.`
            : "Each day uses the same session start as day 1 until 1:00 AM next day.";
        if (
            !confirm(
                `Assign ${updates.length} match time(s)?\n\n${day1Line}\n${day2Line}${smartNote}`,
            )
        ) {
            return;
        }
        setIsGenerating(true);
        try {
            for (const u of updates) {
                const { error } = await supabase.from("matches").update({ match_date: u.match_date }).eq("id", u.id);
                if (error) throw error;
            }
            onRefresh();
            refreshMatches();
            alert(`Updated ${updates.length} match time(s).`);
        } catch (e) {
            console.error(e);
            alert("Failed to update match times.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-4 min-w-0 w-full overflow-hidden">
            {!canEdit && (
                <div className="flex justify-end min-w-0">
                    <p className="text-sm text-gray-600">View only</p>
            </div>
            )}
            {canEdit && drawMatches.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                        <div className="min-w-0">
                            <label htmlFor="indiv-assign-session-start" className="block text-xs font-medium text-gray-600 mb-1">
                                Session start (day 1)
                            </label>
                            <input
                                id="indiv-assign-session-start"
                                type="datetime-local"
                                value={assignSessionStart}
                                onChange={(e) => setAssignSessionStart(e.target.value)}
                                className="w-full max-w-xs px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                            />
                        </div>
                        <div className="min-w-0">
                            <label htmlFor="indiv-assign-session-day2" className="block text-xs font-medium text-gray-600 mb-1">
                                Day 2+ start (optional)
                            </label>
                            <input
                                id="indiv-assign-session-day2"
                                type="time"
                                value={assignSessionDay2Time}
                                onChange={(e) => setAssignSessionDay2Time(e.target.value)}
                                className="w-full max-w-[11rem] px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                            />
                            <p className="text-[11px] text-gray-500 mt-1 max-w-xs">
                                Leave empty to use the same start time every day. If set, day 2 and later use this time (until 1:00 AM next day).
                            </p>
                        </div>
                        <div className="min-w-0">
                            <label htmlFor="indiv-assign-slot-minutes" className="block text-xs font-medium text-gray-600 mb-1">
                                Minutes per match
                            </label>
                            <input
                                id="indiv-assign-slot-minutes"
                                type="number"
                                min={ASSIGN_SLOT_MINUTES_MIN}
                                max={ASSIGN_SLOT_MINUTES_MAX}
                                value={assignSlotMinutes}
                                onChange={(e) => {
                                    const v = parseInt(e.target.value, 10);
                                    setAssignSlotMinutes(clampAssignSlotMinutes(Number.isFinite(v) ? v : DEFAULT_ASSIGN_SLOT_MINUTES));
                                }}
                                className="w-full max-w-[7rem] px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                            />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={assignOverwriteTimes}
                                onChange={(e) => setAssignOverwriteTimes(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            Overwrite existing times
                        </label>
                        <button
                            type="button"
                            onClick={() => void handleAssignTimesToExistingMatches()}
                            disabled={isGenerating}
                            className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                        >
                            {isGenerating ? "Updating…" : "Assign times to matches"}
                        </button>
                    </div>
                </div>
            )}
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 sm:p-4 space-y-3">
                <div>
                    <label htmlFor="indiv-sched-filter-player" className="block text-xs font-medium text-gray-600 mb-1">
                        Player name contains
                    </label>
                    <input
                        id="indiv-sched-filter-player"
                        type="search"
                        value={scheduleFilterPlayer}
                        onChange={(e) => setScheduleFilterPlayer(e.target.value)}
                        placeholder="e.g. Adityaraj"
                        className="w-full max-w-md px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                    />
                </div>
                {drawMatches.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 pt-3 border-t border-gray-200">
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={handleScheduleDownloadXlsx}
                                disabled={filteredMatches.length === 0}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-green-700 text-white hover:bg-green-800 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                Download .xlsx
                            </button>
                            <button
                                type="button"
                                onClick={handleScheduleDownloadPdf}
                                disabled={filteredMatches.length === 0}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                Download .pdf
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleScheduleDownloadPdfByCourt()}
                                disabled={filteredMatches.length === 0}
                                title="One full-width column per court, new page per court"
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-600 text-slate-800 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                PDF by court
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <IndividualCourtScheduleGrid
                matches={filteredMatches.map((m) => m as TournamentMatch)}
                participants={participants}
                tournament={tournament}
                poolSize={drawMatches.length}
                hideCourtsNote
            />
            {drawMatches.length === 0 && (
                <p className="text-gray-600 text-sm">No singles/bracket matches yet. Generate brackets to create matches.</p>
            )}
            {drawMatches.length > 0 && filteredMatches.length === 0 && scheduleFilterPlayer.trim() && (
                <p className="text-amber-800 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    No matches match your filter. Try another name or clear the search.
                </p>
            )}
        </div>
    );
}

// --- Team tournament tabs ---

/** Strip trailing (category); map legacy `Club X` → `Team X` for display. */
function displayTeamCardTitle(teamName: string): string {
    let s = teamName.replace(/\s+\([^)]+\)\s*$/, "").trim();
    if (/^Club\s+/i.test(s)) {
        s = s.replace(/^Club\s+/i, "Team ");
    }
    return s || teamName;
}

/** CSV `club` cell is often `A` or `Team A` — avoid `Team Team A`. */
function teamTitleFromClubSlug(slug: string): string {
    const t = slug.trim();
    if (!t) return "Team";
    if (/^team\s+/i.test(t)) return t;
    return `Team ${t}`;
}

function teamShortFromClubSlug(slug: string): string {
    const core = slug.trim().replace(/^team\s+/i, "").replace(/\s+/g, "").slice(0, 18);
    return (`T${core || "?"}`).slice(0, 20);
}

/** Teams tab: accent colors by roster display name (case-insensitive). */
type TeamTabCardTheme = { shell: string; headerBar: string; title: string; contentBg: string };

function getTeamTabCardTheme(teamName: string): TeamTabCardTheme | null {
    const key = displayTeamCardTitle(teamName).trim().toLowerCase();
    const themes: Record<string, TeamTabCardTheme> = {
        "power drive": {
            shell: "border-blue-400 shadow-sm",
            headerBar: "bg-blue-600",
            title: "text-white",
            contentBg: "bg-sky-50/70",
        },
        "net force": {
            shell: "border-gray-900 shadow-sm",
            headerBar: "bg-gray-950",
            title: "text-white",
            contentBg: "bg-gray-100",
        },
        "smash unit": {
            shell: "border-red-500 shadow-sm",
            headerBar: "bg-red-600",
            title: "text-white",
            contentBg: "bg-red-50/70",
        },
        "shot makers": {
            shell: "border-gray-300 bg-white shadow-sm",
            headerBar: "bg-white border-b border-gray-200",
            title: "text-gray-900",
            contentBg: "bg-gray-50",
        },
        "rally crew": {
            shell: "border-gray-500 shadow-sm",
            headerBar: "bg-gray-500",
            title: "text-white",
            contentBg: "bg-gray-100",
        },
        "ace strike": {
            shell: "border-orange-400 shadow-sm",
            headerBar: "bg-orange-500",
            title: "text-white",
            contentBg: "bg-orange-50/80",
        },
        "ace squad": {
            shell: "border-red-500 shadow-sm",
            headerBar: "bg-red-600",
            title: "text-white",
            contentBg: "bg-red-50/70",
        },
        "net rush": {
            shell: "border-gray-900 shadow-sm",
            headerBar: "bg-gray-950",
            title: "text-white",
            contentBg: "bg-gray-100",
        },
        "smash crew": {
            shell: "border-blue-400 shadow-sm",
            headerBar: "bg-blue-600",
            title: "text-white",
            contentBg: "bg-sky-50/70",
        },
        "shuttle sparks": {
            shell: "border-orange-400 shadow-sm",
            headerBar: "bg-orange-500",
            title: "text-white",
            contentBg: "bg-orange-50/80",
        },
        "smash ninja": {
            shell: "border-red-500 shadow-sm",
            headerBar: "bg-red-600",
            title: "text-white",
            contentBg: "bg-red-50/70",
        },
        "tiny titans": {
            shell: "border-blue-400 shadow-sm",
            headerBar: "bg-blue-600",
            title: "text-white",
            contentBg: "bg-sky-50/70",
        },
    };
    return themes[key] ?? null;
}

function TeamsTab({
    tournament,
    participants,
    onRefresh,
    canEdit = false,
}: {
    tournament: Tournament;
    participants: Participant[];
    onRefresh: () => void;
    canEdit?: boolean;
}) {
    const [teams, setTeams] = useState<TournamentTeam[]>([]);
    const [membersByTeam, setMembersByTeam] = useState<Record<string, TournamentTeamMember[]>>({});
    const [newTeamName, setNewTeamName] = useState("");
    const [addingToTeamId, setAddingToTeamId] = useState<string | null>(null);
    const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);
    const [position, setPosition] = useState(1);
    const [isCreatingFromClubs, setIsCreatingFromClubs] = useState(false);
    const [renamingTeamId, setRenamingTeamId] = useState<string | null>(null);
    const [renameTeamDraft, setRenameTeamDraft] = useState("");
    const supabase = createClient();

    const loadTeams = useCallback(async () => {
        const { data: teamsData, error: teamsError } = await supabase
            .from("tournament_teams")
            .select("*")
            .eq("tournament_id", tournament.id)
            .order("name");
        if (teamsError) {
            console.error(teamsError);
            return;
        }
        setTeams(teamsData || []);
        const teamIds = (teamsData || []).map((t) => t.id);
        if (teamIds.length === 0) {
            setMembersByTeam({});
            return;
        }
        const { data: membersData, error: membersError } = await supabase
            .from("tournament_team_members")
            .select("*, participant:tournament_participants(*)")
            .in("team_id", teamIds);
        if (membersError) {
            console.error(membersError);
            return;
        }
        const byTeam: Record<string, TournamentTeamMember[]> = {};
        teamIds.forEach((id) => (byTeam[id] = []));
        (membersData || []).forEach((m: TournamentTeamMember & { participant?: Participant }) => {
            if (!byTeam[m.team_id]) byTeam[m.team_id] = [];
            byTeam[m.team_id].push(m);
        });
        setMembersByTeam(byTeam);
    }, [tournament.id, supabase]);

    useEffect(() => {
        loadTeams();
    }, [loadTeams]);

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) {
            alert("Enter team name");
            return;
        }
        try {
            const { error } = await supabase.from("tournament_teams").insert({
                tournament_id: tournament.id,
                name: newTeamName.trim(),
                short_name: null,
            });
                if (error) throw error;
            setNewTeamName("");
            loadTeams();
            onRefresh();
        } catch (e) {
            console.error(e);
            alert("Failed to create team");
        }
    };

    const handleAddMember = async () => {
        if (!addingToTeamId || !selectedParticipantId) return;
        try {
            const { error } = await supabase.from("tournament_team_members").insert({
                team_id: addingToTeamId,
                participant_id: selectedParticipantId,
                position,
            });
            if (error) throw error;
            setAddingToTeamId(null);
            setSelectedParticipantId(null);
            loadTeams();
            onRefresh();
        } catch (e) {
            console.error(e);
            alert("Failed to add member");
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        try {
            const { error } = await supabase.from("tournament_team_members").delete().eq("id", memberId);
            if (error) throw error;
            loadTeams();
            onRefresh();
        } catch (e) {
            console.error(e);
            alert("Failed to remove member");
        }
    };

    const handleSaveRenameTeam = async () => {
        if (!renamingTeamId) return;
        const trimmed = renameTeamDraft.trim();
        if (!trimmed) {
            alert("Team name cannot be empty.");
            return;
        }
        try {
            const { error } = await supabase.from("tournament_teams").update({ name: trimmed }).eq("id", renamingTeamId);
            if (error) {
                if ((error as { code?: string }).code === "23505") {
                    alert("Another team in this tournament already uses that name.");
                    return;
                }
                throw error;
            }
            setRenamingTeamId(null);
            setRenameTeamDraft("");
            await loadTeams();
            onRefresh();
        } catch (e) {
            console.error(e);
            alert("Failed to rename team");
        }
    };

    const assignedParticipantIds = Object.values(membersByTeam).flat().map((m) => m.participant_id);
    const availableParticipants = participants.filter((p) => !assignedParticipantIds.includes(p.id));

    /** Same `club` text → one team. If `club` is empty, same numeric `seed_number` → one team (use seed as team id). */
    const participantTeamGroupKey = (p: Participant): string | null => {
        if (p.club != null && String(p.club).trim() !== "") {
            return `club:${String(p.club).trim()}`;
        }
        if (p.seed_number != null && p.seed_number !== undefined) {
            const n = Number(p.seed_number);
            if (!Number.isNaN(n)) return `seed:${n}`;
        }
        return null;
    };

    const handleCreateTeamsFromClubs = async () => {
        const grouped = participants.filter((p) => participantTeamGroupKey(p) != null);
        if (grouped.length === 0) {
            alert(
                "No grouping found. Set either a club (same text for everyone on a squad) or a seed number (same number for everyone on a squad) on each participant — e.g. CSV columns club or seed."
            );
            return;
        }
        const byKey: Record<string, Participant[]> = {};
        grouped.forEach((p) => {
            const key = participantTeamGroupKey(p)!;
            if (!byKey[key]) byKey[key] = [];
            byKey[key].push(p);
        });
        const unassigned = participants.filter((p) => !assignedParticipantIds.includes(p.id));
        const unassignedIds = new Set(unassigned.map((p) => p.id));
        const toCreate: { groupKey: string; participants: Participant[] }[] = [];
        Object.entries(byKey).forEach(([groupKey, list]) => {
            const inList = list.filter((p) => unassignedIds.has(p.id));
            if (inList.length >= 1) toCreate.push({ groupKey, participants: inList });
        });
        if (toCreate.length === 0) {
            alert("Everyone who has club/seed set is already assigned to a team.");
            return;
        }
        setIsCreatingFromClubs(true);
        try {
            let created = 0;
            for (const { groupKey, participants: list } of toCreate) {
                const cat = list[0]?.category?.trim() || null;
                let name: string;
                let short_name: string;
                if (groupKey.startsWith("club:")) {
                    const club = groupKey.slice("club:".length);
                    name = teamTitleFromClubSlug(club);
                    short_name = teamShortFromClubSlug(club);
                } else {
                    const seed = groupKey.slice("seed:".length);
                    name = `Team ${seed}`;
                    short_name = `T${seed}`.slice(0, 20);
                }
                const { data: team, error: teamErr } = await supabase
                    .from("tournament_teams")
                    .insert({ tournament_id: tournament.id, name, short_name, category: cat })
                    .select("id")
                    .single();
                if (teamErr) {
                    if (teamErr.code === "23505") continue;
                    throw teamErr;
                }
                for (let i = 0; i < list.length; i++) {
                    const p = list[i];
                    await supabase.from("tournament_team_members").insert({
                        team_id: team.id,
                        participant_id: p.id,
                        position: i + 1,
                    });
                }
                created++;
            }
            await loadTeams();
            onRefresh();
            alert(
                `Created ${created} team(s). All players in each group were added (positions 1…n). If you used seed as team id, everyone on Team A shares the same seed number. Set each person’s category for balanced doubles.`
            );
        } catch (e) {
            console.error(e);
            alert("Failed to create teams from club/seed.");
        } finally {
            setIsCreatingFromClubs(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-gray-900">Teams</h2>
                {!canEdit && <p className="text-sm text-gray-600">View only</p>}
            </div>
            {canEdit && (
            <>
            <div className="flex flex-wrap items-center gap-2 mb-2">
                <button
                    type="button"
                    onClick={handleCreateTeamsFromClubs}
                    disabled={isCreatingFromClubs || participants.length === 0}
                    className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                >
                    {isCreatingFromClubs ? "Creating…" : "Create teams from club or seed"}
                </button>
                <span className="text-xs text-gray-600">
                    Use CSV <strong>club</strong> (e.g. <code className="text-[10px]">Team A</code> for all 6 players) <em>or</em>, if club is empty, the same numeric <strong>seed</strong> for everyone on that squad (e.g. all Team A → seed <code className="text-[10px]">1</code>).
                    If both are set, <strong>club</strong> wins. Run{" "}
                    <code className="text-[10px]">tournament_team_member_position_expand.sql</code> if many members fail to save.
                </span>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-wrap items-end gap-3 shadow-sm">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Team name</label>
                    <input
                        type="text"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="e.g. Eagles"
                        className="w-40 sm:w-48 px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                    />
                </div>
                <button
                    type="button"
                    onClick={handleCreateTeam}
                    className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
                >
                    Add Team
                </button>
            </div>
            </>
            )}
            <div className="grid gap-4 md:grid-cols-2">
                {teams.map((team, idx) => {
                    const tabTheme = getTeamTabCardTheme(team.name);
                    const memberBlock = (
                        <>
                        <ul className="space-y-2 mb-3">
                            {[...(membersByTeam[team.id] || [])]
                                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                                .map((m) => {
                                    const part = (m as TournamentTeamMember & { participant?: Participant }).participant;
                                    return (
                                            <li
                                                key={m.id}
                                                className="flex items-center justify-between text-sm text-gray-700 rounded-md border border-gray-200 bg-white px-2.5 py-1.5"
                                            >
                                    <span className="text-gray-900">
                                        P{m.position}: {formatPlayerNameWithCategory(part?.player_name ?? "—", part?.category)}
                                    </span>
                                    {canEdit && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveMember(m.id)}
                                        className="text-red-600 hover:underline text-xs sm:text-sm"
                                    >
                                        Remove
                                    </button>
                                    )}
                                </li>
                            );
                                })}
                        </ul>
                            {canEdit &&
                                (addingToTeamId === team.id ? (
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200">
                                <select
                                    value={selectedParticipantId || ""}
                                    onChange={(e) => setSelectedParticipantId(e.target.value || null)}
                                    className="px-2 py-1 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                                >
                                    <option value="">Select participant</option>
                                    {availableParticipants.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {formatPlayerNameWithCategory(p.player_name, p.category)}
                                                </option>
                                    ))}
                                </select>
                                <select
                                    value={position}
                                    onChange={(e) => setPosition(parseInt(e.target.value, 10) || 1)}
                                    className="px-2 py-1 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                                >
                                    {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                                        <option key={n} value={n}>
                                            P{n}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    onClick={handleAddMember}
                                    className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm"
                                >
                                    Add
                                </button>
                                <button
                                    type="button"
                                            onClick={() => {
                                                setAddingToTeamId(null);
                                                setSelectedParticipantId(null);
                                            }}
                                    className="text-gray-700 hover:text-gray-900 text-sm font-medium"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setAddingToTeamId(team.id)}
                                disabled={availableParticipants.length === 0}
                                className="text-sm text-red-600 hover:underline disabled:opacity-50"
                            >
                                + Add member
                            </button>
                        ))}
                        </>
                    );

                    if (tabTheme) {
                        return (
                            <div key={team.id} className={`rounded-xl border-2 overflow-hidden ${tabTheme.shell}`}>
                                <div className={`px-4 py-3 ${tabTheme.headerBar} flex flex-wrap items-center gap-2`}>
                                    {canEdit && renamingTeamId === team.id ? (
                                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 w-full">
                                            <input
                                                value={renameTeamDraft}
                                                onChange={(e) => setRenameTeamDraft(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") void handleSaveRenameTeam();
                                                }}
                                                className="flex-1 min-w-[6rem] max-w-full px-2 py-1.5 rounded-md border border-white/40 bg-white text-gray-900 text-sm"
                                                autoFocus
                                                aria-label="Team name"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => void handleSaveRenameTeam()}
                                                className="shrink-0 rounded-md bg-white/20 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/30"
                                            >
                                                Save
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setRenamingTeamId(null);
                                                    setRenameTeamDraft("");
                                                }}
                                                className="shrink-0 text-xs font-medium text-white/90 hover:underline"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0 w-full">
                                            <h3 className={`font-semibold text-base min-w-0 truncate ${tabTheme.title}`}>
                                                {displayTeamCardTitle(team.name)}
                                            </h3>
                                            {canEdit ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setRenamingTeamId(team.id);
                                                        setRenameTeamDraft(team.name);
                                                    }}
                                                    className="shrink-0 text-xs font-medium text-white/90 hover:underline"
                                                >
                                                    Edit name
                                                </button>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                                <div className={`p-4 ${tabTheme.contentBg}`}>{memberBlock}</div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={team.id}
                            className="rounded-xl border border-gray-200 p-4"
                            style={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FFF5F5" }}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 min-w-0">
                                {canEdit && renamingTeamId === team.id ? (
                                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 w-full">
                                        <input
                                            value={renameTeamDraft}
                                            onChange={(e) => setRenameTeamDraft(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") void handleSaveRenameTeam();
                                            }}
                                            className="flex-1 min-w-[6rem] max-w-full px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                                            autoFocus
                                            aria-label="Team name"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => void handleSaveRenameTeam()}
                                            className="shrink-0 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700"
                                        >
                                            Save
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setRenamingTeamId(null);
                                                setRenameTeamDraft("");
                                            }}
                                            className="shrink-0 text-xs font-medium text-gray-600 hover:text-gray-900"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="font-semibold text-gray-900 text-base min-w-0 truncate">
                                            {displayTeamCardTitle(team.name)}
                                        </h3>
                                        {canEdit ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setRenamingTeamId(team.id);
                                                    setRenameTeamDraft(team.name);
                                                }}
                                                className="shrink-0 text-xs font-medium text-red-600 hover:underline"
                                            >
                                                Edit name
                                            </button>
                                        ) : null}
                                    </>
                                )}
                            </div>
                            {memberBlock}
                        </div>
                    );
                })}
            </div>
            {teams.length === 0 && (
                <p className="text-gray-600 text-sm">Create teams and assign participants from the list. Participants must be added in the Participants tab first.</p>
            )}
        </div>
    );
}

function useTeamMemberNames(teamIds: string[]) {
    const [memberNamesByTeam, setMemberNamesByTeam] = useState<Record<string, string[]>>({});
    const supabase = createClient();
    useEffect(() => {
        if (teamIds.length === 0) {
            setMemberNamesByTeam({});
            return;
        }
        supabase
            .from("tournament_team_members")
            .select("team_id, position, participant:tournament_participants(player_name)")
            .in("team_id", teamIds)
            .then(({ data }) => {
                const byTeam: Record<string, { position: number; name: string }[]> = {};
                teamIds.forEach((id) => (byTeam[id] = []));
                (data || []).forEach((row: { team_id: string; position: number; participant?: { player_name?: string } | { player_name?: string }[] }) => {
                    const p = Array.isArray(row.participant) ? row.participant[0] : row.participant;
                    const name = p?.player_name ?? "—";
                    if (!byTeam[row.team_id]) byTeam[row.team_id] = [];
                    byTeam[row.team_id].push({ position: row.position, name });
                });
                const result: Record<string, string[]> = {};
                Object.entries(byTeam).forEach(([id, list]) => {
                    list.sort((a, b) => a.position - b.position);
                    result[id] = list.map((x) => x.name);
                });
                setMemberNamesByTeam(result);
            });
    }, [teamIds.join(","), supabase]);
    return memberNamesByTeam;
}

function formatTeamWithPlayers(teamName: string, playerNames: string[]) {
    if (!playerNames.length) return teamName;
    return `${teamName} (${playerNames.join(", ")})`;
}

function stripTrailingBracketLabel(teamName: string): string {
    return teamName.replace(/\s*\([^()]*\)\s*$/, "").trim();
}

function formatPlayerNameWithCategory(name: string, category?: string | null): string {
    const nm = (name || "").trim() || "—";
    const cat = (category || "").trim();
    return cat ? `${nm} (${cat})` : nm;
}

function normalizeSetScoreToWinner(setScore: string, winnerOnSecondSide: boolean): string {
    const parts = setScore.split("-").map((n) => parseInt(n.trim(), 10));
    if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return setScore.trim();
    const high = Math.max(parts[0], parts[1]);
    const low = Math.min(parts[0], parts[1]);
    return winnerOnSecondSide ? `${low}-${high}` : `${high}-${low}`;
}

function DoublesLineupBlocks({
    payload,
    winnerTeamId = null,
}: {
    payload: DoublesLinePayload;
    /** When set, highlights the winning side (trophy, ring, badge). */
    winnerTeamId?: string | null;
}) {
    const winA = Boolean(winnerTeamId && winnerTeamId === payload.teamAId);
    const winB = Boolean(winnerTeamId && winnerTeamId === payload.teamBId);

    const winnerExtras = (isWinner: boolean) =>
        isWinner ? (
            <>
                <span className="text-sm leading-none" title="Winner" aria-label="Winner">
                    🏆
                </span>
                <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Winner
                </span>
            </>
        ) : null;

    return (
        <div className="space-y-2 pt-1">
            <div
                className={
                    winA
                        ? "rounded-lg border-2 border-emerald-500 bg-blue-50/90 px-2.5 py-2 shadow-md ring-2 ring-emerald-300/40"
                        : "rounded-lg border border-blue-100 bg-blue-50/80 px-2.5 py-2"
                }
            >
                {winA ? <div className="flex justify-end mb-1">{winnerExtras(true)}</div> : null}
                <ul className="text-sm text-gray-900 space-y-1">
                    {payload.sideA.slice(0, 2).map((p) => (
                        <li key={p.id} className="leading-snug">
                            <span className="font-semibold">{formatPlayerNameWithCategory(p.name, p.category)}</span>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="flex justify-center py-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">vs</span>
            </div>
            <div
                className={
                    winB
                        ? "rounded-lg border-2 border-emerald-500 bg-amber-50/90 px-2.5 py-2 shadow-md ring-2 ring-emerald-300/40"
                        : "rounded-lg border border-amber-100 bg-amber-50/80 px-2.5 py-2"
                }
            >
                {winB ? <div className="flex justify-end mb-1">{winnerExtras(true)}</div> : null}
                <ul className="text-sm text-gray-900 space-y-1">
                    {payload.sideB.slice(0, 2).map((p) => (
                        <li key={p.id} className="leading-snug">
                            <span className="font-semibold">{formatPlayerNameWithCategory(p.name, p.category)}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

/** Singles-only: blue/amber shells match team schedule; player line matches doubles. */
function BracketSinglesLineupBlocks({
    nameA,
    nameB,
}: {
    nameA: string;
    nameB: string;
}) {
    return (
        <div className="space-y-2 pt-1">
            <div className="rounded-lg border border-blue-100 bg-blue-50/80 px-2.5 py-2">
                <ul className="text-sm text-gray-900 space-y-1">
                    <li className="leading-snug">
                        <span className="font-semibold text-gray-900">{nameA || "TBD"}</span>
                    </li>
                </ul>
            </div>
            <div className="flex justify-center py-0.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">vs</span>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50/80 px-2.5 py-2">
                <ul className="text-sm text-gray-900 space-y-1">
                    <li className="leading-snug">
                        <span className="font-semibold text-gray-900">{nameB || "TBD"}</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}

function participantIdsFromBracketMatch(m: TournamentMatch, participants: Participant[]): string[] {
    const ps = m.match_players || [];
    const ids: string[] = [];
    for (const mp of ps) {
        const uid = mp.user_id;
        let p = uid ? participants.find((x) => x.user_id === uid) : undefined;
        if (!p) {
            const nm = (mp.player_name || "").trim();
            p = participants.find((x) => (x.player_name || "").trim() === nm);
        }
        if (p) ids.push(p.id);
    }
    return [...new Set(ids)];
}

function participantIdForMatchPlayer(mp: MatchPlayer | undefined, participants: Participant[]): string | null {
    if (!mp) return null;
    if (mp.user_id) {
        const p = participants.find((x) => x.user_id === mp.user_id);
        if (p) return p.id;
    }
    const nm = (mp.player_name || "").trim();
    const p = participants.find((x) => (x.player_name || "").trim() === nm);
    return p?.id ?? null;
}

function IndividualScheduleMatchCard({
    match,
    participants,
    tournamentId,
    tournament,
}: {
    match: TournamentMatch;
    participants: Participant[];
    tournamentId: string;
    tournament: Tournament;
}) {
    const m = match;
    const p1 = m.match_players?.find((x) => x.team === "player_1");
    const p2 = m.match_players?.find((x) => x.team === "player_2");
    const n1 = p1?.player_name ?? "TBD";
    const n2 = p2?.player_name ?? "TBD";
    const umpireName = getUmpireFromNotes(m.notes);
    return (
        <div className="p-3 flex gap-2 items-start bg-white min-w-0">
            <div className="min-w-0 flex-1 overflow-hidden space-y-2">
                <BracketSinglesLineupBlocks nameA={n1} nameB={n2} />
                <div className="pt-2 border-t border-gray-100 space-y-1">
                    <div className="text-sm font-semibold text-gray-800">
                        {m.match_date
                            ? new Date(m.match_date).toLocaleString(undefined, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                              })
                            : "No time set"}
                    </div>
                    {umpireName ? <div className="text-xs text-gray-600">Umpire: {umpireName}</div> : null}
                    {m.court_number != null && String(m.court_number).trim() !== "" ? (
                        <div className="text-xs text-gray-600">{formatStoredCourtForDisplay(tournament, m.court_number)}</div>
                    ) : null}
                    <Link
                        href={`/scoring/tournaments/${tournamentId}?tab=results&resultMatch=${m.id}`}
                        className="inline-block text-red-600 hover:text-red-800 text-xs font-medium mt-0.5"
                    >
                        {m.status === "completed" ? "View results" : "Enter results"}
                    </Link>
                </div>
            </div>
            <span
                className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                    m.status === "completed"
                        ? "bg-gray-100 text-gray-700"
                        : m.status === "live"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                }`}
            >
                {m.status}
            </span>
        </div>
    );
}

function scheduleMatchDateMs(m: TournamentMatch): number {
    return m.match_date ? new Date(m.match_date).getTime() : Number.POSITIVE_INFINITY;
}

function scheduleMatchNumKey(m: TournamentMatch): number {
    const x = (m.match_number || "").match(/\d+/);
    return x ? parseInt(x[0], 10) : Number.MAX_SAFE_INTEGER;
}

function scheduleCourtNumKey(m: TournamentMatch): number {
    const d = String(m.court_number ?? "").replace(/\D/g, "");
    const n = parseInt(d, 10);
    return Number.isFinite(n) ? n : 999;
}

function scheduleMatchDayKey(m: TournamentMatch): string {
    if (!m.match_date) return "unscheduled";
    const d = new Date(m.match_date);
    if (Number.isNaN(d.getTime())) return "unscheduled";
    // Session day runs until 1:00 AM; 12:xx AM belongs to previous day block.
    const sessionDay = new Date(d);
    if (sessionDay.getHours() < 1) {
        sessionDay.setDate(sessionDay.getDate() - 1);
    }
    const y = sessionDay.getFullYear();
    const mm = String(sessionDay.getMonth() + 1).padStart(2, "0");
    const dd = String(sessionDay.getDate()).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
}

function scheduleMatchDayLabel(m: TournamentMatch): string {
    if (!m.match_date) return "No date set";
    const d = new Date(m.match_date);
    if (Number.isNaN(d.getTime())) return "No date set";
    return d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

/** If two starts on the same court are farther apart than this, show a “Break” row on that court. */
const SCHEDULE_TIME_BREAK_GAP_MS = 25 * 60 * 1000;

function matchOnCourtKey(m: TournamentMatch, courtKey: string): boolean {
    const c = m.court_number;
    if (!c) return courtKey === "1";
    const num = c.replace(/\D/g, "") || c;
    return num === courtKey || c === `Court ${courtKey}`;
}

function sortScheduleDayKeys(keys: string[]): string[] {
    return [...keys].sort((a, b) => {
        if (a === "unscheduled") return 1;
        if (b === "unscheduled") return -1;
        return a.localeCompare(b);
    });
}

type AlignedScheduleBlock =
    | { kind: "day"; key: string; label: string }
    | {
          kind: "row";
          key: string;
          cells: (TournamentMatch | null)[];
          breakBefore: boolean[];
          /** Idle court this timestep: long gap before its next match — label in the empty cell. */
          emptySlotBreak: boolean[];
      };

function buildAlignedScheduleBlocks(
    matches: TournamentMatch[],
    courtKeys: string[],
    breakGapMs: number,
): { blocks: AlignedScheduleBlock[]; unscheduledByCourt: Record<string, TournamentMatch[]> } {
    const blocks: AlignedScheduleBlock[] = [];
    const byDay = new Map<string, TournamentMatch[]>();
    for (const m of matches) {
        const k = scheduleMatchDayKey(m);
        if (!byDay.has(k)) byDay.set(k, []);
        byDay.get(k)!.push(m);
    }
    const dayKeys = sortScheduleDayKeys([...byDay.keys()]);
    const unscheduledByCourt: Record<string, TournamentMatch[]> = Object.fromEntries(
        courtKeys.map((ck) => [ck, [] as TournamentMatch[]]),
    );

    let dayCounter = 0;
    for (const dayKey of dayKeys) {
        const dayMatches = byDay.get(dayKey) || [];

        if (dayKey === "unscheduled") {
            for (const m of dayMatches) {
                const ck = courtKeys.find((k) => matchOnCourtKey(m, k)) ?? courtKeys[0];
                if (ck) unscheduledByCourt[ck].push(m);
            }
            for (const ck of courtKeys) {
                unscheduledByCourt[ck].sort((a, b) => scheduleMatchNumKey(a) - scheduleMatchNumKey(b));
            }
            continue;
        }

        const label = `Day ${dayCounter + 1}`;
        blocks.push({ kind: "day", key: `day-${dayKey}-${dayCounter}`, label });
        dayCounter += 1;

        const queues: Record<string, TournamentMatch[]> = {};
        for (const ck of courtKeys) {
            queues[ck] = dayMatches
                .filter((m) => matchOnCourtKey(m, ck))
                .sort((a, b) => {
                    const da = scheduleMatchDateMs(a);
                    const db = scheduleMatchDateMs(b);
                    if (da !== db) return da - db;
                    return scheduleMatchNumKey(a) - scheduleMatchNumKey(b);
                });
        }

        const lastStartMs: Record<string, number | null> = Object.fromEntries(
            courtKeys.map((k) => [k, null as number | null]),
        );
        const gapBreakLabelShown: Record<string, boolean> = Object.fromEntries(
            courtKeys.map((k) => [k, false]),
        );

        while (courtKeys.some((ck) => queues[ck].length > 0)) {
            let nextT = Number.POSITIVE_INFINITY;
            for (const ck of courtKeys) {
                const q = queues[ck];
                if (q.length === 0) continue;
                const t = scheduleMatchDateMs(q[0]);
                if (t < nextT) nextT = t;
            }
            if (nextT === Number.POSITIVE_INFINITY) break;

            const flags = courtKeys.map((ck) => {
                const q = queues[ck];
                if (q.length === 0) return false;
                if (scheduleMatchDateMs(q[0]) !== nextT) return false;
                const prev = lastStartMs[ck];
                if (prev == null) return false;
                return nextT - prev > breakGapMs;
            });

            const emptySlotBreak = courtKeys.map((ck) => {
                const q = queues[ck];
                const prev = lastStartMs[ck];

                if (q.length > 0 && scheduleMatchDateMs(q[0]) === nextT) return false;

                // No matches left this day on this court, but it already played — idle slots while other courts continue
                if (q.length === 0 && prev != null) return true;

                if (q.length === 0) return false;

                const tNext = scheduleMatchDateMs(q[0]);
                if (tNext <= nextT) return false;
                if (prev == null) return false;
                if (tNext - prev <= breakGapMs) return false;
                if (gapBreakLabelShown[ck]) return false;
                return true;
            });

            for (let i = 0; i < courtKeys.length; i++) {
                if (emptySlotBreak[i]) gapBreakLabelShown[courtKeys[i]] = true;
            }

            const breakBeforeFinal = courtKeys.map((ck, i) => flags[i] && !gapBreakLabelShown[ck]);

            const cells: (TournamentMatch | null)[] = courtKeys.map((ck) => {
                const q = queues[ck];
                if (q.length === 0) return null;
                if (scheduleMatchDateMs(q[0]) !== nextT) return null;
                const m = q.shift()!;
                lastStartMs[ck] = scheduleMatchDateMs(m);
                return m;
            });

            for (let i = 0; i < courtKeys.length; i++) {
                if (cells[i] != null) gapBreakLabelShown[courtKeys[i]] = false;
            }

            blocks.push({
                kind: "row",
                key: `row-${dayKey}-${nextT}`,
                cells,
                breakBefore: breakBeforeFinal,
                emptySlotBreak,
            });
        }
    }

    return { blocks, unscheduledByCourt };
}

/** One horizontal band across all courts (spans full grid width). */
function ScheduleDayDividerFullWidth({ label }: { label: string }) {
    return (
        <div
            className="w-full border-y border-rose-200 bg-[#FFF5F5]"
            role="separator"
            aria-label={label}
        >
            <div className="flex w-full min-w-0 items-center gap-3 px-4 py-3 sm:gap-4">
                <div className="h-px min-w-0 flex-1 bg-rose-300/90" aria-hidden />
                <span className="shrink-0 text-center text-xs font-bold uppercase tracking-widest text-gray-900">
                    {label}
                </span>
                <div className="h-px min-w-0 flex-1 bg-rose-300/90" aria-hidden />
            </div>
        </div>
    );
}

function ScheduleBreakCell() {
    return (
        <div className="w-full min-h-[5.5rem] px-3 py-2 flex items-stretch">
            <div className="w-full rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 px-3 py-3 flex items-center justify-center">
                <span className="text-xs font-bold uppercase tracking-widest text-amber-900">Break</span>
            </div>
        </div>
    );
}

function AlignedMultiCourtScheduleGrid({
    matches,
    courtKeys,
    courtHeaders,
    renderMatch,
    breakGapMs = SCHEDULE_TIME_BREAK_GAP_MS,
    poolSize,
    emptyHint,
}: {
    matches: TournamentMatch[];
    courtKeys: string[];
    /** Same order/length as courtKeys — column titles. */
    courtHeaders: string[];
    renderMatch: (m: TournamentMatch) => ReactNode;
    breakGapMs?: number;
    poolSize: number;
    emptyHint?: string;
}) {
    const n = courtKeys.length;
    const colTemplate = useMemo(
        () => ({ gridTemplateColumns: `repeat(${Math.max(1, n)}, minmax(0, 1fr))` } as const),
        [n],
    );

    const { blocks, unscheduledByCourt } = useMemo(
        () => buildAlignedScheduleBlocks(matches, courtKeys, breakGapMs),
        [matches, courtKeys, breakGapMs],
    );

    const hasUnscheduled = courtKeys.some((ck) => (unscheduledByCourt[ck]?.length ?? 0) > 0);
    const showEmptyBody = blocks.length === 0 && !hasUnscheduled;

    return (
        <div className="min-w-0 space-y-4">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm min-w-0">
                <div
                    className="grid divide-x divide-gray-200 border-b border-gray-200 bg-gray-50"
                    style={colTemplate}
                >
                    {courtKeys.map((ck, i) => (
                        <div key={ck} className="px-3 py-2 text-sm font-medium text-gray-900">
                            {courtHeaders[i] ?? `Court ${ck}`}
                        </div>
                    ))}
                </div>
                <div className="divide-y divide-gray-200">
                    {blocks.map((block) => {
                        if (block.kind === "day") {
                            return (
                                <div key={block.key} className="w-full">
                                    <ScheduleDayDividerFullWidth label={block.label} />
                                </div>
                            );
                        }
                        return (
                            <div
                                key={block.key}
                                className="grid divide-x divide-gray-200"
                                style={colTemplate}
                            >
                                {block.cells.map((m, i) => (
                                    <div
                                        key={`${block.key}-${courtKeys[i]}`}
                                        className={`min-w-0 ${block.emptySlotBreak[i] ? "bg-[#FFF5F5]" : "bg-white"}`}
                                    >
                                        {block.emptySlotBreak[i] ? (
                                            <div className="flex min-h-[5.5rem] w-full items-center justify-center px-3 py-3">
                                                <span className="text-xs font-bold uppercase tracking-widest text-red-600">
                                                    Break
                                                </span>
                                            </div>
                                        ) : null}
                                        {block.breakBefore[i] ? (
                                            <div className="border-b border-gray-200 bg-gray-50/40">
                                                <ScheduleBreakCell />
                                            </div>
                                        ) : null}
                                        {m ? renderMatch(m) : null}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                    {showEmptyBody ? (
                        <div className="p-3 text-sm text-gray-600">
                            {emptyHint ??
                                (poolSize > 0 && matches.length === 0
                                    ? "No matches match filters."
                                    : "No matches")}
                        </div>
                    ) : null}
                </div>
            </div>

            {hasUnscheduled ? (
                <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-900">No time set</p>
                    <div className="grid gap-3 sm:gap-4" style={colTemplate}>
                        {courtKeys.map((ck, i) => (
                            <div
                                key={ck}
                                className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
                            >
                                <div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900">
                                    {courtHeaders[i] ?? `Court ${ck}`}
                                </div>
                                <div className="divide-y divide-gray-200">
                                    {(unscheduledByCourt[ck] || []).map((m) => (
                                        <Fragment key={m.id}>{renderMatch(m)}</Fragment>
                                    ))}
                                    {(unscheduledByCourt[ck] || []).length === 0 ? (
                                        <p className="p-3 text-sm text-gray-500">—</p>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

/** Court columns + match cards (shared by individual Schedule tab and Brackets round 1). */
function IndividualCourtScheduleGrid({
    matches,
    participants,
    tournament,
    poolSize,
    hideCourtsNote,
}: {
    matches: TournamentMatch[];
    participants: Participant[];
    tournament: Tournament;
    /** When filtering: total unfiltered count (for empty-state copy). */
    poolSize: number;
    hideCourtsNote?: boolean;
}) {
    const numCourts = getCourtCount(tournament);
    const courtKeys = Array.from({ length: numCourts }, (_, i) => String(i + 1));
    const isMobileLayout = useIsMaxMd();
    const [mobileCourtKey, setMobileCourtKey] = useState("1");
    useEffect(() => {
        if (!courtKeys.includes(mobileCourtKey)) setMobileCourtKey(courtKeys[0] || "1");
    }, [mobileCourtKey, courtKeys]);
    const visibleCourtKeys = isMobileLayout ? [mobileCourtKey] : courtKeys;
    const courtHeadersVisible = useMemo(
        () => visibleCourtKeys.map((ck) => courtDisplayLabelForKey(tournament, ck)),
        [tournament, visibleCourtKeys],
    );
    return (
        <>
            {!hideCourtsNote && (
                <p className="text-xs text-gray-500 mb-2">
                    Showing {numCourts} court column{numCourts === 1 ? "" : "s"}. Change{" "}
                    <strong>Number of courts</strong> and optional <strong>Court names</strong> in Settings if needed.
                </p>
            )}
            {!hideCourtsNote && (
                <p className="text-xs text-gray-500 mb-2">
                    Day headers and match rows line up across courts. Gaps over{" "}
                    {Math.round(SCHEDULE_TIME_BREAK_GAP_MS / 60000)} minutes on a court show a <strong>Break</strong> box in
                    that column.
                </p>
            )}
            {isMobileLayout && courtKeys.length > 1 && (
                <div className="mb-2 flex flex-wrap gap-2">
                    {courtKeys.map((ck) => (
                        <button
                            key={ck}
                            type="button"
                            onClick={() => setMobileCourtKey(ck)}
                            className={`px-3 py-1.5 rounded-lg text-sm border ${
                                mobileCourtKey === ck
                                    ? "bg-gray-900 text-white border-gray-900"
                                    : "bg-white text-gray-700 border-gray-300"
                            }`}
                        >
                            {courtDisplayLabelForKey(tournament, ck)}
                        </button>
                    ))}
                </div>
            )}
            <div className="w-full min-w-0 overflow-x-auto">
                <AlignedMultiCourtScheduleGrid
                    matches={matches}
                    courtKeys={visibleCourtKeys}
                    courtHeaders={courtHeadersVisible}
                    poolSize={poolSize}
                    renderMatch={(m) => (
                        <IndividualScheduleMatchCard
                            match={m}
                            participants={participants}
                            tournamentId={tournament.id}
                            tournament={tournament}
                        />
                    )}
                />
            </div>
        </>
    );
}

function ScheduleMatchCard({
    match,
    tournament,
    canEdit = false,
    onSaveUmpire,
}: {
    match: TournamentMatch;
    tournament: Tournament;
    canEdit?: boolean;
    onSaveUmpire?: (matchId: string, umpireName: string) => Promise<void>;
}) {
    const m = match;
    const nameA = m.team_a?.name ?? "TBD";
    const nameB = m.team_b?.name ?? "TBD";
    const titleA = displayTeamCardTitle(nameA);
    const titleB = displayTeamCardTitle(nameB);
    const doublesPayload = parseDoublesMatchNotes(m.notes);
    const initialUmpire = getUmpireFromNotes(m.notes);
    const [umpireDraft, setUmpireDraft] = useState(initialUmpire);
    const [isSavingUmpire, setIsSavingUmpire] = useState(false);
    useEffect(() => {
        setUmpireDraft(initialUmpire);
    }, [initialUmpire, m.id]);
    return (
        <div className="p-3 flex gap-2 items-start bg-white min-w-0">
            <div className="min-w-0 flex-1 overflow-hidden space-y-2">
                {doublesPayload ? <DoublesLineupBlocks payload={doublesPayload} /> : null}
                <div className="pt-2 border-t border-gray-100 space-y-0.5">
                    <div className="text-sm font-semibold text-gray-800">
                        {match.match_date
                            ? new Date(match.match_date).toLocaleString(undefined, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                              })
                            : "No time set"}
                    </div>
                    {initialUmpire ? <div className="text-xs text-gray-600">Umpire: {initialUmpire}</div> : null}
                    {m.court_number != null && String(m.court_number).trim() !== "" ? (
                        <div className="text-xs text-gray-600">{formatStoredCourtForDisplay(tournament, m.court_number)}</div>
                    ) : null}
                    {canEdit && onSaveUmpire ? (
                        <div className="pt-1 flex flex-wrap items-center gap-2">
                            <input
                                type="text"
                                value={umpireDraft}
                                onChange={(e) => setUmpireDraft(e.target.value)}
                                placeholder="Umpire name"
                                className="px-2 py-1 border border-gray-300 bg-white text-gray-900 rounded text-xs"
                            />
                            <button
                                type="button"
                                disabled={isSavingUmpire}
                                onClick={async () => {
                                    setIsSavingUmpire(true);
                                    try {
                                        await onSaveUmpire(m.id, umpireDraft);
                                    } finally {
                                        setIsSavingUmpire(false);
                                    }
                                }}
                                className="px-2 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                            >
                                {isSavingUmpire ? "Saving..." : "Save umpire"}
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
            <span
                className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                    match.status === "completed"
                        ? "bg-gray-100 text-gray-700"
                        : match.status === "live"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                }`}
            >
                {match.status}
            </span>
        </div>
    );
}

function TeamScheduleTab({ tournament, onRefresh, canEdit = false }: { tournament: Tournament; onRefresh: () => void; canEdit?: boolean }) {
    const [teams, setTeams] = useState<TournamentTeam[]>([]);
    const [matches, setMatches] = useState<TournamentMatch[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [scheduleBaseDate, setScheduleBaseDate] = useState("");
    const [assignSessionStart, setAssignSessionStart] = useState(() => {
        const d = new Date(2026, 3, 11, 18, 0, 0, 0);
        const p = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
    });
    const [assignOverwriteTimes, setAssignOverwriteTimes] = useState(false);
    const [assignSlotMinutes, setAssignSlotMinutes] = useState(DEFAULT_ASSIGN_SLOT_MINUTES);
    /** Optional: day 2+ session start; day 1 uses datetime-local above. */
    const [assignSessionDay2Time, setAssignSessionDay2Time] = useState("");
    const [newMatch, setNewMatch] = useState({
        team_a_id: "",
        team_b_id: "",
        court_number: "",
        match_date: "",
        match_number: "",
        umpire_name: "",
        /** Optional doubles lineup — participant ids; all four or none. */
        lineup_a1: "",
        lineup_a2: "",
        lineup_b1: "",
        lineup_b2: "",
    });
    type AddMatchRosterPlayer = { id: string; player_name: string; category: string | null; position: number };
    const [addMatchRosters, setAddMatchRosters] = useState<Record<string, AddMatchRosterPlayer[]>>({});
    const [doublesTargetPerPlayer, setDoublesTargetPerPlayer] = useState(12);
    const [scheduleFilterTeamId, setScheduleFilterTeamId] = useState("");
    const [scheduleFilterPlayer, setScheduleFilterPlayer] = useState("");
    const [scheduleFilterDayKey, setScheduleFilterDayKey] = useState("");
    const supabase = createClient();
    const numCourts = getCourtCount(tournament);
    const courtKeys = Array.from({ length: numCourts }, (_, i) => String(i + 1));
    const isMobileLayout = useIsMaxMd();
    const [mobileCourtKey, setMobileCourtKey] = useState("1");
    useEffect(() => {
        if (!courtKeys.includes(mobileCourtKey)) setMobileCourtKey(courtKeys[0] || "1");
    }, [mobileCourtKey, courtKeys]);
    const visibleCourtKeys = isMobileLayout ? [mobileCourtKey] : courtKeys;
    const courtHeadersVisible = useMemo(
        () => visibleCourtKeys.map((ck) => courtDisplayLabelForKey(tournament, ck)),
        [tournament, visibleCourtKeys],
    );
    const isRoundRobin = tournament.format === "round_robin" || tournament.format === "round_robin_knockout";
    const teamIds = teams.map((t) => t.id);
    const memberNamesByTeam = useTeamMemberNames(teamIds);
    const scheduleDayOptions = useMemo(() => {
        const dayKeys = sortScheduleDayKeys(
            [...new Set(matches.map((m) => scheduleMatchDayKey(m as TournamentMatch)))].filter((k) => k !== "unscheduled")
        );
        return dayKeys.map((key, idx) => ({ key, label: `Day ${idx + 1}` }));
    }, [matches]);

    const filteredMatches = useMemo(() => {
        let list = matches;
        if (scheduleFilterDayKey) {
            list = list.filter((m) => scheduleMatchDayKey(m as TournamentMatch) === scheduleFilterDayKey);
        }
        if (scheduleFilterTeamId) {
            list = list.filter((m) => {
                const tm = m as TournamentMatch;
                return tm.team_a_id === scheduleFilterTeamId || tm.team_b_id === scheduleFilterTeamId;
            });
        }
        const q = scheduleFilterPlayer.trim().toLowerCase();
        if (q) {
            list = list.filter((m) => {
                const tm = m as TournamentMatch;
                const d = parseDoublesMatchNotes(tm.notes);
                if (d) {
                    return [...d.sideA, ...d.sideB].some((p) => p.name.toLowerCase().includes(q));
                }
                const na = tm.team_a_id ? memberNamesByTeam[tm.team_a_id] || [] : [];
                const nb = tm.team_b_id ? memberNamesByTeam[tm.team_b_id] || [] : [];
                return [...na, ...nb].some((name) => name.toLowerCase().includes(q));
            });
        }
        return list;
    }, [matches, scheduleFilterDayKey, scheduleFilterTeamId, scheduleFilterPlayer, memberNamesByTeam]);

    const scheduleExportFilterNote = useMemo(() => {
        if (!scheduleFilterTeamId && !scheduleFilterPlayer.trim() && !scheduleFilterDayKey) return undefined;
        const bits: string[] = [];
        if (scheduleFilterDayKey) {
            const day = scheduleDayOptions.find((d) => d.key === scheduleFilterDayKey);
            bits.push(day ? day.label : "Day filter");
        }
        if (scheduleFilterTeamId) {
            const t = teams.find((x) => x.id === scheduleFilterTeamId);
            bits.push(t ? `Team: ${displayTeamCardTitle(t.name)}` : "Team filter");
        }
        if (scheduleFilterPlayer.trim()) {
            bits.push(`Player contains: ${scheduleFilterPlayer.trim()}`);
        }
        return bits.join(" • ");
    }, [teams, scheduleFilterTeamId, scheduleFilterPlayer, scheduleFilterDayKey, scheduleDayOptions]);

    const resolveCourtExport = useCallback((raw: string) => formatStoredCourtForDisplay(tournament, raw), [tournament]);

    const handleScheduleDownloadXlsx = useCallback(() => {
        if (filteredMatches.length === 0) {
            alert("No matches to export.");
            return;
        }
        const rows = buildScheduleExportRows(filteredMatches);
        downloadScheduleXlsx(tournament.name, rows, scheduleExportFilterNote, resolveCourtExport);
    }, [filteredMatches, tournament.name, scheduleExportFilterNote, resolveCourtExport]);

    const handleScheduleDownloadPdf = useCallback(async () => {
        if (filteredMatches.length === 0) {
            alert("No matches to export.");
            return;
        }
        const rows = buildScheduleExportRows(filteredMatches);
        await downloadSchedulePdf(tournament.name, rows, scheduleExportFilterNote, resolveCourtExport);
    }, [filteredMatches, tournament.name, scheduleExportFilterNote, resolveCourtExport]);

    const handleScheduleDownloadPdfByCourt = useCallback(async () => {
        if (filteredMatches.length === 0) {
            alert("No matches to export.");
            return;
        }
        const rows = buildScheduleExportRows(filteredMatches);
        await downloadSchedulePdf(tournament.name, rows, scheduleExportFilterNote, resolveCourtExport, {
            layout: "by_court",
        });
    }, [filteredMatches, tournament.name, scheduleExportFilterNote, resolveCourtExport]);

    useEffect(() => {
        supabase.from("tournament_teams").select("*").eq("tournament_id", tournament.id).order("name").then(({ data }) => setTeams(data || []));
    }, [tournament.id, supabase]);
    useEffect(() => {
        supabase
            .from("matches")
            .select("*, team_a:tournament_teams!team_a_id(id,name,short_name), team_b:tournament_teams!team_b_id(id,name,short_name)")
            .eq("tournament_id", tournament.id)
            .order("match_date", { ascending: true })
            .then(({ data }) => setMatches(data || []));
    }, [tournament.id, supabase]);

    const existingPairs = new Set<string>();
    matches.forEach((m) => {
        const a = (m as TournamentMatch).team_a_id;
        const b = (m as TournamentMatch).team_b_id;
        if (a && b) existingPairs.add([a, b].sort().join(","));
    });

    const SCHEDULE_BY_COURT: { court: string; slotIndex: number; cat: string; i: number; j: number; matchLabel: string }[] = [
        { court: "1", slotIndex: 0, cat: "A", i: 1, j: 2, matchLabel: "A-M1" }, { court: "1", slotIndex: 1, cat: "A", i: 3, j: 4, matchLabel: "A-M2" },
        { court: "1", slotIndex: 2, cat: "A", i: 2, j: 3, matchLabel: "A-M3" }, { court: "1", slotIndex: 3, cat: "A", i: 4, j: 1, matchLabel: "A-M4" },
        { court: "1", slotIndex: 4, cat: "A", i: 1, j: 3, matchLabel: "A-M5" }, { court: "1", slotIndex: 5, cat: "D", i: 1, j: 3, matchLabel: "D-M1" },
        { court: "1", slotIndex: 6, cat: "A", i: 2, j: 4, matchLabel: "A-M6" }, { court: "1", slotIndex: 7, cat: "D", i: 1, j: 2, matchLabel: "D-M2" },
        { court: "1", slotIndex: 8, cat: "D", i: 2, j: 3, matchLabel: "D-M3" }, { court: "1", slotIndex: 9, cat: "D", i: 4, j: 1, matchLabel: "D-M4" },
        { court: "2", slotIndex: 0, cat: "B", i: 1, j: 2, matchLabel: "B-M1" }, { court: "2", slotIndex: 1, cat: "B", i: 3, j: 4, matchLabel: "B-M2" },
        { court: "2", slotIndex: 2, cat: "B", i: 2, j: 3, matchLabel: "B-M3" }, { court: "2", slotIndex: 3, cat: "B", i: 4, j: 1, matchLabel: "B-M4" },
        { court: "2", slotIndex: 4, cat: "B", i: 1, j: 3, matchLabel: "B-M5" }, { court: "2", slotIndex: 5, cat: "D", i: 2, j: 4, matchLabel: "D-M5" },
        { court: "2", slotIndex: 6, cat: "B", i: 2, j: 4, matchLabel: "B-M6" }, { court: "2", slotIndex: 7, cat: "E", i: 1, j: 2, matchLabel: "E-M1" },
        { court: "2", slotIndex: 8, cat: "E", i: 1, j: 3, matchLabel: "E-M2" }, { court: "2", slotIndex: 9, cat: "E", i: 2, j: 3, matchLabel: "E-M3" },
        { court: "3", slotIndex: 0, cat: "C", i: 1, j: 2, matchLabel: "C-M1" }, { court: "3", slotIndex: 1, cat: "C", i: 3, j: 4, matchLabel: "C-M2" },
        { court: "3", slotIndex: 2, cat: "C", i: 2, j: 3, matchLabel: "C-M3" }, { court: "3", slotIndex: 3, cat: "C", i: 4, j: 1, matchLabel: "C-M4" },
        { court: "3", slotIndex: 4, cat: "C", i: 1, j: 3, matchLabel: "C-M5" }, { court: "3", slotIndex: 5, cat: "E", i: 3, j: 4, matchLabel: "E-M4" },
        { court: "3", slotIndex: 6, cat: "C", i: 2, j: 4, matchLabel: "C-M6" }, { court: "3", slotIndex: 7, cat: "D", i: 3, j: 4, matchLabel: "D-M6" },
        { court: "3", slotIndex: 8, cat: "E", i: 2, j: 4, matchLabel: "E-M5" }, { court: "3", slotIndex: 9, cat: "E", i: 4, j: 1, matchLabel: "E-M6" },
    ];

    const handleGenerateScheduleByCourtAndTime = async () => {
        const byCategory: Record<string, TournamentTeam[]> = {};
        teams.forEach((t) => {
            const cat = (t.category != null && String(t.category).trim() !== "") ? String(t.category).trim() : "_";
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(t);
        });
        Object.keys(byCategory).forEach((cat) => {
            byCategory[cat].sort((a, b) => (a.short_name || a.name).localeCompare(b.short_name || b.name, undefined, { numeric: true }));
        });
        const baseDate = scheduleBaseDate ? new Date(scheduleBaseDate) : (() => { const d = new Date(); d.setHours(17, 0, 0, 0); return d; })();
        baseDate.setSeconds(0, 0);
        // If time is midnight (00:00), default to 5 PM start
        if (baseDate.getHours() === 0 && baseDate.getMinutes() === 0) {
            baseDate.setHours(17, 0, 0, 0);
        }
        const storedUser = localStorage.getItem("sf:user");
        const created_by = storedUser ? JSON.parse(storedUser).user_id : null;
        const bySlot = new Map<number, (typeof SCHEDULE_BY_COURT)[number][]>();
        for (const row of SCHEDULE_BY_COURT) {
            if (!bySlot.has(row.slotIndex)) bySlot.set(row.slotIndex, []);
            bySlot.get(row.slotIndex)!.push(row);
        }
        const slotIndices = [...bySlot.keys()].sort((a, b) => a - b);
        const toInsert: { teamAId: string; teamBId: string; matchNumber: string; courtNumber: string; matchDate: Date }[] = [];
        for (const si of slotIndices) {
            const group = [...(bySlot.get(si) || [])].sort((a, b) => parseInt(a.court, 10) - parseInt(b.court, 10));
            group.forEach((row, k) => {
                const catTeams = byCategory[row.cat];
                if (!catTeams || catTeams.length < Math.max(row.i, row.j)) return;
                const teamA = catTeams[row.i - 1];
                const teamB = catTeams[row.j - 1];
                if (!teamA || !teamB || teamA.id === teamB.id) return;
                const key = [teamA.id, teamB.id].sort().join(",");
                if (existingPairs.has(key)) return;
                const courtNumber = String((k % numCourts) + 1);
                const extraSlots = Math.floor(k / numCourts);
                const slotM = clampAssignSlotMinutes(assignSlotMinutes);
                const matchDate = new Date(baseDate);
                matchDate.setMinutes(baseDate.getMinutes() + si * slotM + extraSlots * slotM);
                toInsert.push({
                    teamAId: teamA.id,
                    teamBId: teamB.id,
                    matchNumber: row.matchLabel,
                    courtNumber,
                    matchDate,
                });
            });
        }
        if (toInsert.length === 0) {
            alert("No new matches to add (all schedule slots already exist or category/team count doesn’t match).");
            return;
        }
        setIsGenerating(true);
        try {
            for (const { teamAId, teamBId, matchNumber, courtNumber, matchDate } of toInsert) {
                const { error } = await supabase.from("matches").insert({
                    tournament_id: tournament.id,
                    sport: tournament.sport,
                    match_type: "tournament",
                    status: "upcoming",
                    team_a_id: teamAId,
                    team_b_id: teamBId,
                    court_number: courtNumber,
                    match_date: matchDate.toISOString(),
                    match_number: matchNumber,
                    created_by,
                });
                if (error) throw error;
            }
            onRefresh();
            supabase
                .from("matches")
                .select("*, team_a:tournament_teams!team_a_id(id,name,short_name), team_b:tournament_teams!team_b_id(id,name,short_name)")
                .eq("tournament_id", tournament.id)
                .order("match_date", { ascending: true })
                .then(({ data }) => setMatches(data || []));
            alert(
                `Added ${toInsert.length} match(es) on ${numCourts} court(s) with ${clampAssignSlotMinutes(assignSlotMinutes)}-min slots. Use "Generate quarter-finals" after round-robin for QF/Semi/Final.`,
            );
        } catch (e) {
            console.error(e);
            alert("Failed to generate schedule.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateRoundRobinByCategory = async () => {
        const byCategory: Record<string, TournamentTeam[]> = {};
        teams.forEach((t) => {
            const cat = (t.category != null && String(t.category).trim() !== "") ? String(t.category).trim() : "_";
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(t);
        });
        const storedUser = localStorage.getItem("sf:user");
        const created_by = storedUser ? JSON.parse(storedUser).user_id : null;
        const categoryList = Object.keys(byCategory).sort();
        const toInsert: { teamAId: string; teamBId: string; matchNumber: string; courtNumber: string }[] = [];
        categoryList.forEach((cat, catIndex) => {
            const catTeams = byCategory[cat];
            if (catTeams.length < 2) return;
            const courtNum = String((catIndex % numCourts) + 1);
            const prefix = cat === "_" ? "M" : `${cat}-M`;
            let n = 0;
            for (let i = 0; i < catTeams.length; i++) {
                for (let j = i + 1; j < catTeams.length; j++) {
                    const key = [catTeams[i].id, catTeams[j].id].sort().join(",");
                    if (!existingPairs.has(key)) {
                        n++;
                        toInsert.push({ teamAId: catTeams[i].id, teamBId: catTeams[j].id, matchNumber: `${prefix}${n}`, courtNumber: courtNum });
                    }
                }
            }
        });
        if (toInsert.length === 0) {
            alert("All category round-robin matches already exist. No new matches to add.");
            return;
        }
        setIsGenerating(true);
        try {
            for (const { teamAId, teamBId, matchNumber, courtNumber } of toInsert) {
                const { error } = await supabase.from("matches").insert({
                    tournament_id: tournament.id,
                    sport: tournament.sport,
                    match_type: "tournament",
                    status: "upcoming",
                    team_a_id: teamAId,
                    team_b_id: teamBId,
                    court_number: courtNumber,
                    match_date: null,
                    match_number: matchNumber,
                    created_by,
                });
                if (error) throw error;
            }
            onRefresh();
            supabase
                .from("matches")
                .select("*, team_a:tournament_teams!team_a_id(id,name,short_name), team_b:tournament_teams!team_b_id(id,name,short_name)")
                .eq("tournament_id", tournament.id)
                .order("match_date", { ascending: true })
                .then(({ data }) => setMatches(data || []));
            alert(`Added ${toInsert.length} match(es) by category across ${numCourts} court(s). Set date/time below if needed.`);
        } catch (e) {
            console.error(e);
            alert("Failed to generate schedule. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateRoundRobin = async () => {
        if (teams.length < 2) {
            alert("Add at least 2 teams to generate a round-robin schedule.");
            return;
        }
        const teamsWithCategory = teams.filter((t) => t.category != null && String(t.category).trim() !== "");
        if (teamsWithCategory.length >= 2) {
            await handleGenerateRoundRobinByCategory();
            return;
        }
        const storedUser = localStorage.getItem("sf:user");
        const created_by = storedUser ? JSON.parse(storedUser).user_id : null;
        const pairs: [string, string][] = [];
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                const key = [teams[i].id, teams[j].id].sort().join(",");
                if (!existingPairs.has(key)) pairs.push([teams[i].id, teams[j].id]);
            }
        }
        if (pairs.length === 0) {
            alert("All round-robin matches already exist. No new matches to add.");
            return;
        }
        setIsGenerating(true);
        try {
            let matchNum = matches.length;
            for (const [teamAId, teamBId] of pairs) {
                matchNum += 1;
                const { error } = await supabase.from("matches").insert({
                    tournament_id: tournament.id,
                    sport: tournament.sport,
                    match_type: "tournament",
                    status: "upcoming",
                    team_a_id: teamAId,
                    team_b_id: teamBId,
                    court_number: null,
                    match_date: null,
                    match_number: `M${matchNum}`,
                    created_by,
                });
                if (error) throw error;
            }
            onRefresh();
            supabase
                .from("matches")
                .select("*, team_a:tournament_teams!team_a_id(id,name,short_name), team_b:tournament_teams!team_b_id(id,name,short_name)")
                .eq("tournament_id", tournament.id)
                .order("match_date", { ascending: true })
                .then(({ data }) => setMatches(data || []));
            alert(`Added ${pairs.length} match(es). You can set court and date for each match below.`);
        } catch (e) {
            console.error(e);
            alert("Failed to generate schedule. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        const teamIds = [...new Set([newMatch.team_a_id, newMatch.team_b_id].filter(Boolean))];
        if (teamIds.length === 0) {
            setAddMatchRosters({});
            return;
        }
        let cancelled = false;
        void (async () => {
            const { data, error } = await supabase
                .from("tournament_team_members")
                .select("team_id, position, participant:tournament_participants(id, player_name, category)")
                .in("team_id", teamIds);
            if (cancelled || error) return;
            const next: Record<string, AddMatchRosterPlayer[]> = {};
            teamIds.forEach((id) => {
                next[id] = [];
            });
            for (const row of data || []) {
                const raw = row.participant;
                const p = Array.isArray(raw) ? raw[0] : raw;
                if (!p || typeof p !== "object" || !next[row.team_id]) continue;
                const part = p as { id: string; player_name?: string; category?: string | null };
                next[row.team_id].push({
                    id: part.id,
                    player_name: part.player_name || "—",
                    category: part.category ?? null,
                    position: typeof row.position === "number" ? row.position : 999,
                });
            }
            for (const id of teamIds) {
                (next[id] || []).sort((a, b) => a.position - b.position || a.player_name.localeCompare(b.player_name));
            }
            if (!cancelled) setAddMatchRosters(next);
        })();
        return () => {
            cancelled = true;
        };
    }, [newMatch.team_a_id, newMatch.team_b_id, supabase]);

    const handleAddMatch = async () => {
        if (!newMatch.team_a_id || !newMatch.team_b_id) {
            alert("Select both teams");
            return;
        }
        if (newMatch.team_a_id === newMatch.team_b_id) {
            alert("Select two different teams");
            return;
        }
        const lineupIds = [newMatch.lineup_a1, newMatch.lineup_a2, newMatch.lineup_b1, newMatch.lineup_b2].filter(Boolean);
        const lineupCount = lineupIds.length;
        if (lineupCount !== 0 && lineupCount !== 4) {
            alert("For doubles lineups, pick all four players (two per team), or leave all four player fields empty.");
            return;
        }
        if (lineupCount === 4) {
            if (new Set(lineupIds).size !== 4) {
                alert("Each of the four players must be different.");
                return;
            }
            const ra = addMatchRosters[newMatch.team_a_id] || [];
            const rb = addMatchRosters[newMatch.team_b_id] || [];
            const okA = (pid: string) => ra.some((x) => x.id === pid);
            const okB = (pid: string) => rb.some((x) => x.id === pid);
            if (!okA(newMatch.lineup_a1) || !okA(newMatch.lineup_a2) || !okB(newMatch.lineup_b1) || !okB(newMatch.lineup_b2)) {
                alert("Each player must belong to the team you selected for that side.");
                return;
            }
        }
        const rosterRowToSide = (teamId: string, participantId: string) => {
            const list = addMatchRosters[teamId] || [];
            const r = list.find((x) => x.id === participantId);
            if (!r) throw new Error("missing roster");
            const cat = (r.category && String(r.category).trim()) || "—";
            return { id: r.id, name: r.player_name, category: cat };
        };
        let notesOut: string | null = null;
        if (lineupCount === 4) {
            const sideA = [
                rosterRowToSide(newMatch.team_a_id, newMatch.lineup_a1),
                rosterRowToSide(newMatch.team_a_id, newMatch.lineup_a2),
            ];
            const sideB = [
                rosterRowToSide(newMatch.team_b_id, newMatch.lineup_b1),
                rosterRowToSide(newMatch.team_b_id, newMatch.lineup_b2),
            ];
            const categoryKey = normalizeCategoryLabel(sideA[0].category) || "mixed";
            const payload: DoublesLinePayload = {
                type: "doubles_line",
                categoryKey,
                teamAId: newMatch.team_a_id,
                teamBId: newMatch.team_b_id,
                sideA,
                sideB,
            };
            notesOut = setUmpireInNotes(`${NOTES_JSON_MARK}${JSON.stringify(payload)}`, newMatch.umpire_name);
        } else {
            notesOut = setUmpireInNotes(null, newMatch.umpire_name);
        }
        try {
            const storedUser = localStorage.getItem("sf:user");
            const created_by = storedUser ? JSON.parse(storedUser).user_id : null;
            const { error } = await supabase.from("matches").insert({
                tournament_id: tournament.id,
                sport: tournament.sport,
                match_type: "tournament",
                status: "upcoming",
                team_a_id: newMatch.team_a_id,
                team_b_id: newMatch.team_b_id,
                court_number: newMatch.court_number || null,
                match_date: newMatch.match_date ? new Date(newMatch.match_date).toISOString() : null,
                match_number: newMatch.match_number || null,
                notes: notesOut,
                created_by,
            });
            if (error) throw error;
            setNewMatch({
                team_a_id: "",
                team_b_id: "",
                court_number: "",
                match_date: "",
                match_number: "",
                umpire_name: "",
                lineup_a1: "",
                lineup_a2: "",
                lineup_b1: "",
                lineup_b2: "",
            });
            setShowAdd(false);
            onRefresh();
            supabase
                .from("matches")
                .select("*, team_a:tournament_teams!team_a_id(id,name,short_name), team_b:tournament_teams!team_b_id(id,name,short_name)")
                .eq("tournament_id", tournament.id)
                .order("match_date", { ascending: true })
                .then(({ data }) => setMatches(data || []));
        } catch (e) {
            console.error(e);
            alert("Failed to create match");
        }
    };

    const handleSaveMatchUmpire = async (matchId: string, umpireName: string) => {
        const match = matches.find((m) => m.id === matchId) as TournamentMatch | undefined;
        if (!match) return;
        const nextNotes = setUmpireInNotes(match.notes, umpireName);
        const { error } = await supabase.from("matches").update({ notes: nextNotes }).eq("id", matchId);
        if (error) {
            alert("Failed to save umpire");
            return;
        }
        setMatches((prev) =>
            prev.map((m) => (m.id === matchId ? { ...(m as TournamentMatch), notes: nextNotes } : m)),
        );
    };

    const handleGenerateBalancedDoubles = async () => {
        const target = Math.min(50, Math.max(1, Math.floor(Number(doublesTargetPerPlayer) || 12)));
        const teamIds = teams.map((t) => t.id);
        setIsGenerating(true);
        try {
            const { data: rows, error } = await supabase
                .from("tournament_team_members")
                .select("team_id, participant_id, participant:tournament_participants(id, player_name, category)")
                .in("team_id", teamIds);
            if (error) throw error;
            const byTeam: Record<string, { participantId: string; name: string; category: string; categoryNorm: string }[]> = {};
            teams.forEach((t) => {
                byTeam[t.id] = [];
            });
            (rows || []).forEach((row: { team_id: string; participant_id: string; participant?: unknown }) => {
                const raw = row.participant;
                const p = Array.isArray(raw) ? raw[0] : raw;
                if (!p || typeof p !== "object" || !byTeam[row.team_id]) return;
                const part = p as { id: string; player_name?: string; category?: string | null };
                const categoryNorm = normalizeCategoryLabel(part.category ?? "");
                byTeam[row.team_id].push({
                    participantId: part.id,
                    name: part.player_name || "—",
                    category: (part.category && String(part.category).trim()) || "—",
                    categoryNorm,
                });
            });
            const rosters = teams.map((t) => ({
                teamId: t.id,
                teamName: t.name,
                players: byTeam[t.id] || [],
            }));
            const uniqueParticipantCount = (() => {
                const s = new Set<string>();
                rosters.forEach((r) => r.players.forEach((p) => s.add(p.participantId)));
                return s.size;
            })();
            const theoryMatches = theoreticalDoublesMatchCountIfFullyMet(uniqueParticipantCount, target);
            const theoryStr = Number.isInteger(theoryMatches) ? String(theoryMatches) : theoryMatches.toFixed(2);
            const result = generateBalancedDoublesSchedule(rosters, target, {
                randomTrials: 120,
                localSearchIterations: 500,
                teammateMax3RepeatPlayerNames: [
                    "Arvind",
                    "Ashok Nayak",
                    "Hardik Parekh",
                    "Jignesh",
                    "Mounish Ambaiya",
                    "Naitik",
                    "Om Chatbar",
                    "Parth Gandhi",
                    "Ritesh R Raul",
                    "Rohan",
                    "Viral Desai 501",
                    "Viral Desai",
                    "Vivek",
                ],
            });
            if (result.matches.length === 0) {
                alert(
                    "Could not build doubles schedule for target counts."
                );
                setIsGenerating(false);
                return;
            }
            const constraintNotes = result.coverageNotes && result.coverageNotes.length > 0
                ? `\n\nNotes:\n${result.coverageNotes.join("\n")}`
                : "";
            const storedUser = localStorage.getItem("sf:user");
            const created_by = storedUser ? JSON.parse(storedUser).user_id : null;
            const existingDd = matches.filter((m) => (m.match_number || "").startsWith("DD-")).length;
            if (existingDd > 0) {
                const { error: delErr } = await supabase
                    .from("matches")
                    .delete()
                    .eq("tournament_id", tournament.id)
                    .ilike("match_number", "DD-%");
                if (delErr) throw delErr;
            }
            let seq = 0;
            for (let i = 0; i < result.matches.length; i++) {
                const m = result.matches[i];
                seq += 1;
                const court_number = String((i % numCourts) + 1);
                const { error: insErr } = await supabase.from("matches").insert({
                    tournament_id: tournament.id,
                    sport: tournament.sport,
                    match_type: "tournament",
                    status: "upcoming",
                    team_a_id: m.teamAId,
                    team_b_id: m.teamBId,
                    court_number,
                    match_date: null,
                    match_number: `DD-${String(seq).padStart(3, "0")}`,
                    notes: formatDoublesMatchNotes(m),
                    created_by,
                });
                if (insErr) throw insErr;
            }
            onRefresh();
            supabase
                .from("matches")
                .select("*, team_a:tournament_teams!team_a_id(id,name,short_name), team_b:tournament_teams!team_b_id(id,name,short_name)")
                .eq("tournament_id", tournament.id)
                .order("match_date", { ascending: true })
                .then(({ data }) => setMatches(data || []));
            const shortN = result.unmetPlayerIds.length;
            const mathHint =
                `All teams mode. Target is 12 matches per player (${Math.floor((6 * 12) / 2)} matches per team).`;
            const coverageHint = `\n\nAll-teams mode with same-category pair vs same-category pair.`;
            const bestEffortWarn =
                shortN > 0 ? `\n\nBest-effort result: ${shortN} player(s) are below 12 matches.` : "";
            alert(
                shortN === 0
                    ? `Created ${result.matches.length} doubles matches (${target} appearances each). Replaced ${existingDd} old DD match(es).\n\n${mathHint}${coverageHint}${constraintNotes}\n\nLineups are in each match note.`
                    : `Created ${result.matches.length} doubles matches. Replaced ${existingDd} old DD match(es).\n\n${mathHint}${coverageHint}${bestEffortWarn}${constraintNotes}\n\nTry more overlapping category mixes across teams, or run again (randomized).`
            );
        } catch (e) {
            console.error(e);
            alert("Failed to generate balanced doubles schedule.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAssignTimesToExistingMatches = async () => {
        if (!assignSessionStart.trim()) {
            alert("Choose session start (e.g. Apr 11, 6:00 PM).");
            return;
        }
        const anchor = new Date(assignSessionStart);
        if (Number.isNaN(anchor.getTime())) {
            alert("Invalid date/time.");
            return;
        }
        const day2Clock = assignSessionDay2Time.trim() ? parseTimeInputToDailyClock(assignSessionDay2Time) : null;
        if (assignSessionDay2Time.trim() && !day2Clock) {
            alert("Invalid day 2 session start (use the time picker).");
            return;
        }
        const day1Clock = { hour: anchor.getHours(), minute: anchor.getMinutes() };
        const dailyStarts = day2Clock ? [day1Clock, day2Clock] : undefined;
        const defaultCourtKey = "1";
        const list = matches.filter((m) => {
            if (assignOverwriteTimes) return true;
            return !(m as TournamentMatch).match_date;
        });
        if (list.length === 0) {
            alert(
                assignOverwriteTimes
                    ? "No matches to update."
                    : "Every match already has a time, or there are no matches. Turn on “Overwrite existing times” to re-assign."
            );
            return;
        }
        const slotM = clampAssignSlotMinutes(assignSlotMinutes);
        const teamIds = [
            ...new Set(
                list.flatMap((m) => {
                    const tm = m as TournamentMatch;
                    return [tm.team_a_id, tm.team_b_id].filter(Boolean) as string[];
                })
            ),
        ];
        let rosterByTeamId = new Map<string, string[]>();
        if (teamIds.length > 0) {
            const { data: membRows, error: membErr } = await supabase
                .from("tournament_team_members")
                .select("team_id, participant_id")
                .in("team_id", teamIds);
            if (membErr) {
                console.error(membErr);
                alert("Could not load team rosters for smart scheduling.");
                return;
            }
            for (const row of membRows || []) {
                const tid = row.team_id as string;
                const pid = row.participant_id as string;
                if (!rosterByTeamId.has(tid)) rosterByTeamId.set(tid, []);
                rosterByTeamId.get(tid)!.push(pid);
            }
        }
        const enriched = list.map((m) => {
            const tm = m as TournamentMatch;
            return {
                id: tm.id,
                court_number: tm.court_number,
                match_number: tm.match_number,
                playerParticipantIds: participantIdsForMatchScheduling(
                    tm.notes,
                    tm.team_a_id ?? null,
                    tm.team_b_id ?? null,
                    rosterByTeamId
                ),
            };
        });
        let updates: { id: string; match_date: string }[];
        try {
            if (shouldUsePlayerAwareAssignment(enriched)) {
                updates = assignMatchTimesWithPlayerConstraints(enriched, {
                    anchorDate: anchor,
                    ...(dailyStarts ? { dailyStarts } : { dailyStart: day1Clock }),
                    dailyEnd: { hour: 25, minute: 0 },
                    slotMinutes: slotM,
                    defaultCourtKey,
                    maxConsecutivePlayingSlots: 2,
                    maxMatchesPerPlayerPerDay: 9,
                });
            } else {
                updates = assignMatchTimesByCourt(
                    enriched.map(({ id, court_number, match_number }) => ({ id, court_number, match_number })),
                    {
                        anchorDate: anchor,
                        ...(dailyStarts ? { dailyStarts } : { dailyStart: day1Clock }),
                        dailyEnd: { hour: 25, minute: 0 },
                        slotMinutes: slotM,
                        defaultCourtKey,
                    }
                );
            }
        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : "Could not build time slots.");
            return;
        }
        const day1Line = `Day 1: ${anchor.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} → 1:00 AM next day (local).`;
        const day2Line = day2Clock
            ? `Day 2+: ${new Date(2000, 0, 1, day2Clock.hour, day2Clock.minute).toLocaleTimeString(undefined, { timeStyle: "short" })} → 1:00 AM next day (local); further days match day 2.`
            : "Each day uses the same session start as day 1 until 1:00 AM next day.";
            const smartNote = shouldUsePlayerAwareAssignment(enriched)
            ? `\n\nPlayer-aware: fills each time slot on as many courts as possible (e.g. all 6:00 PM slots when lineups don’t share players). No double-booking; max 2 consecutive ${slotM}-minute matches per player without a gap; max 9 matches per player per day.`
            : "\n\n(No participant lineups in notes / rosters — per-court timing only.)";
        if (
            !confirm(
                `Assign ${updates.length} match time(s)?\n\n${day1Line}\n${day2Line}\nMatches without a court use ${courtDisplayLabelForKey(tournament, defaultCourtKey)}.${smartNote}`
            )
        ) {
            return;
        }
        setIsGenerating(true);
        try {
            for (const u of updates) {
                const { error } = await supabase.from("matches").update({ match_date: u.match_date }).eq("id", u.id);
                if (error) throw error;
            }
            onRefresh();
            supabase
                .from("matches")
                .select("*, team_a:tournament_teams!team_a_id(id,name,short_name), team_b:tournament_teams!team_b_id(id,name,short_name)")
                .eq("tournament_id", tournament.id)
                .order("match_date", { ascending: true })
                .then(({ data }) => setMatches(data || []));
            alert(`Updated ${updates.length} match time(s).`);
        } catch (e) {
            console.error(e);
            alert("Failed to update match times.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-4 min-w-0 w-full overflow-hidden">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end min-w-0">
                {canEdit ? (
                <div className="flex flex-wrap items-center gap-2 min-w-0 w-full sm:w-auto">
                    {isRoundRobin && (
                        <button
                            type="button"
                            onClick={handleGenerateRoundRobin}
                            disabled={isGenerating || teams.length < 2}
                            className="w-full sm:w-auto bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                            {isGenerating ? "Generating…" : "Generate round-robin schedule"}
                        </button>
                    )}
                    {isRoundRobin && teams.some((t) => t.category) && (
                        <>
                            <input
                                type="datetime-local"
                                value={scheduleBaseDate}
                                onChange={(e) => setScheduleBaseDate(e.target.value)}
                                className="w-full sm:min-w-0 px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm max-w-full"
                            />
                            <label className="flex items-center gap-2 text-sm text-gray-800 shrink-0">
                                <span className="text-xs text-gray-600 whitespace-nowrap">Min/match</span>
                                <input
                                    type="number"
                                    min={ASSIGN_SLOT_MINUTES_MIN}
                                    max={ASSIGN_SLOT_MINUTES_MAX}
                                    value={assignSlotMinutes}
                                    onChange={(e) => {
                                        const v = parseInt(e.target.value, 10);
                                        setAssignSlotMinutes(clampAssignSlotMinutes(Number.isFinite(v) ? v : DEFAULT_ASSIGN_SLOT_MINUTES));
                                    }}
                                    className="w-16 px-2 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                                    aria-label="Minutes per match for generated schedule"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={handleGenerateScheduleByCourtAndTime}
                                disabled={isGenerating || teams.length < 2}
                                className="w-full sm:w-auto bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                            >
                                {isGenerating ? "Generating…" : "Generate schedule (courts & times)"}
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={() => setShowAdd(!showAdd)}
                        className="w-full sm:w-auto bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
                    >
                        {showAdd ? "Cancel" : "Add Match"}
                    </button>
            </div>
                ) : <p className="text-sm text-gray-600">View only</p>}
                </div>
            {canEdit && matches.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                        <div className="min-w-0">
                            <label htmlFor="assign-session-start" className="block text-xs font-medium text-gray-600 mb-1">
                                Session start (day 1)
                            </label>
                            <input
                                id="assign-session-start"
                                type="datetime-local"
                                value={assignSessionStart}
                                onChange={(e) => setAssignSessionStart(e.target.value)}
                                className="w-full max-w-xs px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                            />
                        </div>
                        <div className="min-w-0">
                            <label htmlFor="assign-session-day2" className="block text-xs font-medium text-gray-600 mb-1">
                                Day 2+ start (optional)
                            </label>
                            <input
                                id="assign-session-day2"
                                type="time"
                                value={assignSessionDay2Time}
                                onChange={(e) => setAssignSessionDay2Time(e.target.value)}
                                className="w-full max-w-[11rem] px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                            />
                            <p className="text-[11px] text-gray-500 mt-1 max-w-xs">
                                Leave empty for the same start every day. If set, day 2+ use this time until 1:00 AM next day.
                            </p>
                        </div>
                        <div className="min-w-0">
                            <label htmlFor="assign-slot-minutes" className="block text-xs font-medium text-gray-600 mb-1">
                                Minutes per match
                            </label>
                            <input
                                id="assign-slot-minutes"
                                type="number"
                                min={ASSIGN_SLOT_MINUTES_MIN}
                                max={ASSIGN_SLOT_MINUTES_MAX}
                                value={assignSlotMinutes}
                                onChange={(e) => {
                                    const v = parseInt(e.target.value, 10);
                                    setAssignSlotMinutes(clampAssignSlotMinutes(Number.isFinite(v) ? v : DEFAULT_ASSIGN_SLOT_MINUTES));
                                }}
                                className="w-full max-w-[7rem] px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                            />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={assignOverwriteTimes}
                                onChange={(e) => setAssignOverwriteTimes(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            Overwrite existing times
                        </label>
                        <button
                            type="button"
                            onClick={handleAssignTimesToExistingMatches}
                            disabled={isGenerating}
                            className="w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                        >
                            {isGenerating ? "Updating…" : "Assign times to matches"}
                        </button>
                    </div>
                </div>
            )}
            {canEdit && teams.length >= 2 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 sm:p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="text-xs text-gray-700 whitespace-nowrap" htmlFor="doubles-target">
                            Target matches per player
                        </label>
                        <input
                            id="doubles-target"
                            type="number"
                            min={1}
                            max={50}
                            value={doublesTargetPerPlayer}
                            onChange={(e) => setDoublesTargetPerPlayer(parseInt(e.target.value, 10) || 12)}
                            className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm"
                        />
                        <button
                            type="button"
                            onClick={handleGenerateBalancedDoubles}
                            disabled={isGenerating}
                            className="bg-amber-700 text-white px-3 py-2 rounded-lg hover:bg-amber-800 disabled:opacity-50 text-sm font-medium"
                        >
                            {isGenerating ? "Generating…" : "Generate balanced doubles schedule"}
                        </button>
                    </div>
                </div>
            )}
            {canEdit && showAdd && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Team A</label>
                            <select
                                value={newMatch.team_a_id}
                                onChange={(e) =>
                                    setNewMatch((m) => ({
                                        ...m,
                                        team_a_id: e.target.value,
                                        lineup_a1: "",
                                        lineup_a2: "",
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                            >
                                <option value="">Select</option>
                                {teams.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                                    </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Team B</label>
                            <select
                                value={newMatch.team_b_id}
                                onChange={(e) =>
                                    setNewMatch((m) => ({
                                        ...m,
                                        team_b_id: e.target.value,
                                        lineup_b1: "",
                                        lineup_b2: "",
                                    }))
                                }
                                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md text-sm"
                            >
                                <option value="">Select</option>
                                {teams.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                                    </div>
                                </div>
                    {(newMatch.team_a_id || newMatch.team_b_id) && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 space-y-2">
                            <p className="text-xs text-gray-700">
                                <strong>Doubles lineup</strong> (optional): pick two players per team so the schedule and exports show who is playing.
                                Leave all empty if you only know the team matchup for now.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Team A players</p>
                                    {(addMatchRosters[newMatch.team_a_id] || []).length === 0 && newMatch.team_a_id ? (
                                        <p className="text-xs text-amber-800">No players on this team yet — add them on the Teams tab.</p>
                                    ) : null}
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Player 1</label>
                                        <select
                                            value={newMatch.lineup_a1}
                                            onChange={(e) => setNewMatch((m) => ({ ...m, lineup_a1: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                                            disabled={!newMatch.team_a_id}
                                        >
                                            <option value="">—</option>
                                            {(addMatchRosters[newMatch.team_a_id] || []).map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {formatPlayerNameWithCategory(p.player_name, p.category)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Player 2</label>
                                        <select
                                            value={newMatch.lineup_a2}
                                            onChange={(e) => setNewMatch((m) => ({ ...m, lineup_a2: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                                            disabled={!newMatch.team_a_id}
                                        >
                                            <option value="">—</option>
                                            {(addMatchRosters[newMatch.team_a_id] || []).map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {formatPlayerNameWithCategory(p.player_name, p.category)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Team B players</p>
                                    {(addMatchRosters[newMatch.team_b_id] || []).length === 0 && newMatch.team_b_id ? (
                                        <p className="text-xs text-amber-800">No players on this team yet — add them on the Teams tab.</p>
                                    ) : null}
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Player 1</label>
                                        <select
                                            value={newMatch.lineup_b1}
                                            onChange={(e) => setNewMatch((m) => ({ ...m, lineup_b1: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                                            disabled={!newMatch.team_b_id}
                                        >
                                            <option value="">—</option>
                                            {(addMatchRosters[newMatch.team_b_id] || []).map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {formatPlayerNameWithCategory(p.player_name, p.category)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">Player 2</label>
                                        <select
                                            value={newMatch.lineup_b2}
                                            onChange={(e) => setNewMatch((m) => ({ ...m, lineup_b2: e.target.value }))}
                                            className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                                            disabled={!newMatch.team_b_id}
                                        >
                                            <option value="">—</option>
                                            {(addMatchRosters[newMatch.team_b_id] || []).map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {formatPlayerNameWithCategory(p.player_name, p.category)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Court</label>
                            <select
                                value={newMatch.court_number}
                                onChange={(e) => setNewMatch((m) => ({ ...m, court_number: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md text-sm"
                            >
                                <option value="">—</option>
                                {courtKeys.map((ck) => (
                                    <option key={ck} value={ck}>
                                        {courtDisplayLabelForKey(tournament, ck)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date & time</label>
                            <input
                                type="datetime-local"
                                value={newMatch.match_date}
                                onChange={(e) => setNewMatch((m) => ({ ...m, match_date: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Match #</label>
                            <input
                                type="text"
                                value={newMatch.match_number}
                                onChange={(e) => setNewMatch((m) => ({ ...m, match_number: e.target.value }))}
                                placeholder="W01"
                                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Umpire</label>
                            <input
                                type="text"
                                value={newMatch.umpire_name}
                                onChange={(e) => setNewMatch((m) => ({ ...m, umpire_name: e.target.value }))}
                                placeholder="e.g. Harshita"
                                className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-md text-sm"
                            />
                        </div>
                    </div>
                    <button type="button" onClick={handleAddMatch} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">
                        Save Match
                    </button>
                </div>
            )}
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 sm:p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div>
                        <label htmlFor="sched-filter-day" className="block text-xs font-medium text-gray-600 mb-1">
                            Day
                        </label>
                        <select
                            id="sched-filter-day"
                            value={scheduleFilterDayKey}
                            onChange={(e) => setScheduleFilterDayKey(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                        >
                            <option value="">All days</option>
                            {scheduleDayOptions.map((d) => (
                                <option key={d.key} value={d.key}>
                                    {d.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="sched-filter-team" className="block text-xs font-medium text-gray-600 mb-1">
                            Team
                        </label>
                        <select
                            id="sched-filter-team"
                            value={scheduleFilterTeamId}
                            onChange={(e) => setScheduleFilterTeamId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                        >
                            <option value="">All teams</option>
                            {teams.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {displayTeamCardTitle(t.name)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="sched-filter-player" className="block text-xs font-medium text-gray-600 mb-1">
                            Player name contains
                        </label>
                        <input
                            id="sched-filter-player"
                            type="search"
                            value={scheduleFilterPlayer}
                            onChange={(e) => setScheduleFilterPlayer(e.target.value)}
                            placeholder="e.g. Aryan"
                            className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                        />
                    </div>
                </div>
                <p className="text-xs text-gray-600">
                    Total matches: <span className="font-medium text-gray-800">{filteredMatches.length}</span>
                    {filteredMatches.length !== matches.length ? (
                        <span className="text-gray-500"> (filtered from {matches.length})</span>
                    ) : null}
                </p>
                {matches.length > 0 && (
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 pt-3 border-t border-gray-200">
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={handleScheduleDownloadXlsx}
                                disabled={filteredMatches.length === 0}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-green-700 text-white hover:bg-green-800 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                Download .xlsx
                            </button>
                            <button
                                type="button"
                                onClick={handleScheduleDownloadPdf}
                                disabled={filteredMatches.length === 0}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                Download .pdf
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleScheduleDownloadPdfByCourt()}
                                disabled={filteredMatches.length === 0}
                                title="One full-width column per court, new page per court"
                                className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-600 text-slate-800 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                PDF by court
                            </button>
                        </div>
                        <p className="text-xs text-gray-600">
                            Total matches: <span className="font-medium text-gray-800">{filteredMatches.length}</span>
                            {filteredMatches.length !== matches.length ? (
                                <span className="text-gray-500"> (filtered from {matches.length})</span>
                            ) : null}
                        </p>
                    </div>
                                    )}
                                </div>
            {isMobileLayout && courtKeys.length > 1 && (
                <div className="flex flex-wrap gap-2">
                    {courtKeys.map((ck) => (
                        <button
                            key={ck}
                            type="button"
                            onClick={() => setMobileCourtKey(ck)}
                            className={`px-3 py-1.5 rounded-lg text-sm border ${
                                mobileCourtKey === ck
                                    ? "bg-gray-900 text-white border-gray-900"
                                    : "bg-white text-gray-700 border-gray-300"
                            }`}
                        >
                            {courtDisplayLabelForKey(tournament, ck)}
                        </button>
                    ))}
                </div>
            )}
            <div className="w-full min-w-0 overflow-x-auto">
                <AlignedMultiCourtScheduleGrid
                    matches={filteredMatches as TournamentMatch[]}
                    courtKeys={visibleCourtKeys}
                    courtHeaders={courtHeadersVisible}
                    poolSize={matches.length}
                    emptyHint={
                        matches.length > 0 && filteredMatches.length === 0
                            ? "No matches match filters."
                            : undefined
                    }
                    renderMatch={(m) => (
                        <ScheduleMatchCard
                            match={m}
                            tournament={tournament}
                            canEdit={canEdit}
                            onSaveUmpire={handleSaveMatchUmpire}
                        />
                    )}
                />
            </div>
            {matches.length === 0 && !showAdd && <p className="text-gray-600 text-sm">No matches yet. Add a match to build the schedule.</p>}
            {matches.length > 0 && filteredMatches.length === 0 && (scheduleFilterDayKey || scheduleFilterTeamId || scheduleFilterPlayer.trim()) && (
                <p className="text-amber-800 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    No matches match your filters. Try a different team, clear the player search, or another name.
                </p>
            )}
        </div>
    );
}

function bracketIndividualMatchSortRound(m: TournamentMatch): number {
    const mn = m.match_number || "";
    const bracket = mn.match(/R(\d+)/i);
    return bracket ? parseInt(bracket[1], 10) : 999;
}

/** Results / enter-scores list: scheduled matches by time and court; unscheduled by bracket round + label. */
function compareIndividualBracketResultsMatches(a: TournamentMatch, b: TournamentMatch): number {
    const ta = scheduleMatchDateMs(a);
    const tb = scheduleMatchDateMs(b);
    if (ta !== tb) return ta - tb;
    const ca = scheduleCourtNumKey(a);
    const cb = scheduleCourtNumKey(b);
    if (ca !== cb) return ca - cb;
    const ra = bracketIndividualMatchSortRound(a);
    const rb = bracketIndividualMatchSortRound(b);
    if (ra !== rb) return ra - rb;
    return (a.match_number || "").localeCompare(b.match_number || "", undefined, { numeric: true });
}

function BracketResultsTab({
    tournament,
    participants,
    onRefresh,
    canEdit = false,
    resultMatchId,
}: {
    tournament: Tournament;
    participants: Participant[];
    onRefresh: () => void;
    canEdit?: boolean;
    resultMatchId: string | null;
}) {
    const numSets = Math.min(5, Math.max(1, Number(tournament.sets_per_match) || 3));
    const [matches, setMatches] = useState<TournamentMatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [winnerPlayerId, setWinnerPlayerId] = useState("");
    const [setScores, setSetScores] = useState<string[]>(() => Array(numSets).fill(""));
    const supabase = createClient();
    const router = useRouter();
    const handledResultParamRef = useRef<string | null>(null);

    const bracketMatches = useMemo(() => {
        const rows = matches.filter(
            (m) => !m.team_a_id && !m.team_b_id && (m.match_type === "tournament" || m.match_type == null),
        );
        return [...rows].sort(compareIndividualBracketResultsMatches);
    }, [matches]);

    const refreshMatches = useCallback(() => {
        supabase
            .from("matches")
            .select("*, match_players(*)")
            .eq("tournament_id", tournament.id)
            .order("match_date", { ascending: true })
            .then(({ data }) => setMatches((data || []) as TournamentMatch[]));
    }, [tournament.id, supabase]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        supabase
            .from("matches")
            .select("*, match_players(*)")
            .eq("tournament_id", tournament.id)
            .order("match_date", { ascending: true })
            .then(({ data, error }) => {
                if (cancelled) return;
                if (error) console.error(error);
                setMatches((data || []) as TournamentMatch[]);
                setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [tournament.id, supabase]);

    useEffect(() => {
        if (!resultMatchId) {
            handledResultParamRef.current = null;
            return;
        }
        if (loading) return;
        if (handledResultParamRef.current === resultMatchId) return;

        const m = bracketMatches.find((x) => x.id === resultMatchId);
        handledResultParamRef.current = resultMatchId;

        if (m && m.status !== "completed") {
            setEditingId(m.id);
            setWinnerPlayerId(m.winner_id || "");
            setSetScores(parseFinalScoreToSets(m.final_score, numSets));
        }

        router.replace(`/scoring/tournaments/${tournament.id}?tab=results`, { scroll: false });
    }, [resultMatchId, loading, bracketMatches, tournament.id, router, numSets]);

    const handleSaveResult = async (matchId: string) => {
        const match = matches.find((m) => m.id === matchId);
        const winnerPlayer = match?.match_players?.find((p) => p.id === winnerPlayerId);
        const winnerOnSecondSide = winnerPlayer?.team === "player_2";
        const finalScoreStr = setScores
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => normalizeSetScoreToWinner(s, winnerOnSecondSide))
            .join(", ");
        try {
            const { error } = await supabase
                .from("matches")
                .update({
                    status: "completed",
                    winner_id: winnerPlayerId || null,
                    final_score: finalScoreStr || null,
                    completed_at: new Date().toISOString(),
                })
                .eq("id", matchId);
            if (error) throw error;
            setEditingId(null);
            setWinnerPlayerId("");
            setSetScores(Array(numSets).fill(""));
            onRefresh();
            refreshMatches();
        } catch (e) {
            console.error(e);
            alert("Failed to save result");
        }
    };

    const handleResetMatch = async (matchId: string) => {
        if (!confirm("Clear this result and set the match back to upcoming?")) return;
        try {
            const { error } = await supabase
                .from("matches")
                .update({
                    status: "upcoming",
                    winner_id: null,
                    winner_team_id: null,
                    final_score: null,
                    completed_at: null,
                })
                .eq("id", matchId);
            if (error) throw error;
            if (editingId === matchId) {
                setEditingId(null);
                setWinnerPlayerId("");
                setSetScores(Array(numSets).fill(""));
            }
            onRefresh();
            refreshMatches();
        } catch (e) {
            console.error(e);
            alert("Failed to reset match");
        }
    };

    const startEdit = (m: TournamentMatch) => {
        setEditingId(m.id);
        setWinnerPlayerId(m.winner_id || "");
        setSetScores(parseFinalScoreToSets(m.final_score, numSets));
    };

    const sidePlayer = (m: TournamentMatch, side: "player_1" | "player_2") =>
        m.match_players?.find((x) => x.team === side);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-gray-900">Results</h2>
                {!canEdit && <p className="text-sm text-gray-600">View only</p>}
            </div>
            {canEdit && (
                <p className="text-sm text-gray-600">
                    Record winner and set scores. Best of {numSets} sets — enter each set score (e.g. 21-10). Leave a set
                    blank if the match ended early (e.g. 2-0).
                </p>
            )}
            {loading ? (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 text-center text-gray-600 text-sm">
                    Loading results…
                </div>
            ) : (
                <div className="space-y-2">
                    {bracketMatches.map((match) => {
                        const m = match as TournamentMatch;
                        const isEditing = editingId === match.id;
                        const p1 = sidePlayer(m, "player_1");
                        const p2 = sidePlayer(m, "player_2");
                        const n1 = p1?.player_name ?? "TBD";
                        const n2 = p2?.player_name ?? "TBD";
                        const winnerP = m.match_players?.find((x) => x.id === m.winner_id);
                        const winnerLine = winnerP?.player_name ?? "—";
                        const winnerOptions = [p1, p2].filter(Boolean) as MatchPlayer[];

                        return (
                            <div key={match.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <BracketSinglesLineupBlocks
                                            nameA={n1}
                                            nameB={n2}
                                        />
                                        {m.match_date || (m.court_number != null && String(m.court_number).trim() !== "") ? (
                                            <div className="text-sm font-semibold text-gray-800 mt-2">
                                                {m.match_date
                                                    ? new Date(m.match_date).toLocaleString(undefined, {
                                                          weekday: "short",
                                                          month: "short",
                                                          day: "numeric",
                                                          hour: "numeric",
                                                          minute: "2-digit",
                                                      })
                                                    : "No time set"}
                                                {m.court_number != null && String(m.court_number).trim() !== ""
                                                    ? ` · ${formatStoredCourtForDisplay(tournament, m.court_number)}`
                                                    : ""}
                                            </div>
                                        ) : null}
                                        {m.match_number ? (
                                            <div className="text-xs text-gray-500 font-mono mt-1">{m.match_number}</div>
                                        ) : null}
                                        {match.status === "completed" && (
                                            <span className="text-gray-600 text-sm block sm:inline mt-2">
                                                Won by {winnerLine}
                                                {m.final_score ? ` · ${formatSetsForDisplay(m.final_score)}` : ""}
                                            </span>
                                        )}
                                    </div>
                                    {match.status !== "completed" ? (
                                        canEdit && isEditing ? (
                                            <div className="flex flex-col gap-3 w-full mt-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <select
                                                        value={winnerPlayerId}
                                                        onChange={(e) => setWinnerPlayerId(e.target.value)}
                                                        className="px-2 py-1 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                                                    >
                                                        <option value="">Select winner</option>
                                                        {winnerOptions.map((p) => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.player_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleSaveResult(match.id)}
                                                        className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEditingId(null);
                                                            setWinnerPlayerId("");
                                                            setSetScores(Array(numSets).fill(""));
                                                        }}
                                                        className="text-gray-700 hover:text-gray-900 text-sm font-medium"
                                                    >
                                                        Cancel
                                                    </button>
                </div>
                                                <div className="flex flex-wrap items-center gap-3">
                                                    {Array.from({ length: numSets }, (_, i) => (
                                                        <div key={i} className="flex items-center gap-1">
                                                            <label className="text-xs text-gray-600 whitespace-nowrap">
                                                                Set {i + 1}
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={setScores[i] ?? ""}
                                                                onChange={(e) => {
                                                                    const next = [...setScores];
                                                                    next[i] = e.target.value;
                                                                    setSetScores(next);
                                                                }}
                                                                placeholder="21-10"
                                                                className="w-16 px-2 py-1 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : canEdit ? (
                                            <button
                                                type="button"
                                                onClick={() => startEdit(m)}
                                                className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium shrink-0"
                                            >
                                                Enter result
                                            </button>
                                        ) : (
                                            <span className="text-gray-600 text-sm">Upcoming</span>
                                        )
                                    ) : (
                                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                                            <span className="text-green-600 text-sm font-medium">Completed</span>
                                            {canEdit ? (
                                                <button
                                                    type="button"
                                                    onClick={() => void handleResetMatch(match.id)}
                                                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
                                                >
                                                    Reset match
                                                </button>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {!loading && bracketMatches.length === 0 && (
                <p className="text-gray-600 text-sm">No bracket matches yet. Generate brackets to create matches.</p>
            )}
        </div>
    );
}

function TeamResultsTab({ tournament, onRefresh, canEdit = false }: { tournament: Tournament; onRefresh: () => void; canEdit?: boolean }) {
    const numSets = Math.min(5, Math.max(1, Number(tournament.sets_per_match) || 3));
    const [matches, setMatches] = useState<TournamentMatch[]>([]);
    const [teams, setTeams] = useState<TournamentTeam[]>([]);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [winnerId, setWinnerId] = useState("");
    const [setScores, setSetScores] = useState<string[]>(() => Array(numSets).fill(""));
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "live" | "completed">("all");
    const [dayFilter, setDayFilter] = useState("all");
    const [courtFilter, setCourtFilter] = useState("all");
    const [timeFilter, setTimeFilter] = useState("all");
    const supabase = createClient();
    const teamIds = teams.map((t) => t.id);
    const memberNamesByTeam = useTeamMemberNames(teamIds);

    useEffect(() => {
        supabase.from("tournament_teams").select("*").eq("tournament_id", tournament.id).then(({ data }) => setTeams(data || []));
        supabase
            .from("matches")
            .select("*, team_a:tournament_teams!team_a_id(id,name,short_name), team_b:tournament_teams!team_b_id(id,name,short_name), winner_team:tournament_teams!winner_team_id(id,name)")
            .eq("tournament_id", tournament.id)
            .order("match_date", { ascending: true })
            .then(({ data }) => setMatches(data || []));
    }, [tournament.id, supabase]);

    const handleSaveResult = async (m: TournamentMatch) => {
        const winnerOnTeamB = Boolean(winnerId && m.team_b_id && winnerId === m.team_b_id);
        const normalizedScores = setScores
            .map((s) => s.trim())
            .filter(Boolean)
            .map((s) => normalizeSetScoreToWinner(s, winnerOnTeamB));
        const finalScoreStr = normalizedScores.join(", ");
        try {
            const { error } = await supabase
                .from("matches")
                .update({
                    status: "completed",
                    winner_team_id: winnerId || null,
                    final_score: finalScoreStr || null,
                    completed_at: new Date().toISOString(),
                })
                .eq("id", m.id);
            if (error) throw error;
            setEditingId(null);
            setWinnerId("");
            setSetScores(Array(numSets).fill(""));
            onRefresh();
            supabase
                .from("matches")
                .select("*, team_a:tournament_teams!team_a_id(id,name,short_name), team_b:tournament_teams!team_b_id(id,name,short_name), winner_team:tournament_teams!winner_team_id(id,name)")
                .eq("tournament_id", tournament.id)
                .order("match_date", { ascending: true })
                .then(({ data }) => setMatches(data || []));
        } catch (e) {
            console.error(e);
            alert("Failed to save result");
        }
    };

    const handleResetMatch = async (matchId: string) => {
        if (!confirm("Clear this result and set the match back to upcoming?")) return;
        try {
            const { error } = await supabase
                .from("matches")
                .update({
                    status: "upcoming",
                    winner_team_id: null,
                    winner_id: null,
                    final_score: null,
                    completed_at: null,
                })
                .eq("id", matchId);
            if (error) throw error;
            if (editingId === matchId) {
                setEditingId(null);
                setWinnerId("");
                setSetScores(Array(numSets).fill(""));
            }
            onRefresh();
            supabase
                .from("matches")
                .select("*, team_a:tournament_teams!team_a_id(id,name,short_name), team_b:tournament_teams!team_b_id(id,name,short_name), winner_team:tournament_teams!winner_team_id(id,name)")
                .eq("tournament_id", tournament.id)
                .order("match_date", { ascending: true })
                .then(({ data }) => setMatches(data || []));
        } catch (e) {
            console.error(e);
            alert("Failed to reset match");
        }
    };

    const startEdit = (m: TournamentMatch) => {
        setEditingId(m.id);
        setWinnerId(m.winner_team_id || "");
        setSetScores(parseFinalScoreToSets(m.final_score, numSets));
    };

    /** Same session-day grouping as Schedule (matches after midnight until 1:00 AM count as previous calendar day). */
    const resultsSessionDayOptions = useMemo(() => {
        const dayKeys = sortScheduleDayKeys(
            [...new Set(matches.map((m) => scheduleMatchDayKey(m as TournamentMatch)))].filter((k) => k !== "unscheduled"),
        );
        return dayKeys.map((key, idx) => ({ key, label: `Day ${idx + 1}` }));
    }, [matches]);

    const courtKeyForMatch = useCallback((m: TournamentMatch): string => {
        const raw = String(m.court_number ?? "").trim();
        if (!raw) return "none";
        const digits = raw.replace(/\D/g, "");
        return digits || raw;
    }, []);

    const courtLabelForKey = useCallback((k: string): string => {
        if (k === "none") return "No court";
        return courtDisplayLabelForKey(tournament, k);
    }, [tournament]);

    const courtOptions = useMemo(() => {
        const uniq = Array.from(new Set(matches.map((m) => courtKeyForMatch(m))));
        const withCourt = uniq.filter((k) => k !== "none").sort((a, b) => {
            const an = parseInt(a, 10);
            const bn = parseInt(b, 10);
            if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
            return a.localeCompare(b, undefined, { sensitivity: "base" });
        });
        return uniq.includes("none") ? [...withCourt, "none"] : withCourt;
    }, [matches, courtKeyForMatch]);

    const timeKeyForMatch = useCallback((m: TournamentMatch): string => {
        if (!m.match_date) return "unscheduled";
        const d = new Date(m.match_date);
        if (Number.isNaN(d.getTime())) return "unscheduled";
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }, []);

    const timeLabelForKey = useCallback((k: string): string => {
        if (k === "unscheduled") return "No time";
        const [hh, mm] = k.split(":").map((v) => parseInt(v, 10));
        const d = new Date(2000, 0, 1, Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0);
        return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }, []);

    const timeOptions = useMemo(() => {
        const uniq = Array.from(new Set(matches.map((m) => timeKeyForMatch(m))));
        const withTime = uniq.filter((k) => k !== "unscheduled").sort();
        return uniq.includes("unscheduled") ? [...withTime, "unscheduled"] : withTime;
    }, [matches, timeKeyForMatch]);

    const normalizedSearch = searchQuery.trim().toLowerCase();
    const filteredMatches = useMemo(() => {
        return matches.filter((m) => {
            if (statusFilter !== "all" && m.status !== statusFilter) return false;
            if (dayFilter !== "all" && scheduleMatchDayKey(m as TournamentMatch) !== dayFilter) return false;
            if (courtFilter !== "all" && courtKeyForMatch(m) !== courtFilter) return false;
            if (timeFilter !== "all" && timeKeyForMatch(m) !== timeFilter) return false;
            if (!normalizedSearch) return true;

            const teamAName = displayTeamCardTitle(m.team_a?.name ?? teams.find((t) => t.id === m.team_a_id)?.name ?? "TBD");
            const teamBName = displayTeamCardTitle(m.team_b?.name ?? teams.find((t) => t.id === m.team_b_id)?.name ?? "TBD");
            const winnerName = displayTeamCardTitle((m.winner_team as { name?: string })?.name ?? teams.find((t) => t.id === m.winner_team_id)?.name ?? "");
            const doublesPayload = parseDoublesMatchNotes(m.notes);
            const doublesPlayerNames = doublesPayload
                ? [...doublesPayload.sideA.map((p) => p.name), ...doublesPayload.sideB.map((p) => p.name)].join(" ")
                : "";
            const memberNames = [...(memberNamesByTeam[m.team_a_id || ""] || []), ...(memberNamesByTeam[m.team_b_id || ""] || [])].join(" ");
            const haystack = `${teamAName} ${teamBName} ${winnerName} ${doublesPlayerNames} ${memberNames} ${m.match_number ?? ""} ${m.court_number ?? ""}`.toLowerCase();
            return haystack.includes(normalizedSearch);
        });
    }, [matches, statusFilter, dayFilter, courtFilter, courtKeyForMatch, timeFilter, timeKeyForMatch, normalizedSearch, teams, memberNamesByTeam]);

    const hasActiveFilters = Boolean(normalizedSearch) || statusFilter !== "all" || dayFilter !== "all" || courtFilter !== "all" || timeFilter !== "all";

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-gray-900">Results</h2>
                {!canEdit && <p className="text-sm text-gray-600">View only</p>}
            </div>
            {canEdit && <p className="text-sm text-gray-600">Record winner and set scores. Best of {numSets} sets — enter each set score (e.g. 21-10). Leave a set blank if the match ended early (e.g. 2-0).</p>}
            <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search team or player name"
                        className="w-full sm:max-w-xs px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                    />
                    <select
                        value={dayFilter}
                        onChange={(e) => setDayFilter(e.target.value)}
                        aria-label="Day (session runs until 1:00 AM next calendar day)"
                        className="w-full sm:w-auto px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                    >
                        <option value="all">All days</option>
                        {resultsSessionDayOptions.map((d) => (
                            <option key={d.key} value={d.key}>
                                {d.label}
                            </option>
                        ))}
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as "all" | "upcoming" | "live" | "completed")}
                        className="w-full sm:w-auto px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                    >
                        <option value="all">All status</option>
                        <option value="upcoming">Upcoming</option>
                        <option value="live">Live</option>
                        <option value="completed">Completed</option>
                    </select>
                    <select
                        value={courtFilter}
                        onChange={(e) => setCourtFilter(e.target.value)}
                        className="w-full sm:w-auto px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                    >
                        <option value="all">All courts</option>
                        {courtOptions.map((k) => (
                            <option key={k} value={k}>
                                {courtLabelForKey(k)}
                            </option>
                        ))}
                    </select>
                    <select
                        value={timeFilter}
                        onChange={(e) => setTimeFilter(e.target.value)}
                        className="w-full sm:w-auto px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                    >
                        <option value="all">All times</option>
                        {timeOptions.map((k) => (
                            <option key={k} value={k}>
                                {timeLabelForKey(k)}
                            </option>
                        ))}
                    </select>
                    {hasActiveFilters ? (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery("");
                                setDayFilter("all");
                                setStatusFilter("all");
                                setCourtFilter("all");
                                setTimeFilter("all");
                            }}
                            className="w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Clear filters
                        </button>
                    ) : null}
                    <p className="text-xs text-gray-600 sm:ml-auto">
                        Showing {filteredMatches.length} of {matches.length}
                    </p>
                </div>
            </div>
            <div className="space-y-2">
                {filteredMatches.map((match) => {
                    const m = match as TournamentMatch;
                    const isEditing = editingId === match.id;
                    const matchTeams = [m.team_a, m.team_b].filter(Boolean);
                    const winnerOptions = matchTeams.length >= 2 ? matchTeams : teams.filter((t) => t.id === m.team_a_id || t.id === m.team_b_id);
                    const na = displayTeamCardTitle(m.team_a?.name ?? teams.find((t) => t.id === m.team_a_id)?.name ?? "TBD");
                    const nb = displayTeamCardTitle(m.team_b?.name ?? teams.find((t) => t.id === m.team_b_id)?.name ?? "TBD");
                    const doublesPayload = parseDoublesMatchNotes(m.notes);
                    const getSideLabelForTeam = (teamId?: string | null) => {
                        if (!teamId) return "—";
                        if (doublesPayload) {
                            const side =
                                teamId === doublesPayload.teamAId
                                    ? doublesPayload.sideA
                                    : teamId === doublesPayload.teamBId
                                        ? doublesPayload.sideB
                                        : [];
                            if (side.length > 0) {
                                return side
                                    .slice(0, 2)
                                    .map((p) => formatPlayerNameWithCategory(p.name, p.category))
                                    .join(" & ");
                            }
                        }
                        const teamName = (teamId === m.team_a_id ? m.team_a?.name : teamId === m.team_b_id ? m.team_b?.name : undefined)
                            ?? teams.find((t) => t.id === teamId)?.name
                            ?? "—";
                        return displayTeamCardTitle(teamName);
                    };
                    const winnerRaw = getSideLabelForTeam(m.winner_team_id);
                    const isDone = match.status === "completed";
                    const wId = m.winner_team_id;
                    const aWon = Boolean(isDone && wId && wId === m.team_a_id);
                    const bWon = Boolean(isDone && wId && wId === m.team_b_id);
                    return (
                        <div key={match.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    {!doublesPayload ? (
                                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                            <>
                                                <span
                                                    className={`text-base font-bold leading-snug inline-flex items-center gap-1.5 flex-wrap ${aWon ? "text-emerald-900" : "text-gray-900"}`}
                                                >
                                                    {aWon ? (
                                                        <span className="text-lg leading-none" title="Winner" aria-label="Winner">
                                                            🏆
                                                        </span>
                                                    ) : null}
                                                    {na}
                                                    {aWon ? (
                                                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                                            Winner
                                                        </span>
                                                    ) : null}
                                                </span>
                                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">
                                                    vs
                                                </span>
                                                <span
                                                    className={`text-base font-bold leading-snug inline-flex items-center gap-1.5 flex-wrap ${bWon ? "text-emerald-900" : "text-gray-900"}`}
                                                >
                                                    {bWon ? (
                                                        <span className="text-lg leading-none" title="Winner" aria-label="Winner">
                                                            🏆
                                                        </span>
                                                    ) : null}
                                                    {nb}
                                                    {bWon ? (
                                                        <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                                            Winner
                                                        </span>
                                                    ) : null}
                                                </span>
                                            </>
                                        </div>
                                    ) : null}
                                    {doublesPayload ? (
                                        <DoublesLineupBlocks
                                            payload={doublesPayload}
                                            winnerTeamId={isDone ? wId ?? null : null}
                                        />
                                    ) : null}
                                    {match.status === "completed" && (
                                        <span className="ml-2 text-gray-600 text-sm block sm:inline">
                                            Won by {displayTeamCardTitle(winnerRaw)}
                                            {m.final_score ? ` · ${formatSetsForDisplay(m.final_score)}` : ""}
                                        </span>
                                    )}
                                </div>
                                {match.status !== "completed" ? (
                                    canEdit && isEditing ? (
                                        <div className="flex flex-col gap-3 w-full mt-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <select
                                                    value={winnerId}
                                                    onChange={(e) => setWinnerId(e.target.value)}
                                                    className="px-2 py-1 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                                                >
                                                    <option value="">Select winner</option>
                                                    {winnerOptions.filter((t): t is NonNullable<typeof t> => t != null).map((t) => (
                                                        <option key={t.id} value={t.id}>{getSideLabelForTeam(t.id)}</option>
                                                    ))}
                                                </select>
                                                <button type="button" onClick={() => handleSaveResult(m)} className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-medium">Save</button>
                                                <button type="button" onClick={() => { setEditingId(null); setWinnerId(""); setSetScores(Array(numSets).fill("")); }} className="text-gray-700 hover:text-gray-900 text-sm font-medium">Cancel</button>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-3">
                                                {Array.from({ length: numSets }, (_, i) => (
                                                    <div key={i} className="flex items-center gap-1">
                                                        <label className="text-xs text-gray-600 whitespace-nowrap">Set {i + 1}</label>
                                                        <input
                                                            type="text"
                                                            value={setScores[i] ?? ""}
                                                            onChange={(e) => {
                                                                const next = [...setScores];
                                                                next[i] = e.target.value;
                                                                setSetScores(next);
                                                            }}
                                                            placeholder="21-10"
                                                            className="w-16 px-2 py-1 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : canEdit ? (
                                        <button type="button" onClick={() => startEdit(m)} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium shrink-0">Enter result</button>
                                    ) : (
                                        <span className="text-gray-600 text-sm">Upcoming</span>
                                    )
                                ) : (
                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                        <span className="text-green-600 text-sm font-medium">Completed</span>
                                        {canEdit ? (
                                            <button
                                                type="button"
                                                onClick={() => void handleResetMatch(match.id)}
                                                className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
                                            >
                                                Reset match
                                            </button>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {matches.length === 0 && <p className="text-gray-600 text-sm">No matches. Add matches in the Schedule tab first.</p>}
            {matches.length > 0 && filteredMatches.length === 0 && (
                <p className="text-gray-600 text-sm">No matches found for the selected filters.</p>
            )}
        </div>
    );
}

function GeneratePlayoffsBlock({
    tournament,
    qualifiedTeams,
    onRefresh,
}: {
    tournament: Tournament;
    qualifiedTeams: TournamentTeam[];
    onRefresh: () => void;
}) {
    const [existingQF, setExistingQF] = useState<TournamentMatch[]>([]);
    const [generating, setGenerating] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        supabase
            .from("matches")
            .select("*, team_a:tournament_teams!team_a_id(id,name), team_b:tournament_teams!team_b_id(id,name)")
            .eq("tournament_id", tournament.id)
            .in("match_number", ["QF1", "QF2", "QF3", "QF4"])
            .then(({ data }) => setExistingQF((data || []) as TournamentMatch[]));
    }, [tournament.id, supabase]);

    const handleGenerate = async () => {
        if (qualifiedTeams.length < 8) return;
        setGenerating(true);
        try {
            const storedUser = localStorage.getItem("sf:user");
            const created_by = storedUser ? JSON.parse(storedUser).user_id : null;
            const t = qualifiedTeams;
            const nc = getCourtCount(tournament);
            await supabase.from("matches").insert([
                { tournament_id: tournament.id, sport: tournament.sport, match_type: "tournament", status: "upcoming", team_a_id: t[0].id, team_b_id: t[7].id, match_number: "QF1", court_number: String((0 % nc) + 1), created_by },
                { tournament_id: tournament.id, sport: tournament.sport, match_type: "tournament", status: "upcoming", team_a_id: t[3].id, team_b_id: t[4].id, match_number: "QF2", court_number: String((1 % nc) + 1), created_by },
                { tournament_id: tournament.id, sport: tournament.sport, match_type: "tournament", status: "upcoming", team_a_id: t[1].id, team_b_id: t[6].id, match_number: "QF3", court_number: String((2 % nc) + 1), created_by },
                { tournament_id: tournament.id, sport: tournament.sport, match_type: "tournament", status: "upcoming", team_a_id: t[2].id, team_b_id: t[5].id, match_number: "QF4", court_number: String((3 % nc) + 1), created_by },
            ]);
            onRefresh();
            supabase
                .from("matches")
                .select("*, team_a:tournament_teams!team_a_id(id,name), team_b:tournament_teams!team_b_id(id,name)")
                .eq("tournament_id", tournament.id)
                .in("match_number", ["QF1", "QF2", "QF3", "QF4"])
                .then(({ data }) => setExistingQF((data || []) as TournamentMatch[]));
        } catch (e) {
            console.error(e);
            alert("Failed to create quarter-final matches.");
        } finally {
            setGenerating(false);
        }
    };

    if (qualifiedTeams.length < 8) return null;
    const nc = getCourtCount(tournament);
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="font-medium text-gray-900 mb-2">Playoffs: Quarter-finals → Semis → Finals</h3>
            {existingQF.length >= 4 ? (
                <p className="text-sm text-gray-600">QF1–QF4 already created ({nc} court{nc === 1 ? "" : "s"}). Enter results in Results tab; then add Semi 1, Semi 2, and Final matches in Schedule when ready.</p>
            ) : (
                <>
                    <p className="text-sm text-gray-600 mb-2">8 qualified: {qualifiedTeams.map((t) => t.name).join(", ")}</p>
                    <p className="text-xs text-gray-500 mb-2">
                        {`QF1 (${courtDisplayLabelForKey(tournament, String((0 % nc) + 1))}): 1st vs 8th · QF2 (${courtDisplayLabelForKey(tournament, String((1 % nc) + 1))}): 4th vs 5th · QF3 (${courtDisplayLabelForKey(tournament, String((2 % nc) + 1))}): 2nd vs 7th · QF4 (${courtDisplayLabelForKey(tournament, String((3 % nc) + 1))}): 3rd vs 6th. Winners go to semis, then final.`}
                    </p>
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={generating}
                        className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm disabled:opacity-50"
                    >
                        {generating ? "Creating…" : `Generate quarter-finals (QF1–QF4) on ${nc} court${nc === 1 ? "" : "s"}`}
                    </button>
                </>
            )}
        </div>
    );
}

/** Standings: points awarded per match win on team vs player leaderboards. */
const TEAM_STANDINGS_POINTS_PER_WIN = 20;
const PLAYER_STANDINGS_POINTS_PER_WIN = 10;

/** Participant IDs on the winning side from doubles lineup notes; empty if not attributable. */
function winningParticipantIdsFromTeamDoublesMatch(m: TournamentMatch): string[] {
    const winner = m.winner_team_id;
    if (!winner) return [];
    const doubles = parseDoublesMatchNotes(m.notes);
    if (!doubles) return [];
    if (winner === doubles.teamAId) return doubles.sideA.map((s) => s.id);
    if (winner === doubles.teamBId) return doubles.sideB.map((s) => s.id);
    return [];
}

function TeamStatsTab({ tournament, canEdit = false }: { tournament: Tournament; canEdit?: boolean }) {
    const [matches, setMatches] = useState<TournamentMatch[]>([]);
    const [teams, setTeams] = useState<TournamentTeam[]>([]);
    const [members, setMembers] = useState<(TournamentTeamMember & { participant?: Participant })[]>([]);
    const [expandedTeamIds, setExpandedTeamIds] = useState<Set<string>>(new Set());
    const supabase = createClient();

    useEffect(() => {
        supabase.from("tournament_teams").select("*").eq("tournament_id", tournament.id).order("name").then(({ data }) => setTeams(data || []));
        supabase
            .from("tournament_team_members")
            .select("*, participant:tournament_participants(*)")
            .then(({ data }) => {
                const byTournament = (data || []).filter((m: TournamentTeamMember & { participant?: Participant }) => {
                    const p = m.participant;
                    return p?.tournament_id === tournament.id;
                });
                setMembers(byTournament);
            });
        supabase
            .from("matches")
            .select("*, team_a:tournament_teams!team_a_id(id,name), team_b:tournament_teams!team_b_id(id,name), winner_team:tournament_teams!winner_team_id(id,name)")
            .eq("tournament_id", tournament.id)
            .eq("status", "completed")
            .then(({ data }) => setMatches(data || []));
    }, [tournament.id, supabase]);

    const stats: Record<string, { played: number; won: number; lost: number; pointsFor: number; pointsAgainst: number }> = {};
    teams.forEach((t) => { stats[t.id] = { played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 }; });
    matches.forEach((m) => {
        const ma = (m as TournamentMatch).team_a_id;
        const mb = (m as TournamentMatch).team_b_id;
        const winner = (m as TournamentMatch).winner_team_id;
        if (ma && stats[ma]) {
            stats[ma].played += 1;
            if (winner === ma) stats[ma].won += 1; else stats[ma].lost += 1;
        }
        if (mb && stats[mb]) {
            stats[mb].played += 1;
            if (winner === mb) stats[mb].won += 1; else stats[mb].lost += 1;
        }
        const score = (m as TournamentMatch).final_score;
        if (score && typeof score === "string") {
            const sets = score.split(",").map((s) => s.trim()).filter(Boolean);
            let pfA = 0, pfB = 0;
            sets.forEach((setStr) => {
                const parts = setStr.split("-").map((n) => parseInt(n.trim(), 10));
                if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    pfA += parts[0];
                    pfB += parts[1];
                }
            });
            if (ma && stats[ma]) { stats[ma].pointsFor += pfA; stats[ma].pointsAgainst += pfB; }
            if (mb && stats[mb]) { stats[mb].pointsFor += pfB; stats[mb].pointsAgainst += pfA; }
        }
    });
    const withPts = teams.map((t) => ({
        team: t,
        ...stats[t.id],
        pts: stats[t.id].won * TEAM_STANDINGS_POINTS_PER_WIN,
        pointsDifference: stats[t.id].pointsFor - stats[t.id].pointsAgainst,
    }));
    const sorted = withPts.sort((a, b) => {
        if (a.pts !== b.pts) return b.pts - a.pts;
        return (b.pointsDifference ?? 0) - (a.pointsDifference ?? 0);
    });

    const byCategory: Record<string, typeof sorted> = {};
    sorted.forEach((row) => {
        const cat = (row.team.category != null && String(row.team.category).trim() !== "") ? String(row.team.category).trim() : "—";
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(row);
    });
    const categoriesOrdered = Object.keys(byCategory).sort();
    categoriesOrdered.forEach((cat) => {
        byCategory[cat].sort((a, b) => {
            if (a.pts !== b.pts) return b.pts - a.pts;
            return (b.pointsDifference ?? 0) - (a.pointsDifference ?? 0);
        });
    });
    const eligible = sorted.filter((r) => r.played >= 1 && r.won >= 1);
    const topPerCategory = categoriesOrdered
        .map((cat) => byCategory[cat].find((r) => r.played >= 1 && r.won >= 1))
        .filter((r): r is NonNullable<typeof r> => Boolean(r));
    const needEightQF = 8;
    const qualifiedForQF = [...topPerCategory];
    if (qualifiedForQF.length < needEightQF && eligible.length > topPerCategory.length) {
        const alreadyIn = new Set(qualifiedForQF.map((r) => r.team.id));
        const rest = eligible.filter((r) => !alreadyIn.has(r.team.id));
        for (let i = 0; i < rest.length && qualifiedForQF.length < needEightQF; i++) {
            qualifiedForQF.push(rest[i]);
        }
    }

    const memberRowsByTeam = useMemo(() => {
        const byTeam: Record<string, { id: string; name: string; points: number }[]> = {};
        const ptsByMemberId: Record<string, number> = {};
        members.forEach((m) => {
            ptsByMemberId[m.id] = 0;
        });
        matches.forEach((m) => {
            const winner = (m as TournamentMatch).winner_team_id;
            if (!winner) return;
            const winPids = winningParticipantIdsFromTeamDoublesMatch(m as TournamentMatch);
            if (winPids.length === 0) return;
            for (const pid of winPids) {
                const mem = members.find((x) => x.participant_id === pid && x.team_id === winner);
                if (mem) {
                    ptsByMemberId[mem.id] = (ptsByMemberId[mem.id] || 0) + PLAYER_STANDINGS_POINTS_PER_WIN;
                }
            }
        });
        members.forEach((m) => {
            if (!byTeam[m.team_id]) byTeam[m.team_id] = [];
            byTeam[m.team_id].push({
                id: m.id,
                name: m.participant?.player_name || "—",
                points: ptsByMemberId[m.id] || 0,
            });
        });
        Object.keys(byTeam).forEach((tid) => {
            byTeam[tid].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
        });
        return byTeam;
    }, [members, matches]);

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Team standings</h2>
            <p className="text-sm text-gray-600">
                Ranked by PTS, then point difference (PD). {TEAM_STANDINGS_POINTS_PER_WIN} points per team win. Only teams with at
                least one win can qualify. Top 1 per category (by PTS, PD) → QF; next best fill to 8. Then QF → Semis → Finals.
            </p>
            <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
                <table className="min-w-full overflow-hidden">
                    <thead className="bg-white border-b border-gray-200">
                        <tr>
                            <th className="text-left py-2.5 px-4 text-xs font-medium uppercase tracking-wide text-gray-600">Team</th>
                            <th className="text-center py-2.5 px-3 text-xs font-medium uppercase tracking-wide text-gray-600">PL</th>
                            <th className="text-center py-2.5 px-3 text-xs font-medium uppercase tracking-wide text-gray-600">W</th>
                            <th className="text-center py-2.5 px-3 text-xs font-medium uppercase tracking-wide text-gray-600">L</th>
                            <th className="text-center py-2.5 px-3 text-xs font-medium uppercase tracking-wide text-gray-600">PTS</th>
                            <th className="text-center py-2.5 px-3 text-xs font-medium uppercase tracking-wide text-gray-600">PD</th>
                            <th className="text-center py-2.5 px-3 text-xs font-medium uppercase tracking-wide text-gray-600">#</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((row, idx) => {
                            const isQualified = qualifiedForQF.some((q) => q && q.team && q.team.id === row.team.id);
                            const isExpanded = expandedTeamIds.has(row.team.id);
                            const rank = idx + 1;
                            const rankDisplay = rank === 1 ? <span className="text-xl" title="1st" aria-label="1st">🥇</span>
                                : rank === 2 ? <span className="text-xl" title="2nd" aria-label="2nd">🥈</span>
                                : rank === 3 ? <span className="text-xl" title="3rd" aria-label="3rd">🥉</span>
                                : <span className="text-gray-700">{rank}</span>;
                            const teamMembers = memberRowsByTeam[row.team.id] || [];
                            return (
                            <Fragment key={row.team.id}>
                                <tr
                                    className="border-t border-gray-200 cursor-pointer"
                                    style={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FFF5F5" }}
                                    onClick={() =>
                                        setExpandedTeamIds((prev) => {
                                            const next = new Set(prev);
                                            if (next.has(row.team.id)) next.delete(row.team.id);
                                            else next.add(row.team.id);
                                            return next;
                                        })
                                    }
                                >
                                    <td className="py-2.5 px-4 text-sm sm:text-base font-semibold text-gray-900">
                                        <span className="inline-flex items-center gap-2">
                                            <span className="text-xs text-gray-500">{isExpanded ? "▼" : "▶"}</span>
                                            {stripTrailingBracketLabel(row.team.name)}
                                        </span>
                                        {isQualified && <span className="ml-2 text-red-600 text-xs font-medium">→ QF</span>}
                                    </td>
                                    <td className="py-2.5 px-3 text-sm text-center text-gray-700">{row.played}</td>
                                    <td className="py-2.5 px-3 text-sm text-center text-gray-700">{row.won}</td>
                                    <td className="py-2.5 px-3 text-sm text-center text-gray-700">{row.lost}</td>
                                    <td className="py-2.5 px-3 text-sm text-center text-gray-700">{row.pts}</td>
                                    <td className="py-2.5 px-3 text-sm text-center text-gray-700">{row.pointsDifference != null ? (row.pointsDifference >= 0 ? `+${row.pointsDifference}` : String(row.pointsDifference)) : "—"}</td>
                                    <td className="py-2.5 px-3 text-sm text-center">{rankDisplay}</td>
                                </tr>
                                {isExpanded && (
                                    <tr className="border-t border-gray-100 bg-white">
                                        <td colSpan={7} className="py-2.5 px-4">
                                            {teamMembers.length === 0 ? (
                                                <p className="text-xs text-gray-500">No players in this team.</p>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {teamMembers.map((mem) => (
                                                        <div key={mem.id} className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5">
                                                            <span className="text-sm text-gray-900">{mem.name}</span>
                                                            <span className="text-xs font-medium text-gray-700">PTS {mem.points}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-gray-500">
                PL = Played, W = Won, L = Lost, PTS = Points ({TEAM_STANDINGS_POINTS_PER_WIN} per win), PD = Point difference
                (for–against). Tiebreaker: PTS then PD. Expanded roster PTS = {PLAYER_STANDINGS_POINTS_PER_WIN} per win for players in
                the recorded doubles lineup only.
            </p>

            {canEdit && qualifiedForQF.length >= 4 && (
                <GeneratePlayoffsBlock
                    tournament={tournament}
                    qualifiedTeams={qualifiedForQF.map((r) => r.team)}
                    onRefresh={() => window.location.reload()}
                />
            )}
        </div>
    );
}

type PlayerStatsSortKey = "pts" | "played" | "won" | "lost" | "name";

const PLAYER_STATS_SORT_LABELS: Record<PlayerStatsSortKey, string> = {
    pts: "Points (PTS)",
    played: "Played (PL)",
    won: "Wins (W)",
    lost: "Losses (L)",
    name: "Name (A–Z)",
};

function useIsMaxMd() {
    const [isMaxMd, setIsMaxMd] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 767px)");
        const fn = () => setIsMaxMd(mq.matches);
        fn();
        mq.addEventListener("change", fn);
        return () => mq.removeEventListener("change", fn);
    }, []);
    return isMaxMd;
}

function comparePlayerStatRows(
    a: {
        played: number;
        won: number;
        lost: number;
        pts: number;
        pointsDifference: number;
        member: TournamentTeamMember & { participant?: Participant };
    },
    b: {
        played: number;
        won: number;
        lost: number;
        pts: number;
        pointsDifference: number;
        member: TournamentTeamMember & { participant?: Participant };
    },
    sortKey: PlayerStatsSortKey
): number {
    if (sortKey === "name") {
        const an = a.member.participant?.player_name ?? "";
        const bn = b.member.participant?.player_name ?? "";
        return an.localeCompare(bn, undefined, { sensitivity: "base" });
    }
    let primary = 0;
    if (sortKey === "pts") primary = b.pts - a.pts;
    else if (sortKey === "played") primary = b.played - a.played;
    else if (sortKey === "won") primary = b.won - a.won;
    else primary = b.lost - a.lost;
    if (primary !== 0) return primary;
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.pointsDifference !== a.pointsDifference) return b.pointsDifference - a.pointsDifference;
    const an = a.member.participant?.player_name ?? "";
    const bn = b.member.participant?.player_name ?? "";
    return an.localeCompare(bn, undefined, { sensitivity: "base" });
}

function PlayerStatsTab({ tournament }: { tournament: Tournament }) {
    const [members, setMembers] = useState<(TournamentTeamMember & { participant?: Participant; team?: TournamentTeam })[]>([]);
    const [matches, setMatches] = useState<TournamentMatch[]>([]);
    const [sortKey, setSortKey] = useState<PlayerStatsSortKey>("pts");
    const supabase = createClient();

    useEffect(() => {
        supabase
            .from("tournament_team_members")
            .select("*, participant:tournament_participants(*), team:tournament_teams(*)")
            .then(({ data }) => {
                const byTournament = (data || []).filter(
                    (m: TournamentTeamMember & { team?: TournamentTeam }) => m.team?.tournament_id === tournament.id
                );
                setMembers(byTournament);
            });
        supabase
            .from("matches")
            .select("*, winner_team:tournament_teams!winner_team_id(id)")
            .eq("tournament_id", tournament.id)
            .eq("status", "completed")
            .then(({ data }) => setMatches(data || []));
    }, [tournament.id, supabase]);

    const rowsWithStats = useMemo(() => {
        const participantStats: Record<
            string,
            { played: number; won: number; lost: number; pointsFor: number; pointsAgainst: number }
        > = {};
        members.forEach((m) => {
            const pid = (m as TournamentTeamMember & { participant?: Participant }).participant_id;
            if (pid) participantStats[pid] = { played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 };
        });
        matches.forEach((match) => {
            const tm = match as TournamentMatch;
            const winnerId = tm.winner_team_id;
            const teamA = tm.team_a_id;
            const teamB = tm.team_b_id;
            const score = tm.final_score;
            let pfA = 0;
            let pfB = 0;
            if (score && typeof score === "string") {
                const sets = score.split(",").map((s) => s.trim()).filter(Boolean);
                sets.forEach((setStr) => {
                    const parts = setStr.split("-").map((n) => parseInt(n.trim(), 10));
                    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        pfA += parts[0];
                        pfB += parts[1];
                    }
                });
            }
            const doubles = parseDoublesMatchNotes(tm.notes);
            const doublesAligned =
                doubles &&
                teamA &&
                teamB &&
                ((doubles.teamAId === teamA && doubles.teamBId === teamB) ||
                    (doubles.teamAId === teamB && doubles.teamBId === teamA));
            if (doublesAligned && doubles) {
                const pidsOnA = new Set(doubles.sideA.map((s) => s.id));
                const pidsOnB = new Set(doubles.sideB.map((s) => s.id));
                members.forEach((mem) => {
                    const tid = (mem as TournamentTeamMember & { team?: TournamentTeam }).team_id;
                    const pid = (mem as TournamentTeamMember & { participant?: Participant }).participant_id;
                    if (!pid || !participantStats[pid]) return;
                    const onLineupA = tid === doubles.teamAId && pidsOnA.has(pid);
                    const onLineupB = tid === doubles.teamBId && pidsOnB.has(pid);
                    if (!onLineupA && !onLineupB) return;
                    participantStats[pid].played += 1;
                    if (
                        (onLineupA && winnerId === doubles.teamAId) ||
                        (onLineupB && winnerId === doubles.teamBId)
                    ) {
                        participantStats[pid].won += 1;
                    } else {
                        participantStats[pid].lost += 1;
                    }
                    if (onLineupA) {
                        participantStats[pid].pointsFor += pfA;
                        participantStats[pid].pointsAgainst += pfB;
                    }
                    if (onLineupB) {
                        participantStats[pid].pointsFor += pfB;
                        participantStats[pid].pointsAgainst += pfA;
                    }
                });
                return;
            }
            members.forEach((mem) => {
                const tid = (mem as TournamentTeamMember & { team?: TournamentTeam }).team_id;
                const pid = (mem as TournamentTeamMember & { participant?: Participant }).participant_id;
                if (!pid || !participantStats[pid]) return;
                if (tid === teamA || tid === teamB) {
                    participantStats[pid].played += 1;
                    if (tid === winnerId) participantStats[pid].won += 1;
                    else participantStats[pid].lost += 1;
                    if (tid === teamA) {
                        participantStats[pid].pointsFor += pfA;
                        participantStats[pid].pointsAgainst += pfB;
                    } else if (tid === teamB) {
                        participantStats[pid].pointsFor += pfB;
                        participantStats[pid].pointsAgainst += pfA;
                    }
                }
            });
        });
        return members
            .map((m) => {
                const mem = m as TournamentTeamMember & { participant?: Participant; team?: TournamentTeam };
                const pid = mem.participant_id;
                const s = participantStats[pid] || { played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 };
                const pointsDifference = s.pointsFor - s.pointsAgainst;
                return {
                    member: mem,
                    played: s.played,
                    won: s.won,
                    lost: s.lost,
                    pts: s.won * PLAYER_STANDINGS_POINTS_PER_WIN,
                    pointsDifference,
                };
            })
            .filter((r) => r.member.participant);
    }, [members, matches]);

    const sorted = useMemo(() => {
        const copy = [...rowsWithStats];
        copy.sort((a, b) => comparePlayerStatRows(a, b, sortKey));
        return copy;
    }, [rowsWithStats, sortKey]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Player stats</h2>
                <div className="flex flex-col gap-1 sm:items-end">
                    <label htmlFor="player-stats-sort" className="text-xs font-medium text-gray-700">
                        Sort by
                    </label>
                    <select
                        id="player-stats-sort"
                        value={sortKey}
                        onChange={(e) => {
                            setSortKey(e.target.value as PlayerStatsSortKey);
                        }}
                        className="w-full sm:w-56 px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        {(Object.keys(PLAYER_STATS_SORT_LABELS) as PlayerStatsSortKey[]).map((key) => (
                            <option key={key} value={key}>
                                {PLAYER_STATS_SORT_LABELS[key]}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 hidden sm:block">
                        PL = played, W = won, L = lost, PTS = points ({PLAYER_STANDINGS_POINTS_PER_WIN} per win), PD = point
                        difference (sets). Rank (#) follows this order; tiebreaker PTS then PD. Doubles lineups in match notes limit
                        who is credited for those matches.
                    </p>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
                {sorted.length === 0 ? (
                    <div className="p-4 text-sm text-gray-600">No completed matches yet.</div>
                ) : (
                    <table className="min-w-full overflow-hidden">
                        <thead className="bg-white border-b border-gray-200">
                            <tr>
                                <th className="text-left py-2.5 px-4 text-xs font-medium uppercase tracking-wide text-gray-600">
                                    Player
                                </th>
                                <th className="text-center py-2.5 px-3 text-xs font-medium uppercase tracking-wide text-gray-600">
                                    PL
                                </th>
                                <th className="text-center py-2.5 px-3 text-xs font-medium uppercase tracking-wide text-gray-600">
                                    W
                                </th>
                                <th className="text-center py-2.5 px-3 text-xs font-medium uppercase tracking-wide text-gray-600">
                                    L
                                </th>
                                <th className="text-center py-2.5 px-3 text-xs font-medium uppercase tracking-wide text-gray-600">
                                    PTS
                                </th>
                                <th className="text-center py-2.5 px-3 text-xs font-medium uppercase tracking-wide text-gray-600">
                                    PD
                                </th>
                                <th className="text-center py-2.5 px-3 text-xs font-medium uppercase tracking-wide text-gray-600">
                                    #
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                        {sorted.map((row, idx) => {
                            const rank = idx + 1;
                            const participantName =
                                    formatPlayerNameWithCategory(
                                        (row.member as TournamentTeamMember & { participant?: Participant }).participant
                                            ?.player_name ?? "—",
                                        (row.member as TournamentTeamMember & { participant?: Participant }).participant
                                            ?.category ?? null,
                                    );
                                const pd = row.pointsDifference;
                                const rankDisplay =
                                    rank === 1 ? (
                                        <span className="text-xl" title="1st" aria-label="1st">
                                            🥇
                                        </span>
                                    ) : rank === 2 ? (
                                        <span className="text-xl" title="2nd" aria-label="2nd">
                                            🥈
                                        </span>
                                    ) : rank === 3 ? (
                                        <span className="text-xl" title="3rd" aria-label="3rd">
                                            🥉
                                        </span>
                                    ) : (
                                        <span className="text-gray-700">{rank}</span>
                                    );
                            return (
                                    <tr
                                    key={row.member.id}
                                        className="border-t border-gray-200"
                                    style={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FFF5F5" }}
                                >
                                        <td className="py-2.5 px-4 text-sm sm:text-base">
                                            <div className="font-semibold text-gray-900">{participantName}</div>
                                        </td>
                                        <td className="py-2.5 px-3 text-sm text-center text-gray-700">{row.played}</td>
                                        <td className="py-2.5 px-3 text-sm text-center text-gray-700">{row.won}</td>
                                        <td className="py-2.5 px-3 text-sm text-center text-gray-700">{row.lost}</td>
                                        <td className="py-2.5 px-3 text-sm text-center text-gray-700">{row.pts}</td>
                                        <td className="py-2.5 px-3 text-sm text-center text-gray-700">
                                            {pd >= 0 ? `+${pd}` : String(pd)}
                                        </td>
                                        <td className="py-2.5 px-3 text-sm text-center">{rankDisplay}</td>
                                    </tr>
                            );
                        })}
                        </tbody>
                    </table>
                )}
            </div>
            <p className="text-xs text-gray-500">
                PL = Played, W = Won, L = Lost, PTS = Points ({PLAYER_STANDINGS_POINTS_PER_WIN} per win), PD = Point difference
                (for–against in completed sets). Tiebreaker: PTS then PD. For balanced-doubles matches (lineup in match notes), only
                players listed in that lineup get PL/W/L/PTS/PD from that match; other team matches still count all roster members on
                the two sides.
            </p>
        </div>
    );
}

function compareIndividualParticipantStatRows(
    a: {
        played: number;
        won: number;
        lost: number;
        pts: number;
        pointsDifference: number;
        participant: Participant;
    },
    b: {
        played: number;
        won: number;
        lost: number;
        pts: number;
        pointsDifference: number;
        participant: Participant;
    },
    sortKey: PlayerStatsSortKey
): number {
    if (sortKey === "name") {
        return (a.participant.player_name || "").localeCompare(b.participant.player_name || "", undefined, {
            sensitivity: "base",
        });
    }
    let primary = 0;
    if (sortKey === "pts") primary = b.pts - a.pts;
    else if (sortKey === "played") primary = b.played - a.played;
    else if (sortKey === "won") primary = b.won - a.won;
    else primary = b.lost - a.lost;
    if (primary !== 0) return primary;
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.pointsDifference !== a.pointsDifference) return b.pointsDifference - a.pointsDifference;
    return (a.participant.player_name || "").localeCompare(b.participant.player_name || "", undefined, { sensitivity: "base" });
}

function IndividualPlayerStatsTab({ tournament, participants }: { tournament: Tournament; participants: Participant[] }) {
    const [matches, setMatches] = useState<TournamentMatch[]>([]);
    const [sortKey, setSortKey] = useState<PlayerStatsSortKey>("pts");
    const supabase = createClient();

    useEffect(() => {
        supabase
            .from("matches")
            .select("*, match_players(*)")
            .eq("tournament_id", tournament.id)
            .eq("status", "completed")
            .then(({ data }) => setMatches((data || []) as TournamentMatch[]));
    }, [tournament.id, supabase]);

    const rowsWithStats = useMemo(() => {
        const stats: Record<string, { played: number; won: number; lost: number; pointsFor: number; pointsAgainst: number }> =
            {};
        participants.forEach((p) => {
            stats[p.id] = { played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 };
        });
        for (const match of matches) {
            const tm = match as TournamentMatch;
            if (tm.team_a_id || tm.team_b_id) continue;
            const p1 = tm.match_players?.find((x) => x.team === "player_1");
            const p2 = tm.match_players?.find((x) => x.team === "player_2");
            if (!p1 || !p2) continue;
            const pid1 = participantIdForMatchPlayer(p1, participants);
            const pid2 = participantIdForMatchPlayer(p2, participants);
            const w = tm.winner_id;
            let pf1 = 0;
            let pf2 = 0;
            const score = tm.final_score;
            if (score && typeof score === "string") {
                const sets = score.split(",").map((s) => s.trim()).filter(Boolean);
                sets.forEach((setStr) => {
                    const parts = setStr.split("-").map((n) => parseInt(n.trim(), 10));
                    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                        pf1 += parts[0];
                        pf2 += parts[1];
                    }
                });
            }
            if (pid1 && stats[pid1]) {
                stats[pid1].played += 1;
                if (w === p1.id) stats[pid1].won += 1;
                else if (w && w === p2.id) stats[pid1].lost += 1;
                stats[pid1].pointsFor += pf1;
                stats[pid1].pointsAgainst += pf2;
            }
            if (pid2 && stats[pid2]) {
                stats[pid2].played += 1;
                if (w === p2.id) stats[pid2].won += 1;
                else if (w && w === p1.id) stats[pid2].lost += 1;
                stats[pid2].pointsFor += pf2;
                stats[pid2].pointsAgainst += pf1;
            }
        }
        return participants.map((p) => {
            const s = stats[p.id] || { played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 };
            const pointsDifference = s.pointsFor - s.pointsAgainst;
            return {
                participant: p,
                played: s.played,
                won: s.won,
                lost: s.lost,
                pts: s.won * PLAYER_STANDINGS_POINTS_PER_WIN,
                pointsDifference,
            };
        });
    }, [participants, matches]);

    const sorted = useMemo(() => {
        const copy = [...rowsWithStats];
        copy.sort((a, b) => compareIndividualParticipantStatRows(a, b, sortKey));
        return copy;
    }, [rowsWithStats, sortKey]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Player stats</h2>
                <div className="flex flex-col gap-1 sm:items-end">
                    <label htmlFor="individual-player-stats-sort" className="text-xs font-medium text-gray-700">
                        Sort by
                    </label>
                    <select
                        id="individual-player-stats-sort"
                        value={sortKey}
                        onChange={(e) => {
                            setSortKey(e.target.value as PlayerStatsSortKey);
                        }}
                        className="w-full sm:w-56 px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                        {(Object.keys(PLAYER_STATS_SORT_LABELS) as PlayerStatsSortKey[]).map((key) => (
                            <option key={key} value={key}>
                                {PLAYER_STATS_SORT_LABELS[key]}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 hidden sm:block">
                        PL = played, W = won, L = lost, PTS = points ({PLAYER_STANDINGS_POINTS_PER_WIN} per win), PD = point
                        difference (sets). Rank (#) follows this order. Completed singles matches only; link match players to
                        participants to count.
                    </p>
                </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
                {sorted.length === 0 ? (
                    <div className="p-4 text-sm text-gray-600">No participants in this tournament yet.</div>
                ) : (
                    <table className="min-w-full overflow-hidden">
                        <thead className="bg-white border-b border-gray-200">
                            <tr>
                                <th className="text-left py-2.5 px-4 text-xs font-medium uppercase tracking-wide text-gray-600">
                                    Player
                                </th>
                                <th className="text-center py-2.5 px-3 text-xs font-medium uppercase tracking-wide text-gray-600">
                                    PL
                                </th>
                                <th className="text-center py-2.5 px-3 text-xs font-medium uppercase tracking-wide text-gray-600">
                                    W
                                </th>
                                <th className="text-center py-2.5 px-3 text-xs font-medium uppercase tracking-wide text-gray-600">
                                    L
                                </th>
                                <th className="text-center py-2.5 px-3 text-xs font-medium uppercase tracking-wide text-gray-600">
                                    PTS
                                </th>
                                <th className="text-center py-2.5 px-3 text-xs font-medium uppercase tracking-wide text-gray-600">
                                    PD
                                </th>
                                <th className="text-center py-2.5 px-3 text-xs font-medium uppercase tracking-wide text-gray-600">
                                    #
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                        {sorted.map((row, idx) => {
                            const rank = idx + 1;
                            const participantName = formatPlayerNameWithCategory(
                                row.participant.player_name || "—",
                                row.participant.category ?? null,
                            );
                                const club =
                                    row.participant.club != null && String(row.participant.club).trim() !== ""
                                ? stripTrailingBracketLabel(String(row.participant.club).trim())
                                : null;
                                const pd = row.pointsDifference;
                                const rankDisplay =
                                    rank === 1 ? (
                                        <span className="text-xl" title="1st" aria-label="1st">
                                            🥇
                                        </span>
                                    ) : rank === 2 ? (
                                        <span className="text-xl" title="2nd" aria-label="2nd">
                                            🥈
                                        </span>
                                    ) : rank === 3 ? (
                                        <span className="text-xl" title="3rd" aria-label="3rd">
                                            🥉
                                        </span>
                                    ) : (
                                        <span className="text-gray-700">{rank}</span>
                                    );
                            return (
                                    <tr
                                    key={row.participant.id}
                                        className="border-t border-gray-200"
                                    style={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FFF5F5" }}
                                >
                                        <td className="py-2.5 px-4 text-sm sm:text-base">
                                            <div className="font-semibold text-gray-900">{participantName}</div>
                                            <div className="text-xs text-gray-600 mt-0.5">{club || "—"}</div>
                                        </td>
                                        <td className="py-2.5 px-3 text-sm text-center text-gray-700">{row.played}</td>
                                        <td className="py-2.5 px-3 text-sm text-center text-gray-700">{row.won}</td>
                                        <td className="py-2.5 px-3 text-sm text-center text-gray-700">{row.lost}</td>
                                        <td className="py-2.5 px-3 text-sm text-center text-gray-700">{row.pts}</td>
                                        <td className="py-2.5 px-3 text-sm text-center text-gray-700">
                                            {pd >= 0 ? `+${pd}` : String(pd)}
                                        </td>
                                        <td className="py-2.5 px-3 text-sm text-center">{rankDisplay}</td>
                                    </tr>
                            );
                        })}
                        </tbody>
                    </table>
                )}
            </div>
            <p className="text-xs text-gray-500">
                PL = Played, W = Won, L = Lost, PTS = Points ({PLAYER_STANDINGS_POINTS_PER_WIN} per win), PD = Point difference
                (for–against in completed sets). Tiebreaker: PTS then PD. Stats use completed singles matches; link match players to
                participants (name or account) to count.
            </p>
        </div>
    );
}

/** Trailing number in knockout match_number for stable ordering (e.g. KO_T_QF_3 → 3). */
function knockoutMatchSortKey(matchNumber: string | null | undefined): number {
    if (!matchNumber) return 0;
    const m = matchNumber.match(/(\d+)\s*$/);
    return m ? parseInt(m[1], 10) : 0;
}

/** Parse "1-5,2-6" into 0-based index pairs; ranks are 1-based in the qualifier pool. */
function parseKnockoutRankPairs(input: string, poolLen: number): [number, number][] {
    const raw = input.trim();
    if (!raw) throw new Error("Enter at least one rank pairing (e.g. 1-5,2-6).");
    const chunks = raw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
    const out: [number, number][] = [];
    for (const ch of chunks) {
        const m = ch.match(/^(\d+)\s*[-–]\s*(\d+)$/);
        if (!m) throw new Error(`Invalid pairing "${ch}". Use format like 1-5 or 2-6.`);
        const a = parseInt(m[1], 10);
        const b = parseInt(m[2], 10);
        if (a < 1 || a > poolLen || b < 1 || b > poolLen) {
            throw new Error(`Ranks must be between 1 and ${poolLen} (got ${a}-${b}).`);
        }
        if (a === b) throw new Error(`A team cannot play itself (${a}-${b}).`);
        out.push([a - 1, b - 1]);
    }
    return out;
}

function teamStandingsOrderForKnockout(
    teams: TournamentTeam[],
    completedTeamMatches: TournamentMatch[],
): TournamentTeam[] {
    const stats: Record<string, { played: number; won: number; lost: number; pointsFor: number; pointsAgainst: number }> = {};
    teams.forEach((t) => {
        stats[t.id] = { played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 };
    });
    completedTeamMatches.forEach((m) => {
        const ma = m.team_a_id;
        const mb = m.team_b_id;
        const winner = m.winner_team_id;
        if (ma && stats[ma]) {
            stats[ma].played += 1;
            if (winner === ma) stats[ma].won += 1;
            else stats[ma].lost += 1;
        }
        if (mb && stats[mb]) {
            stats[mb].played += 1;
            if (winner === mb) stats[mb].won += 1;
            else stats[mb].lost += 1;
        }
        const score = m.final_score;
        if (score && typeof score === "string") {
            const sets = score.split(",").map((s) => s.trim()).filter(Boolean);
            let pfA = 0;
            let pfB = 0;
            sets.forEach((setStr) => {
                const parts = setStr.split("-").map((n) => parseInt(n.trim(), 10));
                if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    pfA += parts[0];
                    pfB += parts[1];
                }
            });
            if (ma && stats[ma]) {
                stats[ma].pointsFor += pfA;
                stats[ma].pointsAgainst += pfB;
            }
            if (mb && stats[mb]) {
                stats[mb].pointsFor += pfB;
                stats[mb].pointsAgainst += pfA;
            }
        }
    });
    const withPts = teams.map((t) => ({
        team: t,
        ...stats[t.id],
        pts: stats[t.id].won * 20,
        pointsDifference: stats[t.id].pointsFor - stats[t.id].pointsAgainst,
    }));
    return [...withPts]
        .sort((a, b) => {
            if (a.pts !== b.pts) return b.pts - a.pts;
            return (b.pointsDifference ?? 0) - (a.pointsDifference ?? 0);
        })
        .map((r) => r.team);
}

type PlayerKoRow = {
    member: TournamentTeamMember & { participant?: Participant; team?: TournamentTeam };
    played: number;
    won: number;
    lost: number;
    pts: number;
    pointsDifference: number;
};

function playerStandingsRowsForKnockout(
    members: (TournamentTeamMember & { participant?: Participant; team?: TournamentTeam })[],
    completedMatches: TournamentMatch[],
): PlayerKoRow[] {
    const rowsWithStats: PlayerKoRow[] = [];
    const participantStats: Record<
        string,
        { played: number; won: number; lost: number; pointsFor: number; pointsAgainst: number }
    > = {};
    members.forEach((m) => {
        const pid = m.participant_id;
        if (pid) participantStats[pid] = { played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 };
    });
    completedMatches.forEach((match) => {
        const tm = match as TournamentMatch;
        const winnerId = tm.winner_team_id;
        const teamA = tm.team_a_id;
        const teamB = tm.team_b_id;
        const score = tm.final_score;
        let pfA = 0;
        let pfB = 0;
        if (score && typeof score === "string") {
            const sets = score.split(",").map((s) => s.trim()).filter(Boolean);
            sets.forEach((setStr) => {
                const parts = setStr.split("-").map((n) => parseInt(n.trim(), 10));
                if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    pfA += parts[0];
                    pfB += parts[1];
                }
            });
        }
        const doubles = parseDoublesMatchNotes(tm.notes);
        const doublesAligned =
            doubles &&
            teamA &&
            teamB &&
            ((doubles.teamAId === teamA && doubles.teamBId === teamB) ||
                (doubles.teamAId === teamB && doubles.teamBId === teamA));
        if (doublesAligned && doubles) {
            const pidsOnA = new Set(doubles.sideA.map((s) => s.id));
            const pidsOnB = new Set(doubles.sideB.map((s) => s.id));
            members.forEach((mem) => {
                const tid = mem.team_id;
                const pid = mem.participant_id;
                if (!pid || !participantStats[pid]) return;
                const onLineupA = tid === doubles.teamAId && pidsOnA.has(pid);
                const onLineupB = tid === doubles.teamBId && pidsOnB.has(pid);
                if (!onLineupA && !onLineupB) return;
                participantStats[pid].played += 1;
                if ((onLineupA && winnerId === doubles.teamAId) || (onLineupB && winnerId === doubles.teamBId)) {
                    participantStats[pid].won += 1;
                } else {
                    participantStats[pid].lost += 1;
                }
                if (onLineupA) {
                    participantStats[pid].pointsFor += pfA;
                    participantStats[pid].pointsAgainst += pfB;
                }
                if (onLineupB) {
                    participantStats[pid].pointsFor += pfB;
                    participantStats[pid].pointsAgainst += pfA;
                }
            });
            return;
        }
        members.forEach((mem) => {
            const tid = mem.team_id;
            const pid = mem.participant_id;
            if (!pid || !participantStats[pid]) return;
            if (tid === teamA || tid === teamB) {
                participantStats[pid].played += 1;
                if (tid === winnerId) participantStats[pid].won += 1;
                else participantStats[pid].lost += 1;
                if (tid === teamA) {
                    participantStats[pid].pointsFor += pfA;
                    participantStats[pid].pointsAgainst += pfB;
                } else if (tid === teamB) {
                    participantStats[pid].pointsFor += pfB;
                    participantStats[pid].pointsAgainst += pfA;
                }
            }
        });
    });
    members.forEach((m) => {
        const pid = m.participant_id;
        const s = participantStats[pid] || { played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0 };
        const pointsDifference = s.pointsFor - s.pointsAgainst;
        if (m.participant) {
            rowsWithStats.push({
                member: m,
                played: s.played,
                won: s.won,
                lost: s.lost,
                pts: s.won * 10,
                pointsDifference,
            });
        }
    });
    return rowsWithStats;
}

function winnersFromCompletedPrefix(
    allMatches: TournamentMatch[],
    prefix: string,
    teamsById: Map<string, TournamentTeam>,
): TournamentTeam[] {
    const rows = (allMatches || []).filter(
        (m) =>
            m.status === "completed" &&
            m.winner_team_id &&
            m.match_number &&
            String(m.match_number).startsWith(prefix),
    ) as TournamentMatch[];
    rows.sort((a, b) => knockoutMatchSortKey(a.match_number) - knockoutMatchSortKey(b.match_number));
    const out: TournamentTeam[] = [];
    for (const r of rows) {
        const t = teamsById.get(r.winner_team_id!);
        if (t) out.push(t);
    }
    return out;
}

/** Winning player row from each completed KO_P_* match (uses lineup in notes). */
function winnersPlayerRowsFromCompletedKoPrefix(
    allMatches: TournamentMatch[],
    prefix: string,
    sortedPlayerRows: PlayerKoRow[],
): PlayerKoRow[] {
    const byPid = new Map(sortedPlayerRows.map((r) => [r.member.participant_id, r]));
    const rows = (allMatches || []).filter(
        (m) =>
            m.status === "completed" &&
            m.winner_team_id &&
            m.match_number &&
            String(m.match_number).startsWith(prefix),
    ) as TournamentMatch[];
    rows.sort((a, b) => knockoutMatchSortKey(a.match_number) - knockoutMatchSortKey(b.match_number));
    const out: PlayerKoRow[] = [];
    for (const m of rows) {
        const d = parseDoublesMatchNotes(m.notes);
        if (!d) continue;
        const w = m.winner_team_id;
        const side = w === d.teamAId ? d.sideA : w === d.teamBId ? d.sideB : null;
        const pid = side?.[0]?.id;
        if (pid) {
            const row = byPid.get(pid);
            if (row) out.push(row);
        }
    }
    return out;
}

function KnockoutSchedulerBlock({
    tournament,
    canEdit,
    onScheduled,
}: {
    tournament: Tournament;
    canEdit: boolean;
    onScheduled: () => void;
}) {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [teams, setTeams] = useState<TournamentTeam[]>([]);
    const [members, setMembers] = useState<(TournamentTeamMember & { participant?: Participant; team?: TournamentTeam })[]>([]);
    const [matches, setMatches] = useState<TournamentMatch[]>([]);

    const [tQfQual, setTQfQual] = useState(8);
    const [tQfPairs, setTQfPairs] = useState("1-5,2-6,3-7,4-8");
    const [tSfSource, setTSfSource] = useState<"qf_winners" | "standings">("qf_winners");
    const [tSfStandingsN, setTSfStandingsN] = useState(4);
    const [tSfPairs, setTSfPairs] = useState("1-3,2-4");

    const [pQfQual, setPQfQual] = useState(8);
    const [pQfPairs, setPQfPairs] = useState("1-5,2-6,3-7,4-8");
    const [pSfSource, setPSfSource] = useState<"qf_winners" | "standings">("qf_winners");
    const [pSfStandingsN, setPSfStandingsN] = useState(4);
    const [pSfPairs, setPSfPairs] = useState("1-3,2-4");

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [{ data: tData }, { data: mData }, { data: matchData }] = await Promise.all([
                supabase.from("tournament_teams").select("*").eq("tournament_id", tournament.id).order("name"),
                supabase
                    .from("tournament_team_members")
                    .select("*, participant:tournament_participants(*), team:tournament_teams(*)")
                    .then(({ data }) => ({
                        data: (data || []).filter(
                            (row: TournamentTeamMember & { team?: TournamentTeam }) => row.team?.tournament_id === tournament.id,
                        ),
                    })),
                supabase
                    .from("matches")
                    .select(
                        "id, tournament_id, status, notes, final_score, match_number, team_a_id, team_b_id, winner_team_id, winner_id, match_date, court_number, match_type",
                    )
                    .eq("tournament_id", tournament.id),
            ]);
            setTeams(tData || []);
            setMembers(mData || []);
            setMatches((matchData || []) as TournamentMatch[]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [supabase, tournament.id]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const teamsById = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
    const completed = useMemo(
        () => matches.filter((m) => m.status === "completed" && m.team_a_id && m.team_b_id),
        [matches],
    );

    const teamOrder = useMemo(() => teamStandingsOrderForKnockout(teams, completed), [teams, completed]);

    const playerRowsSorted = useMemo(() => {
        const rows = playerStandingsRowsForKnockout(members, completed);
        const copy = [...rows];
        copy.sort((a, b) => comparePlayerStatRows(a, b, "pts"));
        return copy;
    }, [members, completed]);

    const nc = getCourtCount(tournament);

    const deleteMatchesWithPrefix = async (prefix: string) => {
        const { data, error } = await supabase.from("matches").select("id, match_number").eq("tournament_id", tournament.id);
        if (error) throw error;
        const ids = (data || [])
            .filter((m) => m.match_number && String(m.match_number).startsWith(prefix))
            .map((m) => m.id);
        if (ids.length === 0) return;
        const { error: delErr } = await supabase.from("matches").delete().in("id", ids);
        if (delErr) throw delErr;
    };

    const insertTeamPair = async (
        teamA: TournamentTeam,
        teamB: TournamentTeam,
        matchNumber: string,
        courtIdx: number,
        created_by: string | null,
    ) => {
        const { error } = await supabase.from("matches").insert({
            tournament_id: tournament.id,
            sport: tournament.sport,
            match_type: "tournament",
            status: "upcoming",
            team_a_id: teamA.id,
            team_b_id: teamB.id,
            match_number: matchNumber,
            court_number: String((courtIdx % nc) + 1),
            created_by,
        });
        if (error) throw error;
    };

    const insertPlayerPair = async (
        rowA: PlayerKoRow,
        rowB: PlayerKoRow,
        matchNumber: string,
        courtIdx: number,
        created_by: string | null,
    ) => {
        const teamA = rowA.member.team_id;
        const teamB = rowB.member.team_id;
        if (!teamA || !teamB) throw new Error("Missing team for player row.");
        if (teamA === teamB) {
            throw new Error(
                `Players "${rowA.member.participant?.player_name}" and "${rowB.member.participant?.player_name}" are on the same team — use Schedule to add a singles-style match, or pair different players.`,
            );
        }
        const p1 = rowA.member.participant;
        const p2 = rowB.member.participant;
        if (!p1 || !p2) throw new Error("Missing participant record.");
        const payload = {
            type: "doubles_line" as const,
            categoryKey: "player_knockout",
            teamAId: teamA,
            teamBId: teamB,
            sideA: [{ id: p1.id, name: p1.player_name || "—", category: (p1.category && String(p1.category).trim()) || "—" }],
            sideB: [{ id: p2.id, name: p2.player_name || "—", category: (p2.category && String(p2.category).trim()) || "—" }],
        };
        const notes = `${NOTES_JSON_MARK}${JSON.stringify(payload)}`;
        const { error } = await supabase.from("matches").insert({
            tournament_id: tournament.id,
            sport: tournament.sport,
            match_type: "tournament",
            status: "upcoming",
            team_a_id: teamA,
            team_b_id: teamB,
            match_number: matchNumber,
            court_number: String((courtIdx % nc) + 1),
            notes,
            created_by,
        });
        if (error) throw error;
    };

    const runTeamQf = async () => {
        if (!canEdit) return;
        const pool = teamOrder.slice(0, tQfQual);
        if (pool.length < tQfQual) {
            alert(`Need at least ${tQfQual} teams in standings; only ${pool.length} teams exist.`);
            return;
        }
        let pairs: [number, number][];
        try {
            pairs = parseKnockoutRankPairs(tQfPairs, tQfQual);
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
            return;
        }
        if (
            !confirm(
                `Create ${pairs.length} team quarter-final match(es) (prefix KO_T_QF_)? Existing matches with that prefix will be removed first.`,
            )
        ) {
            return;
        }
        const storedUser = localStorage.getItem("sf:user");
        const created_by = storedUser ? (JSON.parse(storedUser) as { user_id?: string }).user_id ?? null : null;
        setBusy("team-qf");
        try {
            await deleteMatchesWithPrefix("KO_T_QF_");
            for (let i = 0; i < pairs.length; i++) {
                const [ia, ib] = pairs[i];
                await insertTeamPair(pool[ia], pool[ib], `KO_T_QF_${i + 1}`, i, created_by);
            }
            alert(`Scheduled ${pairs.length} team QF match(es).`);
            await refresh();
            onScheduled();
        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : "Failed to schedule team QF.");
        } finally {
            setBusy(null);
        }
    };

    const runTeamSf = async () => {
        if (!canEdit) return;
        let pool: TournamentTeam[];
        if (tSfSource === "standings") {
            pool = teamOrder.slice(0, tSfStandingsN);
            if (pool.length < tSfStandingsN) {
                alert(`Need at least ${tSfStandingsN} teams; only ${pool.length} in standings.`);
                return;
            }
        } else {
            pool = winnersFromCompletedPrefix(matches, "KO_T_QF_", teamsById);
            if (pool.length === 0) {
                alert("No completed team QF winners found (KO_T_QF_* matches). Enter QF results first, or use “From league standings”.");
                return;
            }
        }
        let pairs: [number, number][];
        try {
            pairs = parseKnockoutRankPairs(tSfPairs, pool.length);
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
            return;
        }
        const maxRank = Math.max(...pairs.flatMap((p) => [p[0] + 1, p[1] + 1]));
        if (maxRank > pool.length) {
            alert(`A pairing references rank ${maxRank} but the pool only has ${pool.length} team(s).`);
            return;
        }
        if (!confirm(`Create ${pairs.length} team semi-final match(es) (KO_T_SF_)? Existing KO_T_SF_ matches will be removed first.`)) {
            return;
        }
        const storedUser = localStorage.getItem("sf:user");
        const created_by = storedUser ? (JSON.parse(storedUser) as { user_id?: string }).user_id ?? null : null;
        setBusy("team-sf");
        try {
            await deleteMatchesWithPrefix("KO_T_SF_");
            for (let i = 0; i < pairs.length; i++) {
                const [ia, ib] = pairs[i];
                await insertTeamPair(pool[ia], pool[ib], `KO_T_SF_${i + 1}`, i, created_by);
            }
            alert(`Scheduled ${pairs.length} team semi-final match(es).`);
            await refresh();
            onScheduled();
        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : "Failed to schedule team SF.");
        } finally {
            setBusy(null);
        }
    };

    const runTeamFinal = async () => {
        if (!canEdit) return;
        const pool = winnersFromCompletedPrefix(matches, "KO_T_SF_", teamsById);
        if (pool.length < 2) {
            alert("Need 2 completed team semi-final winners (KO_T_SF_*). Enter semi results first.");
            return;
        }
        if (pool.length > 2) {
            if (!confirm(`Found ${pool.length} SF winners; final will use the first two in bracket order (KO_T_SF_1 winner, KO_T_SF_2 winner). Continue?`)) {
                return;
            }
        }
        const a = pool[0];
        const b = pool[1];
        if (!confirm(`Schedule team final: ${stripTrailingBracketLabel(a.name)} vs ${stripTrailingBracketLabel(b.name)} (KO_T_F_1)? Removes any existing KO_T_F_ match.`)) {
            return;
        }
        const storedUser = localStorage.getItem("sf:user");
        const created_by = storedUser ? (JSON.parse(storedUser) as { user_id?: string }).user_id ?? null : null;
        setBusy("team-f");
        try {
            await deleteMatchesWithPrefix("KO_T_F_");
            await insertTeamPair(a, b, "KO_T_F_1", 0, created_by);
            alert("Team final scheduled.");
            await refresh();
            onScheduled();
        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : "Failed to schedule team final.");
        } finally {
            setBusy(null);
        }
    };

    const runPlayerQf = async () => {
        if (!canEdit) return;
        const pool = playerRowsSorted.slice(0, pQfQual);
        if (pool.length < pQfQual) {
            alert(`Need at least ${pQfQual} players in the player leaderboard; only ${pool.length} listed.`);
            return;
        }
        let pairs: [number, number][];
        try {
            pairs = parseKnockoutRankPairs(pQfPairs, pQfQual);
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
            return;
        }
        try {
            for (const [ia, ib] of pairs) {
                if (pool[ia].member.team_id === pool[ib].member.team_id) {
                    throw new Error(
                        `Pair ${ia + 1}-${ib + 1}: both players are on the same team; player KO needs different teams (or add a custom match in Schedule).`,
                    );
                }
            }
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
            return;
        }
        if (!confirm(`Create ${pairs.length} player quarter-final match(es) (prefix KO_P_QF_)? Existing KO_P_QF_ matches will be removed first.`)) {
            return;
        }
        const storedUser = localStorage.getItem("sf:user");
        const created_by = storedUser ? (JSON.parse(storedUser) as { user_id?: string }).user_id ?? null : null;
        setBusy("player-qf");
        try {
            await deleteMatchesWithPrefix("KO_P_QF_");
            for (let i = 0; i < pairs.length; i++) {
                const [ia, ib] = pairs[i];
                await insertPlayerPair(pool[ia], pool[ib], `KO_P_QF_${i + 1}`, i, created_by);
            }
            alert(`Scheduled ${pairs.length} player QF match(es).`);
            await refresh();
            onScheduled();
        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : "Failed to schedule player QF.");
        } finally {
            setBusy(null);
        }
    };

    const runPlayerSf = async () => {
        if (!canEdit) return;
        let pool: PlayerKoRow[];
        if (pSfSource === "standings") {
            pool = playerRowsSorted.slice(0, pSfStandingsN);
            if (pool.length < pSfStandingsN) {
                alert(`Need at least ${pSfStandingsN} players; only ${pool.length} in leaderboard.`);
                return;
            }
        } else {
            pool = winnersPlayerRowsFromCompletedKoPrefix(matches, "KO_P_QF_", playerRowsSorted);
            if (pool.length === 0) {
                alert("No completed player QF winners (KO_P_QF_* with lineup in notes). Enter QF results first, or use “From player leaderboard”.");
                return;
            }
        }
        let pairs: [number, number][];
        try {
            pairs = parseKnockoutRankPairs(pSfPairs, pool.length);
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
            return;
        }
        try {
            for (const [ia, ib] of pairs) {
                if (pool[ia].member.team_id === pool[ib].member.team_id) {
                    throw new Error(`Pair references two players on the same team — choose different ranks or use Schedule.`);
                }
            }
        } catch (e) {
            alert(e instanceof Error ? e.message : String(e));
            return;
        }
        if (!confirm(`Create ${pairs.length} player semi-final match(es) (KO_P_SF_)? Existing KO_P_SF_ matches will be removed first.`)) {
            return;
        }
        const storedUser = localStorage.getItem("sf:user");
        const created_by = storedUser ? (JSON.parse(storedUser) as { user_id?: string }).user_id ?? null : null;
        setBusy("player-sf");
        try {
            await deleteMatchesWithPrefix("KO_P_SF_");
            for (let i = 0; i < pairs.length; i++) {
                const [ia, ib] = pairs[i];
                await insertPlayerPair(pool[ia], pool[ib], `KO_P_SF_${i + 1}`, i, created_by);
            }
            alert(`Scheduled ${pairs.length} player semi-final match(es).`);
            await refresh();
            onScheduled();
        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : "Failed to schedule player SF.");
        } finally {
            setBusy(null);
        }
    };

    const runPlayerFinal = async () => {
        if (!canEdit) return;
        const winRows = winnersPlayerRowsFromCompletedKoPrefix(matches, "KO_P_SF_", playerRowsSorted);
        if (winRows.length < 2) {
            alert("Need 2 completed player semi-finals (KO_P_SF_*) with winners recorded.");
            return;
        }
        const ra = winRows[0];
        const rb = winRows[1];
        if (winRows.length > 2 && !confirm(`Found ${winRows.length} SF results; final uses winners from KO_P_SF_1 and KO_P_SF_2 in order. Continue?`)) {
            return;
        }
        if (ra.member.team_id === rb.member.team_id) {
            alert("Both SF winners map to the same team — add the final manually in Schedule.");
            return;
        }
        if (
            !confirm(
                `Schedule player final: ${ra.member.participant?.player_name} vs ${rb.member.participant?.player_name} (KO_P_F_1)?`,
            )
        ) {
            return;
        }
        const storedUser = localStorage.getItem("sf:user");
        const created_by = storedUser ? (JSON.parse(storedUser) as { user_id?: string }).user_id ?? null : null;
        setBusy("player-f");
        try {
            await deleteMatchesWithPrefix("KO_P_F_");
            await insertPlayerPair(ra, rb, "KO_P_F_1", 0, created_by);
            alert("Player final scheduled.");
            await refresh();
            onScheduled();
        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : "Failed to schedule player final.");
        } finally {
            setBusy(null);
        }
    };

    if ((tournament.tournament_mode ?? "individual") !== "team") {
        return null;
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6 space-y-6 shadow-sm">
            <div>
                <h3 className="text-lg font-semibold text-gray-900">Knockout scheduler (after league)</h3>
                <p className="text-sm text-gray-600 mt-1">
                    Team and player paths are separate: team brackets use{" "}
                    <span className="font-mono text-xs">KO_T_*</span> match numbers; player brackets use{" "}
                    <span className="font-mono text-xs">KO_P_*</span>. Ranks refer to the current{" "}
                    <strong>Team stats</strong> or <strong>Player stats</strong> order (PTS, then PD). Semi-finals can use winners
                    from the previous KO round or a slice of the league table.
                </p>
            </div>

            {loading ? (
                <p className="text-sm text-gray-500">Loading standings…</p>
            ) : (
                <>
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3 text-xs text-gray-700 space-y-1">
                        <div>
                            <span className="font-semibold">Team table preview (top {Math.min(8, teamOrder.length)}):</span>{" "}
                            {teamOrder.slice(0, 8).map((t) => stripTrailingBracketLabel(t.name)).join(" · ") || "—"}
                        </div>
                        <div>
                            <span className="font-semibold">Player leaderboard preview (top {Math.min(8, playerRowsSorted.length)}):</span>{" "}
                            {playerRowsSorted
                                .slice(0, 8)
                                .map((r) => r.member.participant?.player_name ?? "—")
                                .join(" · ") || "—"}
                        </div>
                    </div>

                    <div className="space-y-4 border-t border-gray-100 pt-4">
                        <h4 className="font-medium text-gray-900">Team knockout</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">QF — how many qualify from league</label>
                                <input
                                    type="number"
                                    min={2}
                                    max={64}
                                    value={tQfQual}
                                    onChange={(e) => setTQfQual(Math.max(2, parseInt(e.target.value, 10) || 8))}
                                    disabled={!canEdit}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">QF — rank pairings (1 = best in pool)</label>
                                <input
                                    type="text"
                                    value={tQfPairs}
                                    onChange={(e) => setTQfPairs(e.target.value)}
                                    disabled={!canEdit}
                                    placeholder="1-5,2-6,3-7,4-8"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono disabled:bg-gray-100"
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={!canEdit || !!busy}
                            onClick={() => void runTeamQf()}
                            className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
                        >
                            {busy === "team-qf" ? "Scheduling…" : "Schedule team quarter-finals"}
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">SF — pool source</label>
                                <select
                                    value={tSfSource}
                                    onChange={(e) => setTSfSource(e.target.value as "qf_winners" | "standings")}
                                    disabled={!canEdit}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                                >
                                    <option value="qf_winners">Winners of team QF (KO_T_QF_*)</option>
                                    <option value="standings">League standings (top N)</option>
                                </select>
                            </div>
                            {tSfSource === "standings" ? (
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Top N from league</label>
                                    <input
                                        type="number"
                                        min={2}
                                        max={32}
                                        value={tSfStandingsN}
                                        onChange={(e) => setTSfStandingsN(Math.max(2, parseInt(e.target.value, 10) || 4))}
                                        disabled={!canEdit}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                                    />
                                </div>
                            ) : null}
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">SF — rank pairings</label>
                                <input
                                    type="text"
                                    value={tSfPairs}
                                    onChange={(e) => setTSfPairs(e.target.value)}
                                    disabled={!canEdit}
                                    placeholder="1-3,2-4"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono disabled:bg-gray-100"
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={!canEdit || !!busy}
                            onClick={() => void runTeamSf()}
                            className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
                        >
                            {busy === "team-sf" ? "Scheduling…" : "Schedule team semi-finals"}
                        </button>

                        <button
                            type="button"
                            disabled={!canEdit || !!busy}
                            onClick={() => void runTeamFinal()}
                            className="block px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-50"
                        >
                            {busy === "team-f" ? "Scheduling…" : "Schedule team final (SF winners 1 vs 2)"}
                        </button>
                    </div>

                    <div className="space-y-4 border-t border-gray-100 pt-4">
                        <h4 className="font-medium text-gray-900">Player knockout (separate bracket)</h4>
                        <p className="text-xs text-gray-500">
                            Uses the same PTS/PD logic as the Player stats tab. Each match is stored as team vs team with a one-player
                            lineup per side; both players must be on <strong>different</strong> teams.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">QF — how many qualify</label>
                                <input
                                    type="number"
                                    min={2}
                                    max={64}
                                    value={pQfQual}
                                    onChange={(e) => setPQfQual(Math.max(2, parseInt(e.target.value, 10) || 8))}
                                    disabled={!canEdit}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">QF — rank pairings</label>
                                <input
                                    type="text"
                                    value={pQfPairs}
                                    onChange={(e) => setPQfPairs(e.target.value)}
                                    disabled={!canEdit}
                                    placeholder="1-5,2-6,3-7,4-8"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono disabled:bg-gray-100"
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={!canEdit || !!busy}
                            onClick={() => void runPlayerQf()}
                            className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-50"
                        >
                            {busy === "player-qf" ? "Scheduling…" : "Schedule player quarter-finals"}
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">SF — pool source</label>
                                <select
                                    value={pSfSource}
                                    onChange={(e) => setPSfSource(e.target.value as "qf_winners" | "standings")}
                                    disabled={!canEdit}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                                >
                                    <option value="qf_winners">Winners of player QF (by team)</option>
                                    <option value="standings">Player leaderboard (top N)</option>
                                </select>
                            </div>
                            {pSfSource === "standings" ? (
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Top N players</label>
                                    <input
                                        type="number"
                                        min={2}
                                        max={32}
                                        value={pSfStandingsN}
                                        onChange={(e) => setPSfStandingsN(Math.max(2, parseInt(e.target.value, 10) || 4))}
                                        disabled={!canEdit}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                                    />
                                </div>
                            ) : null}
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-gray-600 mb-1">SF — rank pairings</label>
                                <input
                                    type="text"
                                    value={pSfPairs}
                                    onChange={(e) => setPSfPairs(e.target.value)}
                                    disabled={!canEdit}
                                    placeholder="1-3,2-4"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono disabled:bg-gray-100"
                                />
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={!canEdit || !!busy}
                            onClick={() => void runPlayerSf()}
                            className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-50"
                        >
                            {busy === "player-sf" ? "Scheduling…" : "Schedule player semi-finals"}
                        </button>

                        <button
                            type="button"
                            disabled={!canEdit || !!busy}
                            onClick={() => void runPlayerFinal()}
                            className="block px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-50"
                        >
                            {busy === "player-f" ? "Scheduling…" : "Schedule player final (SF winners 1 vs 2)"}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// Settings Tab Component
function SettingsTab({ tournament, onTournamentUpdate, canEdit = false }: { tournament: Tournament; onTournamentUpdate: () => void; canEdit?: boolean }) {
    const [settings, setSettings] = useState({
        tournament_mode: (tournament.tournament_mode || 'individual') as 'individual' | 'team',
        format: tournament.format || 'single_elimination',
        sets_per_match: tournament.sets_per_match || 3,
        points_per_set: normalizePointsPerSetForSport(tournament.sport, tournament.points_per_set ?? 21),
        win_by_two: tournament.win_by_two !== false,
        max_points: tournament.max_points || 30,
        seeding_method: tournament.seeding_method || 'random',
        number_of_courts: clampCourtCount(tournament.number_of_courts ?? 3),
        court_labels: courtLabelsStateFromTournament(tournament),
        entry_fee: Number(tournament.entry_fee) || 0,
    });
    const [isSaving, setIsSaving] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        setSettings({
            tournament_mode: (tournament.tournament_mode || 'individual') as 'individual' | 'team',
            format: tournament.format || 'single_elimination',
            sets_per_match: tournament.sets_per_match || 3,
            points_per_set: normalizePointsPerSetForSport(tournament.sport, tournament.points_per_set ?? 21),
            win_by_two: tournament.win_by_two !== false,
            max_points: tournament.max_points || 30,
            seeding_method: tournament.seeding_method || 'random',
            number_of_courts: clampCourtCount(tournament.number_of_courts ?? 3),
            court_labels: courtLabelsStateFromTournament(tournament),
            entry_fee: Number(tournament.entry_fee) || 0,
        });
    }, [tournament]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const nCourts = clampCourtCount(settings.number_of_courts);
            const labelSlice = Array.from({ length: nCourts }, (_, i) => (settings.court_labels[i] ?? "").trim());
            const court_labels = labelSlice.every((s) => !s) ? null : labelSlice;

            const baseUpdate = {
                    tournament_mode: settings.tournament_mode,
                    format: settings.format,
                    sets_per_match: settings.sets_per_match,
                    points_per_set: normalizePointsPerSetForSport(tournament.sport, settings.points_per_set),
                    win_by_two: settings.win_by_two,
                    max_points: settings.max_points,
                    seeding_method: settings.seeding_method,
                number_of_courts: nCourts,
                    entry_fee: Math.max(0, Number(settings.entry_fee) || 0),
            };

            let { error } = await supabase
                .from("tournaments")
                .update({ ...baseUpdate, court_labels })
                .eq("id", tournament.id);

            const errObj = error as { code?: string; message?: string } | null;
            const missingCourtLabelsCol =
                errObj?.code === "PGRST204" &&
                typeof errObj.message === "string" &&
                errObj.message.includes("court_labels");

            if (missingCourtLabelsCol) {
                const retry = await supabase.from("tournaments").update(baseUpdate).eq("id", tournament.id);
                error = retry.error;
                if (!error) {
                    alert(
                        "Other settings were saved. Court names were skipped because your database does not have a court_labels column yet.\n\n" +
                            "In Supabase: SQL Editor → run the script db/add_tournament_court_labels.sql (or: ALTER TABLE public.tournaments ADD COLUMN IF NOT EXISTS court_labels JSONB DEFAULT NULL;), then click Save again to store court names.",
                    );
                    onTournamentUpdate();
                    return;
                }
            }

            if (error) throw error;
            alert("Settings saved successfully!");
            onTournamentUpdate();
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-gray-900">Tournament Settings</h2>
                {!canEdit && <p className="text-sm text-gray-600">View only</p>}
            </div>
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-6 space-y-4 shadow-sm">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tournament Mode
                    </label>
                    <select
                        value={settings.tournament_mode}
                        onChange={(e) => canEdit && setSettings({ ...settings, tournament_mode: e.target.value as 'individual' | 'team' })}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                        <option value="individual">Individual (player vs player)</option>
                        <option value="team">Team (team vs team — shows Teams, Schedule, Results, Stats)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                        Team mode adds Teams, Team Stats, and Player Stats. Individual mode includes Groups, Brackets, and Player Stats (singles leaderboard).
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tournament Format
                    </label>
                    <select
                        value={settings.format}
                        onChange={(e) => canEdit && setSettings({ ...settings, format: e.target.value })}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                        <option value="single_elimination">Single Elimination</option>
                        <option value="double_elimination">Double Elimination</option>
                        <option value="round_robin">Round Robin</option>
                        <option value="round_robin_knockout">Round Robin + Knockout</option>
                    </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Entry fee per participant (₹)
                        </label>
                        <input
                            type="number"
                            min={0}
                            step={1}
                            value={settings.entry_fee}
                            onChange={(e) => canEdit && setSettings({ ...settings, entry_fee: parseFloat(e.target.value) || 0 })}
                            disabled={!canEdit}
                            className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">Shown on overview; each participant pays this amount.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Number of courts (schedule)
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={16}
                            value={settings.number_of_courts}
                            onChange={(e) => {
                                if (!canEdit) return;
                                const v = clampCourtCount(parseInt(e.target.value, 10));
                                setSettings((s) => {
                                    const nextLabels = [...s.court_labels];
                                    while (nextLabels.length < v) nextLabels.push("");
                                    nextLabels.length = v;
                                    return { ...s, number_of_courts: v, court_labels: nextLabels };
                                });
                            }}
                            disabled={!canEdit}
                            className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                        <p className="text-xs text-gray-500 mt-1">Columns on the Schedule tab and court assignment when generating matches (1–16).</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Court names (optional)</label>
                    <p className="text-xs text-gray-500">
                        Shown on the schedule grid, mobile court tabs, match cards, and exports when a match is assigned to court 1, 2, … Leave blank to use
                        &quot;Court 1&quot;, etc.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {Array.from({ length: settings.number_of_courts }, (_, i) => (
                            <div key={i}>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Court {i + 1}</label>
                                <input
                                    type="text"
                                    value={settings.court_labels[i] ?? ""}
                                    onChange={(e) => {
                                        if (!canEdit) return;
                                        const next = [...settings.court_labels];
                                        next[i] = e.target.value;
                                        setSettings({ ...settings, court_labels: next });
                                    }}
                                    disabled={!canEdit}
                                    placeholder={`Court ${i + 1}`}
                                    className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Sets per Match
                        </label>
                        <select
                            value={settings.sets_per_match}
                            onChange={(e) => canEdit && setSettings({ ...settings, sets_per_match: parseInt(e.target.value) })}
                            disabled={!canEdit}
                            className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            <option value={1}>1 game only</option>
                            <option value={3}>Best of 3</option>
                            <option value={5}>Best of 5</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Points per Set
                        </label>
                        <select
                            value={normalizePointsPerSetForSport(tournament.sport, settings.points_per_set)}
                            onChange={(e) => canEdit && setSettings({ ...settings, points_per_set: parseInt(e.target.value, 10) })}
                            disabled={!canEdit}
                            className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                            {allowedPointsPerSetForSport(tournament.sport).map((pts) => (
                                <option key={pts} value={pts}>
                                    {pointsPerSetOptionLabel(tournament.sport, pts)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={settings.win_by_two}
                            onChange={(e) => canEdit && setSettings({ ...settings, win_by_two: e.target.checked })}
                            disabled={!canEdit}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500 disabled:opacity-60"
                        />
                        <span className="text-sm text-gray-700">Win by 2 points</span>
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Points (cap)
                    </label>
                    <input
                        type="number"
                        value={settings.max_points}
                        onChange={(e) => canEdit && setSettings({ ...settings, max_points: parseInt(e.target.value) })}
                        disabled={!canEdit}
                        min="21"
                        max="30"
                        className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seeding Method
                    </label>
                    <select
                        value={settings.seeding_method}
                        onChange={(e) => canEdit && setSettings({ ...settings, seeding_method: e.target.value })}
                        disabled={!canEdit}
                        className="w-full px-3 py-2 border border-gray-300 bg-white text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                        <option value="random">Random</option>
                        <option value="manual">Manual</option>
                        <option value="ranking">By Ranking</option>
                        <option value="registration_order">Registration Order</option>
                    </select>
                </div>

                {canEdit && (
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-red-600 text-white py-2.5 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
                )}
            </div>

            <KnockoutSchedulerBlock tournament={tournament} canEdit={canEdit} onScheduled={onTournamentUpdate} />
        </div>
    );
}

