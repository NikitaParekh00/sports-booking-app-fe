-- Clean up bookings table by removing unnecessary columns
-- This handles dependencies like views that reference the columns

-- First, let's see what dependencies exist
SELECT 'Dependencies on bookings table:' as info;
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views 
WHERE definition LIKE '%bookings%' 
AND schemaname = 'public';

-- Drop the dependent view first
DROP VIEW IF EXISTS public.available_slots CASCADE;

-- Now we can safely remove the problematic columns
ALTER TABLE public.bookings DROP COLUMN IF EXISTS start_ts CASCADE;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS end_ts CASCADE;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS player_id CASCADE;
ALTER TABLE public.bookings DROP COLUMN IF EXISTS time_slot_id CASCADE;

-- Make court_id nullable (we might not always have specific courts)
ALTER TABLE public.bookings ALTER COLUMN court_id DROP NOT NULL;

-- Check final structure
SELECT 'Final columns:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' AND table_schema = 'public'
ORDER BY ordinal_position;

-- If you need the available_slots view later, you can recreate it
-- For now, we'll leave it dropped since we're not using it
