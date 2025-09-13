-- Add missing columns to bookings table without foreign key constraints
-- This avoids issues with auth.users and other restricted tables

-- Add user_id column if it doesn't exist
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

-- Add facility_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'facility_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN facility_id UUID;
        RAISE NOTICE 'Added facility_id column to bookings table';
    ELSE
        RAISE NOTICE 'facility_id column already exists in bookings table';
    END IF;
END $$;

-- Add other essential columns for bookings
DO $$ 
BEGIN
    -- Add booking_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'booking_date'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN booking_date DATE DEFAULT CURRENT_DATE;
        RAISE NOTICE 'Added booking_date column to bookings table';
    END IF;

    -- Add start_time column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'start_time'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN start_time TIME DEFAULT '00:00:00';
        RAISE NOTICE 'Added start_time column to bookings table';
    END IF;

    -- Add end_time column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'end_time'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN end_time TIME DEFAULT '01:00:00';
        RAISE NOTICE 'Added end_time column to bookings table';
    END IF;

    -- Add total_price column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'total_price'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN total_price INTEGER DEFAULT 0;
        RAISE NOTICE 'Added total_price column to bookings table';
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN status VARCHAR(20) DEFAULT 'confirmed';
        RAISE NOTICE 'Added status column to bookings table';
    END IF;

    -- Add payment_status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'payment_status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN payment_status VARCHAR(20) DEFAULT 'pending';
        RAISE NOTICE 'Added payment_status column to bookings table';
    END IF;
END $$;

-- Verify all columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND table_schema = 'public'
ORDER BY ordinal_position;
