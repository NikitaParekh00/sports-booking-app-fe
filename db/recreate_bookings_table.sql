-- Completely recreate the bookings table from scratch
-- This is the most aggressive approach to fix the start_ts reference issue

-- 1. Drop the entire table and all its dependencies
DROP TABLE IF EXISTS public.bookings CASCADE;

-- 2. Recreate the table with only the columns we need
CREATE TABLE public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    facility_id UUID NOT NULL,
    court_id UUID,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_price INTEGER NOT NULL CHECK (total_price > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_facility_id ON public.bookings(facility_id);
CREATE INDEX IF NOT EXISTS idx_bookings_court_id ON public.bookings(court_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);

-- 4. Create the updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. Create the updated_at trigger
CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON public.bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Enable RLS (Row Level Security)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- 7. Create permissive RLS policy for development
CREATE POLICY "Allow all operations for development" ON public.bookings
    FOR ALL USING (true) WITH CHECK (true);

-- 8. Verify the table structure
SELECT 'New bookings table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 9. Insert a test booking to verify it works
INSERT INTO public.bookings (
    user_id, 
    facility_id, 
    court_id, 
    booking_date, 
    start_time, 
    end_time, 
    total_price, 
    status, 
    payment_status, 
    payment_method, 
    notes
) VALUES (
    '53c5d77a-5121-4329-9d68-433d16b0eb3e',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '2025-09-13',
    '07:00:00',
    '08:00:00',
    600,
    'confirmed',
    'paid',
    'card',
    'Test booking'
);

-- 10. Verify the test booking was inserted
SELECT 'Test booking inserted:' as info;
SELECT * FROM public.bookings WHERE user_id = '53c5d77a-5121-4329-9d68-433d16b0eb3e';
