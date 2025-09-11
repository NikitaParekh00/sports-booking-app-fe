-- Fix bookings table structure
-- This script will add missing columns to the existing bookings table

-- First, let's check if the table exists and what columns it has
-- If the table doesn't exist, create it
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    court_id UUID REFERENCES public.courts(id) ON DELETE SET NULL,
    time_slot_id UUID REFERENCES public.time_slots(id) ON DELETE SET NULL,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    total_price INTEGER NOT NULL CHECK (total_price > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure end_time is after start_time
    CONSTRAINT valid_booking_time_range CHECK (end_time > start_time)
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'user_id') THEN
        ALTER TABLE public.bookings ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- Add facility_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'facility_id') THEN
        ALTER TABLE public.bookings ADD COLUMN facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE;
    END IF;
    
    -- Add court_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'court_id') THEN
        ALTER TABLE public.bookings ADD COLUMN court_id UUID REFERENCES public.courts(id) ON DELETE SET NULL;
    END IF;
    
    -- Add time_slot_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'time_slot_id') THEN
        ALTER TABLE public.bookings ADD COLUMN time_slot_id UUID REFERENCES public.time_slots(id) ON DELETE SET NULL;
    END IF;
    
    -- Add booking_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'booking_date') THEN
        ALTER TABLE public.bookings ADD COLUMN booking_date DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;
    
    -- Add start_time column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'start_time') THEN
        ALTER TABLE public.bookings ADD COLUMN start_time TIME NOT NULL DEFAULT '00:00:00';
    END IF;
    
    -- Add end_time column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'end_time') THEN
        ALTER TABLE public.bookings ADD COLUMN end_time TIME NOT NULL DEFAULT '01:00:00';
    END IF;
    
    -- Add total_price column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'total_price') THEN
        ALTER TABLE public.bookings ADD COLUMN total_price INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'status') THEN
        ALTER TABLE public.bookings ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'confirmed';
    END IF;
    
    -- Add payment_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'payment_status') THEN
        ALTER TABLE public.bookings ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'pending';
    END IF;
    
    -- Add payment_method column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'payment_method') THEN
        ALTER TABLE public.bookings ADD COLUMN payment_method VARCHAR(50);
    END IF;
    
    -- Add notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'notes') THEN
        ALTER TABLE public.bookings ADD COLUMN notes TEXT;
    END IF;
    
    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'created_at') THEN
        ALTER TABLE public.bookings ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'updated_at') THEN
        ALTER TABLE public.bookings ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Add constraints if they don't exist
DO $$
BEGIN
    -- Add check constraint for total_price if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'bookings_total_price_check') THEN
        ALTER TABLE public.bookings ADD CONSTRAINT bookings_total_price_check CHECK (total_price > 0);
    END IF;
    
    -- Add check constraint for status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'bookings_status_check') THEN
        ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed'));
    END IF;
    
    -- Add check constraint for payment_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'bookings_payment_status_check') THEN
        ALTER TABLE public.bookings ADD CONSTRAINT bookings_payment_status_check CHECK (payment_status IN ('pending', 'paid', 'refunded'));
    END IF;
    
    -- Add check constraint for time range if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'valid_booking_time_range') THEN
        ALTER TABLE public.bookings ADD CONSTRAINT valid_booking_time_range CHECK (end_time > start_time);
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_facility_id ON public.bookings(facility_id);
CREATE INDEX IF NOT EXISTS idx_bookings_court_id ON public.bookings(court_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time_slot_id ON public.bookings(time_slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);

-- Create updated_at trigger if it doesn't exist
CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON public.bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can insert their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Facility owners can view their bookings" ON public.bookings;

-- Create RLS policies
CREATE POLICY "Users can view their own bookings" ON public.bookings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookings" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" ON public.bookings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Facility owners can view their bookings" ON public.bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.facilities 
            WHERE facilities.id = bookings.facility_id 
            AND facilities.owner_id = auth.uid()
        )
    );

-- Insert some sample bookings for testing (only if the table is empty)
INSERT INTO public.bookings (user_id, facility_id, court_id, booking_date, start_time, end_time, total_price, status, payment_status, payment_method, notes) 
SELECT * FROM (VALUES
    ('0ef6e723-5254-4188-a20a-e03a63f5ae92', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', '2024-01-15', '08:00:00', '09:00:00', 400, 'completed', 'paid', 'card', 'Badminton session'),
    ('0ef6e723-5254-4188-a20a-e03a63f5ae92', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', '2024-01-16', '10:00:00', '11:00:00', 300, 'confirmed', 'paid', 'upi', 'Table tennis practice'),
    ('0ef6e723-5254-4188-a20a-e03a63f5ae92', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', '2024-01-17', '14:00:00', '16:00:00', 2000, 'confirmed', 'paid', 'card', 'Cricket match'),
    ('0ef6e723-5254-4188-a20a-e03a63f5ae92', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', '2024-01-18', '18:00:00', '19:00:00', 500, 'pending', 'pending', null, 'Evening badminton'),
    ('0ef6e723-5254-4188-a20a-e03a63f5ae92', '44444444-4444-4444-4444-444444444444', 'c4444444-4444-4444-4444-444444444444', '2024-01-19', '09:00:00', '10:00:00', 1200, 'cancelled', 'refunded', 'card', 'Shooting practice - cancelled')
) AS sample_data(user_id, facility_id, court_id, booking_date, start_time, end_time, total_price, status, payment_status, payment_method, notes)
WHERE NOT EXISTS (SELECT 1 FROM public.bookings LIMIT 1);
