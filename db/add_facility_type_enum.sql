-- Add facility_type column to existing facilities table
ALTER TABLE public.facilities 
ADD COLUMN facility_type VARCHAR(20) DEFAULT 'sport_venue' NOT NULL;

-- Add constraint to ensure valid values
ALTER TABLE public.facilities 
ADD CONSTRAINT facilities_type_check 
CHECK (facility_type IN ('sport_venue', 'coaching_venue'));

-- Update existing records to be 'sport_venue' type
UPDATE public.facilities 
SET facility_type = 'sport_venue' 
WHERE facility_type IS NULL OR facility_type = '';

-- Add coaching-specific columns (optional, can be added later)
ALTER TABLE public.facilities 
ADD COLUMN coach_name VARCHAR(100),
ADD COLUMN experience_years INTEGER,
ADD COLUMN certification VARCHAR(200),
ADD COLUMN class_size INTEGER,
ADD COLUMN age_groups TEXT[];

-- Add index for better performance on facility_type queries
CREATE INDEX idx_facilities_type ON public.facilities(facility_type);

-- Add composite index for sport + facility_type queries
CREATE INDEX idx_facilities_sport_type ON public.facilities(sport, facility_type);

-- Update RLS policies to include facility_type
-- (Assuming you have existing RLS policies, add facility_type to them if needed)
-- Example: If you have a policy for public access
-- CREATE POLICY "Public can view facilities" ON public.facilities 
-- FOR SELECT USING (true);

-- Insert some sample coaching facilities for testing
-- First, create a dummy owner if none exists
INSERT INTO public.profiles (
    user_id,
    full_name,
    phone,
    role,
    points,
    points_earned
) VALUES (
    gen_random_uuid(),
    'Demo Owner',
    '+91-9999999999',
    'owner',
    0,
    0
) ON CONFLICT (user_id) DO NOTHING;

-- Now insert coaching facilities with the dummy owner
INSERT INTO public.facilities (
    id,
    owner_id,
    name,
    city,
    address,
    sport,
    facility_type,
    price_per_hour,
    description,
    coach_name,
    experience_years,
    certification,
    class_size,
    age_groups,
    status
) VALUES 
(
    gen_random_uuid(),
    (SELECT user_id FROM public.profiles WHERE role = 'owner' LIMIT 1),
    'Elite Football Academy',
    'Mumbai',
    '123 Sports Complex, Bandra West, Mumbai',
    'football-turf',
    'coaching_venue',
    500,
    'Professional football training with certified coaches',
    'Rajesh Kumar',
    8,
    'AFC Level 2 Coach',
    15,
    ARRAY['U-12', 'U-16', 'Adults'],
    'active'
),
(
    gen_random_uuid(),
    (SELECT user_id FROM public.profiles WHERE role = 'owner' LIMIT 1),
    'Yoga Wellness Center',
    'Mumbai',
    '456 Wellness Hub, Andheri East, Mumbai',
    'yoga',
    'coaching_venue',
    300,
    'Mindful yoga sessions for all levels',
    'Priya Sharma',
    5,
    'RYT 500 Certified',
    12,
    ARRAY['Adults', 'Seniors'],
    'active'
),
(
    gen_random_uuid(),
    (SELECT user_id FROM public.profiles WHERE role = 'owner' LIMIT 1),
    'Tennis Excellence Academy',
    'Mumbai',
    '789 Tennis Club, Powai, Mumbai',
    'lawn-tennis',
    'coaching_venue',
    800,
    'Professional tennis coaching with modern facilities',
    'Vikram Singh',
    12,
    'ITF Level 2 Coach',
    8,
    ARRAY['U-10', 'U-14', 'U-18', 'Adults'],
    'active'
);
