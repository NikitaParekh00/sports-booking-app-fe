-- Simple solution: Remove the foreign key constraint temporarily for development
-- This allows creating profiles without requiring users to exist in auth.users

-- Drop the foreign key constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Optional: Add it back later with a different approach
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_fkey 
-- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
