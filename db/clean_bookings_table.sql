-- Clean up bookings table by removing unnecessary columns
-- This will remove columns that are causing NOT NULL constraint violations

-- First, let's see what columns exist
SELECT 'Current columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Remove problematic columns that we don't need
ALTER TABLE public.bookings DROP COLUMN IF EXISTS start_ts;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS end_ts;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS player_id;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS time_slot_id;

-- Make court_id nullable (we might not always have specific courts)
ALTER TABLE public.bookings ALTER COLUMN court_id DROP NOT NULL;

-- Final structure
SELECT 'Final columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' AND table_schema = 'public'
ORDER BY ordinal_position;
