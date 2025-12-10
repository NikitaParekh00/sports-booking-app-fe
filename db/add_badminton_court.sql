-- SQL Queries to Add a New Badminton Court Location
-- ====================================================

-- OPTION 1: Add a new court to an EXISTING badminton facility
-- Replace the values below with your actual data:
--   - facility_id: UUID of the existing badminton facility
--   - court_name: Name of the court (e.g., 'Court 7', 'Premium Court 2')
--   - capacity: Number of players (typically 4 for badminton)
--   - amenities: Array of amenities (e.g., ARRAY['ac', 'lights', 'parking', 'changing_room'])

INSERT INTO public.courts (
    facility_id,
    name,
    capacity,
    amenities
) VALUES (
    'YOUR_FACILITY_ID_HERE',  -- Replace with actual facility UUID
    'Court 7',                -- Replace with your court name
    4,                        -- Capacity (typically 4 for badminton)
    ARRAY['ac', 'lights', 'parking', 'changing_room']  -- Amenities array
);

-- ====================================================

-- OPTION 2: Create a NEW badminton facility AND add a court
-- Replace the values below with your actual data:
--   - owner_id: UUID of the owner from profiles table
--   - facility_name: Name of the facility
--   - city: City name
--   - address: Full address
--   - price_per_hour: Hourly rate
--   - court_name: Name of the court

-- Step 1: Create the facility
INSERT INTO public.facilities (
    owner_id,
    name,
    city,
    address,
    sport,
    price_per_hour,
    description,
    status
) VALUES (
    'YOUR_OWNER_ID_HERE',     -- Replace with actual owner UUID from profiles table
    'New Badminton Center',    -- Replace with your facility name
    'Mumbai',                 -- Replace with your city
    '123 Main Street, Area Name',  -- Replace with your address
    'badminton',              -- Sport type
    800.00,                   -- Price per hour (replace with your rate)
    'Premium badminton facility with air-conditioned courts',  -- Description
    'approved'                -- Status: 'pending', 'approved', or 'rejected'
) RETURNING id;

-- Step 2: Add a court to the newly created facility
-- Replace 'FACILITY_ID_FROM_STEP_1' with the ID returned from Step 1
INSERT INTO public.courts (
    facility_id,
    name,
    capacity,
    amenities
) VALUES (
    'FACILITY_ID_FROM_STEP_1',  -- Use the ID from Step 1
    'Court 1',                  -- Replace with your court name
    4,                          -- Capacity
    ARRAY['ac', 'lights', 'parking', 'changing_room', 'water']  -- Amenities
);

-- ====================================================

-- OPTION 3: Complete query with all values in one transaction
-- This creates a facility and court in a single transaction
-- Replace all placeholder values with your actual data

DO $$
DECLARE
    v_facility_id UUID;
    v_owner_id UUID := 'YOUR_OWNER_ID_HERE';  -- Replace with owner UUID
BEGIN
    -- Create the facility
    INSERT INTO public.facilities (
        owner_id,
        name,
        city,
        address,
        sport,
        price_per_hour,
        description,
        status,
        phone,
        email
    ) VALUES (
        v_owner_id,
        'New Badminton Center',           -- Facility name
        'Mumbai',                         -- City
        '123 Main Street, Area Name',     -- Address
        'badminton',                      -- Sport
        800.00,                           -- Price per hour
        'Premium badminton facility',     -- Description
        'approved',                       -- Status
        '+91-9876543210',                 -- Phone (optional)
        'contact@badmintoncenter.com'      -- Email (optional)
    ) RETURNING id INTO v_facility_id;

    -- Add the first court
    INSERT INTO public.courts (
        facility_id,
        name,
        capacity,
        amenities
    ) VALUES (
        v_facility_id,
        'Court 1',                        -- Court name
        4,                                -- Capacity
        ARRAY['ac', 'lights', 'parking', 'changing_room', 'water']  -- Amenities
    );

    RAISE NOTICE 'Facility created with ID: %', v_facility_id;
END $$;

-- ====================================================

-- HELPER QUERIES: Find existing facilities or owners

-- Find all badminton facilities:
SELECT id, name, city, address, owner_id, price_per_hour, status
FROM public.facilities
WHERE sport = 'badminton'
ORDER BY name;

-- Find all owners:
SELECT user_id, full_name, phone, email, role
FROM public.profiles
WHERE role IN ('owner', 'admin')
ORDER BY full_name;

-- Find courts for a specific facility:
SELECT c.id, c.name, c.capacity, c.amenities, f.name as facility_name
FROM public.courts c
JOIN public.facilities f ON c.facility_id = f.id
WHERE f.id = 'YOUR_FACILITY_ID_HERE'
ORDER BY c.name;

