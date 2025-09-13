-- Fix RLS policies for bookings table to work with development mode
-- This script temporarily disables RLS or updates policies to work without auth.uid()

-- Option 1: Temporarily disable RLS for development
-- ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;

-- Option 2: Update RLS policies to work with development mode
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can insert their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Facility owners can view their bookings" ON public.bookings;

-- Create new policies that work with development mode
-- Allow all operations for now (development only)
CREATE POLICY "Allow all operations for development" ON public.bookings
    FOR ALL USING (true) WITH CHECK (true);

-- Alternative: If you want to keep some security, create policies that check user_id directly
-- CREATE POLICY "Users can view their own bookings" ON public.bookings
--     FOR SELECT USING (true); -- Allow all reads for now

-- CREATE POLICY "Users can insert their own bookings" ON public.bookings
--     FOR INSERT WITH CHECK (true); -- Allow all inserts for now

-- CREATE POLICY "Users can update their own bookings" ON public.bookings
--     FOR UPDATE USING (true) WITH CHECK (true); -- Allow all updates for now

-- Verify the policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'bookings';
