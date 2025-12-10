-- Fix the foreign key constraint on facilities.owner_id
-- The constraint should reference public.profiles(user_id), not auth.users(id) or public.users

-- Step 1: Check the current constraint
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'facilities'
AND kcu.column_name = 'owner_id';

-- Step 2: Drop the existing incorrect foreign key constraint
ALTER TABLE public.facilities
DROP CONSTRAINT IF EXISTS facilities_owner_id_fkey;

-- Step 3: Add the correct foreign key constraint referencing public.profiles(user_id)
ALTER TABLE public.facilities
ADD CONSTRAINT facilities_owner_id_fkey
FOREIGN KEY (owner_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Step 4: Verify the constraint is now correct
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'facilities'
AND kcu.column_name = 'owner_id';

-- Step 5: Verify your profile exists (replace with your actual user_id)
SELECT user_id, full_name, phone, role, email
FROM public.profiles 
WHERE user_id = '581ec9d9-c020-4394-a277-108cb33caead';

