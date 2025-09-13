-- Complete cleanup of bookings table - remove all references to old columns
-- This will handle triggers, functions, constraints, and any other dependencies

-- 1. Drop all triggers on bookings table
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;

-- 2. Drop all policies on bookings table
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can insert their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Facility owners can view their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Allow all operations for development" ON public.bookings;

-- 3. Drop all views that might reference bookings
DROP VIEW IF EXISTS public.available_slots CASCADE;

-- 4. Drop all constraints that might reference old columns
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS valid_booking_time_range;

-- 5. Now safely remove all problematic columns
ALTER TABLE public.bookings DROP COLUMN IF EXISTS start_ts CASCADE;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS end_ts CASCADE;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS player_id CASCADE;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS time_slot_id CASCADE;

-- 6. Make remaining columns nullable if needed
ALTER TABLE public.bookings ALTER COLUMN court_id DROP NOT NULL;

-- 7. Recreate the table with only the columns we need
-- First, let's see what we have left
SELECT 'Current columns after cleanup:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. Recreate the updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON public.bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Recreate RLS policies (permissive for development)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for development" ON public.bookings
    FOR ALL USING (true) WITH CHECK (true);

-- 10. Final verification
SELECT 'Final table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' AND table_schema = 'public'
ORDER BY ordinal_position;
