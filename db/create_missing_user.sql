-- Create the missing user in profiles table
-- This fixes the foreign key constraint violation

-- 1. Insert the missing user into profiles table
-- Replace the values with actual user data from localStorage
INSERT INTO public.profiles (
    user_id,
    full_name,
    phone,
    role,
    created_at,
    updated_at
) VALUES (
    'b664cd45-05af-4bf4-aad4-68e3ee58f3b5',  -- The user_id from localStorage
    'Test User',  -- Replace with actual name
    '+91-9876543210',  -- Replace with actual phone
    'player',  -- Default role
    NOW(),
    NOW()
) ON CONFLICT (user_id) DO NOTHING;

-- 2. Verify the user was created
SELECT user_id, full_name, phone, role 
FROM public.profiles 
WHERE user_id = 'b664cd45-05af-4bf4-aad4-68e3ee58f3b5';

-- 3. Test match creation with this user
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
