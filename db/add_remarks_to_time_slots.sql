-- Add remarks column to time_slots table

ALTER TABLE public.time_slots 
ADD COLUMN IF NOT EXISTS remarks TEXT;

