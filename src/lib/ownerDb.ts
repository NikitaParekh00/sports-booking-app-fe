import { createClient } from './supabaseClient';

export interface TimeSlot {
  id: string;
  court_id: string;
  facility_id: string;
  owner_id: string;
  date: string;
  start_time: string;
  end_time: string;
  price_per_hour: number;
  is_available: boolean;
  is_booked: boolean;
  booking_id?: string;
  user_id?: string;
  created_at: string;
  updated_at: string;
  court_name?: string;
  facility_name?: string;
  sport?: string;
  user_name?: string;
  user_phone?: string;
}

export interface Court {
  id: string;
  facility_id: string;
  name: string;
  capacity: number;
  amenities: string[];
  sport?: string;
  facility_name?: string;
}

export interface Facility {
  id: string;
  name: string;
  sport: string;
  city: string;
  address: string;
}

export interface OwnerStats {
  totalCourts: number;
  availableSlots: number;
  bookedSlots: number;
  totalRevenue: number;
}

// Get all time slots for the current owner with optional filters
export async function getOwnerTimeSlots(
  ownerId: string,
  facilityId?: string,
  courtId?: string
): Promise<TimeSlot[]> {
  const supabase = createClient();
  
  // Use left join to include all slots and user information
  let query = supabase
    .from('time_slots')
    .select(`
      *,
      courts(
        name,
        facilities(
          name,
          sport
        )
      ),
      user_profile:user_id(
        full_name,
        phone
      )
    `)
    .eq('owner_id', ownerId);
  
  if (facilityId) {
    query = query.eq('facility_id', facilityId);
  }
  if (courtId) {
    query = query.eq('court_id', courtId);
  }
  
  const { data, error } = await query
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching time slots:', error);
    throw error;
  }

  console.log('Fetched time slots:', data?.length, data);

  return data?.map(slot => ({
    ...slot,
    court_name: slot.courts?.name || 'Unknown Court',
    facility_name: slot.courts?.facilities?.name || 'Unknown Facility',
    sport: slot.courts?.facilities?.sport || 'Unknown',
    user_name: slot.user_profile?.full_name,
    user_phone: slot.user_profile?.phone,
  })) || [];
}

// Get all courts for the current owner
export async function getOwnerCourts(ownerId: string): Promise<Court[]> {
  const supabase = createClient();
  
  console.log('Fetching courts for owner:', ownerId);
  
  // First get facilities owned by this owner
  const { data: facilities, error: facilitiesError } = await supabase
    .from('facilities')
    .select('id, name, owner_id')
    .eq('owner_id', ownerId);

  if (facilitiesError) {
    console.error('Error fetching facilities:', facilitiesError);
    throw facilitiesError;
  }

  console.log('Facilities found for owner:', facilities);

  if (!facilities || facilities.length === 0) {
    console.log('No facilities found for owner:', ownerId);
    return [];
  }

  const facilityIds = facilities.map(f => f.id);
  console.log('Facility IDs:', facilityIds);

  // Then get courts for those facilities
  const { data, error } = await supabase
    .from('courts')
    .select(`
      *,
      facilities!inner(
        name,
        sport,
        owner_id
      )
    `)
    .in('facility_id', facilityIds)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching courts:', error);
    throw error;
  }

  console.log('Courts found:', data?.length, data);

  return data?.map(court => ({
    ...court,
    facility_name: court.facilities?.name,
    sport: court.facilities?.sport,
  })) || [];
}

// Create a new time slot
export async function createTimeSlot(slotData: {
  court_id: string;
  facility_id: string;
  owner_id: string;
  date: string;
  start_time: string;
  end_time: string;
  price_per_hour: number;
}): Promise<TimeSlot> {
  const supabase = createClient();
  
  console.log('Creating time slot with data:', slotData);
  
  // Verify relationships before inserting
  // Check 1: Verify owner is valid
  const { data: ownerCheck, error: ownerError } = await supabase
    .from('profiles')
    .select('user_id, role')
    .eq('user_id', slotData.owner_id)
    .eq('role', 'owner')
    .single();
  
  console.log('Owner check:', ownerCheck, ownerError);
  
  // Check 2: Verify facility belongs to owner
  const { data: facilityCheck, error: facilityError } = await supabase
    .from('facilities')
    .select('id, owner_id')
    .eq('id', slotData.facility_id)
    .eq('owner_id', slotData.owner_id)
    .single();
  
  console.log('Facility check:', facilityCheck, facilityError);
  
  // Check 3: Verify court belongs to facility
  const { data: courtCheck, error: courtError } = await supabase
    .from('courts')
    .select('id, facility_id')
    .eq('id', slotData.court_id)
    .eq('facility_id', slotData.facility_id)
    .single();
  
  console.log('Court check:', courtCheck, courtError);
  
  if (!ownerCheck || ownerError) {
    throw new Error(`Invalid owner: ${ownerError?.message || 'Owner not found'}`);
  }
  
  if (!facilityCheck || facilityError) {
    throw new Error(`Facility does not belong to owner: ${facilityError?.message || 'Facility not found'}`);
  }
  
  if (!courtCheck || courtError) {
    throw new Error(`Court does not belong to facility: ${courtError?.message || 'Court not found'}`);
  }
  
  const { data, error } = await supabase
    .from('time_slots')
    .insert([slotData])
    .select(`
      *,
      courts!inner(
        name,
        facilities!inner(
          name,
          sport
        )
      )
    `)
    .single();

  if (error) {
    console.error('Error creating time slot:', error);
    console.error('Slot data that failed:', slotData);
    throw error;
  }

  return {
    ...data,
    court_name: data.courts?.name,
    facility_name: data.courts?.facilities?.name,
    sport: data.courts?.facilities?.sport,
  };
}

// Update time slot availability
export async function updateTimeSlotAvailability(
  slotId: string, 
  isAvailable: boolean
): Promise<TimeSlot> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('time_slots')
    .update({ 
      is_available: isAvailable,
      is_booked: !isAvailable 
    })
    .eq('id', slotId)
    .select(`
      *,
      courts!inner(
        name,
        facilities!inner(
          name,
          sport
        )
      )
    `)
    .single();

  if (error) {
    console.error('Error updating time slot:', error);
    throw error;
  }

  return {
    ...data,
    court_name: data.courts?.name,
    facility_name: data.courts?.facilities?.name,
    sport: data.courts?.facilities?.sport,
  };
}

// Delete a time slot
export async function deleteTimeSlot(slotId: string): Promise<void> {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('time_slots')
    .delete()
    .eq('id', slotId);

  if (error) {
    console.error('Error deleting time slot:', error);
    throw error;
  }
}

// Book a time slot (find matching slot and mark as booked)
export async function bookTimeSlot(
  facilityId: string,
  courtId: string,
  date: string,
  startTime: string,
  userId: string,
  bookingId?: string
): Promise<TimeSlot> {
  const supabase = createClient();
  
  // Find the matching time slot
  const { data: slot, error: findError } = await supabase
    .from('time_slots')
    .select('*')
    .eq('facility_id', facilityId)
    .eq('court_id', courtId)
    .eq('date', date)
    .eq('start_time', startTime)
    .eq('is_available', true)
    .eq('is_booked', false)
    .single();

  if (findError || !slot) {
    throw new Error('Time slot not found or already booked');
  }

  // Update the slot to mark as booked
  const { data: updatedSlot, error: updateError } = await supabase
    .from('time_slots')
    .update({
      is_available: false,
      is_booked: true,
      user_id: userId,
      booking_id: bookingId || null
    })
    .eq('id', slot.id)
    .select(`
      *,
      courts(
        name,
        facilities(
          name,
          sport
        )
      ),
      user_profile:user_id(
        full_name,
        phone
      )
    `)
    .single();

  if (updateError) {
    console.error('Error booking time slot:', updateError);
    throw updateError;
  }

  return {
    ...updatedSlot,
    court_name: updatedSlot.courts?.name,
    facility_name: updatedSlot.courts?.facilities?.name,
    sport: updatedSlot.courts?.facilities?.sport,
    user_name: updatedSlot.user_profile?.full_name,
    user_phone: updatedSlot.user_profile?.phone,
  };
}

// Get all facilities (turfs) for the current owner
export async function getOwnerFacilities(ownerId: string): Promise<Facility[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('facilities')
    .select('id, name, sport, city, address')
    .eq('owner_id', ownerId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching facilities:', error);
    throw error;
  }

  return data || [];
}

// Get owner statistics with optional filters
export async function getOwnerStats(
  ownerId: string, 
  facilityId?: string, 
  courtId?: string
): Promise<OwnerStats> {
  const supabase = createClient();
  
  // Get total courts - first get facility IDs
  const { data: facilities } = await supabase
    .from('facilities')
    .select('id')
    .eq('owner_id', ownerId);

  // Apply filters
  let filteredFacilityIds = facilities?.map(f => f.id) || [];
  if (facilityId) {
    filteredFacilityIds = filteredFacilityIds.filter(id => id === facilityId);
  }
  
  let totalCourts = 0;
  if (filteredFacilityIds.length > 0) {
    let courtsQuery = supabase
      .from('courts')
      .select('*', { count: 'exact', head: true })
      .in('facility_id', filteredFacilityIds);
    
    if (courtId) {
      courtsQuery = courtsQuery.eq('id', courtId);
    }
    
    const { count } = await courtsQuery;
    totalCourts = count || 0;
  }

  // Build time slots query with filters
  let availableSlotsQuery = supabase
    .from('time_slots')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('is_available', true)
    .eq('is_booked', false);
  
  if (facilityId) {
    availableSlotsQuery = availableSlotsQuery.eq('facility_id', facilityId);
  }
  if (courtId) {
    availableSlotsQuery = availableSlotsQuery.eq('court_id', courtId);
  }
  
  const { count: availableSlots } = await availableSlotsQuery;

  // Get booked slots with filters
  let bookedSlotsQuery = supabase
    .from('time_slots')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('is_booked', true);
  
  if (facilityId) {
    bookedSlotsQuery = bookedSlotsQuery.eq('facility_id', facilityId);
  }
  if (courtId) {
    bookedSlotsQuery = bookedSlotsQuery.eq('court_id', courtId);
  }
  
  const { count: bookedSlots } = await bookedSlotsQuery;

  // Get total revenue from booked slots with filters
  let revenueQuery = supabase
    .from('time_slots')
    .select('price_per_hour, start_time, end_time')
    .eq('owner_id', ownerId)
    .eq('is_booked', true);
  
  if (facilityId) {
    revenueQuery = revenueQuery.eq('facility_id', facilityId);
  }
  if (courtId) {
    revenueQuery = revenueQuery.eq('court_id', courtId);
  }
  
  const { data: revenueData } = await revenueQuery;

  const totalRevenue = revenueData?.reduce((sum, slot) => {
    // Calculate hours between start and end time
    const startTime = new Date(`2000-01-01T${slot.start_time}`);
    const endTime = new Date(`2000-01-01T${slot.end_time}`);
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    return sum + (slot.price_per_hour * hours);
  }, 0) || 0;

  return {
    totalCourts: totalCourts || 0,
    availableSlots: availableSlots || 0,
    bookedSlots: bookedSlots || 0,
    totalRevenue: Math.round(totalRevenue),
  };
}

// Get current user's profile to check if they're an owner
export async function getCurrentUserProfile() {
  const supabase = createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return profile;
}
