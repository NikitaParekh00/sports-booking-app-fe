-- SQL Queries to Count Users Who Logged In Today
-- ============================================

-- ============================================
-- OPTION 1: Using Supabase auth.users table (if using Supabase Auth)
-- ============================================
-- This uses the last_sign_in_at field from Supabase's auth.users table
SELECT COUNT(*) as users_logged_in_today
FROM auth.users
WHERE DATE(last_sign_in_at) = CURRENT_DATE
  AND last_sign_in_at IS NOT NULL;

-- With timezone consideration (replace 'Asia/Kolkata' with your timezone)
SELECT COUNT(*) as users_logged_in_today
FROM auth.users
WHERE DATE(last_sign_in_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
  AND last_sign_in_at IS NOT NULL;

-- Detailed breakdown with user info
SELECT 
    COUNT(*) as total_logins_today,
    COUNT(DISTINCT id) as unique_users_today
FROM auth.users
WHERE DATE(last_sign_in_at) = CURRENT_DATE
  AND last_sign_in_at IS NOT NULL;

-- List users who logged in today with details
SELECT 
    u.id,
    u.email,
    u.phone,
    u.last_sign_in_at,
    p.full_name,
    p.role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.user_id
WHERE DATE(u.last_sign_in_at) = CURRENT_DATE
  AND u.last_sign_in_at IS NOT NULL
ORDER BY u.last_sign_in_at DESC;


-- ============================================
-- OPTION 2: If you add last_login field to profiles table
-- ============================================
-- First, add the column (run this once):
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Then count logins today:
SELECT COUNT(*) as users_logged_in_today
FROM public.profiles
WHERE DATE(last_login) = CURRENT_DATE
  AND last_login IS NOT NULL;

-- With timezone:
SELECT COUNT(*) as users_logged_in_today
FROM public.profiles
WHERE DATE(last_login AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
  AND last_login IS NOT NULL;

-- Detailed breakdown by role:
SELECT 
    role,
    COUNT(*) as users_logged_in_today
FROM public.profiles
WHERE DATE(last_login) = CURRENT_DATE
  AND last_login IS NOT NULL
GROUP BY role
ORDER BY users_logged_in_today DESC;


-- ============================================
-- OPTION 3: Using a login_logs table (if you create one)
-- ============================================
-- Create login_logs table (run this once):
/*
CREATE TABLE IF NOT EXISTS public.login_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    login_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON public.login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_login_at ON public.login_logs(login_at);
*/

-- Count unique users who logged in today:
SELECT COUNT(DISTINCT user_id) as users_logged_in_today
FROM public.login_logs
WHERE DATE(login_at) = CURRENT_DATE;

-- Count total login sessions today:
SELECT COUNT(*) as total_logins_today
FROM public.login_logs
WHERE DATE(login_at) = CURRENT_DATE;

-- Count unique users with breakdown:
SELECT 
    COUNT(DISTINCT user_id) as unique_users_today,
    COUNT(*) as total_login_sessions_today
FROM public.login_logs
WHERE DATE(login_at) = CURRENT_DATE;

-- List users who logged in today with login count:
SELECT 
    p.user_id,
    p.full_name,
    p.phone,
    p.email,
    p.role,
    COUNT(ll.id) as login_count_today,
    MAX(ll.login_at) as last_login_time
FROM public.login_logs ll
JOIN public.profiles p ON ll.user_id = p.user_id
WHERE DATE(ll.login_at) = CURRENT_DATE
GROUP BY p.user_id, p.full_name, p.phone, p.email, p.role
ORDER BY last_login_time DESC;


-- ============================================
-- OPTION 4: Using updated_at as proxy (if you update it on login)
-- ============================================
-- This assumes you update the updated_at field when user logs in
-- Count users whose profile was updated today (proxy for login):
SELECT COUNT(*) as users_logged_in_today
FROM public.profiles
WHERE DATE(updated_at) = CURRENT_DATE
  AND updated_at != created_at;  -- Exclude newly created accounts

-- With timezone:
SELECT COUNT(*) as users_logged_in_today
FROM public.profiles
WHERE DATE(updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
  AND updated_at != created_at;


-- ============================================
-- HELPER QUERIES
-- ============================================

-- Check if auth.users table exists and has last_sign_in_at
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'auth' 
  AND table_name = 'users' 
  AND column_name LIKE '%sign_in%';

-- Check current date and time
SELECT 
    CURRENT_DATE as today_date,
    CURRENT_TIMESTAMP as current_timestamp,
    NOW() as now_with_timezone;

-- Count logins in last 7 days
SELECT 
    DATE(last_sign_in_at) as login_date,
    COUNT(*) as user_count
FROM auth.users
WHERE last_sign_in_at >= CURRENT_DATE - INTERVAL '7 days'
  AND last_sign_in_at IS NOT NULL
GROUP BY DATE(last_sign_in_at)
ORDER BY login_date DESC;

-- Count logins by hour today
SELECT 
    EXTRACT(HOUR FROM last_sign_in_at) as hour,
    COUNT(*) as login_count
FROM auth.users
WHERE DATE(last_sign_in_at) = CURRENT_DATE
  AND last_sign_in_at IS NOT NULL
GROUP BY EXTRACT(HOUR FROM last_sign_in_at)
ORDER BY hour;

