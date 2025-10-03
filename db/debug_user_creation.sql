-- Debug user creation issue
-- This will help identify why the user isn't in the profiles table

-- 1. Check the structure of profiles table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if there are any constraints on profiles table
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints AS tc 
LEFT JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_name = 'profiles'
AND tc.table_schema = 'public';

-- 3. Check if there are any RLS policies blocking inserts
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 4. Try to insert a test user to see if there are any issues
INSERT INTO public.profiles (
    user_id,
    full_name,
    phone,
    role
) VALUES (
    'test-user-123',
    'Test User',
    '+91-9999999999',
    'player'
) ON CONFLICT (user_id) DO NOTHING;

-- 5. Check if the test user was created
SELECT user_id, full_name, phone, role 
FROM public.profiles 
WHERE user_id = 'test-user-123';

-- 6. Clean up test user
DELETE FROM public.profiles WHERE user_id = 'test-user-123';
