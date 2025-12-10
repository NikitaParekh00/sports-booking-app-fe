-- Query to check existing time slots for a specific court and date
-- Use this to debug why you can't create a new slot

-- Replace these values with your actual values:
--   - court_id: UUID of the court
--   - date: Date in YYYY-MM-DD format

-- OPTION 1: Check all slots for a specific court and date
SELECT 
    id,
    court_id,
    date,
    start_time,
    end_time,
    is_available,
    is_booked,
    price_per_hour,
    user_id,
    remarks,
    created_at
FROM public.time_slots
WHERE court_id = 'YOUR_COURT_ID_HERE'  -- Replace with your court ID
  AND date = '2024-01-15'  -- Replace with your date (YYYY-MM-DD format)
ORDER BY start_time;

-- OPTION 2: Check only available (non-booked) slots
SELECT 
    id,
    court_id,
    date,
    start_time,
    end_time,
    is_available,
    is_booked,
    price_per_hour,
    remarks
FROM public.time_slots
WHERE court_id = 'YOUR_COURT_ID_HERE'
  AND date = '2024-01-15'
  AND is_available = true
  AND is_booked = false
ORDER BY start_time;

-- OPTION 3: Check for overlapping slots with a specific time range
-- Replace start_time and end_time with the time you're trying to create
SELECT 
    id,
    court_id,
    date,
    start_time,
    end_time,
    is_available,
    is_booked,
    price_per_hour,
    CASE 
        WHEN start_time < '18:00:00' AND end_time > '17:00:00' THEN 'OVERLAPS'
        ELSE 'NO OVERLAP'
    END as overlap_status
FROM public.time_slots
WHERE court_id = 'YOUR_COURT_ID_HERE'
  AND date = '2024-01-15'
  AND is_available = true
  AND is_booked = false
  AND (
    -- Check if the new time range overlaps with existing slots
    -- New slot: 17:00 - 18:00 (replace with your times)
    (start_time < '18:00:00' AND end_time > '17:00:00')
  )
ORDER BY start_time;

-- OPTION 4: Find court ID by facility name and court name
SELECT 
    c.id as court_id,
    c.name as court_name,
    f.id as facility_id,
    f.name as facility_name
FROM public.courts c
JOIN public.facilities f ON c.facility_id = f.id
WHERE f.name ILIKE '%Test Badminton%'  -- Replace with your facility name
  AND c.name ILIKE '%Court%'  -- Replace with your court name
ORDER BY f.name, c.name;

-- OPTION 5: Delete a specific slot (use with caution!)
-- DELETE FROM public.time_slots
-- WHERE id = 'SLOT_ID_HERE';

-- OPTION 6: Mark a slot as booked (to remove it from available slots)
-- UPDATE public.time_slots
-- SET is_available = false,
--     is_booked = true,
--     remarks = 'Marked as booked to allow new slot creation'
-- WHERE id = 'SLOT_ID_HERE';

