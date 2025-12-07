"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import {
  getOwnerTimeSlots,
  getOwnerCourts,
  getOwnerFacilities,
  createTimeSlot,
  updateTimeSlotAvailability,
  deleteTimeSlot,
  getOwnerStats,
  type TimeSlot,
  type Court,
  type OwnerStats,
  type Facility
} from '@/lib/ownerDb';

export default function OwnerDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [stats, setStats] = useState<OwnerStats>({
    totalCourts: 0,
    availableSlots: 0,
    bookedSlots: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedCourt, setSelectedCourt] = useState('');
  const [slotDuration, setSlotDuration] = useState<'1hour' | '30mins' | 'custom'>('1hour');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [price, setPrice] = useState('');
  const [selectedFacility, setSelectedFacility] = useState<string>('all');
  const [selectedCourtFilter, setSelectedCourtFilter] = useState<string>('all');
  const [user, setUser] = useState<{ user_id: string; full_name?: string; email?: string; role?: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedSlotAction, setSelectedSlotAction] = useState<'book' | 'available' | null>(null);
  const [remarkType, setRemarkType] = useState<string>('');
  const [customRemark, setCustomRemark] = useState<string>('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Load filtered data based on selected filters
  const loadFilteredData = useCallback(async (ownerId: string) => {
    try {
      const facilityId = selectedFacility === 'all' ? undefined : selectedFacility;
      const courtId = selectedCourtFilter === 'all' ? undefined : selectedCourtFilter;

      const [slotsData, statsData] = await Promise.all([
        getOwnerTimeSlots(ownerId, facilityId, courtId),
        getOwnerStats(ownerId, facilityId, courtId)
      ]);

      setSlots(slotsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading filtered data:', error);
    }
  }, [selectedFacility, selectedCourtFilter]);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Check for owner session (separate from app login)
      const storedOwner = localStorage.getItem('sf:owner');

      if (!storedOwner) {
        // No owner session found - redirect to owner login
        router.push('/owner/login');
        return;
      }

      const ownerData = JSON.parse(storedOwner);

      // Verify owner session is still valid by checking database
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', ownerData.user_id)
        .single();

      if (profileError || !profile) {
        // Invalid session - clear and redirect to owner login
        localStorage.removeItem('sf:owner');
        router.push('/owner/login');
        return;
      }

      // Double-check role
      if (profile.role !== 'owner' && profile.role !== 'admin') {
        // User is not an owner - clear session and redirect
        localStorage.removeItem('sf:owner');
        alert('Access denied. This dashboard is only for turf owners and admins.');
        router.push('/owner/login');
        return;
      }

      setUser(profile);
      setAuthChecked(true);

      // Load all data in parallel
      const [facilitiesData, courtsData] = await Promise.all([
        getOwnerFacilities(profile.user_id),
        getOwnerCourts(profile.user_id)
      ]);

      setFacilities(facilitiesData);
      setCourts(courtsData);

      // Load slots and stats with current filters
      await loadFilteredData(profile.user_id);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Error loading data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [router, supabase, loadFilteredData]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reload data when filters change
  useEffect(() => {
    if (user && authChecked) {
      loadFilteredData(user.user_id);
    }
  }, [selectedFacility, selectedCourtFilter, user, authChecked, loadFilteredData]);

  // Real-time subscription for time_slots changes
  useEffect(() => {
    if (!user || !authChecked) return;

    // Subscribe to time_slots changes for this owner
    const channel = supabase
      .channel('time-slots-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'time_slots',
          filter: `owner_id=eq.${user.user_id}`
        },
        (payload) => {
          console.log('Time slot changed:', payload);
          // Reload data when any time slot changes
          if (user) {
            loadFilteredData(user.user_id);
            setLastRefresh(new Date());
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, authChecked, supabase, loadFilteredData]);

  // Auto-refresh data every 30 seconds as backup (in case real-time subscription fails)
  useEffect(() => {
    if (!user || !authChecked) return;

    const interval = setInterval(() => {
      if (user) {
        loadFilteredData(user.user_id);
        setLastRefresh(new Date());
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [user, authChecked, loadFilteredData]);

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    if (user) {
      setLoading(true);
      await loadFilteredData(user.user_id);
      setLastRefresh(new Date());
      setLoading(false);
    }
  }, [user, loadFilteredData]);

  // Update end time when start time or duration changes
  useEffect(() => {
    if (startTime && slotDuration !== 'custom') {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);

      if (slotDuration === '1hour') {
        startDate.setHours(startDate.getHours() + 1);
      } else if (slotDuration === '30mins') {
        startDate.setMinutes(startDate.getMinutes() + 30);
      }

      const endHours = String(startDate.getHours()).padStart(2, '0');
      const endMinutes = String(startDate.getMinutes()).padStart(2, '0');
      setEndTime(`${endHours}:${endMinutes}`);
    }
  }, [startTime, slotDuration]);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedCourt || !startTime || !endTime || !price || !user) return;

    try {
      const selectedCourtData = courts.find(c => c.id === selectedCourt);
      if (!selectedCourtData) return;

      await createTimeSlot({
        court_id: selectedCourt,
        facility_id: selectedCourtData.facility_id,
        owner_id: user.user_id,
        date: selectedDate,
        start_time: startTime,
        end_time: endTime,
        price_per_hour: parseInt(price),
      });

      setShowAddSlot(false);
      setSelectedDate('');
      setSelectedCourt('');
      setSlotDuration('1hour');
      setStartTime('');
      setEndTime('');
      setPrice('');

      // Reload filtered data
      if (user) {
        await loadFilteredData(user.user_id);
      }
    } catch (error) {
      console.error('Error creating slot:', error);
      let errorMessage = 'Error creating slot. Please try again.';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        // Handle Supabase errors or other error objects
        const err = error as { message?: string; error?: string; details?: string };
        errorMessage = err.message || err.error || err.details || errorMessage;
      }

      alert(errorMessage);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await deleteTimeSlot(slotId);

      // Reload filtered data
      if (user) {
        await loadFilteredData(user.user_id);
      }
    } catch (error) {
      console.error('Error deleting slot:', error);
      const errorMessage = error instanceof Error ? error.message : (error as { message?: string })?.message || 'Error deleting slot. Please try again.';
      alert(errorMessage);
    }
  };

  const handleToggleAvailability = (slotId: string) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return;

    setSelectedSlotId(slotId);
    setSelectedSlotAction(slot.is_available ? 'book' : 'available');
    setRemarkType('');
    setCustomRemark('');
    setShowRemarksModal(true);
  };

  const handleSubmitRemarks = async () => {
    if (!selectedSlotId || !selectedSlotAction) return;

    // Validate remarks
    if (!remarkType) {
      alert('Please select a remark type');
      return;
    }

    let finalRemark = '';
    if (remarkType === 'others') {
      if (!customRemark.trim()) {
        alert('Please enter a custom remark');
        return;
      }
      finalRemark = customRemark.trim();
    } else {
      finalRemark = remarkType;
    }

    try {
      const isAvailable = selectedSlotAction === 'available';
      await updateTimeSlotAvailability(selectedSlotId, isAvailable, finalRemark);

      // Reload filtered data
      if (user) {
        await loadFilteredData(user.user_id);
      }

      // Close modal
      setShowRemarksModal(false);
      setSelectedSlotId(null);
      setSelectedSlotAction(null);
      setRemarkType('');
      setCustomRemark('');
    } catch (error) {
      console.error('Error updating slot:', error);
      let errorMessage = 'Error updating slot. Please try again.';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object') {
        // Handle Supabase errors or other error objects
        const err = error as { message?: string; error?: string; details?: string };
        errorMessage = err.message || err.error || err.details || errorMessage;
      }

      alert(errorMessage);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {!authChecked ? 'Checking access permissions...' : 'Loading dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  // Additional safety check - don't render if user is not authenticated or doesn't have right role
  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg">
          <div className="text-red-600 text-xl font-semibold mb-4">Access Denied</div>
          <p className="text-gray-600 mb-6">You need to log in as an owner to access this dashboard.</p>
          <button
            onClick={() => router.push('/owner/login')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Owner Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Turf Owner Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your courts, time slots, and bookings</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('sf:owner');
              router.push('/owner/login');
            }}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            Logout
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Turf Name
              </label>
              <select
                value={selectedFacility}
                onChange={(e) => {
                  setSelectedFacility(e.target.value);
                  setSelectedCourtFilter('all'); // Reset court filter when facility changes
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">See All (Accumulated)</option>
                {facilities.map(facility => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name} ({facility.sport})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Court
              </label>
              <select
                value={selectedCourtFilter}
                onChange={(e) => setSelectedCourtFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={selectedFacility === 'all'}
              >
                <option value="all">See All</option>
                {courts
                  .filter(court => selectedFacility === 'all' || court.facility_id === selectedFacility)
                  .map(court => (
                    <option key={court.id} value={court.id}>
                      {court.name} ({court.sport}) - {court.facility_name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Courts</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalCourts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available Slots</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.availableSlots}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Booked Slots</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.bookedSlots}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-semibold text-gray-900">₹{stats.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <button
            onClick={() => setShowAddSlot(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add New Slot
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Manage Courts
          </button>
        </div>
        {lastRefresh && (
          <div className="mb-4 text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        )}

        {/* Add Slot Modal */}
        {showAddSlot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add New Time Slot</h3>
              <form onSubmit={handleAddSlot} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Court</label>
                  <select
                    value={selectedCourt}
                    onChange={(e) => setSelectedCourt(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Court</option>
                    {courts.map(court => (
                      <option key={court.id} value={court.id}>
                        {court.name} ({court.sport}) - {court.facility_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slot Duration</label>
                  <select
                    value={slotDuration}
                    onChange={(e) => {
                      const newDuration = e.target.value as '1hour' | '30mins' | 'custom';
                      setSlotDuration(newDuration);
                      if (newDuration !== 'custom' && startTime) {
                        const [hours, minutes] = startTime.split(':').map(Number);
                        const startDate = new Date();
                        startDate.setHours(hours, minutes, 0, 0);

                        if (newDuration === '1hour') {
                          startDate.setHours(startDate.getHours() + 1);
                        } else if (newDuration === '30mins') {
                          startDate.setMinutes(startDate.getMinutes() + 30);
                        }

                        const endHours = String(startDate.getHours()).padStart(2, '0');
                        const endMinutes = String(startDate.getMinutes()).padStart(2, '0');
                        setEndTime(`${endHours}:${endMinutes}`);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="1hour">1 Hour</option>
                    <option value="30mins">30 Minutes</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => {
                        const newStartTime = e.target.value;
                        setStartTime(newStartTime);
                        if (slotDuration !== 'custom' && newStartTime) {
                          const [hours, minutes] = newStartTime.split(':').map(Number);
                          const startDate = new Date();
                          startDate.setHours(hours, minutes, 0, 0);

                          if (slotDuration === '1hour') {
                            startDate.setHours(startDate.getHours() + 1);
                          } else if (slotDuration === '30mins') {
                            startDate.setMinutes(startDate.getMinutes() + 30);
                          }

                          const endHours = String(startDate.getHours()).padStart(2, '0');
                          const endMinutes = String(startDate.getMinutes()).padStart(2, '0');
                          setEndTime(`${endHours}:${endMinutes}`);
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={slotDuration !== 'custom'}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${slotDuration !== 'custom' ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter price per hour"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Slot
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddSlot(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Slots Table */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Time Slots</h3>
            <p className="text-sm text-gray-600">Manage your court time slots and availability</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Court</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booked By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {slots.map((slot) => (
                  <tr key={slot.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(slot.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {slot.court_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {slot.start_time} - {slot.end_time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{slot.price_per_hour}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${slot.is_available
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {slot.is_available ? 'Available' : 'Booked'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {slot.is_booked && slot.user_name ? (
                        <div>
                          <div className="font-medium">{slot.user_name}</div>
                          <div className="text-xs text-gray-500">{slot.user_phone}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {slot.remarks ? (
                        <span className="text-gray-700">{slot.remarks}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleAvailability(slot.id)}
                          className={`${slot.is_available
                            ? 'text-red-600 hover:text-red-900'
                            : 'text-green-600 hover:text-green-900'
                            }`}
                        >
                          {slot.is_available ? 'Mark Booked' : 'Mark Available'}
                        </button>
                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Remarks Modal */}
      {showRemarksModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {selectedSlotAction === 'book' ? 'Mark as Booked' : 'Mark as Available'}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks <span className="text-red-500">*</span>
              </label>
              <select
                value={remarkType}
                onChange={(e) => {
                  setRemarkType(e.target.value);
                  if (e.target.value !== 'others') {
                    setCustomRemark('');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a remark</option>
                <option value="Booked offline">Booked offline</option>
                <option value="Customer cancelled">Customer cancelled</option>
                <option value="Court maintenance">Court maintenance</option>
                <option value="Special event">Special event</option>
                <option value="others">Others</option>
              </select>
            </div>

            {remarkType === 'others' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Remark <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={customRemark}
                  onChange={(e) => setCustomRemark(e.target.value)}
                  placeholder="Enter your remark..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  required
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSubmitRemarks}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Submit
              </button>
              <button
                onClick={() => {
                  setShowRemarksModal(false);
                  setSelectedSlotId(null);
                  setSelectedSlotAction(null);
                  setRemarkType('');
                  setCustomRemark('');
                }}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}