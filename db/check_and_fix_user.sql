-- Check if the user exists and create them if needed
-- This will fix the foreign key constraint violation

-- 1. First, check if the user exists in profiles table
SELECT user_id, full_name, phone, role, created_at 
FROM public.profiles 
WHERE user_id = 'b664cd45-05af-4bf4-aad4-68e3ee58f3b5';

-- 2. If the above returns no rows, the user doesn't exist
-- Let's check what users do exist
SELECT user_id, full_name, phone, role 
FROM public.profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Create the missing user with the exact user_id from localStorage
INSERT INTO public.profiles (
    user_id,
    full_name,
    phone,
    role,
    created_at,
    updated_at
) VALUES (
    'b664cd45-05af-4bf4-aad4-68e3ee58f3b5',
    'Test User',  -- Replace with actual name from localStorage
    '+91-9876543210',  -- Replace with actual phone from localStorage
    'player',
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO UPDATE SET
    updated_at = NOW();

-- 4. Verify the user was created/updated
SELECT user_id, full_name, phone, role, created_at 
FROM public.profiles 
WHERE user_id = 'b664cd45-05af-4bf4-aad4-68e3ee58f3b5';

-- 5. Test match creation with this user
INSERT INTO public.matches (
    created_by,
    sport,
    match_type,
    status,
    match_date
) VALUES (
    'b664cd45-05af-4bf4-aad4-68e3ee58f3b5',
    'badminton',
    'friendly',
    'upcoming',
    NOW()
) RETURNING id, created_by, sport, match_type, status;
