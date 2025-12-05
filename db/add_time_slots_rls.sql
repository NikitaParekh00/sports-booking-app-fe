-- RLS (Row Level Security) Policies for time_slots table

-- Enable RLS on time_slots table
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- TIME_SLOTS TABLE POLICIES
-- ==============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view available time slots" ON public.time_slots;
DROP POLICY IF EXISTS "Owners can view their own time slots" ON public.time_slots;
DROP POLICY IF EXISTS "Owners can manage their own time slots" ON public.time_slots;
DROP POLICY IF EXISTS "Allow time slot creation for authenticated users" ON public.time_slots;

-- Public read access to available time slots
CREATE POLICY "Public can view available time slots" ON public.time_slots
  FOR SELECT USING (is_available = true AND is_booked = false);

-- Owners can view all their time slots
-- Verify: owner_id is valid owner/admin AND facility belongs to that owner
CREATE POLICY "Owners can view their own time slots" ON public.time_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      JOIN public.facilities ON facilities.owner_id = profiles.user_id
      WHERE profiles.user_id = time_slots.owner_id 
      AND profiles.role IN ('owner', 'admin')
      AND facilities.id = time_slots.facility_id
    )
  );

-- Owners can update their own time slots
-- Verify: owner_id is valid owner/admin AND facility belongs to that owner
CREATE POLICY "Owners can update their own time slots" ON public.time_slots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      JOIN public.facilities ON facilities.owner_id = profiles.user_id
      WHERE profiles.user_id = time_slots.owner_id 
      AND profiles.role IN ('owner', 'admin')
      AND facilities.id = time_slots.facility_id
    )
  );

-- Owners can delete their own time slots
-- Verify: owner_id is valid owner/admin AND facility belongs to that owner
CREATE POLICY "Owners can delete their own time slots" ON public.time_slots
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      JOIN public.facilities ON facilities.owner_id = profiles.user_id
      WHERE profiles.user_id = time_slots.owner_id 
      AND profiles.role IN ('owner', 'admin')
      AND facilities.id = time_slots.facility_id
    )
  );

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Allow time slot creation for owners" ON public.time_slots;

-- Allow time slot creation if:
-- 1. owner_id is a valid owner/admin in profiles
-- 2. facility_id belongs to that owner
-- 3. court_id belongs to that facility
-- Split into separate checks for better performance and debugging
CREATE POLICY "Allow time slot creation for owners" ON public.time_slots
  FOR INSERT WITH CHECK (
    -- Check 1: owner_id is a valid owner/admin
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.user_id = time_slots.owner_id 
      AND profiles.role IN ('owner', 'admin')
    )
    AND
    -- Check 2: facility_id belongs to the owner_id
    EXISTS (
      SELECT 1 FROM public.facilities 
      WHERE facilities.id = time_slots.facility_id
      AND facilities.owner_id = time_slots.owner_id
    )
    AND
    -- Check 3: court_id belongs to the facility_id
    EXISTS (
      SELECT 1 FROM public.courts 
      WHERE courts.id = time_slots.court_id
      AND courts.facility_id = time_slots.facility_id
    )
  );

