-- Debug script to check bookings in the database
-- This will help us see what's in the bookings table

-- Check all bookings in the table
SELECT 
    id,
    user_id,
    facility_id,
    booking_date,
    start_time,
    end_time,
    total_price,
    status,
    payment_status,
    created_at
FROM public.bookings 
ORDER BY created_at DESC;

-- Check if there are any bookings at all
SELECT COUNT(*) as total_bookings FROM public.bookings;

-- Check bookings for a specific user (replace with your actual user_id)
-- You can get your user_id from localStorage in browser console: localStorage.getItem('sf:user')
SELECT 
    id,
    user_id,
    facility_id,
    booking_date,
    start_time,
    end_time,
    total_price,
    status,
    payment_status,
    created_at
FROM public.bookings 
WHERE user_id = 'YOUR_USER_ID_HERE'  -- Replace with your actual user_id
ORDER BY created_at DESC;
