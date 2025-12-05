-- Create time_slots table for owner dashboard
-- This table stores specific time slots that can be booked for courts

CREATE TABLE IF NOT EXISTS public.time_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    court_id UUID REFERENCES public.courts(id) ON DELETE CASCADE NOT NULL,
    facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    price_per_hour DECIMAL(10, 2) NOT NULL,
    is_available BOOLEAN DEFAULT true NOT NULL,
    is_booked BOOLEAN DEFAULT false NOT NULL,
    booking_id UUID, -- Can reference a bookings table if it exists
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    -- Ensure end_time is after start_time
    CONSTRAINT check_time_order CHECK (end_time > start_time)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_time_slots_owner_id ON public.time_slots(owner_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_court_id ON public.time_slots(court_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_facility_id ON public.time_slots(facility_id);
CREATE INDEX IF NOT EXISTS idx_time_slots_date ON public.time_slots(date);
CREATE INDEX IF NOT EXISTS idx_time_slots_available ON public.time_slots(is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_time_slots_booked ON public.time_slots(is_booked) WHERE is_booked = true;
CREATE INDEX IF NOT EXISTS idx_time_slots_owner_date ON public.time_slots(owner_id, date);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_time_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_time_slots_updated_at
    BEFORE UPDATE ON public.time_slots
    FOR EACH ROW
    EXECUTE FUNCTION update_time_slots_updated_at();

