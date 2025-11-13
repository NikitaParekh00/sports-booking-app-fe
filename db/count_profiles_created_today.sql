-- Count profiles created today
SELECT COUNT(*) as profiles_created_today
FROM public.profiles
WHERE DATE(created_at) = CURRENT_DATE;

-- Alternative: Count with timezone consideration (if needed)
-- Replace 'Asia/Kolkata' with your timezone
SELECT COUNT(*) as profiles_created_today
FROM public.profiles
WHERE DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE;

-- Detailed count with breakdown by role
SELECT 
    COUNT(*) as total_profiles_today,
    COUNT(CASE WHEN role = 'user' THEN 1 END) as users_today,
    COUNT(CASE WHEN role = 'owner' THEN 1 END) as owners_today,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins_today
FROM public.profiles
WHERE DATE(created_at) = CURRENT_DATE;

