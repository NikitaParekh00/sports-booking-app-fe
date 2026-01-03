"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import Image from 'next/image';
import { processImageUrl } from '@/lib/imageUrlHelper';

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
  owner_photo?: string;
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
  bowling_hand?: string;
  wing?: string;
  flat_no?: string;
  phone?: string;
  category?: string;
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
  const [teamFormData, setTeamFormData] = useState({ name: '', owner_name: '', owner_photo: '', budget: '', logo_url: '' });

  // Players state
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedSessionForPlayers, setSelectedSessionForPlayers] = useState<string>('');
  const [showPlayerForm, setShowPlayerForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [playerFormData, setPlayerFormData] = useState({
    name: '', photo: '', age: '', skill: '', batting_hand: '', bowling_hand: '', wing: '', flat_no: '', phone: '', category: '', played_s1: '', experience: '', active_sport: '', player_order: ''
  });
  const [uploadingPlayers, setUploadingPlayers] = useState(false);
  const [uploadingTeams, setUploadingTeams] = useState(false);

  // Settings state
  const [selectedSessionForSettings, setSelectedSessionForSettings] = useState<string>('');
  const [settings, setSettings] = useState<any>(null);
  const [settingsFormData, setSettingsFormData] = useState({
    minimum_bid: '5000',
    players_per_team: '11',
    default_bid_increment: '5000',
    bid_increment_1_threshold: '100000',
    bid_increment_1_amount: '10000',
    bid_increment_2_threshold: '200000',
    bid_increment_2_amount: '20000',
    bid_increment_3_threshold: '400000',
    bid_increment_3_amount: '30000',
    bid_increment_4_threshold: '700000',
    bid_increment_4_amount: '50000'
  });
  const [categoryColorMappings, setCategoryColorMappings] = useState<Array<{ category: string, color: string }>>([]);

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

  // Load settings when session is selected
  useEffect(() => {
    if (selectedSessionForSettings && isAdmin) {
      loadSettings(selectedSessionForSettings);
    }
  }, [selectedSessionForSettings, isAdmin]);

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
          owner_photo: teamFormData.owner_photo || null,
          budget: parseFloat(teamFormData.budget) || 1000000,
          team_number: nextTeamNumber,
          logo_url: teamFormData.logo_url || null
        }]);

      if (error) throw error;
      alert('Team created successfully!');
      setShowTeamForm(false);
      setTeamFormData({ name: '', owner_name: '', owner_photo: '', budget: '', logo_url: '' });
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
          owner_photo: teamFormData.owner_photo || null,
          budget: parseFloat(teamFormData.budget) || editingTeam.budget,
          logo_url: teamFormData.logo_url || null
        })
        .eq('id', editingTeam.id);

      if (error) throw error;
      alert('Team updated successfully!');
      setEditingTeam(null);
      setShowTeamForm(false);
      setTeamFormData({ name: '', owner_name: '', owner_photo: '', budget: '', logo_url: '' });
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

  const handleDeleteAllTeams = async () => {
    if (!selectedSessionForTeams) {
      alert('Please select a session first');
      return;
    }

    if (!confirm(`Are you sure you want to delete ALL teams for this session? This action cannot be undone.`)) return;
    if (!confirm(`This will delete ${teams.length} team(s). Are you absolutely sure?`)) return;

    try {
      const { error } = await supabase
        .from('auction_teams')
        .delete()
        .eq('session_id', selectedSessionForTeams);

      if (error) throw error;
      alert(`Successfully deleted all ${teams.length} team(s)!`);
      loadTeams(selectedSessionForTeams);
    } catch (error: any) {
      console.error('Error deleting all teams:', error);
      alert(`Error deleting all teams: ${error.message}`);
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
          bowling_hand: playerFormData.bowling_hand || null,
          wing: playerFormData.wing || null,
          flat_no: playerFormData.flat_no || null,
          phone: playerFormData.phone || null,
          category: playerFormData.category || null,
          played_s1: playerFormData.played_s1 || null,
          experience: playerFormData.experience || null,
          active_sport: playerFormData.active_sport || null,
          player_order: playerFormData.player_order ? parseInt(playerFormData.player_order) : nextPlayerOrder
        }]);

      if (error) throw error;
      alert('Player created successfully!');
      setShowPlayerForm(false);
      setPlayerFormData({ name: '', photo: '', age: '', skill: '', batting_hand: '', bowling_hand: '', wing: '', flat_no: '', phone: '', category: '', played_s1: '', experience: '', active_sport: '', player_order: '' });
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
      setPlayerFormData({ name: '', photo: '', age: '', skill: '', batting_hand: '', bowling_hand: '', wing: '', flat_no: '', phone: '', category: '', played_s1: '', experience: '', active_sport: '', player_order: '' });
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

  const handleDeleteAllPlayers = async () => {
    if (!selectedSessionForPlayers) {
      alert('Please select a session first');
      return;
    }

    if (!confirm(`Are you sure you want to delete ALL players for this session? This action cannot be undone.`)) return;
    if (!confirm(`This will delete ${players.length} player(s). Are you absolutely sure?`)) return;

    try {
      const { error } = await supabase
        .from('auction_player_pool')
        .delete()
        .eq('session_id', selectedSessionForPlayers);

      if (error) throw error;
      alert(`Successfully deleted all ${players.length} player(s)!`);
      loadPlayers(selectedSessionForPlayers);
    } catch (error: any) {
      console.error('Error deleting all players:', error);
      alert(`Error deleting all players: ${error.message}`);
    }
  };

  const handleTeamFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedSessionForTeams) {
      alert('Please select a session first');
      event.target.value = ''; // Reset file input
      return;
    }

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      event.target.value = ''; // Reset file input
      return;
    }

    setUploadingTeams(true);

    try {
      const text = await file.text();
      const teams = parseCSV(text);

      if (teams.length === 0) {
        alert('No teams found in the CSV file');
        setUploadingTeams(false);
        event.target.value = ''; // Reset file input
        return;
      }

      // Get all existing team_number values for this session to avoid duplicates
      const { data: existingTeams } = await supabase
        .from('auction_teams')
        .select('team_number')
        .eq('session_id', selectedSessionForTeams);

      const existingNumbers = new Set(
        (existingTeams || []).map(t => t.team_number).filter(n => n != null)
      );

      // Find the maximum team_number to start from
      const maxNumber = existingNumbers.size > 0
        ? Math.max(...Array.from(existingNumbers))
        : 0;

      let nextAvailableNumber = maxNumber + 1;

      // Prepare teams for insertion
      const teamsToInsert = teams.map((team) => {
        let teamNumber: number;

        // Auto-assign team number sequentially
        while (existingNumbers.has(nextAvailableNumber)) {
          nextAvailableNumber++;
        }
        teamNumber = nextAvailableNumber;
        existingNumbers.add(nextAvailableNumber);
        nextAvailableNumber++;

        return {
          session_id: selectedSessionForTeams,
          name: team.name || '',
          owner_name: team.owner_name || null,
          owner_photo: team.owner_photo || null,
          budget: team.budget ? parseFloat(team.budget) : 111000,
          team_number: teamNumber,
          logo_url: team.logo_url || null
        };
      });

      // Insert teams in batches
      const batchSize = 50;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < teamsToInsert.length; i += batchSize) {
        const batch = teamsToInsert.slice(i, i + batchSize);
        const { error } = await supabase
          .from('auction_teams')
          .insert(batch);

        if (error) {
          console.error('Error inserting batch:', error);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }
      }

      if (errorCount > 0) {
        alert(`Uploaded ${successCount} teams. ${errorCount} teams failed to upload.`);
      } else {
        alert(`Successfully uploaded ${successCount} teams!`);
      }

      loadTeams(selectedSessionForTeams);
    } catch (error: any) {
      console.error('Error uploading teams:', error);
      alert(`Error uploading teams: ${error.message}`);
    } finally {
      setUploadingTeams(false);
      event.target.value = ''; // Reset file input
    }
  };

  const parseCSV = (csvText: string): any[] => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const players: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length === 0 || !values[0]) continue; // Skip empty rows

      const player: any = {};
      headers.forEach((header, index) => {
        player[header] = values[index] || '';
      });
      players.push(player);
    }

    return players;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedSessionForPlayers) {
      alert('Please select a session first');
      event.target.value = ''; // Reset file input
      return;
    }

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      event.target.value = ''; // Reset file input
      return;
    }

    setUploadingPlayers(true);

    try {
      const text = await file.text();
      const players = parseCSV(text);

      if (players.length === 0) {
        alert('No players found in the CSV file');
        setUploadingPlayers(false);
        event.target.value = ''; // Reset file input
        return;
      }

      // Get all existing player_order values for this session to avoid duplicates
      const { data: existingPlayers } = await supabase
        .from('auction_player_pool')
        .select('player_order')
        .eq('session_id', selectedSessionForPlayers);

      const existingOrders = new Set(
        (existingPlayers || []).map(p => p.player_order).filter(o => o != null)
      );

      // Find the maximum player_order to start from
      const maxOrder = existingOrders.size > 0
        ? Math.max(...Array.from(existingOrders))
        : 0;

      let nextAvailableOrder = maxOrder + 1;

      // Prepare players for insertion
      const playersToInsert = players.map((player) => {
        let playerOrder: number;

        // If player_order is provided in CSV, try to use it
        if (player.player_order && player.player_order.trim() !== '') {
          const requestedOrder = parseInt(player.player_order);
          // Check if this order is already taken
          if (!existingOrders.has(requestedOrder) && requestedOrder > 0) {
            playerOrder = requestedOrder;
            existingOrders.add(requestedOrder); // Mark as used
          } else {
            // Order is taken, find next available
            while (existingOrders.has(nextAvailableOrder)) {
              nextAvailableOrder++;
            }
            playerOrder = nextAvailableOrder;
            existingOrders.add(nextAvailableOrder);
            nextAvailableOrder++;
          }
        } else {
          // No order specified, find next available
          while (existingOrders.has(nextAvailableOrder)) {
            nextAvailableOrder++;
          }
          playerOrder = nextAvailableOrder;
          existingOrders.add(nextAvailableOrder);
          nextAvailableOrder++;
        }

        // Normalize played_s1 to match check constraint (must be 'Yes' or 'No')
        let normalizedPlayedS1: string | null = null;
        if (player.played_s1) {
          const playedS1Lower = player.played_s1.trim().toLowerCase();
          if (playedS1Lower === 'yes' || playedS1Lower === 'y' || playedS1Lower === '1' || playedS1Lower === 'true') {
            normalizedPlayedS1 = 'Yes';
          } else if (playedS1Lower === 'no' || playedS1Lower === 'n' || playedS1Lower === '0' || playedS1Lower === 'false') {
            normalizedPlayedS1 = 'No';
          }
          // If it doesn't match any expected value, set to null
        }

        return {
          session_id: selectedSessionForPlayers,
          name: player.name || '',
          photo: player.photo || null,
          age: player.age ? parseInt(player.age) : null,
          skill: player.skill || null,
          batting_hand: player.batting_hand || null,
          bowling_hand: player.bowling_hand || null,
          wing: player.wing || null,
          flat_no: player.flat_no || null,
          phone: player.phone || null,
          category: player.category || null,
          played_s1: normalizedPlayedS1,
          experience: player.experience || null,
          active_sport: player.active_sport || null,
          player_order: playerOrder
        };
      });

      // Insert players in batches to avoid overwhelming the database
      const batchSize = 50;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < playersToInsert.length; i += batchSize) {
        const batch = playersToInsert.slice(i, i + batchSize);
        const { error } = await supabase
          .from('auction_player_pool')
          .insert(batch);

        if (error) {
          console.error('Error inserting batch:', error);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
        }
      }

      if (errorCount > 0) {
        alert(`Uploaded ${successCount} players. ${errorCount} players failed to upload.`);
      } else {
        alert(`Successfully uploaded ${successCount} players!`);
      }

      loadPlayers(selectedSessionForPlayers);
    } catch (error: any) {
      console.error('Error uploading players:', error);
      alert(`Error uploading players: ${error.message}`);
    } finally {
      setUploadingPlayers(false);
      event.target.value = ''; // Reset file input
    }
  };

  const loadSettings = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('auction_settings')
        .select('*')
        .eq('session_id', sessionId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setSettings(data);
        setSettingsFormData({
          minimum_bid: data.minimum_bid?.toString() || '5000',
          players_per_team: data.players_per_team?.toString() || '11',
          default_bid_increment: data.default_bid_increment?.toString() || '5000',
          bid_increment_1_threshold: data.bid_increment_1_threshold?.toString() || '100000',
          bid_increment_1_amount: data.bid_increment_1_amount?.toString() || '10000',
          bid_increment_2_threshold: data.bid_increment_2_threshold?.toString() || '200000',
          bid_increment_2_amount: data.bid_increment_2_amount?.toString() || '20000',
          bid_increment_3_threshold: data.bid_increment_3_threshold?.toString() || '400000',
          bid_increment_3_amount: data.bid_increment_3_amount?.toString() || '30000',
          bid_increment_4_threshold: data.bid_increment_4_threshold?.toString() || '700000',
          bid_increment_4_amount: data.bid_increment_4_amount?.toString() || '50000'
        });
        // Load category color mappings
        if (data.category_color_mapping && typeof data.category_color_mapping === 'object') {
          const mappings = Object.entries(data.category_color_mapping).map(([category, color]) => ({
            category,
            color: color as string
          }));
          setCategoryColorMappings(mappings);
        } else {
          setCategoryColorMappings([]);
        }
      } else {
        // No settings found, use defaults
        setSettings(null);
        setSettingsFormData({
          minimum_bid: '5000',
          players_per_team: '11',
          default_bid_increment: '5000',
          bid_increment_1_threshold: '100000',
          bid_increment_1_amount: '10000',
          bid_increment_2_threshold: '200000',
          bid_increment_2_amount: '20000',
          bid_increment_3_threshold: '400000',
          bid_increment_3_amount: '30000',
          bid_increment_4_threshold: '700000',
          bid_increment_4_amount: '50000'
        });
        setCategoryColorMappings([]);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      alert('Error loading settings');
    }
  };

  const handleSaveSettings = async () => {
    if (!selectedSessionForSettings) {
      alert('Please select a session first');
      return;
    }

    try {
      // Convert category color mappings array to object
      const categoryColorMappingObj: Record<string, string> = {};
      categoryColorMappings.forEach(({ category, color }) => {
        if (category.trim()) {
          categoryColorMappingObj[category.trim()] = color;
        }
      });

      const settingsData = {
        session_id: selectedSessionForSettings,
        minimum_bid: parseFloat(settingsFormData.minimum_bid) || 5000,
        players_per_team: parseInt(settingsFormData.players_per_team) || 11,
        default_bid_increment: parseFloat(settingsFormData.default_bid_increment) || 5000,
        bid_increment_1_threshold: parseFloat(settingsFormData.bid_increment_1_threshold) || 100000,
        bid_increment_1_amount: parseFloat(settingsFormData.bid_increment_1_amount) || 10000,
        bid_increment_2_threshold: parseFloat(settingsFormData.bid_increment_2_threshold) || 200000,
        bid_increment_2_amount: parseFloat(settingsFormData.bid_increment_2_amount) || 20000,
        bid_increment_3_threshold: parseFloat(settingsFormData.bid_increment_3_threshold) || 400000,
        bid_increment_3_amount: parseFloat(settingsFormData.bid_increment_3_amount) || 30000,
        bid_increment_4_threshold: parseFloat(settingsFormData.bid_increment_4_threshold) || 700000,
        bid_increment_4_amount: parseFloat(settingsFormData.bid_increment_4_amount) || 50000,
        category_color_mapping: categoryColorMappingObj,
        updated_at: new Date().toISOString()
      };

      if (settings) {
        // Update existing settings
        const { error } = await supabase
          .from('auction_settings')
          .update(settingsData)
          .eq('session_id', selectedSessionForSettings);

        if (error) throw error;
        alert('Settings updated successfully!');
      } else {
        // Create new settings
        const { error } = await supabase
          .from('auction_settings')
          .insert([settingsData]);

        if (error) throw error;
        alert('Settings created successfully!');
      }

      loadSettings(selectedSessionForSettings);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert(`Error saving settings: ${error.message}`);
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
              Back to Dashboard
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b overflow-x-auto" style={{ borderColor: '#1F2937' }}>
            {(['sessions', 'teams', 'players', 'settings'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 md:px-6 md:py-3 font-semibold transition-colors capitalize whitespace-nowrap ${activeTab === tab ? 'border-b-2' : ''
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
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <a
                      href="/team_upload_template.csv"
                      download="team_upload_template.csv"
                      className="px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold transition-colors text-center w-full md:w-auto"
                      style={{ backgroundColor: '#1F2937', color: '#E5E7EB', border: '1px solid #1F2937' }}
                    >
                      Download Template
                    </a>
                    <label
                      className="px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold transition-colors text-center w-full md:w-auto cursor-pointer"
                      style={{ backgroundColor: '#22C55E', color: '#E5E7EB' }}
                    >
                      {uploadingTeams ? 'Uploading...' : 'Upload CSV'}
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleTeamFileUpload}
                        disabled={uploadingTeams}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={() => {
                        setEditingTeam(null);
                        setTeamFormData({ name: '', owner_name: '', owner_photo: '', budget: '1000000', logo_url: '' });
                        setShowTeamForm(true);
                      }}
                      className="px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold transition-colors w-full md:w-auto"
                      style={{ backgroundColor: '#E11D48', color: '#E5E7EB' }}
                    >
                      Add Team
                    </button>
                    {teams.length > 0 && (
                      <button
                        onClick={handleDeleteAllTeams}
                        className="px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold transition-colors w-full md:w-auto"
                        style={{ backgroundColor: '#DC2626', color: '#E5E7EB' }}
                      >
                        Delete All Teams
                      </button>
                    )}
                  </div>
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
                        <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Owner Photo URL</label>
                        <input
                          type="text"
                          value={teamFormData.owner_photo}
                          onChange={(e) => setTeamFormData({ ...teamFormData, owner_photo: e.target.value })}
                          placeholder="Enter owner photo URL (Google Drive link or direct URL)"
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
                            setTeamFormData({ name: '', owner_name: '', owner_photo: '', budget: '1000000', logo_url: '' });
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
                      <h3 className="text-xs sm:text-sm md:text-base font-semibold mb-2 whitespace-nowrap" style={{ color: '#E5E7EB' }}>{team.name}</h3>
                      <div className="flex items-center gap-2 mb-1">
                        {team.owner_photo && (() => {
                          const ownerPhotoUrl = processImageUrl(team.owner_photo);
                          if (!ownerPhotoUrl) return null;
                          const isProxyUrl = ownerPhotoUrl.startsWith('/api/proxy-image');
                          if (isProxyUrl) {
                            return (
                              <img
                                src={ownerPhotoUrl}
                                alt={team.owner_name}
                                width={24}
                                height={24}
                                className="object-cover rounded-full flex-shrink-0"
                              />
                            );
                          }
                          return (
                            <Image
                              src={ownerPhotoUrl}
                              alt={team.owner_name}
                              width={24}
                              height={24}
                              className="object-cover rounded-full flex-shrink-0"
                              unoptimized
                            />
                          );
                        })()}
                        <p className="text-sm md:text-base" style={{ color: '#9CA3AF' }}>Owner: {team.owner_name}</p>
                      </div>
                      <p className="text-sm md:text-base mb-4" style={{ color: '#9CA3AF' }}>Budget: ₹{team.budget.toLocaleString()}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingTeam(team);
                            setTeamFormData({
                              name: team.name,
                              owner_name: team.owner_name,
                              owner_photo: team.owner_photo || '',
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
                  <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <a
                      href="/player_upload_template.csv"
                      download="player_upload_template.csv"
                      className="px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold transition-colors text-center w-full md:w-auto"
                      style={{ backgroundColor: '#1F2937', color: '#E5E7EB', border: '1px solid #1F2937' }}
                    >
                      Download Template
                    </a>
                    <label
                      className="px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold transition-colors text-center w-full md:w-auto cursor-pointer"
                      style={{ backgroundColor: '#22C55E', color: '#E5E7EB' }}
                    >
                      {uploadingPlayers ? 'Uploading...' : 'Upload CSV'}
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        disabled={uploadingPlayers}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={() => {
                        setEditingPlayer(null);
                        setPlayerFormData({ name: '', photo: '', age: '', skill: '', batting_hand: '', bowling_hand: '', wing: '', flat_no: '', phone: '', category: '', played_s1: '', experience: '', active_sport: '', player_order: '' });
                        setShowPlayerForm(true);
                      }}
                      className="px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold transition-colors w-full md:w-auto"
                      style={{ backgroundColor: '#E11D48', color: '#E5E7EB' }}
                    >
                      Add Player
                    </button>
                    {players.length > 0 && (
                      <button
                        onClick={handleDeleteAllPlayers}
                        className="px-4 py-2 md:px-6 md:py-3 rounded-lg font-semibold transition-colors w-full md:w-auto"
                        style={{ backgroundColor: '#DC2626', color: '#E5E7EB' }}
                      >
                        Delete All Players
                      </button>
                    )}
                  </div>
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
                        <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Bowling Hand</label>
                        <select
                          value={playerFormData.bowling_hand}
                          onChange={(e) => setPlayerFormData({ ...playerFormData, bowling_hand: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                        >
                          <option value="">Select...</option>
                          <option value="Right">Right</option>
                          <option value="Left">Left</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Wing</label>
                        <input
                          type="text"
                          value={playerFormData.wing}
                          onChange={(e) => setPlayerFormData({ ...playerFormData, wing: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                          placeholder="e.g., A Wing, B Wing"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Flat No</label>
                        <input
                          type="text"
                          value={playerFormData.flat_no}
                          onChange={(e) => setPlayerFormData({ ...playerFormData, flat_no: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                          placeholder="e.g., 101, 202"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Phone</label>
                        <input
                          type="text"
                          value={playerFormData.phone}
                          onChange={(e) => setPlayerFormData({ ...playerFormData, phone: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                          placeholder="e.g., +91-9876543210"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Category</label>
                        <input
                          type="text"
                          value={playerFormData.category}
                          onChange={(e) => setPlayerFormData({ ...playerFormData, category: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border"
                          style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                          placeholder="e.g., Marquee, Regular"
                        />
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
                          setPlayerFormData({ name: '', photo: '', age: '', skill: '', batting_hand: '', bowling_hand: '', wing: '', flat_no: '', phone: '', category: '', played_s1: '', experience: '', active_sport: '', player_order: '' });
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
                        {(() => {
                          const photoUrl = processImageUrl(player.photo);
                          if (!photoUrl) return null;
                          const isProxyUrl = photoUrl.startsWith('/api/proxy-image');
                          if (isProxyUrl) {
                            return (
                              <img
                                src={photoUrl}
                                alt={player.name}
                                width={80}
                                height={80}
                                className="object-cover rounded-lg flex-shrink-0"
                              />
                            );
                          }
                          return (
                            <Image
                              src={photoUrl}
                              alt={player.name}
                              width={80}
                              height={80}
                              className="object-cover rounded-lg flex-shrink-0"
                              unoptimized
                            />
                          );
                        })()}
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
                              bowling_hand: player.bowling_hand || '',
                              wing: player.wing || '',
                              flat_no: player.flat_no || '',
                              phone: player.phone || '',
                              category: player.category || '',
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
            <div className="mb-4 md:mb-6">
              <label className="block text-sm md:text-base font-medium mb-2" style={{ color: '#E5E7EB' }}>Select Session</label>
              <select
                value={selectedSessionForSettings}
                onChange={(e) => setSelectedSessionForSettings(e.target.value)}
                className="w-full md:w-80 lg:w-96 px-3 py-2 md:px-4 md:py-3 rounded-lg border text-sm md:text-base"
                style={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#E5E7EB' }}
              >
                <option value="">Select a session...</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>{session.session_name}</option>
                ))}
              </select>
            </div>

            {selectedSessionForSettings && (
              <>
                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold mb-4 md:mb-6" style={{ color: '#E5E7EB' }}>Auction Settings</h2>
                <div className="p-4 md:p-6 rounded-lg border" style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}>
                  <div className="space-y-4">
                    {/* Basic Settings */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3" style={{ color: '#E5E7EB' }}>Basic Settings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Minimum Bid (₹)</label>
                          <input
                            type="number"
                            value={settingsFormData.minimum_bid}
                            onChange={(e) => setSettingsFormData({ ...settingsFormData, minimum_bid: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border"
                            style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Players Per Team</label>
                          <input
                            type="number"
                            value={settingsFormData.players_per_team}
                            onChange={(e) => setSettingsFormData({ ...settingsFormData, players_per_team: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border"
                            style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Default Bid Increment (₹)</label>
                          <input
                            type="number"
                            value={settingsFormData.default_bid_increment}
                            onChange={(e) => setSettingsFormData({ ...settingsFormData, default_bid_increment: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border"
                            style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                            placeholder="Used below first threshold"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bid Increment Tiers */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3" style={{ color: '#E5E7EB' }}>Dynamic Bid Increments</h3>
                      <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
                        Configure bid increments based on bid amount thresholds. The system will use the highest threshold that the current bid exceeds.
                      </p>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded border" style={{ backgroundColor: '#1F2937', borderColor: '#1F2937' }}>
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Tier 1: Threshold (₹)</label>
                            <input
                              type="number"
                              value={settingsFormData.bid_increment_1_threshold}
                              onChange={(e) => setSettingsFormData({ ...settingsFormData, bid_increment_1_threshold: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border"
                              style={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#E5E7EB' }}
                              placeholder="100000"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Tier 1: Increment Amount (₹)</label>
                            <input
                              type="number"
                              value={settingsFormData.bid_increment_1_amount}
                              onChange={(e) => setSettingsFormData({ ...settingsFormData, bid_increment_1_amount: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border"
                              style={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#E5E7EB' }}
                              placeholder="10000"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded border" style={{ backgroundColor: '#1F2937', borderColor: '#1F2937' }}>
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Tier 2: Threshold (₹)</label>
                            <input
                              type="number"
                              value={settingsFormData.bid_increment_2_threshold}
                              onChange={(e) => setSettingsFormData({ ...settingsFormData, bid_increment_2_threshold: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border"
                              style={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#E5E7EB' }}
                              placeholder="200000"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Tier 2: Increment Amount (₹)</label>
                            <input
                              type="number"
                              value={settingsFormData.bid_increment_2_amount}
                              onChange={(e) => setSettingsFormData({ ...settingsFormData, bid_increment_2_amount: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border"
                              style={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#E5E7EB' }}
                              placeholder="20000"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded border" style={{ backgroundColor: '#1F2937', borderColor: '#1F2937' }}>
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Tier 3: Threshold (₹)</label>
                            <input
                              type="number"
                              value={settingsFormData.bid_increment_3_threshold}
                              onChange={(e) => setSettingsFormData({ ...settingsFormData, bid_increment_3_threshold: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border"
                              style={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#E5E7EB' }}
                              placeholder="400000"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Tier 3: Increment Amount (₹)</label>
                            <input
                              type="number"
                              value={settingsFormData.bid_increment_3_amount}
                              onChange={(e) => setSettingsFormData({ ...settingsFormData, bid_increment_3_amount: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border"
                              style={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#E5E7EB' }}
                              placeholder="30000"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded border" style={{ backgroundColor: '#1F2937', borderColor: '#1F2937' }}>
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Tier 4: Threshold (₹)</label>
                            <input
                              type="number"
                              value={settingsFormData.bid_increment_4_threshold}
                              onChange={(e) => setSettingsFormData({ ...settingsFormData, bid_increment_4_threshold: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border"
                              style={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#E5E7EB' }}
                              placeholder="700000"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: '#E5E7EB' }}>Tier 4: Increment Amount (₹)</label>
                            <input
                              type="number"
                              value={settingsFormData.bid_increment_4_amount}
                              onChange={(e) => setSettingsFormData({ ...settingsFormData, bid_increment_4_amount: e.target.value })}
                              className="w-full px-3 py-2 rounded-lg border"
                              style={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#E5E7EB' }}
                              placeholder="50000"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Category Color Mapping */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3" style={{ color: '#E5E7EB' }}>Category Color Mapping</h3>
                      <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
                        Map player categories to colors. These colors will be used to display categories in the auction interface.
                      </p>
                      <div className="space-y-3">
                        {categoryColorMappings.map((mapping, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 rounded border" style={{ backgroundColor: '#1F2937', borderColor: '#1F2937' }}>
                            <input
                              type="text"
                              value={mapping.category}
                              onChange={(e) => {
                                const newMappings = [...categoryColorMappings];
                                newMappings[index].category = e.target.value;
                                setCategoryColorMappings(newMappings);
                              }}
                              className="flex-1 px-3 py-2 rounded-lg border"
                              style={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#E5E7EB' }}
                              placeholder="Category (e.g., A+, A, B)"
                            />
                            <input
                              type="color"
                              value={mapping.color}
                              onChange={(e) => {
                                const newMappings = [...categoryColorMappings];
                                newMappings[index].color = e.target.value;
                                setCategoryColorMappings(newMappings);
                              }}
                              className="w-16 h-10 rounded border cursor-pointer"
                              style={{ borderColor: '#1F2937' }}
                            />
                            <input
                              type="text"
                              value={mapping.color}
                              onChange={(e) => {
                                const newMappings = [...categoryColorMappings];
                                newMappings[index].color = e.target.value;
                                setCategoryColorMappings(newMappings);
                              }}
                              className="w-24 px-3 py-2 rounded-lg border text-sm"
                              style={{ backgroundColor: '#111827', borderColor: '#1F2937', color: '#E5E7EB' }}
                              placeholder="#000000"
                            />
                            <button
                              onClick={() => {
                                const newMappings = categoryColorMappings.filter((_, i) => i !== index);
                                setCategoryColorMappings(newMappings);
                              }}
                              className="px-3 py-2 rounded-lg font-medium transition-colors"
                              style={{ backgroundColor: '#DC2626', color: '#E5E7EB' }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => {
                            setCategoryColorMappings([...categoryColorMappings, { category: '', color: '#000000' }]);
                          }}
                          className="w-full px-4 py-2 rounded-lg font-semibold transition-colors border-2 border-dashed"
                          style={{ backgroundColor: '#1F2937', borderColor: '#1F2937', color: '#E5E7EB' }}
                        >
                          Add Category Color Mapping
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={handleSaveSettings}
                        className="px-4 py-2 rounded-lg font-semibold transition-colors"
                        style={{ backgroundColor: '#E11D48', color: '#E5E7EB' }}
                      >
                        {settings ? 'Update Settings' : 'Create Settings'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

