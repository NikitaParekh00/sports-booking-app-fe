-- Bookings Table for Sports Booking App
-- This table stores all user bookings

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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_facility_id ON public.bookings(facility_id);
CREATE INDEX IF NOT EXISTS idx_bookings_court_id ON public.bookings(court_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time_slot_id ON public.bookings(time_slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON public.bookings(payment_status);

-- Create updated_at trigger
CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON public.bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own bookings
CREATE POLICY "Users can view their own bookings" ON public.bookings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookings" ON public.bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookings" ON public.bookings
    FOR UPDATE USING (auth.uid() = user_id);

-- Facility owners can view bookings for their facilities
CREATE POLICY "Facility owners can view their bookings" ON public.bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.facilities 
            WHERE facilities.id = bookings.facility_id 
            AND facilities.owner_id = auth.uid()
        )
    );

-- Insert some sample bookings for testing
INSERT INTO public.bookings (user_id, facility_id, court_id, booking_date, start_time, end_time, total_price, status, payment_status, payment_method, notes) VALUES
-- Sample bookings for the test user
('0ef6e723-5254-4188-a20a-e03a63f5ae92', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', '2024-01-15', '08:00:00', '09:00:00', 400, 'completed', 'paid', 'card', 'Badminton session'),
('0ef6e723-5254-4188-a20a-e03a63f5ae92', '33333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333', '2024-01-16', '10:00:00', '11:00:00', 300, 'confirmed', 'paid', 'upi', 'Table tennis practice'),
('0ef6e723-5254-4188-a20a-e03a63f5ae92', '11111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', '2024-01-17', '14:00:00', '16:00:00', 2000, 'confirmed', 'paid', 'card', 'Cricket match'),
('0ef6e723-5254-4188-a20a-e03a63f5ae92', '22222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', '2024-01-18', '18:00:00', '19:00:00', 500, 'pending', 'pending', null, 'Evening badminton'),
('0ef6e723-5254-4188-a20a-e03a63f5ae92', '44444444-4444-4444-4444-444444444444', 'c4444444-4444-4444-4444-444444444444', '2024-01-19', '09:00:00', '10:00:00', 1200, 'cancelled', 'refunded', 'card', 'Shooting practice - cancelled');
