-- Fix user_id column issue in bookings table
-- This script will safely add the user_id column without foreign key constraints

-- First, let's check what columns exist
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add user_id column if it doesn't exist (without foreign key constraint for now)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN user_id UUID;
        RAISE NOTICE 'Added user_id column to bookings table';
    ELSE
        RAISE NOTICE 'user_id column already exists in bookings table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND table_schema = 'public'
ORDER BY ordinal_position;
