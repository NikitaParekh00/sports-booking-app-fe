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
  created_at: string;
  updated_at: string;
  court_name?: string;
  facility_name?: string;
  sport?: string;
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

export interface OwnerStats {
  totalCourts: number;
  availableSlots: number;
  bookedSlots: number;
  totalRevenue: number;
}

// Get all time slots for the current owner
export async function getOwnerTimeSlots(ownerId: string): Promise<TimeSlot[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('time_slots')
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
    .eq('owner_id', ownerId)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching time slots:', error);
    throw error;
  }

  return data?.map(slot => ({
    ...slot,
    court_name: slot.courts?.name,
    facility_name: slot.courts?.facilities?.name,
    sport: slot.courts?.facilities?.sport,
  })) || [];
}

// Get all courts for the current owner
export async function getOwnerCourts(ownerId: string): Promise<Court[]> {
  const supabase = createClient();
  
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
    .eq('facilities.owner_id', ownerId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching courts:', error);
    throw error;
  }

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

// Get owner statistics
export async function getOwnerStats(ownerId: string): Promise<OwnerStats> {
  const supabase = createClient();
  
  // Get total courts
  const { count: totalCourts } = await supabase
    .from('courts')
    .select('*', { count: 'exact', head: true })
    .eq('facilities.owner_id', ownerId);

  // Get available slots
  const { count: availableSlots } = await supabase
    .from('time_slots')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('is_available', true)
    .eq('is_booked', false);

  // Get booked slots
  const { count: bookedSlots } = await supabase
    .from('time_slots')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('is_booked', true);

  // Get total revenue from booked slots
  const { data: revenueData } = await supabase
    .from('time_slots')
    .select('price_per_hour, start_time, end_time')
    .eq('owner_id', ownerId)
    .eq('is_booked', true);

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
