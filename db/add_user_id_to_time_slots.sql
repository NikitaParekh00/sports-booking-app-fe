-- Add user_id column to time_slots table to track who booked the slot

-- Add user_id column (nullable, since slots can be unbooked)
ALTER TABLE public.time_slots 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_time_slots_user_id ON public.time_slots(user_id);

