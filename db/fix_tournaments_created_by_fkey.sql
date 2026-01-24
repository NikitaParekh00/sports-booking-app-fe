-- Fix tournaments.created_by foreign key to reference profiles instead of auth.users
-- This is needed because the app uses user_id from profiles table (stored in localStorage)

-- Drop the existing foreign key constraint if it exists
ALTER TABLE public.tournaments 
DROP CONSTRAINT IF EXISTS tournaments_created_by_fkey;

-- Add the correct foreign key constraint pointing to profiles table
ALTER TABLE public.tournaments
ADD CONSTRAINT tournaments_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Verify the constraint was created
-- You can check with: SELECT conname, confrelid::regclass FROM pg_constraint WHERE conrelid = 'public.tournaments'::regclass AND conname = 'tournaments_created_by_fkey';
