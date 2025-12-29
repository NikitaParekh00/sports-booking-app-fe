"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import Image from 'next/image';

type Tab = 'sessions' | 'teams' | 'players' | 'settings';

interface AuctionSession {
  id: string;
  session_name: string;
  is_complete: boolean;
  created_at: string;
}

interface Team {
  id: number;
  name: string;
  owner_name: string;
  budget: number;
  session_id: string;
  team_number: number;
  logo_url?: string;
}

interface Player {
  id: string;
  name: string;
  photo?: string;
  age?: number;
  skill?: string;
  batting_hand?: string;
  played_s1?: string;
  experience?: string;
  active_sport?: string;
  player_order: number;
  session_id: string;
}

export default function AuctionAdminPage() {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<Tab>('sessions');
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Sessions state
  const [sessions, setSessions] = useState<AuctionSession[]>([]);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [editingSession, setEditingSession] = useState<AuctionSession | null>(null);
  const [sessionFormData, setSessionFormData] = useState({ name: '', is_complete: false });
  
  // Teams state
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedSessionForTeams, setSelectedSessionForTeams] = useState<string>('');
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamFormData, setTeamFormData] = useState({ name: '', owner_name: '', budget: '', logo_url: '' });
  
  // Players state
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedSessionForPlayers, setSelectedSessionForPlayers] = useState<string>('');
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [playerFormData, setPlayerFormData] = useState({
    name: '', photo: '', age: '', skill: '', batting_hand: '', played_s1: '', experience: '', active_sport: '', player_order: ''
  });

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedUser = localStorage.getItem('sf:user');
        if (!storedUser) {
          alert('Please sign in to access admin panel.');
          router.push('/login');
          return;
        }

        const userData = JSON.parse(storedUser);
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userData.user_id)
          .single();

        if (error || !profile || profile.role !== 'admin') {
          alert('Access denied. This page is for admins only.');
          router.push('/dashboard');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Error checking auth:', error);
        alert('Error checking authentication.');
        router.push('/login');
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, [router, supabase]);

  // Load sessions
  useEffect(() => {
    if (isAdmin) {
      loadSessions();
    }
  }, [isAdmin]);

  // Load teams when session is selected
  useEffect(() => {
    if (selectedSessionForTeams && isAdmin) {
      loadTeams(selectedSessionForTeams);
    }
  }, [selectedSessionForTeams, isAdmin]);

  // Load players when session is selected
  useEffect(() => {
    if (selectedSessionForPlayers && isAdmin) {
      loadPlayers(selectedSessionForPlayers);
    }
  }, [selectedSessionForPlayers, isAdmin]);

  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('auction_sessions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      alert('Error loading sessions');
    }
  };

  const loadTeams = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('auction_teams')
        .select('*')
        .eq('session_id', sessionId)
        .order('team_number', { ascending: true });
      
      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error loading teams:', error);
      alert('Error loading teams');
    }
  };

  const loadPlayers = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('auction_player_pool')
        .select('*')
        .eq('session_id', sessionId)
        .order('player_order', { ascending: true });
      
      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
      alert('Error loading players');
    }
  };

  const handleCreateSession = async () => {
    try {
      const { data, error } = await supabase
        .from('auction_sessions')
        .insert([{
          session_name: sessionFormData.name,
          is_complete: sessionFormData.is_complete
        }])
        .select()
        .single();
      
      if (error) throw error;
      alert('Session created successfully!');
      setShowSessionForm(false);
      setSessionFormData({ name: '', is_complete: false });
      loadSessions();
    } catch (error: any) {
      console.error('Error creating session:', error);
      alert(`Error creating session: ${error.message}`);
    }
  };

  const handleUpdateSession = async () => {
    if (!editingSession) return;
    
    try {
      const { error } = await supabase
        .from('auction_sessions')
        .update({
          session_name: sessionFormData.name,
          is_complete: sessionFormData.is_complete
        })
        .eq('id', editingSession.id);
      
      if (error) throw error;
      alert('Session updated successfully!');
      setEditingSession(null);
      setShowSessionForm(false);
      setSessionFormData({ name: '', is_complete: false });
      loadSessions();
    } catch (error: any) {
      console.error('Error updating session:', error);
      alert(`Error updating session: ${error.message}`);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Are you sure you want to delete this session? This will also delete all associated teams and players.')) return;
    
    try {
      const { error } = await supabase
        .from('auction_sessions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      alert('Session deleted successfully!');
      loadSessions();
    } catch (error: any) {
      console.error('Error deleting session:', error);
      alert(`Error deleting session: ${error.message}`);
    }
  };

  const handleCreateTeam = async () => {
    if (!selectedSessionForTeams) {
      alert('Please select a session first');
      return;
    }

    try {
      // Get max team_number for this session
      const { data: existingTeams } = await supabase
        .from('auction_teams')
        .select('team_number')
        .eq('session_id', selectedSessionForTeams)
        .order('team_number', { ascending: false })
        .limit(1);

      const nextTeamNumber = existingTeams && existingTeams.length > 0 
        ? existingTeams[0].team_number + 1 
        : 1;

      const { error } = await supabase
        .from('auction_teams')
        .insert([{
          session_id: selectedSessionForTeams,
          name: teamFormData.name,
          owner_name: teamFormData.owner_name,
          budget: parseFloat(teamFormData.budget) || 1000000,
          team_number: nextTeamNumber,
          logo_url: teamFormData.logo_url || null
        }]);
      
      if (error) throw error;
      alert('Team created successfully!');
      setShowTeamForm(false);
      setTeamFormData({ name: '', owner_name: '', budget: '', logo_url: '' });
      loadTeams(selectedSessionForTeams);
    } catch (error: any) {
      console.error('Error creating team:', error);
      alert(`Error creating team: ${error.message}`);
    }
  };

  const handleUpdateTeam = async () => {
    if (!editingTeam) return;
    
    try {
      const { error } = await supabase
        .from('auction_teams')
        .update({
          name: teamFormData.name,
          owner_name: teamFormData.owner_name,
          budget: parseFloat(teamFormData.budget) || editingTeam.budget,
          logo_url: teamFormData.logo_url || null
        })
        .eq('id', editingTeam.id);
      
      if (error) throw error;
      alert('Team updated successfully!');
      setEditingTeam(null);
      setShowTeamForm(false);
      setTeamFormData({ name: '', owner_name: '', budget: '', logo_url: '' });
      loadTeams(selectedSessionForTeams);
    } catch (error: any) {
      console.error('Error updating team:', error);
      alert(`Error updating team: ${error.message}`);
    }
  };

  const handleDeleteTeam = async (id: number) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    
    try {
      const { error } = await supabase
        .from('auction_teams')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      alert('Team deleted successfully!');
      loadTeams(selectedSessionForTeams);
    } catch (error: any) {
      console.error('Error deleting team:', error);
      alert(`Error deleting team: ${error.message}`);
    }
  };

  const handleCreatePlayer = async () => {
    if (!selectedSessionForPlayers) {
      alert('Please select a session first');
      return;
    }

    try {
      // Get max player_order for this session
      const { data: existingPlayers } = await supabase
        .from('auction_player_pool')
        .select('player_order')
        .eq('session_id', selectedSessionForPlayers)
        .order('player_order', { ascending: false })
        .limit(1);

      const nextPlayerOrder = existingPlayers && existingPlayers.length > 0 
        ? existingPlayers[0].player_order + 1 
        : 1;

      const { error } = await supabase
        .from('auction_player_pool')
        .insert([{
          session_id: selectedSessionForPlayers,
          name: playerFormData.name,
          photo: playerFormData.photo || null,
          age: playerFormData.age ? parseInt(playerFormData.age) : null,
          skill: playerFormData.skill || null,
          batting_hand: playerFormData.batting_hand || null,
          played_s1: playerFormData.played_s1 || null,
          experience: playerFormData.experience || null,
          active_sport: playerFormData.active_sport || null,
          player_order: playerFormData.player_order ? parseInt(playerFormData.player_order) : nextPlayerOrder
        }]);
      
      if (error) throw error;
      alert('Player created successfully!');
      setShowPlayerForm(false);
      setPlayerFormData({ name: '', photo: '', age: '', skill: '', batting_hand: '', played_s1: '', experience: '', active_sport: '', player_order: '' });
      loadPlayers(selectedSessionForPlayers);
    } catch (error: any) {
      console.error('Error creating player:', error);
      alert(`Error creating player: ${error.message}`);
    }
  };

  const handleUpdatePlayer = async () => {
    if (!editingPlayer) return;
    
    try {
      const { error } = await supabase
        .from('auction_player_pool')
        .update({
          name: playerFormData.name,
          photo: playerFormData.photo || null,
          age: playerFormData.age ? parseInt(playerFormData.age) : null,
          skill: playerFormData.skill || null,
          batting_hand: playerFormData.batting_hand || null,
          played_s1: playerFormData.played_s1 || null,
          experience: playerFormData.experience || null,
          active_sport: playerFormData.active_sport || null,
          player_order: playerFormData.player_order ? parseInt(playerFormData.player_order) : editingPlayer.player_order
        })
        .eq('id', editingPlayer.id);
      
      if (error) throw error;
      alert('Player updated successfully!');
      setEditingPlayer(null);
      setShowPlayerForm(false);
      setPlayerFormData({ name: '', photo: '', age: '', skill: '', batting_hand: '', played_s1: '', experience: '', active_sport: '', player_order: '' });
      loadPlayers(selectedSessionForPlayers);
    } catch (error: any) {
      console.error('Error updating player:', error);
      alert(`Error updating player: ${error.message}`);
    }
  };

  const handleDeletePlayer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this player?')) return;
    
    try {
      const { error } = await supabase
        .from('auction_player_pool')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      alert('Player deleted successfully!');
      loadPlayers(selectedSessionForPlayers);
    } catch (error: any) {
      console.error('Error deleting player:', error);
      alert(`Error deleting player: ${error.message}`);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E11D48] mx-auto"></div>
          <p className="mt-4" style={{ color: '#E5E7EB' }}>Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: '#0F172A' }}>
      <div className="w-full max-w-7xl mx-auto p-6 lg:p-8 xl:p-10">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold" style={{ color: '#E5E7EB' }}>Auction Admin Dashboard</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 rounded-lg font-semibold transition-colors w-full md:w-auto"
              style={{ backgroundColor: '#1F2937', color: '#E5E7EB' }}
            >
              ← Back to Dashboard
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b overflow-x-auto" style={{ borderColor: '#1F2937' }}>
            {(['sessions', 'teams', 'players', 'settings'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 md:px-6 md:py-3 font-semibold transition-colors capitalize whitespace-nowrap ${
                  activeTab === tab ? 'border-b-2' : ''
                }`}
                style={{
                  color: activeTab === tab ? '#E11D48' : '#9CA3AF',
                  borderColor: activeTab === tab ? '#E11D48' : 'transparent'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
              <h2 className="text-xl md:text-2xl lg:text-3xl font-bold" style={{ color: '#E5E7EB' }}>Auction Sessions</h2>
              <button
                onClick={() => {
                  setEditingSession(null);
                  setSessionFormData({ name: '', is_complete: false });
                  setShowSessionForm(true);
                }}
                className="px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold transition-colors w-full md:w-auto"
                style={{ backgroundColor: '#E11D48', color: '#E5E7EB' }}
              >
                + Create Session
              </button>
            </div>

            {showSessionForm && (
              <div className="mb-6 p-4 md:p-6 rounded-lg border" style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}>
                <h3 className="text-lg md:text-xl font-semibold mb-4" style={{ color: '#E5E7EB' }}>
                  {editingSession ? 'Edit Session' : 'Create New Session'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Session Name</label>
                    <input
                      type="text"
                      value={sessionFormData.name}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border"
                      style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                      placeholder="e.g., MBBL Season 4 - Men"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={sessionFormData.is_complete}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, is_complete: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label className="text-sm" style={{ color: '#E5E7EB' }}>Mark as Complete</label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={editingSession ? handleUpdateSession : handleCreateSession}
                      className="px-4 py-2 rounded-lg font-semibold transition-colors"
                      style={{ backgroundColor: '#E11D48', color: '#E5E7EB' }}
                    >
                      {editingSession ? 'Update' : 'Create'}
                    </button>
                    <button
                      onClick={() => {
                        setShowSessionForm(false);
                        setEditingSession(null);
                        setSessionFormData({ name: '', is_complete: false });
                      }}
                      className="px-4 py-2 rounded-lg font-semibold transition-colors"
                      style={{ backgroundColor: '#1F2937', color: '#9CA3AF' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 md:p-6 rounded-lg border flex flex-col md:flex-row md:justify-between md:items-center gap-4"
                  style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}
                >
                  <div className="flex-1">
                    <h3 className="text-lg md:text-xl font-semibold mb-2" style={{ color: '#E5E7EB' }}>{session.session_name}</h3>
                    <p className="text-sm md:text-base" style={{ color: '#9CA3AF' }}>
                      Status: <span className={session.is_complete ? 'text-red-500' : 'text-green-500'}>{session.is_complete ? 'Complete' : 'Active'}</span>
                    </p>
                    <p className="text-sm md:text-base" style={{ color: '#9CA3AF' }}>
                      Created: {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        setEditingSession(session);
                        setSessionFormData({ name: session.session_name, is_complete: session.is_complete });
                        setShowSessionForm(true);
                      }}
                      className="px-4 py-2 rounded text-sm md:text-base font-medium transition-colors"
                      style={{ backgroundColor: '#1F2937', color: '#E5E7EB' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="px-4 py-2 rounded text-sm md:text-base font-medium transition-colors"
                      style={{ backgroundColor: '#E11D48', color: '#E5E7EB' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teams Tab */}
        {activeTab === 'teams' && (
          <div>
            <div className="mb-4 md:mb-6">
              <label className="block text-sm md:text-base font-medium mb-2" style={{ color: '#E5E7EB' }}>Select Session</label>
              <select
                value={selectedSessionForTeams}
                onChange={(e) => setSelectedSessionForTeams(e.target.value)}
                className="w-full md:w-80 lg:w-96 px-3 py-2 md:px-4 md:py-3 rounded-lg border text-sm md:text-base"
                style={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#E5E7EB' }}
              >
                <option value="">Select a session...</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>{session.session_name}</option>
                ))}
              </select>
            </div>

            {selectedSessionForTeams && (
              <>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-bold" style={{ color: '#E5E7EB' }}>Teams</h2>
                  <button
                    onClick={() => {
                      setEditingTeam(null);
                      setTeamFormData({ name: '', owner_name: '', budget: '1000000', logo_url: '' });
                      setShowTeamForm(true);
                    }}
                    className="px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold transition-colors w-full md:w-auto"
                    style={{ backgroundColor: '#E11D48', color: '#E5E7EB' }}
                  >
                    + Add Team
                  </button>
                </div>

                {showTeamForm && (
                  <div className="mb-6 p-4 md:p-6 rounded-lg border" style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}>
                    <h3 className="text-lg md:text-xl font-semibold mb-4 md:mb-6" style={{ color: '#E5E7EB' }}>
                      {editingTeam ? 'Edit Team' : 'Add New Team'}
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Team Name</label>
                        <input
                          type="text"
                          value={teamFormData.name}
                          onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Owner Name</label>
                        <input
                          type="text"
                          value={teamFormData.owner_name}
                          onChange={(e) => setTeamFormData({ ...teamFormData, owner_name: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Initial Budget (₹)</label>
                        <input
                          type="number"
                          value={teamFormData.budget}
                          onChange={(e) => setTeamFormData({ ...teamFormData, budget: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                          placeholder="1000000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Logo URL (Google Drive or direct link)</label>
                        <input
                          type="text"
                          value={teamFormData.logo_url}
                          onChange={(e) => setTeamFormData({ ...teamFormData, logo_url: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                          placeholder="https://drive.google.com/..."
                        />
                        <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                          Paste a Google Drive share link or direct image URL. Make sure the file is publicly accessible.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={editingTeam ? handleUpdateTeam : handleCreateTeam}
                          className="px-4 py-2 rounded-lg font-semibold transition-colors"
                          style={{ backgroundColor: '#E11D48', color: '#E5E7EB' }}
                        >
                          {editingTeam ? 'Update' : 'Create'}
                        </button>
                        <button
                          onClick={() => {
                            setShowTeamForm(false);
                            setEditingTeam(null);
                            setTeamFormData({ name: '', owner_name: '', budget: '1000000', logo_url: '' });
                          }}
                          className="px-4 py-2 rounded-lg font-semibold transition-colors"
                          style={{ backgroundColor: '#1F2937', color: '#9CA3AF' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {teams.map((team) => (
                    <div
                      key={team.id}
                      className="p-4 md:p-6 rounded-lg border hover:border-[#E11D48] transition-colors"
                      style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}
                    >
                      {team.logo_url && (
                        <div className="mb-4 flex justify-center">
                          <Image
                            src={team.logo_url}
                            alt={`${team.name} logo`}
                            width={100}
                            height={100}
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                      )}
                      <h3 className="text-lg md:text-xl font-semibold mb-2" style={{ color: '#E5E7EB' }}>{team.name}</h3>
                      <p className="text-sm md:text-base mb-1" style={{ color: '#9CA3AF' }}>Owner: {team.owner_name}</p>
                      <p className="text-sm md:text-base mb-4" style={{ color: '#9CA3AF' }}>Budget: ₹{team.budget.toLocaleString()}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingTeam(team);
                            setTeamFormData({
                              name: team.name,
                              owner_name: team.owner_name,
                              budget: team.budget.toString(),
                              logo_url: team.logo_url || ''
                            });
                            setShowTeamForm(true);
                          }}
                          className="flex-1 px-3 py-2 md:px-4 md:py-2 rounded text-sm md:text-base font-medium transition-colors"
                          style={{ backgroundColor: '#1F2937', color: '#E5E7EB' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          className="flex-1 px-3 py-2 md:px-4 md:py-2 rounded text-sm md:text-base font-medium transition-colors"
                          style={{ backgroundColor: '#E11D48', color: '#E5E7EB' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Players Tab */}
        {activeTab === 'players' && (
          <div>
            <div className="mb-4 md:mb-6">
              <label className="block text-sm md:text-base font-medium mb-2" style={{ color: '#E5E7EB' }}>Select Session</label>
              <select
                value={selectedSessionForPlayers}
                onChange={(e) => setSelectedSessionForPlayers(e.target.value)}
                className="w-full md:w-80 lg:w-96 px-3 py-2 md:px-4 md:py-3 rounded-lg border text-sm md:text-base"
                style={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#E5E7EB' }}
              >
                <option value="">Select a session...</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>{session.session_name}</option>
                ))}
              </select>
            </div>

            {selectedSessionForPlayers && (
              <>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-bold" style={{ color: '#E5E7EB' }}>Players</h2>
                  <button
                    onClick={() => {
                      setEditingPlayer(null);
                      setPlayerFormData({ name: '', photo: '', age: '', skill: '', batting_hand: '', played_s1: '', experience: '', active_sport: '', player_order: '' });
                      setShowPlayerForm(true);
                    }}
                    className="px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold transition-colors w-full md:w-auto"
                    style={{ backgroundColor: '#E11D48', color: '#E5E7EB' }}
                  >
                    + Add Player
                  </button>
                </div>

                {showPlayerForm && (
                  <div className="mb-6 p-4 md:p-6 rounded-lg border" style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}>
                    <h3 className="text-lg md:text-xl font-semibold mb-4 md:mb-6" style={{ color: '#E5E7EB' }}>
                      {editingPlayer ? 'Edit Player' : 'Add New Player'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Player Name *</label>
                        <input
                          type="text"
                          value={playerFormData.name}
                          onChange={(e) => setPlayerFormData({ ...playerFormData, name: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Photo URL</label>
                        <input
                          type="text"
                          value={playerFormData.photo}
                          onChange={(e) => setPlayerFormData({ ...playerFormData, photo: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                          placeholder="Google Drive or direct link"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Age</label>
                        <input
                          type="number"
                          value={playerFormData.age}
                          onChange={(e) => setPlayerFormData({ ...playerFormData, age: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Skill</label>
                        <select
                          value={playerFormData.skill}
                          onChange={(e) => setPlayerFormData({ ...playerFormData, skill: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                        >
                          <option value="">Select...</option>
                          <option value="Batsman">Batsman</option>
                          <option value="Bowler">Bowler</option>
                          <option value="All Rounder">All Rounder</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Batting Hand</label>
                        <select
                          value={playerFormData.batting_hand}
                          onChange={(e) => setPlayerFormData({ ...playerFormData, batting_hand: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                        >
                          <option value="">Select...</option>
                          <option value="Right">Right</option>
                          <option value="Left">Left</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Played Previous Season</label>
                        <select
                          value={playerFormData.played_s1}
                          onChange={(e) => setPlayerFormData({ ...playerFormData, played_s1: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                        >
                          <option value="">Select...</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Experience</label>
                        <input
                          type="text"
                          value={playerFormData.experience}
                          onChange={(e) => setPlayerFormData({ ...playerFormData, experience: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Active Sport</label>
                        <input
                          type="text"
                          value={playerFormData.active_sport}
                          onChange={(e) => setPlayerFormData({ ...playerFormData, active_sport: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Player Order (optional)</label>
                        <input
                          type="number"
                          value={playerFormData.player_order}
                          onChange={(e) => setPlayerFormData({ ...playerFormData, player_order: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                          placeholder="Auto-assigned if empty"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={editingPlayer ? handleUpdatePlayer : handleCreatePlayer}
                        className="px-4 py-2 rounded-lg font-semibold transition-colors"
                        style={{ backgroundColor: '#E11D48', color: '#E5E7EB' }}
                      >
                        {editingPlayer ? 'Update' : 'Create'}
                      </button>
                      <button
                        onClick={() => {
                          setShowPlayerForm(false);
                          setEditingPlayer(null);
                          setPlayerFormData({ name: '', photo: '', age: '', skill: '', batting_hand: '', played_s1: '', experience: '', active_sport: '', player_order: '' });
                        }}
                        className="px-4 py-2 rounded-lg font-semibold transition-colors"
                        style={{ backgroundColor: '#1F2937', color: '#9CA3AF' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="p-4 md:p-6 rounded-lg border flex flex-col md:flex-row md:justify-between md:items-center gap-4 hover:border-[#E11D48] transition-colors"
                      style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        {player.photo && (
                          <Image
                            src={player.photo}
                            alt={player.name}
                            width={80}
                            height={80}
                            className="object-cover rounded-lg flex-shrink-0"
                            unoptimized
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg md:text-xl font-semibold mb-1" style={{ color: '#E5E7EB' }}>{player.name}</h3>
                          <p className="text-sm md:text-base" style={{ color: '#9CA3AF' }}>
                            {player.age && <span>Age: {player.age}</span>}
                            {player.age && player.skill && <span> | </span>}
                            {player.skill && <span>Skill: {player.skill}</span>}
                            {(player.age || player.skill) && <span> | </span>}
                            <span>Order: {player.player_order}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => {
                            setEditingPlayer(player);
                            setPlayerFormData({
                              name: player.name,
                              photo: player.photo || '',
                              age: player.age?.toString() || '',
                              skill: player.skill || '',
                              batting_hand: player.batting_hand || '',
                              played_s1: player.played_s1 || '',
                              experience: player.experience || '',
                              active_sport: player.active_sport || '',
                              player_order: player.player_order.toString()
                            });
                            setShowPlayerForm(true);
                          }}
                          className="px-4 py-2 rounded text-sm md:text-base font-medium transition-colors"
                          style={{ backgroundColor: '#1F2937', color: '#E5E7EB' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePlayer(player.id)}
                          className="px-4 py-2 rounded text-sm md:text-base font-medium transition-colors"
                          style={{ backgroundColor: '#E11D48', color: '#E5E7EB' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div>
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-6" style={{ color: '#E5E7EB' }}>Auction Settings</h2>
            <div className="p-4 md:p-6 rounded-lg border" style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Settings are currently hardcoded in the application. To customize:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm" style={{ color: '#9CA3AF' }}>
                <li>Minimum Bid: ₹5,000 (in AuctionClient.tsx)</li>
                <li>Players Per Team: 11 (in AuctionClient.tsx)</li>
                <li>Bid Increments: Dynamic based on bid amount (in AuctionClient.tsx)</li>
              </ul>
              <p className="text-sm mt-4" style={{ color: '#9CA3AF' }}>
                To make these configurable, you would need to add a settings table in the database and update the AuctionClient component to read from it.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

