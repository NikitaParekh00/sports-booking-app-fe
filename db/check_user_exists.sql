-- Check if the user exists in profiles table
-- This will help identify the authentication issue

-- 1. Check if the specific user exists in profiles
SELECT user_id, full_name, phone, role 
FROM public.profiles 
WHERE user_id = 'b664cd45-05af-4bf4-aad4-68e3ee58f3b5';

-- 2. Check all users in profiles table
SELECT user_id, full_name, phone, role 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check if there are any users at all
SELECT COUNT(*) as total_users 
FROM public.profiles;

-- 4. Check the structure of profiles table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;
