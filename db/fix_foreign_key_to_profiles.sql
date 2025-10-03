-- Fix foreign key constraint to point to profiles table instead of auth.users
-- This matches your authentication flow where users are created directly in profiles

-- 1. Drop the existing foreign key constraint that points to auth.users
ALTER TABLE public.matches 
DROP CONSTRAINT IF EXISTS matches_created_by_fkey;

-- 2. Create new foreign key constraint pointing to profiles.user_id
ALTER TABLE public.matches 
ADD CONSTRAINT matches_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

-- 3. Verify the constraint is pointing to the right table
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'matches'
AND kcu.column_name = 'created_by';

-- 4. Test that the constraint works with your user
-- This should now work since the user exists in profiles table
SELECT user_id, full_name, phone, role 
FROM public.profiles 
WHERE user_id = 'b664cd45-05af-4bf4-aad4-68e3ee58f3b5';
