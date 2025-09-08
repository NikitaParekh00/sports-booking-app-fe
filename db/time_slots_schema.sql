-- Time Slots Table for Owner Dashboard
-- This table stores individual time slots that owners can create and manage

CREATE TABLE IF NOT EXISTS public.time_slots (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE CASCADE,
    facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    price_per_hour INTEGER NOT NULL CHECK (price_per_hour > 0),
    is_available BOOLEAN DEFAULT true,
    is_booked BOOLEAN DEFAULT false,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure end_time is after start_time
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    
    -- Ensure no overlapping slots for the same court on the same date
    CONSTRAINT no_overlapping_slots EXCLUDE USING gist (
        court_id WITH =,
        date WITH =,
        tsrange(
            (date + start_time)::timestamp,
            (date + end_time)::timestamp
        ) WITH &&
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_time_slots_court_id ON public.time_slots(court_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_facility_id ON public.time_slots(facility_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_owner_id ON public.time_slots(owner_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_date ON public.time_slots(date);
CREATE INDEX IF NOT EXISTS idx_time_slots_available ON public.time_slots(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_time_slots_booked ON public.time_slots(is_booked) WHERE is_booked = true;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_time_slots_updated_at 
    BEFORE UPDATE ON public.time_slots 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Owners can only see and manage their own slots
CREATE POLICY "Owners can view their own slots" ON public.time_slots
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Owners can insert their own slots" ON public.time_slots
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their own slots" ON public.time_slots
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their own slots" ON public.time_slots
    FOR DELETE USING (auth.uid() = owner_id);

-- Customers can view available slots (for booking)
CREATE POLICY "Customers can view available slots" ON public.time_slots
    FOR SELECT USING (is_available = true AND is_booked = false);

-- Insert some sample time slots for testing
INSERT INTO public.time_slots (court_id, facility_id, owner_id, date, start_time, end_time, price_per_hour, is_available, is_booked) VALUES
-- Court A (Cricket) - Owner: Nikita Parekh
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '0ef6e723-5254-4188-a20a-e03a63f5ae92', '2024-01-15', '06:00:00', '08:00:00', 800, true, false),
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '0ef6e723-5254-4188-a20a-e03a63f5ae92', '2024-01-15', '08:00:00', '10:00:00', 1000, true, false),
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '0ef6e723-5254-4188-a20a-e03a63f5ae92', '2024-01-15', '10:00:00', '12:00:00', 1200, false, true),
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '0ef6e723-5254-4188-a20a-e03a63f5ae92', '2024-01-15', '14:00:00', '16:00:00', 1000, true, false),
('c1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '0ef6e723-5254-4188-a20a-e03a63f5ae92', '2024-01-15', '16:00:00', '18:00:00', 1200, true, false),

-- Court B (Cricket) - Owner: Priya Sharma
('c1111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111112', 'a49e0e97-71d8-4d48-808b-aa531abc60cf', '2024-01-15', '06:00:00', '08:00:00', 750, true, false),
('c1111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111112', 'a49e0e97-71d8-4d48-808b-aa531abc60cf', '2024-01-15', '08:00:00', '10:00:00', 900, true, false),
('c1111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111112', 'a49e0e97-71d8-4d48-808b-aa531abc60cf', '2024-01-15', '10:00:00', '12:00:00', 1100, false, true),

-- Badminton Court 1 - Owner: Nikita Parekh
('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '0ef6e723-5254-4188-a20a-e03a63f5ae92', '2024-01-15', '07:00:00', '08:00:00', 400, true, false),
('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '0ef6e723-5254-4188-a20a-e03a63f5ae92', '2024-01-15', '08:00:00', '09:00:00', 400, true, false),
('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '0ef6e723-5254-4188-a20a-e03a63f5ae92', '2024-01-15', '09:00:00', '10:00:00', 400, false, true),
('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '0ef6e723-5254-4188-a20a-e03a63f5ae92', '2024-01-15', '18:00:00', '19:00:00', 500, true, false),
('c2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '0ef6e723-5254-4188-a20a-e03a63f5ae92', '2024-01-15', '19:00:00', '20:00:00', 500, true, false),

-- Table Tennis Table 1 - Owner: Nikita Parekh
('c3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '0ef6e723-5254-4188-a20a-e03a63f5ae92', '2024-01-15', '08:00:00', '09:00:00', 300, true, false),
('c3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '0ef6e723-5254-4188-a20a-e03a63f5ae92', '2024-01-15', '09:00:00', '10:00:00', 300, true, false),
('c3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '0ef6e723-5254-4188-a20a-e03a63f5ae92', '2024-01-15', '10:00:00', '11:00:00', 300, false, true),

-- Shooting Range A - Owner: Priya Sharma
('c4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'a49e0e97-71d8-4d48-808b-aa531abc60cf', '2024-01-15', '09:00:00', '10:00:00', 1200, true, false),
('c4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'a49e0e97-71d8-4d48-808b-aa531abc60cf', '2024-01-15', '10:00:00', '11:00:00', 1200, true, false),
('c4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'a49e0e97-71d8-4d48-808b-aa531abc60cf', '2024-01-15', '11:00:00', '12:00:00', 1200, false, true);
