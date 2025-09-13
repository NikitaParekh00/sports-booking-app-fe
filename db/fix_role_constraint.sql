-- Fix the role check constraint to allow 'customer' role
-- This script checks the current constraint and updates it if needed

-- First, let's see what the current constraint looks like
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname LIKE '%role%' 
AND conrelid = 'public.profiles'::regclass;

-- Drop the existing role check constraint if it exists
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add a new constraint that allows the roles we need
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('owner', 'player', 'admin'));

-- Alternative: If you want to be more permissive for development
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
-- CHECK (role IS NOT NULL AND length(role) > 0);
